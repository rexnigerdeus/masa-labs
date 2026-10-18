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
  /** Le CV gratuit du compte (lot B). Toujours false avant la migration. */
  isPrimary: boolean;
  /** Version ciblée : le poste visé, et l'offre d'origine s'il y en a une. */
  targetTitle: string | null;
  targetOfferId: string | null;
  targetOfferUrl: string | null;
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
  return {
    id: row.id as string,
    data: resume,
    updatedAt: row.updated_at as string,
    isPrimary: row.is_primary === true,
    targetTitle: (row.target_title as string | null | undefined) ?? null,
    targetOfferId: (row.target_offer_id as string | null | undefined) ?? null,
    targetOfferUrl: (row.target_offer_url as string | null | undefined) ?? null,
  };
}

/**
 * Colonnes lues. Celles du lot B n'existent qu'après la migration
 * `20261018120100_vitae_lot_b.sql` : tant qu'elle n'est pas passée, la
 * requête retombe sur les colonnes d'origine plutôt que de vider l'espace
 * compte. Le code peut ainsi être déployé avant ou après la base.
 */
const COLUMNS = 'id, data, updated_at, is_primary, target_title, target_offer_id, target_offer_url';
const LEGACY_COLUMNS = 'id, data, updated_at';
const UNDEFINED_COLUMN = '42703';

/**
 * Un CV du compte connecté : celui demandé, ou à défaut le dernier modifié.
 * `null` si rien ne correspond — y compris un identifiant d'un autre compte,
 * que la RLS rend invisible.
 */
export async function loadResume(id?: string): Promise<StoredResume | null> {
  const user = await currentUser();
  if (user === null) return null;

  // Un identifiant mal formé ferait échouer la requête côté Postgres : on ne
  // l'envoie pas, et la page retombe sur « introuvable ».
  if (id !== undefined && !UUID.test(id)) return null;

  const supabase = await createClient();
  const run = (columns: string) => {
    let query = supabase.from('vitae_resumes').select(columns).eq('user_id', user.id);
    if (id !== undefined) query = query.eq('id', id);
    return query.order('updated_at', { ascending: false }).limit(1).maybeSingle();
  };
  let { data, error } = await run(COLUMNS);
  if (error?.code === UNDEFINED_COLUMN) ({ data, error } = await run(LEGACY_COLUMNS));

  return error !== null || data === null ? null : toStored(data as unknown as Record<string, unknown>);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tous les CV du compte connecté, le plus récemment modifié d'abord. */
export async function listResumes(): Promise<StoredResume[]> {
  const user = await currentUser();
  if (user === null) return [];

  const supabase = await createClient();
  const run = (columns: string) => supabase
    .from('vitae_resumes')
    .select(columns)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    // Garde-fou : l'espace compte n'a pas de pagination.
    .limit(50);
  let { data, error } = await run(COLUMNS);
  if (error?.code === UNDEFINED_COLUMN) ({ data, error } = await run(LEGACY_COLUMNS));

  if (error !== null || data === null) return [];
  const list = (data as unknown as Record<string, unknown>[])
    .map(toStored)
    .filter((r): r is StoredResume => r !== null);
  // Le CV gratuit en tête : c'est celui qu'on vient modifier le plus souvent.
  return list.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
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

  // Lot B : la base n'accepte qu'un CV créé hors d'une version payée, le CV
  // gratuit. Un second est refusé par la RLS (42501).
  if (id === null && error?.code === '42501') {
    return {
      ok: false,
      error: 'Votre compte a déjà son CV gratuit. Ce CV-ci reste enregistré sur ce téléphone ; '
        + 'pour le garder dans votre compte, créez une version depuis « Mes CV ».',
    };
  }

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
