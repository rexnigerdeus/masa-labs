/**
 * La fondatrice.
 *
 * Le profil LinkedIn n'est pas lisible par un outil automatique — LinkedIn
 * répond « HTTP 999 » à toute requête non authentifiée. Ne figurent donc ici
 * que des informations vérifiables : le nom, la fonction, la ville du siège et
 * le lien vers le profil. Aucun parcours, aucun diplôme, aucune citation n'a
 * été supposé : inventer la biographie d'une personne réelle sur son propre
 * site serait pire qu'une page incomplète.
 *
 * `bio` et `photo` sont vides tant que Daniel ne les a pas fournis ; la section
 * s'adapte à ce qui est renseigné.
 */
export interface Founder {
  name: string;
  role: string;
  location: string;
  linkedinUrl: string;
  /** Deux à quatre phrases à la première personne. Vide = non fourni. */
  bio: string;
  /** Chemin d'un fichier dans public/. Vide = initiales affichées à la place. */
  photo: string;
}

export const FOUNDER: Founder = {
  name: 'Bimata Débora Aurélie Bambara',
  role: 'Fondatrice',
  location: 'Abidjan, Côte d’Ivoire',
  linkedinUrl:
    'https://www.linkedin.com/in/bimata-débora-aurélie-bambara-7998a2430',
  bio: '',
  photo: '',
};

/** Initiales, utilisées tant qu'aucune photo n'est fournie. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => part.length > 1)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
