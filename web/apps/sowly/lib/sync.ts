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
import { COLUMNS, CONFLICT_KEY } from './rows.ts';
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
 * Rattache les données locales au compte connecté.
 *
 * Données saisies avant toute inscription : elles deviennent celles du
 * compte, et la file — qui les contient déjà toutes — part telle quelle.
 * Données d'un **autre** compte (téléphone partagé) : on les efface avant
 * de lire celles du nouveau, sans quoi les deux se mélangeraient.
 */
export function adoptAccount(userId: string): void {
  const { ownerId } = getState().meta;
  if (ownerId === null) internal.setMeta({ ownerId: userId });
  else if (ownerId !== userId) internal.reset(userId);
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
  const rows = entries.map(([, c]) => (table === 'sowly_profiles' ? { ...c.row, user_id: userId } : c.row));
  const { error } = await supabase.from(table).upsert(rows, { onConflict: CONFLICT_KEY[table] });
  if (error === null) {
    internal.acknowledge(Object.fromEntries(entries));
    return;
  }
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
      let query = supabase.from(table).select(COLUMNS[table])
        .order('updated_at', { ascending: true })
        .range(offset, offset + PAGE - 1);
      if (from !== null) query = query.gte('updated_at', from);

      const { data, error } = await query;
      if (error !== null) throw error;
      const rows = (data ?? []) as unknown as Record<string, unknown>[];
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
