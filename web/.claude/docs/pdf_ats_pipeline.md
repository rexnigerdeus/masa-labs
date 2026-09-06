# Chaîne templates → aperçu → PDF → validation ATS

À lire avant de modifier un template, une police, une mise en page, l'aperçu ou
l'export. La promesse centrale du produit se joue ici.

## Le template est une donnée, pas du code de rendu

Il existe **deux renderers distincts** — l'aperçu HTML et le document
`@react-pdf/renderer` — et ils ne peuvent rester alignés que s'ils lisent la même
description. Un `TemplateSpec` décrit typographie, marges, espacements et ordre des
sections ; les quatre templates (`classique`, `sobre`, `compact`, `stage`) n'en sont
que des valeurs.

- Descripteurs et contraintes ATS communes — [templates.ts:1](../../packages/cv-core/src/templates.ts#L1)
- `TemplateTypography` — [templates.ts:17](../../packages/cv-core/src/templates.ts#L17)

**Règle absolue** : aucune taille, marge, ordre de section ou libellé d'en-tête écrit
en dur dans un renderer. Une valeur en dur dans l'aperçu est un bug — l'aperçu
mentirait alors sur le PDF téléchargé.

Contraintes ATS non négociables portées par tous les templates : une seule colonne,
pas de tableau, pas d'icône, pas d'encadré coloré, pas de photo, en-têtes de section
en toutes lettres.

## Les deux renderers

| | Fichier | Notes |
| --- | --- | --- |
| Aperçu HTML | [ResumePreview.tsx](../../apps/vitae/components/ResumePreview.tsx) | Composant serveur |
| Document PDF | [ResumeDocument.tsx](../../packages/cv-pdf/src/ResumeDocument.tsx) | `@react-pdf/renderer` |

L'aperçu convertit les points du descripteur en longueurs relatives à `--u`, l'unité
de page définie comme un 794e de la largeur du conteneur (794 px = A4 à 96 dpi) :
c'est une réduction fidèle à toute largeur, y compris une colonne de 320 px —
[ResumePreview.tsx:53](../../apps/vitae/components/ResumePreview.tsx#L53). Ne pas
revenir à des pixels absolus ni à `transform: scale()` ; le commentaire du fichier
explique pourquoi les deux ont échoué.

## L'export

Un seul chemin de rendu, partagé par la route d'export et le harnais de test —
c'est ce qui donne sa valeur au harnais : il vérifie le PDF réellement téléchargé.

- `renderResumePdf` — [render.tsx:13](../../packages/cv-pdf/src/render.tsx#L13)
- Route POST `/api/export` — [route.ts:20](../../apps/vitae/app/api/export/route.ts#L20)

Points à ne pas casser :

- `export const runtime = 'nodejs'` : react-pdf lit les `.ttf` sur le disque.
- `serverExternalPackages` et `outputFileTracingIncludes` embarquent les polices dans
  le déploiement Vercel — [next.config.ts:10](../../apps/vitae/next.config.ts#L10).
- Le nom de fichier voyage dans l'en-tête `x-filename` exposé via
  `access-control-expose-headers` : `content-disposition` n'est pas lisible en JS sur
  une réponse blob.
- C'est **le seul point du produit exigeant un compte** ; tout le reste (saisie,
  score, aperçu, offres, conseils) est ouvert.

## Le harnais ATS

```bash
npm run ats:check
```

Rend le CV de référence avec chaque template, réextrait le texte du PDF avec `unpdf`,
et vérifie que ce qu'un logiciel de tri lira correspond à ce qui a été saisi — texte
réel, complet, dans le bon ordre. Il ne juge pas l'esthétique : un template peut être
laid et passer.

- [scripts/ats-check.ts:1](../../packages/cv-pdf/scripts/ats-check.ts#L1) ; sorties dans `.ats-out/` (git-ignoré)
- CV de référence partagé — `SAMPLE_RESUME`, [samples.ts](../../packages/cv-core/src/samples.ts)

**Le relancer après toute modification de template, de police ou de mise en page.**

## Le scoring, à côté de la chaîne de rendu

Indépendant du rendu mais lié au même modèle : moyenne pondérée de contrôles
déterministes, `structure` dominant volontairement (0.35) parce qu'un CV mal
structuré est éliminé avant d'être jugé sur sa rédaction.

- Poids et agrégation — [scoring/index.ts:19](../../packages/cv-core/src/scoring/index.ts#L19)
- Contrôles unitaires — [scoring/checks.ts](../../packages/cv-core/src/scoring/checks.ts)
- Recommandations triées par gain réel sur le score — [scoring/index.ts:130](../../packages/cv-core/src/scoring/index.ts#L130)
- Tests de non-régression sur trois fixtures (vide / partiel / complet) —
  [test/scoring.test.ts](../../packages/cv-core/test/scoring.test.ts)

Toute modification des poids ou des seuils doit laisser passer `npm test` : les tests
verrouillent la progression vide < partiel < complet et le palier « excellent » à 80.
