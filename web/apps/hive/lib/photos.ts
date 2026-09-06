'use client';

/**
 * Préparation des photos avant envoi.
 *
 * C'est la fonction la plus déterminante du produit pour la cible : une photo
 * sortie d'un téléphone pèse 4 à 8 Mo, et l'envoyer telle quelle sur un
 * forfait abidjanais fait abandonner la publication en cours de route. On
 * redimensionne et on recompresse dans le navigateur — l'annonce part en
 * quelques dizaines de kilo-octets, et le bucket refuse de toute façon
 * au-delà de 1 Mo.
 */

import { MAX_PHOTOS, PHOTO_MAX_EDGE, PHOTO_QUALITY } from './limits.ts';

export { MAX_PHOTOS };

export async function compressPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (context === null) {
    bitmap.close();
    throw new Error('Impossible de préparer la photo sur cet appareil.');
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY);
  });
  if (blob === null) throw new Error('Impossible de compresser la photo.');

  return new File([blob], `${crypto.randomUUID()}.jpg`, { type: 'image/jpeg' });
}
