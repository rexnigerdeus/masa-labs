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
