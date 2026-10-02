/**
 * Génère toutes les icônes depuis une source unique, `public/icon.svg`.
 *
 *   icon-192.png, icon-512.png   manifeste (Android, ordinateur)
 *   icon-maskable-512.png         Android découpe lui-même la forme (cercle,
 *                                 goutte…) : fond plein, dessin réduit à 80 %
 *                                 pour tenir dans la zone sûre
 *   apple-touch-icon.png          iOS ignore le SVG et le manifeste, pose ses
 *                                 propres coins et noircit la transparence
 *   favicon-48.png, favicon.ico   onglet du navigateur ; le .ico couvre les
 *                                 robots et vieux navigateurs qui le demandent
 *                                 à la racine sans lire le HTML
 *
 * `sharp` est déjà présent dans le workspace (dépendance de Next). À relancer
 * quand l'icône change : `npm run icons`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { ico } from '../../../packages/pwa/favicon.mjs';

const file = (name) => new URL(`../public/${name}`, import.meta.url);
const svg = (await readFile(file('icon.svg'))).toString();

// Fond plein sans coins, puis tout le dessin regroupé et réduit autour du centre.
const background = svg.match(/<rect width="512" height="512"[^>]*\/>/)?.[0];
if (background === undefined) throw new Error('icon.svg : fond 512×512 introuvable');
const maskable = svg
  .replace(background, `${background.replace(/ rx="\d+"/, '')}<g transform="translate(51.2 51.2) scale(0.8)">`)
  .replace('</svg>', '</g></svg>');

const png = (source, size) => sharp(Buffer.from(source)).resize(size, size).png().toBuffer();

await writeFile(file('icon-192.png'), await png(svg, 192));
await writeFile(file('icon-512.png'), await png(svg, 512));
await writeFile(file('icon-maskable-512.png'), await png(maskable, 512));
await writeFile(file('apple-touch-icon.png'), await png(maskable, 180));

const favicon = await png(svg, 48);
await writeFile(file('favicon-48.png'), favicon);
await writeFile(file('favicon.ico'), ico(favicon, 48));
console.log('Icônes générées dans public/.');
