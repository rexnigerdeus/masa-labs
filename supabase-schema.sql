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
  updated_at timestamptz not null default now()
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

-- rondo_tontines: l'admin peut tout faire, les membres peuvent voir
create policy "Admin can manage own tontines"
  on public.rondo_tontines for all
  using (auth.uid() = admin_id);

create policy "Members can view their tontines"
  on public.rondo_tontines for select
  using (public.rondo_is_membre(id, auth.uid()));

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
  where invitation_code = upper(p_code)
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
  mon_tour_numero integer,
  mon_tour_date date,
  prochain_paiement_date date,
  cotisation_due boolean
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  select
    t.id,
    t.name,
    t.mise,
    t.frequence,
    t.statut,
    tr.numero as mon_tour_numero,
    tr.date_debut as mon_tour_date,
    (
      select min(tr2.date_debut)
      from public.rondo_tours tr2
      join public.rondo_membres m2 on tr2.beneficiaire_id = m2.id
      where tr2.tontine_id = t.id
      and m2.user_id = auth.uid()
      and tr2.statut != 'termine'
      and not exists (
        select 1 from public.rondo_paiements p
        where p.tour_id = tr2.id and p.membre_id = m2.id
      )
    ) as prochain_paiement_date,
    (
      select exists (
        select 1 from public.rondo_tours tr3
        join public.rondo_membres m3 on tr3.beneficiaire_id = m3.id
        where tr3.tontine_id = t.id
        and m3.user_id = auth.uid()
        and tr3.statut = 'en_cours'
        and not exists (
          select 1 from public.rondo_paiements p
          where p.tour_id = tr3.id and p.membre_id = m3.id
        )
      )
    ) as cotisation_due
  from public.rondo_tontines t
  join public.rondo_membres m on t.id = m.tontine_id
  left join public.rondo_tours tr on tr.beneficiaire_id = m.id and tr.statut = 'en_cours'
  where m.user_id = auth.uid()
  and m.statut = 'actif'
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
```

---

## ÉTAPE 5 — Configuration Auth Supabase

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

---

*The Everyday Co. — Schéma SQL v1.1 | Juillet 2026*