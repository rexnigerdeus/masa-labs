import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak } from '../lib/streak.ts';
import { addDays, formatDays, isDay, weekday } from '../lib/dates.ts';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
// Vendredi 2 octobre 2026.
const TODAY = '2026-10-02';

function days(...list: string[]): Set<string> {
  return new Set(list);
}

test('le calendrier tombe juste, y compris au changement d’heure', () => {
  assert.equal(weekday(TODAY), 5);
  assert.equal(addDays('2026-10-24', 2), '2026-10-26');
  assert.equal(addDays('2026-03-28', 1), '2026-03-29');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(isDay('2026-02-31'), false);
  assert.equal(isDay('2026-02-28'), true);
});

test('trois jours d’affilée jusqu’à aujourd’hui font une série de 3', () => {
  const s = computeStreak({ days: EVERY_DAY, startDay: '2026-09-01' },
    days('2026-09-30', '2026-10-01', '2026-10-02'), TODAY);
  assert.equal(s.current, 3);
  assert.equal(s.best, 3);
  assert.equal(s.total, 3);
});

test('aujourd’hui pas encore validé ne casse pas la série', () => {
  const s = computeStreak({ days: EVERY_DAY, startDay: '2026-09-01' },
    days('2026-09-30', '2026-10-01'), TODAY);
  assert.equal(s.current, 2);
});

test('un jour prévu manqué remet la série à zéro, le record reste', () => {
  const s = computeStreak({ days: EVERY_DAY, startDay: '2026-09-01' },
    days('2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-10-01'), TODAY);
  assert.equal(s.current, 1);
  assert.equal(s.best, 4);
});

test('le week-end n’interrompt pas une habitude de semaine', () => {
  const weekdays = [1, 2, 3, 4, 5];
  // Jeudi 24, vendredi 25, (week-end), lundi 28 → jeudi 1er.
  const s = computeStreak({ days: weekdays, startDay: '2026-09-21' },
    days('2026-09-24', '2026-09-25', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'),
    TODAY);
  assert.equal(s.current, 6);
});

test('valider un jour non prévu compte en bonus, sans rien casser', () => {
  const s = computeStreak({ days: [1, 3, 5], startDay: '2026-09-28' },
    days('2026-09-28', '2026-09-29', '2026-09-30'), TODAY);
  // Lundi, mardi (bonus), mercredi ; jeudi non prévu, vendredi = aujourd'hui.
  assert.equal(s.current, 3);
});

test('les jours avant le début de l’habitude ne sont jamais des jours manqués', () => {
  const s = computeStreak({ days: EVERY_DAY, startDay: TODAY }, days(), TODAY);
  assert.deepEqual(s, { current: 0, best: 0, total: 0 });
});

test('une date de début dans le futur ne produit pas de série', () => {
  const s = computeStreak({ days: EVERY_DAY, startDay: '2027-01-01' }, days(), TODAY);
  assert.deepEqual(s, { current: 0, best: 0, total: 0 });
});

test('les jours prévus se lisent en français courant', () => {
  assert.equal(formatDays(EVERY_DAY), 'Tous les jours');
  assert.equal(formatDays([5, 1, 2, 3, 4]), 'En semaine');
  assert.equal(formatDays([6, 0]), 'Le week-end');
  assert.equal(formatDays([1, 3, 5]), 'lun, mer, ven');
});
