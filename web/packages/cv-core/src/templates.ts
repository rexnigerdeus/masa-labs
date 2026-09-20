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
 * une seule colonne sur toute la largeur utile, pas de tableau, pas d'icône,
 * pas de texte en image, en-têtes de section en toutes lettres et en langage
 * standard, ordre de lecture identique à l'ordre visuel.
 *
 * La couleur et la photo ne relèvent pas de ce registre : un aplat de couleur
 * ne gêne pas l'extraction du texte, et une photo est une image posée *à côté*
 * du texte, jamais à sa place. La photo est attendue par les recruteurs
 * ivoiriens — elle a donc sa place sur le document, avec un interrupteur pour
 * l'enlever quand la candidature part ailleurs.
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
  /** Interlettrage des en-têtes de section, en points. 0 = normal. */
  titleTracking: number;
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
  /** Espace sous le bloc d'identité. */
  header: number;
  /** Marge intérieure du bloc d'identité quand il est posé sur un aplat. */
  headerPad: number;
}

/**
 * Disposition du bloc d'identité.
 *
 * - `band` : bandeau plein en couleur primaire, de bord à bord, texte inversé.
 * - `tint` : bloc arrondi dans une teinte claire de la primaire.
 * - `underline` : fond blanc, filet épais en primaire sous l'identité.
 * - `minimal` : fond blanc, aucun aplat, la primaire n'apparaît qu'en texte.
 */
export type HeaderLayout = 'band' | 'tint' | 'underline' | 'minimal';

/**
 * Habillage des en-têtes de section.
 *
 * - `rule` : titre encre, filet en primaire sous le titre.
 * - `bar` : court trait vertical en primaire devant le titre.
 * - `chip` : titre en primaire sur une pastille teintée.
 * - `plain` : titre en primaire, rien d'autre.
 */
export type SectionStyle = 'rule' | 'bar' | 'chip' | 'plain';

export interface TemplatePhoto {
  /** Ronde ou carrée à coins adoucis : la découpe fait partie du modèle. */
  shape: 'circle' | 'rounded';
  /** Côté de la photo, en points. */
  size: number;
  /** Côté du bloc d'identité où la photo se place. */
  align: 'left' | 'right';
}

export interface TemplateSpec {
  id: TemplateId;
  name: string;
  /** Une phrase, affichée sur la carte de sélection. */
  description: string;
  /** À qui ce template convient — reprend les personas du brief §3. */
  bestFor: string;
  /** Couleur primaire proposée ; l'utilisateur peut en choisir une autre. */
  defaultAccent: string;
  typography: TemplateTypography;
  spacing: TemplateSpacing;
  /** Ordre d'apparition des sections dans le document. */
  sectionOrder: SectionId[];
  /** Libellés d'en-tête. Volontairement standards : les ATS les reconnaissent. */
  sectionTitles: Record<Exclude<SectionId, 'personal' | 'headline'>, string>;
  /** Titres de section en capitales (sans changer le texte source). */
  uppercaseSectionTitles: boolean;
  header: HeaderLayout;
  sectionStyle: SectionStyle;
  photo: TemplatePhoto;
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
    description: 'Filet de couleur sous l’identité, titres espacés, lecture confortable.',
    bestFor: 'Banque, administration, droit, comptabilité',
    defaultAccent: '#1f3d5c',
    typography: {
      body: 10.5, name: 23, headline: 12, sectionTitle: 10.5, entryTitle: 11,
      meta: 9.5, lineHeight: 1.4, titleTracking: 0.9,
    },
    spacing: { page: 40, section: 16, entry: 10, bullet: 3, header: 14, headerPad: 0 },
    sectionOrder: STANDARD_ORDER,
    sectionTitles: STANDARD_TITLES,
    uppercaseSectionTitles: true,
    header: 'underline',
    sectionStyle: 'rule',
    photo: { shape: 'rounded', size: 74, align: 'right' },
    maxPages: 2,
  },

  sobre: {
    id: 'sobre',
    name: 'Sobre',
    description: 'Beaucoup de blanc, aucun aplat, la couleur réservée aux titres.',
    bestFor: 'Tech, design, communication',
    defaultAccent: '#0f6b5c',
    typography: {
      body: 10.5, name: 25, headline: 12.5, sectionTitle: 11.5, entryTitle: 11,
      meta: 9.5, lineHeight: 1.5, titleTracking: 0,
    },
    spacing: { page: 46, section: 19, entry: 12, bullet: 4, header: 16, headerPad: 0 },
    sectionOrder: STANDARD_ORDER,
    sectionTitles: STANDARD_TITLES,
    uppercaseSectionTitles: false,
    header: 'minimal',
    sectionStyle: 'plain',
    photo: { shape: 'circle', size: 72, align: 'left' },
    maxPages: 2,
  },

  compact: {
    id: 'compact',
    name: 'Compact',
    description: 'Bandeau de couleur en tête, corps dense, parcours long lisible.',
    bestFor: 'Profils expérimentés, parcours longs',
    defaultAccent: '#1f2937',
    typography: {
      body: 9.5, name: 20, headline: 11, sectionTitle: 10, entryTitle: 10,
      meta: 8.5, lineHeight: 1.32, titleTracking: 0.7,
    },
    spacing: { page: 32, section: 12, entry: 7, bullet: 2, header: 12, headerPad: 22 },
    sectionOrder: STANDARD_ORDER,
    sectionTitles: STANDARD_TITLES,
    uppercaseSectionTitles: true,
    header: 'band',
    sectionStyle: 'bar',
    photo: { shape: 'circle', size: 58, align: 'right' },
    maxPages: 2,
  },

  stage: {
    id: 'stage',
    name: 'Stage',
    description: 'Bloc d’identité teinté, une seule page, formation avant expérience.',
    bestFor: 'Étudiants, premier stage, premier emploi',
    defaultAccent: '#6fae2e',
    typography: {
      body: 10, name: 21, headline: 11.5, sectionTitle: 10, entryTitle: 10.5,
      meta: 9, lineHeight: 1.35, titleTracking: 0.6,
    },
    spacing: { page: 34, section: 13, entry: 8, bullet: 3, header: 12, headerPad: 16 },
    // La formation passe devant l'expérience : c'est l'atout principal d'un
    // profil étudiant, elle doit être lue en premier.
    sectionOrder: ['personal', 'headline', 'summary', 'education', 'experience', 'skills', 'extras'],
    sectionTitles: { ...STANDARD_TITLES, experience: 'Expériences et projets' },
    uppercaseSectionTitles: true,
    header: 'tint',
    sectionStyle: 'chip',
    photo: { shape: 'circle', size: 66, align: 'left' },
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
