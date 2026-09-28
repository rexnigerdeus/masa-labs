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
 * pas de tableau, pas d'icône, pas de texte en image, en-têtes de section en
 * toutes lettres et en langage standard, un seul flux de texte.
 *
 * Les modèles à colonne latérale (`layout.kind === 'sidebar'`) ne dérogent pas
 * à ce dernier point : la colonne n'est pas une seconde colonne de texte
 * entremêlée à la première. Le document écrit d'abord tout le corps (identité,
 * résumé, expériences, formation), puis la colonne (coordonnées, compétences,
 * langues). Un logiciel de tri lit donc deux blocs successifs, jamais des
 * lignes alternées — c'est ce que `ats:check` vérifie en contrôlant l'ordre
 * des en-têtes réextraits.
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
export type HeaderLayout = 'band' | 'tint' | 'underline' | 'minimal' | 'centered';

/**
 * Habillage des en-têtes de section.
 *
 * - `rule` : titre encre, filet en primaire sous le titre.
 * - `bar` : court trait vertical en primaire devant le titre.
 * - `chip` : titre en primaire sur une pastille teintée.
 * - `plain` : titre en primaire, rien d'autre.
 * - `banner` : titre inversé sur une barre pleine en primaire.
 * - `line` : titre suivi d'un filet qui court jusqu'au bord droit.
 */
export type SectionStyle = 'rule' | 'bar' | 'chip' | 'plain' | 'banner' | 'line';

/**
 * Mise en forme d'une expérience ou d'une formation.
 *
 * - `stacked` : intitulé, puis une ligne « entreprise — lieu — dates ».
 * - `dated` : intitulé à gauche, dates alignées à droite sur la même ligne,
 *   entreprise et lieu en dessous.
 * - `timeline` : comme `dated`, posé sur une frise verticale ponctuée.
 *
 * Dans les trois cas le texte est écrit dans le même ordre — intitulé,
 * dates, entreprise — seul l'emplacement change.
 */
export type EntryStyle = 'stacked' | 'dated' | 'timeline';

export interface TemplatePhoto {
  /** Ronde ou carrée à coins adoucis : la découpe fait partie du modèle. */
  shape: 'circle' | 'rounded';
  /** Côté de la photo, en points. Ignoré par `bleed`, qui prend la largeur. */
  size: number;
  /**
   * Place de la photo.
   *
   * `left` / `right` : à côté de l'identité. `center` : au-dessus, centrée
   * (en-tête centré, colonne latérale). `bleed` : en haut de la colonne
   * latérale, sur toute sa largeur, sans marge.
   */
  align: 'left' | 'right' | 'center' | 'bleed';
}

/**
 * Disposition de la page.
 *
 * - `single` : un seul bloc sur toute la largeur utile.
 * - `sidebar` : une colonne colorée sur toute la hauteur, qui reçoit la photo,
 *   les coordonnées et les sections listées dans `sections`. Elle est écrite
 *   *après* le corps dans le flux du PDF : voir l'en-tête de ce fichier.
 */
export type TemplateLayout =
  | { kind: 'single' }
  | {
    kind: 'sidebar';
    side: 'left' | 'right';
    /** Largeur de la colonne, en points, fond compris. */
    width: number;
    /** Marge intérieure de la colonne. */
    pad: number;
    /** `solid` : aplat en primaire, texte inversé. `tint` : teinte claire. */
    tone: 'solid' | 'tint';
    /** Sections déplacées dans la colonne, dans cet ordre. */
    sections: SectionId[];
  };

/** Traitement du nom et du titre professionnel dans le bloc d'identité. */
export interface TemplateIdentity {
  /** Nom en capitales. */
  uppercase: boolean;
  /** Interlettrage du nom, en points. */
  tracking: number;
  /** Nom en primaire plutôt qu'en encre. */
  accentName: boolean;
  /** Titre professionnel en capitales espacées. */
  headlineUppercase: boolean;
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
  entryStyle: EntryStyle;
  identity: TemplateIdentity;
  layout: TemplateLayout;
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

/** Libellé du bloc de coordonnées, quand il a sa propre section (colonne latérale). */
export const CONTACT_TITLE = 'Coordonnées';

const SINGLE: TemplateLayout = { kind: 'single' };

const PLAIN_IDENTITY: TemplateIdentity = {
  uppercase: false, tracking: 0, accentName: false, headlineUppercase: false,
};

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
    spacing: { page: 38, section: 14, entry: 9, bullet: 2.5, header: 12, headerPad: 0 },
    sectionOrder: STANDARD_ORDER,
    sectionTitles: STANDARD_TITLES,
    uppercaseSectionTitles: true,
    header: 'underline',
    sectionStyle: 'rule',
    entryStyle: 'stacked',
    identity: PLAIN_IDENTITY,
    layout: SINGLE,
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
    spacing: { page: 44, section: 16, entry: 10, bullet: 3, header: 14, headerPad: 0 },
    sectionOrder: STANDARD_ORDER,
    sectionTitles: STANDARD_TITLES,
    uppercaseSectionTitles: false,
    header: 'minimal',
    sectionStyle: 'plain',
    entryStyle: 'stacked',
    identity: PLAIN_IDENTITY,
    layout: SINGLE,
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
    entryStyle: 'stacked',
    identity: PLAIN_IDENTITY,
    layout: SINGLE,
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
    entryStyle: 'stacked',
    identity: PLAIN_IDENTITY,
    layout: SINGLE,
    photo: { shape: 'circle', size: 66, align: 'left' },
    maxPages: 1,
  },
  horizon: {
    id: 'horizon',
    name: 'Horizon',
    description: 'Colonne sombre à gauche avec photo ronde, corps aéré, dates alignées à droite.',
    bestFor: 'Commerce, immobilier, marketing, management',
    defaultAccent: '#1e2a44',
    typography: {
      body: 9.5, name: 26, headline: 10.5, sectionTitle: 10.5, entryTitle: 10.5,
      meta: 9, lineHeight: 1.35, titleTracking: 1.4,
    },
    spacing: { page: 30, section: 14, entry: 9, bullet: 2, header: 10, headerPad: 0 },
    sectionOrder: STANDARD_ORDER,
    sectionTitles: STANDARD_TITLES,
    uppercaseSectionTitles: true,
    header: 'minimal',
    sectionStyle: 'line',
    entryStyle: 'dated',
    identity: { uppercase: false, tracking: 0.2, accentName: false, headlineUppercase: true },
    layout: { kind: 'sidebar', side: 'left', width: 188, pad: 20, tone: 'solid', sections: ['skills', 'extras'] },
    photo: { shape: 'circle', size: 104, align: 'center' },
    maxPages: 2,
  },

  atelier: {
    id: 'atelier',
    name: 'Atelier',
    description: 'Colonne claire, grande photo en tête, nom en capitales de couleur.',
    bestFor: 'Gestion de projet, RH, administration, créatifs',
    defaultAccent: '#8a5a44',
    typography: {
      body: 9.5, name: 30, headline: 10.5, sectionTitle: 10.5, entryTitle: 10.5,
      meta: 9, lineHeight: 1.35, titleTracking: 1.2,
    },
    spacing: { page: 30, section: 14, entry: 9, bullet: 2, header: 12, headerPad: 0 },
    sectionOrder: STANDARD_ORDER,
    sectionTitles: STANDARD_TITLES,
    uppercaseSectionTitles: true,
    header: 'minimal',
    sectionStyle: 'line',
    entryStyle: 'dated',
    identity: { uppercase: true, tracking: 1.5, accentName: true, headlineUppercase: true },
    layout: { kind: 'sidebar', side: 'left', width: 176, pad: 18, tone: 'tint', sections: ['skills', 'extras'] },
    photo: { shape: 'rounded', size: 176, align: 'bleed' },
    maxPages: 2,
  },

  parcours: {
    id: 'parcours',
    name: 'Parcours',
    description: 'Titres sur barre pleine, expériences posées sur une frise chronologique.',
    bestFor: 'Communication, événementiel, parcours riches',
    defaultAccent: '#23395d',
    typography: {
      body: 9.5, name: 24, headline: 11, sectionTitle: 9.5, entryTitle: 10.5,
      meta: 9, lineHeight: 1.35, titleTracking: 1.6,
    },
    spacing: { page: 34, section: 14, entry: 9, bullet: 2, header: 12, headerPad: 0 },
    sectionOrder: STANDARD_ORDER,
    sectionTitles: STANDARD_TITLES,
    uppercaseSectionTitles: true,
    header: 'minimal',
    sectionStyle: 'banner',
    entryStyle: 'timeline',
    identity: { uppercase: true, tracking: 1, accentName: true, headlineUppercase: false },
    layout: SINGLE,
    photo: { shape: 'rounded', size: 86, align: 'left' },
    maxPages: 2,
  },

  elegance: {
    id: 'elegance',
    name: 'Élégance',
    description: 'Nom centré en capitales espacées, filets fins, dates à droite.',
    bestFor: 'Direction, conseil, juridique, luxe',
    defaultAccent: '#2f3e46',
    typography: {
      body: 9.5, name: 26, headline: 10.5, sectionTitle: 10, entryTitle: 10.5,
      meta: 9, lineHeight: 1.35, titleTracking: 2,
    },
    spacing: { page: 38, section: 14, entry: 9, bullet: 2, header: 12, headerPad: 0 },
    sectionOrder: STANDARD_ORDER,
    sectionTitles: STANDARD_TITLES,
    uppercaseSectionTitles: true,
    header: 'centered',
    sectionStyle: 'line',
    entryStyle: 'dated',
    identity: { uppercase: true, tracking: 5, accentName: false, headlineUppercase: true },
    layout: SINGLE,
    photo: { shape: 'circle', size: 70, align: 'center' },
    maxPages: 2,
  },
};

export const TEMPLATE_LIST: TemplateSpec[] = [
  TEMPLATES.horizon, TEMPLATES.atelier, TEMPLATES.parcours, TEMPLATES.elegance,
  TEMPLATES.classique, TEMPLATES.sobre, TEMPLATES.compact, TEMPLATES.stage,
];

export function getTemplate(id: TemplateId): TemplateSpec {
  return TEMPLATES[id];
}

/** Sections écrites dans la colonne latérale — aucune pour un modèle à un bloc. */
export function sidebarSections(spec: TemplateSpec): SectionId[] {
  return spec.layout.kind === 'sidebar' ? spec.layout.sections : [];
}

/** Sections du corps, dans l'ordre du modèle, colonne latérale exclue. */
export function mainSections(spec: TemplateSpec): SectionId[] {
  const aside = sidebarSections(spec);
  return spec.sectionOrder.filter((s) => !aside.includes(s));
}

/** Libellé du bloc de coordonnées, casse comprise. */
export function contactTitle(spec: TemplateSpec): string {
  return spec.uppercaseSectionTitles ? CONTACT_TITLE.toUpperCase() : CONTACT_TITLE;
}

/** Titre d'en-tête tel qu'il doit être rendu, casse comprise. */
export function sectionTitle(spec: TemplateSpec, section: SectionId): string {
  if (section === 'personal' || section === 'headline') return '';
  const title = spec.sectionTitles[section];
  return spec.uppercaseSectionTitles ? title.toUpperCase() : title;
}
