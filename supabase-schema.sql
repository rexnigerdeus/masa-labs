# The Everyday Co. — Schéma SQL Supabase

> À saisir directement dans le SQL Editor de Supabase.
> Projet : **The Everyday Co.** (un seul projet, une seule base, tables préfixées par app).
>
> **Auth :** pseudo-email + mot de passe (Supabase Auth natif, gratuit, zéro config externe).
> Le numéro de téléphone est transformé en pseudo-email `0700000000@everyday.co`
> pour utiliser l'auth email/password de Supabase sans envoyer d'email.
> Le téléphone réel est stocké dans `profiles.phone`.

---

## ÉTAPE 1 — Tables partagées (auth, profiles, OTP)

```sql
-- ============================================================
-- FONCTION: normalize_phone_to_email
-- Transforme un numéro de téléphone en pseudo-email unique
-- pour utiliser l'auth email/password de Supabase sans envoyer
-- d'email. Le téléphone reste l'identité réelle (stocké dans profiles).
-- Ex: "07 00 00 00 00" → "0700000000@everyday.co"
-- ============================================================
create or replace function public.normalize_phone_to_email(p_phone text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(p_phone, '[^0-9]', '', 'g')) || '@everyday.co';
$$;

-- ============================================================
-- TABLE: profiles
-- Extension de auth.users avec les infos communes
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index pour recherche par téléphone
create index if not exists idx_profiles_phone on public.profiles(phone);

-- Auto-création du profil à l'inscription
-- L'email est un pseudo-email (0700000000@everyday.co)
-- On extrait le téléphone depuis l'email pour le stocker dans profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_phone text;
begin
  -- Extraire le téléphone du pseudo-email (tout ce qui est avant @)
  v_phone := split_part(new.email, '@', 1);

  insert into public.profiles (id, phone, full_name)
  values (
    new.id,
    v_phone,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS : chaque user ne voit que son propre profil
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Les users peuvent voir les profils des autres membres
-- d'une tontine à laquelle ils appartiennent (admin ou membre actif)
create policy "Users can view co-members profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.rondo_membres me
      where me.user_id = auth.uid()
      and me.statut = 'actif'
      and exists (
        select 1 from public.rondo_membres them
        where them.user_id = profiles.id
        and them.tontine_id = me.tontine_id
        and them.statut = 'actif'
      )
    )
    or exists (
      select 1 from public.rondo_tontines t
      where t.admin_id = auth.uid()
      and exists (
        select 1 from public.rondo_membres them
        where them.user_id = profiles.id
        and them.tontine_id = t.id
        and them.statut = 'actif'
      )
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
```

---

## ÉTAPE 2 — Tables Rondo (tontines)

```sql
-- ============================================================
-- RONDO: Gestion de tontines
-- Préfixe: rondo_
-- IMPORTANT: Toutes les tables sont créées d'abord, puis les
-- RLS policies sont ajoutées ensuite (pour éviter les erreurs
-- de référence croisée entre tables).
-- ============================================================

-- ---- ÉTAPE 2A: Création de toutes les tables ----

-- Table: rondo_tontines
create table if not exists public.rondo_tontines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  mise integer not null check (mise > 0), -- montant de la cotisation en FCFA
  frequence text not null check (frequence in ('hebdomadaire', 'mensuelle')),
  nb_membres integer not null check (nb_membres >= 2 and nb_membres <= 50),
  date_debut date not null,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'active', 'terminee', 'annulee')),
  invitation_code text unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Chaque admin ne peut pas avoir 2 tontines avec le même nom
  unique(admin_id, name)
);

create index if not exists idx_rondo_tontines_admin on public.rondo_tontines(admin_id);
create index if not exists idx_rondo_tontines_code on public.rondo_tontines(invitation_code);

-- Table: rondo_membres
create table if not exists public.rondo_membres (
  id uuid primary key default gen_random_uuid(),
  tontine_id uuid not null references public.rondo_tontines(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  ordre_tour integer, -- position dans l'ordre des tours (1 à nb_membres)
  statut text not null default 'actif' check (statut in ('actif', 'exclu', 'parti')),
  joined_at timestamptz not null default now(),
  unique(tontine_id, user_id)
);

create index if not exists idx_rondo_membres_tontine on public.rondo_membres(tontine_id);
create index if not exists idx_rondo_membres_user on public.rondo_membres(user_id);

-- Table: rondo_tours
create table if not exists public.rondo_tours (
  id uuid primary key default gen_random_uuid(),
  tontine_id uuid not null references public.rondo_tontines(id) on delete cascade,
  numero integer not null, -- 1 à nb_membres
  date_debut date not null,
  date_fin date not null,
  beneficiaire_id uuid references public.rondo_membres(id) on delete set null,
  statut text not null default 'a_venir' check (statut in ('a_venir', 'en_cours', 'termine')),
  created_at timestamptz not null default now(),
  unique(tontine_id, numero)
);

create index if not exists idx_rondo_tours_tontine on public.rondo_tours(tontine_id);

-- Table: rondo_paiements
create table if not exists public.rondo_paiements (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.rondo_tours(id) on delete cascade,
  membre_id uuid not null references public.rondo_membres(id) on delete cascade,
  montant integer not null check (montant >= 0),
  mode text not null check (mode in ('especes', 'wave', 'orange_money', 'mtn_money')),
  note text,
  confirmed_by uuid not null references public.profiles(id), -- l'admin qui a enregistré
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(tour_id, membre_id) -- un seul paiement par membre par tour
);

create index if not exists idx_rondo_paiements_tour on public.rondo_paiements(tour_id);
create index if not exists idx_rondo_paiements_membre on public.rondo_paiements(membre_id);

-- Table: rondo_notifications
create table if not exists public.rondo_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tontine_id uuid references public.rondo_tontines(id) on delete cascade,
  type text not null check (type in ('rappel_cotisation', 'paiement_confirme', 'nouveau_membre', 'tour_atteint', 'message_admin', 'retard_paiement')),
  titre text not null,
  corps text not null,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_rondo_notifs_user on public.rondo_notifications(user_id, lu, created_at desc);

-- Table: rondo_subscriptions
-- Plan d'abonnement de chaque user (1 ligne par user).
-- plan = 'gratuit' | 'standard' | 'pro'
-- v1.1 : l'upgrade se fait via In-App Purchase (StoreKit / Play Billing).
-- Le reçu IAP est stocké dans iap_transaction_id / iap_receipt pour
-- vérification serveur future (notifications App Store /s2s en v2).
create table if not exists public.rondo_subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'gratuit' check (plan in ('gratuit', 'standard', 'pro')),
  started_at timestamptz not null default now(),
  expires_at timestamptz, -- null = illimité (jamais expiré), sinon date de fin
  iap_transaction_id text, -- ID de transaction IAP (StoreKit / Play)
  iap_product_id text,      -- co.everyday.rondo.standard.monthly | .pro.monthly
  iap_platform text,         -- 'ios' | 'android'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- ÉTAPE 2B: Activation RLS sur toutes les tables ----

alter table public.rondo_tontines enable row level security;
alter table public.rondo_membres enable row level security;
alter table public.rondo_tours enable row level security;
alter table public.rondo_paiements enable row level security;
alter table public.rondo_notifications enable row level security;

-- ---- ÉTAPE 2C: Fonctions helper SECURITY DEFINER ----
-- Ces fonctions bypassent le RLS pour vérifier l'appartenance
-- sans déclencher de récursion infinie entre policies.

-- Vérifie si l'user est admin d'une tontine
create or replace function public.rondo_is_admin(p_tontine_id uuid, p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.rondo_tontines t
    where t.id = p_tontine_id and t.admin_id = p_user_id
  );
$$;

-- Vérifie si l'user est membre actif d'une tontine
create or replace function public.rondo_is_membre(p_tontine_id uuid, p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.rondo_membres m
    where m.tontine_id = p_tontine_id
    and m.user_id = p_user_id
    and m.statut = 'actif'
  );
$$;

-- Vérifie si l'user est admin ou membre actif d'une tontine
create or replace function public.rondo_is_member_or_admin(p_tontine_id uuid, p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.rondo_is_admin(p_tontine_id, p_user_id)
      or public.rondo_is_membre(p_tontine_id, p_user_id);
$$;

-- ---- ÉTAPE 2D: Policies RLS (utilisent les fonctions helper) ----

-- rondo_tontines: l'admin peut tout faire (insert/update/delete), le select est séparé
create policy "Admin can manage own tontines"
  on public.rondo_tontines for all
  using (auth.uid() = admin_id)
  with check (auth.uid() = admin_id);

create policy "Members can view their tontines"
  on public.rondo_tontines for select
  using (
    auth.uid() = admin_id
    or public.rondo_is_membre(id, auth.uid())
  );

-- rondo_membres: l'admin gère, les membres voient leurs co-membres
create policy "Admin can manage members"
  on public.rondo_membres for all
  using (public.rondo_is_admin(tontine_id, auth.uid()));

create policy "Members can view co-members"
  on public.rondo_membres for select
  using (
    auth.uid() = user_id
    or public.rondo_is_member_or_admin(tontine_id, auth.uid())
  );

-- rondo_tours: l'admin gère, les membres voient
create policy "Admin can manage tours"
  on public.rondo_tours for all
  using (public.rondo_is_admin(tontine_id, auth.uid()));

create policy "Members can view tours"
  on public.rondo_tours for select
  using (public.rondo_is_membre(tontine_id, auth.uid()));

-- rondo_paiements: l'admin gère, les membres voient
create policy "Admin can manage payments"
  on public.rondo_paiements for all
  using (
    exists (
      select 1 from public.rondo_tours t
      where t.id = rondo_paiements.tour_id
      and public.rondo_is_admin(t.tontine_id, auth.uid())
    )
  );

create policy "Members can view payments in their tontines"
  on public.rondo_paiements for select
  using (
    exists (
      select 1 from public.rondo_tours t
      where t.id = rondo_paiements.tour_id
      and public.rondo_is_membre(t.tontine_id, auth.uid())
    )
  );

-- rondo_notifications: chaque user voit et modifie les siennes
create policy "Users can view own notifications"
  on public.rondo_notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.rondo_notifications for update
  using (auth.uid() = user_id);

-- L'insertion de notifications se fait via Edge Function (service_role)
```

---

## ÉTAPE 3 — Fonctions RPC (logique métier Rondo)

```sql
-- ============================================================
-- RPC: Rejoindre une tontine avec un code d'invitation
-- ============================================================
create or replace function public.rondo_rejoindre_tontine(p_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_tontine record;
  v_membre_id uuid;
begin
  -- Trouver la tontine par code
  select * into v_tontine
  from public.rondo_tontines
  where invitation_code = upper(trim(p_code))
  and statut in ('en_attente', 'active');

  if not found then
    raise exception 'Code d''invitation invalide ou tontine non disponible';
  end if;

  -- Vérifier que l'user n'est pas déjà membre
  if exists (
    select 1 from public.rondo_membres
    where tontine_id = v_tontine.id
    and user_id = auth.uid()
    and statut = 'actif'
  ) then
    raise exception 'Vous êtes déjà membre de cette tontine';
  end if;

  -- Vérifier que la tontine n'est pas complète
  if (
    select count(*) from public.rondo_membres
    where tontine_id = v_tontine.id and statut = 'actif'
  ) >= v_tontine.nb_membres then
    raise exception 'Cette tontine est complète';
  end if;

  -- Ajouter le membre
  insert into public.rondo_membres (tontine_id, user_id)
  values (v_tontine.id, auth.uid())
  returning id into v_membre_id;

  -- Notifier l'admin
  insert into public.rondo_notifications (user_id, tontine_id, type, titre, corps)
  values (
    v_tontine.admin_id,
    v_tontine.id,
    'nouveau_membre',
    'Nouveau membre',
    'Un nouveau membre a rejoint la tontine "' || v_tontine.name || '"'
  );

  return v_membre_id;
end;
$$;

-- ============================================================
-- RPC: Calculer la cagnotte d'un tour
-- ============================================================
create or replace function public.rondo_cagnotte_tour(p_tour_id uuid)
returns integer
language sql
security definer set search_path = public
as $$
  select coalesce(sum(p.montant), 0)
  from public.rondo_paiements p
  where p.tour_id = p_tour_id;
$$;

-- ============================================================
-- RPC: Statut des cotisations d'un tour
-- ============================================================
create or replace function public.rondo_statut_tour(p_tour_id uuid)
returns table (
  membre_id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  paye boolean,
  montant_paye integer,
  mode text
)
language sql
security definer set search_path = public
as $$
  select
    m.id as membre_id,
    m.user_id,
    pr.full_name,
    pr.avatar_url,
    (p.id is not null) as paye,
    coalesce(p.montant, 0) as montant_paye,
    p.mode
  from public.rondo_membres m
  join public.profiles pr on m.user_id = pr.id
  left join public.rondo_paiements p on p.tour_id = p_tour_id and p.membre_id = m.id
  where m.tontine_id = (select tontine_id from public.rondo_tours where id = p_tour_id)
  and m.statut = 'actif'
  order by m.ordre_tour;
$$;

-- ============================================================
-- RPC: Tableau de bord membre (mes tontines + prochain paiement)
-- ============================================================
create or replace function public.rondo_home_membre()
returns table (
  tontine_id uuid,
  tontine_name text,
  mise integer,
  frequence text,
  statut text,
  nb_membres_actifs integer,
  nb_membres_total integer,
  cagnotte_actuelle integer,
  tour_actuel_numero integer,
  mon_tour_numero integer,
  mon_tour_date date,
  prochain_paiement_date date,
  cotisation_due boolean
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;

  return query
  with my_tontines as (
    select distinct m.tontine_id
    from public.rondo_membres m
    where m.user_id = v_uid
    and m.statut = 'actif'
  )
  select
    t.id,
    t.name,
    t.mise,
    t.frequence,
    t.statut,
    (
      select count(*)::integer
      from public.rondo_membres m
      where m.tontine_id = t.id
      and m.statut = 'actif'
    ) as nb_membres_actifs,
    t.nb_membres as nb_membres_total,
    (
      select coalesce(sum(p.montant), 0)::integer
      from public.rondo_paiements p
      join public.rondo_tours tr2 on p.tour_id = tr2.id
      where tr2.tontine_id = t.id and tr2.statut = 'en_cours'
    ) as cagnotte_actuelle,
    (
      select tr.numero
      from public.rondo_tours tr
      where tr.tontine_id = t.id and tr.statut = 'en_cours'
      limit 1
    ) as tour_actuel_numero,
    (
      select tr.numero
      from public.rondo_tours tr
      join public.rondo_membres m1 on tr.beneficiaire_id = m1.id
      where tr.tontine_id = t.id
      and m1.user_id = v_uid
      and m1.statut = 'actif'
      limit 1
    ) as mon_tour_numero,
    (
      select tr.date_debut
      from public.rondo_tours tr
      join public.rondo_membres m1 on tr.beneficiaire_id = m1.id
      where tr.tontine_id = t.id
      and m1.user_id = v_uid
      and m1.statut = 'actif'
      limit 1
    ) as mon_tour_date,
    (
      select min(tr2.date_debut)
      from public.rondo_tours tr2
      join public.rondo_membres m2 on tr2.beneficiaire_id = m2.id
      where tr2.tontine_id = t.id
      and m2.user_id = v_uid
      and m2.statut = 'actif'
      and tr2.statut != 'termine'
      and not exists (
        select 1 from public.rondo_paiements p
        where p.tour_id = tr2.id and p.membre_id = m2.id
      )
    ) as prochain_paiement_date,
    exists (
      select 1
      from public.rondo_tours tr3
      join public.rondo_membres m3 on tr3.beneficiaire_id = m3.id
      where tr3.tontine_id = t.id
      and m3.user_id = v_uid
      and m3.statut = 'actif'
      and tr3.statut = 'en_cours'
      and not exists (
        select 1 from public.rondo_paiements p
        where p.tour_id = tr3.id and p.membre_id = m3.id
      )
    ) as cotisation_due
  from public.rondo_tontines t
  inner join my_tontines mt on mt.tontine_id = t.id
  where t.statut in ('en_attente', 'active')
  order by t.created_at desc;
end;
$$;

-- ============================================================
-- RPC: Tableau de bord admin (mes tontines gérées)
-- ============================================================
create or replace function public.rondo_home_admin()
returns table (
  tontine_id uuid,
  tontine_name text,
  mise integer,
  nb_membres_actifs integer,
  nb_membres_total integer,
  statut text,
  tour_actuel_numero integer,
  cagnotte_actuelle integer
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  select
    t.id as tontine_id,
    t.name as tontine_name,
    t.mise,
    (select count(*)::integer from public.rondo_membres m where m.tontine_id = t.id and m.statut = 'actif') as nb_membres_actifs,
    t.nb_membres as nb_membres_total,
    t.statut,
    (select tr.numero from public.rondo_tours tr where tr.tontine_id = t.id and tr.statut = 'en_cours' limit 1) as tour_actuel_numero,
    (
      select coalesce(sum(p.montant), 0)::integer
      from public.rondo_paiements p
      join public.rondo_tours tr2 on p.tour_id = tr2.id
      where tr2.tontine_id = t.id and tr2.statut = 'en_cours'
    ) as cagnotte_actuelle
  from public.rondo_tontines t
  where t.admin_id = auth.uid()
  order by t.created_at desc;
end;
$$;

-- ============================================================
-- RPC: Générer les tours automatiquement
-- Appelée par l'admin après avoir défini l'ordre des membres
-- ============================================================
create or replace function public.rondo_generer_tours(p_tontine_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_tontine record;
  v_membre record;
  v_date_debut date;
  v_date_fin date;
  v_numero integer := 1;
  v_interval text;
begin
  -- Vérifier que l'user est admin
  select * into v_tontine
  from public.rondo_tontines
  where id = p_tontine_id and admin_id = auth.uid();

  if not found then
    raise exception 'Tontine non trouvée ou vous n''êtes pas admin';
  end if;

  -- Supprimer les tours existants s'il y en a
  delete from public.rondo_tours where tontine_id = p_tontine_id;

  v_date_debut := v_tontine.date_debut;

  -- Générer un tour par membre dans l'ordre défini
  for v_membre in
    select * from public.rondo_membres
    where tontine_id = p_tontine_id and statut = 'actif'
    order by ordre_tour
  loop
    if v_tontine.frequence = 'hebdomadaire' then
      v_date_fin := v_date_debut + interval '7 days';
    else
      v_date_fin := v_date_debut + interval '1 month';
    end if;

    insert into public.rondo_tours (tontine_id, numero, date_debut, date_fin, beneficiaire_id, statut)
    values (p_tontine_id, v_numero, v_date_debut, v_date_fin, v_membre.id,
      case when v_numero = 1 then 'en_cours' else 'a_venir' end);

    v_date_debut := v_date_fin;
    v_numero := v_numero + 1;
  end loop;

  -- Activer la tontine
  update public.rondo_tontines
  set statut = 'active', updated_at = now()
  where id = p_tontine_id;
end;
$$;
```

---

## ÉTAPE 4 — Trigger updated_at automatique

```sql
-- ============================================================
-- Fonction générique pour updated_at
-- ============================================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Appliquer aux tables qui ont updated_at
drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.update_updated_at();

drop trigger if exists set_updated_at_tontines on public.rondo_tontines;
create trigger set_updated_at_tontines
  before update on public.rondo_tontines
  for each row execute function public.update_updated_at();

-- ============================================================
-- RPC: Supprimer le compte de l'utilisateur courant
-- Supprime le profil, les tontines admin, les memberships
-- et le user auth. Action irréversible.
-- ============================================================
create or replace function public.delete_user()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;

  -- Supprimer le profil (cascade sur auth.users via FK on delete cascade)
  -- Les tables rondo_* ont admin_id / user_id qui référencent profiles(id)
  -- avec on delete cascade, donc tout est nettoyé automatiquement.
  delete from public.profiles where id = v_uid;

  -- Supprimer l'utilisateur auth
  delete from auth.users where id = v_uid;
end;
$$;
```

---

## ÉTAPE 5 — Tables Vitae (générateur de CV)

```sql
-- ============================================================
-- TABLE: vitae_cvs
-- Un utilisateur peut avoir plusieurs CVs (un par candidature)
-- ============================================================
create table if not exists public.vitae_cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titre text not null default 'Mon CV',
  template_id int not null default 1, -- 1=Classique, 2=Moderne, 3=Élégant, 4=Minimal, 5=Académique, 6=Stage
  couleur_principale text not null default '#3F6E91', -- steel blue par défaut
  objectif text, -- 'emploi' | 'stage' | 'mise_a_jour'
  statut text not null default 'brouillon' check (statut in ('brouillon', 'finalise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vitae_cvs_user on public.vitae_cvs(user_id);

-- RLS : chaque user ne voit que ses CVs
alter table public.vitae_cvs enable row level security;

create policy "Users can CRUD own cvs"
  on public.vitae_cvs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TABLE: vitae_sections
-- Sections d'un CV (perso, experience, formation, competence, langue, interet)
-- Les données sont stockées en JSONB pour flexibilité
-- ============================================================
create table if not exists public.vitae_sections (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.vitae_cvs(id) on delete cascade,
  type text not null check (type in ('perso','experience','formation','competence','langue','interet')),
  ordre int not null default 0,
  donnees jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_vitae_sections_cv on public.vitae_sections(cv_id);

-- RLS : via le cv_id → user_id
alter table public.vitae_sections enable row level security;

create policy "Users can CRUD own cv sections"
  on public.vitae_sections for all
  using (
    exists (
      select 1 from public.vitae_cvs
      where id = vitae_sections.cv_id
      and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.vitae_cvs
      where id = vitae_sections.cv_id
      and user_id = auth.uid()
    )
  );

-- ============================================================
-- TABLE: vitae_templates
-- Catalogue des 6 templates disponibles
-- ============================================================
create table if not exists public.vitae_templates (
  id int primary key,
  nom text not null,
  style text not null,
  ideal_pour text not null,
  disponible_free boolean not null default false
);

insert into public.vitae_templates (id, nom, style, ideal_pour, disponible_free) values
  (1, 'Classique',  '1 colonne, sobre, noir/blanc',     'Banque, Droit, Administration publique', true),
  (2, 'Moderne',    '2 colonnes, accent couleur',       'Marketing, Communication, Commercial',  false),
  (3, 'Élégant',    'En-tête photo, mise en page premium','Direction, Management, Finance',        false),
  (4, 'Minimal',    'Très épuré, beaucoup d''espace',    'Design, Tech, Créatif',                 false),
  (5, 'Académique', 'Détaillé, section publications',   'Enseignement, Recherche',                false),
  (6, 'Stage',      'Court (1 page forcée)',             'Étudiants, Stagiaires',                 true)
on conflict (id) do nothing;

-- RLS : templates lisibles par tous les users connectés
alter table public.vitae_templates enable row level security;

create policy "Authenticated can view templates"
  on public.vitae_templates for select
  to authenticated
  using (true);

-- ============================================================
-- TABLE: vitae_exports
-- Historique des exports PDF / partages
-- ============================================================
create table if not exists public.vitae_exports (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.vitae_cvs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('pdf', 'partage')),
  created_at timestamptz not null default now()
);

create index if not exists idx_vitae_exports_user on public.vitae_exports(user_id);

alter table public.vitae_exports enable row level security;

create policy "Users can CRUD own exports"
  on public.vitae_exports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TABLE: vitae_subscriptions
-- Plans : gratuit / premium / etudiant
-- ============================================================
create table if not exists public.vitae_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'gratuit' check (plan in ('gratuit', 'premium', 'etudiant')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vitae_subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.vitae_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can update own subscription"
  on public.vitae_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can insert own subscription"
  on public.vitae_subscriptions for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- RPC: vitae_get_full_cv
-- Récupère un CV complet avec toutes ses sections
-- ============================================================
create or replace function public.vitae_get_full_cv(p_cv_id uuid)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_cv record;
  v_sections jsonb;
begin
  select * into v_cv from public.vitae_cvs where id = p_cv_id;

  if not found then
    raise exception 'CV introuvable';
  end if;

  if v_cv.user_id != auth.uid() then
    raise exception 'Accès refusé';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'type', s.type,
      'ordre', s.ordre,
      'donnees', s.donnees
    ) order by s.ordre
  ), '[]'::jsonb) into v_sections
  from public.vitae_sections s
  where s.cv_id = p_cv_id;

  return jsonb_build_object(
    'id', v_cv.id,
    'titre', v_cv.titre,
    'template_id', v_cv.template_id,
    'couleur_principale', v_cv.couleur_principale,
    'objectif', v_cv.objectif,
    'statut', v_cv.statut,
    'sections', v_sections
  );
end;
$$;

-- ============================================================
-- RPC: vitae_duplicate_cv
-- Duplique un CV existant (pour l'adapter à une autre offre)
-- ============================================================
create or replace function public.vitae_duplicate_cv(p_cv_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_new_cv_id uuid;
  v_original record;
begin
  select * into v_original from public.vitae_cvs where id = p_cv_id;

  if not found then
    raise exception 'CV introuvable';
  end if;

  if v_original.user_id != auth.uid() then
    raise exception 'Accès refusé';
  end if;

  -- Créer la copie
  insert into public.vitae_cvs (user_id, titre, template_id, couleur_principale, objectif, statut)
  values (v_original.user_id, v_original.titre || ' (copie)', v_original.template_id, v_original.couleur_principale, v_original.objectif, 'brouillon')
  returning id into v_new_cv_id;

  -- Copier les sections
  insert into public.vitae_sections (cv_id, type, ordre, donnees)
  select v_new_cv_id, type, ordre, donnees
  from public.vitae_sections
  where cv_id = p_cv_id;

  return v_new_cv_id;
end;
$$;

-- ============================================================
-- TRIGGER: updated_at sur les tables Vitae
-- ============================================================
drop trigger if exists set_updated_at_vitae_cvs on public.vitae_cvs;
create trigger set_updated_at_vitae_cvs
  before update on public.vitae_cvs
  for each row execute function public.update_updated_at();

drop trigger if exists set_updated_at_vitae_subscriptions on public.vitae_subscriptions;
create trigger set_updated_at_vitae_subscriptions
  before update on public.vitae_subscriptions
  for each row execute function public.update_updated_at();

-- ============================================================
-- TABLE: vitae_articles
-- Articles édifiants (recherche d'emploi, réseautage, droit du travail CI)
-- Contenu éditorial public — lecture pour tous les users connectés
-- ============================================================
create table if not exists public.vitae_articles (
  id text primary key,
  category text not null check (category in (
    'rechercheEmploi', 'reseauage', 'relationsPro', 'marcheTravail', 'droitTravail'
  )),
  title text not null,
  excerpt text not null,
  content text not null,
  author text,
  read_time_minutes int,
  published_at timestamptz not null default now(),
  source_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_vitae_articles_category on public.vitae_articles(category);
create index if not exists idx_vitae_articles_published on public.vitae_articles(published_at desc);

-- RLS : articles lisibles par tous les users connectés
alter table public.vitae_articles enable row level security;

create policy "Authenticated can view articles"
  on public.vitae_articles for select
  to authenticated
  using (true);

-- Insertion du contenu initial (sync avec fallback du code Flutter)
-- Ces inserts sont idempotents (on conflict do nothing)
insert into public.vitae_articles (id, category, title, excerpt, content, author, read_time_minutes, source_url) values
  ('res-search-01', 'rechercheEmploi', 'Les 7 étapes d''une recherche d''emploi réussie en Côte d''Ivoire (2026)',
   'Une méthode structurée pour ne pas postuler au hasard : définissez votre cible, optimisez vos outils, activez votre réseau et suivez vos candidatures.',
   'Une recherche d''emploi efficace n''est pas une question de chance, mais de méthode. Voici les 7 étapes qui maximisent vos chances sur le marché ivoirien en 2026.

**1. Définissez votre cible avec précision**
Ne dites pas "je cherche un boulot". Dites "je cherche un poste de comptable junior dans une PME à Abidjan, idéalement dans le secteur de la distribution". Plus vous êtes précis, plus vous pouvez adapter votre CV et cibler les bonnes entreprises. Notez par écrit : le poste visé, le secteur, la zone géographique et le salaire minimum acceptable. Cette cible devient votre filtre pour toutes vos actions.

**2. Préparez vos outils de candidature**
Votre CV doit être professionnel, clair et compatible ATS (score ≥ 80/100) pour ne pas être écarté par les logiciels de tri. Rédigez aussi un profil LinkedIn complet : photo professionnelle, titre clair, résumé, expériences détaillées. En 2026, la majorité des recruteurs à Abidjan consultent LinkedIn avant même de vous appeler. Préparez également une lettre de motivation courte et personnalisable.

**3. Activez votre réseau en priorité**
70% des opportunités ne sont jamais publiées en ligne. Dites à votre famille, vos amis, vos anciens camarades de promo et vos anciens collègues de stage que vous cherchez. Le bouche-à-oreille reste le canal le plus efficace en Côte d''Ivoire. Rejoignez les groupes WhatsApp et Facebook de votre filière et de votre école.

**4. Surveillez les bonnes plateformes**
Au-delà d''Emploi.ci et de YoungProfessional, consultez régulièrement : les pages LinkedIn des cabinets de recrutement (Michael Page, Manpower CI, Talent2Africa), les sites carrières des grandes entreprises (Orange CI, MTN, Société Générale, BICIC, Nestlé CI, Ecobank), et les plateformes spécialisées comme JobIvoire. Configurez des alertes pour ne manquer aucune offre correspondant à votre cible.

**5. Postulez avec méthode et suivez vos candidatures**
Ne postulez pas à 50 offres en envoyant le même CV. Postulez à 10 offres avec un CV adapté à chacune : reprenez les mots-clés de l''offre dans votre CV et votre lettre. Qualité > quantité. Tenez un tableau de suivi (simple, sur Excel ou un carnet) : offre, entreprise, date de postulation, relance, statut. Cela vous évite de perdre le fil et montre votre sérieux.

**6. Préparez l''entretien en profondeur**
Renseignez-vous sur l''entreprise avant l''entretien : son activité, ses produits, ses actualités récentes. Préparez 3 questions à poser. Entraînez-vous à répondre aux questions classiques (voir notre article dédié). Arrivez 10 minutes en avance. Habillez-vous de façon professionnelle et adaptée au secteur.

**7. Relancez sans harceler**
Après une postulation, une relance 7 jours après montre votre motivation. Après un entretien, un message de remerciement le lendemain laisse une excellente impression. Si vous n''avez pas de réponse après 2 relances, passez à autre chose sans brûler de ponts : le marché est petit et vous pourriez recroiser ces recruteurs.',
   'Vitae', 6, null),
  ('res-search-02', 'rechercheEmploi', 'Comment répondre aux questions d''entretien les plus fréquentes',
   '"Présentez-vous", "Pourquoi notre entreprise ?", "Quelles sont vos prétentions salariales ?" — nos conseils pour répondre avec assurance.',
   'Les entretiens d''embauche en Côte d''Ivoire suivent des codes bien précis. Voici comment préparer des réponses claires et convaincantes aux questions incontournables.

**"Présentez-vous"**
Ne récitez pas votre CV : le recruteur l''a déjà lu. Racontez plutôt votre parcours en 2 minutes : qui vous êtes, ce que vous avez étudié, ce que vous savez faire, et pourquoi vous êtes là aujourd''hui. Structurez en 3 temps : formation, expérience clé, objectif. Exemple : "Je m''appelle Aya Koné, diplômée en gestion de l''UFHB. J''ai fait un stage de 6 mois chez Société Générale CI où j''ai participé au rapprochement bancaire. Aujourd''hui je cherche un poste de comptable junior pour mettre en pratique mes compétences."

**"Pourquoi notre entreprise ?"**
Montrez que vous vous êtes renseigné. Citez un fait précis : "J''ai vu que votre entreprise se développe dans la région du nord, et mon expérience en gestion de stock pourrait contribuer à cette expansion." Évitez les réponses génériques comme "parce que c''est une grande entreprise" ou "parce que vous payez bien".

**"Quelles sont vos prétentions salariales ?"**
Renseignez-vous sur les salaires du marché avant l''entretien. Pour un premier emploi à Abidjan, un comptable junior gagne entre 150 000 et 300 000 FCFA ; un commercial peut aller de 200 000 FCFA plus commissions. Donnez une fourchette, pas un chiffre exact : "Entre 250 000 et 350 000 FCFA selon les responsabilités." Si vous ne savez pas, retournez la question : "Quelle est la fourchette prévue pour ce poste ?"

**"Quel est votre plus grand défaut ?"**
Choisissez un vrai défaut, mais qui n''est pas rédhibitoire pour le poste, et montrez comment vous le gérez. "Je peux être trop perfectionniste, ce qui me prend parfois plus de temps. J''ai appris à mieux gérer mes priorités pour équilibrer qualité et délais."

**"Où vous voyez-vous dans 5 ans ?"**
Montrez de l''ambition réaliste et de la loyauté : "J''aimerais maîtriser parfaitement ce poste dans les 2 premières années, puis évoluer vers des responsabilités de supervision au sein de votre entreprise."

**"Avez-vous des questions ?"**
Posez-en toujours au moins une. "Quelles seraient mes missions concrètes les 3 premiers mois ?" ou "Comment se passe l''intégration des nouveaux dans votre équipe ?" Montrez votre intérêt et votre sérieux. Évitez les questions sur les congés ou le salaire à ce stade, sauf si on vous y invite.',
   'Vitae', 6, null),
  ('res-network-01', 'reseauage', 'Le réseautage en Côte d''Ivoire : votre plus grand atout',
   'Le réseau, ce n''est pas seulement LinkedIn. C''est votre famille, votre quartier, votre église, votre mosquée, vos anciens camarades.',
   'En Côte d''Ivoire, le réseau personnel est souvent plus important que le CV. Voici comment le cultiver intelligemment et durablement.

**Le réseau commence près de chez vous**
Votre oncle qui travaille à la mairie, la voisine qui tient une boutique, votre cousin chauffeur de taxi — chacun connaît quelqu''un qui cherche un profil. Ne sous-estimez jamais le pouvoir d''une conversation ordinaire. Annoncez clairement et simplement votre recherche à votre entourage : "Je cherche un poste de comptable, si vous entendez parler d''une opportunité, pensez à moi."

**Entretenez vos relations**
Le réseautage ne consiste pas à demander des faveurs. C''est entretenir des relations régulières. Appelez votre ancien tuteur de stage pour prendre de ses nouvelles. Partagez une information utile à un camarade. Félicitez un contact pour une réussite. Le réseau se nourrit de réciprocité : donnez avant de recevoir.

**Les événements professionnels**
Salons de l''emploi, conférences à l''université, meetups tech à Abidjan, forums entrepreneuriaux — chaque événement est une occasion de rencontrer des recruteurs et des professionnels. Préparez une carte de visite ou un profil LinkedIn à partager. Après l''événement, connectez-vous sur LinkedIn avec les personnes rencontrées et envoyez un message de rappel dans les 48h.

**LinkedIn : votre vitrine numérique**
Complétez votre profil, ajoutez une photo professionnelle, décrivez vos expériences avec des résultats concrets. Connectez-vous avec les personnes que vous rencontrez en événement. Publiez occasionnellement sur votre secteur pour montrer votre expertise : partagez un article, commentez une actualité, racontez une réussite. En 2026, un profil LinkedIn actif est un vrai avantage concurrentiel.

**Le réseau des anciens**
Les amicales d''anciens élèves de votre école sont des mines d''or. L''INPHB, l''UFHB, l''ESCG, l''ISM, l''UVCI — toutes ont des réseaux d''anciens actifs. Rejoignez les groupes WhatsApp et Facebook. Les anciens sont souvent plus disposés à aider un camarade de la même école.

**Sachez demander**
Quand vous sollicitez votre réseau, soyez clair et précis : "Je cherche un stage en comptabilité pour juillet, connaissez-vous quelqu''un qui recrute dans ce domaine ?" Pas de message vague. Et remerciez toujours, même si la réponse est non. Un simple "merci d''avoir pris le temps" laisse une bonne impression et garde la porte ouverte.',
   'Vitae', 6, null),
  ('res-relations-01', 'relationsPro', 'Bien démarrer un nouveau travail : les 90 premiers jours',
   'Les 3 premiers mois déterminent souvent la suite. Attitude, écoute, fiabilité — voici les bons réflexes.',
   'Vos 90 premiers jours dans une entreprise sont cruciaux : ils déterminent souvent la perception que vos collègues et votre manager auront de vous. Voici les réflexes qui feront la différence.

**Jour 1 : soyez présent et curieux**
Arrivez à l''heure. Habillez-vous en cohérence avec le code vestimentaire de l''entreprise. Présentez-vous à vos collègues et mémorisez les prénoms. Demandez comment fonctionne la machine à café, où est la cantine, qui fait quoi. Montrez de l''enthousiasme : c''est votre première impression.

**Semaines 1-2 : observez avant d''agir**
Ne cherchez pas à tout révolutionner immédiatement. Comprenez d''abord comment les choses fonctionnent : les processus, les outils, la culture d''entreprise. Posez des questions, prenez des notes. Montrez que vous apprenez vite. Un junior qui écoute et observe inspire confiance.

**Mois 1 : devenez fiable**
Soyez ponctuel. Tenez vos délais. Si vous ne savez pas faire quelque chose, dites-le et proposez une solution plutôt que de rester bloqué. La fiabilité est la qualité la plus recherchée chez un junior : on doit pouvoir compter sur vous.

**Mois 2 : prenez des initiatives**
Identifiez un petit problème que vous pouvez résoudre. Proposez une amélioration concrète. Montrez que vous n''attendez pas qu''on vous dise quoi faire, tout en respectant la hiérarchie. Une initiative bienvenue, c''est une proposition claire, pas une décision prise seul.

**Mois 3 : demandez du feedback**
Sollicitez un point avec votre manager : "Comment jugez-vous mon intégration ? Qu''est-ce que je peux améliorer ?" Montrez votre volonté de progresser. Notez les retours et mettez-les en pratique. Un collaborateur qui demande du feedback est perçu comme sérieux et coachable.

**En continu : soyez professionnel**
Évitez les ragots. Respectez la hiérarchie. Ne critiquez pas sur WhatsApp. Respectez la confidentialité de l''entreprise. Votre réputation se construit sur la durée, et le marché ivoirien est petit : une bonne réputation vous suit, une mauvaise aussi.',
   'Vitae', 5, null),
  ('res-relations-02', 'relationsPro', 'La communication professionnelle par écrit en entreprise',
   'Emails, WhatsApp professionnel, notes de service — comment écrire clair, court et respectueux.',
   'Bien écrire en milieu professionnel est une compétence sous-estimée, mais très valorisée. Voici les règles essentielles pour une communication écrite efficace.

**L''email professionnel**
Objet clair et court : "Demande de congé — Aya Koné — Juillet 2026". Pas de "Bonjour" dans l''objet. Dans le corps : salutation, contexte, demande, formule de politesse. Maximum 5-6 lignes pour une demande simple. Terminez par une formule adaptée : "Cordialement" pour un collègue, "Je vous prie d''agréer, Madame, Monsieur, l''expression de mes salutations distinguées" pour un supérieur ou un client.

**Le WhatsApp professionnel**
De plus en plus utilisé en entreprise en CI. Mais attention : n''envoyez pas de messages professionnels après 19h ou le week-end, sauf urgence. Utilisez la ponctuation. Évitez les abréviations (slt, cv, bi1). Préférez "Bonjour, je vous envoie le rapport demandé. Bonne journée." Un message professionnel reste un message professionnel, même sur WhatsApp.

**La note de service**
Structure : qui, quoi, quand, où, pourquoi. Soyez factuel. Évitez les jugements. "À compter du 1er septembre, les pointages se feront via l''application mobile" est mieux que "Il faut absolument moderniser nos pointages qui sont archaïques". Une note claire évite les malentendus et les conflits.

**Le rapport ou le compte-rendu**
Structurez en sections avec des titres. Commencez par la conclusion ou le point clé, puis les détails. Utilisez des listes à puces pour les points multiples. Relisez pour corriger les fautes : un document sans fautes inspire confiance et sérieux.

**Les règles d''or**
1. Relisez avant d''envoyer (et vérifiez l''orthographe)
2. Pas de majuscules = pas de crier
3. Un message = un sujet
4. Répondez dans les 24h, même pour dire "je reviens vers vous"
5. Ne mettez en copie que les personnes concernées
6. Évitez les emojis dans les communications formelles',
   'Vitae', 5, null),
  ('res-market-01', 'marcheTravail', 'Les secteurs qui recrutent en Côte d''Ivoire en 2026',
   'Numérique, finance, agriculture, énergie, distribution — où sont les opportunités et quels profils sont recherchés ?',
   'Le marché du travail ivoirien évolue rapidement, porté par une croissance économique soutenue et de grands projets d''infrastructure. Voici les secteurs porteurs en 2026 et les profils recherchés.

**Le numérique et les télécoms**
Orange CI, MTN, les startups de la Cité des Arts et de Zone 4, les fintech (Orange Money, Wave, MTN Money) recrutent activement. Profils : développeurs, data analysts, community managers, chefs de projet digital, support client, cybersécurité. Le secteur a besoin de profils techniques mais aussi commerciaux et marketing. Les compétences en intelligence artificielle et en automatisation sont de plus en plus demandées.

**La finance et la banque**
Société Générale CI, BICIC, Ecobank, Coris Bank, NSIA Banque, Bridge Bank — le secteur bancaire se développe avec l''inclusion financière et la digitalisation. Profils : comptables, analystes de crédit, conseillers clientèle, auditeurs, risk managers, spécialistes de la conformité (KYC/AML).

**L''agro-industrie**
Nestlé CI, Cémoi, SIFCA, PalmCI, la filière cacao et l''exportation de produits agricoles — l''agro-industrie est un pilier de l''économie. Profils : ingénieurs agronomes, techniciens, gestionnaires de production, contrôleurs qualité, logisticiens, commerciaux export.

**L''énergie et les infrastructures**
CI-Énergies, les projets solaires et hydrauliques, le métro d''Abidjan, les BTP (Bouygues, Colas CI, Sogea-Satom) — les grands projets créent des emplois. Profils : ingénieurs, techniciens, conducteurs de travaux, chefs de chantier, géomètres, HSE (hygiène, sécurité, environnement).

**La distribution et le commerce**
Les centres commerciaux (Playce Mall, Cosmos Yopougon), les chaînes (Jumbo, Super U, Casino), le e-commerce (Jumia, Glovo, Kiro''o) — la distribution se professionnalise. Profils : commerciaux, gestionnaires de rayon, logisticiens, livreurs, responsables de point de vente.

**La santé**
Les cliniques privées (Polyclinique Sainte-Anne-Marie, Clinique Les Rosiers, Clinique Farah), les laboratoires, les mutuelles de santé — le secteur de la santé recrute. Profils : infirmiers, techniciens de laboratoire, gestionnaires administratifs, spécialistes de la santé numérique.

**L''éducation et la formation**
Les écoles privées, les centres de formation professionnelle, les universités privées, les plateformes d''e-learning — l''éducation se développe. Profils : enseignants, formateurs, conseillers pédagogiques, gestionnaires, concepteurs de contenus pédagogiques.

**Le tourisme et l''hôtellerie**
Avec la croissance des vols directs et des investissements hôteliers (Azalaï, Noom, Sofitel), le tourisme d''affaires et de loisirs se développe. Profils : gestionnaires hôteliers, commerciaux, agents d''accueil, guides, spécialistes de l''événementiel.

**Conseil :** quel que soit votre secteur, les compétences transverses (bureautique, Excel, communication, gestion de projet) restent très valorisées et augmentent votre employabilité.',
   'Vitae', 8, null),
  ('res-market-02', 'marcheTravail', 'Emploi formel vs informel : comprendre le marché ivoirien',
   '89% des actifs travaillent dans l''informel. Faut-il viser le formel ? Quels sont les avantages et limites de chaque voie ?',
   'Le marché du travail ivoirien est dominé par l''informel, mais le secteur formel offre des protections. Comprendre les deux pour faire les bons choix selon votre situation.

**Le secteur formel**
Contrat de travail déclaré, salaire fixe, cotisations sociales (CNPS), congés payés, protection du Code du travail. Les entreprises : banques, grandes entreprises, administrations publiques, ONG, multinationales.

Avantages : sécurité, avantages sociaux, évolution de carrière, formation, accès au crédit bancaire.
Inconvénients : plus difficile d''accès, procédures de recrutement longues, salaires parfois moins élevés que l''informel qualifié.

**Le secteur informel**
Commerce, artisanat, services de proximité, agriculture familiale, transport. Pas de contrat formel, pas de cotisations, revenus variables.

Avantages : flexibilité, revenus potentiellement élevés pour les entrepreneurs, accès rapide, indépendance.
Inconvénients : pas de protection sociale, pas de congés payés, pas de retraite, vulnérabilité économique, difficulté à obtenir un crédit.

**L''entrepreneuriat : la voie du milieu**
De plus en plus de jeunes Ivoiriens créent leur propre activité. Le Startup Act 2023 facilite la création d''entreprises innovantes avec des exonérations fiscales. L''APEX-CI, la CEPICI et les incubateurs (InnovaHub, Orange Digital Center) accompagnent les créateurs. L''entrepreneuriat peut être une voie vers le formel : une activité déclarée devient une entreprise formelle.

**Le secteur semi-formel : une option croissante**
De nombreuses plateformes (livraison, VTC, freelance) offrent des revenus réguliers sans contrat classique. C''est une porte d''entrée pour acquérir de l''expérience et un réseau, tout en gardant de la flexibilité. Attention toutefois à l''absence de protection sociale.

**Conseil pratique**
Visez d''abord le secteur formel pour la sécurité et l''apprentissage. Une expérience de 2-3 ans en entreprise formelle vous donne des compétences, un réseau et un salaire qui vous permettront ensuite de vous lancer en entrepreneuriat si vous le souhaitez. Si vous démarrez dans l''informel, formalisez progressivement : tenez une comptabilité simple, ouvrez un compte bancaire professionnel, déclarez votre activité dès que possible.',
   'Vitae', 7, null),
  ('res-law-01', 'droitTravail', 'Le Code du travail ivoirien : ce que tout employé doit connaître',
   'Durée légale du travail, congés payés, préavis, indemnités de licenciement — vos droits de base en Côte d''Ivoire.',
   'Le Code du travail ivoirien (Loi n° 2015-519 du 20 juillet 2015) régit les relations entre employeurs et employés du secteur formel. Voici les points essentiels que tout travailleur doit connaître pour défendre ses droits.

**La durée légale du travail**
40 heures par semaine, soit 8 heures par jour avec un jour de repos hebdomadaire (généralement le dimanche). Les heures supplémentaires sont majorées : +25% pour les 8 premières heures, +50% au-delà, +75% la nuit et le dimanche. Ces majorations sont un droit, pas une faveur.

**Le contrat de travail**
Il peut être à durée indéterminée (CDI), à durée déterminée (CDD) ou pour un travail saisonnier. Le CDD ne peut excéder 2 ans renouvellement compris. Passé ce délai, il doit être transformé en CDI. Exigez toujours un contrat écrit : c''est votre protection principale.

**La période d''essai**
Pour les ouvriers et employés : 8 jours renouvelables une fois.
Pour les agents de maîtrise et techniciens : 1 mois renouvelable une fois.
Pour les cadres : 3 mois renouvelables une fois.
La période d''essai doit être prévue dans le contrat ; elle ne se présume pas.

**Les congés payés**
2,5 jours ouvrables par mois de travail effectif, soit 30 jours (5 semaines) par an. L''indemnité de congé est égale au salaire que vous auriez perçu si vous aviez travaillé. Les congés non pris ne se perdent pas automatiquement : ils peuvent être reportés ou indemnisés selon les règles de l''entreprise.

**Le préavis**
En cas de rupture du contrat, un préavis doit être respecté :
- Ouvriers/employés : 1 mois
- Agents de maîtrise/techniciens : 2 mois
- Cadres : 3 mois
En cas de licenciement, l''employeur peut dispenser le salarié d''effectuer le préavis en lui versant l''indemnité compensatrice.

**L''indemnité de licenciement**
Après 2 ans d''ancienneté, le salarié a droit à une indemnité de licenciement calculée par année d''ancienneté. Le taux augmente par tranches (voir le Code du travail pour le barème précis). Cette indemnité s''ajoute à l''indemnité de préavis et aux congés payés restants.

**Le SMIG (Salaire Minimum Interprofessionnel Garanti)**
En Côte d''Ivoire, le SMIG est de 75 000 FCFA par mois. Aucun employeur ne peut payer moins. Vérifiez que votre salaire respecte au minimum ce seuil.

**La CNPS (Caisse Nationale de Prévoyance Sociale)**
Votre employeur doit vous déclarer à la CNPS. Vous cotisez (5% de votre salaire brut) et votre employeur cotise aussi. Cela vous donne droit aux prestations : retraite, accidents du travail, prestations familiales. Vérifiez sur vos bulletins de paie que les cotisations sont bien versées.

**Que faire en cas de litige ?**
L''Inspection du Travail peut être saisie gratuitement. En cas de non-résolution, le Tribunal du Travail est compétent. Les syndicats peuvent aussi accompagner les travailleurs. Ne restez jamais seul face à un litige : documentez tout (contrat, bulletins, emails) et demandez conseil.

⚠️ **Important :** Ce résumé est fourni à titre informatif et ne remplace pas le Code du travail officiel. Pour un cas précis, consultez un juriste ou l''Inspection du Travail la plus proche.',
   'Vitae', 9, null),
  ('res-law-02', 'droitTravail', 'Contrat CDD vs CDI : que choisir et quels sont vos droits ?',
   'Le CDD est courant en CI, mais il a des limites. Comprendre la différence pour négocier intelligemment.',
   'Le choix entre CDD et CDI a un impact direct sur votre sécurité et votre carrière. Voici ce qu''il faut savoir pour négocier intelligemment.

**Le CDD (Contrat à Durée Déterminée)**
Durée maximale : 2 ans renouvellement compris. Il doit être écrit et préciser la date de fin. À l''expiration, l''employeur doit soit transformer en CDI, soit verser une indemnité de précarité (7% du salaire brut total si pas de transformation en CDI).

Quand le CDD est légitime :
- Remplacement d''un salarié absent
- Surcroît temporaire d''activité
- Emploi saisonnier
- Projet défini à l''avance

Attention : un CDD utilisé pour pourvoir un poste permanent est illégal. Si vous occupez un poste régulier et permanent en CDD, vous pouvez demander la requalification en CDI devant le Tribunal du Travail.

**Le CDI (Contrat à Durée Indéterminée)**
C''est le contrat de référence. Il n''a pas de date de fin. Il peut être rompu par :
- Démission (avec préavis)
- Licenciement (motif réel et sérieux + procédure)
- Rupture conventionnelle (accord des deux parties)

Le CDI offre plus de sécurité : indemnité de licenciement après 2 ans, droit au chômage (si vous avez cotisé), stabilité pour demander un crédit bancaire.

**Négocier au moment de l''embauche**
Si on vous propose un CDD pour un poste qui semble permanent, demandez :
- "Quelle est la perspective à long terme pour ce poste ?"
- "Sous quelles conditions le CDD peut-il être transformé en CDI ?"
- "Y a-t-il un objectif de performance à atteindre pour la transformation ?"

Mettez ces éléments par écrit si possible (email de confirmation après l''entretien). Une promesse orale n''a aucune valeur juridique.

**L''indemnité de fin de CDD**
À la fin d''un CDD (si pas transformé en CDI), vous recevez une indemnité de précarité égale à 7% de la rémunération totale brute versée pendant toute la durée du contrat. C''est un droit, ne l''oubliez pas. Elle s''ajoute à vos congés payés restants.

**Le stage : un cas particulier**
Le stage n''est pas un contrat de travail classique. Il peut être conventionné (avec une gratification) ou non. Vérifiez que votre stage est bien encadré par une convention et que vos missions correspondent à votre formation. Un stage bien fait est une porte d''entrée vers un CDI.

⚠️ **Note :** Les informations ci-dessus sont indicatives. Consultez le Code du travail ou un juriste pour votre situation précise.',
   'Vitae', 7, null),
  ('res-law-03', 'droitTravail', 'Sécurité sociale et retraite en Côte d''Ivoire : comment ça marche ?',
   'CNPS, points de retraite, pension, accidents du travail — comprendre vos cotisations et vos droits.',
   'La CNPS (Caisse Nationale de Prévoyance Sociale) protège les travailleurs du secteur formel. Voici comment elle fonctionne et comment protéger vos droits.

**Vos cotisations**
Sur votre salaire brut :
- Travailleur : 5% (retraite) + cotisations prestations familiales
- Employeur : cotisation patronale (environ 12-16% selon les branches)

L''employeur retient votre part sur votre salaire et verse l''ensemble à la CNPS. Vérifiez sur vos bulletins de paie que les cotisations sont bien versées : c''est votre retraite future qui en dépend.

**La retraite**
Le système est par répartition : vos cotisations financent les pensions des retraités actuels, et les cotisations des actifs financeront la vôtre. Vous accumulez des trimestres validés au fil de vos cotisations. L''âge légal de départ est 60 ans (âge d''ouverture des droits). Le nombre minimum de trimestres pour une pension pleine est de 160 (40 ans de cotisation).

Montant de la pension : pourcentage du salaire moyen des meilleures années, fonction du nombre de trimestres validés. Si vous n''avez pas assez de trimestres, vous pouvez obtenir une allocation viagère (montant réduit).

**Les prestations familiales**
Allocations familiales versées pour les enfants à charge (jusqu''à 14 ans, ou 21 ans si études). Le montant est modeste mais c''est un droit. Renseignez-vous auprès de la CNPS sur les conditions et les pièces à fournir.

**Les accidents du travail**
Si vous êtes victime d''un accident du travail ou d''une maladie professionnelle, la CNPS prend en charge les soins et verse une indemnité en cas d''incapacité. L''employeur doit déclarer l''accident dans les 48h. En cas de décès, les ayants droit peuvent percevoir une pension de survivant.

**Vérifiez votre compte CNPS**
Vous pouvez consulter votre compte CNPS en ligne ou en agence. Vérifiez régulièrement que vos cotisations sont bien versées. Si votre employeur ne déclare pas, vous perdez des trimestres de retraite. En cas de changement d''employeur, votre compte vous suit : conservez votre numéro d''immatriculation.

**Ce que vous devez retenir**
1. Exigez votre bulletin de paie chaque mois
2. Vérifiez que les cotisations CNPS apparaissent
3. Consultez votre compte CNPS au moins une fois par an
4. Gardez tous vos documents (contrats, bulletins, certificats)
5. En cas de problème, la CNPS a des guichets d''information
6. Ne négligez pas votre retraite : chaque trimestre compte

⚠️ **Important :** Les règles CNPS évoluent. Vérifiez les montants et conditions actuels sur le site officiel de la CNPS Côte d''Ivoire ou en agence.',
   'Vitae', 8, null)
on conflict (id) do update set
  category = excluded.category,
  title = excluded.title,
  excerpt = excluded.excerpt,
  content = excluded.content,
  author = excluded.author,
  read_time_minutes = excluded.read_time_minutes,
  source_url = excluded.source_url;

-- ============================================================
-- TABLE: vitae_job_offers
-- Offres d'emploi et de stage — lecture pour tous les users connectés
-- Gérées côté admin (pas de CRUD user via l'app)
-- ============================================================
create table if not exists public.vitae_job_offers (
  id text primary key default gen_random_uuid()::text,
  type text not null check (type in ('emploi', 'stage')),
  category text not null check (category in (
    'financeComptabilite', 'marketingCommunication', 'informatiqueTech',
    'commercialVente', 'administratifRh', 'juridique', 'ingenierieBtp',
    'sante', 'educationFormation', 'logistiqueTransport',
    'hotellerieRestauration', 'autre'
  )),
  title text not null,
  company text not null,
  location text,
  description text,
  requirements text,
  contract_type text,
  salary_range text,
  posted_at timestamptz not null default now(),
  deadline timestamptz,
  -- ⚠️ apply_url = OBLIGATOIRE et doit être un lien DIRECT vers la page
  -- de CETTE offre (avec identifiant unique), jamais une page de listing.
  -- Le scraper (Edge Function scrape-job-offers) applique le même filtre
  -- avant insert : offre sans lien direct → rejetée, jamais insérée.
  apply_url text not null check (
    apply_url ~ '^https?://'
    and length(apply_url) > 20
    and (
      apply_url ~ '/jobs/view/.+[0-9]{6,}'                 -- LinkedIn offre
      or apply_url ~ '/offre-d-emploi/.+[0-9]+-'          -- Novojob offre
      or apply_url ~ '^mailto:'                            -- candidature email
      or (
        apply_url !~ '(jobivoire\.com|emploi\.ci)'        -- domaines fake bannis
        and apply_url !~ '(linkedin\.com/jobs/search|novojob\.com/[a-z-]+/offres-d-emploi(/stages)?$)'
        and split_part(split_part(apply_url, '://', 2), '/', 2) != ''
      )
    )
  ),
  contact_email text,
  is_remote boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_vitae_jobs_type on public.vitae_job_offers(type);
create index if not exists idx_vitae_jobs_category on public.vitae_job_offers(category);
create index if not exists idx_vitae_jobs_posted on public.vitae_job_offers(posted_at desc);

-- RLS : offres lisibles par tous les users connectés
alter table public.vitae_job_offers enable row level security;

create policy "Authenticated can view job offers"
  on public.vitae_job_offers for select
  to authenticated
  using (true);
```

---

## ÉTAPE 6 — Configuration Auth Supabase

Dans Supabase Dashboard > Authentication > Providers :

1. **Email provider** : activé par défaut (garder activé)
2. **Désactiver "Confirm email"** : Authentication > Settings >
   "Confirm email" → OFF (puisque l'email est un pseudo-email,
   on ne veut pas que Supabase envoie un email de confirmation)
3. **Désactiver les autres providers** (Google, Apple, etc.) pour v1

> C'est tout. Pas de configuration externe nécessaire.
> L'auth se fait via `supabase.auth.signUp(email, password)` côté Flutter,
> où `email` est le pseudo-email généré depuis le numéro de téléphone.

---

## RÉCAPITULATIF DES TABLES

| Table | App | Rôle |
|---|---|---|
| `profiles` | Shared | Infos utilisateur (phone, name, avatar) |
| `rondo_tontines` | Rondo | Tontines créées |
| `rondo_membres` | Rondo | Membres de chaque tontine |
| `rondo_tours` | Rondo | Tours de cotisation |
| `rondo_paiements` | Rondo | Paiements enregistrés |
| `rondo_notifications` | Rondo | Notifications utilisateurs |
| `rondo_subscriptions` | Rondo | Plans d'abonnement (gratuit/standard/pro) |
| `vitae_cvs` | Vitae | CVs créés par l'utilisateur |
| `vitae_sections` | Vitae | Sections d'un CV (JSONB) |
| `vitae_templates` | Vitae | Catalogue des 6 templates |
| `vitae_exports` | Vitae | Historique des exports PDF |
| `vitae_subscriptions` | Vitae | Plans (gratuit/premium/etudiant) |
| `vitae_articles` | Vitae | Articles édifiants (recherche d'emploi, droit du travail) |
| `vitae_job_offers` | Vitae | Offres d'emploi/stage scrapées (JobIvoire, LinkedIn, etc.) |
| `vitae_scrape_logs` | Vitae | Logs d'exécution du scraper automatique |

## RPCs CRÉÉS

| Fonction | Rôle |
|---|---|
| `normalize_phone_to_email(phone)` | Transforme un téléphone en pseudo-email |
| `handle_new_user()` | Auto-création du profil à l'inscription |
| `update_updated_at()` | Mise à jour automatique du updated_at |
| `rondo_rejoindre_tontine(code)` | Rejoindre une tontine par code |
| `rondo_cagnotte_tour(tour_id)` | Calculer la cagnotte d'un tour |
| `rondo_statut_tour(tour_id)` | Statut des cotisations d'un tour |
| `rondo_home_membre()` | Dashboard membre |
| `rondo_home_admin()` | Dashboard admin |
| `rondo_generer_tours(tontine_id)` | Générer les tours automatiquement |
| `vitae_get_full_cv(cv_id)` | Récupère un CV complet avec ses sections |
| `vitae_duplicate_cv(cv_id)` | Duplique un CV existant |
| `vitae_scrape_jobs()` | Déclenche le scraping d'offres d'emploi (cron) |

---

*The Everyday Co. — Schéma SQL v1.1 | Juillet 2026*