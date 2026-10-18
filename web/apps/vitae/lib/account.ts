'use server';

import { createClient, currentUser } from './supabase/server';

/**
 * « Supprimer mon compte et mes CV » (brief v2, confidentialité), effectif
 * immédiatement.
 *
 * Tout se passe dans `vitae_delete_my_account()` : CV, lettres et droits
 * effacés, statistiques détachées du compte, paiements conservés pour la
 * comptabilité sans lien vers la personne. Le compte lui-même n'est supprimé
 * que s'il ne sert à aucune autre app de The Everyday Co. (Sowly, Hive…) :
 * la fonction renvoie `compte` ou `donnees` pour que l'écran dise exactement
 * ce qui a été fait.
 */
export interface DeleteOutcome {
  ok: boolean;
  /** `compte` : tout est effacé. `donnees` : données Vitae effacées, compte conservé. */
  scope?: 'compte' | 'donnees';
  error?: string;
}

export async function deleteMyAccount(): Promise<DeleteOutcome> {
  const user = await currentUser();
  if (user === null) return { ok: false, error: 'Session expirée. Reconnectez-vous.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('vitae_delete_my_account');
  if (error !== null) {
    return { ok: false, error: 'La suppression n’a pas abouti. Réessayez dans un instant.' };
  }
  // La session ne survit pas à la suppression : on la ferme proprement.
  await supabase.auth.signOut();
  return { ok: true, scope: data === 'compte' ? 'compte' : 'donnees' };
}
