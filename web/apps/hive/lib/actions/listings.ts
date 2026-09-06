'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, currentUser } from '../supabase/server';
import { CATEGORY_LABELS, COMMUNES } from '../catalog';
import { MAX_PHOTOS } from '../limits';

/** Résultat rendu sous le formulaire ; `null` tant que rien n'a été soumis. */
export type FormState = { error: string } | null;

/**
 * Publication d'une annonce.
 *
 * Publiée immédiatement, sans validation manuelle (brief §3.8) : au
 * lancement, faire attendre un loueur c'est le perdre. Le contrôle est a
 * posteriori, par signalement.
 *
 * Les photos sont déjà dans le bucket quand cette action s'exécute : le
 * navigateur les a compressées et envoyées une par une, ce qui laisse voir
 * l'avancement plutôt que de bloquer sur un seul envoi de plusieurs Mo.
 */
export async function publishListing(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  if (user === null) redirect('/connexion?suite=/publier');

  const title = String(form.get('title') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();
  const categoryId = String(form.get('category_id') ?? '');
  const condition = String(form.get('condition') ?? 'occasion');
  const commune = String(form.get('commune') ?? '');
  const forRent = form.get('for_rent') === 'on';
  const forSale = form.get('for_sale') === 'on';

  if (title.length < 3) return { error: 'Donnez un titre d’au moins trois caractères.' };
  if (CATEGORY_LABELS[categoryId] === undefined) return { error: 'Choisissez une catégorie.' };
  if (!COMMUNES.includes(commune)) return { error: 'Choisissez une commune.' };
  if (!forRent && !forSale) {
    return { error: 'Indiquez si le matériel est à louer, à vendre, ou les deux.' };
  }

  const rentDay = parseAmount(form.get('rent_price_day'));
  const rentWeek = parseAmount(form.get('rent_price_week'));
  const salePrice = parseAmount(form.get('sale_price'));

  // Les mêmes règles que les contraintes CHECK de la base, énoncées ici pour
  // que l'utilisateur lise une phrase plutôt qu'une erreur Postgres.
  if (forRent && rentDay === null) return { error: 'Indiquez le prix de la location par jour.' };
  if (forSale && salePrice === null) return { error: 'Indiquez le prix de vente.' };

  const photos = parsePhotos(form.get('photos'), user.id);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('hive_listings')
    .insert({
      user_id: user.id,
      title,
      description,
      category_id: categoryId,
      condition: condition === 'neuf' ? 'neuf' : 'occasion',
      commune,
      for_rent: forRent,
      for_sale: forSale,
      rent_price_day: forRent ? rentDay : null,
      rent_price_week: forRent ? rentWeek : null,
      sale_price: forSale ? salePrice : null,
      photos,
    })
    .select('id')
    .single();

  if (error !== null) return { error: `Publication impossible : ${error.message}` };

  revalidatePath('/');
  revalidatePath('/annonces');
  redirect(`/annonces/${data.id}`);
}

/**
 * Retirer ou remettre en ligne une annonce.
 *
 * On ne supprime pas : une annonce effacée emporterait les commandes qui la
 * référencent, et le loueur comme le client ont besoin de retrouver ce qui
 * s'est passé.
 */
export async function setListingStatus(form: FormData): Promise<void> {
  const user = await currentUser();
  if (user === null) redirect('/connexion?suite=/mes-annonces');

  const id = String(form.get('id') ?? '');
  const status = form.get('status') === 'publie' ? 'publie' : 'retire';

  const supabase = await createClient();
  // Le filtre sur `user_id` double la RLS : elle empêcherait déjà l'écriture,
  // mais l'expliciter évite un `update` silencieusement vide à la relecture.
  await supabase.from('hive_listings').update({ status }).eq('id', id).eq('user_id', user.id);

  revalidatePath('/mes-annonces');
  revalidatePath(`/annonces/${id}`);
}

/** Montant en FCFA entier, ou `null` si le champ est vide ou aberrant. */
function parseAmount(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const digits = String(value).replace(/\s/g, '');
  if (digits === '') return null;
  const amount = Number(digits);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null;
}

/**
 * Chemins des photos envoyées par le navigateur.
 *
 * On vérifie que chaque chemin commence par le dossier de l'utilisateur : la
 * policy de stockage l'imposait déjà à l'envoi, mais rien n'empêcherait
 * autrement d'inscrire dans son annonce la photo de quelqu'un d'autre.
 */
function parsePhotos(value: FormDataEntryValue | null, userId: string): string[] {
  if (value === null) return [];
  try {
    const parsed: unknown = JSON.parse(String(value));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is string => typeof p === 'string' && p.startsWith(`${userId}/`))
      .slice(0, MAX_PHOTOS);
  } catch {
    return [];
  }
}
