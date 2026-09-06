# The Everyday Co — Web

Monorepo npm workspaces hébergeant **Vitae** (PWA de création de CV compatibles ATS,
avec offres d'emploi et articles conseils, ciblant la Côte d'Ivoire) et le **site
vitrine** The Everyday Co qui y renvoie. Produit et interface entièrement en français ;
les commentaires et messages d'erreur du code le sont aussi.

Deux contraintes gouvernent la plupart des décisions techniques et sont citées
explicitement dans le code : **réseau lent / mobile d'entrée de gamme** (aucune
police téléchargée, peu de JS client, pages revalidées plutôt que dynamiques) et
**lisibilité ATS** (le PDF contient du texte réel, jamais une image).

## Stack

- **Next.js 15** (App Router, React 19, composants serveur par défaut) — TypeScript strict
- **Tailwind CSS v4** via `@tailwindcss/postcss`, palette déclarée en `@theme` — [apps/vitae/app/globals.css:10](apps/vitae/app/globals.css#L10)
- **Supabase** (Postgres + Auth + RLS) via `@supabase/ssr` — session en cookies httpOnly
- **@react-pdf/renderer** pour l'export PDF, polices Roboto embarquées
- **node:test** + `--experimental-strip-types` pour les tests (aucun runner tiers)
- Déploiement **Vercel**, une app par projet ; migrations SQL dans [../supabase/migrations/](../supabase/migrations/)

## Structure

| Chemin | Rôle |
| --- | --- |
| [apps/vitae/](apps/vitae/) | PWA Vitae : éditeur, score, export, offres, conseils, auth |
| [apps/vitae/lib/](apps/vitae/lib/) | Accès données et config — clients Supabase, brouillon local, requêtes offres/articles |
| [apps/vitae/components/](apps/vitae/components/) | UI ; `editor/` est la seule zone majoritairement cliente |
| [apps/everyday-co/](apps/everyday-co/) | Site vitrine statique, sans base ni session |
| [packages/cv-core/](packages/cv-core/) | Modèle `Resume`, descripteurs de templates, scoring déterministe. Aucune dépendance runtime |
| [packages/cv-pdf/](packages/cv-pdf/) | Rendu PDF + harnais de validation ATS |
| [../supabase/](../supabase/) | Migrations et Edge Function `scrape-job-offers` (hors de ce workspace) |

Les packages sont consommés en **TypeScript brut** : pas d'étape de build,
Next les transpile — [apps/vitae/next.config.ts:6](apps/vitae/next.config.ts#L6).

## Commandes

Depuis `web/` (Node >= 20) :

```bash
npm install                       # installe tout le workspace
npm test                          # tests de tous les packages (cv-core aujourd'hui)
npm run typecheck                 # tsc --noEmit sur chaque app et package
npm run ats:check                 # rend les 4 templates en PDF, réextrait le texte, valide
npm run dev --workspace apps/vitae        # Vitae sur :3000
npm run dev --workspace apps/everyday-co  # vitrine (utiliser -p 3001 si Vitae tourne)
npm run build --workspace apps/vitae
```

`npm run ats:check` est le garde-fou de la promesse produit : **le relancer après
toute modification de template, de police ou de mise en page** —
[packages/cv-pdf/scripts/ats-check.ts:1](packages/cv-pdf/scripts/ats-check.ts#L1).

Il n'y a **aucun linter configuré** dans le dépôt ; `typecheck` et `test` sont les
seules portes automatiques.

## Environnement

Copier `.env.example` en `.env.local` dans chaque app.

- Vitae : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (requises,
  échec explicite si absentes — [apps/vitae/lib/supabase/server.ts:49](apps/vitae/lib/supabase/server.ts#L49)) ;
  `NEXT_PUBLIC_APP_URL` et `NEXT_PUBLIC_SITE_URL` facultatives.
- Vitrine : `NEXT_PUBLIC_VITAE_URL` **obligatoire en production**, le build échoue
  sans elle — [apps/everyday-co/lib/config.ts:26](apps/everyday-co/lib/config.ts#L26).

## Repères

- Le seul écran exigeant un compte est le téléchargement PDF — [apps/vitae/app/api/export/route.ts:20](apps/vitae/app/api/export/route.ts#L20).
- Le score est calculé côté serveur avant écriture en base, jamais accepté du client — [apps/vitae/lib/resumes.ts:60](apps/vitae/lib/resumes.ts#L60).
- Le service worker est écrit à la main, portée volontairement limitée à l'éditeur — [apps/vitae/public/sw.js:1](apps/vitae/public/sw.js#L1).
- Les identifiants de catégories sont en camelCase, hérités de l'app Flutter et verrouillés par des CHECK en base — [apps/vitae/lib/catalog.ts:10](apps/vitae/lib/catalog.ts#L10).
- Le code renvoie au brief par des références « brief §N » : voir [../masa-labs-mvp-specs.md](../masa-labs-mvp-specs.md).

## Adding New Features or Fixing Bugs

**IMPORTANT**: When you work on a new feature or bug, create a git branch first. Then work on changes in that branch for the remainder of the session. 

## Documentation complémentaire

À lire quand le sujet est concerné :

- [.claude/docs/architectural_patterns.md](.claude/docs/architectural_patterns.md) — patterns transverses : frontières client/serveur, les trois clients Supabase, état dérivé, stockage local prioritaire, dégradation silencieuse, configuration par variables. **À lire avant toute modification structurante.**
- [.claude/docs/pdf_ats_pipeline.md](.claude/docs/pdf_ats_pipeline.md) — chaîne templates → aperçu HTML → PDF → vérification ATS. À lire avant de toucher à un template, une police, une mise en page ou l'export.
- [../supabase/migrations/README.md](../supabase/migrations/README.md) — schéma, RLS et scraper d'offres.
- [../masa-labs-mvp-specs.md](../masa-labs-mvp-specs.md) — brief produit référencé par le code (« brief §N »).
