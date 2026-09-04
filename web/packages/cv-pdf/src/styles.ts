import { StyleSheet } from '@react-pdf/renderer';
import type { TemplateSpec } from '@everyday/cv-core';
import { FONT_FAMILY } from './fonts.ts';

/**
 * Feuille de style dérivée du descripteur de template.
 *
 * Rien n'est codé en dur ici : toutes les tailles, marges et casses viennent de
 * `TemplateSpec`. C'est ce qui permet à l'aperçu HTML de l'éditeur et à ce
 * document PDF de rester alignés sans se copier l'un l'autre.
 */

/** Noir pur pour le texte : le gris clair ressort mal une fois imprimé. */
const INK = '#111111';
const MUTED = '#444444';
const RULE = '#999999';

export function buildStyles(spec: TemplateSpec) {
  const { typography: t, spacing: s } = spec;

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

    name: { fontSize: t.name, fontWeight: 700, marginBottom: 2 },
    headline: { fontSize: t.headline, color: MUTED, marginBottom: 4 },
    // Les coordonnées sont une simple ligne de texte séparée par des tirets :
    // pas de tableau, pas d'icône — les deux cassent l'extraction.
    contact: { fontSize: t.meta, color: MUTED },

    sectionTitle: {
      fontSize: t.sectionTitle,
      fontWeight: 700,
      marginTop: s.section,
      marginBottom: spec.sectionRule ? 3 : 5,
      // Le titre ne doit jamais rester seul en bas de page, sinon la section
      // suivante démarre orpheline et l'ordre de lecture devient trompeur.
      ...({ orphans: 2 } as Record<string, number>),
    },
    sectionRule: {
      borderBottomWidth: 0.75,
      borderBottomColor: RULE,
      marginBottom: 6,
    },

    entry: { marginBottom: s.entry },
    entryTitle: { fontSize: t.entryTitle, fontWeight: 700 },
    entryMeta: { fontSize: t.meta, color: MUTED, marginBottom: 2 },

    bulletRow: { flexDirection: 'row', marginBottom: s.bullet },
    bulletMark: { width: 10 },
    bulletText: { flex: 1 },

    paragraph: { marginBottom: 2 },
    inlineList: { marginBottom: 2 },
  });
}

export type ResumeStyles = ReturnType<typeof buildStyles>;
