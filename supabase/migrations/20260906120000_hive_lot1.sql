-- ============================================================
-- Hive — lot 1 : location et vente de matériel audiovisuel à Abidjan
--
-- Hive est la troisième application de la base : ses tables sont préfixées
-- `hive_`, comme `rondo_` et `vitae_` avant elles. Elle réutilise sans les
-- toucher `public.profiles`, `public.normalize_phone_to_email` (auth par
-- pseudo-email, donc zéro SMS) et `public.update_updated_at()`.
--
-- Trois décisions du brief se lisent directement dans ce schéma :
--   - publication immédiate : `hive_listings.status` vaut 'publie' par défaut,
--     aucune validation manuelle ne bloque une annonce (brief §3.8, §7) ;
--   - paiement double, main propre au lancement : `payment_method` accepte
--     déjà 'en_ligne' et `hive_payments` existe, mais l'application garde
--     l'option désactivée tant que le compte marchand n'est pas ouvert ;
--   - Hive n'encaisse jamais : aucune colonne de commission, aucun solde.
--     L'argent va du client au loueur, directement.
--
-- Les colonnes d'utilisateur référencent `public.profiles(id)` et non
-- `auth.users(id)` directement, comme le font déjà les tables Rondo : c'est
-- cette clé étrangère qui permet à PostgREST de joindre le nom du loueur à
-- son annonce en une seule requête. `profiles` est alimentée par le trigger
-- `on_auth_user_created`, la ligne existe donc avant toute écriture ici.
--
-- Migration rejouable (README de ce dossier) : `if not exists` partout,
-- `drop policy if exists` avant chaque `create policy`.
-- ============================================================

-- ============================================================
-- TABLE: hive_profiles
-- Ce que Hive ajoute au profil commun : où l'on se trouve et comment on
-- accepte d'être payé. Le nom et le téléphone restent dans `profiles`.
-- ============================================================
create table if not exists public.hive_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  -- Commune d'Abidjan par défaut, pré-remplie sur les nouvelles annonces.
  commune text,
  bio text,
  -- Modes de paiement acceptés par défaut. Le main propre est le socle : il
  -- fonctionne sans agrégateur, sans compte marchand et sans réseau.
  accepts_cash boolean not null default true,
  accepts_online boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hive_profiles enable row level security;

-- Lecture publique : la fiche d'une annonce affiche la commune du loueur.
drop policy if exists "Hive profiles are public" on public.hive_profiles;
create policy "Hive profiles are public"
  on public.hive_profiles for select
  using (true);

drop policy if exists "Owner writes own hive profile" on public.hive_profiles;
create policy "Owner writes own hive profile"
  on public.hive_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner updates own hive profile" on public.hive_profiles;
create policy "Owner updates own hive profile"
  on public.hive_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- TABLE: hive_categories
-- Arbre à deux niveaux, alimenté par cette migration. Personne ne l'écrit
-- depuis l'application : les identifiants sont référencés par les annonces
-- et par le code, ils ne bougent pas au gré d'un formulaire.
-- ============================================================
create table if not exists public.hive_categories (
  id text primary key,
  label text not null,
  parent_id text references public.hive_categories(id) on delete cascade,
  position int not null default 0
);

alter table public.hive_categories enable row level security;

drop policy if exists "Categories are public" on public.hive_categories;
create policy "Categories are public"
  on public.hive_categories for select
  using (true);

insert into public.hive_categories (id, label, parent_id, position) values
  ('audiovisuel',    'Audiovisuel',              null,          1),
  ('camera',         'Caméras',                  'audiovisuel', 1),
  ('objectif',       'Objectifs',                'audiovisuel', 2),
  ('stabilisation',  'Trépieds & stabilisation', 'audiovisuel', 3),
  ('drone',          'Drones',                   'audiovisuel', 4),
  ('son',            'Sonorisation',             null,          2),
  ('enceinte',       'Enceintes & caissons',     'son',         1),
  ('console',        'Consoles de mixage',       'son',         2),
  ('micro',          'Microphones',              'son',         3),
  ('enregistrement', 'Enregistrement',           'son',         4),
  ('eclairage',      'Éclairage',                null,          3),
  ('projecteur',     'Projecteurs & mandarines', 'eclairage',   1),
  ('effet-lumiere',  'Jeux de lumière',          'eclairage',   2),
  ('structure',      'Structures & pieds',       'eclairage',   3),
  ('instrument',     'Instruments & DJ',         null,          4),
  ('clavier',        'Claviers & synthés',       'instrument',  1),
  ('guitare',        'Guitares & basses',        'instrument',  2),
  ('percussion',     'Percussions & batteries',  'instrument',  3),
  ('dj',             'Matériel DJ',              'instrument',  4)
on conflict (id) do nothing;

-- ============================================================
-- TABLE: hive_listings
-- Une annonce peut être en location, en vente, ou les deux (décision §7).
-- Les montants sont des entiers de francs CFA : le FCFA n'a pas de centime,
-- une décimale ici ne pourrait qu'introduire des erreurs d'arrondi.
-- ============================================================
create table if not exists public.hive_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 120),
  description text not null default '',
  category_id text not null references public.hive_categories(id),
  condition text not null default 'occasion' check (condition in ('neuf', 'occasion')),

  for_rent boolean not null default false,
  for_sale boolean not null default false,
  rent_price_day bigint check (rent_price_day is null or rent_price_day >= 0),
  rent_price_week bigint check (rent_price_week is null or rent_price_week >= 0),
  sale_price bigint check (sale_price is null or sale_price >= 0),

  commune text not null,
  -- Chemins dans le bucket `hive-listings`, jamais des URL complètes : le
  -- domaine du projet Supabase peut changer, pas les chemins.
  photos text[] not null default '{}' check (cardinality(photos) <= 5),
  -- 'publie' d'emblée : la modération est a posteriori (brief §3.8).
  status text not null default 'publie' check (status in ('publie', 'retire', 'suspendu')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Au moins un mode, et chaque mode retenu porte son prix. Sans ces trois
  -- contraintes, une annonce « en location » sans tarif serait publiable, et
  -- le calcul du total n'aurait rien à quoi se raccrocher.
  constraint hive_listings_mode_required check (for_rent or for_sale),
  constraint hive_listings_rent_priced check (not for_rent or rent_price_day is not null),
  constraint hive_listings_sale_priced check (not for_sale or sale_price is not null)
);

create index if not exists idx_hive_listings_browse
  on public.hive_listings(status, created_at desc);
create index if not exists idx_hive_listings_category
  on public.hive_listings(category_id, status);
create index if not exists idx_hive_listings_commune
  on public.hive_listings(commune, status);
create index if not exists idx_hive_listings_owner
  on public.hive_listings(user_id, created_at desc);

alter table public.hive_listings enable row level security;

-- Les annonces publiées se lisent sans compte : quelqu'un qui découvre Hive
-- par un lien WhatsApp doit voir le matériel avant qu'on lui demande de
-- s'inscrire. Le propriétaire, lui, voit aussi ses annonces retirées.
drop policy if exists "Published listings are public" on public.hive_listings;
create policy "Published listings are public"
  on public.hive_listings for select
  using (status = 'publie' or auth.uid() = user_id);

drop policy if exists "Owner creates listings" on public.hive_listings;
create policy "Owner creates listings"
  on public.hive_listings for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner updates listings" on public.hive_listings;
create policy "Owner updates listings"
  on public.hive_listings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owner deletes listings" on public.hive_listings;
create policy "Owner deletes listings"
  on public.hive_listings for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- TABLE: hive_orders
-- Réservations (location) et achats (vente). `seller_id` est dénormalisé
-- depuis l'annonce : sans lui, chaque vérification RLS d'une commande
-- devrait relire `hive_listings`, sur tous les chemins de lecture.
-- ============================================================
create table if not exists public.hive_orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.hive_listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('location', 'achat')),
  start_date date,
  end_date date,
  -- Total recalculé côté serveur au moment de la demande, puis figé : le
  -- loueur peut changer son tarif demain, la commande déjà passée ne bouge pas.
  total_amount bigint not null check (total_amount >= 0),
  payment_method text not null default 'main_propre'
    check (payment_method in ('main_propre', 'en_ligne')),
  payment_status text not null default 'non_paye'
    check (payment_status in ('non_paye', 'en_attente', 'paye', 'rembourse')),
  status text not null default 'demandee'
    check (status in ('demandee', 'confirmee', 'en_cours', 'terminee', 'annulee')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Une location a des dates, un achat n'en a pas. Mélanger les deux formes
  -- rendrait le calcul de disponibilité impossible à écrire correctement.
  constraint hive_orders_dates_for_rent check (
    (kind = 'location' and start_date is not null and end_date is not null and end_date >= start_date)
    or (kind = 'achat' and start_date is null and end_date is null)
  ),
  -- On ne loue pas son propre matériel : ça fausserait la disponibilité.
  constraint hive_orders_distinct_parties check (buyer_id <> seller_id)
);

create index if not exists idx_hive_orders_buyer
  on public.hive_orders(buyer_id, created_at desc);
create index if not exists idx_hive_orders_seller
  on public.hive_orders(seller_id, created_at desc);
-- Sert le calcul de disponibilité : les commandes actives d'une annonce.
create index if not exists idx_hive_orders_listing_dates
  on public.hive_orders(listing_id, status, start_date, end_date);

alter table public.hive_orders enable row level security;

drop policy if exists "Parties read own orders" on public.hive_orders;
create policy "Parties read own orders"
  on public.hive_orders for select
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Seul le client crée une commande, et jamais au nom de quelqu'un d'autre.
drop policy if exists "Buyer creates order" on public.hive_orders;
create policy "Buyer creates order"
  on public.hive_orders for insert
  to authenticated
  with check (
    auth.uid() = buyer_id
    and exists (
      select 1 from public.hive_listings l
      where l.id = listing_id
        and l.user_id = seller_id
        and l.status = 'publie'
    )
  );

-- Les deux parties font avancer le statut. Quelles transitions sont permises
-- se décide dans l'application (lib/orders.ts) : l'exprimer en SQL
-- demanderait un trigger comparant l'ancienne et la nouvelle ligne, pour une
-- règle qui doit de toute façon être lisible et testable côté code.
drop policy if exists "Parties update own orders" on public.hive_orders;
create policy "Parties update own orders"
  on public.hive_orders for update
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

-- ============================================================
-- TABLE: hive_payments
-- Coquille du paiement en ligne (brief §3.7). La table existe pour que le
-- jour où le compte marchand ouvre, aucune migration de données ne soit
-- nécessaire — mais elle n'a AUCUNE policy : elle est donc inaccessible
-- depuis la clé anon, et ne s'écrira que par le webhook de l'agrégateur,
-- côté serveur, quand le lot 2 l'ouvrira.
-- ============================================================
create table if not exists public.hive_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.hive_orders(id) on delete cascade,
  provider text not null,
  provider_ref text,
  amount bigint not null check (amount >= 0),
  status text not null default 'en_attente'
    check (status in ('en_attente', 'paye', 'echoue', 'rembourse')),
  raw jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_hive_payments_provider_ref
  on public.hive_payments(provider, provider_ref)
  where provider_ref is not null;

alter table public.hive_payments enable row level security;

-- ============================================================
-- TABLES: hive_conversations / hive_messages
-- Un fil par couple (annonce, client). Pas de Realtime : l'écran de
-- conversation redemande les nouveaux messages toutes les dix secondes.
-- Sur un réseau abidjanais instable, un websocket permanent coûte plus de
-- batterie et de données qu'il ne rapporte de fluidité.
-- ============================================================
create table if not exists public.hive_conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.hive_listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint hive_conversations_distinct_parties check (buyer_id <> seller_id),
  constraint hive_conversations_unique unique (listing_id, buyer_id)
);

create index if not exists idx_hive_conversations_buyer
  on public.hive_conversations(buyer_id, last_message_at desc);
create index if not exists idx_hive_conversations_seller
  on public.hive_conversations(seller_id, last_message_at desc);

alter table public.hive_conversations enable row level security;

drop policy if exists "Parties read own conversations" on public.hive_conversations;
create policy "Parties read own conversations"
  on public.hive_conversations for select
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "Buyer opens conversation" on public.hive_conversations;
create policy "Buyer opens conversation"
  on public.hive_conversations for insert
  to authenticated
  with check (
    auth.uid() = buyer_id
    and exists (
      select 1 from public.hive_listings l
      where l.id = listing_id and l.user_id = seller_id
    )
  );

drop policy if exists "Parties touch own conversations" on public.hive_conversations;
create policy "Parties touch own conversations"
  on public.hive_conversations for update
  to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

create table if not exists public.hive_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.hive_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_hive_messages_thread
  on public.hive_messages(conversation_id, created_at);

alter table public.hive_messages enable row level security;

drop policy if exists "Parties read conversation messages" on public.hive_messages;
create policy "Parties read conversation messages"
  on public.hive_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.hive_conversations c
      where c.id = conversation_id
        and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)
    )
  );

-- On écrit en son propre nom, dans un fil dont on fait partie. Les deux
-- conditions comptent : la première empêche d'usurper l'interlocuteur, la
-- seconde d'écrire dans la conversation de deux inconnus.
drop policy if exists "Parties write conversation messages" on public.hive_messages;
create policy "Parties write conversation messages"
  on public.hive_messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.hive_conversations c
      where c.id = conversation_id
        and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)
    )
  );

-- ============================================================
-- TABLE: hive_reports
-- Contrepartie de la publication immédiate. On peut signaler, on ne peut pas
-- lire les signalements : pas de policy de select, donc rien n'est exposé à
-- l'application. Le traitement se fait au SQL Editor tant que l'écran de
-- modération du lot 2 n'existe pas.
-- ============================================================
create table if not exists public.hive_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('listing', 'user')),
  target_id uuid not null,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (length(trim(reason)) between 3 and 1000),
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint hive_reports_once unique (target_type, target_id, reporter_id)
);

create index if not exists idx_hive_reports_pending
  on public.hive_reports(created_at desc) where handled_at is null;

alter table public.hive_reports enable row level security;

drop policy if exists "Anyone signed in can report" on public.hive_reports;
create policy "Anyone signed in can report"
  on public.hive_reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- ============================================================
-- Lecture des profils pour Hive
--
-- `profiles` n'autorisait jusqu'ici que la lecture de son propre profil et
-- celle des co-membres d'une tontine Rondo. Hive a besoin d'afficher le nom
-- du loueur sur une annonce et celui de son interlocuteur dans un fil.
-- On ouvre exactement ces deux cas, pas un de plus : les policies sont
-- permissives, elles s'ajoutent aux règles de Rondo sans les modifier.
-- ============================================================
drop policy if exists "Hive: read profiles of listing owners" on public.profiles;
create policy "Hive: read profiles of listing owners"
  on public.profiles for select
  using (
    exists (
      select 1 from public.hive_listings l
      where l.user_id = profiles.id and l.status = 'publie'
    )
  );

drop policy if exists "Hive: read profiles of counterparts" on public.profiles;
create policy "Hive: read profiles of counterparts"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.hive_orders o
      where (o.buyer_id = auth.uid() and o.seller_id = profiles.id)
         or (o.seller_id = auth.uid() and o.buyer_id = profiles.id)
    )
    or exists (
      select 1 from public.hive_conversations c
      where (c.buyer_id = auth.uid() and c.seller_id = profiles.id)
         or (c.seller_id = auth.uid() and c.buyer_id = profiles.id)
    )
  );

-- ============================================================
-- Trigger updated_at (fonction commune de l'ÉTAPE 4 du schéma)
-- ============================================================
drop trigger if exists set_updated_at_hive_profiles on public.hive_profiles;
create trigger set_updated_at_hive_profiles
  before update on public.hive_profiles
  for each row execute function public.update_updated_at();

drop trigger if exists set_updated_at_hive_listings on public.hive_listings;
create trigger set_updated_at_hive_listings
  before update on public.hive_listings
  for each row execute function public.update_updated_at();

drop trigger if exists set_updated_at_hive_orders on public.hive_orders;
create trigger set_updated_at_hive_orders
  before update on public.hive_orders
  for each row execute function public.update_updated_at();

-- ============================================================
-- Stockage des photos d'annonces
--
-- Bucket public en lecture : une annonce se partage par lien, et une URL
-- signée qui expire casserait ce partage. Les photos sont compressées dans
-- le navigateur avant l'envoi (lib/photos.ts), d'où la limite de 1 Mo.
-- L'écriture est cloisonnée par dossier `<uid>/…`, ce qui empêche d'écraser
-- les photos de quelqu'un d'autre.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hive-listings', 'hive-listings', true, 1048576, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update
  set public = true,
      file_size_limit = 1048576,
      allowed_mime_types = array['image/jpeg', 'image/webp', 'image/png'];

drop policy if exists "Hive listing photos are public" on storage.objects;
create policy "Hive listing photos are public"
  on storage.objects for select
  using (bucket_id = 'hive-listings');

drop policy if exists "Owner uploads listing photos" on storage.objects;
create policy "Owner uploads listing photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'hive-listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owner deletes listing photos" on storage.objects;
create policy "Owner deletes listing photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'hive-listings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Le numéro de téléphone n'est pas une donnée d'annonce
--
-- Les deux policies ci-dessus ouvrent des lignes de `profiles`, et la RLS
-- s'arrête à la ligne : sans ce garde-fou, un visiteur non connecté muni de
-- la clé anon pourrait moissonner les numéros de tous les loueurs. On retire
-- la colonne à `anon` ; l'application, elle, n'affiche le numéro qu'aux deux
-- parties d'une commande, une fois la réservation faite.
-- ============================================================
revoke select (phone) on public.profiles from anon;
