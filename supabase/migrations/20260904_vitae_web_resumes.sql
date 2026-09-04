-- ============================================================
-- Vitae web — CV et journal d'usage
--
-- Nouvelles tables du front web. Elles ne remplacent pas vitae_cvs /
-- vitae_sections : ces dernières servent l'app Flutter, portent un schéma
-- normalisé par section et un modèle d'abonnement qui n'existe plus côté web.
-- Les deux jeux de tables cohabitent sans se gêner.
--
-- Ici le CV entier tient dans une colonne jsonb : l'éditeur web manipule un
-- seul objet `Resume` (packages/cv-core/src/types.ts), et le brouillon local
-- comme la ligne en base ont exactement la même forme.
-- ============================================================

create table if not exists public.vitae_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Mon CV',
  template_id text not null default 'classique'
    check (template_id in ('classique', 'sobre', 'compact', 'stage')),
  -- Objet Resume complet, versionné par son champ schemaVersion.
  data jsonb not null,
  -- Dernier score calculé, dupliqué ici pour les KPIs : le calcul fait
  -- autorité côté application, cette colonne n'est qu'un instantané.
  score int not null default 0 check (score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vitae_resumes_user
  on public.vitae_resumes(user_id, updated_at desc);

alter table public.vitae_resumes enable row level security;

-- Un CV n'est visible et modifiable que par son propriétaire. Aucune lecture
-- croisée, aucun accès anonyme : le brouillon anonyme vit dans le navigateur,
-- il n'arrive en base qu'une fois le compte créé.
drop policy if exists "Owner can read own resumes" on public.vitae_resumes;
create policy "Owner can read own resumes"
  on public.vitae_resumes for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner can insert own resumes" on public.vitae_resumes;
create policy "Owner can insert own resumes"
  on public.vitae_resumes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner can update own resumes" on public.vitae_resumes;
create policy "Owner can update own resumes"
  on public.vitae_resumes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owner can delete own resumes" on public.vitae_resumes;
create policy "Owner can delete own resumes"
  on public.vitae_resumes for delete
  to authenticated
  using (auth.uid() = user_id);

drop trigger if exists set_updated_at_vitae_resumes on public.vitae_resumes;
create trigger set_updated_at_vitae_resumes
  before update on public.vitae_resumes
  for each row execute function public.update_updated_at();

-- ------------------------------------------------------------
-- Journal d'usage — KPIs du brief §13
--
-- Volontairement minimal : un nom d'événement, un CV optionnel, un peu de
-- contexte. De quoi mesurer le taux de complétion et la progression du score
-- sans construire d'outil d'analytique.
-- ------------------------------------------------------------

create table if not exists public.vitae_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid references public.vitae_resumes(id) on delete set null,
  event text not null check (event in (
    'resume_created', 'resume_saved', 'resume_downloaded',
    'linkedin_imported', 'template_changed'
  )),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_vitae_events_event
  on public.vitae_events(event, created_at desc);

alter table public.vitae_events enable row level security;

-- L'utilisateur écrit son propre journal ; il ne le relit pas. L'analyse se
-- fait avec la clé de service, hors de portée du navigateur.
drop policy if exists "Owner can log own events" on public.vitae_events;
create policy "Owner can log own events"
  on public.vitae_events for insert
  to authenticated
  with check (auth.uid() = user_id);
