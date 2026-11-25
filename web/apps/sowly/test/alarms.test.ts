import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alarmKey, dueAlarms } from '../lib/alarms.ts';
import { addMinutes, formatStamp, isStamp, nextHour } from '../lib/clock.ts';
import { emptyData, type Data } from '../lib/model.ts';
import {
  createHabit, createTask, patchTask, postponeTask, setPrayerHours, snoozeHabit, toggleCheck, toggleTask, updateHabit,
  type HabitDraft,
} from '../lib/mutations.ts';
import { habitFromRow, profileFromRow, taskFromRow } from '../lib/rows.ts';

const TODAY = '2026-11-25'; // mercredi
const NOW = '2026-11-25T18:30:00.000Z';
const NONE = new Set<string>();
const DRAFT: HabitDraft = {
  action: 'Lire', moment: 'soir', cue: '', place: '', identity: null, why: '', days: [1, 3, 5], remindTime: '18:30',
};
const due = (d: Data, now: string, seen: ReadonlySet<string> = NONE): string[] => dueAlarms(d, now, seen).map(alarmKey);

test('heures : validation, calcul, affichage', () => {
  assert.ok(isStamp('2026-11-25T18:30'));
  assert.ok(!isStamp('2026-02-31T18:30') && !isStamp('2026-11-25T24:00') && !isStamp('2026-11-25 18:30'));
  assert.equal(addMinutes('2026-11-25T23:55', 10), '2026-11-26T00:05');
  assert.equal(nextHour('2026-11-25T18:30'), '2026-11-25T19:00');
  assert.equal(formatStamp('2026-11-26T08:00', TODAY), 'Demain · 08:00');
});

test('tâche : sonne à l’heure, une heure au plus, jamais faite ni fermée', () => {
  const d = createTask(emptyData(), {
    title: 'Payer', listId: null, myDay: null, dueDay: null, remindAt: '2026-11-25T18:30',
  }, 't').data;
  assert.deepEqual(due(d, '2026-11-25T18:29'), []);
  assert.deepEqual(due(d, '2026-11-25T18:30'), ['task:t@2026-11-25T18:30']);
  assert.deepEqual(due(d, '2026-11-25T19:29').length, 1);
  assert.deepEqual(due(d, '2026-11-25T19:30'), []);
  assert.deepEqual(due(d, '2026-11-25T18:31', new Set(['task:t@2026-11-25T18:30'])), []);
  assert.deepEqual(due(toggleTask(d, 't', NOW).data, '2026-11-25T18:31'), []);
  // Repoussée de dix minutes : elle sonne de nouveau.
  const later = patchTask(d, 't', { remindAt: '2026-11-25T18:41' }).data;
  assert.equal(due(later, '2026-11-25T18:41', new Set(['task:t@2026-11-25T18:30'])).length, 1);
});

test('reporter à demain emmène le rappel, à la même heure', () => {
  const d = createTask(emptyData(), {
    title: 'Payer', listId: null, myDay: TODAY, dueDay: null, remindAt: '2026-11-25T18:30',
  }, 't').data;
  assert.equal(postponeTask(d, 't', TODAY).data.tasks.t?.remindAt, '2026-11-26T18:30');
  const far = patchTask(d, 't', { remindAt: '2026-12-01T09:00' }).data;
  assert.equal(postponeTask(far, 't', TODAY).data.tasks.t?.remindAt, '2026-12-01T09:00');
});

test('habitude : seulement les jours prévus, pas une fois validée', () => {
  const d = createHabit(emptyData(), DRAFT, 'h', TODAY).data;
  assert.deepEqual(due(d, '2026-11-25T18:35'), ['habit:h@2026-11-25T18:30']);
  assert.deepEqual(due(d, '2026-11-26T18:35'), []); // jeudi
  assert.deepEqual(due(toggleCheck(d, 'h', TODAY, TODAY, NOW).data, '2026-11-25T18:35'), []);
  const snoozed = snoozeHabit(d, 'h', '2026-11-25T18:45').data;
  assert.equal(due(snoozed, '2026-11-25T18:45', new Set(['habit:h@2026-11-25T18:30']))[0], 'habit:h@2026-11-25T18:45');
  // Changer l'heure annule le report en attente.
  assert.equal(updateHabit(snoozed, 'h', { ...DRAFT, remindTime: '20:00' }).data.habits.h?.snoozeAt, null);
});

test('rappel de 23:58 : encore là à minuit passé', () => {
  const d = createHabit(emptyData(), { ...DRAFT, remindTime: '23:58' }, 'h', TODAY).data;
  assert.deepEqual(due(d, '2026-11-26T00:05'), ['habit:h@2026-11-25T23:58']);
});

test('prière : aux heures activées, rien quand l’option est coupée', () => {
  const on = setPrayerHours(emptyData(), [15, 0, 7]).data;
  assert.deepEqual(on.profile.prayerHours, [0, 15]); // 7 h n'existe pas
  assert.deepEqual(due(on, '2026-11-25T15:00'), ['prayer:15@2026-11-25T15:00']);
  assert.deepEqual(due(on, '2026-11-25T00:10'), ['prayer:0@2026-11-25T00:00']);
  assert.deepEqual(due(setPrayerHours(on, []).data, '2026-11-25T15:00'), []);
});

test('lignes de la base : secondes retirées, valeurs douteuses ignorées', () => {
  assert.equal(taskFromRow({ id: 't', title: 'x', remind_at: '2026-11-25T18:30:00' })?.remindAt, '2026-11-25T18:30');
  assert.equal(taskFromRow({ id: 't', title: 'x', remind_at: 'bientôt' })?.remindAt, null);
  assert.equal(taskFromRow({ id: 't', title: 'x' })?.remindAt, null);
  assert.equal(habitFromRow({ id: 'h', action: 'x', start_day: TODAY, remind_time: '06:00:00' })?.remindTime, '06:00');
  assert.deepEqual(profileFromRow({ prayer_hours: [18, 4, 9] }).prayerHours, [4, 18]);
});
