'use client';

import { useActionState, useState } from 'react';
import { publishListing, type FormState } from '../lib/actions/listings';
import { getSupabaseClient } from '../lib/supabase/client';
import { compressPhoto } from '../lib/photos';
import { MAX_PHOTOS } from '../lib/limits';
import { PHOTO_BUCKET, photoUrl } from '../lib/storage';
import { CATEGORIES, COMMUNES, CONDITIONS } from '../lib/catalog';
import { Button, Field, Input, Notice, Select, Textarea } from './ui';

/**
 * Création d'une annonce.
 *
 * Les photos partent au fil de la sélection, pas au moment de valider : sur
 * une connexion lente, un envoi groupé de plusieurs mégaoctets à la
 * soumission donne l'impression que le formulaire a planté. Chacune est
 * compressée dans le navigateur avant l'envoi (lib/photos.ts).
 */
export function PublishForm({ userId, defaultCommune }: {
  userId: string; defaultCommune: string | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(publishListing, null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [forRent, setForRent] = useState(true);
  const [forSale, setForSale] = useState(false);

  async function addPhotos(files: FileList | null): Promise<void> {
    if (files === null || files.length === 0) return;
    setPhotoError(null);
    setUploading(true);

    const supabase = getSupabaseClient();
    const added: string[] = [];

    for (const file of Array.from(files)) {
      if (photos.length + added.length >= MAX_PHOTOS) {
        setPhotoError('Cinq photos au maximum : les suivantes n’ont pas été ajoutées.');
        break;
      }
      try {
        const compressed = await compressPhoto(file);
        // Le dossier porte l'identifiant du propriétaire : c'est ce que la
        // policy de stockage vérifie, personne n'écrit chez quelqu'un d'autre.
        const path = `${userId}/${compressed.name}`;
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, compressed, { contentType: 'image/jpeg' });
        if (error !== null) throw new Error(error.message);
        added.push(path);
      } catch (cause) {
        setPhotoError(`Photo non envoyée : ${(cause as Error).message}`);
      }
    }

    setPhotos((current) => [...current, ...added]);
    setUploading(false);
  }

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5">
      <input type="hidden" name="photos" value={JSON.stringify(photos)} />

      <Field label="Titre de l’annonce" hint="Marque et modèle si vous les connaissez.">
        <Input name="title" required placeholder="Canon EOS R6 + objectif 24-105" />
      </Field>

      <Field label="Description" hint="État, accessoires fournis, conditions de retrait.">
        <Textarea name="description" rows={5} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Catégorie">
          <Select name="category_id" required defaultValue="">
            <option value="" disabled>Choisir…</option>
            {CATEGORIES.map((parent) => (
              <optgroup key={parent.id} label={parent.label}>
                {parent.children.map((child) => (
                  <option key={child.id} value={child.id}>{child.label}</option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>

        <Field label="État">
          <Select name="condition" defaultValue="occasion">
            {CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </Select>
        </Field>

        <Field label="Commune" hint="Là où le matériel se retire.">
          <Select name="commune" required defaultValue={defaultCommune ?? ''}>
            <option value="" disabled>Choisir…</option>
            {COMMUNES.map((commune) => <option key={commune}>{commune}</option>)}
          </Select>
        </Field>
      </div>

      <fieldset className="card flex flex-col gap-4 p-4">
        <legend className="px-1 text-sm font-medium">Location, vente, ou les deux</legend>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="for_rent"
            checked={forRent}
            onChange={(e) => setForRent(e.target.checked)}
          />
          Je propose ce matériel à la location
        </label>

        {forRent ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prix par jour (FCFA)">
              <Input type="number" name="rent_price_day" min={0} step={500} required />
            </Field>
            <Field label="Prix par semaine (FCFA)" hint="Facultatif, souvent plus avantageux.">
              <Input type="number" name="rent_price_week" min={0} step={500} />
            </Field>
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="for_sale"
            checked={forSale}
            onChange={(e) => setForSale(e.target.checked)}
          />
          Je propose ce matériel à la vente
        </label>

        {forSale ? (
          <Field label="Prix de vente (FCFA)">
            <Input type="number" name="sale_price" min={0} step={1000} required />
          </Field>
        ) : null}
      </fieldset>

      <Field
        label={`Photos (${photos.length} sur ${MAX_PHOTOS})`}
        hint="Les photos sont réduites sur votre téléphone avant l’envoi : peu de données consommées."
      >
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading || photos.length >= MAX_PHOTOS}
          onChange={(e) => void addPhotos(e.target.files)}
          className="text-sm"
        />
      </Field>

      {uploading ? <p className="text-sm text-muted">Envoi des photos…</p> : null}
      {photoError !== null ? <Notice>{photoError}</Notice> : null}

      {photos.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {photos.map((path) => (
            <li key={path} className="relative">
              <img src={photoUrl(path)} alt="" className="h-20 w-20 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((c) => c.filter((p) => p !== path))}
                className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-xs text-white"
                aria-label="Retirer cette photo"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {state !== null ? <Notice>{state.error}</Notice> : null}

      <Button type="submit" variant="solid" disabled={pending || uploading}>
        {pending ? 'Publication…' : 'Publier l’annonce'}
      </Button>

      <p className="text-sm text-muted">
        Votre annonce est visible immédiatement, sans validation préalable.
        Aucune commission pendant la période de lancement.
      </p>
    </form>
  );
}
