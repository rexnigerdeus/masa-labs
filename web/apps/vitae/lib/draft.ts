import { emptyResume, type Resume } from '@everyday/cv-core';

/**
 * Brouillon local.
 *
 * Le CV vit dans le navigateur tant que l'utilisateur n'a pas de compte : il
 * peut remplir tout le formulaire sans s'inscrire, l'inscription n'est demandée
 * qu'au téléchargement. C'est ce qui protège le taux de complétion (KPI §13).
 *
 * `localStorage` et pas IndexedDB : un CV sérialisé pèse quelques kilo-octets,
 * l'accès synchrone évite un état de chargement au premier rendu, et il n'y a
 * aucune requête à indexer. IndexedDB serait du poids sans contrepartie.
 */

const KEY = 'vitae.draft.v1';

/** Lit le brouillon, ou un CV vierge si rien n'est stocké ou si tout est illisible. */
export function loadDraft(): Resume {
  if (typeof window === 'undefined') return emptyResume();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return emptyResume();
    const parsed: unknown = JSON.parse(raw);
    return isResume(parsed) ? parsed : emptyResume();
  } catch {
    // Stockage indisponible (navigation privée, quota, données corrompues) :
    // on repart d'un CV vierge plutôt que de bloquer l'éditeur.
    return emptyResume();
  }
}

export function saveDraft(resume: Resume): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(resume));
  } catch {
    // Quota dépassé ou stockage refusé : la saisie continue en mémoire.
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Rien à faire : l'appelant n'a pas de recours utile.
  }
}

/**
 * Garde-fou de forme. On ne valide pas le contenu champ par champ : le but est
 * seulement d'éviter qu'un brouillon d'une version antérieure fasse planter
 * l'éditeur au chargement.
 */
function isResume(value: unknown): value is Resume {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<Resume>;
  return (
    v.schemaVersion === 1
    && typeof v.personal === 'object'
    && Array.isArray(v.experiences)
    && Array.isArray(v.education)
    && Array.isArray(v.skills)
  );
}
