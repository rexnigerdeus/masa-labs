/**
 * Harnais de validation ATS.
 *
 * Rend le CV de référence avec chaque template, réextrait le texte du PDF
 * produit, et vérifie que ce qu'un logiciel de tri lira correspond à ce que
 * l'utilisateur croit avoir écrit. C'est le contrôle qui protège la promesse
 * centrale du produit — à relancer après toute modification de template, de
 * police ou de mise en page.
 *
 *     npm run ats:check
 *
 * Il ne valide pas l'esthétique : un template peut être laid et passer. Il
 * valide que le texte est réel, complet, et dans le bon ordre.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractText, getDocumentProxy } from 'unpdf';
import {
  SAMPLE_RESUME,
  TEMPLATE_LIST,
  sectionTitle,
  formatDate,
  type Resume,
  type TemplateSpec,
} from '@everyday/cv-core';
import { renderResumePdf } from '../src/render.tsx';

const OUT_DIR = fileURLToPath(new URL('../.ats-out/', import.meta.url));

/**
 * Normalise pour la comparaison : l'extraction PDF insère des espaces et des
 * retours à la ligne aux frontières de segments de texte. On compare donc des
 * suites de mots, pas des chaînes brutes.
 */
function normalize(input: string): string {
  return input
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

interface Failure {
  template: string;
  message: string;
}

const failures: Failure[] = [];

function expect(spec: TemplateSpec, condition: boolean, message: string): void {
  if (!condition) failures.push({ template: spec.name, message });
}

/** Vérifie la présence d'un fragment, en tolérant les coupures d'extraction. */
function contains(haystack: string, needle: string): boolean {
  return haystack.includes(normalize(needle));
}

async function checkTemplate(spec: TemplateSpec, resume: Resume): Promise<void> {
  const pdf = await renderResumePdf({ ...resume, templateId: spec.id });
  await writeFile(join(OUT_DIR, `${spec.id}.pdf`), pdf);

  const doc = await getDocumentProxy(new Uint8Array(pdf));
  const { totalPages, text } = await extractText(doc, { mergePages: true });
  const flat = normalize(text);

  // 1. Le PDF contient du texte réel, pas une image.
  expect(spec, flat.length > 400, `texte extrait trop court (${flat.length} caractères) — le PDF est-il rendu en image ?`);

  // 2. Identité et coordonnées : sans elles, la candidature est inexploitable.
  const p = resume.personal;
  expect(spec, contains(flat, p.fullName), `nom « ${p.fullName} » introuvable`);
  expect(spec, contains(flat, p.email), `email « ${p.email} » introuvable`);
  // Le téléphone peut être recoupé : on vérifie ses chiffres à la suite.
  const digits = p.phone.replace(/\D/g, '');
  expect(spec, flat.replace(/\D/g, '').includes(digits), `téléphone « ${p.phone} » introuvable`);
  expect(spec, contains(flat, resume.headline), 'titre professionnel introuvable');

  // 3. En-têtes de section, dans l'ordre déclaré par le template.
  const positions: { section: string; at: number }[] = [];
  for (const section of spec.sectionOrder) {
    if (section === 'personal' || section === 'headline') continue;
    const title = sectionTitle(spec, section);
    const at = flat.indexOf(normalize(title));
    expect(spec, at !== -1, `en-tête de section « ${title} » introuvable`);
    if (at !== -1) positions.push({ section, at });
  }
  for (let i = 1; i < positions.length; i += 1) {
    const prev = positions[i - 1];
    const cur = positions[i];
    if (prev === undefined || cur === undefined) continue;
    expect(
      spec,
      prev.at < cur.at,
      `ordre de lecture cassé : « ${cur.section} » est extrait avant « ${prev.section} »`,
    );
  }

  // 4. Contenu des expériences : intitulé, entreprise, dates et chaque puce.
  for (const exp of resume.experiences) {
    expect(spec, contains(flat, exp.role), `intitulé « ${exp.role} » introuvable`);
    expect(spec, contains(flat, exp.company), `entreprise « ${exp.company} » introuvable`);
    if (exp.start !== null) {
      expect(spec, contains(flat, formatDate(exp.start)), `date de début de « ${exp.role} » introuvable`);
    }
    for (const bullet of exp.bullets) {
      expect(spec, contains(flat, bullet), `puce tronquée ou absente : « ${bullet.slice(0, 40)}… »`);
    }
  }

  // 5. Formation et compétences — c'est sur ces mots-clés que les ATS filtrent.
  for (const edu of resume.education) {
    expect(spec, contains(flat, edu.degree), `diplôme « ${edu.degree} » introuvable`);
    expect(spec, contains(flat, edu.school), `établissement « ${edu.school} » introuvable`);
  }
  for (const skill of resume.skills) {
    expect(spec, contains(flat, skill), `compétence « ${skill} » introuvable`);
  }

  // 6. Pagination : le template Stage promet une page, il doit la tenir.
  expect(
    spec,
    totalPages <= spec.maxPages,
    `${totalPages} pages rendues, ${spec.maxPages} annoncée(s) — le CV de référence déborde`,
  );

  const own = failures.filter((f) => f.template === spec.name);
  const status = own.length === 0 ? 'OK  ' : 'ÉCHEC';
  console.log(`  ${status}  ${spec.name.padEnd(10)} ${totalPages} page(s), ${flat.length} caractères extraits`);
  for (const f of own) console.log(`         · ${f.message}`);
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  console.log('Validation ATS — rendu puis réextraction du CV de référence\n');

  for (const spec of TEMPLATE_LIST) {
    await checkTemplate(spec, SAMPLE_RESUME);
  }

  console.log(`\nPDF conservés dans ${OUT_DIR}`);
  if (failures.length > 0) {
    console.error(`\n${failures.length} contrôle(s) ATS en échec.`);
    process.exit(1);
  }
  console.log('\nTous les templates sont relus correctement.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
