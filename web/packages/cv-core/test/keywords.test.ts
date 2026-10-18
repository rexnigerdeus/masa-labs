import { test } from 'node:test';
import assert from 'node:assert/strict';

import { keywordCoverage, offerKeywords } from '../src/keywords.ts';
import {
  composeCoverLetter, emptyCoverLetter, letterParagraphs, normalizeCoverLetter,
} from '../src/letter.ts';
import { COMPLETE } from './fixtures.ts';

test('les mots du titre viennent en premier, sans mots vides ni mention de contrat', () => {
  const k = offerKeywords('Assistant(e) marketing digital H/F - CDI', '');
  assert.deepEqual(k, ['assistant', 'marketing', 'digital']);
});

test('les termes répétés de la description suivent, paires comprises', () => {
  const k = offerKeywords(
    'Stagiaire communication',
    'Gestion des réseaux sociaux. Vous animez les réseaux sociaux et rédigez les contenus. Excel exigé, Excel avancé.',
  );
  assert.equal(k[0], 'communication');
  assert.ok(k.includes('reseaux sociaux'), k.join(', '));
  assert.ok(k.includes('excel'), k.join(', '));
  assert.ok(!k.includes('reseaux'), 'un mot couvert par une paire ne revient pas seul');
});

test('la couverture coche les mots présents en mot entier dans le CV', () => {
  const skill = (COMPLETE.skills[0] as string).toLowerCase();
  const cov = keywordCoverage(COMPLETE, [skill, 'motinexistantxyz']);
  assert.equal(cov[0]?.present, true, skill);
  assert.equal(cov[1]?.present, false);
});

test('la lettre assemblée reprend le poste, la structure et les atouts choisis', () => {
  const body = composeCoverLetter({
    ...emptyCoverLetter(),
    company: 'Club sportif de Marcory',
    position: 'animateur sportif',
    why: 'votre école de basket accueille les enfants du quartier',
    strengths: ['Encadrement d’enfants', 'BAFA', 'Premiers secours'],
    availability: 'dès le 1er décembre',
  }, COMPLETE);
  const paragraphs = letterParagraphs(body);
  assert.equal(paragraphs[0], 'Madame, Monsieur,');
  assert.match(body, /poste de animateur sportif au sein de Club sportif de Marcory\./);
  assert.match(body, /Votre école de basket accueille les enfants du quartier\./);
  assert.match(body, /Encadrement d’enfants, BAFA et Premiers secours/);
  assert.match(body, /disponible dès le 1er décembre/);
});

test('une lettre illisible est écartée, une lettre partielle complétée', () => {
  assert.equal(normalizeCoverLetter('nimporte'), null);
  const l = normalizeCoverLetter({ company: 'X', strengths: ['a', 2, 'b'] });
  assert.deepEqual(l?.strengths, ['a', 'b']);
  assert.equal(l?.body, '');
});
