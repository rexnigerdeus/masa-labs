import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Client Supabase côté serveur.
 *
 * La session vit dans des cookies httpOnly gérés par `@supabase/ssr` : le jeton
 * n'est jamais exposé au JavaScript de la page, et les composants serveur comme
 * les routes lisent la même session.
 */
export async function createClient(): Promise<SupabaseClient> {
  const store = await cookies();

  return createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) store.set(name, value, options);
          } catch {
            // Écriture impossible depuis un composant serveur rendu en lecture
            // seule. Sans conséquence : le middleware rafraîchit la session à
            // chaque requête, c'est lui qui pose les cookies.
          }
        },
      },
    },
  );
}

/**
 * Utilisateur connecté, ou `null`.
 *
 * On passe par `getUser()` et non `getSession()` : `getUser()` fait valider le
 * jeton par le serveur d'auth, alors que `getSession()` se contente de lire le
 * cookie — que n'importe qui peut forger. La différence compte ici, puisque
 * c'est ce qui garde la porte de l'export.
 */
export async function currentUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error !== null ? null : data.user;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(
      `Variable d'environnement ${name} absente. Copiez .env.example en .env.local.`,
    );
  }
  return value;
}
