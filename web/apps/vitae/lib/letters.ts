'use server';

import { redirect } from 'next/navigation';
import { normalizeCoverLetter, type CoverLetter } from '@everyday/cv-core';
import { createClient, currentUser } from './supabase/server';

/**
 * Lettres de motivation (brief v2, Pass Candidature).
 *
 * Créer une lettre exige un pass actif : la base le vérifie
 * (`vitae_create_cover_letter`). La modifier et la télécharger restent
 * possibles après la fin du pass — la politique de mise à jour ne regarde
 * que le propriétaire.
 */
export interface StoredLetter {
  id: string;
  resumeId: string | null;
  letter: CoverLetter;
  updatedAt: string;
}

export interface LetterState {
  error?: string;
  saved?: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fromForm(form: FormData): CoverLetter | null {
  const raw = String(form.get('letter') ?? '');
  try {
    return normalizeCoverLetter(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function listLetters(): Promise<StoredLetter[]> {
  const user = await currentUser();
  if (user === null) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vitae_cover_letters')
    .select('id, resume_id, data, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error !== null || data === null) return [];
  return data.flatMap((row) => {
    const letter = normalizeCoverLetter(row.data);
    return letter === null ? [] : [{
      id: row.id as string,
      resumeId: row.resume_id as string | null,
      letter,
      updatedAt: row.updated_at as string,
    }];
  });
}

export async function loadLetter(id: string): Promise<StoredLetter | null> {
  if (!UUID.test(id)) return null;
  const user = await currentUser();
  if (user === null) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('vitae_cover_letters')
    .select('id, resume_id, data, updated_at')
    .eq('id', id)
    .maybeSingle();
  const letter = data === null ? null : normalizeCoverLetter(data.data);
  return data === null || letter === null ? null : {
    id: data.id as string,
    resumeId: data.resume_id as string | null,
    letter,
    updatedAt: data.updated_at as string,
  };
}

export async function createLetter(_prev: LetterState, form: FormData): Promise<LetterState> {
  const user = await currentUser();
  if (user === null) redirect('/connexion?suite=/lettres/nouvelle');
  const letter = fromForm(form);
  if (letter === null || letter.body.trim() === '') {
    return { error: 'Assemblez d’abord la lettre, puis enregistrez-la.' };
  }
  const resumeId = String(form.get('resume') ?? '');
  const offerId = String(form.get('offre') ?? '');

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('vitae_create_cover_letter', {
    p_resume: UUID.test(resumeId) ? resumeId : null,
    p_offer_id: offerId === '' ? null : offerId,
    p_data: letter,
  });
  if (error !== null || typeof data !== 'string') {
    return {
      error: error?.code === 'P0001'
        ? 'Une nouvelle lettre demande un Pass Candidature actif.'
        : 'La lettre n’a pas pu être enregistrée. Réessayez.',
    };
  }
  redirect(`/lettres/${data}`);
}

export async function updateLetter(_prev: LetterState, form: FormData): Promise<LetterState> {
  const user = await currentUser();
  if (user === null) return { error: 'Session expirée. Reconnectez-vous.' };
  const id = String(form.get('id') ?? '');
  const letter = fromForm(form);
  if (!UUID.test(id) || letter === null) return { error: 'Lettre illisible.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('vitae_cover_letters')
    .update({ data: letter })
    .eq('id', id)
    .eq('user_id', user.id);
  return error === null ? { saved: true } : { error: 'Enregistrement impossible. Réessayez.' };
}
