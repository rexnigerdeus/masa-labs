// ============================================================
// Edge Function : sowly-push
//
// Envoie les rappels Sowly par Web Push, à l'heure locale de chaque
// appareil :
//   - à l'heure choisie sur une tâche ou une habitude ;
//   - aux heures de prière activées ;
//   - le matin et le soir (résumé du jour).
// Appelée par pg_cron (public.sowly_push_tick, chaque minute où il y a
// quelque chose à envoyer), avec l'en-tête x-cron-secret vérifié contre
// Supabase Vault — déployée en `--no-verify-jwt`, elle refuse tout autre
// appel.
//
// Secrets de la fonction (npx supabase secrets set --env-file
// supabase/.env.sowly-push) :
//   SOWLY_VAPID_PUBLIC_KEY, SOWLY_VAPID_PRIVATE_KEY, SOWLY_VAPID_SUBJECT
//
// Les textes et les décisions vivent dans logic.ts, testée à part.
// ============================================================

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import {
  compose, composeAlarm, composePrayer, currentStreak, dueSlot, scheduledHabits,
  type HabitRow, type Message, type Reminder, type Subscription, type TaskRow,
} from './logic.ts';

const HABIT_COLUMNS = 'id, action, days, start_day, cue, place, why';

/** Jours validés d'un ensemble d'habitudes, sur une fenêtre assez longue pour une série. */
async function checksOf(supabase: SupabaseClient, userId: string, habitIds: string[], day: string): Promise<Map<string, Set<string>>> {
  const byHabit = new Map<string, Set<string>>(habitIds.map((id) => [id, new Set<string>()]));
  if (habitIds.length === 0) return byHabit;
  const from = new Date(Date.parse(`${day}T00:00:00Z`) - 200 * 86_400_000).toISOString().slice(0, 10);
  // Plus récentes d'abord : si la limite de lignes de l'API coupe, elle
  // coupe le passé lointain, jamais la série en cours.
  const { data } = await supabase.from('sowly_habit_checks').select('habit_id, day')
    .eq('user_id', userId).in('habit_id', habitIds).is('deleted_at', null).gte('day', from)
    .order('day', { ascending: false });
  for (const c of (data ?? []) as Array<{ habit_id: string; day: string }>) byHabit.get(c.habit_id)?.add(c.day);
  return byHabit;
}

type Outcome = 'sent' | 'gone' | 'failed';

async function send(sub: Subscription, message: Message): Promise<Outcome> {
  const alarm = message.kind === 'alarm';
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(message),
      alarm ? { TTL: 1800, urgency: 'high' } : { TTL: 3 * 3600, urgency: 'normal' },
    );
    return 'sent';
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    // 404 / 410 : l'abonnement n'existe plus (app désinstallée,
    // notifications retirées). On l'oublie.
    if (status === 404 || status === 410) return 'gone';
    console.error('Envoi échoué', status, (e as Error).message);
    return 'failed';
  }
}

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

  const { data: rows, error } = await supabase.from('sowly_push_subscriptions').select('*');
  if (error !== null) return new Response(error.message, { status: 500 });
  const subs = new Map(((rows ?? []) as Subscription[]).map((s) => [s.id, s]));

  let sent = 0;
  let removed = 0;
  const forget = async (sub: Subscription): Promise<void> => {
    subs.delete(sub.id);
    removed++;
    await supabase.from('sowly_push_subscriptions').delete().eq('id', sub.id);
  };

  // ------------------------------------------------ Rappels à l'heure
  const { data: claimed, error: claimError } = await supabase.rpc('sowly_claim_reminders');
  if (claimError !== null) console.error('Réservation échouée', claimError.message);

  for (const r of (claimed ?? []) as Reminder[]) {
    const sub = subs.get(r.subscription_id);
    if (sub === undefined) continue;
    let message: Message | null = null;

    if (r.kind === 'prayer') {
      message = composePrayer(r);
    } else if (r.kind === 'task') {
      const { data: t } = await supabase.from('sowly_tasks')
        .select('title, description, list_id').eq('id', r.item_id).maybeSingle();
      if (t !== null) {
        const { data: list } = t.list_id === null ? { data: null } : await supabase
          .from('sowly_task_lists').select('name').eq('id', t.list_id).maybeSingle();
        message = composeAlarm(r, { title: t.title, description: t.description, listName: list?.name ?? null });
      }
    } else {
      const { data: h } = await supabase.from('sowly_habits')
        .select(HABIT_COLUMNS).eq('id', r.item_id).maybeSingle();
      if (h !== null) {
        const habit = h as HabitRow;
        const checks = await checksOf(supabase, r.user_id, [habit.id], r.day);
        message = composeAlarm(r, {
          title: habit.action, habit, streak: currentStreak(habit, checks.get(habit.id)!, r.day),
        });
      }
    }
    if (message === null) continue;

    const outcome = await send(sub, message);
    if (outcome === 'sent') sent++;
    else if (outcome === 'gone') await forget(sub);
    else {
      // Panne passagère du service push : on rend la réservation, la minute
      // suivante réessaiera (dans la fenêtre de 10 minutes).
      await supabase.from('sowly_reminder_log').delete()
        .eq('subscription_id', r.subscription_id).eq('kind', r.kind)
        .eq('item_id', r.item_id).eq('remind_at', r.remind_at);
    }
  }

  // ---------------------------------------------------- Matin et soir
  const now = new Date();
  for (const sub of [...subs.values()]) {
    const due = dueSlot(sub, now);
    if (due === null) continue;

    // Marqué d'abord, même sans message : on ne recalcule pas chaque minute,
    // et deux passages qui se chevauchent n'envoient pas deux fois.
    await supabase.from('sowly_push_subscriptions')
      .update(due.slot === 'morning' ? { last_morning_day: due.day } : { last_evening_day: due.day })
      .eq('id', sub.id);

    const [habits, tasks] = await Promise.all([
      supabase.from('sowly_habits').select(HABIT_COLUMNS)
        .eq('user_id', sub.user_id).is('deleted_at', null).is('archived_at', null)
        .order('position'),
      supabase.from('sowly_tasks').select('title, due_day, my_day')
        .eq('user_id', sub.user_id).is('deleted_at', null).is('done_at', null)
        .or(`due_day.lte.${due.day},my_day.eq.${due.day}`).order('due_day', { nullsFirst: false }),
    ]);

    const scheduled = scheduledHabits((habits.data ?? []) as HabitRow[], due.day, due.weekday);
    const checks = await checksOf(supabase, sub.user_id, scheduled.map((h) => h.id), due.day);
    const done = new Set(scheduled.filter((h) => checks.get(h.id)?.has(due.day)).map((h) => h.id));
    const streaks = new Map(scheduled.map((h) => [h.id, currentStreak(h, checks.get(h.id)!, due.day)]));

    const message = compose(due.slot, due.day, scheduled, done, (tasks.data ?? []) as TaskRow[], streaks);
    if (message === null) continue;

    const outcome = await send(sub, message);
    if (outcome === 'sent') sent++;
    else if (outcome === 'gone') await forget(sub);
  }

  return Response.json({ sent, removed });
});
