'use client';

/**
 * Installation de l'application sur l'écran d'accueil, commune à Vitae,
 * Hive et Sowly.
 *
 * Le navigateur sait qu'une PWA est installable (manifeste + service
 * worker), mais la plupart des gens ne trouvent jamais l'option, rangée dans
 * un menu. On la propose donc nous-mêmes, au bon endroit, avec deux cas :
 *
 *   - Chrome, Edge, Samsung Internet (Android, ordinateur) : ils émettent
 *     `beforeinstallprompt`. On le garde de côté et on déclenche la vraie
 *     fenêtre d'installation au clic sur notre bouton ;
 *   - iPhone et iPad : aucun événement, aucune API. Seule une consigne
 *     marche — « Partager », puis « Sur l'écran d'accueil ».
 *
 * L'événement est écouté dès le chargement du module, pas au montage d'un
 * composant : le navigateur l'émet souvent avant que React ait fini
 * d'hydrater, et il ne le réémet pas.
 *
 * Les apps fournissent leur propre bouton (couleurs, texte, emplacement) ;
 * ce module ne porte que la logique.
 */

import { useCallback, useSyncExternalStore } from 'react';

/** L'événement n'est pas encore dans les types du DOM. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 *   available    le navigateur peut afficher sa fenêtre d'installation
 *   ios          iPhone / iPad : seule la consigne manuelle fonctionne
 *   installed    déjà ouverte comme application installée
 *   unsupported  rien à proposer (Firefox ordinateur, navigateur intégré…)
 */
export type InstallState = 'available' | 'ios' | 'installed' | 'unsupported';

let deferred: BeforeInstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();

const notify = (): void => { for (const l of listeners) l(); };

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Empêche la mini-barre automatique de Chrome : c'est notre bouton qui
    // proposera l'installation, au moment où elle a du sens.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    justInstalled = true;
    notify();
  });
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    // Safari iOS, qui ne connaît pas `display-mode`.
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  // Les iPad récents se présentent comme des Mac : on les reconnaît à l'écran tactile.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function snapshot(): InstallState {
  if (justInstalled || isStandalone()) return 'installed';
  if (deferred !== null) return 'available';
  if (isIos()) return 'ios';
  return 'unsupported';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface InstallPrompt {
  state: InstallState;
  /** Ouvre la fenêtre d'installation du navigateur. `true` si acceptée. */
  install: () => Promise<boolean>;
}

export function useInstallPrompt(): InstallPrompt {
  // Côté serveur et pendant l'hydratation : rien à proposer, aucun écart de rendu.
  const state = useSyncExternalStore(subscribe, snapshot, () => 'unsupported' as const);

  const install = useCallback(async (): Promise<boolean> => {
    const event = deferred;
    if (event === null) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    // Un événement ne sert qu'une fois ; Chrome en réémettra un plus tard
    // si la proposition a été refusée.
    deferred = null;
    notify();
    return outcome === 'accepted';
  }, []);

  return { state, install };
}

// ---------------------------------------------------------------------------

const DISMISS_PREFIX = 'pwa.install.dismissed.';

/**
 * Proposition refermée récemment ? On ne la remontre pas avant `days` jours :
 * insister à chaque visite transformerait un service en harcèlement.
 */
export function isInstallDismissed(app: string, days = 30): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_PREFIX + app));
    return Number.isFinite(at) && at > 0 && Date.now() - at < days * 86_400_000;
  } catch {
    return false;
  }
}

export function dismissInstall(app: string): void {
  try {
    localStorage.setItem(DISMISS_PREFIX + app, String(Date.now()));
  } catch {
    // Stockage refusé : la proposition reviendra à la prochaine visite.
  }
}
