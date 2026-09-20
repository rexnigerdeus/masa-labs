'use client';

import { useRef, useState } from 'react';
import { Button } from './fields';

/**
 * Photo du CV.
 *
 * En Côte d'Ivoire, un CV sans photo surprend : le champ est proposé dès la
 * première section, pas rangé dans une option. L'interrupteur reste séparé de
 * l'image — on retire la photo d'une candidature sans avoir à la recharger pour
 * la suivante.
 *
 * L'image ne quitte jamais le navigateur avant l'enregistrement du CV : elle
 * est recadrée et compressée ici, puis voyage avec le reste du CV. Pas de
 * bucket, pas d'URL signée, pas de requête supplémentaire à l'ouverture de
 * l'éditeur — et le brouillon local reste complet hors ligne.
 */

/** Côté de l'image stockée, en pixels. */
const SIDE = 512;

/**
 * Recadre au carré, réduit, et encode en JPEG.
 *
 * Une photo de smartphone pèse 3 à 8 Mo : telle quelle elle ferait déborder le
 * quota de `localStorage`, gonflerait la ligne `jsonb` et ralentirait le rendu
 * du PDF. 512 px suffisent largement pour une vignette imprimée à 25 mm.
 */
async function toSquareJpeg(file: File): Promise<string> {
  const source = await loadImage(file);
  const side = Math.min(source.width, source.height);
  const canvas = document.createElement('canvas');
  canvas.width = SIDE;
  canvas.height = SIDE;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('canvas indisponible');
  ctx.drawImage(
    source,
    (source.width - side) / 2, (source.height - side) / 2, side, side,
    0, 0, SIDE, SIDE,
  );
  return canvas.toDataURL('image/jpeg', 0.82);
}

/**
 * Décode le fichier choisi.
 *
 * `createImageBitmap` d'abord — il décode hors du fil principal, ce qui compte
 * sur les mobiles d'entrée de gamme visés par le produit — avec repli sur un
 * `<img>` pour les navigateurs qui ne l'exposent pas.
 */
async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Format refusé par le décodeur natif : on retente avec <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('image illisible'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoField({ photo, showPhoto, fullName, onChange }: {
  photo: string | null;
  showPhoto: boolean;
  fullName: string;
  onChange: (patch: { photo?: string | null; showPhoto?: boolean }) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined): Promise<void> {
    if (file === undefined) return;
    setBusy(true);
    setError(null);
    try {
      onChange({ photo: await toSquareJpeg(file), showPhoto: true });
    } catch {
      setError('Cette image n’a pas pu être lue. Essayez un fichier JPEG ou PNG.');
    } finally {
      setBusy(false);
      // Le champ est vidé pour que choisir deux fois le même fichier déclenche
      // bien un second `change`.
      if (input.current !== null) input.current.value = '';
    }
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">Photo</legend>
      <div className="flex items-center gap-3">
        {photo === null ? (
          <div
            aria-hidden
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-dashed border-line bg-canvas text-2xl text-muted"
          >
            ☺
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={fullName.trim() === '' ? 'Votre photo' : `Photo de ${fullName}`}
            className={`h-20 w-20 shrink-0 rounded-full border border-line object-cover ${
              showPhoto ? '' : 'opacity-40'
            }`}
          />
        )}

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => input.current?.click()}>
              {busy ? 'Traitement…' : photo === null ? 'Ajouter une photo' : 'Changer la photo'}
            </Button>
            {photo === null ? null : (
              <Button variant="ghost" onClick={() => onChange({ photo: null })}>
                Retirer
              </Button>
            )}
          </div>
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Choisir une photo"
            onChange={(e) => void pick(e.target.files?.[0])}
          />
          {photo === null ? null : (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showPhoto}
                onChange={(e) => onChange({ showPhoto: e.target.checked })}
              />
              Afficher la photo sur mon CV
            </label>
          )}
        </div>
      </div>

      {error !== null ? (
        <p role="alert" className="text-xs text-ink">{error}</p>
      ) : (
        <p className="text-xs text-muted">
          Cadrage serré sur le visage, tenue professionnelle, fond neutre. La
          photo reste sur votre appareil tant que vous n’enregistrez pas votre CV.
        </p>
      )}
    </fieldset>
  );
}
