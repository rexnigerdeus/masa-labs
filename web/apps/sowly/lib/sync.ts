'use client';

/**
 * Synchronisation avec Supabase : envoyer la file, puis lire ce qui a changé.
 *
 * Déclenchée par une écriture locale (après 1,5 s de calme, pour grouper
 * une rafale de validations), au retour du réseau, au retour au premier
 * plan et à la connexion. Jamais bloquante : l'interface ne l'attend pas,
 * et un échec se rattrape au déclenchement suivant.
 *
 * Pas de Realtime pour ce lot : comme la messagerie de Hive, on préfère
 * relire au retour au premier plan — c'est là qu'on change d'appareil — plutôt
 * que de garder un websocket ouvert sur un forfait mobile.
 */

import { useSyncExternalStore } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getState, internal, onLocalChange } from './store.ts';
import { TABLES, type Change, type Table } from './model.ts';
import { COLUMNS, CONFLICT_KEY, OPTIONAL_COLUMNS } from './rows.ts';
import { nextCursor } from './merge.ts';

/**
 * supabase-js (~50 Ko) est chargé à la demande, après le premier rendu :
 * l'écran Aujourd'hui s'affiche depuis `localStorage` sans l'attendre, et
 * sans réseau il n'est jamais téléchargé pour rien.
 */
function client(): Promise<SupabaseClient> {
  return import('./supabase/client.ts').then((m) => m.getSupabaseClient());
}

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'anonymous' | 'error';

let status: SyncStatus = 'idle';
const statusListeners = new Set<() => void>();

function setStatus(next: SyncStatus): void {
  if (next === status) return;
  status = next;
  for (const l of statusListeners) l();
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => { statusListeners.add(l); return () => statusListeners.delete(l); },
    () => status,
    () => 'idle',
  );
}

// ---------------------------------------------------------------------------
// Colonnes optionnelles

/**
 * Colonnes optionnelles (`OPTIONAL_COLUMNS`) que le serveur n'a pas encore,
 * sous la forme `table.colonne`. Découvert à l'exécution : Postgres répond
 * `42703` à une lecture, PostgREST `PGRST204` à une écriture. On retire
 * alors la colonne des requêtes, et l'écran masque le champ qui l'utilise.
 * Pas mémorisé d'un lancement à l'autre : dès la migration appliquée, la
 * colonne revient au lancement suivant.
 */
const missing = new Set<string>();
const schemaListeners = new Set<() => void>();

/** La colonne existe-t-elle côté serveur ? `true` tant qu'on ne sait pas le contraire. */
export function useColumnAvailable(table: Table, column: string): boolean {
  return useSyncExternalStore(
    (l) => { schemaListeners.add(l); return () => schemaListeners.delete(l); },
    () => !missing.has(`${table}.${column}`),
    () => true,
  );
}

function missingColumn(table: Table, error: { code?: string; message?: string }): string | null {
  if (error.code !== '42703' && error.code !== 'PGRST204') return null;
  const column = (OPTIONAL_COLUMNS[table] ?? [])
    .find((c) => !missing.has(`${table}.${c}`) && (error.message ?? '').includes(c));
  if (column === undefined) return null;
  missing.add(`${table}.${column}`);
  for (const l of schemaListeners) l();
  return column;
}

function selectColumns(table: Table): string {
  const extra = (OPTIONAL_COLUMNS[table] ?? []).filter((c) => !missing.has(`${table}.${c}`));
  return [COLUMNS[table], ...extra].join(', ');
}

function withoutMissing(table: Table, row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row };
  for (const c of OPTIONAL_COLUMNS[table] ?? []) if (missing.has(`${table}.${c}`)) delete out[c];
  return out;
}

/**
 * Une ligne lue sans une colonne optionnelle ne doit pas effacer la valeur
 * locale : sans cela, une description écrite sur l'appareil disparaîtrait
 * à la lecture suivante.
 */
function keepLocal(table: Table, row: Record<string, unknown>): Record<string, unknown> {
  if (table === 'sowly_tasks' && missing.has('sowly_tasks.description') && typeof row.id === 'string') {
    return { ...row, description: getState().data.tasks[row.id]?.description ?? '' };
  }
  return row;
}

// ---------------------------------------------------------------------------

let running: Promise<void> | null = null;
let again = false;

/** Lance une synchronisation, ou se raccroche à celle en cours (et la relance après). */
export function syncNow(): Promise<void> {
  if (running !== null) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await runOnce();
    } while (again);
  })().finally(() => { running = null; });
  return running;
}

async function runOnce(): Promise<void> {
  if (!navigator.onLine) {
    setStatus('offline');
    return;
  }
  const supabase = await client();
  // `getSession` et non `getUser` : on ne prend ici aucune décision de
  // confiance, on choisit seulement s'il y a lieu d'envoyer. Le serveur
  // revérifie le jeton à chaque requête, et la RLS fait le reste.
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (session === null) {
    setStatus('anonymous');
    return;
  }
  adoptAccount(session.user.id);

  setStatus('syncing');
  try {
    await push(supabase, session.user.id);
    await pull(supabase);
    internal.setMeta({ lastSyncAt: new Date().toISOString() });
    setStatus('idle');
  } catch {
    // Réseau tombé en route ou serveur indisponible : la file est intacte,
    // le prochain déclenchement reprendra là où on s'est arrêté.
    setStatus(navigator.onLine ? 'error' : 'offline');
  }
}

/**
 * Rattache l'appareil au compte connecté.
 *
 * Même compte qu'avant (session expirée puis reconnexion) : on garde tout,
 * y compris les modifications pas encore envoyées. Autre compte, ou premier
 * compte sur l'appareil : on repart de zéro avant de lire les données du
 * compte, sans quoi deux comptes se mélangeraient sur un téléphone partagé.
 * Le compte étant obligatoire, aucune donnée n'existe avant la connexion.
 */
export function adoptAccount(userId: string): void {
  if (getState().meta.ownerId !== userId) internal.reset(userId);
}

// ---------------------------------------------------------------------------
// Envoi

const BATCH = 200;

async function push(supabase: SupabaseClient, userId: string): Promise<void> {
  const outbox = getState().outbox;
  // Ordre des tables : un parent part avant ses enfants (habitude avant ses
  // validations, liste avant ses tâches), sinon la clé étrangère refuse.
  for (const table of TABLES) {
    const entries = Object.entries(outbox).filter(([, c]) => c.table === table);
    for (let i = 0; i < entries.length; i += BATCH) {
      await sendBatch(supabase, table, entries.slice(i, i + BATCH), userId);
    }
  }
}

async function sendBatch(
  supabase: SupabaseClient, table: Table, entries: Array<[string, Change]>, userId: string,
): Promise<void> {
  const rows = entries.map(([, c]) => withoutMissing(
    table, table === 'sowly_profiles' ? { ...c.row, user_id: userId } : c.row,
  ));
  const { error } = await supabase.from(table).upsert(rows, { onConflict: CONFLICT_KEY[table] });
  if (error === null) {
    internal.acknowledge(Object.fromEntries(entries));
    return;
  }
  // Colonne pas encore en base : on la retire et on renvoie le lot.
  if (missingColumn(table, error) !== null) return sendBatch(supabase, table, entries, userId);
  if (!isRejected(error)) throw error;

  // Une ligne refusée par la base (contrainte, RLS) ne passera jamais : la
  // garder bloquerait toute la file pour toujours. On isole la fautive en
  // renvoyant le lot ligne à ligne, et on l'abandonne.
  if (entries.length === 1) {
    internal.acknowledge(Object.fromEntries(entries));
    return;
  }
  for (const entry of entries) await sendBatch(supabase, table, [entry], userId);
}

/**
 * Refus définitif d'une ligne par Postgres : classe 22 (donnée invalide) ou
 * 23 (contrainte). Ces lignes ne passeront jamais, on peut les abandonner.
 *
 * Tout le reste se réessaie, y compris la classe 42 : une table absente
 * (`42P01`, migration pas encore appliquée) ou un droit manquant (`42501`)
 * sont des erreurs de configuration — jeter la file à cause d'elles
 * perdrait toutes les données en attente.
 */
function isRejected(error: { code?: string }): boolean {
  return typeof error.code === 'string' && /^(22|23)/.test(error.code);
}

// ---------------------------------------------------------------------------
// Lecture

const PAGE = 500;
/** Marge relue avant le curseur : voir `nextCursor` dans `lib/merge.ts`. */
const OVERLAP_MS = 2 * 60_000;

async function pull(supabase: SupabaseClient): Promise<void> {
  for (const table of TABLES) {
    const since = getState().meta.cursors[table] ?? null;
    const from = since === null ? null : new Date(Date.parse(since) - OVERLAP_MS).toISOString();
    let cursor = since;

    for (let offset = 0; ; offset += PAGE) {
      let query = supabase.from(table).select(selectColumns(table))
        .order('updated_at', { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (from !== null) query = query.gte('updated_at', from);

      const { data, error } = await query;
      if (error !== null) {
        // Colonne pas encore en base : on relit la même page sans elle.
        if (missingColumn(table, error) !== null) { offset -= PAGE; continue; }
        throw error;
      }
      const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => keepLocal(table, r));
      cursor = nextCursor(cursor, rows);
      internal.merge(table, rows, cursor);
      if (rows.length < PAGE) break;
    }
  }
}

// ---------------------------------------------------------------------------
// Déclencheurs

let started = false;

/** Branche les déclencheurs, une fois pour toute la vie de l'onglet. */
export function startSync(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  let timer: ReturnType<typeof setTimeout> | undefined;
  onLocalChange(() => {
    clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), 1500);
  });
  window.addEventListener('online', () => void syncNow());
  window.addEventListener('offline', () => setStatus('offline'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow();
  });
  void syncNow().then(client).then((supabase) => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void syncNow();
    });
  });
}

/**
 * Déconnexion : dernière tentative d'envoi, puis effacement des données de
 * l'appareil — sur un téléphone prêté, la personne suivante ne doit rien
 * voir. L'écran appelant prévient avant, avec `pendingCount()`, si des
 * modifications risquent de ne pas partir.
 */
export async function signOut(): Promise<void> {
  await syncNow();
  await (await client()).auth.signOut();
  internal.reset(null);
  setStatus('anonymous');
}

export function pendingCount(): number {
  return Object.keys(getState().outbox).length;
}
