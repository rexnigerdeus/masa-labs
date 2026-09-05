/**
 * Libellés du catalogue Offres et Conseils.
 *
 * La base stocke des identifiants en camelCase, hérités de l'app Flutter et
 * verrouillés par des contraintes CHECK (`vitae_job_offers.category`,
 * `vitae_articles.category`). On les traduit ici plutôt que de les renommer :
 * la table est alimentée par le scraper, qui continue d'écrire ces valeurs.
 */

export const JOB_CATEGORIES: Record<string, string> = {
  financeComptabilite: 'Finance et comptabilité',
  marketingCommunication: 'Marketing et communication',
  informatiqueTech: 'Informatique et tech',
  commercialVente: 'Commercial et vente',
  administratifRh: 'Administratif et RH',
  juridique: 'Juridique',
  ingenierieBtp: 'Ingénierie et BTP',
  sante: 'Santé',
  educationFormation: 'Éducation et formation',
  logistiqueTransport: 'Logistique et transport',
  hotellerieRestauration: 'Hôtellerie et restauration',
  autre: 'Autre',
};

export const ARTICLE_CATEGORIES: Record<string, string> = {
  rechercheEmploi: 'Recherche d’emploi',
  reseauage: 'Réseautage',
  relationsPro: 'Relations professionnelles',
  marcheTravail: 'Marché du travail',
  droitTravail: 'Droit du travail',
};

/**
 * Catégorie sur laquelle l'avertissement juridique s'impose.
 *
 * Point de vigilance du brief §12 : ces articles décrivent le droit ivoirien,
 * ils ne remplacent pas l'avis d'un professionnel sur une situation précise.
 */
export const LEGAL_CATEGORY = 'droitTravail';

export const LEGAL_DISCLAIMER =
  'Ces informations sont données à titre indicatif et ne constituent pas un '
  + 'conseil juridique individualisé. Pour une situation précise, rapprochez-vous '
  + 'de l’Inspection du travail ou d’un avocat.';

export function jobCategoryLabel(id: string): string {
  return JOB_CATEGORIES[id] ?? 'Autre';
}

export function articleCategoryLabel(id: string): string {
  return ARTICLE_CATEGORIES[id] ?? id;
}

/** Date lisible : « 3 septembre 2026 ». */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

/** Ancienneté relative — ce qu'un candidat regarde en premier sur une offre. */
export function formatAge(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  if (days < 31) return `il y a ${Math.floor(days / 7)} semaine${days >= 14 ? 's' : ''}`;
  return `il y a ${Math.floor(days / 30)} mois`;
}
