/**
 * Modèle de données d'un CV Vitae.
 *
 * Volontairement plat : le CV entier est sérialisé dans la colonne
 * `vitae_resumes.data` (jsonb). Pas de schéma normalisé par section — l'éditeur
 * web manipule un seul objet, ce qui rend le brouillon local (IndexedDB) et la
 * ligne en base structurellement identiques.
 */

/**
 * Version du modèle de données.
 *
 * 1 : version initiale. 2 : ajout de la photo et de la couleur primaire.
 * `normalizeResume` accepte les deux et remonte les anciens brouillons, ce qui
 * évite de perdre le CV de quelqu'un qui revient après une mise à jour.
 */
export type SchemaVersion = 1 | 2;

/** Date d'expérience/formation. Mois optionnel : beaucoup de CV ne donnent que l'année. */
export interface CvDate {
  /** Année sur 4 chiffres. */
  year: number;
  /** Mois 1-12, absent si l'utilisateur n'a saisi que l'année. */
  month?: number;
}

export interface Personal {
  fullName: string;
  /** Ville, pays — ex. « Abidjan, Côte d'Ivoire ». */
  location: string;
  phone: string;
  email: string;
  /** Liens optionnels (LinkedIn, portfolio). Affichés en texte, jamais en icône. */
  links: string[];
  /**
   * Photo d'identité, encodée en data URL (JPEG), recadrée carrée à la saisie.
   *
   * En Côte d'Ivoire, la photo sur le CV est la norme attendue par les
   * recruteurs : le produit doit la porter. Elle est stockée avec le CV plutôt
   * que dans un bucket — quelques dizaines de kilo-octets, aucune requête
   * supplémentaire à l'ouverture de l'éditeur, et le brouillon local reste
   * complet hors ligne.
   *
   * `null` = aucune photo fournie.
   */
  photo: string | null;
  /**
   * Affichage de la photo sur le document.
   *
   * Séparé de `photo` à dessein : on l'enlève pour une candidature à
   * l'étranger, ou pour un ATS dont on se méfie, sans avoir à la recharger au
   * retour.
   */
  showPhoto: boolean;
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  location: string;
  start: CvDate | null;
  /** null = poste en cours. */
  end: CvDate | null;
  current: boolean;
  /** Une puce par réalisation. C'est ce que le scoring analyse. */
  bullets: string[];
}

export interface Education {
  id: string;
  degree: string;
  school: string;
  location: string;
  start: CvDate | null;
  end: CvDate | null;
  /** Mention, spécialisation, travaux notables. */
  details: string[];
}

/** Échelle CECR simplifiée, plus « Langue maternelle ». */
export type LanguageLevel = 'natif' | 'courant' | 'intermediaire' | 'debutant';

export interface Language {
  id: string;
  name: string;
  level: LanguageLevel;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: CvDate | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  /** Lien optionnel, rendu en texte brut dans le PDF. */
  url: string;
}

export interface Resume {
  /** Version du modèle, pour migrer les brouillons locaux sans les perdre. */
  schemaVersion: SchemaVersion;
  templateId: TemplateId;
  /**
   * Couleur primaire du CV, en hexadécimal `#rrggbb`.
   *
   * Chaque modèle en propose une par défaut ; l'utilisateur la change sans
   * changer de modèle. Les teintes dérivées (fond, texte lisible sur aplat)
   * sont calculées dans `colors.ts`, jamais stockées : une seule valeur en
   * base, donc aucune combinaison incohérente possible.
   */
  accentColor: string;
  personal: Personal;
  /** Titre professionnel court — « Développeur web junior », pas une phrase. */
  headline: string;
  /** Résumé professionnel, 2-4 phrases. */
  summary: string;
  experiences: Experience[];
  education: Education[];
  /** Compétences techniques et outils, une par entrée. */
  skills: string[];
  languages: Language[];
  certifications: Certification[];
  projects: Project[];
}

export type TemplateId = 'classique' | 'sobre' | 'compact' | 'stage';

/** Identifiants des sections notées séparément (brief §5.1). */
export type SectionId =
  | 'personal'
  | 'headline'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'extras';
