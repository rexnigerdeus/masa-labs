'use client';

import { useEffect } from 'react';
import { captureAttribution, track, trackVisit, type ClientEvent, type EventProps } from '../lib/analytics';

/**
 * Amorce de la mesure, posée une fois dans le gabarit.
 *
 * 1. Lit `?ref=` et les UTM dès l'arrivée, sur n'importe quelle page : un lien
 *    d'ambassadeur peut pointer vers /offres autant que vers l'accueil.
 * 2. Compte une visite par session (pour le « retour sous 30 jours »).
 * 3. Écoute les clics sur les éléments marqués `data-track` : les liens
 *    « Postuler » et « Rejoindre la chaîne WhatsApp » vivent dans des pages
 *    serveur sans JavaScript, et doivent le rester. Un seul écouteur ici
 *    plutôt qu'un composant client par lien.
 *
 *      <a data-track="offer_clicked" data-track-props='{"offre":"…"}'>
 */
const TRACKABLE = new Set<ClientEvent>([
  'offer_clicked', 'whatsapp_channel_clicked', 'checkout_started',
]);

export function AnalyticsBoot() {
  useEffect(() => {
    captureAttribution();
    trackVisit();

    const onClick = (e: MouseEvent): void => {
      const target = (e.target as Element | null)?.closest?.('[data-track]');
      if (!(target instanceof HTMLElement)) return;
      const name = target.dataset.track as ClientEvent | undefined;
      if (name === undefined || !TRACKABLE.has(name)) return;
      let props: EventProps = {};
      try {
        props = JSON.parse(target.dataset.trackProps ?? '{}') as EventProps;
      } catch {
        // Propriétés illisibles : l'événement part sans elles.
      }
      track(name, props);
    };
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}
