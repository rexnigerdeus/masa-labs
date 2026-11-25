'use client';

/**
 * Retours haptiques et sonores des gestes de récompense : valider une
 * habitude, terminer une tâche, boucler sa journée.
 *
 * Haptique :
 *   - Android (et tout navigateur qui l'expose) : `navigator.vibrate` ;
 *   - iPhone : Safari n'a pas `vibrate`, mais depuis iOS 18 basculer un
 *     interrupteur `<input type="checkbox" switch>` déclenche le retour
 *     haptique du système. On garde un interrupteur invisible et on le
 *     bascule — uniquement dans le gestionnaire d'un toucher, sans quoi iOS
 *     l'ignore.
 *
 * Son : synthétisé avec Web Audio (aucun fichier à télécharger ni à mettre
 * en cache), quelques dizaines de millisecondes, volume bas. La session
 * audio est déclarée « ambient » là où Safari le permet : le son respecte
 * alors le mode silencieux du téléphone et ne coupe pas la musique en cours.
 *
 * Les deux se coupent dans les Réglages ; le choix vit sur l'appareil.
 */

export type Feedback = 'habit' | 'task' | 'complete';

const PREFS_KEY = 'sowly.feedback';

export interface FeedbackPrefs {
  sound: boolean;
  haptics: boolean;
  /** Sonnerie des rappels plein écran. */
  alarm: boolean;
}

const DEFAULT_PREFS: FeedbackPrefs = { sound: true, haptics: true, alarm: true };

export function readFeedbackPrefs(): FeedbackPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw === null) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<FeedbackPrefs>;
    return { sound: p.sound !== false, haptics: p.haptics !== false, alarm: p.alarm !== false };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writeFeedbackPrefs(prefs: FeedbackPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Stockage refusé : le réglage vaut pour la session.
  }
  cached = prefs;
}

let cached: FeedbackPrefs | null = null;
const prefs = (): FeedbackPrefs => (cached ??= readFeedbackPrefs());

/** Retour complet d'un geste réussi. À appeler dans le gestionnaire du toucher. */
export function reward(kind: Feedback): void {
  const p = prefs();
  if (p.haptics) haptic(kind);
  if (p.sound) play(kind);
}

// ---------------------------------------------------------------------------
// Haptique

const PATTERNS: Record<Feedback, number | number[]> = {
  habit: 14,
  task: 12,
  complete: [14, 60, 14, 60, 28],
};

let iosSwitch: HTMLLabelElement | null = null;

export function haptic(kind: Feedback = 'task'): void {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(PATTERNS[kind]);
      return;
    }
    // Safari iOS : l'interrupteur système. « complete » le bascule deux fois
    // pour un retour plus marqué.
    if (iosSwitch === null) {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.tabIndex = -1;
      iosSwitch = document.createElement('label');
      iosSwitch.setAttribute('aria-hidden', 'true');
      iosSwitch.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
      iosSwitch.appendChild(input);
      document.body.appendChild(iosSwitch);
    }
    iosSwitch.click();
    if (kind === 'complete') setTimeout(() => iosSwitch?.click(), 90);
  } catch {
    // Sans vibreur ou refusé : le geste reste valable.
  }
}

// ---------------------------------------------------------------------------
// Son

let audio: AudioContext | null = null;

function context(): AudioContext | null {
  if (audio !== null) return audio;
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session !== undefined) session.type = 'ambient';
    const Ctor = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    audio = Ctor === undefined ? null : new Ctor();
  } catch {
    audio = null;
  }
  return audio;
}

/** Une note : attaque franche, décroissance douce. */
function note(ctx: AudioContext, freq: number, start: number, length: number, volume: number, type: OscillatorType): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

export function play(kind: Feedback): void {
  const ctx = context();
  if (ctx === null) return;
  // Un contexte créé hors geste démarre suspendu (règle d'autoplay).
  if (ctx.state === 'suspended') void ctx.resume();
  const t = ctx.currentTime + 0.01;
  switch (kind) {
    case 'task':
      // « Pop » montant : la case qui se coche.
      note(ctx, 660, t, 0.09, 0.09, 'triangle');
      note(ctx, 990, t + 0.06, 0.16, 0.08, 'triangle');
      break;
    case 'habit':
      // Clochette chaude, quinte juste : la graine arrosée.
      note(ctx, 523.25, t, 0.32, 0.08, 'sine');
      note(ctx, 783.99, t + 0.05, 0.4, 0.07, 'sine');
      break;
    case 'complete':
      // Arpège do-mi-sol-do : la journée bouclée.
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(ctx, f, t + i * 0.08, 0.45, 0.07, 'sine'));
      break;
  }
}

// ---------------------------------------------------------------------------
// Alarme

/** Débloque le son au premier geste : sans lui, une alarme resterait muette. */
export function unlockAudio(): void {
  const ctx = context();
  if (ctx !== null && ctx.state !== 'running') void ctx.resume().catch(() => undefined);
}

function audioSession(type: 'ambient' | 'playback'): void {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session !== undefined) session.type = type;
  } catch {
    // Safari seulement.
  }
}

const RING_MS = 2400;
const RING_MAX_MS = 60_000;
let ringing: ReturnType<typeof setInterval> | null = null;
let ringEnd: ReturnType<typeof setTimeout> | null = null;

/**
 * Sonnerie en boucle, une minute au plus. Contrairement aux sons de
 * récompense, elle se déclare « playback » : une alarme qu'on a demandée
 * doit s'entendre même téléphone en silencieux, là où Safari le permet.
 */
export function startAlarm(): void {
  stopAlarm();
  const p = prefs();
  const ring = (): void => {
    if (p.haptics && typeof navigator.vibrate === 'function') navigator.vibrate([280, 120, 280, 120, 480]);
    if (!p.alarm) return;
    const ctx = context();
    if (ctx === null) return;
    if (ctx.state !== 'running') {
      // Contexte encore bloqué : programmer des notes maintenant les ferait
      // toutes partir d'un coup au premier geste.
      void ctx.resume().catch(() => undefined);
      return;
    }
    const t = ctx.currentTime + 0.02;
    [659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      note(ctx, f, t + i * 0.19, 0.5, 0.22, 'triangle');
    });
  };
  if (p.alarm) audioSession('playback');
  ring();
  ringing = setInterval(ring, RING_MS);
  ringEnd = setTimeout(stopAlarm, RING_MAX_MS);
}

export function stopAlarm(): void {
  if (ringing === null) return;
  clearInterval(ringing);
  if (ringEnd !== null) clearTimeout(ringEnd);
  ringing = null;
  ringEnd = null;
  if (typeof navigator.vibrate === 'function') navigator.vibrate(0);
  audioSession('ambient');
}
