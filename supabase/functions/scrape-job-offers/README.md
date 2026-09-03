# Vitae — Système de scraping automatique d'offres d'emploi

## Vue d'ensemble

L'app Vitae récupère automatiquement des offres d'emploi et de stage **réelles et actuelles** en Côte d'Ivoire depuis des sources vérifiées, avec le **lien de candidature exact de chaque offre**, et se met à jour **toutes les 24h** sans intervention manuelle.

## Garantie anti-fake

Chaque offre insérée respecte **3 règles strictes** (fonction `enforceRealOffer`) :

1. **`apply_url` = lien DIRECT vers la page de CETTE offre** (identifiant unique extrait du HTML de la source). Jamais de page de listing générique, jamais de fallback.
2. **Titre crédible** : minimum 5 caractères.
3. **Entreprise renseignée** : pas de placeholder ("Confidential", "-").

Une offre qui échoue à une seule règle est **rejetée** (jamais insérée). Le compte des rejets est visible dans la réponse de l'Edge Function (`rejectedFake`).

Côté base, la contrainte SQL `vitae_job_offers_apply_url_direct` (migration `20260830_apply_url_constraint.sql`) bloque physiquement toute insertion d'URL générique.

```
┌─────────────┐    06:00 UTC     ┌──────────────────┐     insert      ┌─────────────────┐
│   pg_cron   │ ──────────────→ │  Edge Function   │ ─────────────→ │ vitae_job_offers│
│  (PostgreSQL)│                 │  scrape-job-     │                 │  (Supabase)     │
└─────────────┘                 │  offers (Deno)   │                 └─────┬───────────┘
                                └──────┬───────────┘                          │
                                       │ fetch HTML                           │ select
                                       ▼                                      │
                                ┌──────────────┐                       ┌─────▼─────┐
                                │ LinkedIn API │                       │  Vitae    │
                                │  Novojob CI  │                       │  App      │
                                └──────────────┘                       │ (Flutter) │
                                                                       └───────────┘
```

## Architecture

### Composants

| Composant | Rôle | Fichier |
|-----------|------|---------|
| **pg_cron** | Planificateur — déclenche le scrape à 06:00 UTC (07:00 Abidjan) | `supabase/migrations/20260827_scrape_job_offers_scheduler.sql` |
| **pg_net** | HTTP client PostgreSQL — appelle l'Edge Function depuis pg_cron | (extension Supabase) |
| **Edge Function** | Scrape les sources, parse le HTML, filtre les fakes, déduplique, insère | `supabase/functions/scrape-job-offers/index.ts` |
| **Table** | Stocke les offres avec lien de candidature direct | `vitae_job_offers` (`supabase-schema.sql`) |
| **Contrainte CHECK** | Bloque les apply_url génériques côté base | `supabase/migrations/20260830_apply_url_constraint.sql` |
| **App Flutter** | Lit la table et affiche les offres | `vitae/lib/features/jobs/` |

### Sources scrapées (vérifiées 2026-08-30)

Chaque source = **quelques requêtes HTTP**. Si une source échoue (403, timeout, changement de structure), le scraper continue avec les autres — échec isolé, **et cette source insère 0 offre** (jamais de fake de remplacement).

| # | Source | URL | Volume/run | Fiabilité |
|---|--------|-----|-----------|-----------|
| 1 | **LinkedIn Guest API** (emplois) | `linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?location=Cote+d'Ivoire&f_TPR=r2592000&start=0,25,50,75,100` | ~50 offres | ⭐⭐⭐ API publique stable, 10 offres/page |
| 2 | **LinkedIn Guest API** (stages) | idem + `keywords=stage` | ~50 offres | ⭐⭐⭐ |
| 3 | **Novojob CI** (emplois) | `novojob.com/cote-d-ivoire/offres-d-emploi` + page 2 (`?start=50`) | ~90 offres | ⭐⭐⭐ 50 cartes/page, liens directs |
| 4 | **Novojob CI** (stages) | `novojob.com/cote-d-ivoire/offres-d-emploi/stages` | ~2 offres | ⭐⭐ volume faible mais réel |

**Total: ~190 offres brutes/run**, filtrées par `enforceRealOffer`, dédupliquées par (titre, entreprise).

### Sources ABANDONNÉES (vérifié 2026-08-30 — ne pas réactiver)

| Source | Raison |
|--------|--------|
| `jobivoire.com` | SPA React : le HTML servi ne contient aucune offre. Les "offres" sont des **données de démo statiques** dans `js/data.js` (Orange, MTN, Bolloré...) **sans lien de candidature réel** |
| `emploi.ci` | HTTP 403 systématique (Cloudflare) |
| `google.com/about/careers` | Page corporate Google, aucune offre CI |

### Détail des liens de candidature

- **LinkedIn** : `apply_url = https://www.linkedin.com/jobs/view/<slug>-<jobId>` — la page publique de l'offre, avec bouton Postuler. Les tracking params sont retirés. Pour les 12 premières nouvelles offres du run, la page détail est fetchée pour extraire le JSON-LD `JobPosting` (description, `validThrough` → deadline, type de contrat, ville).
- **Novojob** : `apply_url = https://www.novojob.com/cote-d-ivoire/offres-d-emploi/offre-d-emploi/<region>/<ville?>/<id>-<slug>` — la page de l'offre avec le formulaire de candidature Novojob.

### Déduplication

- Clé : `titre + entreprise` (insensible à la casse, via `ilike`)
- Si l'offre existe déjà → mise à jour de `apply_url` et `posted_at` si changées
- Pas de doublon créé

### Nettoyage automatique

À chaque exécution, le scraper supprime :
- Les offres dont la deadline est dépassée de **+7 jours**
- Les offres sans deadline mais datant de **+30 jours** (les offres CI tournent vite)

---

## Déploiement — Étapes

### 1. Déployer l'Edge Function

```bash
# Installer la CLI Supabase si nécessaire
# npm install -g supabase

# Se placer à la racine du projet
cd /Users/MacBook/davinci-code/masa-labs

# Login Supabase
supabase login

# Lier le projet (une seule fois)
supabase link --project-ref fhaulxauhaoofimkyrqb

# Déployer la fonction
supabase functions deploy scrape-job-offers
```

> ⚠️ **Pas de secret requis.** L'Edge Function est déployée avec
> `verify_jwt = false` (config.toml) et n'exige plus de `SCRAPER_SECRET`.
> Le stockage du secret côté PostgreSQL (`app.scraper_secret`) exigeait des
> droits superuser non disponibles → le secret a été retiré pour simplifier.

### 2. Exécuter la migration SQL

Aller dans **Supabase Dashboard → SQL Editor** et coller/exécuter le contenu de :
```
supabase/migrations/20260827_scrape_job_offers_scheduler.sql
```

Cela va :
- Activer `pg_net`
- Créer la fonction `vitae_scrape_jobs()`
- Programmer le cron job `vitae-scrape-jobs-daily` (06:00 UTC / 07:00 Abidjan) dans le schéma `cron`
- Créer la table `vitae_scrape_logs`

> ⚠️ **pg_cron s'installe dans son schéma `cron`** — utiliser
> `create extension pg_cron;` (SANS `with schema extensions`), puis
> `cron.schedule(...)`, `cron.unschedule(...)`, `cron.job`.
> Ne PAS utiliser `extensions.cron.*` (référence cross-database).
>
> ⚠️ **pg_net s'installe dans son schéma `net`** — la fonction HTTP est
> `net.http_post(...)`, PAS `extensions.http_post(...)`.

### 3. Tester manuellement

```sql
-- Déclencher un scrape immédiat
select public.vitae_scrape_jobs();
```

Ou via HTTP (pas d'authentification requise) :
```bash
curl -X POST \
  https://fhaulxauhaoofimkyrqb.supabase.co/functions/v1/scrape-job-offers \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 4. Vérifier le résultat

```sql
-- Nombre d'offres dans la table
select type, count(*) from public.vitae_job_offers group by type;

-- Voir les dernières offres
select title, company, type, category, posted_at
from public.vitae_job_offers
order by posted_at desc
limit 20;

-- Vérifier l'historique du cron
select jobname, schedule, active
from cron.job
where jobname = 'vitae-scrape-jobs-daily';

-- Voir les détails d'exécution
select start_time, end_time, status, return_message
from cron.job_run_details
where jobid in (
  select jobid from cron.job
  where jobname = 'vitae-scrape-jobs-daily'
)
order by start_time desc
limit 10;
```

---

## Maintenance

### Changer la fréquence

Dans le SQL Editor :
```sql
-- Désactiver l'ancien
select cron.unschedule('vitae-scrape-jobs-daily');

-- Reprogrammer (ex: toutes les 12h)
select cron.schedule(
  'vitae-scrape-jobs-daily',
  '0 */12 * * *',
  'select public.vitae_scrape_jobs();'
);
```

### Ajouter une nouvelle source

1. Ajouter un bloc variant dans le `Deno.serve` de `index.ts` (ou une entrée dans le tableau de variants), avec son `name` et son `url`
2. Créer la fonction parser `parseNouvelleSource(html)` qui retourne `RawJobOffer[]` — chaque offre DOIT avoir un `applyUrl` direct (lien de la page de l'offre avec identifiant unique)
3. Ajouter les mots-clés de secteur dans `CATEGORY_MAP` si nécessaire
4. ⚠️ Vérifier que `isDirectOfferUrl()` accepte bien les liens de cette source, sinon l'offre sera rejetée par `enforceRealOffer`
5. Redéployer : `supabase functions deploy scrape-job-offers`

### Désactiver temporairement

```sql
select extensions.cron.unschedule('vitae-scrape-jobs-daily');
```

### Réactiver

```sql
select extensions.cron.schedule(
  'vitae-scrape-jobs-daily',
  '0 6 * * *',
  'select public.vitae_scrape_jobs();'
);
```

---

## Comportement côté app Flutter

1. `JobService.getJobs()` interroge `vitae_job_offers` sur Supabase
2. Si la table contient des offres scrapées → elles s'affichent (triées par `posted_at` descendant), chaque offre avec son lien de candidature direct
3. Si la table est vide ou Supabase inaccessible → le **fallback local** prend le relais : 3 redirections réelles vers LinkedIn/Novojob (recherche d'emplois + stages) — **pas d'offres inventées**
4. Sur l'écran détail, le bouton "Postuler" affiche la plateforme source ("Candidature via LinkedIn/Novojob") avant d'ouvrir le lien

### Ordre d'affichage

Les offres sont triées par `posted_at DESC` (plus récentes d'abord), ce qui signifie que les nouvelles offres scrapées apparaissent en haut de la liste automatiquement après chaque exécution du cron.

### Limites et considérations

- **Respect des sources** : ~12 requêtes HTTP par exécution (24h) au total sur 2 plateformes — très léger.
- **Parsing HTML** : si LinkedIn ou Novojob change sa structure HTML, le parser devra être ajusté. Le code est modulaire pour faciliter cela, et une source cassée n'insère rien plutôt que des données fausses.
- **LinkedIn Guest API** : API publique sans login ; si LinkedIn la restreint, les sources Novojob continuent de fonctionner.
- **Délai d'apparition** : une offre publiée à 10h apparaît dans l'app au plus tard le lendemain à 07h (prochaine exécution du cron). Pour un délai plus court, réduire la fréquence ou déclencher manuellement.