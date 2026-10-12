'use client';

/**
 * Rappels par notifications push (Web Push).
 *
 * Côté appareil : demander la permission, s'abonner auprès du service push
 * du navigateur, puis confier l'abonnement et les heures de rappel au
 * serveur (`sowly_push_register`). L'envoi, lui, est fait par l'Edge
 * Function `sowly-push`, toutes les 15 minutes — voir la migration
 * 20261012100100_sowly_push.sql.
 *
 * iPhone : Safari n'accorde les notifications qu'à une app installée sur
 * l'écran d'accueil (iOS 16.4+). Dans l'onglet, `PushManager` n'existe pas :
 * on le dit, au lieu d'afficher un bouton qui ne ferait rien.
 *
 * Les réglages (heures, matin / soir) sont gardés aussi dans le
 * `localStorage` : l'écran les affiche sans attendre le réseau.
 */

import { useSyncExternalStore } from 'react';
import { VAPID_PUBLIC_KEY } from './config.ts';

export type PushState =
  | 'unsupported'   // navigateur sans Web Push
  | 'ios-install'   // iPhone, app pas installée : il faut l'installer d'abord
  | 'denied'        // notifications bloquées pour le site
  | 'off'           // possible, pas activé
  | 'on';           // abonné sur cet appareil

export interface ReminderPrefs {
  morningEnabled: boolean;
  morningAt: string; // « 08:00 »
  eveningEnabled: boolean;
  eveningAt: string;
}

export const DEFAULT_REMINDERS: ReminderPrefs = {
  morningEnabled: true, morningAt: '08:00', eveningEnabled: true, eveningAt: '20:00',
};

const PREFS_KEY = 'sowly.reminders';

export function readReminderPrefs(): ReminderPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw === null ? DEFAULT_REMINDERS : { ...DEFAULT_REMINDERS, ...(JSON.parse(raw) as Partial<ReminderPrefs>) };
  } catch {
    return DEFAULT_REMINDERS;
  }
}

function writeReminderPrefs(prefs: ReminderPrefs): void {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* session seulement */ }
}

// ---------------------------------------------------------------------------
// État

let state: PushState | null = null;
const listeners = new Set<() => void>();

function set(next: PushState): void {
  state = next;
  for (const l of listeners) l();
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

async function detect(): Promise<PushState> {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) return isIos() && !isStandalone() ? 'ios-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription != null && Notification.permission === 'granted' ? 'on' : 'off';
}

/** État des rappels sur cet appareil ; `null` tant qu'il n'est pas connu. */
export function usePushState(): PushState | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      if (state === null) void detect().then(set).catch(() => set('unsupported'));
      return () => listeners.delete(l);
    },
    () => state,
    () => null,
  );
}

// ---------------------------------------------------------------------------
// Actions

export class PushError extends Error {
  constructor(public reason: 'denied' | 'server' | 'unavailable', message: string) {
    super(message);
  }
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function register(subscription: PushSubscription, prefs: ReminderPrefs): Promise<void> {
  const json = subscription.toJSON();
  const { getSupabaseClient } = await import('./supabase/client.ts');
  const { error } = await getSupabaseClient().rpc('sowly_push_register', {
    p_endpoint: subscription.endpoint,
    p_p256dh: json.keys?.p256dh ?? '',
    p_auth: json.keys?.auth ?? '',
    p_time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Abidjan',
    p_morning_enabled: prefs.morningEnabled,
    p_morning_at: prefs.morningAt,
    p_evening_enabled: prefs.eveningEnabled,
    p_evening_at: prefs.eveningAt,
  });
  if (error !== null) {
    // Fonction absente : la migration n'est pas encore en base.
    const missing = error.code === 'PGRST202' || error.code === '42883';
    throw new PushError(missing ? 'unavailable' : 'server', error.message);
  }
}

/**
 * Active les rappels. À appeler dans le gestionnaire du toucher : la
 * demande de permission n'est accordée qu'à un geste (et iOS la refuse
 * sinon, définitivement pour la session).
 */
export async function enablePush(): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    set(permission === 'denied' ? 'denied' : 'off');
    throw new PushError('denied', 'Permission refusée');
  }
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription()
    ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(VAPID_PUBLIC_KEY),
    });
  try {
    await register(subscription, readReminderPrefs());
  } catch (e) {
    // Pas enregistré côté serveur : on ne garde pas un abonnement muet.
    await subscription.unsubscribe().catch(() => undefined);
    set('off');
    throw e;
  }
  set('on');
}

export async function disablePush(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription != null) {
    const { getSupabaseClient } = await import('./supabase/client.ts');
    // Sans réseau, la ligne restera côté serveur : le premier envoi vers un
    // abonnement résilié (410) la supprimera.
    await getSupabaseClient().from('sowly_push_subscriptions').delete().eq('endpoint', subscription.endpoint);
    await subscription.unsubscribe();
  }
  set('off');
}

/** Enregistre de nouvelles heures (local tout de suite, serveur si abonné). */
export async function saveReminderPrefs(prefs: ReminderPrefs): Promise<void> {
  writeReminderPrefs(prefs);
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription != null) await register(subscription, prefs);
}

/** Notification d'essai, affichée par l'appareil lui-même : vérifie l'affichage. */
export async function testNotification(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification('Sowly est prêt', {
    body: 'C’est ainsi que tes rappels apparaîtront.',
    icon: '/icon-192.png',
    badge: '/favicon-48.png',
    tag: 'sowly-test',
  });
}
