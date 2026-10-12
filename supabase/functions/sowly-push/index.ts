// ============================================================
// Edge Function : sowly-push
//
// Envoie les rappels Sowly (matin et soir, heure locale de chaque
// appareil) par Web Push. Appelée toutes les 15 minutes par pg_cron
// (migration 20261012100100_sowly_push.sql), avec l'en-tête
// x-cron-secret vérifié contre Supabase Vault — déployée en
// `--no-verify-jwt`, elle refuse tout autre appel.
//
// Secrets de la fonction (npx supabase secrets set --env-file
// supabase/.env.sowly-push) :
//   SOWLY_VAPID_PUBLIC_KEY, SOWLY_VAPID_PRIVATE_KEY, SOWLY_VAPID_SUBJECT
//
// La décision (quel rappel, quel texte) vit dans logic.ts, testée à part.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { compose, dueSlot, scheduledHabits, type HabitRow, type Subscription, type TaskRow } from './logic.ts';

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const secret = req.headers.get('x-cron-secret') ?? '';
  const { data: valid } = await supabase.rpc('sowly_push_secret_valid', { p_secret: secret });
  if (valid !== true) return new Response('Forbidden', { status: 403 });

  webpush.setVapidDetails(
    Deno.env.get('SOWLY_VAPID_SUBJECT') ?? 'https://sowly-one.vercel.app',
    Deno.env.get('SOWLY_VAPID_PUBLIC_KEY')!,
    Deno.env.get('SOWLY_VAPID_PRIVATE_KEY')!,
  );

  const { data: subs, error } = await supabase
    .from('sowly_push_subscriptions')
    .select('*')
    .or('morning_enabled.eq.true,evening_enabled.eq.true');
  if (error !== null) return new Response(error.message, { status: 500 });

  const now = new Date();
  let sent = 0;
  let removed = 0;

  for (const sub of (subs ?? []) as Subscription[]) {
    const due = dueSlot(sub, now);
    if (due === null) continue;

    const [habits, checks, tasks] = await Promise.all([
      supabase.from('sowly_habits').select('id, action, days, start_day')
        .eq('user_id', sub.user_id).is('deleted_at', null).is('archived_at', null)
        .order('position'),
      supabase.from('sowly_habit_checks').select('habit_id')
        .eq('user_id', sub.user_id).eq('day', due.day).is('deleted_at', null),
      supabase.from('sowly_tasks').select('title, due_day, my_day')
        .eq('user_id', sub.user_id).is('deleted_at', null).is('done_at', null)
        .not('due_day', 'is', null).lte('due_day', due.day),
    ]);

    const message = compose(
      due.slot,
      due.day,
      scheduledHabits((habits.data ?? []) as HabitRow[], due.day, due.weekday),
      new Set(((checks.data ?? []) as Array<{ habit_id: string }>).map((c) => c.habit_id)),
      (tasks.data ?? []) as TaskRow[],
    );

    // Marqué envoyé même sans message : on ne recalcule pas toute l'heure.
    await supabase.from('sowly_push_subscriptions')
      .update(due.slot === 'morning' ? { last_morning_day: due.day } : { last_evening_day: due.day })
      .eq('id', sub.id);
    if (message === null) continue;

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(message),
        { TTL: 3 * 3600, urgency: 'normal', topic: due.slot },
      );
      sent++;
    } catch (e) {
      // 404 / 410 : l'abonnement n'existe plus (app désinstallée,
      // notifications retirées). On l'oublie.
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from('sowly_push_subscriptions').delete().eq('id', sub.id);
        removed++;
      } else {
        console.error('Envoi échoué', status, (e as Error).message);
      }
    }
  }

  return Response.json({ sent, removed });
});
