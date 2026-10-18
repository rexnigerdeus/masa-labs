-- =============================================================================
-- Vitae — lot B du brief v2 : versions de CV, droits, paiement Wave
-- =============================================================================
--
-- Brief : web/apps/vitae/docs/brief-vitae-v2.md, sections « Compte, offres
-- payantes et paiement Wave » et « Modèle de données ». Noms adaptés au
-- schéma existant :
--
--   brief                         ici
--   ----------------------------  ---------------------------------------------
--   cvs                           vitae_resumes, complétée (template = template_id)
--   cover_letters                 vitae_cover_letters
--   entitlements                  vitae_entitlements
--   payments                      vitae_payments
--   can_create_cv_version()       vitae_can_create_cv_version()
--   can_create_cover_letter()     vitae_can_create_cover_letter()
--   grant_entitlement()           vitae_grant_entitlement()
--
-- Dépend de 20261018120000_vitae_lot_a.sql (vitae_is_admin).
--
-- La règle « un seul CV gratuit par compte » est tenue par la base, pas par
-- l'interface : une ligne de vitae_resumes qui n'est pas le CV principal ne
-- peut être créée que par vitae_create_cv_version(), qui exige un droit et le
-- consomme dans la même transaction. Un appel direct à l'API REST est refusé
-- par la RLS (critère de recette « même en appelant directement l'API »).
--
-- `PAYMENTS_ENABLED` est une variable d'environnement de l'application : la
-- base ne la connaît pas. Sans paiement confirmé, aucun droit n'existe, donc
-- aucune version ne peut être créée, interrupteur allumé ou non.
-- =============================================================================

begin;

-- =============================================================================
-- 1. Paiements
-- =============================================================================

create table if not exists public.vitae_payments (
  id uuid primary key default gen_random_uuid(),
  -- Conservé après suppression du compte, pour la comptabilité.
  user_id uuid references auth.users(id) on delete set null,
  offer text not null check (offer in ('cv_credit', 'pass_candidature')),
  -- FCFA entiers : le XOF n'a pas de décimales (doc Wave Checkout).
  amount_xof integer not null check (amount_xof > 0),
  provider text not null default 'wave' check (provider in ('wave')),
  -- Identifiant de la session Wave (`cos-…`).
  provider_ref text unique,
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'cancelled', 'refunded')),
  raw_webhook jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vitae_payments_user on public.vitae_payments (user_id, created_at desc);

alter table public.vitae_payments enable row level security;

drop policy if exists "Owner reads own payments" on public.vitae_payments;
create policy "Owner reads own payments"
  on public.vitae_payments for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins read payments" on public.vitae_payments;
create policy "Admins read payments"
  on public.vitae_payments for select
  to authenticated
  using (public.vitae_is_admin());

drop trigger if exists set_updated_at_vitae_payments on public.vitae_payments;
create trigger set_updated_at_vitae_payments
  before update on public.vitae_payments
  for each row execute function public.update_updated_at();

-- =============================================================================
-- 2. Droits
-- =============================================================================

create table if not exists public.vitae_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('cv_credit', 'pass_candidature')),
  -- Crédit CV : 1 à l'achat, 0 une fois la version créée. NULL pour un pass.
  credits_left integer check (credits_left is null or credits_left >= 0),
  starts_at timestamptz not null default now(),
  -- Pass : 30 jours. NULL pour un crédit, qui n'expire pas.
  ends_at timestamptz,
  -- Un paiement n'accorde qu'un droit : c'est ce qui rend le webhook
  -- idempotent, même reçu deux fois.
  payment_id uuid unique references public.vitae_payments(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_vitae_entitlements_user on public.vitae_entitlements (user_id);

alter table public.vitae_entitlements enable row level security;

-- Lecture de ses propres droits ; aucune écriture depuis une app : ils ne
-- naissent que du webhook (clé de service) ou de l'administration.
drop policy if exists "Owner reads own entitlements" on public.vitae_entitlements;
create policy "Owner reads own entitlements"
  on public.vitae_entitlements for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins read entitlements" on public.vitae_entitlements;
create policy "Admins read entitlements"
  on public.vitae_entitlements for select
  to authenticated
  using (public.vitae_is_admin());

-- =============================================================================
-- 3. CV : principal et versions
-- =============================================================================

alter table public.vitae_resumes add column if not exists anon_id text;
alter table public.vitae_resumes add column if not exists is_primary boolean not null default false;
alter table public.vitae_resumes add column if not exists parent_resume_id uuid
  references public.vitae_resumes(id) on delete set null;
alter table public.vitae_resumes add column if not exists target_title text
  check (target_title is null or length(target_title) <= 120);
-- Les offres sont supprimées à expiration par le scraper : on garde aussi le
-- lien et l'intitulé, pour que la version ciblée ne perde pas sa cible.
alter table public.vitae_resumes add column if not exists target_offer_id text
  references public.vitae_job_offers(id) on delete set null;
alter table public.vitae_resumes add column if not exists target_offer_url text;

-- CV existants : le plus ancien de chaque compte devient son CV gratuit ;
-- les autres, créés quand tout était gratuit, restent des versions acquises.
update public.vitae_resumes r
   set is_primary = true
 where r.id in (
   select distinct on (user_id) id
     from public.vitae_resumes
    order by user_id, created_at asc
 )
   and not exists (
     select 1 from public.vitae_resumes p where p.user_id = r.user_id and p.is_primary
   );

update public.vitae_resumes r
   set parent_resume_id = p.id
  from public.vitae_resumes p
 where p.user_id = r.user_id and p.is_primary and not r.is_primary
   and r.parent_resume_id is null;

create unique index if not exists idx_vitae_resumes_one_primary
  on public.vitae_resumes (user_id) where is_primary;

-- Le premier CV d'un compte devient son CV gratuit sans que l'application
-- ait à le dire (le CV gardé dans le navigateur est rattaché au compte à la
-- connexion : c'est cette insertion).
create or replace function public.vitae_resumes_primary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.vitae_resumes where user_id = new.user_id and is_primary
  ) then
    new.is_primary := true;
    new.parent_resume_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists vitae_resumes_primary on public.vitae_resumes;
create trigger vitae_resumes_primary
  before insert on public.vitae_resumes
  for each row execute function public.vitae_resumes_primary();

-- Insertion directe : seulement le CV principal. La WITH CHECK est évaluée
-- après le déclencheur ci-dessus : un compte qui a déjà son CV gratuit voit
-- l'insertion refusée, une version passe par vitae_create_cv_version().
drop policy if exists "Owner can insert own resumes" on public.vitae_resumes;
create policy "Owner can insert own resumes"
  on public.vitae_resumes for insert
  to authenticated
  with check (auth.uid() = user_id and is_primary);

-- Modifier son CV reste libre ; changer son statut (principal, parent, cible)
-- ne l'est pas. Droits par colonne plutôt qu'un déclencheur : la règle se lit
-- dans le catalogue.
revoke update on public.vitae_resumes from anon, authenticated;
-- `user_id` reste dans la liste : la version de l'app déjà en ligne l'envoie
-- à chaque enregistrement, et la RLS (with check auth.uid() = user_id)
-- interdit de toute façon de le changer pour un autre compte.
grant update (user_id, title, template_id, data, score) on public.vitae_resumes to authenticated;

-- =============================================================================
-- 4. Lettres de motivation
-- =============================================================================

create table if not exists public.vitae_cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid references public.vitae_resumes(id) on delete set null,
  offer_id text references public.vitae_job_offers(id) on delete set null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vitae_cover_letters_size check (length(data::text) <= 20000)
);

create index if not exists idx_vitae_cover_letters_user on public.vitae_cover_letters (user_id, updated_at desc);

alter table public.vitae_cover_letters enable row level security;

drop policy if exists "Owner reads own letters" on public.vitae_cover_letters;
create policy "Owner reads own letters"
  on public.vitae_cover_letters for select
  to authenticated
  using (user_id = auth.uid());

-- Une lettre existante reste modifiable après la fin du pass (brief, droits) ;
-- la créer exige un pass actif, d'où l'absence de politique d'insertion.
drop policy if exists "Owner updates own letters" on public.vitae_cover_letters;
create policy "Owner updates own letters"
  on public.vitae_cover_letters for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Owner deletes own letters" on public.vitae_cover_letters;
create policy "Owner deletes own letters"
  on public.vitae_cover_letters for delete
  to authenticated
  using (user_id = auth.uid());

revoke update on public.vitae_cover_letters from anon, authenticated;
grant update (data) on public.vitae_cover_letters to authenticated;

drop trigger if exists set_updated_at_vitae_cover_letters on public.vitae_cover_letters;
create trigger set_updated_at_vitae_cover_letters
  before update on public.vitae_cover_letters
  for each row execute function public.update_updated_at();

-- =============================================================================
-- 5. Contrôle des droits (côté serveur, jamais seulement dans l'interface)
-- =============================================================================

-- Prix : la seule source. Le client ne transmet jamais de montant.
create or replace function public.vitae_offer_price(p_offer text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_offer
    when 'cv_credit' then 500
    when 'pass_candidature' then 2000
  end;
$$;

create or replace function public.vitae_has_active_pass(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vitae_entitlements
     where user_id = p_user
       and type = 'pass_candidature'
       and revoked_at is null
       and starts_at <= now()
       and ends_at > now()
  );
$$;

revoke execute on function public.vitae_has_active_pass(uuid) from public, anon, authenticated;

-- Un compte ne peut interroger que ses propres droits.
create or replace function public.vitae_can_create_cv_version(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_user = auth.uid() or public.vitae_is_admin(), false)
     and (
       public.vitae_has_active_pass(p_user)
       or exists (
         select 1 from public.vitae_entitlements
          where user_id = p_user
            and type = 'cv_credit'
            and revoked_at is null
            and credits_left > 0
       )
     );
$$;

create or replace function public.vitae_can_create_cover_letter(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_user = auth.uid() or public.vitae_is_admin(), false)
     and public.vitae_has_active_pass(p_user);
$$;

revoke execute on function public.vitae_can_create_cv_version(uuid) from public, anon;
revoke execute on function public.vitae_can_create_cover_letter(uuid) from public, anon;
grant execute on function public.vitae_can_create_cv_version(uuid) to authenticated;
grant execute on function public.vitae_can_create_cover_letter(uuid) to authenticated;

-- Crée une version ciblée : copie du CV source, avec l'intitulé visé en tête.
-- Le droit est vérifié et consommé dans la même transaction, sous verrou :
-- deux clics simultanés ne dépensent pas deux fois le même crédit, et ne
-- créent pas deux versions pour un crédit.
create or replace function public.vitae_create_cv_version(
  p_source uuid,
  p_target_title text,
  p_target_offer_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_source public.vitae_resumes%rowtype;
  v_primary uuid;
  v_credit uuid;
  v_offer_url text;
  v_title text := btrim(coalesce(p_target_title, ''));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Non connecté' using errcode = '42501';
  end if;
  if length(v_title) not between 2 and 120 then
    raise exception 'Intitulé de poste manquant' using errcode = '22023';
  end if;

  select * into v_source from public.vitae_resumes where id = p_source and user_id = v_uid;
  if not found then
    raise exception 'CV introuvable' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('vitae_rights:' || v_uid::text, 0));

  if not public.vitae_has_active_pass(v_uid) then
    select id into v_credit
      from public.vitae_entitlements
     where user_id = v_uid and type = 'cv_credit' and revoked_at is null and credits_left > 0
     order by created_at
     limit 1
     for update;
    if v_credit is null then
      raise exception 'Aucun droit actif' using errcode = 'P0001';
    end if;
    update public.vitae_entitlements set credits_left = credits_left - 1 where id = v_credit;
  end if;

  select id into v_primary from public.vitae_resumes where user_id = v_uid and is_primary;
  if p_target_offer_id is not null then
    select apply_url into v_offer_url from public.vitae_job_offers where id = p_target_offer_id;
  end if;

  insert into public.vitae_resumes (
    user_id, title, template_id, data, score, is_primary, parent_resume_id,
    target_title, target_offer_id, target_offer_url
  ) values (
    v_uid,
    v_title,
    v_source.template_id,
    jsonb_set(v_source.data, '{headline}', to_jsonb(v_title)),
    v_source.score,
    false,
    coalesce(v_primary, v_source.id),
    v_title,
    case when v_offer_url is null then null else p_target_offer_id end,
    v_offer_url
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.vitae_create_cv_version(uuid, text, text) from public, anon;
grant execute on function public.vitae_create_cv_version(uuid, text, text) to authenticated;

-- Crée une lettre : pass actif obligatoire.
create or replace function public.vitae_create_cover_letter(
  p_resume uuid,
  p_offer_id text,
  p_data jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Non connecté' using errcode = '42501';
  end if;
  if not public.vitae_has_active_pass(v_uid) then
    raise exception 'Pass Candidature requis' using errcode = 'P0001';
  end if;
  if p_resume is not null and not exists (
    select 1 from public.vitae_resumes where id = p_resume and user_id = v_uid
  ) then
    raise exception 'CV introuvable' using errcode = 'P0002';
  end if;

  insert into public.vitae_cover_letters (user_id, resume_id, offer_id, data)
  values (
    v_uid,
    p_resume,
    case when exists (select 1 from public.vitae_job_offers where id = p_offer_id) then p_offer_id end,
    coalesce(p_data, '{}'::jsonb)
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.vitae_create_cover_letter(uuid, text, jsonb) from public, anon;
grant execute on function public.vitae_create_cover_letter(uuid, text, jsonb) to authenticated;

-- =============================================================================
-- 6. Paiement : création, attribution idempotente, retrait
-- =============================================================================

-- Étape 1 du brief : ligne `pending`, montant fixé ici.
create or replace function public.vitae_create_payment(p_offer text)
returns table (id uuid, amount_xof integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_amount integer := public.vitae_offer_price(p_offer);
begin
  if v_uid is null then
    raise exception 'Non connecté' using errcode = '42501';
  end if;
  if v_amount is null then
    raise exception 'Offre inconnue' using errcode = '22023';
  end if;
  return query
    insert into public.vitae_payments (user_id, offer, amount_xof)
    values (v_uid, p_offer, v_amount)
    returning vitae_payments.id, vitae_payments.amount_xof;
end;
$$;

revoke execute on function public.vitae_create_payment(text) from public, anon;
grant execute on function public.vitae_create_payment(text) to authenticated;

-- Rattache la session Wave au paiement, une seule fois.
create or replace function public.vitae_attach_payment_session(p_payment uuid, p_ref text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.vitae_payments
     set provider_ref = p_ref
   where id = p_payment
     and user_id = auth.uid()
     and status = 'pending'
     and provider_ref is null;
$$;

revoke execute on function public.vitae_attach_payment_session(uuid, text) from public, anon;
grant execute on function public.vitae_attach_payment_session(uuid, text) to authenticated;

-- Étape 3 du brief, appelée par le webhook (clé de service) une fois la
-- signature vérifiée. Idempotente : verrou sur la ligne de paiement, et
-- contrainte unique sur entitlements.payment_id. Renvoie true seulement la
-- première fois.
--
-- Un pass acheté pendant un pass actif commence à la fin du précédent :
-- racheter ne fait rien perdre.
create or replace function public.vitae_grant_entitlement(p_payment_id uuid, p_raw jsonb default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.vitae_payments%rowtype;
  v_start timestamptz := now();
  v_inserted integer;
begin
  select * into v_payment from public.vitae_payments where id = p_payment_id for update;
  if not found or v_payment.user_id is null then
    return false;
  end if;
  if v_payment.status in ('refunded') then
    return false;
  end if;

  update public.vitae_payments
     set status = 'succeeded',
         raw_webhook = coalesce(p_raw, raw_webhook)
   where id = p_payment_id;

  if v_payment.offer = 'pass_candidature' then
    select greatest(now(), coalesce(max(ends_at), now())) into v_start
      from public.vitae_entitlements
     where user_id = v_payment.user_id
       and type = 'pass_candidature'
       and revoked_at is null
       and ends_at > now();
  end if;

  insert into public.vitae_entitlements (user_id, type, credits_left, starts_at, ends_at, payment_id)
  values (
    v_payment.user_id,
    v_payment.offer,
    case when v_payment.offer = 'cv_credit' then 1 end,
    v_start,
    case when v_payment.offer = 'pass_candidature' then v_start + interval '30 days' end,
    v_payment.id
  )
  on conflict (payment_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted = 1;
end;
$$;

revoke execute on function public.vitae_grant_entitlement(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.vitae_grant_entitlement(uuid, jsonb) to service_role;

-- Étape 6 du brief : après un remboursement fait dans l'espace marchand Wave.
create or replace function public.vitae_revoke_entitlement(p_entitlement uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.vitae_is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;
  update public.vitae_entitlements set revoked_at = now()
   where id = p_entitlement and revoked_at is null;
  update public.vitae_payments set status = 'refunded'
   where id = (select payment_id from public.vitae_entitlements where id = p_entitlement);
end;
$$;

revoke execute on function public.vitae_revoke_entitlement(uuid) from public, anon;
grant execute on function public.vitae_revoke_entitlement(uuid) to authenticated;

-- Droit accordé à la main par l'administration (geste commercial, paiement
-- reçu hors Wave) : la seule autre porte d'entrée prévue par le brief.
create or replace function public.vitae_admin_grant(p_user uuid, p_type text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.vitae_is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;
  if p_type not in ('cv_credit', 'pass_candidature') then
    raise exception 'Type de droit inconnu' using errcode = '22023';
  end if;
  insert into public.vitae_entitlements (user_id, type, credits_left, ends_at)
  values (
    p_user,
    p_type,
    case when p_type = 'cv_credit' then 1 end,
    case when p_type = 'pass_candidature' then now() + interval '30 days' end
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.vitae_admin_grant(uuid, text) from public, anon;
grant execute on function public.vitae_admin_grant(uuid, text) to authenticated;

commit;
