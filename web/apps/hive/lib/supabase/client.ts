'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase côté navigateur.
 *
 * Instance unique : plusieurs clients concurrents se disputent le
 * rafraîchissement du jeton et finissent par se déconnecter mutuellement.
 */
let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client === null) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    );
  }
  return client;
}
