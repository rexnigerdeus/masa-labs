/**
 * Modèle de données d'un CV Vitae.
 *
 * Volontairement plat : le CV entier est sérialisé dans la colonne
 * `vitae_resumes.data` (jsonb). Pas de schéma normalisé par section — l'éditeur
 * web manipule un seul objet, ce qui rend le brouillon local (IndexedDB) et la
 * ligne en base structurellement identiques.
 */

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
  schemaVersion: 1;
  templateId: TemplateId;
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

export function emptyResume(templateId: TemplateId = 'classique'): Resume {
  return {
    schemaVersion: 1,
    templateId,
    personal: { fullName: '', location: '', phone: '', email: '', links: [] },
    headline: '',
    summary: '',
    experiences: [],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
    projects: [],
  };
}
