-- ============================================================
-- Groot Habits — lot 1 : suivi d'habitudes offline-first
--
-- Groot est la quatrième application de la base : ses tables sont préfixées
-- `groot_`, comme `rondo_`, `vitae_` et `hive_` avant elle. Elle réutilise
-- sans les toucher `public.profiles`, `public.normalize_phone_to_email`
-- (auth par pseudo-email) et `public.update_updated_at()`.
--
-- Trois décisions du brief se lisent directement dans ce schéma :
--   - illimité, sans friction : aucune contrainte sur le nombre
--     d'habitudes, aucune colonne premium, aucun paywall (brief §2, §8) ;
--   - jamais culpabilisant : une habitude manquée n'efface rien —
--     `groot_habit_entries` n'a pas de colonne "échec", le passé reste
--     ce qu'il est et Groot perd juste une feuille côté client ;
--   - offline-first : la base locale sqflite est la source de vérité du
--     quotidien, Supabase en est la sauvegarde multi-appareils. Chaque
--     ligne porte donc un `client_id` immuable côté Flutter et des
--     horodatages de synchronisation (`synced_at`) pour rejouer les
--     écritures hors-ligne dans l'ordre.
--
-- Les colonnes d'utilisateur référencent `public.profiles(id)` et non
-- `auth.users(id)` directement, comme hive_ avant : c'est cette clé
-- étrangère qui permet à PostgREST de joindre sans friction.
--
-- Migration rejouable (README de ce dossier) : `if not exists` partout,
-- `drop policy if exists` avant chaque `create policy`, `drop trigger
-- if exists` avant chaque `create trigger`.
-- ============================================================

-- ============================================================
-- TABLE: groot_profiles
-- Ce que Groot ajoute au profil commun : l'identité choisie en
-- onboarding ("qui veux-tu devenir ?") et le décor du jardin. Le nom et
-- le téléphone restent dans `profiles` (communs à toutes les apps).
-- ============================================================
create table if not exists public.groot_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  -- Identités sélectionnées pendant le quiz d'identité (2-3 max côté
  -- client, brief §6.A.3) : 'pose', 'creatif', 'en-forme', 'organise',
  -- 'soigne', 'apaise', 'curieux'. Sert à suggérer des habitudes.
  identities text[] not null default '{}',
  -- Familles d'habitudes à explorer choisies à l'onboarding (§6.A.4) :
  -- 'construire' / 'arreter' / 'creer'. Multi-sélection, pas de limite.
  families text[] not null default '{}',
  -- Stade visuel de la mascotte, recalculé côté client d'après le
  -- streak global : 'graine' / 'pousse' / 'jeune-arbre' / 'arbre-ancien'.
  mascot_stage text not null default 'graine'
    check (mascot_stage in ('graine', 'pousse', 'jeune-arbre', 'arbre-ancien')),
  -- Personnalisation du pot (§3) : pot en céramique, écharpe…
  -- Série de clés de décor, résolues côté client. Aucun verrou
  -- premium : tout est offert (décision v1 : zéro mention payante).
  decorations text[] not null default '{}',
  -- Onboarding terminé ? Le splash de première ouverture ne se rejoue
  -- que pour les nouveaux comptes.
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.groot_profiles enable row level security;

drop policy if exists "Owner reads own groot profile" on public.groot_profiles;
create policy "Owner reads own groot profile"
  on public.groot_profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner inserts own groot profile" on public.groot_profiles;
create policy "Owner inserts own groot profile"
  on public.groot_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner updates own groot profile" on public.groot_profiles;
create policy "Owner updates own groot profile"
  on public.groot_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TABLE: groot_zones
-- Zones de vie pour regrouper les habitudes du jour (§6.B.1 : Matin,
-- Sport, Créativité, Soir…). Alimentée par cette migration : les
-- identifiants sont référencés par le code Flutter, ils ne bougent pas.
-- ============================================================
create table if not exists public.groot_zones (
  id text primary key,
  label text not null,
  position int not null default 0
);

alter table public.groot_zones enable row level security;

drop policy if exists "Zones are public" on public.groot_zones;
create policy "Zones are public"
  on public.groot_zones for select
  using (true);

insert into public.groot_zones (id, label, position) values
  ('matin',    'Matin',         1),
  ('corps',    'Corps & sport', 2),
  ('esprit',   'Esprit',        3),
  ('creer',    'Créativité',    4),
  ('travail',  'Travail',       5),
  ('soir',     'Soir',          6),
  ('libre',    'Autre',         7)
on conflict (id) do nothing;

-- ============================================================
-- TABLE: groot_habits
-- Une habitude = une graine. Trois familles cohabitent (§2) :
--   'construire' — je veux faire quelque chose de plus ;
--   'arreter'    — je veux réduire quelque chose ;
--   'creer'      — j'explore, je crée par curiosité.
-- Le format "Je veux [action] à [moment] à [lieu]" (§6.A.5) est
-- décomposé en trois champs pour rester queryable, jamais en JSON
-- opaque : habit_text / time_of_day / place.
-- ============================================================
create table if not exists public.groot_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Identifiant immuable généré côté client (offline-first) : c'est lui
  -- qui fait le lien entre sqflite et Postgres, jamais `id`.
  client_id text not null unique,
  name text not null check (length(trim(name)) between 1 and 80),
  family text not null check (family in ('construire', 'arreter', 'creer')),
  zone_id text not null default 'libre' references public.groot_zones(id),
  -- Champs "implementation intention" façon Atomic Habits.
  habit_text text not null default '',
  time_of_day text,
  place text,
  -- Fréquence : quel(s) jour(s) de la semaine, null = tous les jours.
  -- Tableau de 0 (lundi) à 6 (dimanche), façon ISO 8601.
  days_of_week int[] not null default '{0,1,2,3,4,5,6}',
  -- Heure de rappel locale 'HH:MM', null = pas de rappel.
  reminder_time text check (reminder_time is null or reminder_time ~ '^[0-9]{2}:[0-9]{2}$'),
  -- Mode pause façon vacances (§6.C) : une habitude gelée n'est pas
  -- proposée du jour ni comptée dans le streak.
  frozen boolean not null default false,
  -- Archivage doux : jamais de suppression brutale demandée à
  -- l'utilisateur, l'historique reste consultable.
  archived boolean not null default false,
  -- Streak courant et meilleur streak, recalculés par le trigger
  -- ci-dessous à chaque entrée.
  current_streak int not null default 0,
  best_streak int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Marqueurs de synchronisation offline-first : écrit local enregistré
  -- à synced_at ; deleted_at signale une suppression à propager.
  synced_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_groot_habits_user
  on public.groot_habits(user_id, archived, created_at desc);
create index if not exists idx_groot_habits_zone
  on public.groot_habits(user_id, zone_id);

alter table public.groot_habits enable row level security;

drop policy if exists "Owner reads own habits" on public.groot_habits;
create policy "Owner reads own habits"
  on public.groot_habits for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner creates habits" on public.groot_habits;
create policy "Owner creates habits"
  on public.groot_habits for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner updates habits" on public.groot_habits;
create policy "Owner updates habits"
  on public.groot_habits for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owner deletes habits" on public.groot_habits;
create policy "Owner deletes habits"
  on public.groot_habits for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- TABLE: groot_habit_entries
-- Une entrée = un jour validé pour une habitude. On n'enregistre
-- jamais un "raté" : un jour sans entrée est un jour sans entrée,
-- point. C'est ce choix qui rend impossible la culpabilisation
-- (§7 : "aucune pénalité visuelle agressive").
-- Le couple (client_habit_id, date) est unique : valider deux fois le
-- même jour est impossible côté serveur comme côté client.
-- ============================================================
create table if not exists public.groot_habit_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  habit_id uuid not null references public.groot_habits(id) on delete cascade,
  -- Même clé de jointure offline que pour l'habitude.
  client_habit_id text not null,
  -- Date locale du jour validé (sans heure, sans fuseau : le jour de
  -- l'utilisateur, pas celui du serveur).
  entry_date date not null,
  -- Note de journal attachée au jour validé (§6.B.3), optionnelle.
  note text not null default '',
  -- Horodatage de la validation, pour l'ordre d'affichage.
  checked_at timestamptz not null default now(),
  synced_at timestamptz not null default now()
);

create unique index if not exists idx_groot_entries_unique_day
  on public.groot_habit_entries(client_habit_id, entry_date);
create index if not exists idx_groot_entries_user_date
  on public.groot_habit_entries(user_id, entry_date desc);
create index if not exists idx_groot_entries_habit
  on public.groot_habit_entries(habit_id, entry_date desc);

alter table public.groot_habit_entries enable row level security;

drop policy if exists "Owner reads own entries" on public.groot_habit_entries;
create policy "Owner reads own entries"
  on public.groot_habit_entries for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner creates entries" on public.groot_habit_entries;
create policy "Owner creates entries"
  on public.groot_habit_entries for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.groot_habits h
      where h.id = habit_id and h.user_id = auth.uid()
    )
  );

drop policy if exists "Owner deletes own entries" on public.groot_habit_entries;
create policy "Owner deletes own entries"
  on public.groot_habit_entries for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- TABLE: groot_badges
-- Paliers de récompense (§6.C) : 7j, 21j, 60j, 100j… Fournis par cette
-- migration, jamais écrits depuis l'application.
-- ============================================================
create table if not exists public.groot_badges (
  id text primary key,
  label text not null,
  description text not null default '',
  -- Nombre de jours de constance pour débloquer. Le premier badge se
  -- débloque à la toute première validation (required_streak = 1) : la
  -- contrainte accepte donc dès 1, pas 3.
  required_streak int not null check (required_streak >= 1),
  -- Objet de personnalisation offert au débloquage (§6.C).
  unlocks_decoration text,
  position int not null default 0
);

-- Le premier push a pu créer la table avec l'ancienne contrainte >= 3
-- (échec en cours d'application, table figée par le if not exists) :
-- on aligne la contrainte en base sur la définition corrigée.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'groot_badges_required_streak_check'
      and conrelid = 'public.groot_badges'::regclass
  )
    and not exists (
      select 1 from pg_constraint
      where conname = 'groot_badges_required_streak_check'
        and conrelid = 'public.groot_badges'::regclass
        and pg_get_constraintdef(oid) like '%>= 1%'
    ) then
    alter table public.groot_badges
      drop constraint groot_badges_required_streak_check;
    alter table public.groot_badges
      add constraint groot_badges_required_streak_check
      check (required_streak >= 1) not valid;
  end if;
end $$;

alter table public.groot_badges enable row level security;

drop policy if exists "Badges are public" on public.groot_badges;
create policy "Badges are public"
  on public.groot_badges for select
  using (true);

insert into public.groot_badges (id, label, description, required_streak, unlocks_decoration, position) values
  ('premiere-graine', 'Première graine',  'Ta première habitude validée. La forêt commence.',              1,   'pot-terracotta',   1),
  ('sept-feuilles',   'Sept feuilles',    'Une semaine complète. Groot passe au stade pousse.',           7,   'echarpe',          2),
  ('vingt-un-jours',  'Trois semaines',   '21 jours de constance — le réflexe est en place.',             21,  'pot-ceramique',    3),
  ('soixante-jours',  'Deux mois',        '60 jours. Groot devient un jeune arbre.',                      60,  'lanterne',         4),
  ('cent-jours',      'Cent jours',       '100 jours de constance. Une branche est apparue.',             100, 'lucioles',         5),
  ('un-an',           'Une saison entière', '365 jours. Groot est un arbre ancien, au feuillage doré.',   365, 'feuillage-dore',  6)
on conflict (id) do nothing;

-- ============================================================
-- TABLE: groot_user_badges
-- Badges débloqués par l'utilisateur. Le client débloque à la
-- validation d'habitude et écrit ici — le serveur se contente de
-- vérifier la cohérence (streak réellement atteint) via RLS.
-- ============================================================
create table if not exists public.groot_user_badges (
  user_id uuid references public.profiles(id) on delete cascade,
  badge_id text references public.groot_badges(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.groot_user_badges enable row level security;

drop policy if exists "Owner reads own badges" on public.groot_user_badges;
create policy "Owner reads own badges"
  on public.groot_user_badges for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner unlocks own badges" on public.groot_user_badges;
create policy "Owner unlocks own badges"
  on public.groot_user_badges for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.groot_habits h
      where h.user_id = auth.uid()
        and h.best_streak >= (
          select required_streak from public.groot_badges b
          where b.id = badge_id
        )
    )
  );

-- ============================================================
-- TRIGGER: updated_at automatique
-- Réutilise la fonction commune, comme rondo_ et vitae_ avant nous.
-- ============================================================
drop trigger if exists trg_groot_profiles_updated_at on public.groot_profiles;
create trigger trg_groot_profiles_updated_at
  before update on public.groot_profiles
  for each row execute function public.update_updated_at();

drop trigger if exists trg_groot_habits_updated_at on public.groot_habits;
create trigger trg_groot_habits_updated_at
  before update on public.groot_habits
  for each row execute function public.update_updated_at();

-- ============================================================
-- INDEX de recherche : habitudes par nom (filtre, quick-add)
-- ============================================================
create index if not exists idx_groot_habits_name
  on public.groot_habits using gin (to_tsvector('simple', name));