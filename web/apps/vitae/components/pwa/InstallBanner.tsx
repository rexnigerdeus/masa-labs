'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { dismissInstall, isInstallDismissed, useInstallPrompt } from '@everyday/pwa';

const APP = 'vitae';

/**
 * Proposition d'installer Vitae sur l'écran d'accueil, sous l'en-tête
 * (logique commune : `@everyday/pwa`).
 *
 * Masquée dans l'éditeur (`/cv`), un parcours où l'on ne doit être distrait de rien.
 *
 * Dans le flux de la page, jamais en surimpression : elle ne cache aucun
 * bouton. Sous l'en-tête en général ; en bas de page sur l'accueil, où elle
 * couperait le hero plein écran (`placement`, une instance de chaque dans le
 * layout). Refermée, elle ne revient pas avant 30 jours. Rien ne s'affiche si
 * l'app est déjà installée ou si le navigateur ne sait pas l'installer.
 */
export function InstallBanner({ placement }: { placement: 'top' | 'bottom' }) {
  const pathname = usePathname();
  const { state, install } = useInstallPrompt();
  // Lu après l'hydratation : le serveur ne connaît pas le stockage local.
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => setDismissed(isInstallDismissed(APP)), []);

  const home = pathname === '/';
  if (dismissed || pathname.startsWith('/cv') || (placement === 'top') === home) return null;
  if (state !== 'available' && state !== 'ios') return null;

  return (
    <aside className={`mx-auto flex max-w-6xl items-start gap-3 px-4 ${placement === 'top' ? 'mt-4' : 'mt-10'}`}>
      <div className="card flex flex-1 flex-wrap items-center gap-3 px-4 py-3 text-sm">
        <p className="min-w-0 flex-1">
          <span className="font-semibold">Installez Vitae</span>{' '}
          <span className="text-muted">
            {state === 'available'
              ? 'sur votre écran d’accueil : il s’ouvre en un geste, comme une application.'
              : 'sur votre écran d’accueil : touchez Partager, puis « Sur l’écran d’accueil ».'}
          </span>
        </p>
        {state === 'available' ? (
          <button
            type="button"
            onClick={() => void install()}
            className="rounded-full px-4 py-2 text-sm font-medium bg-accent text-header hover:bg-accent-dark"
          >
            Installer
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => { dismissInstall(APP); setDismissed(true); }}
          aria-label="Ne plus proposer pour le moment"
          className="rounded-full px-2 py-1 text-muted hover:text-ink"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
