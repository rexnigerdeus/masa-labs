import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compose, dueSlot, localNow, scheduledHabits, type HabitRow, type Subscription,
} from '../../../../supabase/functions/sowly-push/logic.ts';

const SUB: Subscription = {
  id: 's', user_id: 'u', endpoint: 'https://push.example/x', p256dh: 'k', auth: 'a',
  time_zone: 'Africa/Abidjan',
  morning_enabled: true, morning_at: '08:00:00',
  evening_enabled: true, evening_at: '20:00:00',
  last_morning_day: null, last_evening_day: null,
};

// Lundi 12 octobre 2026. Abidjan est en UTC+0, Paris en UTC+2 (heure d'été).
const at = (utc: string): Date => new Date(`2026-10-12T${utc}:00Z`);

test('heure locale : jour, minute et jour de la semaine du fuseau', () => {
  assert.deepEqual(localNow(at('23:30'), 'Africa/Abidjan'), { day: '2026-10-12', minutes: 23 * 60 + 30, weekday: 1 });
  // À Paris, il est déjà 1 h 30 le mardi.
  assert.deepEqual(localNow(at('23:30'), 'Europe/Paris'), { day: '2026-10-13', minutes: 90, weekday: 2 });
  // Fuseau inconnu : Abidjan plutôt qu'une erreur.
  assert.equal(localNow(at('08:00'), 'Mars/Olympus').minutes, 480);
});

test('créneau : dans l’heure qui suit l’heure choisie, une seule fois par jour', () => {
  assert.equal(dueSlot(SUB, at('07:59')), null);
  assert.equal(dueSlot(SUB, at('08:00'))?.slot, 'morning');
  assert.equal(dueSlot(SUB, at('08:59'))?.slot, 'morning');
  assert.equal(dueSlot(SUB, at('09:00')), null);
  assert.equal(dueSlot({ ...SUB, last_morning_day: '2026-10-12' }, at('08:15')), null);
  assert.equal(dueSlot(SUB, at('20:10'))?.slot, 'evening');
  assert.equal(dueSlot({ ...SUB, evening_enabled: false }, at('20:10')), null);
});

test('créneau : l’heure est celle du fuseau de l’appareil', () => {
  const paris = { ...SUB, time_zone: 'Europe/Paris' };
  assert.equal(dueSlot(paris, at('08:00')), null); // 10 h à Paris
  assert.equal(dueSlot(paris, at('06:05'))?.slot, 'morning'); // 8 h 05 à Paris
});

const HABITS: HabitRow[] = [
  { id: 'h1', action: 'Lire une page', days: [0, 1, 2, 3, 4, 5, 6], start_day: '2026-09-01' },
  { id: 'h2', action: 'Faire 5 pompes', days: [1, 3, 5], start_day: '2026-09-01' },
  { id: 'h3', action: 'Méditer', days: [0], start_day: '2026-09-01' },
  { id: 'h4', action: 'Courir', days: [1], start_day: '2026-11-01' },
];

test('habitudes du jour : même règle que l’app', () => {
  assert.deepEqual(scheduledHabits(HABITS, '2026-10-12', 1).map((h) => h.id), ['h1', 'h2']);
});

test('soir : seulement s’il reste des habitudes, et sans reproche', () => {
  const today = scheduledHabits(HABITS, '2026-10-12', 1);
  const msg = compose('evening', '2026-10-12', today, new Set(['h1']), []);
  assert.equal(msg?.title, 'Une graine à arroser ce soir');
  assert.match(msg?.body ?? '', /Faire 5 pompes/);
  assert.equal(compose('evening', '2026-10-12', today, new Set(['h1', 'h2']), []), null);
});

test('matin : habitudes et tâches à échéance, rien si la journée est vide', () => {
  const today = scheduledHabits(HABITS, '2026-10-12', 1);
  const tasks = [
    { title: 'Payer la facture', due_day: '2026-10-12', my_day: null },
    { title: 'En retard', due_day: '2026-10-10', my_day: null },
    { title: 'Plus tard', due_day: '2026-10-20', my_day: null },
  ];
  const msg = compose('morning', '2026-10-12', today, new Set(), tasks);
  assert.equal(msg?.title, 'Aujourd’hui : 2 habitudes et 2 tâches à échéance');
  assert.equal(compose('morning', '2026-10-12', [], new Set(), []), null);
});
