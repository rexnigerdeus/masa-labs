/**
 * Génère les icônes PNG depuis `public/icon.svg`.
 *
 * Le SVG suffit aux navigateurs récents ; les PNG restent nécessaires pour
 * iOS (`apple-touch-icon`, qui ignore le SVG) et pour l'icône « maskable »
 * d'Android, dont le dessin doit tenir dans le cercle central de 80 %.
 *
 * `sharp` est déjà présent dans le workspace (dépendance de Next) ; à
 * relancer seulement quand l'icône change : `npm run icons`.
 */
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const svg = await readFile(new URL('../public/icon.svg', import.meta.url));
// Version pleine page, sans coins arrondis, dessin réduit : Android découpe
// lui-même la forme (cercle, goutte…) selon le lanceur.
const maskable = Buffer.from(
  svg.toString()
    .replace('rx="112"', 'rx="0"')
    .replace('<g ', '<g transform="translate(51 51) scale(0.8)" '),
);

const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'));
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'));
await sharp(maskable).resize(512, 512).png().toFile(out('icon-maskable-512.png'));
// iOS pose ses propres coins arrondis et met du noir dans la transparence.
await sharp(maskable).resize(180, 180).png().toFile(out('apple-touch-icon.png'));
console.log('Icônes générées dans public/.');
