import {
  accentSurface,
  getTemplate,
  inkAccent,
  normalizeAccent,
  tint,
  type TemplateId,
} from '@everyday/cv-core';

/**
 * Croquis d'un modèle de CV.
 *
 * Un dessin, pas un CV : des barres à la place des mots. Sur la page d'accueil,
 * une vignette de CV réel à 200 px de large ne se lit pas — on y devine du
 * texte gris sans distinguer ce qui change d'un modèle à l'autre. Le croquis
 * montre exactement ce qui les distingue : l'habillage de l'en-tête, la place
 * de la photo, la forme des titres de section, la densité du corps.
 *
 * Il reste honnête parce qu'il est *dérivé du descripteur* : marges, tailles et
 * espacements sont lus dans `TemplateSpec` et convertis à l'échelle du croquis,
 * comme l'aperçu et le PDF le font à la leur. Un modèle plus dense donne un
 * croquis plus dense, sans qu'on ait à y toucher.
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
  return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={color} opacity={opacity} />;
}

export function TemplateSketch({ templateId, accent, className = '' }: {
  templateId: TemplateId;
  /** Couleur primaire du croquis ; celle du modèle par défaut. */
  accent?: string;
  className?: string;
}) {
  const spec = getTemplate(templateId);
  const color = normalizeAccent(accent, spec.defaultAccent);
  const ink = inkAccent(color);
  const soft = tint(color, 0.14);
  const band = accentSurface(color);
  const inverted = band.text;

  const pad = spec.spacing.page * U;
  const photo = spec.photo.size * U;
  const isBand = spec.header === 'band';
  const tinted = spec.header === 'tint';
  const headerPad = spec.spacing.headerPad * U;

  // Hauteur du bloc d'identité : la photo commande, le texte tient dedans.
  const idHeight = Math.max(photo, 26 * U + spec.typography.name * U);
  const headerTop = isBand ? 0 : pad;
  const headerHeight = idHeight + (isBand || tinted ? headerPad * 2 : 0);
  const contentX = isBand || tinted ? pad + (tinted ? headerPad : 0) : pad;
  const innerW = W - 2 * pad - (tinted ? headerPad * 2 : 0);

  const photoX = spec.photo.align === 'left'
    ? contentX
    : contentX + innerW - photo;
  const textX = spec.photo.align === 'left' ? contentX + photo + 5 * U : contentX;
  const textW = innerW - photo - 5 * U;
  const textTop = headerTop + (isBand || tinted ? headerPad : 0) + (idHeight - 20 * U) / 2;

  // Corps : des sections jusqu'en bas de page, à la densité du modèle. Le
  // croquis se remplit donc comme une vraie page — un modèle dense en montre
  // davantage qu'un modèle aéré, ce qui est précisément ce qu'on compare.
  const bodyTop = headerTop + headerHeight + (spec.header === 'underline' ? 6 * U : 0)
    + spec.spacing.header * U;
  const lineGap = spec.typography.body * spec.typography.lineHeight * U;
  const sectionGap = spec.spacing.section * U;
  const titleH = spec.typography.sectionTitle * U * 0.8;

  const TITLE_WIDTHS = [34, 46, 28, 40, 38, 44];
  const sections: React.ReactNode[] = [];
  let y = bodyTop;
  for (let i = 0; y + titleH + 6 + 3 * lineGap < H - pad; i += 1) {
    const titleW = TITLE_WIDTHS[i % TITLE_WIDTHS.length] ?? 34;
    const titleX = spec.sectionStyle === 'bar' ? pad + 4 : pad;

    sections.push(
      <g key={`s${i}`}>
        {spec.sectionStyle === 'chip' ? (
          <rect
            x={pad - 2}
            y={y - 2}
            width={titleW + 6}
            height={titleH + 4}
            rx={2}
            fill={soft}
          />
        ) : null}
        {spec.sectionStyle === 'bar' ? (
          <rect x={pad} y={y} width={1.6} height={titleH} rx={0.8} fill={color} />
        ) : null}
        <Line
          x={titleX}
          y={y}
          w={titleW}
          h={titleH}
          color={spec.sectionStyle === 'rule' ? '#111111' : ink}
          opacity={spec.sectionStyle === 'rule' ? 0.8 : 1}
        />
        {spec.sectionStyle === 'rule' ? (
          <rect x={pad} y={y + titleH + 2} width={W - 2 * pad} height={0.7} fill={color} />
        ) : null}
        {[1, 0.94, 0.72].map((fraction, j) => (
          <Line
            key={j}
            x={pad}
            y={y + titleH + (spec.sectionStyle === 'rule' ? 6 : 4) + j * lineGap}
            w={(W - 2 * pad) * fraction}
            h={1.8}
            color="#111111"
            opacity={0.17}
          />
        ))}
      </g>,
    );
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

      {isBand ? (
        <rect x={0} y={0} width={W} height={headerHeight} fill={band.background} />
      ) : null}
      {tinted ? (
        <rect
          x={pad}
          y={pad}
          width={W - 2 * pad}
          height={headerHeight}
          rx={3}
          fill={soft}
        />
      ) : null}

      {/* Photo : le carré ou le rond que le modèle prévoit, au bon endroit. */}
      <g>
        <rect
          x={photoX}
          y={headerTop + (isBand || tinted ? headerPad : 0) + (idHeight - photo) / 2}
          width={photo}
          height={photo}
          rx={spec.photo.shape === 'circle' ? photo / 2 : 2}
          fill={isBand ? inverted : soft}
          stroke={isBand ? inverted : tint(color, 0.45)}
          strokeWidth={0.6}
          opacity={isBand ? 0.9 : 1}
        />
        <circle
          cx={photoX + photo / 2}
          cy={headerTop + (isBand || tinted ? headerPad : 0) + (idHeight - photo) / 2 + photo * 0.38}
          r={photo * 0.15}
          fill={color}
          opacity={0.35}
        />
        <path
          d={`M${photoX + photo * 0.22} ${headerTop + (isBand || tinted ? headerPad : 0) + (idHeight - photo) / 2 + photo * 0.95}
             a${photo * 0.28} ${photo * 0.26} 0 0 1 ${photo * 0.56} 0 Z`}
          fill={color}
          opacity={0.35}
        />
      </g>

      {/* Nom, titre professionnel, coordonnées. */}
      <Line x={textX} y={textTop} w={textW * 0.62} h={spec.typography.name * U * 0.55}
        color={isBand ? inverted : '#111111'} opacity={isBand ? 1 : 0.85} />
      <Line x={textX} y={textTop + spec.typography.name * U * 0.55 + 3} w={textW * 0.84} h={2}
        color={isBand ? inverted : ink} opacity={isBand ? 0.85 : 1} />
      <Line x={textX} y={textTop + spec.typography.name * U * 0.55 + 8} w={textW * 0.7} h={1.6}
        color={isBand ? inverted : '#111111'} opacity={isBand ? 0.6 : 0.3} />

      {spec.header === 'underline' ? (
        <rect x={pad} y={headerTop + headerHeight + 3} width={W - 2 * pad} height={1.6} fill={color} />
      ) : null}

      {sections}
    </svg>
  );
}
