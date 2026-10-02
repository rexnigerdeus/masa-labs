/**
 * Fusion des lignes reçues du serveur dans l'état local.
 *
 * Règle unique : **une écriture locale pas encore envoyée gagne**. Sinon, la
 * ligne du serveur remplace la locale — elle est forcément au moins aussi
 * récente, puisqu'on ne reçoit que ce qui a changé depuis le dernier passage.
 *
 * C'est un « dernier qui écrit gagne » à l'échelle de la ligne. Deux
 * appareils qui modifient la même tâche hors-ligne : le dernier à se
 * reconnecter l'emporte. Pour une liste de tâches personnelle, c'est le bon
 * compromis — une fusion champ par champ coûterait un historique par champ
 * pour un conflit qui n'arrive presque jamais.
 */

import { checkKey, type Data, type Table } from './model.ts';
import {
  checkFromRow, habitFromRow, listFromRow, PROFILE_KEY, profileFromRow, taskFromRow,
} from './rows.ts';

export function outboxKey(table: Table, key: string): string {
  return `${table}:${key}`;
}

type Row = Record<string, unknown>;

export function mergeRows(data: Data, table: Table, rows: Row[], pending: ReadonlySet<string>): Data {
  const isPending = (key: string): boolean => pending.has(outboxKey(table, key));

  switch (table) {
    case 'sowly_profiles': {
      const row = rows[0];
      if (row === undefined || isPending(PROFILE_KEY)) return data;
      return { ...data, profile: profileFromRow(row) };
    }
    case 'sowly_habits': {
      const habits = { ...data.habits };
      for (const row of rows) {
        const h = habitFromRow(row);
        if (h !== null && !isPending(h.id)) habits[h.id] = h;
      }
      return { ...data, habits };
    }
    case 'sowly_habit_checks': {
      const checks = { ...data.checks };
      for (const row of rows) {
        const c = checkFromRow(row);
        if (c === null) continue;
        const key = checkKey(c.habitId, c.day);
        if (!isPending(key)) checks[key] = c;
      }
      return { ...data, checks };
    }
    case 'sowly_task_lists': {
      const lists = { ...data.lists };
      for (const row of rows) {
        const l = listFromRow(row);
        if (l !== null && !isPending(l.id)) lists[l.id] = l;
      }
      return { ...data, lists };
    }
    case 'sowly_tasks': {
      const tasks = { ...data.tasks };
      for (const row of rows) {
        const t = taskFromRow(row);
        if (t !== null && !isPending(t.id)) tasks[t.id] = t;
      }
      return { ...data, tasks };
    }
  }
}

/**
 * Prochain curseur de lecture : le plus grand `updated_at` reçu.
 *
 * La requête suivante relit une marge avant ce curseur (`lib/sync.ts`) : une
 * transaction lente peut valider une ligne horodatée *avant* une autre déjà
 * lue. Relire quelques lignes en double ne coûte rien, la fusion étant
 * idempotente ; en manquer une la ferait disparaître pour toujours de cet
 * appareil.
 */
export function nextCursor(current: string | null, rows: Row[]): string | null {
  let cursor = current;
  for (const row of rows) {
    const at = row.updated_at;
    if (typeof at === 'string' && (cursor === null || Date.parse(at) > Date.parse(cursor))) {
      cursor = at;
    }
  }
  return cursor;
}
