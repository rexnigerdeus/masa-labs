-- ============================================================
-- MIGRATION: Sowly — heure de rappel des tâches et des habitudes,
-- heures de prière
--
-- Écrite le 25/11/2026, numérotée avant les lots Vitae (20261018…), pas
-- encore appliqués : un numéro plus récent bloquerait leur `db push`.
--
--   sowly_tasks.remind_at     jour et heure du rappel, en heure LOCALE de
--                             l'appareil (timestamp sans fuseau) : « 18:30 »
--                             veut dire 18:30 là où on se trouve.
--   sowly_habits.remind_time  heure du rappel, chaque jour prévu.
--   sowly_habits.snooze_at    rappel ponctuel (« dans 10 minutes »).
--   sowly_profiles.prayer_hours  heures de prière activées (0, 4, 6, 12, 15,
--                             18, 20) ; vide = option désactivée.
--
-- Envoi : pg_cron passe chaque minute, mais n'appelle l'Edge Function que
-- s'il y a quelque chose à envoyer (rappel à l'heure, matin ou soir). Les
-- autres minutes ne coûtent qu'une lecture.
--
-- Jamais deux fois : `sowly_reminder_log` retient ce qui est parti, par
-- appareil. La fonction réserve la ligne AVANT d'envoyer ; deux passages
-- simultanés ne peuvent pas réserver la même.
--
-- Ordre : cette migration, puis `functions deploy sowly-push`, puis l'app
-- (sans les colonnes, l'app masque les champs : OPTIONAL_COLUMNS).
-- ============================================================

alter table public.sowly_tasks add column if not exists remind_at timestamp;
alter table public.sowly_habits add column if not exists remind_time time;
alter table public.sowly_habits add column if not exists snooze_at timestamp;
alter table public.sowly_profiles
  add column if not exists prayer_hours smallint[] not null default '{}'
    check (prayer_hours <@ array[0, 4, 6, 12, 15, 18, 20]::smallint[]);

create index if not exists idx_sowly_tasks_remind
  on public.sowly_tasks(user_id, remind_at)
  where remind_at is not null and done_at is null and deleted_at is null;

-- ------------------------------------------------------------
-- Ce qui est déjà parti. Aucune policy : service_role seulement.
-- ------------------------------------------------------------
create table if not exists public.sowly_reminder_log (
  subscription_id uuid not null
    references public.sowly_push_subscriptions(id) on delete cascade,
  kind text not null check (kind in ('task', 'habit', 'prayer')),
  item_id uuid not null, -- le compte, pour une prière
  remind_at timestamp not null,
  sent_at timestamptz not null default now(),
  primary key (subscription_id, kind, item_id, remind_at)
);
alter table public.sowly_reminder_log enable row level security;
revoke all on public.sowly_reminder_log from anon, authenticated;

-- ------------------------------------------------------------
-- Rappels à envoyer maintenant. Fenêtre de 10 minutes : un passage du cron
-- manqué se rattrape, une heure dépassée depuis longtemps ne sonne plus.
-- Deux jours sont considérés (aujourd'hui et hier) pour un rappel de 23:58.
-- ------------------------------------------------------------
create or replace function public.sowly_due_reminders()
returns table (subscription_id uuid, user_id uuid, kind text, item_id uuid, remind_at timestamp, day date)
language sql
stable
security definer
set search_path = public
as $$
  with local as (
    select s.id, s.user_id, (now() at time zone s.time_zone)::timestamp as t
    from public.sowly_push_subscriptions s
  ),
  due as (
    select l.id, l.user_id, 'task'::text as kind, k.id as item_id, k.remind_at, l.t::date as day
    from local l
    join public.sowly_tasks k on k.user_id = l.user_id
    where k.remind_at is not null and k.done_at is null and k.deleted_at is null
      and k.remind_at <= l.t and k.remind_at > l.t - interval '10 minutes'
    union
    select l.id, l.user_id, 'habit', h.id, d.day + h.remind_time, d.day
    from local l
    join public.sowly_habits h on h.user_id = l.user_id
    cross join lateral (values (l.t::date), (l.t::date - 1)) as d(day)
    where h.remind_time is not null and h.archived_at is null and h.deleted_at is null
      and h.start_day <= d.day
      and extract(dow from d.day)::int = any (h.days)
      and d.day + h.remind_time <= l.t and d.day + h.remind_time > l.t - interval '10 minutes'
      and not exists (
        select 1 from public.sowly_habit_checks c
        where c.habit_id = h.id and c.day = d.day and c.deleted_at is null
      )
    union
    select l.id, l.user_id, 'habit', h.id, h.snooze_at, h.snooze_at::date
    from local l
    join public.sowly_habits h on h.user_id = l.user_id
    where h.snooze_at is not null and h.archived_at is null and h.deleted_at is null
      and h.snooze_at <= l.t and h.snooze_at > l.t - interval '10 minutes'
      and not exists (
        select 1 from public.sowly_habit_checks c
        where c.habit_id = h.id and c.day = h.snooze_at::date and c.deleted_at is null
      )
    union
    select l.id, l.user_id, 'prayer', l.user_id, l.t::date + make_time(p.hour, 0, 0), l.t::date
    from local l
    join (
      select sp.user_id, unnest(sp.prayer_hours)::int as hour from public.sowly_profiles sp
    ) p on p.user_id = l.user_id
    where l.t::date + make_time(p.hour, 0, 0) <= l.t
      and l.t::date + make_time(p.hour, 0, 0) > l.t - interval '10 minutes'
  )
  select d.id, d.user_id, d.kind, d.item_id, d.remind_at, d.day
  from due d
  where not exists (
    select 1 from public.sowly_reminder_log g
    where g.subscription_id = d.id and g.kind = d.kind
      and g.item_id = d.item_id and g.remind_at = d.remind_at
  );
$$;

-- Réserve puis renvoie : seules les lignes réellement insérées reviennent.
create or replace function public.sowly_claim_reminders()
returns table (subscription_id uuid, user_id uuid, kind text, item_id uuid, remind_at timestamp, day date)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  delete from public.sowly_reminder_log where sent_at < now() - interval '7 days';
  return query
  with due as materialized (select * from public.sowly_due_reminders()),
  claimed as (
    insert into public.sowly_reminder_log as g (subscription_id, kind, item_id, remind_at)
    select d.subscription_id, d.kind, d.item_id, d.remind_at from due d
    on conflict do nothing
    returning g.subscription_id, g.kind, g.item_id, g.remind_at
  )
  select d.subscription_id, d.user_id, d.kind, d.item_id, d.remind_at, d.day
  from claimed c
  join due d on d.subscription_id = c.subscription_id and d.kind = c.kind
    and d.item_id = c.item_id and d.remind_at = c.remind_at;
end;
$$;

revoke execute on function public.sowly_due_reminders() from public, anon, authenticated;
revoke execute on function public.sowly_claim_reminders() from public, anon, authenticated;
grant execute on function public.sowly_claim_reminders() to service_role;
grant select, insert, update, delete on public.sowly_reminder_log to service_role;

-- ------------------------------------------------------------
-- Le cron : chaque minute, appel seulement s'il y a à faire
-- ------------------------------------------------------------
create or replace function public.sowly_push_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  if not exists (select 1 from public.sowly_due_reminders())
    and not exists (
      select 1
      from public.sowly_push_subscriptions s
      cross join lateral (select (now() at time zone s.time_zone)::timestamp as t) l
      where (s.morning_enabled and s.last_morning_day is distinct from l.t::date
             and l.t >= l.t::date + s.morning_at
             and l.t < l.t::date + s.morning_at + interval '60 minutes')
         or (s.evening_enabled and s.last_evening_day is distinct from l.t::date
             and l.t >= l.t::date + s.evening_at
             and l.t < l.t::date + s.evening_at + interval '60 minutes')
    )
  then
    return;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'sowly_push_secret';

  perform net.http_post(
    url := 'https://fhaulxauhaoofimkyrqb.supabase.co/functions/v1/sowly-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke execute on function public.sowly_push_tick() from public, anon, authenticated;

select cron.schedule('sowly-push', '* * * * *', $$select public.sowly_push_tick()$$);

-- Le journal de pg_cron ne se vide pas seul : 1 440 lignes par jour.
select cron.schedule('sowly-cron-purge', '20 3 * * *', $$
  delete from cron.job_run_details d
  using cron.job j
  where j.jobid = d.jobid and j.jobname in ('sowly-push', 'sowly-cron-purge')
    and d.start_time < now() - interval '2 days'
$$);

notify pgrst, 'reload schema';
