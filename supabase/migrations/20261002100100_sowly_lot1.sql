-- ============================================================
-- Sowly (Graines d'Habitudes) — lot 1 : tracker d'habitudes + tâches
--
-- Cinquième application de la base, préfixe `sowly_`. Réutilise sans les
-- toucher `public.profiles` (créé à l'inscription par `handle_new_user`,
-- auth par pseudo-email comme Hive) et `public.update_updated_at()`.
--
-- Le schéma est taillé pour une PWA offline-first (brief §4) :
--
--   - **Identifiants générés par le client.** Une habitude créée dans le
--     métro existe tout de suite avec son `id` définitif ; l'envoi au
--     serveur est un `upsert` rejouable autant de fois qu'il le faut, sans
--     colonne `client_id` à réconcilier.
--   - **Rien ne s'efface vraiment.** Chaque table porte `deleted_at` : une
--     suppression est une mise à jour comme une autre, qui voyage jusqu'aux
--     autres appareils par la même requête « tout ce qui a changé depuis ».
--     Un `delete` SQL, lui, ne laisserait aucune trace à synchroniser.
--   - **`updated_at` appartient au serveur.** Le trigger le pose ; c'est le
--     curseur de synchronisation, donc il doit venir d'une seule horloge.
--
-- Deux règles du brief se lisent dans les tables :
--   - illimité en gratuit (§10) : aucune limite de nombre, aucune colonne
--     premium ;
--   - jamais culpabilisant (§9) : `sowly_habit_checks` n'enregistre que des
--     jours validés. Un jour manqué n'a pas de ligne, donc pas de statut
--     « échec » possible.
--
-- Les séries (streaks) ne sont pas stockées : elles se déduisent des
-- validations côté client (`apps/sowly/lib/streak.ts`). Une série stockée
-- dériverait à la première validation hors-ligne rejouée dans le désordre.
--
-- Migration rejouable : `if not exists`, `drop … if exists` avant chaque
-- `create policy` / `create trigger` (README de ce dossier).
-- ============================================================

-- ============================================================
-- TABLE: sowly_profiles
-- Ce que Sowly ajoute au profil commun : les identités choisies à
-- l'onboarding (« qui veux-tu devenir ? », hérité d'Atoms) et la date du
-- contrat d'engagement tenu au doigt (hérité de Grit).
-- ============================================================
create table if not exists public.sowly_profiles (
  user_id uuid primary key default auth.uid()
    references public.profiles(id) on delete cascade,
  -- Identifiants du catalogue `apps/sowly/lib/identities.ts`. Pas de CHECK
  -- sur la liste : le catalogue doit pouvoir s'enrichir sans migration.
  identities text[] not null default '{}'
    check (cardinality(identities) <= 8),
  committed_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sowly_profiles enable row level security;

drop policy if exists "Owner reads own sowly profile" on public.sowly_profiles;
create policy "Owner reads own sowly profile"
  on public.sowly_profiles for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner inserts own sowly profile" on public.sowly_profiles;
create policy "Owner inserts own sowly profile"
  on public.sowly_profiles for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner updates own sowly profile" on public.sowly_profiles;
create policy "Owner updates own sowly profile"
  on public.sowly_profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TABLE: sowly_habits
-- Une habitude au format d'intention d'implémentation : « Je veux
-- [action] [quand] [où] » (brief §8.A.3). `moment` sert au regroupement
-- de l'écran Aujourd'hui (Matin / Journée / Soir).
-- ============================================================
create table if not exists public.sowly_habits (
  id uuid primary key,
  user_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,
  action text not null check (length(trim(action)) between 1 and 80),
  moment text not null default 'journee'
    check (moment in ('matin', 'journee', 'soir')),
  cue text not null default '' check (length(cue) <= 60),
  place text not null default '' check (length(place) <= 60),
  identity text check (identity is null or length(identity) <= 32),
  why text not null default '' check (length(why) <= 280),
  -- Jours prévus, 0 = dimanche (convention de `Date.getDay()`).
  days smallint[] not null default '{0,1,2,3,4,5,6}'
    check (cardinality(days) between 1 and 7 and days <@ '{0,1,2,3,4,5,6}'),
  -- Premier jour où l'habitude compte : un jour antérieur n'est jamais un
  -- jour manqué.
  start_day date not null default current_date,
  position int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_sowly_habits_sync
  on public.sowly_habits(user_id, updated_at);

alter table public.sowly_habits enable row level security;

drop policy if exists "Owner reads own habits" on public.sowly_habits;
create policy "Owner reads own habits"
  on public.sowly_habits for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner creates habits" on public.sowly_habits;
create policy "Owner creates habits"
  on public.sowly_habits for insert to authenticated
  with check (auth.uid() = user_id);

-- Un `upsert` sur l'identifiant d'un autre compte tombe ici : la ligne
-- existe, elle n'est pas à lui, la mise à jour est refusée.
drop policy if exists "Owner updates habits" on public.sowly_habits;
create policy "Owner updates habits"
  on public.sowly_habits for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TABLE: sowly_habit_checks
-- Un jour validé pour une habitude. Clé naturelle (habitude, jour) :
-- valider deux fois le même jour est impossible, et dévalider est une
-- mise à jour de `deleted_at` qui se synchronise comme le reste.
-- ============================================================
create table if not exists public.sowly_habit_checks (
  habit_id uuid not null references public.sowly_habits(id) on delete cascade,
  -- Jour local de l'utilisateur, sans heure ni fuseau.
  day date not null,
  user_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (habit_id, day)
);

create index if not exists idx_sowly_checks_sync
  on public.sowly_habit_checks(user_id, updated_at);

alter table public.sowly_habit_checks enable row level security;

drop policy if exists "Owner reads own checks" on public.sowly_habit_checks;
create policy "Owner reads own checks"
  on public.sowly_habit_checks for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner creates checks" on public.sowly_habit_checks;
create policy "Owner creates checks"
  on public.sowly_habit_checks for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.sowly_habits h
      where h.id = habit_id and h.user_id = auth.uid()
    )
  );

drop policy if exists "Owner updates checks" on public.sowly_habit_checks;
create policy "Owner updates checks"
  on public.sowly_habit_checks for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TABLE: sowly_task_lists
-- Listes simples façon Microsoft To Do (perso, pro, courses…). La liste
-- par défaut « Tâches » n'a pas de ligne : c'est `list_id is null`.
-- ============================================================
create table if not exists public.sowly_task_lists (
  id uuid primary key,
  user_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_sowly_lists_sync
  on public.sowly_task_lists(user_id, updated_at);

alter table public.sowly_task_lists enable row level security;

drop policy if exists "Owner reads own lists" on public.sowly_task_lists;
create policy "Owner reads own lists"
  on public.sowly_task_lists for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner creates lists" on public.sowly_task_lists;
create policy "Owner creates lists"
  on public.sowly_task_lists for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner updates lists" on public.sowly_task_lists;
create policy "Owner updates lists"
  on public.sowly_task_lists for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TABLE: sowly_tasks
-- Une tâche ponctuelle : case à cocher, échéance facultative, rien de
-- plus (brief §3.2). `my_day` porte le jour où l'utilisateur l'a mise dans
-- « Ma journée » : comme dans To Do, la vue se vide d'elle-même le
-- lendemain sans qu'aucune écriture soit nécessaire.
-- ============================================================
create table if not exists public.sowly_tasks (
  id uuid primary key,
  user_id uuid not null default auth.uid()
    references public.profiles(id) on delete cascade,
  list_id uuid references public.sowly_task_lists(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 200),
  due_day date,
  my_day date,
  done_at timestamptz,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_sowly_tasks_sync
  on public.sowly_tasks(user_id, updated_at);

alter table public.sowly_tasks enable row level security;

drop policy if exists "Owner reads own tasks" on public.sowly_tasks;
create policy "Owner reads own tasks"
  on public.sowly_tasks for select to authenticated
  using (auth.uid() = user_id);

-- Une tâche ne peut être rangée que dans une liste de son propriétaire.
drop policy if exists "Owner creates tasks" on public.sowly_tasks;
create policy "Owner creates tasks"
  on public.sowly_tasks for insert to authenticated
  with check (
    auth.uid() = user_id
    and (list_id is null or exists (
      select 1 from public.sowly_task_lists l
      where l.id = list_id and l.user_id = auth.uid()
    ))
  );

drop policy if exists "Owner updates tasks" on public.sowly_tasks;
create policy "Owner updates tasks"
  on public.sowly_tasks for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (list_id is null or exists (
      select 1 from public.sowly_task_lists l
      where l.id = list_id and l.user_id = auth.uid()
    ))
  );

-- ============================================================
-- Aucune policy DELETE : l'application ne supprime jamais une ligne, elle
-- pose `deleted_at` (voir l'en-tête). La purge des lignes supprimées
-- depuis longtemps sera une tâche serveur, pas un droit du client.
--
-- TRIGGERS: updated_at, fonction commune à toutes les apps.
-- ============================================================
drop trigger if exists trg_sowly_profiles_updated_at on public.sowly_profiles;
create trigger trg_sowly_profiles_updated_at
  before update on public.sowly_profiles
  for each row execute function public.update_updated_at();

drop trigger if exists trg_sowly_habits_updated_at on public.sowly_habits;
create trigger trg_sowly_habits_updated_at
  before update on public.sowly_habits
  for each row execute function public.update_updated_at();

drop trigger if exists trg_sowly_checks_updated_at on public.sowly_habit_checks;
create trigger trg_sowly_checks_updated_at
  before update on public.sowly_habit_checks
  for each row execute function public.update_updated_at();

drop trigger if exists trg_sowly_lists_updated_at on public.sowly_task_lists;
create trigger trg_sowly_lists_updated_at
  before update on public.sowly_task_lists
  for each row execute function public.update_updated_at();

drop trigger if exists trg_sowly_tasks_updated_at on public.sowly_tasks;
create trigger trg_sowly_tasks_updated_at
  before update on public.sowly_tasks
  for each row execute function public.update_updated_at();
