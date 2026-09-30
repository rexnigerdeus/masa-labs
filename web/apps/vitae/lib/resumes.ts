'use server';

import type { Resume } from '@everyday/cv-core';
import { normalizeResume, scoreResume } from '@everyday/cv-core';
import { createClient, currentUser } from './supabase/server';

/**
 * Persistance des CV.
 *
 * Plusieurs CV par compte : l'espace « Compte » les liste, chacun s'ouvre
 * dans le parcours par son identifiant (`/cv?id=…`). `saveResume` met à jour
 * la ligne dont l'éditeur connaît l'identifiant, ou en crée une.
 *
 * Le brouillon local reste la source de vérité pendant la saisie ; la base sert
 * à retrouver ses CV depuis un autre appareil.
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

/**
 * Ligne de base → CV exploitable, ou `null`.
 *
 * La colonne est du `jsonb` : ce qui en sort n'est un `Resume` que par
 * convention. Une ligne écrite avant la photo ou la couleur primaire est
 * remontée ici, une ligne illisible est traitée comme une absence.
 */
function toStored(row: Record<string, unknown>): StoredResume | null {
  const resume = normalizeResume(row.data);
  if (resume === null) return null;
  return { id: row.id as string, data: resume, updatedAt: row.updated_at as string };
}

/**
 * Un CV du compte connecté : celui demandé, ou à défaut le dernier modifié.
 * `null` si rien ne correspond — y compris un identifiant d'un autre compte,
 * que la RLS rend invisible.
 */
export async function loadResume(id?: string): Promise<StoredResume | null> {
  const user = await currentUser();
  if (user === null) return null;

  const supabase = await createClient();
  let query = supabase
    .from('vitae_resumes')
    .select('id, data, updated_at')
    .eq('user_id', user.id);
  // Un identifiant mal formé ferait échouer la requête côté Postgres : on ne
  // l'envoie pas, et la page retombe sur « introuvable ».
  if (id !== undefined) {
    if (!UUID.test(id)) return null;
    query = query.eq('id', id);
  }
  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return error !== null || data === null ? null : toStored(data);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tous les CV du compte connecté, le plus récemment modifié d'abord. */
export async function listResumes(): Promise<StoredResume[]> {
  const user = await currentUser();
  if (user === null) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vitae_resumes')
    .select('id, data, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    // Garde-fou : l'espace compte n'a pas de pagination.
    .limit(50);

  if (error !== null || data === null) return [];
  return data.map(toStored).filter((r): r is StoredResume => r !== null);
}

/** Supprime un CV du compte connecté. La RLS interdit de toucher celui d'un autre. */
export async function deleteResume(id: string): Promise<SaveOutcome> {
  const user = await currentUser();
  if (user === null) return { ok: false, error: 'Session expirée. Reconnectez-vous.' };
  if (!UUID.test(id)) return { ok: false, error: 'CV introuvable.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('vitae_resumes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  return error === null
    ? { ok: true, id }
    : { ok: false, error: 'Suppression impossible pour le moment. Réessayez.' };
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
