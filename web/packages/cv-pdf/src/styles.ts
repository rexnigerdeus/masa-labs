import { StyleSheet } from '@react-pdf/renderer';
import {
  INK,
  MUTED,
  HEADLINE_TRACKING,
  NAME_LINE_HEIGHT,
  TITLE_LINE_HEIGHT,
  WHITE,
  safeTracking,
  type PageMetrics,
  type TemplatePalette,
  type TemplateSpec,
} from '@everyday/cv-core';
import { FONT_FAMILY } from './fonts.ts';

/**
 * Feuille de style dérivée du descripteur de template, de la palette et de la
 * géométrie de page.
 *
 * Rien n'est codé en dur ici : tailles et casses viennent de `TemplateSpec`,
 * teintes de `templatePalette`, marges et espacements de `pageMetrics` — les
 * mêmes fonctions que lit l'aperçu HTML de l'éditeur. C'est ce qui garde les
 * deux alignés sans qu'ils se copient.
 */
export function buildStyles(spec: TemplateSpec, c: TemplatePalette, m: PageMetrics) {
  const { typography: t, identity: id } = spec;
  const photoRadius = spec.photo.shape === 'circle' ? spec.photo.size / 2 : 8;
  const bleed = m.sidebar !== null && spec.photo.align === 'bleed';
  const sidebarWidth = m.sidebar?.width ?? 0;

  return StyleSheet.create({
    page: {
      fontFamily: FONT_FAMILY,
      fontSize: t.body,
      lineHeight: m.lineHeight,
      color: INK,
      paddingTop: m.padTop,
      paddingBottom: m.padBottom,
      paddingLeft: m.padLeft,
      paddingRight: m.padRight,
      flexDirection: 'column',
    },

    // --- Colonne latérale --------------------------------------------------
    /** Aplat de la colonne, répété sur chaque page (`fixed`) : aucun texte. */
    sidebarBackdrop: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: m.sidebar?.side === 'left' ? 0 : undefined,
      right: m.sidebar?.side === 'right' ? 0 : undefined,
      width: sidebarWidth,
      backgroundColor: c.sidebar.background,
    },
    sidebarColumn: {
      position: 'absolute',
      top: m.sidebar?.top ?? 0,
      left: m.sidebar?.side === 'left' ? 0 : undefined,
      right: m.sidebar?.side === 'right' ? 0 : undefined,
      width: sidebarWidth,
      paddingLeft: m.sidebar?.pad ?? 0,
      paddingRight: m.sidebar?.pad ?? 0,
      color: c.sidebar.text,
    },
    sidebarBlock: { marginBottom: m.section },
    sidebarTitle: {
      fontSize: t.sectionTitle,
      fontWeight: 700,
      lineHeight: TITLE_LINE_HEIGHT,
      letterSpacing: safeTracking(t.sectionTitle, t.titleTracking),
      color: c.sidebar.title,
      paddingBottom: 3,
      borderBottomWidth: 0.8,
      borderBottomColor: c.sidebar.rule,
      marginBottom: 6,
    },
    sidebarLine: { fontSize: t.meta + 0.5, marginBottom: 3 },
    sidebarMuted: { fontSize: t.meta, color: c.sidebar.muted, marginBottom: 3 },
    sidebarPhoto: bleed
      ? {
        width: sidebarWidth,
        height: sidebarWidth,
        objectFit: 'cover',
        marginLeft: -(m.sidebar?.pad ?? 0),
        marginBottom: m.section + 4,
      }
      : {
        width: spec.photo.size,
        height: spec.photo.size,
        borderRadius: photoRadius,
        objectFit: 'cover',
        alignSelf: 'center',
        borderWidth: 2,
        borderColor: c.sidebar.text === INK ? WHITE : c.sidebar.rule,
        marginBottom: m.section + 4,
      },

    // --- Bloc d'identité -------------------------------------------------
    header: { marginBottom: m.header },
    /**
     * Bandeau de bord à bord.
     *
     * Les marges négatives annulent le rembourrage de page : sans elles le
     * bandeau s'arrêterait aux marges et ressemblerait à un encadré posé au
     * milieu du papier, pas à un en-tête.
     */
    headerBand: {
      backgroundColor: c.band,
      marginTop: -m.padTop,
      marginLeft: -m.padLeft,
      marginRight: -m.padRight,
      paddingTop: spec.spacing.headerPad,
      paddingBottom: spec.spacing.headerPad,
      paddingLeft: m.padLeft,
      paddingRight: m.padRight,
      marginBottom: m.header,
    },
    headerTint: {
      backgroundColor: c.soft,
      borderRadius: 10,
      padding: spec.spacing.headerPad,
      marginBottom: m.header,
    },
    headerCentered: { marginBottom: m.header, alignItems: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    identity: { flexGrow: 1, flexShrink: 1 },
    identityCentered: { alignItems: 'center' },
    /** Filet épais sous l'identité : la signature visuelle du modèle Classique. */
    headerUnderline: { height: 2.5, backgroundColor: c.accent, marginTop: 9 },
    /** Filet fin pleine largeur sous un en-tête centré. */
    headerHairline: {
      alignSelf: 'stretch',
      height: 0.8,
      backgroundColor: c.rule,
      marginTop: 10,
    },
    /** Court trait sous le titre d'un modèle à colonne. */
    headerAccentBar: { width: 34, height: 2.5, backgroundColor: c.accent, marginTop: 6 },

    // Interligne propre au nom : hérité du corps (10 pt × 1,4), il donnait au
    // nom de 23 pt une ligne de 14 pt, et le titre remontait dessus.
    name: {
      fontSize: t.name,
      fontWeight: 700,
      lineHeight: NAME_LINE_HEIGHT,
      letterSpacing: safeTracking(t.name, id.tracking),
      textTransform: id.uppercase ? 'uppercase' : 'none',
      color: id.accentName ? c.ink : INK,
      marginBottom: 3,
    },
    nameInverted: {
      fontSize: t.name,
      fontWeight: 700,
      lineHeight: NAME_LINE_HEIGHT,
      letterSpacing: safeTracking(t.name, id.tracking),
      textTransform: id.uppercase ? 'uppercase' : 'none',
      color: c.inverted,
      marginBottom: 3,
    },
    headline: {
      fontSize: t.headline,
      lineHeight: TITLE_LINE_HEIGHT,
      letterSpacing: id.headlineUppercase ? safeTracking(t.headline, HEADLINE_TRACKING) : 0,
      textTransform: id.headlineUppercase ? 'uppercase' : 'none',
      color: c.ink,
      marginBottom: 4,
    },
    headlineInverted: {
      fontSize: t.headline,
      lineHeight: TITLE_LINE_HEIGHT,
      letterSpacing: id.headlineUppercase ? safeTracking(t.headline, HEADLINE_TRACKING) : 0,
      textTransform: id.headlineUppercase ? 'uppercase' : 'none',
      color: c.inverted,
      marginBottom: 4,
    },
    // Les coordonnées sont une simple ligne de texte séparée par des tirets :
    // pas de tableau, pas d'icône — les deux cassent l'extraction.
    contact: { fontSize: t.meta, color: MUTED },
    contactInverted: { fontSize: t.meta, color: c.invertedMuted },
    textCenter: { textAlign: 'center' },

    photo: {
      width: spec.photo.size,
      height: spec.photo.size,
      borderRadius: photoRadius,
      objectFit: 'cover',
      marginLeft: spec.photo.align === 'right' ? 14 : 0,
      marginRight: spec.photo.align === 'left' ? 14 : 0,
      marginBottom: spec.photo.align === 'center' ? 10 : 0,
    },
    photoOnBand: { borderWidth: 1.5, borderColor: c.inverted },
    photoOnPaper: { borderWidth: 1, borderColor: c.photoBorder },
    photoOnTint: { borderWidth: 1.5, borderColor: WHITE },

    // --- En-têtes de section ---------------------------------------------
    sectionTitle: {
      fontSize: t.sectionTitle,
      fontWeight: 700,
      lineHeight: TITLE_LINE_HEIGHT,
      letterSpacing: safeTracking(t.sectionTitle, t.titleTracking),
    },
    sectionTitleInk: { color: INK },
    sectionTitleAccent: { color: c.ink },
    sectionTitleInverted: { color: c.inverted },

    sectionRuleWrap: { marginTop: m.section, marginBottom: 6 },
    sectionRule: { borderBottomWidth: 1, borderBottomColor: c.accent, marginTop: 3 },

    sectionBarWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: m.section,
      marginBottom: 5,
    },
    sectionBar: {
      width: 3,
      height: t.sectionTitle,
      borderRadius: 1.5,
      backgroundColor: c.accent,
      marginRight: 6,
    },

    sectionChipWrap: {
      alignSelf: 'flex-start',
      backgroundColor: c.soft,
      borderRadius: 4,
      paddingLeft: 7,
      paddingRight: 7,
      paddingTop: 3,
      paddingBottom: 3,
      marginTop: m.section,
      marginBottom: 6,
    },

    sectionPlainWrap: { marginTop: m.section, marginBottom: 5 },

    sectionBannerWrap: {
      backgroundColor: c.band,
      paddingTop: 3.5,
      paddingBottom: 3.5,
      paddingLeft: 8,
      paddingRight: 8,
      marginTop: m.section,
      marginBottom: 8,
    },

    sectionLineWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: m.section,
      marginBottom: 6,
    },
    sectionLine: { flexGrow: 1, height: 0.8, backgroundColor: c.rule, marginLeft: 8 },

    // --- Corps -------------------------------------------------------------
    entry: { marginBottom: m.entry },
    entryTitle: { fontSize: t.entryTitle, fontWeight: 700 },
    entryMeta: { fontSize: t.meta, color: MUTED, marginBottom: 2 },

    /** `dated` / `timeline` : intitulé à gauche, dates à droite. */
    entryHead: { flexDirection: 'row', alignItems: 'flex-start' },
    entryHeadTitle: { flexGrow: 1, flexShrink: 1, fontSize: t.entryTitle, fontWeight: 700 },
    entryDates: {
      fontSize: t.meta,
      fontStyle: 'italic',
      color: c.ink,
      marginLeft: 10,
      textAlign: 'right',
    },
    entryOrg: { fontSize: t.meta, fontStyle: 'italic', color: MUTED, marginBottom: 2 },

    /**
     * Frise : chaque entrée porte son tronçon de trait, sans marge entre deux
     * entrées — l'espacement est un rembourrage, pour que le trait reste
     * continu d'une entrée à l'autre.
     */
    timelineEntry: {
      borderLeftWidth: 1,
      borderLeftColor: c.rule,
      marginLeft: 4,
      paddingLeft: 13,
      paddingBottom: m.entry,
    },
    timelineDot: {
      position: 'absolute',
      left: -4.5,
      top: (t.entryTitle * m.lineHeight - 8) / 2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.accent,
      borderWidth: 1.5,
      borderColor: WHITE,
    },

    bulletRow: { flexDirection: 'row', marginBottom: m.bullet },
    bulletMark: { width: 10, color: c.ink },
    bulletText: { flex: 1 },

    paragraph: { marginBottom: 2 },
    inlineList: { marginBottom: 2 },
  });
}

export type ResumeStyles = ReturnType<typeof buildStyles>;
