import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { computeStreak } from '../lib/streak.ts';
import { PRAYER_HOURS, VERSES } from '../lib/verses.ts';
import {
  compose, composeAlarm, composePrayer, currentStreak, dueSlot, localNow, scheduledHabits, type HabitRow, type Subscription,
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
  assert.equal(msg?.title, '🌙 Faire 5 pompes ?');
  const streak = compose('evening', '2026-10-12', today, new Set(['h1']), [], new Map([['h2', 5]]));
  assert.match(streak?.body ?? '', /5 jours d’affilée/);
  const two = compose('evening', '2026-10-12', today, new Set(), []);
  assert.match(two?.body ?? '', /Lire une page\n🌱 Faire 5 pompes/);
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
  assert.match(msg?.title ?? '', /2 graines et 2 tâches pour aujourd’hui$/);
  assert.match(msg?.body ?? '', /✅ Payer la facture/);
  assert.match(msg?.body ?? '', /⏰ En retard \(à rattraper\)/);
  assert.doesNotMatch(msg?.body ?? '', /Plus tard/);
  assert.equal(compose('morning', '2026-10-12', [], new Set(), []), null);
});

test('série : même résultat que l’app', () => {
  const day = '2026-10-12';
  const cases: string[][] = [
    [], ['2026-10-11'], ['2026-10-11', '2026-10-10', '2026-10-08'], ['2026-10-12', '2026-10-11'],
    ['2026-10-09', '2026-10-07', '2026-10-05'],
  ];
  for (const h of HABITS.slice(0, 3)) {
    for (const days of cases) {
      const checked = new Set(days);
      assert.equal(
        currentStreak(h, checked, day),
        computeStreak({ days: h.days, startDay: h.start_day }, checked, day).current,
        `${h.id} ${days.join()}`,
      );
    }
  }
});

const REMINDER = {
  subscription_id: 's', user_id: 'u', item_id: 'i', remind_at: '2026-10-12T18:30:00', day: '2026-10-12',
};

test('rappel à l’heure : nomme la chose et ouvre son alarme', () => {
  const task = composeAlarm({ ...REMINDER, kind: 'task' }, { title: 'Payer la CIE', description: 'Réf.  4521', listName: 'Maison' });
  assert.equal(task.title, '⏰ Payer la CIE');
  assert.equal(task.body, 'C’est l’heure : 18 h 30 · Maison\nRéf. 4521');
  assert.equal(task.url, '/?alarme=task:i');
  const habit = composeAlarm({ ...REMINDER, kind: 'habit' }, {
    title: 'Lire', habit: { ...HABITS[0]!, cue: 'au coucher', place: '' }, streak: 7,
  });
  assert.equal(habit.body, 'Il est 18 h 30 · au coucher\n🔥 7 jours d’affilée, on continue ?');
});

test('prière : l’heure, un verset de cette heure et sa référence', () => {
  const msg = composePrayer({ ...REMINDER, kind: 'prayer', remind_at: '2026-10-12T15:00:00' });
  assert.match(msg.title, /15 h/);
  assert.ok(VERSES[15]!.some((v) => msg.body.includes(v.text) && msg.body.includes(v.ref)));
  assert.equal(msg.url, '/?alarme=prayer:15');
  assert.match(composePrayer({ ...REMINDER, kind: 'prayer', remind_at: '2026-10-12T00:00:00' }).title, /Minuit/);
});

test('versets : l’app et la fonction ont la même copie, chaque heure en a', async () => {
  const read = (p: string): Promise<string> => readFile(new URL(p, import.meta.url), 'utf8');
  const [app, fn] = await Promise.all([read('../lib/verses.ts'), read('../../../../supabase/functions/sowly-push/verses.ts')]);
  assert.equal(app.replace(/\r/g, ''), fn.replace(/\r/g, ''));
  for (const h of PRAYER_HOURS) assert.ok((VERSES[h] ?? []).length >= 3);
});
