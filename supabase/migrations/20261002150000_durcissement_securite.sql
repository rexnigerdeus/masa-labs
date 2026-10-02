-- ============================================================
-- Durcissement de sécurité — partie 1 (applicable immédiatement)
--
-- Suite à l'audit du 2026-10-02 (conseiller de sécurité Supabase + lecture
-- de chaque fonction SECURITY DEFINER et de chaque policy ouverte à `public`).
-- Aucune de ces modifications n'est attendue par une application en ligne :
-- elles ferment des accès qu'aucune n'utilise, ou ajoutent ce qui servira à
-- la partie 2 (`20261002150100_profiles_telephone_prive.sql`).
--
--   1. Vitae : `vitae_get_full_cv` et `vitae_duplicate_cv` laissaient passer
--      un visiteur anonyme. `user_id != auth.uid()` vaut NULL quand
--      `auth.uid()` est NULL, et un `if` sur NULL ne lève rien : n'importe
--      qui muni d'un identifiant de CV en lisait le contenu complet.
--   2. Rondo : `rondo_statut_tour` (noms, photos, paiements des membres) et
--      `rondo_cagnotte_tour` ne vérifiaient pas que l'appelant appartient à
--      la tontine ; les fonctions `rondo_is_*` répondaient sur n'importe quel
--      utilisateur. Les policies Rondo, ouvertes à `public`, passent à
--      `authenticated` : un visiteur anonyme n'a rien à y lire.
--   3. Scraper d'offres : l'Edge Function était appelable par n'importe qui
--      sur Internet (verify_jwt = false, aucun secret) et écrit en base avec
--      la clé service_role. Un secret, rangé dans Vault, l'accompagne
--      désormais ; la fonction le vérifie (voir son index.ts).
--   4. Abonnements Vitae : un utilisateur pouvait créer ou modifier sa
--      propre ligne — donc s'offrir un plan premium le jour où les plans
--      compteront. L'écriture devient réservée au serveur.
--   5. Droits d'exécution : chaque fonction SECURITY DEFINER n'est plus
--      exécutable que par les rôles qui en ont besoin ; les fonctions de
--      trigger ne le sont plus par personne (un trigger ne vérifie pas ce
--      droit au déclenchement). Par défaut, les fonctions créées à l'avenir
--      ne seront plus exécutables par `anon` (voir README).
--   6. `search_path` figé sur les deux fonctions communes qui ne l'avaient pas.
--   7. Téléphones : deux fonctions qui ne les servent qu'à qui a le droit
--      de les voir (`rondo_telephones`, `hive_telephones_commandes`). Les
--      apps passent par elles ; la partie 2 ferme ensuite la colonne.
--
-- Migration rejouable : `create or replace`, `if not exists`, revoke/grant
-- idempotents.
-- ============================================================


-- ============================================================
-- 1. Vitae (app Flutter) : contrôle de propriétaire qui tient avec NULL
-- ============================================================
create or replace function public.vitae_get_full_cv(p_cv_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cv record;
  v_sections jsonb;
begin
  select * into v_cv from public.vitae_cvs where id = p_cv_id;

  if not found then
    raise exception 'CV introuvable';
  end if;

  -- `is distinct from` et non `!=` : avec un appelant anonyme, `!=` donne
  -- NULL et le contrôle ne se déclenche pas.
  if v_cv.user_id is distinct from auth.uid() then
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

create or replace function public.vitae_duplicate_cv(p_cv_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_cv_id uuid;
  v_original record;
begin
  select * into v_original from public.vitae_cvs where id = p_cv_id;

  if not found then
    raise exception 'CV introuvable';
  end if;

  if v_original.user_id is distinct from auth.uid() then
    raise exception 'Accès refusé';
  end if;

  insert into public.vitae_cvs (user_id, titre, template_id, couleur_principale, objectif, statut)
  values (v_original.user_id, v_original.titre || ' (copie)', v_original.template_id,
    v_original.couleur_principale, v_original.objectif, 'brouillon')
  returning id into v_new_cv_id;

  insert into public.vitae_sections (cv_id, type, ordre, donnees)
  select v_new_cv_id, type, ordre, donnees
  from public.vitae_sections
  where cv_id = p_cv_id;

  return v_new_cv_id;
end;
$$;


-- ============================================================
-- 2. Rondo : ne répondre que sur soi, et seulement à ses tontines
-- ============================================================

-- Les helpers des policies reçoivent toujours `auth.uid()` en second
-- argument. On le vérifie : appelés directement en RPC avec l'identifiant
-- d'un autre, ils ne doivent rien révéler de ses tontines.
create or replace function public.rondo_is_admin(p_tontine_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p_user_id = auth.uid(), false)
     and exists (
       select 1 from public.rondo_tontines t
       where t.id = p_tontine_id and t.admin_id = p_user_id
     );
$$;

create or replace function public.rondo_is_membre(p_tontine_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p_user_id = auth.uid(), false)
     and exists (
       select 1 from public.rondo_membres m
       where m.tontine_id = p_tontine_id
         and m.user_id = p_user_id
         and m.statut = 'actif'
     );
$$;

create or replace function public.rondo_cagnotte_tour(p_tour_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(p.montant), 0)::integer
  from public.rondo_paiements p
  join public.rondo_tours t on t.id = p.tour_id
  where p.tour_id = p_tour_id
    and public.rondo_is_member_or_admin(t.tontine_id, auth.uid());
$$;

create or replace function public.rondo_statut_tour(p_tour_id uuid)
returns table(membre_id uuid, user_id uuid, full_name text, avatar_url text,
  paye boolean, montant_paye integer, mode text)
language sql
security definer
set search_path = public
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
    and public.rondo_is_member_or_admin(m.tontine_id, auth.uid())
  order by m.ordre_tour;
$$;

-- Téléphones des membres d'une tontine, pour ses seuls membres et son
-- administrateur : les membres d'une tontine se connaissent et doivent
-- pouvoir s'appeler. C'est par ici que Rondo lira les numéros une fois la
-- colonne `profiles.phone` fermée (partie 2).
create or replace function public.rondo_telephones(p_tontine_id uuid)
returns table(user_id uuid, phone text)
language sql
stable
security definer
set search_path = public
as $$
  select pr.id, pr.phone
  from public.profiles pr
  where public.rondo_is_member_or_admin(p_tontine_id, auth.uid())
    and (
      exists (select 1 from public.rondo_membres m
              where m.tontine_id = p_tontine_id and m.user_id = pr.id)
      or exists (select 1 from public.rondo_tontines t
                 where t.id = p_tontine_id and t.admin_id = pr.id)
    );
$$;

-- Hive : téléphones des deux parties d'une commande, et seulement une fois
-- la commande confirmée — la règle que l'écran appliquait déjà
-- (components/OrderCard.tsx), désormais tenue par la base. Avant, la
-- messagerie suffit.
create or replace function public.hive_telephones_commandes(p_order_ids uuid[])
returns table(order_id uuid, buyer_phone text, seller_phone text)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, b.phone, s.phone
  from public.hive_orders o
  join public.profiles b on b.id = o.buyer_id
  join public.profiles s on s.id = o.seller_id
  where o.id = any(p_order_ids)
    and auth.uid() in (o.buyer_id, o.seller_id)
    and o.status in ('confirmee', 'en_cours');
$$;

-- Toutes les policies Rondo ouvertes à `public` (anonymes compris) passent
-- à `authenticated`. Leurs conditions ne changent pas : elles s'appuient
-- toutes sur `auth.uid()`, qu'un anonyme n'a pas.
do $$
declare
  pol record;
begin
  for pol in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename like 'rondo\_%' and roles = '{public}'
  loop
    execute format('alter policy %I on public.%I to authenticated', pol.policyname, pol.tablename);
  end loop;
end $$;


-- ============================================================
-- 3. Scraper d'offres : un secret partagé, rangé dans Vault
-- ============================================================

-- Généré dans la base, jamais écrit en clair ailleurs : ni dans ce fichier,
-- ni dans le dépôt, ni dans les variables de la fonction.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'scraper_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'scraper_secret',
      'Authentifie les appels du cron à l''Edge Function scrape-job-offers'
    );
  end if;
end $$;

create or replace function public.vitae_scrape_jobs()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_response json;
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'scraper_secret';

  select into v_response
    * from net.http_post(
      url := 'https://fhaulxauhaoofimkyrqb.supabase.co/functions/v1/scrape-job-offers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-scraper-secret', v_secret
      ),
      body := '{}'::jsonb
    );
  raise notice 'Scrape result: %', v_response;
end;
$$;

-- Vérifié par l'Edge Function avec sa clé service_role : la fonction n'a
-- pas besoin de connaître le secret, seulement de le faire confirmer.
create or replace function public.vitae_scraper_secret_valid(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'scraper_secret' and decrypted_secret = p_secret
  );
$$;


-- ============================================================
-- 4. Abonnements Vitae : écriture réservée au serveur
-- ============================================================
-- La lecture de sa propre ligne reste ouverte. Le jour où un paiement
-- accordera un plan, c'est le serveur (clé service_role, après validation
-- du reçu) qui l'écrira — jamais le téléphone de l'utilisateur.
drop policy if exists "Users can insert own subscription" on public.vitae_subscriptions;
drop policy if exists "Users can update own subscription" on public.vitae_subscriptions;


-- ============================================================
-- 5. Droits d'exécution des fonctions SECURITY DEFINER
-- ============================================================
-- Postgres accorde EXECUTE à PUBLIC à la création d'une fonction : retirer
-- `anon` seul ne suffit pas, il hérite de PUBLIC. On retire donc les deux,
-- puis on rend explicitement à `authenticated` ce dont les apps ont besoin.

-- Appelées par les apps, utilisateur connecté uniquement.
revoke execute on function
  public.anome_is_admin(),
  public.anome_is_banned(),
  public.delete_user(),
  public.rondo_cagnotte_tour(uuid),
  public.rondo_generer_tours(uuid),
  public.rondo_home_admin(),
  public.rondo_home_membre(),
  public.rondo_is_admin(uuid, uuid),
  public.rondo_is_member_or_admin(uuid, uuid),
  public.rondo_is_membre(uuid, uuid),
  public.rondo_rejoindre_tontine(text),
  public.rondo_statut_tour(uuid),
  public.rondo_telephones(uuid),
  public.hive_telephones_commandes(uuid[]),
  public.vitae_duplicate_cv(uuid),
  public.vitae_get_full_cv(uuid)
from public, anon;

grant execute on function
  public.anome_is_admin(),
  public.anome_is_banned(),
  public.delete_user(),
  public.rondo_cagnotte_tour(uuid),
  public.rondo_generer_tours(uuid),
  public.rondo_home_admin(),
  public.rondo_home_membre(),
  public.rondo_is_admin(uuid, uuid),
  public.rondo_is_member_or_admin(uuid, uuid),
  public.rondo_is_membre(uuid, uuid),
  public.rondo_rejoindre_tontine(text),
  public.rondo_statut_tour(uuid),
  public.rondo_telephones(uuid),
  public.hive_telephones_commandes(uuid[]),
  public.vitae_duplicate_cv(uuid),
  public.vitae_get_full_cv(uuid)
to authenticated, service_role;

-- Fonctions de trigger et d'event trigger : personne n'a à les appeler.
-- Un trigger ne vérifie pas EXECUTE au déclenchement, elles continuent de
-- fonctionner.
revoke execute on function
  public.handle_new_user(),
  public.anome_sync_post_comment_count(),
  public.rls_auto_enable()
from public, anon, authenticated;

-- Réservées au cron (rôle postgres) et à l'Edge Function (service_role).
revoke execute on function public.vitae_scrape_jobs() from public, anon, authenticated;
revoke execute on function public.vitae_scraper_secret_valid(text) from public, anon, authenticated;
grant execute on function public.vitae_scraper_secret_valid(text) to service_role;

-- À l'avenir : une fonction créée dans `public` n'est plus exécutable par
-- les visiteurs anonymes sans un `grant` explicite. `authenticated` garde
-- le droit que Supabase lui accorde par défaut.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;


-- ============================================================
-- 6. search_path figé (conseiller Supabase « function_search_path_mutable »)
-- ============================================================
-- Sans search_path fixe, un rôle capable de créer un objet homonyme dans un
-- schéma prioritaire pourrait détourner `lower`, `now`… Les fonctions
-- natives restent trouvées : pg_catalog est toujours consulté.
alter function public.normalize_phone_to_email(text) set search_path = '';
alter function public.update_updated_at() set search_path = '';
