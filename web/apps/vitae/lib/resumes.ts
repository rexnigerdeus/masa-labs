'use server';

import type { Resume } from '@everyday/cv-core';
import { scoreResume } from '@everyday/cv-core';
import { createClient, currentUser } from './supabase/server';

/**
 * Persistance des CV.
 *
 * Un CV par compte pour ce MVP : la table en accepte plusieurs, mais rien dans
 * l'interface ne les expose encore (le brief range « plusieurs CV sauvegardés »
 * dans les pistes freemium). `saveResume` écrase donc la ligne existante.
 *
 * Le brouillon local reste la source de vérité pendant la saisie ; la base sert
 * à retrouver son CV depuis un autre appareil.
 */

export interface StoredResume {
  id: string;
  data: Resume;
  updatedAt: string;
}

export interface SaveOutcome {
  ok: boolean;
  id?: string;
  /** Message destiné à l'utilisateur, déjà en français. */
  error?: string;
}

/** CV enregistré du compte connecté, ou `null`. */
export async function loadResume(): Promise<StoredResume | null> {
  const user = await currentUser();
  if (user === null) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vitae_resumes')
    .select('id, data, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error !== null || data === null) return null;
  return {
    id: data.id as string,
    data: data.data as Resume,
    updatedAt: data.updated_at as string,
  };
}

/**
 * Enregistre le CV du compte connecté.
 *
 * Le score est recalculé ici plutôt que transmis par le client : la colonne
 * `score` alimente les KPIs, et une valeur envoyée depuis le navigateur n'est
 * pas une mesure, c'est une déclaration.
 */
export async function saveResume(resume: Resume, id: string | null): Promise<SaveOutcome> {
  const user = await currentUser();
  if (user === null) return { ok: false, error: 'Session expirée. Reconnectez-vous.' };

  const supabase = await createClient();
  const row = {
    user_id: user.id,
    template_id: resume.templateId,
    data: resume,
    score: scoreResume(resume).total,
    title: resume.headline.trim() === '' ? 'Mon CV' : resume.headline.trim(),
  };

  const query = id === null
    ? supabase.from('vitae_resumes').insert(row).select('id').single()
    : supabase.from('vitae_resumes').update(row).eq('id', id).select('id').single();

  const { data, error } = await query;

  if (error !== null || data === null) {
    // Cas le plus probable en début de projet : la migration
    // 20260904_vitae_web_resumes.sql n'a pas encore été appliquée.
    const missingTable = error?.code === '42P01';
    return {
      ok: false,
      error: missingTable
        ? 'La sauvegarde en ligne n’est pas encore disponible. Votre CV reste enregistré dans ce navigateur.'
        : 'Sauvegarde impossible pour le moment. Votre CV reste enregistré dans ce navigateur.',
    };
  }

  return { ok: true, id: data.id as string };
}

/** Journalise un événement d'usage. Silencieux : un KPI ne doit jamais casser un parcours. */
export async function logEvent(
  event: 'resume_created' | 'resume_saved' | 'resume_downloaded'
    | 'linkedin_imported' | 'template_changed',
  resumeId: string | null,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const user = await currentUser();
  if (user === null) return;

  const supabase = await createClient();
  await supabase.from('vitae_events').insert({
    user_id: user.id,
    resume_id: resumeId,
    event,
    meta,
  });
}
