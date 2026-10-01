import type { ReactNode } from 'react';
import {
  HEADLINE_TRACKING,
  INK,
  NAME_LINE_HEIGHT,
  SAMPLE_RESUME,
  TITLE_LINE_HEIGHT,
  compareByRecency,
  contactTitle,
  formatDate,
  formatRange,
  getTemplate,
  mainSections,
  normalizeAccent,
  pageMetrics,
  safeTracking,
  sectionTitle,
  sidebarSections,
  templatePalette,
  type Resume,
  type SectionId,
  type TemplateId,
} from '@everyday/cv-core';

/**
 * Croquis d'un modèle de CV, pour la page d'accueil.
 *
 * Un dessin, pas un CV : sur la page d'accueil, une vignette de CV réel à
 * 200 px de large ne se lit pas — on y devine du texte gris sans distinguer ce
 * qui change d'un modèle à l'autre. Le croquis montre ce qui les distingue :
 * la colonne latérale, l'habillage de l'en-tête, la place de la photo, la
 * forme des titres, la frise, la densité. (Au moment de *choisir*, dans le
 * parcours, on montre au contraire de vrais CV : voir `TemplateStep`.)
 *
 * Réaliste parce qu'il est *composé*, pas dessiné à main levée : chaque mot
 * du CV d'exemple devient une barre de la largeur qu'il occuperait, à la
 * taille, en capitales et avec l'interlettrage du modèle, et les lignes se
 * coupent là où le texte se couperait. Un titre en capitales espacées sort
 * donc plus long qu'un titre en bas de casse, une expérience à trois missions
 * plus haute qu'une à deux, un modèle dense plus rempli qu'un modèle aéré.
 *
 * Honnête parce qu'il est *dérivé du descripteur* : marges, tailles,
 * espacements et teintes sont lus dans `TemplateSpec` et calculés par les
 * mêmes fonctions que l'aperçu et le PDF (`pageMetrics`, `templatePalette`,
 * `safeTracking`), puis convertis à l'échelle du croquis.
 */

/** Page A4 en points — l'unité dans laquelle un template parle. */
const PAGE_W = 595.28;
const PAGE_H = 841.89;

/** Largeur du croquis ; `U` convertit un point du descripteur en unité de croquis. */
const W = 120;
const H = (W * PAGE_H) / PAGE_W;
const U = W / PAGE_W;

/** Chasse moyenne d'un caractère de Roboto, en em : bas de casse, capitales. */
const CHAR = 0.5;
const CHAR_CAPS = 0.66;
/** Espace entre deux mots, en em. */
const SPACE = 0.28;

const LEVEL_LABELS: Record<string, string> = {
  natif: 'langue maternelle',
  courant: 'courant',
  intermediaire: 'intermédiaire',
  debutant: 'notions',
};

/** Style d'un texte simulé. Tailles et interlettrage en points, comme le descripteur. */
interface Ink {
  size: number;
  color: string;
  opacity?: number;
  bold?: boolean;
  caps?: boolean;
  tracking?: number;
}

const wordWidth = (word: string, s: Ink): number =>
  (word.length * s.size * (s.caps ? CHAR_CAPS : CHAR) * (s.bold ? 1.06 : 1)
    + Math.max(0, word.length - 1) * (s.tracking ?? 0)) * U;

/** Hauteur de la barre : l'œil du bas de casse, ou la hauteur des capitales. */
const barHeight = (s: Ink): number => s.size * U * (s.caps ? 0.66 : 0.5);

const textWidth = (text: string, s: Ink): number => {
  const words = text.split(/\s+/).filter(Boolean);
  return words.reduce((sum, w) => sum + wordWidth(w, s), 0)
    + Math.max(0, words.length - 1) * s.size * SPACE * U;
};

/**
 * CV d'exemple étoffé d'un poste et d'un diplôme.
 *
 * Celui de référence tient sur une demi-page : son croquis laissait une moitié
 * de feuille blanche, qui montre mal la densité et le rythme d'un modèle. Le
 * contenu ajouté est du même registre — un premier emploi, un baccalauréat.
 */
const SKETCH_RESUME: Resume = {
  ...SAMPLE_RESUME,
  experiences: [
    ...SAMPLE_RESUME.experiences,
    {
      id: 'e3',
      role: 'Caissière',
      company: 'Supermarché du Plateau',
      location: 'Abidjan',
      start: { year: 2020, month: 7 },
      end: { year: 2021, month: 8 },
      current: false,
      bullets: [
        'Encaissé en moyenne 180 clients par jour sans écart de caisse sur quatorze mois',
        'Formé deux nouvelles recrues aux procédures d’ouverture et de clôture',
      ],
    },
  ],
  education: [
    ...SAMPLE_RESUME.education,
    {
      id: 'f2',
      degree: 'Baccalauréat série G2',
      school: 'Lycée technique d’Abidjan',
      location: 'Abidjan',
      start: null,
      end: { year: 2019 },
      details: ['Mention assez bien'],
    },
  ],
};

const clean = (values: (string | null | undefined)[]): string[] =>
  values.filter((v): v is string => v != null && v.trim() !== '');

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
  const cv = SKETCH_RESUME;
  const clipId = `sketch-photo-${spec.id}`;

  const nodes: ReactNode[] = [];
  let key = 0;
  const k = (): string => String((key += 1));

  /**
   * Compose `text` en barres, de `x` à `x + w`, ligne après ligne. Renvoie le
   * haut de la ligne suivante. Rien n'est dessiné sous `limit` : une page
   * coupe son texte, elle ne déborde pas. `draw = false` mesure sans dessiner.
   */
  const flow = (text: string, x: number, y: number, w: number, s: Ink, lead: number, limit: number,
    draw = true): number => {
    const bar = barHeight(s);
    const gap = s.size * SPACE * U;
    let cx = x;
    let cy = y;
    for (const word of text.split(/\s+/).filter(Boolean)) {
      const ww = Math.min(wordWidth(word, s), w);
      if (cx > x && cx + ww > x + w) {
        cx = x;
        cy += lead;
      }
      if (draw && cy + bar <= limit) {
        nodes.push(
          <rect key={k()} x={cx} y={cy + (lead - bar) / 2} width={ww} height={bar}
            rx={bar * 0.3} fill={s.color} opacity={s.opacity ?? 1} />,
        );
      }
      cx += ww + gap;
    }
    return cy + lead;
  };

  /** Une seule ligne, alignée, sans retour : noms, dates, titres. */
  const run = (text: string, x: number, y: number, s: Ink, lead: number,
    align: 'left' | 'right' | 'center' = 'left'): number => {
    const width = textWidth(text, s);
    const start = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
    flow(text, start, y, width + 0.01, s, lead, H);
    return width;
  };

  /* --- Photo : découpe du modèle, portrait stylisé ------------------------ */
  const photo = (x: number, y: number, size: number, round: boolean, ring: string): void => {
    const id = `${clipId}-${k()}`;
    const radius = round ? size / 2 : Math.min(8 * U, size / 8);
    nodes.push(
      <g key={k()}>
        <defs>
          <clipPath id={id}>
            <rect x={x} y={y} width={size} height={size} rx={radius} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id})`}>
          <rect x={x} y={y} width={size} height={size} fill={c.soft} />
          <circle cx={x + size / 2} cy={y + size * 0.4} r={size * 0.17} fill={c.accent} opacity={0.5} />
          <ellipse cx={x + size / 2} cy={y + size * 1.02} rx={size * 0.36} ry={size * 0.34}
            fill={c.accent} opacity={0.5} />
        </g>
        <rect x={x} y={y} width={size} height={size} rx={radius} fill="none" stroke={ring} strokeWidth={0.5} />
      </g>,
    );
  };

  const aside = m.sidebar;
  const left = m.padLeft * U;
  const right = W - m.padRight * U;
  const bodyW = right - left;
  const bottom = H - m.padBottom * U;

  /* --- Colonne latérale ---------------------------------------------------- */
  if (aside !== null) {
    const x0 = aside.side === 'left' ? 0 : W - aside.width * U;
    const w = aside.width * U;
    const pad = aside.pad * U;
    const inner = w - 2 * pad;
    const limit = H - 10 * U;
    nodes.push(<rect key={k()} x={x0} y={0} width={w} height={H} fill={c.sidebar.background} />);

    let y = aside.top * U;
    if (spec.photo.align === 'bleed') {
      photo(x0, 0, w, false, c.sidebar.background);
      y = w + (m.section + 4) * U;
    } else {
      const size = spec.photo.size * U;
      photo(x0 + (w - size) / 2, y, size, spec.photo.shape === 'circle', c.sidebar.rule);
      y += size + (m.section + 4) * U;
    }

    const title: Ink = {
      size: t.sectionTitle, color: c.sidebar.title, bold: true,
      caps: spec.uppercaseSectionTitles, tracking: safeTracking(t.sectionTitle, t.titleTracking),
    };
    const line: Ink = { size: t.meta + 0.5, color: c.sidebar.text, opacity: 0.55 };
    const muted: Ink = { size: t.meta, color: c.sidebar.muted, opacity: 0.55 };
    const lead = (t.meta + 0.5) * 1.35 * U;

    const block = (heading: string, lines: string[], mutedLines: string[] = []): void => {
      if (y > limit) return;
      flow(heading, x0 + pad, y, inner, title, t.sectionTitle * TITLE_LINE_HEIGHT * U, limit);
      y += t.sectionTitle * TITLE_LINE_HEIGHT * U + 3 * U;
      nodes.push(<rect key={k()} x={x0 + pad} y={y} width={inner} height={0.8 * U} fill={c.sidebar.rule} />);
      y += 6 * U;
      for (const l of lines) y = flow(l, x0 + pad, y, inner, line, lead, limit) + 3 * U;
      for (const l of mutedLines) y = flow(l, x0 + pad, y, inner, muted, lead, limit) + 3 * U;
      y += m.section * U;
    };

    const p = cv.personal;
    block(contactTitle(spec), clean([p.location, p.phone, p.email, ...p.links]));
    for (const section of sidebarSections(spec)) {
      if (section === 'skills') block(sectionTitle(spec, section), cv.skills);
      if (section === 'extras') {
        block(
          sectionTitle(spec, section),
          cv.languages.map((l) => `${l.name} (${LEVEL_LABELS[l.level] ?? l.level})`),
          cv.certifications.map((x) => clean([x.name, x.issuer, formatDate(x.date)]).join(' — ')),
        );
      }
    }
  }

  /* --- Bloc d'identité ----------------------------------------------------- */
  const band = spec.header === 'band';
  const tinted = spec.header === 'tint';
  const centered = spec.header === 'centered';
  const id = spec.identity;
  const nameInk: Ink = {
    size: t.name, bold: true, caps: id.uppercase, tracking: safeTracking(t.name, id.tracking),
    color: band ? c.inverted : id.accentName ? c.ink : INK, opacity: band || id.accentName ? 1 : 0.88,
  };
  const headlineInk: Ink = {
    size: t.headline, caps: id.headlineUppercase,
    tracking: id.headlineUppercase ? safeTracking(t.headline, HEADLINE_TRACKING) : 0,
    color: band ? c.inverted : c.ink, opacity: band ? 0.9 : 1,
  };
  const contactInk: Ink = { size: t.meta, color: band ? c.inverted : INK, opacity: band ? 0.6 : 0.35 };
  const nameLead = t.name * NAME_LINE_HEIGHT * U;
  const headLead = t.headline * TITLE_LINE_HEIGHT * U;
  const contactLead = t.meta * 1.4 * U;
  const contact = aside === null
    ? clean([cv.personal.location, cv.personal.phone, cv.personal.email]).join(' — ')
    : '';
  const photoSize = aside === null ? spec.photo.size * U : 0;
  let y: number;

  if (centered) {
    y = m.padTop * U;
    photo(W / 2 - photoSize / 2, y, photoSize, spec.photo.shape === 'circle', c.photoBorder);
    y += photoSize + 10 * U;
    run(cv.personal.fullName, W / 2, y, nameInk, nameLead, 'center');
    y += nameLead + 3 * U;
    run(cv.headline, W / 2, y, headlineInk, headLead, 'center');
    y += headLead + 4 * U;
    run(contact, W / 2, y, contactInk, contactLead, 'center');
    y += contactLead + 10 * U;
    nodes.push(<rect key={k()} x={left} y={y} width={bodyW} height={0.8 * U} fill={c.rule} />);
    y += m.header * U;
  } else {
    const inset = band || tinted ? spec.spacing.headerPad * U : 0;
    const top = band ? 0 : m.padTop * U;
    const innerX = tinted ? left + inset : left;
    const innerW = tinted ? bodyW - 2 * inset : bodyW;
    // Le texte coule dans la place que lui laisse la photo : un titre long
    // passe à la ligne, comme dans l'aperçu, au lieu de sortir de la page.
    const textW = innerW - (photoSize > 0 ? photoSize + 14 * U : 0);
    const nameH = flow(cv.personal.fullName, 0, 0, textW, nameInk, nameLead, H, false);
    const headH = flow(cv.headline, 0, 0, textW, headlineInk, headLead, H, false);
    const contactH = contact === '' ? 8.5 * U : flow(contact, 0, 0, textW, contactInk, contactLead, H, false);
    const textH = nameH + 3 * U + headH + 4 * U + contactH;
    const idH = Math.max(photoSize, textH);
    const boxH = idH + inset * 2;

    if (band) nodes.push(<rect key={k()} x={0} y={0} width={W} height={boxH} fill={c.band} />);
    if (tinted) nodes.push(<rect key={k()} x={left} y={top} width={bodyW} height={boxH} rx={10 * U} fill={c.soft} />);

    const photoLeft = spec.photo.align === 'left';
    if (photoSize > 0) {
      const px = photoLeft ? innerX : innerX + innerW - photoSize;
      photo(px, top + inset + (idH - photoSize) / 2, photoSize, spec.photo.shape === 'circle',
        band ? c.inverted : tinted ? '#ffffff' : c.photoBorder);
    }
    const tx = photoLeft && photoSize > 0 ? innerX + photoSize + 14 * U : innerX;
    let ty = top + inset + (idH - textH) / 2;
    ty = flow(cv.personal.fullName, tx, ty, textW, nameInk, nameLead, H) + 3 * U;
    ty = flow(cv.headline, tx, ty, textW, headlineInk, headLead, H) + 4 * U;
    if (contact !== '') {
      flow(contact, tx, ty, textW, contactInk, contactLead, H);
    } else {
      // Colonne latérale : les coordonnées y sont parties, un trait les remplace.
      nodes.push(<rect key={k()} x={tx} y={ty + 2 * U} width={34 * U} height={2.5 * U} fill={c.accent} />);
    }

    y = top + boxH;
    if (spec.header === 'underline') {
      nodes.push(<rect key={k()} x={left} y={y + 9 * U} width={bodyW} height={2.5 * U} fill={c.accent} />);
      y += 11.5 * U;
    }
    y += m.header * U;
  }

  /* --- Corps : les vraies sections, dans l'ordre du modèle ------------------ */
  const body: Ink = { size: t.body, color: INK, opacity: 0.3 };
  const meta: Ink = { size: t.meta, color: INK, opacity: 0.34 };
  const entryTitle: Ink = { size: t.entryTitle, color: INK, bold: true, opacity: 0.78 };
  const dates: Ink = { size: t.meta, color: c.ink, opacity: 0.8 };
  const bodyLead = t.body * m.lineHeight * U;
  const titleInk: Ink = {
    size: t.sectionTitle, bold: true, caps: spec.uppercaseSectionTitles,
    tracking: safeTracking(t.sectionTitle, t.titleTracking),
    color: spec.sectionStyle === 'banner' ? c.inverted : spec.sectionStyle === 'rule' ? INK : c.ink,
  };
  const titleLead = t.sectionTitle * TITLE_LINE_HEIGHT * U;

  const heading = (section: SectionId): void => {
    const label = sectionTitle(spec, section);
    const width = textWidth(label, titleInk);
    y += m.section * U;
    switch (spec.sectionStyle) {
      case 'rule':
        run(label, left, y, titleInk, titleLead);
        y += titleLead + 3 * U;
        nodes.push(<rect key={k()} x={left} y={y} width={bodyW} height={1 * U} fill={c.accent} />);
        y += 6 * U;
        break;
      case 'bar':
        nodes.push(<rect key={k()} x={left} y={y + (titleLead - t.sectionTitle * U) / 2} width={3 * U}
          height={t.sectionTitle * U} rx={1.5 * U} fill={c.accent} />);
        run(label, left + 9 * U, y, titleInk, titleLead);
        y += titleLead + 5 * U;
        break;
      case 'chip':
        nodes.push(<rect key={k()} x={left} y={y} width={width + 14 * U} height={titleLead + 6 * U}
          rx={4 * U} fill={c.soft} />);
        run(label, left + 7 * U, y + 3 * U, titleInk, titleLead);
        y += titleLead + 6 * U + 6 * U;
        break;
      case 'plain':
        run(label, left, y, titleInk, titleLead);
        y += titleLead + 5 * U;
        break;
      case 'banner':
        nodes.push(<rect key={k()} x={left} y={y} width={bodyW} height={titleLead + 7 * U} fill={c.band} />);
        run(label, left + 8 * U, y + 3.5 * U, titleInk, titleLead);
        y += titleLead + 7 * U + 8 * U;
        break;
      case 'line':
        run(label, left, y, titleInk, titleLead);
        nodes.push(<rect key={k()} x={left + width + 8 * U} y={y + titleLead / 2} width={Math.max(0, bodyW - width - 8 * U)}
          height={0.8 * U} fill={c.rule} />);
        y += titleLead + 6 * U;
        break;
    }
  };

  const bullets = (items: string[], x: number, w: number): void => {
    for (const item of items) {
      if (y > bottom) return;
      nodes.push(<circle key={k()} cx={x + 2 * U} cy={y + bodyLead / 2} r={t.body * U * 0.16}
        fill={c.ink} opacity={0.8} />);
      y = flow(item, x + 10 * U, y, w - 10 * U, body, bodyLead, bottom) + m.bullet * U;
    }
  };

  const entry = (title: string, org: string[], range: string, items: string[]): void => {
    if (y > bottom) return;
    const timeline = spec.entryStyle === 'timeline';
    const x = timeline ? left + 17 * U : left;
    const w = right - x;
    const start = y;
    const titleLead = t.entryTitle * m.lineHeight * U;

    if (spec.entryStyle === 'stacked') {
      y = flow(title, x, y, w, entryTitle, titleLead, bottom);
      y = flow(clean([...org, range]).join(' — '), x, y, w, meta, t.meta * m.lineHeight * U, bottom) + 2 * U;
    } else {
      const dw = range === '' ? 0 : textWidth(range, dates) + 10 * U;
      flow(title, x, y, w - dw, entryTitle, titleLead, bottom);
      if (range !== '') run(range, right, y, dates, titleLead, 'right');
      y += titleLead;
      y = flow(org.join(' — '), x, y, w, meta, t.meta * m.lineHeight * U, bottom) + 2 * U;
    }
    bullets(items, x, w);

    if (timeline) {
      const end = Math.min(y + m.entry * U, bottom);
      nodes.push(
        <rect key={k()} x={left + 4 * U} y={start} width={1 * U} height={Math.max(0, end - start)} fill={c.rule} />,
        <circle key={k()} cx={left + 4.5 * U} cy={start + titleLead / 2} r={4 * U} fill={c.accent}
          stroke="#ffffff" strokeWidth={1.5 * U} />,
      );
    }
    y += m.entry * U;
  };

  for (const section of mainSections(spec)) {
    if (y > bottom - titleLead) break;
    switch (section) {
      case 'summary':
        heading(section);
        y = flow(cv.summary, left, y, bodyW, body, bodyLead, bottom);
        break;
      case 'experience':
        heading(section);
        for (const e of [...cv.experiences].sort(compareByRecency)) {
          entry(e.role, clean([e.company, e.location]), formatRange(e.start, e.end, e.current), e.bullets);
        }
        break;
      case 'education':
        heading(section);
        for (const e of cv.education) {
          entry(e.degree, clean([e.school, e.location]), formatRange(e.start, e.end, false), e.details);
        }
        break;
      case 'skills':
        heading(section);
        y = flow(cv.skills.join(', '), left, y, bodyW, body, bodyLead, bottom);
        break;
      case 'extras': {
        heading(section);
        const languages = cv.languages.map((l) => `${l.name} (${LEVEL_LABELS[l.level] ?? l.level})`);
        y = flow(`Langues : ${languages.join(', ')}`, left, y, bodyW, body, bodyLead, bottom);
        bullets(cv.certifications.map((x) => clean([x.name, x.issuer, formatDate(x.date)]).join(' — ')), left, bodyW);
        break;
      }
      default:
        break;
    }
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
