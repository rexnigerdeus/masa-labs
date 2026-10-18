import { notFound } from 'next/navigation';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient, currentUser } from './supabase/server';

/**
 * Garde des pages d'administration.
 *
 * Le rôle vit en base (`vitae_admins`, lu par `vitae_is_admin()`) et chaque
 * fonction d'administration le revérifie : cette garde ne sert qu'à ne pas
 * afficher une page vide. Un visiteur sans le rôle reçoit un 404, pas un
 * « accès refusé » : rien n'indique que la page existe.
 */
export async function requireAdmin(): Promise<{ user: User; supabase: SupabaseClient }> {
  const user = await currentUser();
  if (user === null) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('vitae_is_admin');
  if (error !== null || data !== true) notFound();
  return { user, supabase };
}
