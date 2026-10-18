'use server';

import { normalizePhone } from '../phone';
import { publicClient } from '../supabase/public';

export type WaitlistState = { error: string } | { ok: true } | null;

/**
 * Inscription à la liste d'attente de Hive — la seule écriture encore
 * ouverte pendant la pause.
 *
 * Table `waitlist` (numéro, date, consentement, produit = 'hive'), sans
 * autre usage : on préviendra une fois, au retour de Hive. Le client anonyme
 * suffit, la RLS n'autorise que l'insertion avec consentement et personne
 * ne peut relire la table depuis une app.
 *
 * Le consentement est vérifié ici ET en base (CHECK) : la case décochée par
 * défaut est une exigence, pas une préférence d'interface.
 */
export async function joinWaitlist(_prev: WaitlistState, form: FormData): Promise<WaitlistState> {
  if (form.get('consent') !== 'on') {
    return { error: 'Coche la case pour qu’on puisse te prévenir.' };
  }
  const phone = normalizePhone(String(form.get('phone') ?? ''));
  if (phone === null) {
    return { error: 'Ce numéro ne ressemble pas à un numéro ivoirien à dix chiffres.' };
  }

  const { error } = await publicClient()
    .from('waitlist')
    .insert({ product: 'hive', phone, consent: true });

  // Déjà inscrit (contrainte d'unicité) : c'est un succès pour la personne.
  if (error !== null && error.code !== '23505') {
    return { error: 'Inscription impossible pour le moment. Réessaie un peu plus tard.' };
  }
  return { ok: true };
}
