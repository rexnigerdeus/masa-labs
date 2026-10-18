'use server';

import { redirect } from 'next/navigation';
import { createClient, currentUser } from './supabase/server';

/**
 * Création d'une version ciblée (brief v2, lot B).
 *
 * Toute la règle est dans `vitae_create_cv_version` : droit vérifié et
 * consommé dans la même transaction, copie du CV source avec l'intitulé visé
 * en tête. Cette action ne fait que transmettre et rediriger : un compte sans
 * droit qui l'appellerait directement (ou l'API REST) reçoit un refus de la
 * base, pas une version.
 */
export interface VersionState {
  error?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createVersion(_prev: VersionState, form: FormData): Promise<VersionState> {
  const user = await currentUser();
  if (user === null) redirect('/connexion?suite=/cv/version');

  const source = String(form.get('source') ?? '');
  const title = String(form.get('title') ?? '').trim();
  const offer = String(form.get('offre') ?? '').trim();
  if (!UUID.test(source)) return { error: 'Choisissez le CV à copier.' };
  if (title.length < 2) return { error: 'Écrivez le poste que vous visez avec cette version.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('vitae_create_cv_version', {
    p_source: source,
    p_target_title: title.slice(0, 120),
    p_target_offer_id: offer === '' ? null : offer,
  });
  if (error !== null || typeof data !== 'string') {
    return {
      error: error?.code === 'P0001'
        ? 'Vous n’avez pas de droit actif pour créer une version.'
        : 'La version n’a pas pu être créée. Réessayez dans un instant.',
    };
  }
  redirect(`/cv?id=${data}`);
}
