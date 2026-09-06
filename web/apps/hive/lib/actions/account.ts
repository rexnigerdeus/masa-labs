'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, currentUser } from '../supabase/server';
import { COMMUNES } from '../catalog';

export type FormState = { error: string } | { ok: true } | null;

/**
 * Enregistrement du profil.
 *
 * Deux tables : le nom vit dans `profiles`, partagée avec les autres
 * applications de la base ; la commune et les modes de paiement dans
 * `hive_profiles`, qui n'intéresse que Hive.
 */
export async function saveAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  if (user === null) redirect('/connexion?suite=/compte');

  const fullName = String(form.get('full_name') ?? '').trim();
  const commune = String(form.get('commune') ?? '');
  const bio = String(form.get('bio') ?? '').trim();

  if (fullName.length < 2) return { error: 'Indiquez le nom sous lequel on vous verra.' };
  if (commune !== '' && !COMMUNES.includes(commune)) return { error: 'Commune inconnue.' };

  const supabase = await createClient();

  const { error: nameError } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id);
  if (nameError !== null) return { error: `Enregistrement impossible : ${nameError.message}` };

  const { error } = await supabase.from('hive_profiles').upsert({
    user_id: user.id,
    commune: commune === '' ? null : commune,
    bio: bio === '' ? null : bio,
    accepts_cash: form.get('accepts_cash') === 'on',
    // Le loueur peut cocher le paiement en ligne dès maintenant ; il ne sera
    // proposé aux clients qu'une fois la plateforme raccordée à l'agrégateur.
    accepts_online: form.get('accepts_online') === 'on',
  });

  if (error !== null) return { error: `Enregistrement impossible : ${error.message}` };

  revalidatePath('/compte');
  return { ok: true };
}
