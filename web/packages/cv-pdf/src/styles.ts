import { StyleSheet } from '@react-pdf/renderer';
import { accentSurface, inkAccent, mixColors, tint, type TemplateSpec } from '@everyday/cv-core';
import { FONT_FAMILY } from './fonts.ts';

/**
 * Feuille de style dérivée du descripteur de template et de la couleur choisie.
 *
 * Rien n'est codé en dur ici : toutes les tailles, marges et casses viennent de
 * `TemplateSpec`, et toutes les teintes se déduisent de la primaire du CV par
 * les fonctions de `@everyday/cv-core`. C'est ce qui permet à l'aperçu HTML de
 * l'éditeur et à ce document PDF de rester alignés sans se copier l'un l'autre.
 */

/** Noir pur pour le texte : le gris clair ressort mal une fois imprimé. */
const INK = '#111111';
const MUTED = '#444444';
const WHITE = '#ffffff';

export function buildStyles(spec: TemplateSpec, accent: string) {
  const { typography: t, spacing: s } = spec;

  // L'utilisateur choisit librement sa primaire : les dérivations garantissent
  // qu'un jaune vif reste lisible en titre comme sur un bandeau. Le bandeau a
  // sa propre couleur de fond — parfois un cran plus sombre que la primaire,
  // le seul moyen de tenir le contraste sur toute la palette.
  const ink = inkAccent(accent);
  const band = accentSurface(accent);
  const inverted = band.text;
  const invertedMuted = mixColors(band.text, band.background, 0.28);
  const soft = tint(accent, 0.12);

  const photoRadius = spec.photo.shape === 'circle' ? spec.photo.size / 2 : 8;

  return StyleSheet.create({
    page: {
      fontFamily: FONT_FAMILY,
      fontSize: t.body,
      lineHeight: t.lineHeight,
      color: INK,
      paddingTop: s.page,
      paddingBottom: s.page,
      paddingLeft: s.page,
      paddingRight: s.page,
      // Une seule colonne, sur toute la largeur utile : c'est la règle ATS
      // fondamentale. Aucun template n'a le droit d'y déroger.
      flexDirection: 'column',
    },

    // --- Bloc d'identité -------------------------------------------------
    header: { marginBottom: s.header },
    /**
     * Bandeau de bord à bord.
     *
     * Les marges négatives annulent le rembourrage de page : sans elles le
     * bandeau s'arrêterait à 32 pt des bords et ressemblerait à un encadré
     * posé au milieu du papier, pas à un en-tête.
     */
    headerBand: {
      backgroundColor: band.background,
      marginTop: -s.page,
      marginLeft: -s.page,
      marginRight: -s.page,
      paddingTop: s.headerPad,
      paddingBottom: s.headerPad,
      paddingLeft: s.page,
      paddingRight: s.page,
      marginBottom: s.header,
    },
    headerTint: {
      backgroundColor: soft,
      borderRadius: 10,
      padding: s.headerPad,
      marginBottom: s.header,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    identity: { flexGrow: 1, flexShrink: 1 },
    /** Filet épais sous l'identité : la signature visuelle du modèle Classique. */
    headerUnderline: {
      height: 2.5,
      backgroundColor: accent,
      marginTop: 9,
    },

    name: { fontSize: t.name, fontWeight: 700, marginBottom: 2 },
    nameInverted: { fontSize: t.name, fontWeight: 700, marginBottom: 2, color: inverted },
    headline: { fontSize: t.headline, color: ink, marginBottom: 4 },
    headlineInverted: { fontSize: t.headline, color: inverted, marginBottom: 4 },
    // Les coordonnées sont une simple ligne de texte séparée par des tirets :
    // pas de tableau, pas d'icône — les deux cassent l'extraction.
    contact: { fontSize: t.meta, color: MUTED },
    contactInverted: { fontSize: t.meta, color: invertedMuted },

    photo: {
      width: spec.photo.size,
      height: spec.photo.size,
      borderRadius: photoRadius,
      objectFit: 'cover',
      marginLeft: spec.photo.align === 'right' ? 14 : 0,
      marginRight: spec.photo.align === 'left' ? 14 : 0,
    },
    photoOnBand: { borderWidth: 1.5, borderColor: inverted },
    photoOnPaper: { borderWidth: 1, borderColor: tint(accent, 0.35) },

    // --- En-têtes de section ---------------------------------------------
    sectionTitle: {
      fontSize: t.sectionTitle,
      fontWeight: 700,
      letterSpacing: t.titleTracking,
      // Le titre ne doit jamais rester seul en bas de page, sinon la section
      // suivante démarre orpheline et l'ordre de lecture devient trompeur.
      ...({ orphans: 2 } as Record<string, number>),
    },
    sectionTitleInk: { color: INK },
    sectionTitleAccent: { color: ink },

    sectionRuleWrap: { marginTop: s.section, marginBottom: 6 },
    sectionRule: {
      borderBottomWidth: 1,
      borderBottomColor: accent,
      marginTop: 3,
    },

    sectionBarWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: s.section,
      marginBottom: 5,
    },
    sectionBar: {
      width: 3,
      height: t.sectionTitle,
      borderRadius: 1.5,
      backgroundColor: accent,
      marginRight: 6,
    },

    sectionChipWrap: {
      alignSelf: 'flex-start',
      backgroundColor: soft,
      borderRadius: 4,
      paddingLeft: 7,
      paddingRight: 7,
      paddingTop: 3,
      paddingBottom: 3,
      marginTop: s.section,
      marginBottom: 6,
    },

    sectionPlainWrap: { marginTop: s.section, marginBottom: 5 },

    // --- Corps -------------------------------------------------------------
    entry: { marginBottom: s.entry },
    entryTitle: { fontSize: t.entryTitle, fontWeight: 700 },
    entryMeta: { fontSize: t.meta, color: MUTED, marginBottom: 2 },

    bulletRow: { flexDirection: 'row', marginBottom: s.bullet },
    bulletMark: { width: 10, color: ink },
    bulletText: { flex: 1 },

    paragraph: { marginBottom: 2 },
    inlineList: { marginBottom: 2 },

    // Réservé aux aplats : garde une référence au blanc pur pour les modèles
    // qui posent la photo sur une teinte claire.
    photoOnTint: { borderWidth: 1.5, borderColor: WHITE },
  });
}

export type ResumeStyles = ReturnType<typeof buildStyles>;
