import { test } from 'node:test';
import assert from 'node:assert/strict';

import { scoreResume } from '../src/scoring/index.ts';
import { TEMPLATE_LIST, sectionTitle, getTemplate } from '../src/templates.ts';
import { formatRange, formatDate, compareByRecency } from '../src/dates.ts';
import { COMPLETE, EMPTY, PARTIAL } from './fixtures.ts';

test('un CV vide est noté 0 et n’a que des sections vides', () => {
  const r = scoreResume(EMPTY);
  assert.equal(r.total, 0);
  assert.equal(r.grade, 'moyen');
  assert.ok(r.sections.every((s) => s.empty));
  assert.ok(r.recommendations.length > 0, 'un CV vide doit tout recommander');
});

test('les scores progressent du vide au complet', () => {
  const empty = scoreResume(EMPTY).total;
  const partial = scoreResume(PARTIAL).total;
  const complete = scoreResume(COMPLETE).total;
  assert.ok(empty < partial, `${empty} < ${partial}`);
  assert.ok(partial < complete, `${partial} < ${complete}`);
});

test('un CV complet et bien rédigé atteint le palier excellent', () => {
  const r = scoreResume(COMPLETE);
  assert.ok(r.total >= 80, `score ${r.total} attendu >= 80`);
  assert.equal(r.grade, 'excellent');
});

test('un CV renseigné mais mal rédigé reste sous le palier excellent', () => {
  const r = scoreResume(PARTIAL);
  assert.ok(r.total < 80, `score ${r.total} attendu < 80`);
});

test('le score global reste dans [0,100] sur toutes les fixtures', () => {
  for (const fixture of [EMPTY, PARTIAL, COMPLETE]) {
    const r = scoreResume(fixture);
    assert.ok(r.total >= 0 && r.total <= 100);
    for (const c of r.criteria) assert.ok(c.score >= 0 && c.score <= 100, c.id);
    for (const s of r.sections) assert.ok(s.score >= 0 && s.score <= 100, s.id);
  }
});

test('les cinq critères du brief sont tous renvoyés', () => {
  const ids = scoreResume(COMPLETE).criteria.map((c) => c.id);
  assert.deepEqual(ids, ['structure', 'impact', 'brievete', 'coherence', 'softSkills']);
});

test('les puces sans verbe d’action ni chiffre effondrent le critère Impact', () => {
  const partial = scoreResume(PARTIAL).criteria.find((c) => c.id === 'impact');
  const complete = scoreResume(COMPLETE).criteria.find((c) => c.id === 'impact');
  assert.ok(partial !== undefined && complete !== undefined);
  assert.ok(partial.score < 50, `impact ${partial.score} attendu < 50`);
  assert.ok(complete.score >= 80, `impact ${complete.score} attendu >= 80`);
});

test('un mélange de formats de dates est détecté par le critère Cohérence', () => {
  const r = scoreResume(PARTIAL);
  assert.ok(r.recommendations.some((rec) => rec.id === 'coherence.dateFormat'));
});

test('les compétences en double sont signalées', () => {
  // PARTIAL contient « Excel » et « excel ».
  const r = scoreResume(PARTIAL);
  assert.ok(r.recommendations.some((rec) => rec.id === 'coherence.skillDuplicates'));
});

test('les recommandations sont triées par gain décroissant et rattachées à une section', () => {
  const recs = scoreResume(PARTIAL).recommendations;
  const sections = new Set(scoreResume(PARTIAL).sections.map((s) => s.id));
  for (let i = 1; i < recs.length; i += 1) {
    const prev = recs[i - 1];
    const cur = recs[i];
    assert.ok(prev !== undefined && cur !== undefined);
    assert.ok(prev.points >= cur.points, 'tri par points décroissants');
  }
  assert.ok(recs.every((r) => sections.has(r.section)));
  assert.ok(recs.every((r) => r.points > 0), 'aucune reco à 0 point');
});

test('un CV complet ne réclame plus rien d’essentiel', () => {
  const recs = scoreResume(COMPLETE).recommendations;
  assert.ok(
    recs.every((r) => !r.id.startsWith('structure.')),
    `structure incomplète : ${recs.map((r) => r.id).join(', ')}`,
  );
});

test('un étudiant sans expérience est sauvé par ses projets', () => {
  const base = { ...EMPTY, projects: [] };
  const withProject = {
    ...EMPTY,
    projects: [{ id: 'p1', name: 'Tutorat', description: 'Cours de maths', url: '' }],
  };
  const without = scoreResume(base).recommendations.some((r) => r.id === 'structure.experience');
  const with_ = scoreResume(withProject).recommendations.some((r) => r.id === 'structure.experience');
  assert.equal(without, true);
  assert.equal(with_, false);
});

test('tous les templates respectent les contraintes ATS de base', () => {
  for (const t of TEMPLATE_LIST) {
    assert.ok(t.sectionOrder.includes('personal'), `${t.id} sans identité`);
    assert.ok(t.sectionOrder.includes('experience'), `${t.id} sans expérience`);
    assert.ok(t.sectionOrder.includes('education'), `${t.id} sans formation`);
    assert.equal(new Set(t.sectionOrder).size, t.sectionOrder.length, `${t.id} : section en double`);
    assert.ok(t.typography.body >= 9, `${t.id} : corps de texte trop petit pour être lu`);
    assert.ok(t.spacing.page >= 28, `${t.id} : marges trop faibles pour l’impression`);
  }
});

test('le template Stage remonte la formation avant l’expérience', () => {
  const stage = getTemplate('stage');
  assert.ok(stage.sectionOrder.indexOf('education') < stage.sectionOrder.indexOf('experience'));
  assert.equal(stage.maxPages, 1);
});

test('les en-têtes de section suivent la casse du template', () => {
  assert.equal(sectionTitle(getTemplate('classique'), 'experience'), 'EXPÉRIENCE PROFESSIONNELLE');
  assert.equal(sectionTitle(getTemplate('sobre'), 'experience'), 'Expérience professionnelle');
  assert.equal(sectionTitle(getTemplate('classique'), 'personal'), '');
});

test('les dates sont rendues en toutes lettres, ou en année seule', () => {
  assert.equal(formatDate({ year: 2024, month: 3 }), 'mars 2024');
  assert.equal(formatDate({ year: 2024 }), '2024');
  assert.equal(formatDate(null), '');
  assert.equal(formatRange({ year: 2023, month: 4 }, null, true), "avr. 2023 – aujourd'hui");
  assert.equal(formatRange({ year: 2022 }, { year: 2023 }, false), '2022 – 2023');
});

test('les expériences se trient en antichronologique, poste actuel en tête', () => {
  const sorted = [...PARTIAL.experiences].sort(compareByRecency);
  assert.equal(sorted[0]?.id, 'e1');
});
