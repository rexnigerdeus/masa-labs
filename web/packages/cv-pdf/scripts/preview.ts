/**
 * Rend chaque modèle en PDF pour le regarder, sans rien vérifier.
 *
 *     npm run pdf:preview
 *
 * Deux CV par modèle, avec photo : le CV de référence et un CV long. Sorties
 * dans `.ats-out/preview/` (git-ignoré), une par modèle et par CV.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAMPLE_RESUME, TEMPLATE_LIST, type Resume } from '@everyday/cv-core';
import { countPages, renderResumePdf } from '../src/render.tsx';
import { LONG_RESUME } from './long-resume.ts';
import { testPhoto } from './test-photo.ts';

const OUT_DIR = fileURLToPath(new URL('../.ats-out/preview/', import.meta.url));

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const photo = testPhoto();
  const samples: [string, Resume][] = [['reference', SAMPLE_RESUME], ['long', LONG_RESUME]];
  for (const spec of TEMPLATE_LIST) {
    for (const [label, base] of samples) {
      const resume: Resume = {
        ...base,
        templateId: spec.id,
        accentColor: spec.defaultAccent,
        personal: { ...base.personal, photo, showPhoto: true },
      };
      const pdf = await renderResumePdf(resume);
      const file = join(OUT_DIR, `${spec.id}-${label}.pdf`);
      await writeFile(file, pdf);
      console.log(`${spec.id.padEnd(10)} ${label.padEnd(10)} ${countPages(pdf)} page(s)`);
    }
  }
}

void main();
