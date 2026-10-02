'use client';

/**
 * État de l'application, local d'abord (patterns architecturaux §6).
 *
 * `localStorage` est la source de vérité du quotidien : l'écran Aujourd'hui
 * s'affiche et se valide sans réseau, sans compte, sans attendre personne.
 * Supabase n'est que la sauvegarde multi-appareils, alimentée par la file
 * d'envoi (`outbox`) que `lib/sync.ts` vide quand il peut.
 *
 * `localStorage` plutôt qu'IndexedDB : lecture synchrone au premier rendu,
 * donc pas d'écran vide à l'ouverture, et un volume qui reste modeste — une
 * validation pèse une soixantaine d'octets, cinq habitudes tenues un an
 * font ~110 Ko, loin des 5 Mo du quota. À revoir si l'historique ou les
 * pièces jointes grossissent.
 *
 * Exposé par `useSyncExternalStore` : le rendu serveur et le premier rendu
 * client voient `null` (rien n'est lu côté serveur), puis l'état réel arrive
 * en un seul passage, sans clignotement d'hydratation.
 */

import { useSyncExternalStore } from 'react';
import { dayOf, type Day } from './dates.ts';
import { emptyData, type Change, type Data, type Table } from './model.ts';
import { habitFromRow, checkFromRow, listFromRow, taskFromRow, profileFromRow } from './rows.ts';
import { mergeRows, outboxKey } from './merge.ts';
import type { Result } from './mutations.ts';
import type { GroupBy } from './selectors.ts';

export interface Prefs {
  groupBy: GroupBy;
  /** Bandeau « crée un compte » refermé. */
  accountHintDismissed: boolean;
}

export interface Meta {
  /** Compte auquel appartiennent les données locales, `null` avant toute connexion. */
  ownerId: string | null;
  cursors: Partial<Record<Table, string>>;
  lastSyncAt: string | null;
}

export interface State {
  data: Data;
  outbox: Record<string, Change>;
  meta: Meta;
  prefs: Prefs;
}

const KEY = 'sowly.state.v1';

const DEFAULT_PREFS: Prefs = { groupBy: 'moment', accountHintDismissed: false };
const DEFAULT_META: Meta = { ownerId: null, cursors: {}, lastSyncAt: null };

function initial(): State {
  return { data: emptyData(), outbox: {}, meta: DEFAULT_META, prefs: DEFAULT_PREFS };
}

let state: State | null = null;
const listeners = new Set<() => void>();
const changeListeners = new Set<() => void>();

// ---------------------------------------------------------------------------
// Lecture et écriture

function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return initial();
    return revive(JSON.parse(raw));
  } catch {
    // Stockage indisponible (navigation privée stricte) ou contenu illisible :
    // on repart d'un état vide plutôt que de bloquer l'écran.
    return initial();
  }
}

/**
 * Garde-fou de forme au chargement : chaque ligne repasse par les mêmes
 * conversions que celles reçues du serveur. Une donnée écrite par une
 * version précédente et devenue malformée est écartée, pas fatale.
 */
function revive(raw: unknown): State {
  if (typeof raw !== 'object' || raw === null) return initial();
  const r = raw as Partial<State>;
  const base = initial();
  const d = (r.data ?? {}) as Partial<Data>;

  const pick = <T>(rec: unknown, fromRow: (row: Record<string, unknown>) => T | null,
    toRow: (v: Record<string, unknown>) => Record<string, unknown>): Record<string, T> => {
    const out: Record<string, T> = {};
    if (typeof rec !== 'object' || rec === null) return out;
    for (const [k, v] of Object.entries(rec as Record<string, Record<string, unknown>>)) {
      const parsed = fromRow(toRow(v));
      if (parsed !== null) out[k] = parsed;
    }
    return out;
  };

  return {
    data: {
      profile: profileFromRow(snake(d.profile ?? {})),
      habits: pick(d.habits, habitFromRow, snake),
      checks: pick(d.checks, checkFromRow, snake),
      lists: pick(d.lists, listFromRow, snake),
      tasks: pick(d.tasks, taskFromRow, snake),
    },
    outbox: typeof r.outbox === 'object' && r.outbox !== null ? r.outbox : {},
    meta: { ...base.meta, ...(r.meta ?? {}) },
    prefs: { ...base.prefs, ...(r.prefs ?? {}) },
  };
}

/** Réutilise les conversions de `rows.ts` pour l'état local, stocké en camelCase. */
function snake(v: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) {
    out[k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = val;
  }
  return out;
}

function persist(next: State): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Quota plein ou stockage refusé : l'état reste en mémoire pour la
    // session et la file d'envoi partira quand même vers le serveur.
  }
}

export function getState(): State {
  // Côté serveur, aucun état : surtout pas de singleton partagé entre requêtes.
  if (typeof window === 'undefined') return initial();
  if (state === null) state = read();
  return state;
}

function setState(next: State): void {
  state = next;
  persist(next);
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  // Deux onglets ouverts : l'écriture de l'un se voit dans l'autre.
  window.addEventListener('storage', (event) => {
    if (event.key !== KEY) return;
    state = read();
    for (const l of listeners) l();
  });
}

/** État courant, `null` tant que le navigateur ne l'a pas lu (rendu serveur, hydratation). */
export function useStore(): State | null {
  return useSyncExternalStore(subscribe, getState, () => null);
}

// ---------------------------------------------------------------------------
// Écritures

/**
 * Applique une mutation pure (`lib/mutations.ts`) : nouvel état, lignes
 * ajoutées à la file d'envoi, synchronisation demandée. La file est
 * fusionnée par ligne — modifier dix fois une tâche hors-ligne n'enverra
 * que sa dernière version.
 */
export function commit(run: (data: Data) => Result): void {
  const current = getState();
  const { data, changes } = run(current.data);
  if (changes.length === 0 && data === current.data) return;
  const outbox = { ...current.outbox };
  for (const c of changes) outbox[outboxKey(c.table, c.key)] = c;
  setState({ ...current, data, outbox });
  for (const l of changeListeners) l();
}

/** Prévenu à chaque écriture locale : c'est ce qui déclenche l'envoi. */
export function onLocalChange(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

export function setPrefs(patch: Partial<Prefs>): void {
  const current = getState();
  setState({ ...current, prefs: { ...current.prefs, ...patch } });
}

/** Réservé à `lib/sync.ts`. */
export const internal = {
  /** Retire de la file les lignes envoyées, sauf si elles ont changé entre-temps. */
  acknowledge(sent: Record<string, Change>): void {
    const current = getState();
    const outbox = { ...current.outbox };
    for (const [key, change] of Object.entries(sent)) {
      if (outbox[key] === change) delete outbox[key];
    }
    setState({ ...current, outbox });
  },
  merge(table: Table, rows: Record<string, unknown>[], cursor: string | null): void {
    const current = getState();
    const pending = new Set(Object.keys(current.outbox));
    const data = mergeRows(current.data, table, rows, pending);
    const cursors = { ...current.meta.cursors };
    if (cursor !== null) cursors[table] = cursor;
    setState({ ...current, data, meta: { ...current.meta, cursors } });
  },
  setMeta(patch: Partial<Meta>): void {
    const current = getState();
    setState({ ...current, meta: { ...current.meta, ...patch } });
  },
  /** Données d'un autre compte, ou déconnexion : on repart de zéro, préférences gardées. */
  reset(ownerId: string | null): void {
    const current = getState();
    setState({ ...initial(), prefs: current.prefs, meta: { ...DEFAULT_META, ownerId } });
  },
};

// ---------------------------------------------------------------------------
// Jour courant

let todayValue: Day | null = null;
const dayListeners = new Set<() => void>();

function readToday(): Day {
  todayValue ??= dayOf();
  return todayValue;
}

if (typeof window !== 'undefined') {
  // L'application reste souvent ouverte d'un jour sur l'autre : au retour au
  // premier plan et chaque minute, on vérifie que « aujourd'hui » l'est encore.
  const refresh = (): void => {
    const now = dayOf();
    if (now !== todayValue) {
      todayValue = now;
      for (const l of dayListeners) l();
    }
  };
  document.addEventListener('visibilitychange', refresh);
  window.setInterval(refresh, 60_000);
}

/** Jour courant, qui change tout seul à minuit. */
export function useToday(): Day {
  return useSyncExternalStore(
    (l) => { dayListeners.add(l); return () => dayListeners.delete(l); },
    readToday,
    // Côté serveur, aucune donnée n'est affichée ; la valeur est sans effet.
    () => '1970-01-01',
  );
}

export function today(): Day {
  return readToday();
}

export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Identifiant définitif, généré sur l'appareil (voir la migration).
 *
 * `randomUUID` n'existe qu'en contexte sécurisé : un test sur téléphone via
 * l'adresse IP du poste (http://192.168…) passerait sinon par une erreur.
 */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
