'use server';

import { redirect } from 'next/navigation';
import { createClient, currentUser } from '../supabase/server';

export type FormState = { error: string } | { ok: true } | null;

/**
 * Signalement d'une annonce.
 *
 * Contrepartie de la publication immédiate (brief §3.8) : rien ne bloque une
 * annonce à la publication, tout se corrige après. Personne ne peut relire
 * les signalements depuis l'application — la table n'a pas de policy de
 * lecture — ils se traitent au SQL Editor tant que l'écran de modération
 * n'existe pas.
 */
export async function reportListing(_prev: FormState, form: FormData): Promise<FormState> {
  const listingId = String(form.get('listing_id') ?? '');
  const reason = String(form.get('reason') ?? '').trim();

  const user = await currentUser();
  if (user === null) redirect(`/connexion?suite=/annonces/${listingId}`);
  if (reason.length < 3) return { error: 'Dites en une phrase ce qui ne va pas.' };

  const supabase = await createClient();
  const { error } = await supabase.from('hive_reports').insert({
    target_type: 'listing',
    target_id: listingId,
    reporter_id: user.id,
    reason: reason.slice(0, 1000),
  });

  // Contrainte d'unicité : on ne signale qu'une fois la même annonce. Le
  // redire comme une erreur serait déroutant, le signalement est bien pris.
  if (error !== null && !error.message.includes('hive_reports_once')) {
    return { error: `Signalement impossible : ${error.message}` };
  }
  return { ok: true };
}
