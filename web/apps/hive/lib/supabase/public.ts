import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase anonyme, sans session.
 *
 * Pour les données publiques : les annonces au statut `publie`, que la policy
 * « Published listings are public » ouvre à tout le monde.
 *
 * Pourquoi ne pas réutiliser le client à cookies : lire les cookies rend la
 * route dynamique et interdit à Next de mettre la page en cache, alors que ces
 * pages sont identiques pour tous les visiteurs. Pire, `cookies()` lève une
 * erreur dans `generateStaticParams`, qui s'exécute au build, hors de toute
 * requête. Une donnée publique se lit avec un client public.
 */
let client: SupabaseClient | null = null;

export function publicClient(): SupabaseClient {
  if (client === null) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      // Aucune session à gérer : ni persistance, ni rafraîchissement, ni
      // lecture de l'URL.
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
  }
  return client;
}
