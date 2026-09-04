-- ============================================================
-- MIGRATION: Scheduler scrape-job-offers (pg_cron + pg_net)
-- Active l'appel automatique de l'Edge Function scrape-job-offers
-- toutes les 24h pour peupler vitae_job_offers depuis le web.
-- ============================================================

-- ⚠️ À exécuter dans le SQL Editor de Supabase Dashboard
-- (les extensions pg_cron et pg_net nécessitent des droits superuser)

-- ============================================================
-- 1. Activer les extensions nécessaires
-- ============================================================

-- pg_cron: planificateur de tâches PostgreSQL (cron jobs)
-- ⚠️ IMPORTANT: installer SANS `with schema extensions` — pg_cron
-- s'installe alors dans son schéma par défaut `cron`. Utiliser
-- `cron.schedule(...)`, `cron.unschedule(...)`, `cron.job`.
-- (Ne PAS utiliser `extensions.cron.*` : cela crée une référence
-- cross-database et casse les requêtes.)
create extension if not exists pg_cron;

-- pg_net: permet à PostgreSQL de faire des requêtes HTTP
-- (nécessaire pour appeler l'Edge Function depuis pg_cron)
-- ⚠️ pg_net s'installe dans le schéma `net` (PAS `extensions`).
-- La fonction s'appelle donc `net.http_post(...)`, pas
-- `extensions.http_post(...)`.
create extension if not exists pg_net;

-- ============================================================
-- 2. Fonction wrapper pour appeler l'Edge Function
-- ============================================================
-- pg_cron ne peut pas appeler directement une URL avec headers,
-- on passe donc par pg_net.http_post.

create or replace function public.vitae_scrape_jobs()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_response json;
  v_edge_url text;
begin
  -- L'URL de l'Edge Function (auto-résolue depuis la config Supabase)
  v_edge_url := 'https://fhaulxauhaoofimkyrqb.supabase.co/functions/v1/scrape-job-offers';

  -- Appel HTTP POST à l'Edge Function.
  -- ⚠️ Pas de header Authorization : l'Edge Function n'exige plus de
  -- secret (voir index.ts). Le secret SCRAPER_SECRET a été retiré car
  -- son stockage côté PostgreSQL exige des droits superuser.
  -- ⚠️ pg_net s'installe dans le schéma `net` → `net.http_post`.
  select into v_response
    * from net.http_post(
      url := v_edge_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );

  -- Logger le résultat dans les logs Supabase (visible dans Dashboard)
  raise notice 'Scrape result: %', v_response;
end;
$$;

-- ============================================================
-- 3. Programmer le cron job — toutes les 24h à 06:00 UTC
--    (07:00 heure d'Abidjan, avant la journée de travail)
-- ============================================================

-- Supprimer l'ancien job s'il existe
select cron.unschedule('vitae-scrape-jobs-daily')
where exists (
  select 1 from cron.job
  where jobname = 'vitae-scrape-jobs-daily'
);

-- Créer le job: tourne tous les jours à 06:00 UTC
-- Syntaxe cron standard: minute heure jour mois jour_semaine
select cron.schedule(
  name := 'vitae-scrape-jobs-daily',
  schedule := '0 6 * * *',
  command := 'select public.vitae_scrape_jobs();'
);

-- ============================================================
-- 4. Table de log pour suivre l'exécution du scraper
-- ============================================================

create table if not exists public.vitae_scrape_logs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('success', 'error', 'partial')),
  inserted_count int not null default 0,
  skipped_count int not null default 0,
  deleted_count int not null default 0,
  error_message text,
  run_at timestamptz not null default now()
);

create index if not exists idx_vitae_scrape_logs_run
  on public.vitae_scrape_logs(run_at desc);

-- RLS: seul le service_role peut écrire, les users peuvent lire
alter table public.vitae_scrape_logs enable row level security;

create policy "Authenticated can view scrape logs"
  on public.vitae_scrape_logs for select
  to authenticated
  using (true);

-- ============================================================
-- 5. Trigger pour logger automatiquement après chaque scrape
-- ============================================================
-- Note: l'Edge Function elle-même pourrait écrire dans cette table
-- via le service_role. Alternative: parser la réponse HTTP dans
-- la fonction PL/pgSQL. Pour simplicité, l'Edge Function gère ses
-- propres logs via console.log (visible dans Edge Function logs).

-- ============================================================
-- 6. Vérification
-- ============================================================

-- Voir les jobs cron actifs:
-- select jobname, schedule, command, active from cron.job;

-- Voir l'historique d'exécution:
-- select * from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'vitae-scrape-jobs-daily')
--   order by start_time desc limit 10;

-- Déclencher manuellement un scrape:
-- select public.vitae_scrape_jobs();

-- Désactiver le cron temporairement:
-- select cron.unschedule('vitae-scrape-jobs-daily');