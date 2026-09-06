# Patterns architecturaux

Conventions observées dans plusieurs fichiers. Les suivre par défaut ; s'en écarter
demande une raison écrite en commentaire — c'est déjà la norme du dépôt.

## 1. Logique métier dans les packages, jamais dans les apps

`packages/cv-core` ne connaît ni React, ni Next, ni Supabase : modèle de données,
descripteurs de templates, formatage de dates, scoring. Il n'a aucune dépendance
runtime, ce qui le rend appelable partout — navigateur, composant serveur, route
API, script Node.

- Modèle unique `Resume`, plat et sérialisable — [types.ts:76](../../packages/cv-core/src/types.ts#L76)
- Scoring pur, synchrone, déterministe, sans réseau ni IA — [scoring/index.ts:92](../../packages/cv-core/src/scoring/index.ts#L92)
- Surface publique explicite via un baril — [cv-core/src/index.ts:1](../../packages/cv-core/src/index.ts#L1)

Conséquence : le même score s'affiche dans l'éditeur à chaque frappe et est recalculé
côté serveur avant écriture en base — [lib/resumes.ts:60](../../apps/vitae/lib/resumes.ts#L60).

## 2. Serveur par défaut, `'use client'` à la feuille

Les pages, l'aperçu du CV et les listes sont des composants serveur. Le `'use client'`
est poussé au plus bas : `components/editor/` et `AuthForm` uniquement. Les données
sont récupérées dans la page serveur puis passées en props à l'îlot client.

- Page serveur qui charge et délègue — [app/cv/page.tsx:10](../../apps/vitae/app/cv/page.tsx#L10)
- Aperçu rendu serveur, zéro JS expédié — [ResumePreview.tsx:11](../../apps/vitae/components/ResumePreview.tsx#L11)
- Mutations en `'use server'` en tête de module — [lib/resumes.ts:1](../../apps/vitae/lib/resumes.ts#L1)

Les filtres de liste passent par l'URL (`searchParams`) et des `<Link>`, pas par un
état React — [app/offres/page.tsx:36](../../apps/vitae/app/offres/page.tsx#L36).

## 3. Trois clients Supabase, un par contexte d'accès

Ne jamais en réutiliser un hors de son contexte : le choix a des conséquences de
cache et de sécurité.

| Client | Usage | Fichier |
| --- | --- | --- |
| `createClient()` / `currentUser()` | Serveur, session en cookies httpOnly | [supabase/server.ts:12](../../apps/vitae/lib/supabase/server.ts#L12) |
| `getSupabaseClient()` | Navigateur, singleton (clients concurrents = déconnexions) | [supabase/client.ts:14](../../apps/vitae/lib/supabase/client.ts#L14) |
| `publicClient()` | Données publiques (offres, articles), sans session | [supabase/public.ts:17](../../apps/vitae/lib/supabase/public.ts#L17) |

Le client public existe pour une raison précise : lire les cookies rend la route
dynamique et interdit le cache, et `cookies()` lève une erreur dans
`generateStaticParams`. Une donnée publique se lit avec un client public.

Règles associées :

- L'identité se vérifie avec `getUser()`, jamais `getSession()` — le cookie seul se forge ([supabase/server.ts:43](../../apps/vitae/lib/supabase/server.ts#L43)).
- Le middleware rafraîchit la session à chaque requête et exclut les assets — [middleware.ts:12](../../apps/vitae/middleware.ts#L12).
- Les redirections après auth n'acceptent qu'un chemin interne — [auth/callback/route.ts:27](../../apps/vitae/app/auth/callback/route.ts#L27).

## 4. Frontière base ↔ TypeScript explicite

Les tables sont en `snake_case`, le code en `camelCase`. Chaque module de données
sélectionne des colonnes nommées (jamais `select('*')`), déclare une interface de
domaine, et convertit ligne par ligne dans une fonction de mapping locale.

- Mapping isolé — [lib/articles.ts:26](../../apps/vitae/lib/articles.ts#L26)
- Interface + colonnes + mapping — [lib/jobs.ts:17](../../apps/vitae/lib/jobs.ts#L17)

Les libellés d'affichage des identifiants venus de la base vivent dans un seul
dictionnaire — [lib/catalog.ts:10](../../apps/vitae/lib/catalog.ts#L10).

## 5. État unique, tout le reste dérivé

L'éditeur ne maintient qu'un `Resume` en état. Score et aperçu sont recalculés par
`useMemo` à chaque rendu : rien à synchroniser, donc aucune dérive possible entre ce
que l'utilisateur voit et ce qu'il télécharge —
[ResumeEditor.tsx:21](../../apps/vitae/components/editor/ResumeEditor.tsx#L21).

Corollaire : ne jamais stocker un score, un aperçu ou un autre dérivé du CV dans un
state séparé.

## 6. Le stockage local d'abord, le serveur en confort

Le brouillon `localStorage` est la source de vérité pendant la saisie ; la ligne en
base sert à retrouver son CV depuis un autre appareil. Le brouillon local gagne
l'arbitrage dès qu'il contient quelque chose.

- API de brouillon tolérante aux pannes — [lib/draft.ts:18](../../apps/vitae/lib/draft.ts#L18)
- Arbitrage local/serveur au montage — [ResumeEditor.tsx:86](../../apps/vitae/components/editor/ResumeEditor.tsx#L86)
- Écriture différée de 800 ms, local d'abord et sans condition — [ResumeEditor.tsx:94](../../apps/vitae/components/editor/ResumeEditor.tsx#L94)
- Garde-fou de forme au chargement, pas une validation champ par champ — [lib/draft.ts:55](../../apps/vitae/lib/draft.ts#L55)

Un échec de sauvegarde en ligne ne bloque jamais la saisie : il devient un message
d'information, déjà en français, prêt à afficher (`SaveOutcome.error`).

## 7. Dégradation silencieuse sur tout ce qui n'est pas le parcours principal

Les `catch` vides sont intentionnels et systématiquement commentés avec leur raison.
Règle : un accessoire (KPI, cache, provider optionnel, stockage indisponible) ne doit
jamais casser un parcours.

- Journalisation d'événements silencieuse — [lib/resumes.ts:95](../../apps/vitae/lib/resumes.ts#L95)
- Requête offres en échec → résultat vide, pas d'exception — [lib/jobs.ts:78](../../apps/vitae/lib/jobs.ts#L78)
- Bouton Google affiché seulement si le provider est réellement activé — [supabase/providers.ts:13](../../apps/vitae/lib/supabase/providers.ts#L13)
- `cache.addAll` remplacé par `allSettled` pour tolérer une URL manquante — [public/sw.js:20](../../apps/vitae/public/sw.js#L20)

L'exception : ce dont dépend tout le reste échoue **bruyamment** au démarrage —
variables Supabase manquantes ([supabase/server.ts:49](../../apps/vitae/lib/supabase/server.ts#L49)),
`NEXT_PUBLIC_VITAE_URL` absente en production.

## 8. Aucune adresse en dur, `null` plutôt qu'un lien mort

Toutes les URL publiques passent par un module `lib/config.ts` qui lit
l'environnement, retombe sur `VERCEL_PROJECT_PRODUCTION_URL`, puis sur `localhost`.
Une adresse non confirmée reste `null` et l'UI affiche le texte sans lien — un lien
mort coûte plus qu'un lien absent.

- [vitae/lib/config.ts:16](../../apps/vitae/lib/config.ts#L16) · [everyday-co/lib/config.ts:26](../../apps/everyday-co/lib/config.ts#L26)

## 9. Le cache est une décision explicite

Aucune page publique n'est recalculée à chaque visite : le scraper tourne une fois
par jour, la fraîcheur se mesure en heures.

- `export const revalidate = 3600` sur les pages publiques — [app/offres/page.tsx:21](../../apps/vitae/app/offres/page.tsx#L21)
- `unstable_cache` pour les métadonnées coûteuses et identiques pour tous — [lib/jobs.ts:110](../../apps/vitae/lib/jobs.ts#L110)
- `next: { revalidate }` sur les `fetch` de configuration — [supabase/providers.ts:23](../../apps/vitae/lib/supabase/providers.ts#L23)

## 10. Style : tokens de thème, composants de champ partagés

La palette et les rayons sont déclarés une fois en `@theme` Tailwind v4 et utilisés
comme classes (`bg-accent`, `text-ink`, `border-line`). Aucune police téléchargée :
pile système, contrainte réseau — [app/globals.css:10](../../apps/vitae/app/globals.css#L10).

Les formulaires n'écrivent pas de `<input>` nus : ils composent `Field`, `TextInput`,
`TextArea`, `DateInput`, `TagInput`, `LineList`, `Button` —
[editor/fields.tsx:1](../../apps/vitae/components/editor/fields.tsx#L1).
Les illustrations sont des SVG inline dans `components/graphics.tsx` : aucune requête
d'image, aucune librairie d'icônes.

## 11. Le commentaire explique le *pourquoi*

Convention forte et uniforme : chaque module s'ouvre sur un bloc qui justifie une
décision et nomme l'alternative écartée (`localStorage` plutôt qu'IndexedDB, service
worker manuel plutôt que `next-pwa`, template-donnée plutôt que code de rendu). Les
commentaires renvoient au brief (« brief §N ») et aux migrations par leur nom de
fichier. Une modification qui invalide une de ces justifications doit mettre le
commentaire à jour, pas le laisser mentir.
