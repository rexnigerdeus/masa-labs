'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase — le seul de l'application.
 *
 * Vitae et Hive ont trois clients (serveur, navigateur, public) parce que
 * leurs pages serveur lisent des données. Sowly n'en lit aucune côté
 * serveur : toutes ses pages sont des coquilles statiques, mises en cache
 * par le service worker, et les données vivent dans le navigateur
 * (`lib/store.ts`). Un client serveur ne servirait qu'à rendre les pages
 * dynamiques — donc inutilisables hors-ligne.
 *
 * Instance unique : plusieurs clients concurrents se disputent le
 * rafraîchissement du jeton et finissent par se déconnecter mutuellement.
 * Ce client rafraîchit lui-même la session, d'où l'absence de middleware.
 */
let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client === null) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url === undefined || url === '' || key === undefined || key === '') {
      // Échec bruyant : sans base, ni compte ni synchronisation — mieux vaut
      // le voir tout de suite en développement que lire un 401 plus tard.
      throw new Error(
        'Variables NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY absentes. '
        + 'Copiez .env.example en .env.local.',
      );
    }
    client = createBrowserClient(url, key);
  }
  return client;
}
