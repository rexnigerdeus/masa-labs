import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Font } from '@react-pdf/renderer';

/**
 * Enregistre Roboto pour le rendu PDF.
 *
 * Pourquoi embarquer une police plutôt qu'utiliser l'Helvetica intégrée :
 * les polices standard PDF sont encodées en WinAnsi, ce qui rend l'extraction
 * de texte fragile dès qu'apparaissent des caractères hors Latin-1 (« œ », les
 * espaces insécables, les guillemets français). Or l'extraction correcte du
 * texte est exactement la promesse ATS du produit. Roboto est embarquée avec
 * un encodage Unicode : ce qui est affiché est ce qui est réextrait.
 */
// Chemin composé plutôt que `new URL('../fonts/', import.meta.url)` : cette
// forme-là, les bundlers la traitent comme une ressource à inliner, ce qui
// casse le build. Ici le dossier reste un vrai dossier sur le disque.
//
// Mais une fois le package transpilé par Next, `import.meta.url` est figé au
// build avec le chemin absolu de la machine de build (`/vercel/path0/…`), alors
// que la fonction s'exécute sous `/var/task/…` : le dossier n'existe plus. On
// essaie donc aussi les emplacements relatifs au répertoire courant de l'app
// (`apps/vitae`), là où le traçage de fichiers dépose les polices.
function resolveFontDir(): string {
  const candidates = [
    join(dirname(fileURLToPath(import.meta.url)), '..', 'fonts'),
    join(process.cwd(), '..', '..', 'packages', 'cv-pdf', 'fonts'),
    join(process.cwd(), 'packages', 'cv-pdf', 'fonts'),
    join(process.cwd(), 'node_modules', '@everyday', 'cv-pdf', 'fonts'),
  ];
  const found = candidates.find((dir) => existsSync(join(dir, 'Roboto-Regular.ttf')));
  if (found === undefined) {
    throw new Error(`Polices du PDF introuvables. Chemins essayés : ${candidates.join(', ')}`);
  }
  return found;
}

export const FONT_FAMILY = 'Roboto';

let registered = false;

/** Idempotent : react-pdf n'aime pas les enregistrements répétés. */
export function registerFonts(): void {
  if (registered) return;
  const FONT_DIR = resolveFontDir();
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: join(FONT_DIR, 'Roboto-Regular.ttf'), fontWeight: 400 },
      { src: join(FONT_DIR, 'Roboto-Bold.ttf'), fontWeight: 700 },
      { src: join(FONT_DIR, 'Roboto-Italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
    ],
  });

  // Césure désactivée : un mot coupé en fin de ligne est réassemblé avec un
  // trait d'union par les parseurs, qui n'y retrouvent plus le mot-clé.
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
