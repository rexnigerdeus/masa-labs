/**
 * Favicons d'une app, depuis son icône (SVG ou PNG carré).
 *
 *   favicon-48.png  onglet du navigateur (déclaré dans `metadata.icons`)
 *   favicon.ico     pour les robots et vieux navigateurs qui le demandent à
 *                   la racine sans lire le HTML — un 404 de moins par visite
 *
 * Utilisable en script : `node packages/pwa/favicon.mjs apps/vitae/public/icon-512.png`
 * écrit les deux fichiers dans le même dossier.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export async function writeFavicons(source, outDir) {
  const png = await sharp(await readFile(source)).resize(48, 48).png().toBuffer();
  await writeFile(join(outDir, 'favicon-48.png'), png);
  await writeFile(join(outDir, 'favicon.ico'), ico(png, 48));
}

/** Conteneur ICO minimal autour d'un PNG (format admis depuis Windows Vista). */
export function ico(pngData, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);          // réservé
  header.writeUInt16LE(1, 2);          // type : icône
  header.writeUInt16LE(1, 4);          // une seule image
  header.writeUInt8(size, 6);          // largeur
  header.writeUInt8(size, 7);          // hauteur
  header.writeUInt8(0, 8);             // pas de palette
  header.writeUInt8(0, 9);             // réservé
  header.writeUInt16LE(1, 10);         // plans
  header.writeUInt16LE(32, 12);        // bits par pixel
  header.writeUInt32LE(pngData.length, 14);
  header.writeUInt32LE(22, 18);        // l'image suit l'en-tête
  return Buffer.concat([header, pngData]);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = process.argv[2];
  if (source === undefined) throw new Error('Usage : node favicon.mjs <icône source>');
  await writeFavicons(source, dirname(source));
  console.log(`Favicons écrits dans ${dirname(source)}.`);
}
