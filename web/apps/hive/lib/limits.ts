/**
 * Limites partagées entre le serveur et le navigateur.
 *
 * Dans un module neutre : `lib/photos.ts` porte la directive `'use client'`,
 * et importer une constante depuis un module client dans du code serveur
 * donnerait une référence client, pas la valeur.
 */

/** Cinq photos suffisent à décrire un matériel, et bornent le poids d'une annonce. */
export const MAX_PHOTOS = 5;

/** 1280 px de côté long : net sur mobile comme sur un écran d'ordinateur. */
export const PHOTO_MAX_EDGE = 1280;

export const PHOTO_QUALITY = 0.75;
