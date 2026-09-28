import { accentSurface, inkAccent, mixColors, tint } from './colors.ts';
import type { TemplateSpec } from './templates.ts';

/**
 * Couleurs et géométrie d'une page, calculées une fois pour les deux renderers.
 *
 * L'aperçu HTML et le PDF dessinent la même page avec deux moteurs différents :
 * tout ce qui se calcule — teintes dérivées, largeur de la colonne latérale,
 * resserrement des espacements — est calculé ici, et nulle part ailleurs. Une
 * formule recopiée dans un renderer serait un aperçu qui ment.
 */

/** Noir pur pour le texte : le gris clair ressort mal une fois imprimé. */
export const INK = '#111111';
export const MUTED = '#444444';
export const WHITE = '#ffffff';

export interface TemplatePalette {
  accent: string;
  /** Primaire assombrie jusqu'à 4,5:1 sur blanc : titres et dates. */
  ink: string;
  /** Aplat plein (bandeau, barre de titre) et le texte qu'il porte. */
  band: string;
  inverted: string;
  invertedMuted: string;
  /** Teinte claire : pastilles, bloc teinté. */
  soft: string;
  /** Filets et frise : une primaire éclaircie, présente sans peser. */
  rule: string;
  photoBorder: string;
  sidebar: {
    background: string;
    text: string;
    muted: string;
    title: string;
    rule: string;
  };
}

export function templatePalette(spec: TemplateSpec, accent: string): TemplatePalette {
  const band = accentSurface(accent);
  const ink = inkAccent(accent);
  const soft = tint(accent, 0.12);
  const invertedMuted = mixColors(band.text, band.background, 0.28);

  const solid = spec.layout.kind === 'sidebar' && spec.layout.tone === 'solid';
  const sidebarBackground = solid ? band.background : tint(accent, 0.13);

  return {
    accent,
    ink,
    band: band.background,
    inverted: band.text,
    invertedMuted,
    soft,
    rule: tint(accent, 0.45),
    photoBorder: tint(accent, 0.35),
    sidebar: solid
      ? {
        background: sidebarBackground,
        text: band.text,
        muted: invertedMuted,
        title: band.text,
        rule: mixColors(band.text, band.background, 0.55),
      }
      : {
        background: sidebarBackground,
        text: INK,
        muted: MUTED,
        title: ink,
        rule: tint(accent, 0.4),
      },
  };
}

export interface PageMetrics {
  /** Marges de la page ; la colonne latérale est comptée dans le côté qu'elle occupe. */
  padTop: number;
  padBottom: number;
  padLeft: number;
  padRight: number;
  section: number;
  entry: number;
  bullet: number;
  header: number;
  lineHeight: number;
  /** Colonne latérale, `null` pour un modèle à un bloc. */
  sidebar: null | {
    side: 'left' | 'right';
    width: number;
    pad: number;
    /** Haut du contenu de la colonne : 0 quand la photo la coiffe bord à bord. */
    top: number;
  };
}

/** Plus serré que ça, un CV cesse d'être confortable à lire. */
export const MIN_DENSITY = 0.7;

/**
 * Géométrie de la page à une densité donnée.
 *
 * `density` vaut 1 pour le modèle tel qu'il est dessiné. L'export le baisse
 * quand un CV déborde de peu sur une page de plus : les espacements verticaux
 * et l'interligne se resserrent, jamais la taille du texte ni les marges
 * latérales — un CV lisible sur une page vaut mieux qu'un CV aéré sur deux
 * dont la seconde ne porte que trois lignes.
 */
export function pageMetrics(spec: TemplateSpec, hasPhoto: boolean, density = 1): PageMetrics {
  const d = Math.max(MIN_DENSITY, Math.min(1, density));
  const s = spec.spacing;
  const vertical = Math.max(24, s.page * (0.4 + 0.6 * d));
  const layout = spec.layout;
  const aside = layout.kind === 'sidebar' ? layout.width + s.page : s.page;

  return {
    padTop: vertical,
    padBottom: vertical,
    padLeft: layout.kind === 'sidebar' && layout.side === 'left' ? aside : s.page,
    padRight: layout.kind === 'sidebar' && layout.side === 'right' ? aside : s.page,
    section: s.section * d,
    entry: s.entry * d,
    bullet: s.bullet * d,
    header: s.header * d,
    lineHeight: 1 + (spec.typography.lineHeight - 1) * d,
    sidebar: layout.kind === 'sidebar'
      ? {
        side: layout.side,
        width: layout.width,
        pad: layout.pad,
        top: hasPhoto && spec.photo.align === 'bleed' ? 0 : vertical,
      }
      : null,
  };
}

/** Interlignes fixes des gros corps : hérités du corps de texte, ils se chevauchent. */
export const NAME_LINE_HEIGHT = 1.12;
export const TITLE_LINE_HEIGHT = 1.25;

/**
 * Interlettrage maximal, en fraction du corps.
 *
 * Mesuré sur le harnais ATS : à 1,4 pt sur un titre de 10,5 pt, l'extraction
 * rendait « E X P É R I E N C E » — les logiciels de tri interprètent un écart
 * entre deux glyphes comme une espace dès qu'il approche du dixième du corps.
 * Au-delà de ce plafond, l'effet « capitales espacées » coûte le mot-clé.
 */
export const MAX_TRACKING_RATIO = 0.08;

/** Interlettrage demandé, ramené sous le plafond lisible par la machine. */
export function safeTracking(fontSize: number, wanted: number): number {
  return Math.min(wanted, fontSize * MAX_TRACKING_RATIO);
}

/** Interlettrage d'un titre professionnel en capitales. */
export const HEADLINE_TRACKING = 0.8;
