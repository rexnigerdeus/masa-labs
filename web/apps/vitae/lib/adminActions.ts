'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from './admin';

/**
 * Gestes d'administration. Chacun repasse par `requireAdmin`, et la base
 * revérifie le rôle (politiques et fonctions `security definer`) : une action
 * serveur s'appelle de n'importe où, elle ne fait pas confiance à la page qui
 * l'affiche.
 */

/** Publier ou refuser une offre déposée via /publier-une-offre. */
export async function moderateOffer(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = String(form.get('id') ?? '');
  const publish = form.get('decision') === 'publier';
  await supabase.rpc('vitae_moderate_offer', { p_offer_id: id, p_publish: publish });
  revalidatePath('/admin/offres');
  revalidatePath('/offres');
}

/** Crée un code ambassadeur ; le jeton est tiré par la base. */
export async function createAmbassador(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const code = String(form.get('code') ?? '').trim().toUpperCase();
  const firstName = String(form.get('first_name') ?? '').trim();
  const school = String(form.get('school') ?? '').trim();
  if (!/^[A-Z0-9_-]{2,40}$/.test(code) || firstName === '') return;
  await supabase.from('vitae_ambassadors').insert({
    code,
    first_name: firstName.slice(0, 60),
    school: school === '' ? null : school.slice(0, 120),
  });
  revalidatePath('/admin/ambassadeurs');
}

export async function toggleAmbassador(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const code = String(form.get('code') ?? '');
  const active = form.get('active') === 'true';
  await supabase.from('vitae_ambassadors').update({ active }).eq('code', code);
  revalidatePath('/admin/ambassadeurs');
}

/** « Retirer le droit » après un remboursement fait dans l'espace marchand Wave. */
export async function revokeEntitlement(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  await supabase.rpc('vitae_revoke_entitlement', { p_entitlement: String(form.get('id') ?? '') });
  revalidatePath('/admin/droits');
}

/** Droit accordé à la main (paiement reçu hors Wave, geste commercial). */
export async function grantEntitlementManually(form: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const user = String(form.get('user_id') ?? '').trim();
  const type = String(form.get('type') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(user)) return;
  await supabase.rpc('vitae_admin_grant', { p_user: user, p_type: type });
  revalidatePath('/admin/droits');
}
