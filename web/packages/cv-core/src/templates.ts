import type { SectionId, TemplateId } from './types.ts';

/**
 * Descripteurs de templates.
 *
 * Un template est de la *donnée*, pas du code de rendu. C'est la contrepartie
 * obligatoire du choix de `@react-pdf/renderer` : l'aperçu HTML et le document
 * PDF sont deux renderers distincts, et ils ne peuvent rester alignés que s'ils
 * lisent la même description. Aucun des deux ne doit coder en dur une taille,
 * une marge ou un ordre de section.
 *
 * Contraintes ATS communes à tous les templates, non négociables :
 * une seule colonne, pas de tableau, pas d'icône, pas d'encadré coloré,
 * pas de photo, en-têtes de section en toutes lettres et en langage standard.
 */

export interface TemplateTypography {
  /** Corps de texte, en points (unité commune au CSS et à react-pdf). */
  body: number;
  /** Nom de la personne, en haut du CV. */
  name: number;
  /** Titre professionnel sous le nom. */
  headline: number;
  /** En-tête de section (« Expérience professionnelle »). */
  sectionTitle: number;
  /** Intitulé de poste / diplôme. */
  entryTitle: number;
  /** Métadonnées : entreprise, lieu, dates. */
  meta: number;
  /** Interligne, multiplicateur du corps. */
  lineHeight: number;
}

export interface TemplateSpacing {
  /** Marge de page, en points. */
  page: number;
  /** Espace au-dessus d'un en-tête de section. */
  section: number;
  /** Espace entre deux entrées d'une même section. */
  entry: number;
  /** Espace entre deux puces. */
  bullet: number;
}

export interface TemplateSpec {
  id: TemplateId;
  name: string;
  /** Une phrase, affichée sur la carte de sélection. */
  description: string;
  /** À qui ce template convient — reprend les personas du brief §3. */
  bestFor: string;
  typography: TemplateTypography;
  spacing: TemplateSpacing;
  /** Ordre d'apparition des sections dans le document. */
  sectionOrder: SectionId[];
  /** Libellés d'en-tête. Volontairement standards : les ATS les reconnaissent. */
  sectionTitles: Record<Exclude<SectionId, 'personal' | 'headline'>, string>;
  /** Titres de section en capitales (sans changer le texte source). */
  uppercaseSectionTitles: boolean;
  /** Filet horizontal sous les en-têtes de section. */
  sectionRule: boolean;
  /** Nombre de pages recommandé ; le template « Stage » force une page. */
  maxPages: number;
}

/** Libellés d'en-tête partagés — standards, donc reconnus par les parseurs. */
const STANDARD_TITLES: TemplateSpec['sectionTitles'] = {
  summary: 'Résumé professionnel',
  experience: 'Expérience professionnelle',
  education: 'Formation',
  skills: 'Compétences',
  extras: 'Langues et certifications',
};

const STANDARD_ORDER: SectionId[] = [
  'personal', 'headline', 'summary', 'experience', 'education', 'skills', 'extras',
];

export const TEMPLATES: Record<TemplateId, TemplateSpec> = {
  classique: {
    id: 'classique',
    name: 'Classique',
    description: 'Une colonne, filets sous les titres, lecture confortable.',
    bestFor: 'Banque, administration, droit, comptabilité',
    typography: {
      body: 10.5, name: 22, headline: 12, sectionTitle: 11.5, entryTitle: 11,
      meta: 9.5, lineHeight: 1.4,
    },
    spacing: { page: 40, section: 16, entry: 10, bullet: 3 },
    sectionOrder: STANDARD_ORDER,
    sectionTitles: STANDARD_TITLES,
    uppercaseSectionTitles: true,
    sectionRule: true,
    maxPages: 2,
  },

  sobre: {
    id: 'sobre',
    name: 'Sobre',
    description: 'Sans filet ni majuscule, beaucoup de blanc, très aéré.',
    bestFor: 'Tech, design, communication',
    typography: {
      body: 10.5, name: 24, headline: 12.5, sectionTitle: 11, entryTitle: 11,
      meta: 9.5, lineHeight: 1.5,
    },
    spacing: { page: 48, section: 20, entry: 12, bullet: 4 },
    sectionOrder: STANDARD_ORDER,
    sectionTitles: STANDARD_TITLES,
    uppercaseSectionTitles: false,
    sectionRule: false,
    maxPages: 2,
  },

  compact: {
    id: 'compact',
    name: 'Compact',
    description: 'Densité maximale sans perdre en lisibilité.',
    bestFor: 'Profils expérimentés, parcours longs',
    typography: {
      body: 9.5, name: 19, headline: 11, sectionTitle: 10.5, entryTitle: 10,
      meta: 8.5, lineHeight: 1.3,
    },
    spacing: { page: 32, section: 11, entry: 7, bullet: 2 },
    sectionOrder: STANDARD_ORDER,
    sectionTitles: STANDARD_TITLES,
    uppercaseSectionTitles: true,
    sectionRule: true,
    maxPages: 2,
  },

  stage: {
    id: 'stage',
    name: 'Stage',
    description: 'Une seule page, formation avant expérience.',
    bestFor: 'Étudiants, premier stage, premier emploi',
    typography: {
      body: 10, name: 20, headline: 11.5, sectionTitle: 11, entryTitle: 10.5,
      meta: 9, lineHeight: 1.35,
    },
    spacing: { page: 36, section: 13, entry: 8, bullet: 3 },
    // La formation passe devant l'expérience : c'est l'atout principal d'un
    // profil étudiant, elle doit être lue en premier.
    sectionOrder: ['personal', 'headline', 'summary', 'education', 'experience', 'skills', 'extras'],
    sectionTitles: { ...STANDARD_TITLES, experience: 'Expériences et projets' },
    uppercaseSectionTitles: true,
    sectionRule: true,
    maxPages: 1,
  },
};

export const TEMPLATE_LIST: TemplateSpec[] = [
  TEMPLATES.classique, TEMPLATES.sobre, TEMPLATES.compact, TEMPLATES.stage,
];

export function getTemplate(id: TemplateId): TemplateSpec {
  return TEMPLATES[id];
}

/** Titre d'en-tête tel qu'il doit être rendu, casse comprise. */
export function sectionTitle(spec: TemplateSpec, section: SectionId): string {
  if (section === 'personal' || section === 'headline') return '';
  const title = spec.sectionTitles[section];
  return spec.uppercaseSectionTitles ? title.toUpperCase() : title;
}
