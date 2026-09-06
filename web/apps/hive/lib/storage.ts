/**
 * URL publique d'une photo d'annonce.
 *
 * La base ne stocke que le chemin dans le bucket : le projet Supabase peut
 * changer d'adresse, les chemins non. On reconstruit l'URL ici plutôt que
 * d'appeler `getPublicUrl()`, qui demanderait un client Supabase là où une
 * concaténation suffit — y compris dans un composant serveur statique.
 */

export const PHOTO_BUCKET = 'hive-listings';

export function photoUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

/** Première photo d'une annonce, ou `null` — toutes les annonces n'en ont pas. */
export function coverUrl(photos: string[]): string | null {
  const first = photos[0];
  return first === undefined ? null : photoUrl(first);
}
