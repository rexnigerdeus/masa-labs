# Migrations Supabase

## Nommage : `AAAAMMJJHHMMSS_description.sql`

**Quatorze chiffres, pas huit.** Le CLI extrait la version d'une migration en
lisant les chiffres qui précèdent le premier `_`, et cette version est la **clé
primaire** de `supabase_migrations.schema_migrations`.

Deux fichiers datés du même jour en `AAAAMMJJ` produisent donc la même version
et entrent en collision. C'est ce qui est arrivé ici : `20260830_apply_url_
constraint.sql` et `20260830_update_vitae_articles_content.sql` partageaient la
version `20260830`, tout comme les deux migrations du 4 septembre. Résultat,
`supabase db push` échouait sans rien enregistrer, et le registre distant est
resté vide alors que le schéma, lui, était bien à jour — appliqué à la main.

Le plus simple est de laisser le CLI générer le nom :

```bash
npx supabase migration new description_courte
```

## Appliquer les migrations en attente

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...   # supabase.com/dashboard/account/tokens
npx supabase db push --dry-run --linked   # ce qui serait appliqué
npx supabase db push --linked             # pour de vrai
```

`--dry-run` d'abord, systématiquement : le projet distant est la production.

## Si le registre et la base divergent

Quand une migration a été appliquée autrement que par `db push` (éditeur SQL du
dashboard, API de gestion), le registre l'ignore et un push suivant tenterait de
la rejouer — au mieux sans effet grâce aux `if not exists`, au pire en
dupliquant un job `pg_cron`. On aligne le registre sans rien exécuter :

```bash
npx supabase migration repair --status applied <version> --linked
npx supabase migration list --linked   # local et remote doivent concorder
```

## Écrire une migration rejouable

Toutes les migrations d'ici sont idempotentes : `create table if not exists`,
`drop policy if exists` avant `create policy`, `drop trigger if exists` avant
`create trigger`. À conserver — c'est ce qui a rendu la réparation sûre.

Attention en revanche à `cron.schedule` : l'appeler deux fois crée deux jobs.
Voir `20260827060000_scrape_job_offers_scheduler.sql`, qui déprogramme avant de
programmer.

## Fonctions : droits d'exécution

Depuis `20261002150000_durcissement_securite.sql`, une fonction créée dans
`public` **n'est plus exécutable par `anon`** sans un `grant` explicite
(`alter default privileges … revoke execute on functions from public, anon`).
`authenticated` garde le droit que Supabase lui accorde par défaut.

Pour toute nouvelle fonction `security definer` :

- contrôler l'appelant avec `is distinct from auth.uid()`, jamais `!=` — avec
  un appelant anonyme, `!=` donne NULL et le contrôle ne se déclenche pas
  (c'est le trou qu'avaient `vitae_get_full_cv` et `vitae_duplicate_cv`) ;
- `revoke execute … from public, anon` puis `grant execute … to authenticated`
  si une app l'appelle ; rien du tout si c'est une fonction de trigger ;
- `set search_path` fixé.

## `profiles.phone` n'est pas lisible depuis les apps

Le numéro de téléphone est l'identifiant des comptes (pseudo-email) : le
laisser lisible permettait à n'importe quel compte de moissonner ceux des
autres. On le lit par des fonctions qui vérifient le droit de le voir
(`rondo_telephones`, `hive_telephones_commandes`), et son propre numéro se
relit dans le pseudo-email. La fermeture de la colonne elle-même attend la
mise en ligne des apps : voir [../en-attente/README.md](../en-attente/README.md).

## Vitae, brief v2 (18/10/2026)

Deux migrations, à appliquer dans l'ordre, **après relecture par Daniel** :

1. `20261018120000_vitae_lot_a.sql` — mesure (`vitae_events` complétée,
   `vitae_ambassadors`, `vitae_funnel`), listes d'attente (`waitlist`,
   partagée avec Hive), sources et tri des offres (`vitae_job_sources`,
   niveau/secteur/ville/statut, déclencheur `vitae_job_offers_prepare`),
   dépôt d'offres, suppression de compte, rôle admin (`vitae_admins`).
2. `20261018120100_vitae_lot_b.sql` — CV principal et versions, droits,
   paiements Wave, lettres de motivation.

La migration Hive `en-attente/20261018100000_hive_pause.sql` crée aussi
`waitlist` : les deux sont compatibles dans les deux ordres. Si elle passe
après celles-ci, `db push` demandera `--include-all` (version antérieure).

Après la migration du lot A, se donner le rôle admin :

```sql
insert into public.vitae_admins (user_id)
select id from auth.users where email = '<adresse ou 0700000000@everyday.co>';
```

Puis, seulement après : déployer la nouvelle Edge Function
`scrape-job-offers` (LinkedIn retiré, sources lues dans `vitae_job_sources`).
Novojob n'est collecté qu'une fois `terms_checked_at` renseigné et `active`
à `true` pour sa ligne.
