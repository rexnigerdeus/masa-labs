/**
 * Lettre de motivation : rendu, poids et relecture du texte.
 *
 * Même promesse que le CV (`ats:check`) : ce qui est écrit dans la lettre se
 * relit à l'identique dans le PDF. Lancé par `npm run ats:check`.
 */
import { extractText, getDocumentProxy } from 'unpdf';
import { SAMPLE_RESUME, composeCoverLetter, emptyCoverLetter } from '@everyday/cv-core';
import { renderCoverLetterPdf } from '../src/index.ts';

const letter = {
  ...emptyCoverLetter(),
  company: 'Club sportif de Marcory',
  position: 'animateur sportif',
  why: 'votre école de basket accueille les enfants du quartier',
  strengths: ['Encadrement d’enfants', 'Premiers secours'],
  availability: 'dès le 1er décembre',
  placeDate: 'Abidjan, le 18 octobre 2026',
};
letter.body = composeCoverLetter(letter, SAMPLE_RESUME);

const pdf = await renderCoverLetterPdf(letter, SAMPLE_RESUME);
const doc = await getDocumentProxy(new Uint8Array(pdf));
const { text } = await extractText(doc, { mergePages: true });
const flat = (text as string).replace(/\s+/g, ' ');
const expected = ['Objet : candidature au poste de animateur sportif', 'Club sportif de Marcory', 'dès le 1er décembre', SAMPLE_RESUME.personal.fullName];
const missing = expected.filter((e) => !flat.includes(e));
console.log(`Lettre : ${Math.round(pdf.length / 1024)} Ko, ${doc.numPages} page(s)`);
if (missing.length > 0) {
  console.error('Texte non relu :', missing);
  process.exit(1);
}
console.log('Lettre : texte relu à l’identique.');
