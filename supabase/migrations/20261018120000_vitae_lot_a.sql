-- =============================================================================
-- Vitae — lot A du brief v2 (17/10/2026) : lancement à l'INJS
-- =============================================================================
--
-- Brief : web/apps/vitae/docs/brief-vitae-v2.md. Ce fichier pose tout ce dont
-- le lot A a besoin côté base, en adaptant les noms du brief au schéma existant
-- plutôt qu'en dupliquant (consigne « Modèle de données ») :
--
--   brief            ici
--   ---------------  -----------------------------------------------------------
--   events           vitae_events, complétée (event = name, meta = props)
--   ambassadors      vitae_ambassadors
--   waitlist         waitlist, partagée avec Hive (voir la note plus bas)
--   job_sources      vitae_job_sources
--   job_offers       vitae_job_offers, complétée (category = sector normalisé)
--   rôle admin       vitae_admins + vitae_is_admin()
--
-- Rejouable : `if not exists`, `drop … if exists` avant chaque création.
--
-- ⚠️ Base de production partagée (Vitae, Hive, Sowly, AnoMe, Rondo) : à
-- appliquer par Daniel après relecture (`npx supabase db push --dry-run`
-- d'abord). La migration Hive `en-attente/20261018100000_hive_pause.sql`
-- peut passer avant ou après celle-ci, les deux sont compatibles.
-- =============================================================================

begin;

-- =============================================================================
-- 1. Administrateurs
-- =============================================================================
-- Aucun rôle admin n'existait pour Vitae. Une table d'identifiants plutôt
-- qu'un champ dans `profiles` : `profiles` est partagée par toutes les apps,
-- et un admin Vitae n'est admin de rien d'autre.
--
-- Pour se donner le rôle (une fois, au SQL Editor) :
--   insert into public.vitae_admins (user_id)
--   select id from auth.users where email = '<adresse du compte>';

create table if not exists public.vitae_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.vitae_admins enable row level security;
-- Aucune politique : la table ne se lit qu'à travers vitae_is_admin().

create or replace function public.vitae_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.vitae_admins where user_id = auth.uid());
$$;

revoke execute on function public.vitae_is_admin() from public, anon;
grant execute on function public.vitae_is_admin() to authenticated;

-- =============================================================================
-- 2. Mesure : vitae_events
-- =============================================================================
-- La table existait (journal minimal, compte obligatoire). Le brief veut des
-- événements anonymes, rattachés à un identifiant de navigateur (`anon_id`),
-- au code ambassadeur (`ref`) et aux UTM. Aucune donnée personnelle : pas de
-- numéro, pas d'e-mail, pas de contenu de CV dans `meta`.

alter table public.vitae_events alter column user_id drop not null;
alter table public.vitae_events add column if not exists anon_id text;
alter table public.vitae_events add column if not exists ref text;
alter table public.vitae_events add column if not exists utm_source text;
alter table public.vitae_events add column if not exists utm_campaign text;
alter table public.vitae_events add column if not exists app_version text;

-- Supprimer son compte ne doit pas effacer les statistiques : la ligne perd
-- son lien au compte, elle reste anonyme.
alter table public.vitae_events drop constraint if exists vitae_events_user_id_fkey;
alter table public.vitae_events
  add constraint vitae_events_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.vitae_events drop constraint if exists vitae_events_event_check;
alter table public.vitae_events
  add constraint vitae_events_event_check check (event in (
    -- Journal d'origine, conservé pour les lignes déjà écrites.
    'resume_created', 'resume_saved', 'resume_downloaded',
    'linkedin_imported', 'template_changed',
    -- Lot A
    'visit', 'cv_started', 'cv_section_completed', 'cv_score_80',
    'cv_pdf_downloaded', 'offer_clicked', 'whatsapp_channel_clicked',
    'waitlist_joined',
    -- Lot B
    'account_created', 'paywall_viewed', 'checkout_started',
    'payment_succeeded', 'payment_failed'
  ));

alter table public.vitae_events drop constraint if exists vitae_events_sizes;
alter table public.vitae_events
  add constraint vitae_events_sizes check (
    coalesce(length(anon_id), 0) <= 64
    and coalesce(length(ref), 0) <= 64
    and coalesce(length(utm_source), 0) <= 100
    and coalesce(length(utm_campaign), 0) <= 100
    and coalesce(length(app_version), 0) <= 40
    and length(meta::text) <= 2000
  );

create index if not exists idx_vitae_events_ref on public.vitae_events (ref, created_at desc);
create index if not exists idx_vitae_events_anon on public.vitae_events (anon_id, created_at);
create index if not exists idx_vitae_events_user on public.vitae_events (user_id, created_at);

-- Insertion seule côté client ; un compte ne peut écrire qu'en son nom. Les
-- événements de paiement ne s'écrivent qu'avec la clé de service (webhook
-- Wave) : un achat ne se déclare pas depuis un navigateur.
drop policy if exists "Owner can log own events" on public.vitae_events;
drop policy if exists "Anyone can log events" on public.vitae_events;
create policy "Anyone can log events"
  on public.vitae_events for insert
  to anon, authenticated
  with check (
    (user_id is null or user_id = auth.uid())
    and event not in ('payment_succeeded', 'payment_failed')
  );

-- Lecture réservée à l'administration.
drop policy if exists "Admins read events" on public.vitae_events;
create policy "Admins read events"
  on public.vitae_events for select
  to authenticated
  using (public.vitae_is_admin());

-- =============================================================================
-- 3. Ambassadeurs
-- =============================================================================

create table if not exists public.vitae_ambassadors (
  -- Le code tel qu'il s'écrit dans les liens (`?ref=INJS-AMINA`). La
  -- correspondance avec `vitae_events.ref` ignore la casse.
  code text primary key check (code ~ '^[A-Za-z0-9_-]{2,40}$'),
  first_name text not null check (length(first_name) between 1 and 60),
  school text check (length(school) <= 120),
  active boolean not null default true,
  -- Jeton remis à la main avec le lien /ambassadeur/<code>?t=<jeton>.
  token text not null default encode(extensions.gen_random_bytes(18), 'hex'),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_vitae_ambassadors_code_ci
  on public.vitae_ambassadors (lower(code));

alter table public.vitae_ambassadors enable row level security;

drop policy if exists "Admins manage ambassadors" on public.vitae_ambassadors;
create policy "Admins manage ambassadors"
  on public.vitae_ambassadors for all
  to authenticated
  using (public.vitae_is_admin())
  with check (public.vitae_is_admin());

-- Ce que voit un ambassadeur : deux nombres, rien d'autre. Un code inconnu,
-- inactif ou un mauvais jeton ne renvoient aucune ligne — la page ne peut pas
-- distinguer « mauvais jeton » de « code inconnu ».
--
-- « CV téléchargés » = navigateurs distincts ayant téléchargé au moins un PDF
-- avec ce code : un même CV retéléchargé dix fois compte une fois.
create or replace function public.vitae_ambassador_stats(p_code text, p_token text)
returns table (week_count integer, total_count integer, first_name text)
language sql
stable
security definer
set search_path = ''
as $$
  with amb as (
    select a.code, a.first_name
      from public.vitae_ambassadors a
     where lower(a.code) = lower(p_code)
       and a.active
       and a.token = p_token
  ),
  downloads as (
    select e.anon_id, e.user_id, e.created_at
      from public.vitae_events e, amb
     where e.event = 'cv_pdf_downloaded'
       and lower(e.ref) = lower(amb.code)
  )
  select
    (select count(distinct coalesce(user_id::text, anon_id))
       from downloads
      where created_at >= date_trunc('week', now()))::integer,
    (select count(distinct coalesce(user_id::text, anon_id)) from downloads)::integer,
    amb.first_name
  from amb;
$$;

revoke execute on function public.vitae_ambassador_stats(text, text) from public;
grant execute on function public.vitae_ambassador_stats(text, text) to anon, authenticated;

-- =============================================================================
-- 4. Tableau de bord : l'entonnoir de la semaine
-- =============================================================================
-- Une « personne » = un compte s'il existe, sinon un navigateur (anon_id).
-- Les étapes sont comptées dans la semaine où elles se produisent.
--
-- « Retour sous 30 jours » (brief) : personne revue plus de 24 h après son
-- premier téléchargement et au plus 30 jours après. Comptée dans la semaine
-- de ce premier téléchargement, ce qui rend la colonne incomplète pour les
-- quatre dernières semaines : c'est attendu, la page le dit.

create or replace function public.vitae_funnel(p_weeks integer default 8, p_ref text default null)
returns table (
  week date,
  started integer,
  score80 integer,
  downloaded integer,
  returned integer,
  purchased integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.vitae_is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;

  return query
  with ev as (
    select coalesce(e.user_id::text, e.anon_id) as person, e.event, e.created_at
      from public.vitae_events e
     where coalesce(e.user_id::text, e.anon_id) is not null
       and (p_ref is null or lower(e.ref) = lower(p_ref))
       and e.created_at >= date_trunc('week', now()) - make_interval(weeks => greatest(p_weeks, 1) + 5)
  ),
  weeks as (
    select generate_series(
      date_trunc('week', now()) - make_interval(weeks => greatest(p_weeks, 1) - 1),
      date_trunc('week', now()),
      interval '1 week'
    ) as w
  ),
  first_dl as (
    select person, min(created_at) as at
      from ev where event = 'cv_pdf_downloaded' group by person
  ),
  back as (
    select f.person, f.at
      from first_dl f
     where exists (
       select 1 from ev
        where ev.person = f.person
          and ev.created_at > f.at + interval '24 hours'
          and ev.created_at <= f.at + interval '30 days'
     )
  )
  select
    weeks.w::date,
    (select count(distinct person) from ev
      where event = 'cv_started' and date_trunc('week', created_at) = weeks.w)::integer,
    (select count(distinct person) from ev
      where event = 'cv_score_80' and date_trunc('week', created_at) = weeks.w)::integer,
    (select count(distinct person) from ev
      where event = 'cv_pdf_downloaded' and date_trunc('week', created_at) = weeks.w)::integer,
    (select count(*) from back where date_trunc('week', back.at) = weeks.w)::integer,
    (select count(distinct person) from ev
      where event = 'payment_succeeded' and date_trunc('week', created_at) = weeks.w)::integer
  from weeks
  order by weeks.w desc;
end;
$$;

revoke execute on function public.vitae_funnel(integer, text) from public, anon;
grant execute on function public.vitae_funnel(integer, text) to authenticated;

-- Codes vus ces 90 derniers jours, pour le filtre de la page.
create or replace function public.vitae_refs()
returns table (ref text, people integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.vitae_is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;
  return query
    select lower(e.ref), count(distinct coalesce(e.user_id::text, e.anon_id))::integer
      from public.vitae_events e
     where e.ref is not null and e.created_at >= now() - interval '90 days'
     group by lower(e.ref)
     order by 2 desc
     limit 100;
end;
$$;

revoke execute on function public.vitae_refs() from public, anon;
grant execute on function public.vitae_refs() to authenticated;

-- =============================================================================
-- 5. Listes d'attente (table partagée avec Hive)
-- =============================================================================
-- La migration Hive en attente crée la même table, limitée au produit 'hive'
-- (CHECK en ligne waitlist_product_check, politique « Anyone can join a
-- waitlist »). Ici : création si elle n'existe pas encore, sinon
-- élargissement. Les deux ordres d'application donnent le même résultat.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  -- Format local ivoirien à dix chiffres, comme Hive (lib/phone.ts) : Vitae
  -- normalise avant d'écrire (+225, espaces et tirets retirés).
  phone text not null,
  consent boolean not null check (consent),
  consent_at timestamptz not null default now(),
  -- Réponses facultatives propres à une liste (ex. concours visés).
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint waitlist_once unique (product, phone)
);

alter table public.waitlist add column if not exists consent_at timestamptz not null default now();
alter table public.waitlist add column if not exists details jsonb not null default '{}'::jsonb;

alter table public.waitlist drop constraint if exists waitlist_product_check;
alter table public.waitlist
  add constraint waitlist_product_check
  check (product in ('cv_cible', 'pass', 'concours', 'hive'));

alter table public.waitlist drop constraint if exists waitlist_phone_check;
alter table public.waitlist
  add constraint waitlist_phone_check check (phone ~ '^0[157][0-9]{8}$');

alter table public.waitlist drop constraint if exists waitlist_details_size;
alter table public.waitlist
  add constraint waitlist_details_size check (length(details::text) <= 1000);

comment on table public.waitlist is
  'Personnes à prévenir une seule fois quand un produit ouvre (Vitae : cv_cible, pass, concours ; Hive). Aucun autre usage.';

alter table public.waitlist enable row level security;

-- Insertion seule, consentement obligatoire (la case est décochée par défaut
-- dans l'interface). Remplace la version Hive seule si elle existe.
drop policy if exists "Anyone can join a waitlist" on public.waitlist;
create policy "Anyone can join a waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (consent and product in ('cv_cible', 'pass', 'concours', 'hive'));

drop policy if exists "Admins read waitlist" on public.waitlist;
create policy "Admins read waitlist"
  on public.waitlist for select
  to authenticated
  using (public.vitae_is_admin());

-- =============================================================================
-- 6. Sources d'offres
-- =============================================================================
-- « Une source sans vérification n'est pas collectée » : une source n'est
-- collectée que si `active` ET `terms_checked_at` sont renseignés. La règle est
-- appliquée par le déclencheur de vitae_job_offers (section 7), donc même par
-- une ancienne version du scraper encore déployée.

create table if not exists public.vitae_job_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  url text,
  -- Nom d'hôte des liens de candidature, pour reconnaître la source d'une
  -- offre importée (`www.novojob.com`).
  host text unique,
  method text not null check (method in ('scraping', 'api', 'flux', 'formulaire', 'manuel')),
  -- Date à laquelle les conditions d'utilisation et le robots.txt ont été
  -- lus et autorisent la reprise. NULL = non vérifiée = non collectée.
  terms_checked_at timestamptz,
  active boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.vitae_job_sources enable row level security;

-- Le nom de la source s'affiche sous chaque offre : lecture publique.
drop policy if exists "Job sources are public" on public.vitae_job_sources;
create policy "Job sources are public"
  on public.vitae_job_sources for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage job sources" on public.vitae_job_sources;
create policy "Admins manage job sources"
  on public.vitae_job_sources for all
  to authenticated
  using (public.vitae_is_admin())
  with check (public.vitae_is_admin());

insert into public.vitae_job_sources (name, url, host, method, terms_checked_at, active, notes) values
  ('LinkedIn', 'https://www.linkedin.com/jobs', 'www.linkedin.com', 'scraping', null, false,
   'Collecte arrêtée le 18/10/2026 : les conditions d''utilisation de LinkedIn interdisent la collecte automatisée (brief Vitae v2).'),
  ('Novojob', 'https://www.novojob.com/cote-d-ivoire/offres-d-emploi', 'www.novojob.com', 'scraping', null, false,
   'À vérifier avant toute collecte : conditions d''utilisation et robots.txt. Une fois vérifiées, renseigner terms_checked_at et passer active à true.'),
  ('Vitae — offres déposées', null, null, 'formulaire', now(), true,
   'Offres envoyées par les recruteurs, écoles et associations via /publier-une-offre, publiées après validation.')
on conflict (name) do nothing;

-- =============================================================================
-- 7. Offres : niveau, secteur, ville, source, statut
-- =============================================================================

-- 7.1 Normalisation de texte, sans l'extension unaccent (absente du projet).
-- Les majuscules accentuées sont traduites explicitement : selon la locale de
-- la base, lower('É') ne donne pas forcément 'é'.
create or replace function public.vitae_norm(p text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
    translate(
      lower(translate(coalesce(p, ''), 'ÀÁÂÄÇÈÉÊËÎÏÔÖÙÛÜŒ', 'aaaaceeeeiioouuuo')),
      'àáâãäåçèéêëìíîïñòóôõöùúûüýÿœæ’''',
      'aaaaaaceeeeiiiinooooouuuuyyoa  '
    ),
    '\s+', ' ', 'g'
  ));
$$;

-- 7.2 Niveau (brief « Offres », §1). Le titre d'abord, l'expérience demandée
-- ensuite. Un intitulé qui ne dit rien et une description muette donnent
-- « inconnu », que la vue par défaut montre aussi.
create or replace function public.vitae_offer_level(
  p_title text, p_type text, p_description text, p_requirements text
)
returns text
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
declare
  t text := public.vitae_norm(p_title);
  d text := public.vitae_norm(coalesce(p_requirements, '') || ' ' || coalesce(p_description, ''));
  years integer;
begin
  if p_type = 'stage'
     or t ~ '\m(stage|stages|stagiaire|stagiaires|intern|interns|internship|alternance|alternant|alternante|apprenti|apprentie)\M' then
    return 'stage';
  end if;
  if t ~ '\m(senior|sr|directeur|directrice|director|head|chief|vp|lead|principal|country manager|general manager)\M' then
    return 'senior';
  end if;
  if t ~ '\m(manager|confirme|confirmee|experimente|experimentee|expert|experte|responsable|superviseur|supervisor|chef de projet|chef de service|specialist|specialiste)\M' then
    return 'confirme';
  end if;
  if t ~ '\m(junior|jr|assistant|assistante|debutant|debutante|jeune diplome|jeune diplomee|jeunes diplomes|graduate|trainee|vie|jeunes talents|premier emploi)\M' then
    return 'debutant';
  end if;

  -- « 0 à 2 ans », « 1-2 ans », « moins de 2 ans » → débutant.
  if d ~ '\m[0-2] ?(a|-|–) ?[1-2] ans?\M' or d ~ 'moins de (1|2|un|deux) ans?' or d ~ 'sans experience' then
    return 'debutant';
  end if;
  years := substring(d from '\m([0-9]{1,2}) ?\+? ?ans? (d experience|minimum|d experiences)')::integer;
  if years is not null then
    return case when years >= 7 then 'senior' when years >= 3 then 'confirme' else 'debutant' end;
  end if;
  -- Libellés de Novojob : « Débutant / Junior », « Confirmé / Expérimenté ».
  if d ~ '\m(debutant|junior)\M' then return 'debutant'; end if;
  if d ~ '\m(confirme|experimente)\M' then return 'confirme'; end if;
  return 'inconnu';
end;
$$;

-- 7.3 Secteur (brief « Offres », §2). Mots-clés du titre, puis de l'entreprise.
-- L'ordre des tests tranche les intitulés à double lecture : « Coordinateur
-- recouvrement » relève de la finance avant de relever de l'administratif.
-- Les employeurs associatifs et internationaux passent en premier : pour un
-- étudiant de l'INJS, « chez UNICEF » dit plus que « chargé de suivi ».
--
-- Identifiants hérités en camelCase (lib/catalog.ts). `educationFormation`
-- garde son identifiant, son libellé devient « Éducation, sport et
-- animation » ; `associatifOng` est nouveau.
create or replace function public.vitae_offer_sector(p_title text, p_company text, p_fallback text)
returns text
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
declare
  t text := public.vitae_norm(p_title);
  c text := public.vitae_norm(p_company);
begin
  if c ~ '\m(ong|ngo|unicef|undp|pnud|unhcr|unfpa|unops|onu|nations unies|united nations|fao|giz|usaid|care|save the children|fhi 360|croix rouge|red cross|rainforest alliance|winrock|reliefweb|oxfam|plan international|world vision|msf|medecins sans frontieres|fondation|fondazione|foundation|association|caritas|developmentpeople|international civil aviation organization|icao|banque mondiale|world bank)\M'
     or t ~ '\m(ong|ngo|humanitaire|associatif|associative|benevole|benevolat|volontaire|plaidoyer)\M' then
    return 'associatifOng';
  end if;
  if t ~ '\m(sante|medecin|medical|medicale|infirmier|infirmiere|pharmacie|pharmacien|pharmacienne|laborantin|laborantine|sage femme|clinique|hopital|health|nutrition|nutritionniste|kinesitherapeute|dentiste|aide soignant|aide soignante)\M' then
    return 'sante';
  end if;
  if t ~ '\m(hotel|hotellerie|hotesse|restaurant|restauration|cuisine|cuisinier|cuisiniere|chef de rang|chef de cuisine|demonstrator chef|serveur|serveuse|barman|barmaid|commis|patissier|patissiere|boulanger|receptionniste|housekeeping|debiteur)\M' then
    return 'hotellerieRestauration';
  end if;
  if t ~ '\m(juridique|juriste|droit|legal|avocat|avocate|notaire|contentieux)\M' then
    return 'juridique';
  end if;
  if t ~ '\m(enseignant|enseignante|enseignement|professeur|prof|formateur|formatrice|formation|educateur|educatrice|education|pedagogique|pedagogie|instituteur|institutrice|animateur|animatrice|animation|sport|sports|sportif|sportive|coach|moniteur|monitrice|surveillant|surveillante|entraineur|tuteur|tutrice|encadreur|repetiteur|teacher|tutor|trainer|training)\M' then
    return 'educationFormation';
  end if;
  if t ~ '\m(informatique|informaticien|informaticienne|developpeur|developpeuse|developer|devops|software|logiciel|data|donnees|reseau|reseaux|network|systeme|systemes|system|systems|cyber|cybersecurite|cloud|oracle|sap|scada|it|ui|ux|web|product analyst|product engineer|product manager|numerisation|geomatique|sig|telecom|telecoms|telecommunications|infrastructure|applications|application)\M' then
    return 'informatiqueTech';
  end if;
  if t ~ '\m(finance|finances|financier|financiere|financial|comptabilite|comptable|accountant|accounting|accounts payable|audit|auditeur|auditrice|tresorerie|treasury|tax|fiscal|fiscale|fiscalite|credit|recouvrement|payroll|paie|banque|bancaire|bank|banking|caissier|caissiere|controleur|controle de gestion|risque|risques|conformite|assurance|assurances|actuaire|asset manager)\M' then
    return 'financeComptabilite';
  end if;
  if t ~ '\m(marketing|communication|brand|brands|ads|content|copywriting|copywriter|redacteur|redactrice|writer|graphiste|graphic|designer|design|video|videos|videaste|cadreur|monteur|influence|evenementiel|community manager|social media|affiliate|journaliste|journalist|photographe|relations publiques|media|medias)\M' then
    return 'marketingCommunication';
  end if;
  if t ~ '\m(rh|hr|human resource|human resources|ressources humaines|people|recrutement|recruteur|recruteuse|recruitment|talent|talents|assistant|assistante|assistanat|secretaire|administratif|administrative|administration|office manager|accueil|gestion de projet|project manager|project management|project officer|project coordinator|chef de projet|charge de projet|chargee de projet|coordinateur|coordinatrice|coordinator|country manager|general manager|directeur general|directrice generale|facilities|agent enregistrement|agent assignation|centre de controle|gouvernance|traducteur|traductrice|interprete|strategie)\M' then
    return 'administratifRh';
  end if;
  if t ~ '\m(commercial|commerciale|commerciaux|vente|ventes|vendeur|vendeuse|sales|business development|business developer|account executive|key account|account manager|account specialist|territory manager|expansion|partenariat|partenariats|partnership|partnerships|relation client|conseiller client|conseillere client|service client|customer|call center|teleconseiller|teleconseillere|export|marketplace|gestionnaire de compte|retail|merchandiser|category manager|b2b|regional account)\M' then
    return 'commercialVente';
  end if;
  if t ~ '\m(logistique|logistics|logisticien|transport|transports|supply|chauffeur|driver|livreur|livreuse|coursier|magasinier|entrepot|warehouse|achat|achats|acheteur|acheteuse|procurement|passation des marches|import|commandes|fleet|freight|shipping|douane|transit|transitaire|operations|operation)\M' then
    return 'logistiqueTransport';
  end if;
  if t ~ '\m(ingenieur|ingenieure|ingenierie|engineer|engineering|engenheiro|engenheira|btp|genie civil|construction|chantier|travaux|methodes|structure|geologue|geologist|geologie|mine|mines|minier|miniere|mining|hydraulique|assainissement|electricite|electricien|electrique|electrical|mecanique|mecanicien|mechanic|maintenance|fiabilite|hse|qualite|quality|instrumentation|petrochimique|petrole|dessinateur|autocad|technicien|technicienne|industrie|industriel|production|preparateur|field service|immobilier|topographe|soudeur|plombier|architecte)\M' then
    return 'ingenierieBtp';
  end if;
  -- Rien dans le titre : l'employeur, quand il est sans ambiguïté.
  if c ~ '\m(ecole|school|college|lycee|universite|university|institut|enko|gedu)\M' then
    return 'educationFormation';
  end if;
  if c ~ '\m(sofitel|novotel|ibis|radisson|pullman|azalai|hilton|marriott)\M' then
    return 'hotellerieRestauration';
  end if;
  if c ~ '\m(banque|bank|ecobank|societe generale|nsia|bicici|coris|assurances?|assureurs?)\M' then
    return 'financeComptabilite';
  end if;
  return coalesce(nullif(p_fallback, ''), 'autre');
end;
$$;

-- 7.4 Ville (brief « Offres », §3) : liste fixe. Les quartiers connus vont
-- dans leur commune (Riviera → Cocody, Vridi → Port-Bouët), les zones
-- d'activité dans leur ville (VITIB → Grand-Bassam). Abidjan sans commune
-- reste « Abidjan ». Le reste : « Côte d'Ivoire, lieu non précisé ».
create or replace function public.vitae_offer_city(p_location text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  with v as (select public.vitae_norm(p_location) as l)
  select case
    when l = '' then 'Côte d''Ivoire, lieu non précisé'
    when l ~ '\mabobo\M' then 'Abobo'
    when l ~ '\madjame\M' then 'Adjamé'
    when l ~ '\mattecoube\M' then 'Attécoubé'
    when l ~ '\m(cocody|riviera|angre|deux plateaux|2 plateaux|ii plateaux)\M' then 'Cocody'
    when l ~ '\mkoumassi\M' then 'Koumassi'
    when l ~ '\m(marcory|zone 4|bietry)\M' then 'Marcory'
    when l ~ '\mplateau\M' then 'Plateau'
    when l ~ '\m(port bouet|port-bouet|vridi|gonzagueville)\M' then 'Port-Bouët'
    when l ~ '\mtreichville\M' then 'Treichville'
    when l ~ '\myopougon\M' then 'Yopougon'
    when l ~ '\manyama\M' then 'Anyama'
    when l ~ '\mbingerville\M' then 'Bingerville'
    when l ~ '\msongon\M' then 'Songon'
    when l ~ '\mbouake\M' then 'Bouaké'
    when l ~ '\mdaloa\M' then 'Daloa'
    when l ~ '\mkorhogo\M' then 'Korhogo'
    when l ~ '\msan[ -]pedro\M' then 'San-Pédro'
    when l ~ '\myamoussoukro\M' then 'Yamoussoukro'
    when l ~ '\m(grand[ -]bassam|vitib)\M' then 'Grand-Bassam'
    when l ~ '\mgagnoa\M' then 'Gagnoa'
    when l ~ '\mabengourou\M' then 'Abengourou'
    when l ~ '\mdivo\M' then 'Divo'
    when l ~ '\msoubre\M' then 'Soubré'
    when l ~ '\mman\M' then 'Man'
    when l ~ '\modienne\M' then 'Odienné'
    when l ~ '\mbondoukou\M' then 'Bondoukou'
    when l ~ '\mseguela\M' then 'Séguéla'
    when l ~ '\mferkessedougou\M' then 'Ferkessédougou'
    when l ~ '\maboisso\M' then 'Aboisso'
    when l ~ '\mdabou\M' then 'Dabou'
    when l ~ '\magboville\M' then 'Agboville'
    when l ~ '\mazaguie\M' then 'Azaguié'
    when l ~ '\mbouafle\M' then 'Bouaflé'
    when l ~ '\mtanda\M' then 'Tanda'
    when l ~ '\mabidjan\M' then 'Abidjan'
    else 'Côte d''Ivoire, lieu non précisé'
  end
  from v;
$$;

-- 7.5 Colonnes.
alter table public.vitae_job_offers add column if not exists level text not null default 'inconnu';
alter table public.vitae_job_offers add column if not exists city text;
alter table public.vitae_job_offers add column if not exists source_id uuid references public.vitae_job_sources(id) on delete set null;
alter table public.vitae_job_offers add column if not exists status text not null default 'published';

alter table public.vitae_job_offers drop constraint if exists vitae_job_offers_level_check;
alter table public.vitae_job_offers
  add constraint vitae_job_offers_level_check
  check (level in ('stage', 'debutant', 'confirme', 'senior', 'inconnu'));

alter table public.vitae_job_offers drop constraint if exists vitae_job_offers_status_check;
alter table public.vitae_job_offers
  add constraint vitae_job_offers_status_check
  check (status in ('published', 'pending', 'expired'));

alter table public.vitae_job_offers drop constraint if exists vitae_job_offers_category_check;
alter table public.vitae_job_offers
  add constraint vitae_job_offers_category_check check (category in (
    'financeComptabilite', 'marketingCommunication', 'informatiqueTech',
    'commercialVente', 'administratifRh', 'juridique', 'ingenierieBtp',
    'sante', 'educationFormation', 'associatifOng', 'logistiqueTransport',
    'hotellerieRestauration', 'autre'
  ));

-- La contrainte d'origine exigeait `^https?://` en tête, ce qui rendait sa
-- propre branche `mailto:` inatteignable. Le formulaire « Publier une offre »
-- accepte un e-mail de candidature : la branche est rendue atteignable.
alter table public.vitae_job_offers drop constraint if exists vitae_job_offers_apply_url_direct;
alter table public.vitae_job_offers
  add constraint vitae_job_offers_apply_url_direct check (
    apply_url ~ '^mailto:[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$'
    or (
      apply_url ~ '^https?://'
      and length(apply_url) > 20
      and (
        apply_url ~ '/jobs/view/.+[0-9]{6,}'
        or apply_url ~ '/offre-d-emploi/.+[0-9]+-'
        or (
          apply_url !~ '(jobivoire\.com|emploi\.ci)'
          and apply_url !~ '(linkedin\.com/jobs/search|novojob\.com/[a-z-]+/offres-d-emploi(/stages)?)'
          and split_part(split_part(apply_url, '://', 2), '/', 2) <> ''
        )
      )
    )
  );

create index if not exists idx_vitae_jobs_status_posted on public.vitae_job_offers (status, posted_at desc);
create index if not exists idx_vitae_jobs_level on public.vitae_job_offers (level);
create index if not exists idx_vitae_jobs_city on public.vitae_job_offers (city);

-- 7.6 Données existantes : classées une fois, avant la pose du déclencheur.
update public.vitae_job_offers o
   set level = public.vitae_offer_level(o.title, o.type, o.description, o.requirements),
       category = public.vitae_offer_sector(o.title, o.company, o.category),
       city = public.vitae_offer_city(o.location),
       source_id = coalesce(o.source_id, (
         select s.id from public.vitae_job_sources s
          where s.host = split_part(split_part(o.apply_url, '://', 2), '/', 1)
       ));

-- Les 241 offres LinkedIn déjà en base restent publiées jusqu'à leur
-- expiration naturelle (45 jours au plus, voir lib/jobs.ts) : elles portent
-- désormais « Source : LinkedIn » et aucune nouvelle n'entre. Pour les
-- retirer tout de suite, décision de Daniel :
--   update public.vitae_job_offers set status = 'expired'
--    where source_id = (select id from public.vitae_job_sources where name = 'LinkedIn');

-- 7.7 Déclencheur : classe chaque offre, refuse les sources non vérifiées et
-- les doublons. Il vaut pour le scraper (quelle que soit sa version
-- déployée), le formulaire public et l'administration.
create or replace function public.vitae_job_offers_prepare()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.vitae_job_sources%rowtype;
begin
  if tg_op = 'INSERT' then
    -- Le formulaire fournit son niveau et son secteur : on ne les devine pas.
    if new.level is null or new.level = 'inconnu' then
      new.level := public.vitae_offer_level(new.title, new.type, new.description, new.requirements);
    end if;
    if new.status <> 'pending' or new.category = 'autre' then
      new.category := public.vitae_offer_sector(new.title, new.company, new.category);
    end if;
  end if;

  if tg_op = 'INSERT' or new.location is distinct from old.location then
    new.city := public.vitae_offer_city(new.location);
  end if;

  if new.source_id is null then
    select s.id into new.source_id
      from public.vitae_job_sources s
     where s.host = split_part(split_part(new.apply_url, '://', 2), '/', 1);
  end if;

  if tg_op = 'INSERT' then
    -- Collecte : seule une source vérifiée et active entre. Une offre
    -- importée dont on ne reconnaît pas la source n'entre pas non plus.
    if new.status = 'published' then
      select * into v_source from public.vitae_job_sources where id = new.source_id;
      if not found or not v_source.active or v_source.terms_checked_at is null then
        return null;
      end if;
    end if;

    -- Doublon sur (titre, entreprise, ville) normalisés : ignoré sans erreur,
    -- pour que le scraper continue sur l'offre suivante.
    if exists (
      select 1 from public.vitae_job_offers o
       where o.status <> 'expired'
         and public.vitae_norm(o.title) = public.vitae_norm(new.title)
         and public.vitae_norm(o.company) = public.vitae_norm(new.company)
         and coalesce(o.city, '') = coalesce(new.city, '')
    ) then
      return null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists vitae_job_offers_prepare on public.vitae_job_offers;
create trigger vitae_job_offers_prepare
  before insert or update on public.vitae_job_offers
  for each row execute function public.vitae_job_offers_prepare();

-- 7.8 Lecture : seules les offres publiées sont publiques.
drop policy if exists "Anon can view job offers" on public.vitae_job_offers;
drop policy if exists "Authenticated can view job offers" on public.vitae_job_offers;
drop policy if exists "Published offers are public" on public.vitae_job_offers;
create policy "Published offers are public"
  on public.vitae_job_offers for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "Admins see all offers" on public.vitae_job_offers;
create policy "Admins see all offers"
  on public.vitae_job_offers for select
  to authenticated
  using (public.vitae_is_admin());

-- =============================================================================
-- 8. « Publier une offre gratuitement » (/publier-une-offre)
-- =============================================================================
-- Le contact de l'annonceur n'est jamais publié : il vit dans une table à
-- part, lisible par l'administration seule. Une seule fonction écrit les
-- deux lignes, valide les champs, et pose le statut `pending`.

create table if not exists public.vitae_offer_submissions (
  offer_id text primary key references public.vitae_job_offers(id) on delete cascade,
  contact text not null check (length(contact) between 3 and 200),
  created_at timestamptz not null default now()
);

alter table public.vitae_offer_submissions enable row level security;

drop policy if exists "Admins read submissions" on public.vitae_offer_submissions;
create policy "Admins read submissions"
  on public.vitae_offer_submissions for select
  to authenticated
  using (public.vitae_is_admin());

create or replace function public.vitae_submit_offer(
  p_company text,
  p_title text,
  p_type text,
  p_level text,
  p_city text,
  p_sector text,
  p_apply text,
  p_deadline date,
  p_contact text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text;
  v_source uuid;
begin
  if length(btrim(coalesce(p_company, ''))) not between 2 and 120
     or length(btrim(coalesce(p_title, ''))) not between 5 and 160
     or p_type not in ('emploi', 'stage')
     or p_level not in ('stage', 'debutant', 'confirme', 'senior', 'inconnu')
     or length(btrim(coalesce(p_city, ''))) not between 2 and 80
     or length(btrim(coalesce(p_contact, ''))) not between 3 and 200
     or (p_deadline is not null and p_deadline < current_date) then
    raise exception 'Offre incomplète' using errcode = '22023';
  end if;

  select id into v_source from public.vitae_job_sources where method = 'formulaire' limit 1;

  insert into public.vitae_job_offers (
    type, category, title, company, location, apply_url, deadline,
    level, status, source_id, posted_at
  ) values (
    p_type,
    coalesce(nullif(p_sector, ''), 'autre'),
    btrim(p_title),
    btrim(p_company),
    btrim(p_city),
    btrim(p_apply),
    p_deadline,
    p_level,
    'pending',
    v_source,
    now()
  )
  returning id into v_id;

  -- Doublon d'une offre déjà publiée ou en attente : rien n'est créé.
  if v_id is null then
    return null;
  end if;

  insert into public.vitae_offer_submissions (offer_id, contact) values (v_id, btrim(p_contact));
  return v_id;
end;
$$;

revoke execute on function public.vitae_submit_offer(text, text, text, text, text, text, text, date, text) from public;
grant execute on function public.vitae_submit_offer(text, text, text, text, text, text, text, date, text) to anon, authenticated;

-- Validation manuelle : publier (la date de publication devient celle du
-- jour) ou refuser.
create or replace function public.vitae_moderate_offer(p_offer_id text, p_publish boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.vitae_is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = '42501';
  end if;
  update public.vitae_job_offers
     set status = case when p_publish then 'published' else 'expired' end,
         posted_at = case when p_publish then now() else posted_at end
   where id = p_offer_id and status = 'pending';
end;
$$;

revoke execute on function public.vitae_moderate_offer(text, boolean) from public, anon;
grant execute on function public.vitae_moderate_offer(text, boolean) to authenticated;

-- =============================================================================
-- 9. « Supprimer mon compte et mes CV » (/compte), effectif immédiatement
-- =============================================================================
-- Le compte Supabase est partagé par toutes les apps de The Everyday Co. :
-- effacer l'utilisateur effacerait aussi ses habitudes Sowly ou ses annonces
-- Hive. Les données Vitae sont toujours effacées ; le compte lui-même ne
-- l'est que s'il ne sert à aucune autre app. La fonction dit lequel des deux
-- cas s'est produit, pour que l'écran l'annonce honnêtement.
--
-- Les événements de mesure perdent leur lien au compte (on delete set null)
-- et restent anonymes. Les paiements (lot B) sont conservés pour la
-- comptabilité, détachés du compte.
create or replace function public.vitae_delete_my_account()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_used boolean := false;
  r record;
begin
  if v_uid is null then
    raise exception 'Non connecté' using errcode = '42501';
  end if;

  delete from public.vitae_resumes where user_id = v_uid;
  update public.vitae_events set user_id = null where user_id = v_uid;
  -- Tables du lot B, si elles existent déjà.
  if to_regclass('public.vitae_cover_letters') is not null then
    execute 'delete from public.vitae_cover_letters where user_id = $1' using v_uid;
  end if;
  if to_regclass('public.vitae_entitlements') is not null then
    execute 'delete from public.vitae_entitlements where user_id = $1' using v_uid;
  end if;
  if to_regclass('public.vitae_payments') is not null then
    execute 'update public.vitae_payments set user_id = null where user_id = $1' using v_uid;
  end if;

  -- Le compte sert-il ailleurs ? Toute table hors Vitae qui pointe vers
  -- auth.users ou public.profiles (créée pour chaque compte, donc ignorée).
  for r in
    select c.conrelid::regclass as tbl, a.attname as col
      from pg_catalog.pg_constraint c
      join pg_catalog.pg_attribute a
        on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      join pg_catalog.pg_class k on k.oid = c.conrelid
      join pg_catalog.pg_namespace n on n.oid = k.relnamespace
     where c.contype = 'f'
       and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
       and n.nspname = 'public'
       and k.relname not like 'vitae\_%'
       and k.relname not in ('profiles', 'waitlist')
  loop
    execute format('select exists (select 1 from %s where %I = $1)', r.tbl, r.col)
      into v_used using v_uid;
    exit when v_used;
  end loop;

  if v_used then
    return 'donnees';
  end if;

  delete from auth.users where id = v_uid;
  return 'compte';
end;
$$;

revoke execute on function public.vitae_delete_my_account() from public, anon;
grant execute on function public.vitae_delete_my_account() to authenticated;

commit;
