import { emptyResume, normalizeResume, type Resume } from '@everyday/cv-core';

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
    // `normalizeResume` complète les champs apparus depuis l'écriture du
    // brouillon (photo, couleur primaire) : quelqu'un qui revient après une
    // mise à jour retrouve son CV, il ne repart pas d'une page blanche.
    return normalizeResume(parsed) ?? emptyResume();
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
    window.localStorage.removeItem(ID_KEY);
  } catch {
    // Rien à faire : l'appelant n'a pas de recours utile.
  }
}

/* ---------- À quel CV en ligne le brouillon correspond ----------
   Un compte peut avoir plusieurs CV. Le brouillon local n'en est qu'un à la
   fois, et il doit savoir lequel : sinon ouvrir un CV depuis l'espace compte
   l'écraserait avec le contenu d'un autre. `null` = pas encore en ligne
   (visiteur anonyme, ou CV neuf pas encore enregistré). */

const ID_KEY = 'vitae.draft.id.v1';

export function loadDraftId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ID_KEY);
  } catch {
    return null;
  }
}

export function saveDraftId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id === null) window.localStorage.removeItem(ID_KEY);
    else window.localStorage.setItem(ID_KEY, id);
  } catch {
    // Stockage refusé : au pire, le prochain enregistrement crée une ligne.
  }
}
