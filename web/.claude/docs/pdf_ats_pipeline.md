# Chaîne templates → aperçu → PDF → validation ATS

À lire avant de modifier un template, une police, une mise en page, l'aperçu ou
l'export. La promesse centrale du produit se joue ici.

## Le template est une donnée, pas du code de rendu

Il existe **trois consommateurs du descripteur** — l'aperçu HTML, le document
`@react-pdf/renderer` et le croquis SVG des vignettes — et ils ne peuvent rester
alignés que s'ils lisent la même description. Un `TemplateSpec` décrit typographie,
marges, espacements, ordre des sections, habillage de l'en-tête, forme des titres,
place de la photo et couleur primaire par défaut ; les quatre templates
(`classique`, `sobre`, `compact`, `stage`) n'en sont que des valeurs.

- Descripteurs et contraintes ATS communes — [templates.ts:1](../../packages/cv-core/src/templates.ts#L1)
- `TemplateTypography` — [templates.ts:24](../../packages/cv-core/src/templates.ts#L24)
- Habillages : `HeaderLayout` (`band` / `tint` / `underline` / `minimal`) et
  `SectionStyle` (`rule` / `bar` / `chip` / `plain`) — [templates.ts:57](../../packages/cv-core/src/templates.ts#L57).
  Ajouter une valeur oblige à la traiter dans les **trois** renderers ; le `switch`
  exhaustif de chacun le signale au typage.

**Règle absolue** : aucune taille, marge, ordre de section ou libellé d'en-tête écrit
en dur dans un renderer. Une valeur en dur dans l'aperçu est un bug — l'aperçu
mentirait alors sur le PDF téléchargé.

Contraintes ATS non négociables portées par tous les templates : une seule colonne
sur toute la largeur utile, pas de tableau, pas d'icône, pas de texte en image,
en-têtes de section en toutes lettres, ordre de lecture identique à l'ordre visuel.

**La couleur et la photo n'en font pas partie.** Un aplat de couleur ne gêne pas
l'extraction du texte, et une photo est une image posée *à côté* du texte, jamais à
sa place : aucune information du CV n'existe seulement dans l'image. La photo est la
norme attendue des recruteurs ivoiriens — le produit la porte, avec un interrupteur
pour l'enlever (`personal.showPhoto`). Le harnais rejoue tous les templates avec une
photo pour le vérifier.

## Couleurs dérivées

L'utilisateur choisit une primaire (`resume.accentColor`) ; tout le reste se calcule
dans [colors.ts](../../packages/cv-core/src/colors.ts), jamais dans un renderer.

- `inkAccent` assombrit la primaire jusqu'à 4,5:1 sur blanc — un titre de section
  reste lisible même si la couleur choisie est un jaune clair.
- `accentSurface` rend le couple fond + texte du bandeau : il existe une bande de
  verts et de bleus moyens où ni le blanc ni l'encre n'atteignent 4,5:1, l'aplat y
  est assombri d'un cran plutôt que de livrer une ligne de coordonnées illisible.
- `tint` produit les fonds clairs (bloc teinté du modèle Stage, pastilles de titres).

Les seuils sont verrouillés par un balayage de tout l'espace RVB —
[test/resume.test.ts](../../packages/cv-core/test/resume.test.ts).

## Un seul point d'entrée pour un CV venu du dehors

Un CV arrive de trois endroits qui échappent au typage : le brouillon
`localStorage`, la colonne `jsonb`, et le corps de la requête d'export.
`normalizeResume` est le seul chemin des trois — il remonte les brouillons de la
version 1 du schéma, écarte une photo qui n'est pas une data URL d'image et une
couleur qui n'est pas un hexadécimal — [resume.ts](../../packages/cv-core/src/resume.ts).

## Les trois rendus du descripteur

| | Fichier | Notes |
| --- | --- | --- |
| Aperçu HTML | [ResumePreview.tsx](../../apps/vitae/components/ResumePreview.tsx) | Composant serveur |
| Document PDF | [ResumeDocument.tsx](../../packages/cv-pdf/src/ResumeDocument.tsx) | `@react-pdf/renderer` |
| Croquis SVG | [TemplateSketch.tsx](../../apps/vitae/components/TemplateSketch.tsx) | Vignettes de l'accueil et du sélecteur |

Le croquis remplace la vignette de CV réel sur l'accueil : à 200 px de large, un CV
complet ne se lit pas, et deux modèles très différents y paraissent identiques. Le
croquis est dessiné à l'échelle de la page à partir du descripteur — il montre les
marges, la densité, l'habillage des titres et la place de la photo sans faire passer
un exemple inventé pour un vrai CV.

Le bandeau du modèle Compact touche les bords de la page par des **marges
négatives** qui annulent le rembourrage — vérifié dans le flux de contenu du PDF
(`0 0 595.28 102 re`), pas seulement à l'écran. La photo ronde est un `Image`
découpé par un chemin de clipping : react-pdf le produit à partir de `borderRadius`.

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

**Deux passes** : sans photo, puis avec une photo fabriquée par le script lui-même.
La seconde protège deux choses à la fois — l'extraction, et la pagination du modèle
« Stage », qui promet une seule page et est le plus exposé à un bloc d'identité plus
haut.

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
