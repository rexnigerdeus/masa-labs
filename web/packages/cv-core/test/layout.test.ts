import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATE_LIST, getTemplate, mainSections, sidebarSections } from '../src/templates.ts';
import { MAX_TRACKING_RATIO, MIN_DENSITY, pageMetrics, safeTracking } from '../src/layout.ts';

test('chaque section est rendue une fois, dans le corps ou dans la colonne', () => {
  for (const t of TEMPLATE_LIST) {
    const rendered = [...mainSections(t), ...sidebarSections(t)];
    assert.deepEqual([...rendered].sort(), [...t.sectionOrder].sort(), `${t.id} : section perdue ou doublée`);
    assert.ok(mainSections(t).includes('experience'), `${t.id} : l'expérience doit rester dans le corps`);
    assert.ok(mainSections(t).includes('personal'), `${t.id} : le nom doit ouvrir le flux de texte`);
  }
});

test('la colonne latérale est retranchée de la largeur utile, du bon côté', () => {
  const horizon = getTemplate('horizon');
  const m = pageMetrics(horizon, false);
  assert.ok(m.sidebar !== null);
  assert.equal(m.padLeft, m.sidebar.width + horizon.spacing.page);
  assert.equal(m.padRight, horizon.spacing.page);
  assert.equal(pageMetrics(getTemplate('classique'), false).sidebar, null);
});

test('une photo bord à bord colle la colonne en haut de page', () => {
  const atelier = getTemplate('atelier');
  assert.equal(pageMetrics(atelier, true).sidebar?.top, 0);
  assert.ok((pageMetrics(atelier, false).sidebar?.top ?? 0) > 0);
});

test('le resserrement touche les espacements, pas le corps ni les marges latérales', () => {
  for (const t of TEMPLATE_LIST) {
    const loose = pageMetrics(t, true, 1);
    const tight = pageMetrics(t, true, MIN_DENSITY);
    assert.ok(tight.section < loose.section && tight.lineHeight < loose.lineHeight, t.id);
    assert.equal(tight.padLeft, loose.padLeft, t.id);
    assert.ok(tight.lineHeight >= 1.2, `${t.id} : interligne illisible une fois resserré`);
    assert.deepEqual(pageMetrics(t, true, 0.1), tight, `${t.id} : la densité doit être bornée`);
  }
});

test('l’interlettrage reste sous le seuil où l’extraction sépare les lettres', () => {
  assert.equal(safeTracking(10, 0.5), 0.5);
  assert.equal(safeTracking(10, 5), 10 * MAX_TRACKING_RATIO);
});
