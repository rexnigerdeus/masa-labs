import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase avec la clé de service, qui ignore la RLS.
 *
 * Un seul usage : le webhook Wave, qui doit accorder un droit sans session
 * d'utilisateur (`vitae_grant_entitlement` n'est exécutable que par
 * `service_role`). Ne jamais l'importer depuis un composant client ni une
 * page : la clé ne doit exister que dans les variables serveur de Vercel.
 */
export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url === undefined || url === '' || key === undefined || key === '') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY absente : le webhook Wave ne peut pas accorder de droit.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
