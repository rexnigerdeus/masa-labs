'use client';

/**
 * Alarmes déjà traitées sur cet appareil (fermées, faites, repoussées).
 * Local et non synchronisé : fermer l'alarme sur l'ordinateur ne doit pas
 * la faire taire sur le téléphone. « Fait », lui, se synchronise — et une
 * tâche faite ne sonne plus nulle part.
 */

import { alarmKey, dueAlarms, type Alarm } from './alarms.ts';
import { stampOf } from './clock.ts';
import { getState } from './store.ts';

const KEY = 'sowly.alarms.v1';
const KEEP_MS = 3 * 86_400_000;

function read(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

// Doublé en mémoire : si le stockage est refusé, une alarme fermée ne doit
// pas revenir sonner dix secondes plus tard.
const session = new Set<string>();

export function dismissed(): ReadonlySet<string> {
  return new Set([...session, ...Object.keys(read())]);
}

export function dismiss(alarms: readonly Alarm[]): void {
  const now = Date.now();
  const kept = Object.fromEntries(Object.entries(read()).filter(([, at]) => now - at < KEEP_MS));
  for (const a of alarms) {
    session.add(alarmKey(a));
    kept[alarmKey(a)] = now;
  }
  try { localStorage.setItem(KEY, JSON.stringify(kept)); } catch { /* session seulement */ }
}

/**
 * Tait ce qui sonnerait à l'instant pour un type donné : activer l'option
 * prière à 15 h 20, ou poser un rappel de 8 h à 8 h 30, ne doit pas
 * déclencher l'alarme de l'heure déjà passée.
 */
export function silenceDue(kind: Alarm['kind']): void {
  dismiss(dueAlarms(getState().data, stampOf(), dismissed()).filter((a) => a.kind === kind));
}

/** Essai depuis Personnaliser. */
export const PREVIEW_EVENT = 'sowly:alarm-preview';
export function previewAlarm(alarm: Alarm): void {
  window.dispatchEvent(new CustomEvent<Alarm>(PREVIEW_EVENT, { detail: alarm }));
}
