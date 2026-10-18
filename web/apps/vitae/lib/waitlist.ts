'use server';

import { createClient } from './supabase/server';
import { normalizePhone } from './phone';

/**
 * Inscription à une liste d'attente (brief v2, « Listes d'attente »).
 *
 * Écrit avec la session du visiteur (rôle anon ou authenticated) : la base
 * n'accepte l'insertion qu'avec le consentement coché et un produit connu, et
 * personne ne peut relire la liste depuis une app. Le consentement est vérifié
 * ici aussi, pour répondre par un message plutôt que par une erreur SQL.
 */

export type WaitlistProduct = 'cv_cible' | 'pass' | 'concours';

export interface WaitlistState {
  status: 'idle' | 'ok' | 'error';
  message?: string;
  /** Champ en faute, pour poser `aria-invalid` au bon endroit. */
  field?: 'phone' | 'consent';
}

const PRODUCTS = new Set<WaitlistProduct>(['cv_cible', 'pass', 'concours']);

/** Réponses autorisées par liste : rien d'autre n'entre dans `details`. */
const ANSWERS: Partial<Record<WaitlistProduct, { name: string; values: string[] }>> = {
  concours: {
    name: 'concours',
    values: ['Fonction publique', 'Grandes écoles', 'Police ou gendarmerie', 'Enseignement', 'Autre'],
  },
};

export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  const product = String(form.get('product') ?? '') as WaitlistProduct;
  if (!PRODUCTS.has(product)) {
    return { status: 'error', message: 'Liste inconnue.' };
  }
  const phone = normalizePhone(String(form.get('phone') ?? ''));
  if (phone === null) {
    return {
      status: 'error',
      field: 'phone',
      message: 'Écrivez un numéro ivoirien à 10 chiffres, par exemple 07 00 00 00 00.',
    };
  }
  if (form.get('consent') !== 'on') {
    return {
      status: 'error',
      field: 'consent',
      message: 'Cochez la case pour que nous puissions vous écrire.',
    };
  }

  const details: Record<string, unknown> = {};
  const placement = String(form.get('placement') ?? '').slice(0, 40);
  if (placement !== '') details.emplacement = placement;
  const answers = ANSWERS[product];
  if (answers !== undefined) {
    details[answers.name] = form.getAll(answers.name)
      .map(String)
      .filter((v) => answers.values.includes(v));
  }

  const supabase = await createClient();
  const { error } = await supabase.from('waitlist').insert({
    product,
    phone,
    consent: true,
    details,
  });

  // Déjà inscrit à cette liste : pour la personne, c'est le même résultat.
  if (error !== null && error.code !== '23505') {
    return {
      status: 'error',
      message: 'L’inscription n’a pas abouti. Réessayez dans un instant.',
    };
  }
  return { status: 'ok' };
}
