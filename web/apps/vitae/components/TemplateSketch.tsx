import type { ReactNode } from 'react';
import {
  getTemplate,
  normalizeAccent,
  pageMetrics,
  templatePalette,
  type TemplateId,
} from '@everyday/cv-core';

/**
 * Croquis d'un modèle de CV.
 *
 * Un dessin, pas un CV : des barres à la place des mots. Sur la page d'accueil,
 * une vignette de CV réel à 200 px de large ne se lit pas — on y devine du
 * texte gris sans distinguer ce qui change d'un modèle à l'autre. Le croquis
 * montre exactement ce qui les distingue : la colonne latérale, l'habillage de
 * l'en-tête, la place de la photo, la forme des titres, la frise, la densité.
 *
 * Il reste honnête parce qu'il est *dérivé du descripteur* : marges, tailles,
 * espacements et teintes sont lus dans `TemplateSpec` et calculés par les
 * mêmes fonctions que l'aperçu et le PDF (`pageMetrics`, `templatePalette`),
 * puis convertis à l'échelle du croquis.
 */

/** Largeur d'une page A4 en points — l'unité dans laquelle un template parle. */
const PAGE_W = 595.28;
const PAGE_H = 841.89;

/** Largeur du croquis. Le facteur convertit les points du descripteur. */
const W = 120;
const H = (W * PAGE_H) / PAGE_W;
const U = W / PAGE_W;

/** Barre de texte simulée. */
function Line({ x, y, w, h, color, opacity = 1 }: {
  x: number; y: number; w: number; h: number; color: string; opacity?: number;
}) {
  return <rect x={x} y={y} width={Math.max(0, w)} height={h} rx={h / 2} fill={color} opacity={opacity} />;
}

/** Silhouette de photo : le rond ou le carré du modèle, une tête, des épaules. */
function PhotoMark({ x, y, size, round, fill, stroke, figure }: {
  x: number; y: number; size: number; round: boolean; fill: string; stroke: string; figure: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} rx={round ? size / 2 : Math.min(2, size / 8)}
        fill={fill} stroke={stroke} strokeWidth={0.6} />
      <circle cx={x + size / 2} cy={y + size * 0.4} r={size * 0.15} fill={figure} opacity={0.4} />
      <path
        d={`M${x + size * 0.22} ${y + size * 0.92} a${size * 0.28} ${size * 0.25} 0 0 1 ${size * 0.56} 0 Z`}
        fill={figure}
        opacity={0.4}
      />
    </g>
  );
}

const TITLE_WIDTHS = [34, 46, 28, 40, 38, 44];

export function TemplateSketch({ templateId, accent, className = '' }: {
  templateId: TemplateId;
  /** Couleur primaire du croquis ; celle du modèle par défaut. */
  accent?: string;
  className?: string;
}) {
  const spec = getTemplate(templateId);
  const c = templatePalette(spec, normalizeAccent(accent, spec.defaultAccent));
  const m = pageMetrics(spec, true);
  const t = spec.typography;

  const isBand = spec.header === 'band';
  const tinted = spec.header === 'tint';
  const centered = spec.header === 'centered';
  const aside = m.sidebar;
  const headerPad = spec.spacing.headerPad * U;

  // Zone du corps : toute la largeur utile, colonne latérale déduite.
  const left = m.padLeft * U;
  const right = W - m.padRight * U;
  const bodyW = right - left;
  const top = m.padTop * U;

  const nodes: ReactNode[] = [];

  // --- Colonne latérale ----------------------------------------------------
  if (aside !== null) {
    const x0 = aside.side === 'left' ? 0 : W - aside.width * U;
    const w = aside.width * U;
    const pad = aside.pad * U;
    nodes.push(<rect key="aside" x={x0} y={0} width={w} height={H} fill={c.sidebar.background} />);
    let y = aside.top * U;
    if (spec.photo.align === 'bleed') {
      nodes.push(
        <PhotoMark key="ph" x={x0} y={0} size={w} round={false}
          fill={c.soft} stroke={c.soft} figure={c.accent} />,
      );
      y = w + 6;
    } else {
      const size = spec.photo.size * U;
      nodes.push(
        <PhotoMark key="ph" x={x0 + (w - size) / 2} y={y} size={size} round={spec.photo.shape === 'circle'}
          fill={c.sidebar.text === c.inverted ? c.sidebar.rule : '#ffffff'}
          stroke={c.sidebar.rule} figure={c.sidebar.text} />,
      );
      y += size + 7;
    }
    for (let block = 0; y < H - 12; block += 1) {
      nodes.push(
        <Line key={`at${block}`} x={x0 + pad} y={y} w={w * 0.5} h={1.8} color={c.sidebar.title} />,
        <rect key={`ar${block}`} x={x0 + pad} y={y + 3} width={w - 2 * pad} height={0.4}
          fill={c.sidebar.rule} />,
      );
      y += 6;
      const lines = [4, 6, 3][block % 3] ?? 4;
      for (let i = 0; i < lines && y < H - 6; i += 1) {
        nodes.push(
          <Line key={`al${block}-${i}`} x={x0 + pad} y={y} w={(w - 2 * pad) * (0.5 + ((i * 37) % 40) / 100)}
            h={1.3} color={c.sidebar.text} opacity={0.45} />,
        );
        y += 3.4;
      }
      y += 5;
    }
  }

  // --- Bloc d'identité -----------------------------------------------------
  const photo = aside === null ? spec.photo.size * U : 0;
  const nameH = t.name * U * 0.55;
  let bodyTop: number;

  if (centered) {
    let y = top;
    nodes.push(
      <PhotoMark key="ph" x={W / 2 - photo / 2} y={y} size={photo} round={spec.photo.shape === 'circle'}
        fill={c.soft} stroke={c.photoBorder} figure={c.accent} />,
    );
    y += photo + 4;
    nodes.push(
      <Line key="n" x={W / 2 - bodyW * 0.3} y={y} w={bodyW * 0.6} h={nameH} color="#111111" opacity={0.85} />,
      <Line key="h" x={W / 2 - bodyW * 0.2} y={y + nameH + 3} w={bodyW * 0.4} h={1.8} color={c.ink} />,
      <Line key="c" x={W / 2 - bodyW * 0.3} y={y + nameH + 7} w={bodyW * 0.6} h={1.3} color="#111111" opacity={0.3} />,
      <rect key="hr" x={left} y={y + nameH + 12} width={bodyW} height={0.5} fill={c.rule} />,
    );
    bodyTop = y + nameH + 12 + m.header * U;
  } else {
    const idHeight = Math.max(photo, 26 * U + nameH);
    const headerTop = isBand ? 0 : top;
    const inset = isBand || tinted ? headerPad : 0;
    const headerHeight = idHeight + inset * 2;
    const innerX = tinted ? left + headerPad : left;
    const innerW = tinted ? bodyW - 2 * headerPad : bodyW;

    if (isBand) nodes.push(<rect key="band" x={0} y={0} width={W} height={headerHeight} fill={c.band} />);
    if (tinted) {
      nodes.push(<rect key="tint" x={left} y={top} width={bodyW} height={headerHeight} rx={3} fill={c.soft} />);
    }

    const photoX = spec.photo.align === 'left' ? innerX : innerX + innerW - photo;
    if (photo > 0) {
      nodes.push(
        <PhotoMark key="ph" x={photoX} y={headerTop + inset + (idHeight - photo) / 2} size={photo}
          round={spec.photo.shape === 'circle'}
          fill={isBand ? c.inverted : c.soft} stroke={isBand ? c.inverted : c.photoBorder} figure={c.accent} />,
      );
    }
    const textX = spec.photo.align === 'left' && photo > 0 ? innerX + photo + 5 * U : innerX;
    const textW = innerW - photo - 5 * U;
    const textTop = headerTop + inset + (idHeight - 20 * U) / 2 - (aside !== null ? 6 : 0);
    const nameColor = isBand ? c.inverted : spec.identity.accentName ? c.ink : '#111111';
    nodes.push(
      <Line key="n" x={textX} y={textTop} w={textW * 0.62} h={nameH} color={nameColor}
        opacity={isBand || spec.identity.accentName ? 1 : 0.85} />,
      <Line key="h" x={textX} y={textTop + nameH + 3} w={textW * 0.5} h={2}
        color={isBand ? c.inverted : c.ink} opacity={isBand ? 0.85 : 1} />,
    );
    if (aside === null) {
      nodes.push(
        <Line key="c" x={textX} y={textTop + nameH + 8} w={textW * 0.7} h={1.6}
          color={isBand ? c.inverted : '#111111'} opacity={isBand ? 0.6 : 0.3} />,
      );
    } else {
      nodes.push(<rect key="ab" x={textX} y={textTop + nameH + 8} width={8} height={0.9} fill={c.accent} />);
    }
    if (spec.header === 'underline') {
      nodes.push(<rect key="ul" x={left} y={headerTop + headerHeight + 3} width={bodyW} height={1.6} fill={c.accent} />);
    }
    bodyTop = headerTop + headerHeight + (spec.header === 'underline' ? 6 * U : 0) + m.header * U;
  }

  // --- Corps : des sections jusqu'en bas de page, à la densité du modèle ----
  const lineGap = t.body * m.lineHeight * U;
  const sectionGap = m.section * U;
  const titleH = t.sectionTitle * U * 0.8;
  const timeline = spec.entryStyle === 'timeline';
  const dated = spec.entryStyle !== 'stacked';
  let y = bodyTop;

  for (let i = 0; y + titleH + 6 + 3 * lineGap < H - m.padBottom * U; i += 1) {
    const titleW = TITLE_WIDTHS[i % TITLE_WIDTHS.length] ?? 34;
    const style = spec.sectionStyle;
    const titleX = style === 'bar' ? left + 4 : style === 'banner' ? left + 3 : left;
    const titleColor = style === 'rule' ? '#111111' : style === 'banner' ? c.inverted : c.ink;
    const g: ReactNode[] = [];

    if (style === 'chip') {
      g.push(<rect key="chip" x={left - 2} y={y - 2} width={titleW + 6} height={titleH + 4} rx={2} fill={c.soft} />);
    }
    if (style === 'banner') {
      g.push(<rect key="banner" x={left} y={y - 1.5} width={bodyW} height={titleH + 3} fill={c.band} />);
    }
    if (style === 'bar') g.push(<rect key="bar" x={left} y={y} width={1.6} height={titleH} rx={0.8} fill={c.accent} />);
    g.push(
      <Line key="t" x={titleX} y={y} w={Math.min(titleW, bodyW * 0.6)} h={titleH} color={titleColor}
        opacity={style === 'rule' ? 0.8 : 1} />,
    );
    if (style === 'rule') {
      g.push(<rect key="rule" x={left} y={y + titleH + 2} width={bodyW} height={0.7} fill={c.accent} />);
    }
    if (style === 'line') {
      const start = left + Math.min(titleW, bodyW * 0.6) + 3;
      g.push(<rect key="line" x={start} y={y + titleH / 2} width={right - start} height={0.5} fill={c.rule} />);
    }

    const textTop = y + titleH + (style === 'rule' || style === 'banner' ? 6 : 4);
    const textX = timeline ? left + 6 : left;
    const textW = right - textX;
    if (timeline) {
      g.push(
        <rect key="tl" x={left + 1.6} y={textTop} width={0.5} height={3 * lineGap} fill={c.rule} />,
        <circle key="dot" cx={left + 1.85} cy={textTop + 0.9} r={1.4} fill={c.accent} />,
      );
    }
    [1, 0.94, 0.72].forEach((fraction, j) => {
      g.push(
        <Line key={`b${j}`} x={textX} y={textTop + j * lineGap} w={textW * fraction * (dated && j === 0 ? 0.55 : 1)}
          h={1.8} color="#111111" opacity={j === 0 && dated ? 0.5 : 0.17} />,
      );
    });
    if (dated) {
      g.push(<Line key="d" x={right - textW * 0.2} y={textTop} w={textW * 0.2} h={1.5} color={c.ink} opacity={0.7} />);
    }

    nodes.push(<g key={`s${i}`}>{g}</g>);
    y += titleH + 6 + 3 * lineGap + sectionGap;
  }

  return (
    <svg
      role="img"
      aria-label={`Aperçu dessiné du modèle ${spec.name}`}
      viewBox={`0 0 ${W} ${H}`}
      className={className}
    >
      <rect width={W} height={H} fill="#ffffff" />
      {nodes}
    </svg>
  );
}
