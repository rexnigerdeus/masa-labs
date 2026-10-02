import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, type Data } from '../lib/model.ts';
import {
  completeOnboarding, createHabit, createList, createTask, deleteList, postponeTask,
  reorderTasks, toggleCheck, toggleTask, type HabitDraft,
} from '../lib/mutations.ts';
import {
  habitsForDay, leftoverTasks, myDayTasks, tasksOfList, todayHabits,
} from '../lib/selectors.ts';
import { mergeRows, nextCursor, outboxKey } from '../lib/merge.ts';

const TODAY = '2026-10-02';
const NOW = '2026-10-02T08:00:00.000Z';

function counter(): () => string {
  let n = 0;
  return () => `id-${++n}`;
}

const DRAFT: HabitDraft = {
  action: '  Lire une page  ',
  moment: 'soir',
  cue: 'au coucher',
  place: '',
  identity: 'lecture',
  why: '',
  days: [0, 1, 2, 3, 4, 5, 6],
};

test('l’onboarding écrit profil, habitude et tâches en une fois', () => {
  const { data, changes } = completeOnboarding(emptyData(), {
    identities: ['lecture', 'sante'],
    habit: DRAFT,
    tasks: ['Acheter du pain', '  ', 'Appeler le plombier'],
  }, counter(), NOW, TODAY);

  assert.equal(data.profile.onboardedAt, NOW);
  assert.equal(data.profile.committedAt, NOW);
  assert.equal(Object.keys(data.habits).length, 1);
  assert.equal(data.habits['id-1']?.action, 'Lire une page');
  assert.equal(data.habits['id-1']?.startDay, TODAY);
  // La tâche vide est ignorée, les autres arrivent dans « Ma journée ».
  assert.equal(myDayTasks(data, TODAY).length, 2);
  assert.deepEqual(changes.map((c) => c.table),
    ['sowly_profiles', 'sowly_habits', 'sowly_tasks', 'sowly_tasks']);
});

test('valider puis dévalider laisse une trace à synchroniser', () => {
  let data: Data = createHabit(emptyData(), DRAFT, 'h', TODAY).data;
  const checked = toggleCheck(data, 'h', TODAY, TODAY, NOW);
  data = checked.data;
  assert.equal(todayHabits(data, TODAY, 'moment').done, 1);

  const unchecked = toggleCheck(data, 'h', TODAY, TODAY, NOW);
  assert.equal(todayHabits(unchecked.data, TODAY, 'moment').done, 0);
  assert.equal(unchecked.changes[0]?.row.deleted_at, NOW);
});

test('un jour futur ne se valide pas', () => {
  const data = createHabit(emptyData(), DRAFT, 'h', TODAY).data;
  assert.equal(toggleCheck(data, 'h', '2026-10-03', TODAY, NOW).changes.length, 0);
});

test('une habitude de semaine n’apparaît pas le samedi', () => {
  const data = createHabit(emptyData(), { ...DRAFT, days: [1, 2, 3, 4, 5] }, 'h', TODAY).data;
  assert.equal(habitsForDay(data, TODAY).length, 1);
  assert.equal(habitsForDay(data, '2026-10-03').length, 0);
});

test('regroupement par identité : celles choisies d’abord, le reste dans « Autres »', () => {
  let data = createHabit(emptyData(), DRAFT, 'a', TODAY).data;
  data = createHabit(data, { ...DRAFT, identity: null }, 'b', TODAY).data;
  data = { ...data, profile: { ...data.profile, identities: ['lecture'] } };
  const { groups } = todayHabits(data, TODAY, 'identity');
  assert.deepEqual(groups.map((g) => g.label), ['Lecture', 'Autres']);
});

test('reporter à demain sort la tâche de « Ma journée » sans la perdre', () => {
  let data = createTask(emptyData(), { title: 'Courses', listId: null, myDay: TODAY, dueDay: null }, 't').data;
  data = postponeTask(data, 't', TODAY).data;
  assert.equal(myDayTasks(data, TODAY).length, 0);
  assert.equal(myDayTasks(data, '2026-10-03').length, 1);
});

test('les tâches d’hier non faites sont proposées, pas imposées', () => {
  let data = createTask(emptyData(), { title: 'A', listId: null, myDay: '2026-10-01', dueDay: null }, 'a').data;
  data = createTask(data, { title: 'B', listId: null, myDay: '2026-10-01', dueDay: null }, 'b').data;
  data = toggleTask(data, 'b', NOW).data;
  assert.deepEqual(leftoverTasks(data, TODAY).map((t) => t.id), ['a']);
  assert.equal(myDayTasks(data, TODAY).length, 0);
});

test('les tâches faites passent sous celles qui restent', () => {
  let data = emptyData();
  for (const id of ['a', 'b', 'c']) {
    data = createTask(data, { title: id, listId: null, myDay: null, dueDay: null }, id).data;
  }
  data = toggleTask(data, 'a', NOW).data;
  assert.deepEqual(tasksOfList(data, null).map((t) => t.id), ['b', 'c', 'a']);
});

test('réordonner n’envoie que les positions qui changent', () => {
  let data = emptyData();
  for (const id of ['a', 'b', 'c']) {
    data = createTask(data, { title: id, listId: null, myDay: null, dueDay: null }, id).data;
  }
  const { changes } = reorderTasks(data, ['a', 'c', 'b']);
  assert.deepEqual(changes.map((c) => c.key), ['c', 'b']);
});

test('supprimer une liste supprime ses tâches', () => {
  let data = createList(emptyData(), 'Courses', 'l').data;
  data = createTask(data, { title: 'Pain', listId: 'l', myDay: null, dueDay: null }, 't').data;
  const result = deleteList(data, 'l', NOW);
  assert.equal(result.data.tasks.t?.deletedAt, NOW);
  assert.equal(result.changes.length, 2);
});

test('fusion : une écriture locale en attente l’emporte sur le serveur', () => {
  const data = createTask(emptyData(), { title: 'Local', listId: null, myDay: null, dueDay: null }, 't').data;
  const server = [{ id: 't', title: 'Serveur', list_id: null, position: 0, updated_at: NOW }];

  const pending = new Set([outboxKey('sowly_tasks', 't')]);
  assert.equal(mergeRows(data, 'sowly_tasks', server, pending).tasks.t?.title, 'Local');
  assert.equal(mergeRows(data, 'sowly_tasks', server, new Set()).tasks.t?.title, 'Serveur');
});

test('fusion : une ligne malformée est ignorée plutôt que de casser l’écran', () => {
  const merged = mergeRows(emptyData(), 'sowly_habits', [{ id: 'x' }, { action: 'sans id' }], new Set());
  assert.equal(Object.keys(merged.habits).length, 0);
});

test('le curseur avance au plus récent, quel que soit l’ordre reçu', () => {
  const rows = [
    { updated_at: '2026-10-02T08:00:01.5+00:00' },
    { updated_at: '2026-10-02T08:00:03+00:00' },
    { updated_at: '2026-10-02T08:00:02+00:00' },
  ];
  assert.equal(nextCursor(null, rows), '2026-10-02T08:00:03+00:00');
  assert.equal(nextCursor('2026-10-03T00:00:00Z', rows), '2026-10-03T00:00:00Z');
});
