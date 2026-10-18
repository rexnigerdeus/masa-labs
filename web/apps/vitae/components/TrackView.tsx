'use client';

import { useEffect } from 'react';
import { track, type ClientEvent, type EventProps } from '../lib/analytics';

/**
 * Compte l'affichage d'un écran rendu côté serveur (« page Tarifs affichée »,
 * « écran 2e CV affiché »). Une fois par montage ; aucun rendu.
 */
export function TrackView({ event, props }: { event: ClientEvent; props?: EventProps }) {
  const key = JSON.stringify(props ?? {});
  useEffect(() => {
    track(event, JSON.parse(key) as EventProps);
  }, [event, key]);
  return null;
}
