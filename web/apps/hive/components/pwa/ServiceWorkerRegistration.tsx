'use client';

import { useEffect } from 'react';

/**
 * Enregistre le service worker.
 *
 * Uniquement en production : en développement, un worker qui met en cache les
 * pages masque les modifications qu'on vient d'écrire.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    // Après le chargement : l'enregistrement se dispute sinon la bande
    // passante avec le rendu de la page, ce qui se voit sur un réseau lent.
    const register = (): void => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        // Échec sans conséquence : le site fonctionne, il n'est simplement
        // pas disponible hors-ligne.
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
