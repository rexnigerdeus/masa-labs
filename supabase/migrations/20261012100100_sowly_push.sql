-- ============================================================
-- MIGRATION: Sowly — rappels par notifications push (Web Push)
--
-- Deux rappels par jour et par appareil, à l'heure locale choisie :
--   - le matin : ce qui t'attend (habitudes prévues, tâches à échéance) ;
--   - le soir : les habitudes du jour pas encore validées — seulement
--     s'il en reste, jamais un rappel « tu as raté » (brief §9).
--
-- Chaîne d'envoi :
--   pg_cron (toutes les 15 min) → public.sowly_push_tick() → pg_net →
--   Edge Function `sowly-push` (en-tête x-cron-secret, vérifié contre
--   Vault) → Web Push (clés VAPID, secrets de la fonction).
--
-- Un abonnement = un appareil (un navigateur). Les réglages d'heure vivent
-- sur l'abonnement : on peut vouloir un rappel sur le téléphone et pas
-- sur l'ordinateur.
--
-- Ordre de mise en place :
--   1. cette migration (db push) ;
--   2. secrets de la fonction : npx supabase secrets set --env-file
--      supabase/.env.sowly-push (fichier local, hors dépôt) ;
--   3. npx supabase functions deploy sowly-push --no-verify-jwt.
-- Avant l'étape 3, le cron appelle une fonction absente : sans effet.
-- ============================================================

create table if not exists public.sowly_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,
  -- L'adresse du service push du navigateur (FCM, Apple, Mozilla) : propre
  -- à un appareil, d'où l'unicité.
  endpoint text not null unique check (endpoint like 'https://%'),
  p256dh text not null,
  auth text not null,
  -- Fuseau IANA de l'appareil (« Africa/Abidjan ») : l'heure du rappel est
  -- une heure locale.
  time_zone text not null default 'Africa/Abidjan',
  morning_enabled boolean not null default true,
  morning_at time not null default '08:00',
  evening_enabled boolean not null default true,
  evening_at time not null default '20:00',
  -- Jour local du dernier envoi : un rappel ne part qu'une fois par jour,
  -- même si le cron passe plusieurs fois dans la fenêtre.
  last_morning_day date,
  last_evening_day date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sowly_push_user on public.sowly_push_subscriptions(user_id);

alter table public.sowly_push_subscriptions enable row level security;

-- Lecture et désinscription par le propriétaire. L'écriture passe par
-- `sowly_push_register` : un même navigateur peut changer de compte, et la
-- ligne de l'ancien compte doit alors lui être retirée — ce qu'aucune
-- policy ne permettrait.
drop policy if exists "Owner reads own push subscriptions" on public.sowly_push_subscriptions;
create policy "Owner reads own push subscriptions"
  on public.sowly_push_subscriptions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner deletes own push subscriptions" on public.sowly_push_subscriptions;
create policy "Owner deletes own push subscriptions"
  on public.sowly_push_subscriptions for delete to authenticated
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Inscription / mise à jour des réglages d'un appareil
-- ------------------------------------------------------------
create or replace function public.sowly_push_register(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_time_zone text,
  p_morning_enabled boolean,
  p_morning_at time,
  p_evening_enabled boolean,
  p_evening_at time
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  -- Fuseau inconnu de Postgres : on retombe sur Abidjan plutôt que de
  -- planter le cron plus tard.
  if not exists (select 1 from pg_timezone_names where name = p_time_zone) then
    p_time_zone := 'Africa/Abidjan';
  end if;

  insert into public.sowly_push_subscriptions as s (
    user_id, endpoint, p256dh, auth, time_zone,
    morning_enabled, morning_at, evening_enabled, evening_at
  ) values (
    auth.uid(), p_endpoint, p_p256dh, p_auth, p_time_zone,
    p_morning_enabled, p_morning_at, p_evening_enabled, p_evening_at
  )
  on conflict (endpoint) do update set
    user_id = excluded.user_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    time_zone = excluded.time_zone,
    morning_enabled = excluded.morning_enabled,
    morning_at = excluded.morning_at,
    evening_enabled = excluded.evening_enabled,
    evening_at = excluded.evening_at,
    -- Nouveau compte sur ce navigateur : on repart de zéro.
    last_morning_day = case when s.user_id = excluded.user_id then s.last_morning_day end,
    last_evening_day = case when s.user_id = excluded.user_id then s.last_evening_day end,
    updated_at = now();
end;
$$;

revoke execute on function public.sowly_push_register(text, text, text, text, boolean, time, boolean, time)
  from public, anon;
grant execute on function public.sowly_push_register(text, text, text, text, boolean, time, boolean, time)
  to authenticated;

-- ------------------------------------------------------------
-- Planification : un secret dans Vault, un cron toutes les 15 minutes
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'sowly_push_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'sowly_push_secret',
      'Authentifie les appels du cron à l''Edge Function sowly-push'
    );
  end if;
end $$;

create or replace function public.sowly_push_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
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

-- Confirmé par l'Edge Function avec sa clé service_role : elle n'a pas
-- besoin de connaître le secret, seulement de le faire vérifier.
create or replace function public.sowly_push_secret_valid(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'sowly_push_secret' and decrypted_secret = p_secret
  );
$$;

revoke execute on function public.sowly_push_tick() from public, anon, authenticated;
revoke execute on function public.sowly_push_secret_valid(text) from public, anon, authenticated;
grant execute on function public.sowly_push_secret_valid(text) to service_role;

-- Toutes les 15 minutes : un rappel part au plus 15 minutes après l'heure
-- choisie. Le cron.schedule nommé remplace un éventuel job du même nom.
select cron.schedule('sowly-push', '*/15 * * * *', $$select public.sowly_push_tick()$$);

notify pgrst, 'reload schema';
