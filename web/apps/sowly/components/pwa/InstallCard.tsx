'use client';

import { useEffect, useState } from 'react';
import { dismissInstall, isInstallDismissed, useInstallPrompt } from '@everyday/pwa';
import { CloseIcon } from '../icons';
import { Button } from '../ui';

const APP = 'sowly';

/**
 * Proposition d'installer Sowly sur l'écran d'accueil (logique commune :
 * `@everyday/pwa`). Une app d'habitudes s'ouvre plusieurs fois par jour :
 * l'icône sur l'écran d'accueil, c'est le geste qui la rend quotidienne. Sur
 * iPhone, c'est aussi la condition pour recevoir des rappels (lot 2).
 *
 *   card      carte refermable (Aujourd'hui, page d'entrée) — revient après
 *             30 jours si on l'a fermée
 *   settings  contenu d'une section des Réglages, toujours visible tant que
 *             l'app n'est pas installée
 *
 * Rien ne s'affiche si l'app est déjà installée ou si le navigateur ne sait
 * pas l'installer.
 */
export function InstallCard({ variant }: { variant: 'card' | 'settings' }) {
  const { state, install } = useInstallPrompt();
  // Lu après l'hydratation : le serveur ne connaît pas le stockage local.
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => setDismissed(isInstallDismissed(APP)), []);

  if (state === 'installed' || state === 'unsupported') return null;
  if (variant === 'card' && dismissed) return null;

  const body = state === 'available' ? (
    <div className="flex flex-wrap items-center gap-3">
      <p className="flex-1 text-sm text-muted">
        Ajoute Sowly à ton écran d’accueil : il s’ouvre en un geste, comme une app, même sans réseau.
      </p>
      <Button variant="primary" onClick={() => void install()}>
        Installer l’app
      </Button>
    </div>
  ) : (
    <p className="text-sm text-muted">
      Pour l’ajouter à ton écran d’accueil : touche{' '}
      <ShareIcon />{' '}
      <span className="font-medium text-ink">Partager</span>, puis{' '}
      <span className="font-medium text-ink">« Sur l’écran d’accueil »</span>.
    </p>
  );

  if (variant === 'settings') return body;

  return (
    <aside className="card flex items-start gap-3 p-4">
      <div className="flex flex-1 flex-col gap-1">
        <p className="font-display text-[15px] font-semibold">Installer Sowly</p>
        {body}
      </div>
      <button
        type="button"
        onClick={() => { dismissInstall(APP); setDismissed(true); }}
        aria-label="Ne plus proposer pour le moment"
        className="-m-1 p-1 text-faint hover:text-muted"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </aside>
  );
}

/** Le pictogramme « Partager » d'iOS, pour qu'on le reconnaisse dans Safari. */
function ShareIcon() {
  return (
    <svg aria-label="(icône carré avec une flèche vers le haut)" viewBox="0 0 24 24" className="inline h-4 w-4 align-[-3px] text-ink" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M7 10H6a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2h-1" />
    </svg>
  );
}
