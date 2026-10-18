-- =============================================================================
-- Hive en pause (brief v2 de la vitrine, « Archivage de Hive », 17/10/2026)
-- =============================================================================
--
-- EN ATTENTE : à appliquer seulement après l'accord explicite de Daniel.
-- Elle touche la base de production partagée (Vitae, Sowly, Hive).
--
-- Ce qu'elle fait :
--   1. masque toutes les annonces publiées (statut 'suspendu') : aucune
--      annonce ne reste visible, fictive ou non. Rien n'est supprimé ;
--   2. crée la table `waitlist` (numéro, date, consentement, produit) ;
--   3. ferme les écritures de Hive côté base, par des politiques RLS
--      RESTRICTIVES : elles s'ajoutent aux politiques existantes sans les
--      modifier, et rouvrir Hive revient à les supprimer (bloc en fin de
--      fichier). La clé service_role, qui contourne la RLS, n'est pas
--      concernée.
--
-- Les inscriptions Supabase Auth restent ouvertes : l'authentification est
-- partagée avec Vitae et Sowly. Un compte Hive n'existe que par sa ligne
-- `hive_profiles`, c'est donc elle qu'on ferme.
--
-- Pour les comptes et annonces de démonstration (cinq vendeurs, trente
-- annonces), la suppression définitive reste décrite dans la mémoire du
-- projet ; ce fichier ne fait que les masquer.
-- =============================================================================

begin;

-- 1. Aucune annonce visible -----------------------------------------------
-- 'suspendu' plutôt que 'retire' : 'retire' est le geste d'un loueur, qu'il
-- peut défaire lui-même ; 'suspendu' est une décision de l'équipe.
update public.hive_listings
   set status = 'suspendu'
 where status = 'publie';

-- 2. Liste d'attente --------------------------------------------------------
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  product text not null check (product in ('hive')),
  -- Format local ivoirien à dix chiffres, comme lib/phone.ts#normalizePhone.
  phone text not null check (phone ~ '^0[157][0-9]{8}$'),
  consent boolean not null check (consent),
  created_at timestamptz not null default now(),
  constraint waitlist_once unique (product, phone)
);

comment on table public.waitlist is
  'Personnes à prévenir une seule fois au retour d''un produit en pause. Aucun autre usage.';

alter table public.waitlist enable row level security;

-- Insertion seule, consentement obligatoire. Aucune politique de lecture :
-- la liste ne se relit qu'au SQL Editor, jamais depuis une app.
drop policy if exists "Anyone can join a waitlist" on public.waitlist;
create policy "Anyone can join a waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (consent and product = 'hive');

-- 3. Écritures de Hive fermées -------------------------------------------
drop policy if exists "Hive en pause : pas de nouvelle annonce" on public.hive_listings;
create policy "Hive en pause : pas de nouvelle annonce"
  on public.hive_listings as restrictive for insert
  to anon, authenticated
  with check (false);

-- Empêche aussi un loueur de republier son annonce suspendue.
drop policy if exists "Hive en pause : annonces figées" on public.hive_listings;
create policy "Hive en pause : annonces figées"
  on public.hive_listings as restrictive for update
  to anon, authenticated
  using (false);

drop policy if exists "Hive en pause : pas de nouveau profil" on public.hive_profiles;
create policy "Hive en pause : pas de nouveau profil"
  on public.hive_profiles as restrictive for insert
  to anon, authenticated
  with check (false);

drop policy if exists "Hive en pause : pas de commande" on public.hive_orders;
create policy "Hive en pause : pas de commande"
  on public.hive_orders as restrictive for insert
  to anon, authenticated
  with check (false);

drop policy if exists "Hive en pause : pas de conversation" on public.hive_conversations;
create policy "Hive en pause : pas de conversation"
  on public.hive_conversations as restrictive for insert
  to anon, authenticated
  with check (false);

drop policy if exists "Hive en pause : pas de message" on public.hive_messages;
create policy "Hive en pause : pas de message"
  on public.hive_messages as restrictive for insert
  to anon, authenticated
  with check (false);

drop policy if exists "Hive en pause : pas de photo" on storage.objects;
create policy "Hive en pause : pas de photo"
  on storage.objects as restrictive for insert
  to anon, authenticated
  with check (bucket_id <> 'hive-listings');

commit;

-- =============================================================================
-- Réouverture (ne pas exécuter maintenant)
-- =============================================================================
-- drop policy "Hive en pause : pas de nouvelle annonce" on public.hive_listings;
-- drop policy "Hive en pause : annonces figées"         on public.hive_listings;
-- drop policy "Hive en pause : pas de nouveau profil"   on public.hive_profiles;
-- drop policy "Hive en pause : pas de commande"         on public.hive_orders;
-- drop policy "Hive en pause : pas de conversation"     on public.hive_conversations;
-- drop policy "Hive en pause : pas de message"          on public.hive_messages;
-- drop policy "Hive en pause : pas de photo"            on storage.objects;
-- Les annonces suspendues ne reviennent pas d'elles-mêmes : les réactiver
-- une à une, après vérification des loueurs.
