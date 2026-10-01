import type { CSSProperties, ReactNode } from 'react';
import {
  HEADLINE_TRACKING,
  INK,
  MUTED,
  NAME_LINE_HEIGHT,
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
  type PageMetrics,
  type Resume,
  type SectionId,
  type TemplatePalette,
  type TemplateSpec,
} from '@everyday/cv-core';

/**
 * Aperçu HTML d'un CV.
 *
 * Jumeau de `ResumeDocument` (@everyday/cv-pdf) : même ordre de sections, même
 * hiérarchie, mêmes habillages, mêmes teintes, même géométrie — parce que les
 * deux lisent le même `TemplateSpec` et passent par les mêmes fonctions de
 * `@everyday/cv-core` (`templatePalette`, `pageMetrics`, `safeTracking`).
 * Toute valeur de mise en page écrite en dur ici serait un bug : l'aperçu
 * mentirait sur le PDF téléchargé.
 *
 * Composant serveur : aucun JavaScript n'est expédié au navigateur pour le
 * rendu de l'aperçu.
 */

const LEVEL_LABELS: Record<string, string> = {
  natif: 'langue maternelle',
  courant: 'courant',
  intermediaire: 'intermédiaire',
  debutant: 'notions',
};

/** Largeur d'une page A4 à 96 dpi : 210 mm = 595,28 pt = 794 px. */
const A4_WIDTH_PX = 794;

/** Un point vaut 1/72 de pouce, un pixel CSS 1/96 : le rapport est 96/72. */
const PX_PER_PT = 96 / 72;

/**
 * Convertit une mesure du descripteur en longueur d'aperçu.
 *
 * Tout est exprimé en multiples de `--u`, l'unité de page, définie plus bas
 * comme un 794e de la largeur du conteneur. L'aperçu est donc une réduction
 * fidèle de la page A4 quelle que soit la place disponible — sur une colonne
 * de 320 px comme en plein écran.
 *
 * La version précédente posait des pixels absolus calibrés pour une pleine
 * page : dans une colonne étroite, les seules marges occupaient un tiers de la
 * largeur et le contenu débordait, coupé par `overflow: hidden`. On ne voyait
 * pas un CV réduit, on voyait un fragment de CV.
 *
 * Une propriété personnalisée plutôt que `transform: scale()` : les valeurs de
 * `var()` ne se composent pas d'un niveau à l'autre, là où des `em` imbriqués
 * se multiplieraient entre eux.
 */
const pt = (value: number): string =>
  `calc(var(--u) * ${(value * PX_PER_PT).toFixed(3)})`;

interface Ctx {
  spec: TemplateSpec;
  resume: Resume;
  c: TemplatePalette;
  m: PageMetrics;
}

function clean(values: (string | undefined | null)[]): string[] {
  return values.filter((v): v is string => v != null && v.trim() !== '').map((v) => v.trim());
}

function contactLines(resume: Resume): string[] {
  const p = resume.personal;
  return clean([p.location, p.phone, p.email, ...p.links]);
}

function hasPhoto(resume: Resume): boolean {
  return resume.personal.photo !== null && resume.personal.showPhoto;
}

function photoAlt(resume: Resume): string {
  const name = resume.personal.fullName.trim();
  return name === '' ? 'Photo du candidat' : `Photo de ${name}`;
}

/**
 * Photo du candidat, à côté de l'identité.
 *
 * `<img>` et non `next/image` : la source est une data URL portée par le CV
 * lui-même, il n'y a ni fichier distant à optimiser ni requête à épargner.
 */
function HeaderPhoto({ spec, resume, c }: Ctx) {
  if (!hasPhoto(resume) || spec.layout.kind === 'sidebar') return null;
  const border = spec.header === 'band'
    ? c.inverted
    : spec.header === 'tint' ? '#ffffff' : c.photoBorder;
  const thin = spec.header !== 'band' && spec.header !== 'tint';

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resume.personal.photo as string}
      alt={photoAlt(resume)}
      style={{
        width: pt(spec.photo.size),
        height: pt(spec.photo.size),
        borderRadius: spec.photo.shape === 'circle' ? '50%' : pt(8),
        objectFit: 'cover',
        flexShrink: 0,
        border: `${pt(thin ? 1 : 1.5)} solid ${border}`,
        marginLeft: spec.photo.align === 'right' ? pt(14) : undefined,
        marginRight: spec.photo.align === 'left' ? pt(14) : undefined,
        marginBottom: spec.photo.align === 'center' ? pt(10) : undefined,
      }}
    />
  );
}

/** Bloc d'identité : nom, titre, coordonnées — dans cet ordre, quel que soit l'habillage. */
function Header(ctx: Ctx) {
  const { spec, resume, c, m } = ctx;
  const { typography: t, spacing: s, identity: id } = spec;
  const inverted = spec.header === 'band';
  const centered = spec.header === 'centered';
  const withSidebar = spec.layout.kind === 'sidebar';
  const contact = withSidebar ? [] : contactLines(resume);
  const photo = <HeaderPhoto {...ctx} />;
  const textAlign = centered ? 'center' : undefined;

  const text = (
    <div
      style={{
        flex: '1 1 auto',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: centered ? 'center' : 'flex-start',
      }}
    >
      <div
        style={{
          fontSize: pt(t.name),
          fontWeight: 700,
          lineHeight: NAME_LINE_HEIGHT,
          letterSpacing: pt(safeTracking(t.name, id.tracking)),
          textTransform: id.uppercase ? 'uppercase' : undefined,
          marginBottom: pt(3),
          color: inverted ? c.inverted : id.accentName ? c.ink : INK,
          textAlign,
        }}
      >
        {resume.personal.fullName || 'Votre nom'}
      </div>
      {resume.headline.trim() !== '' ? (
        <div
          style={{
            fontSize: pt(t.headline),
            lineHeight: TITLE_LINE_HEIGHT,
            letterSpacing: id.headlineUppercase
              ? pt(safeTracking(t.headline, HEADLINE_TRACKING))
              : undefined,
            textTransform: id.headlineUppercase ? 'uppercase' : undefined,
            color: inverted ? c.inverted : c.ink,
            marginBottom: pt(4),
            textAlign,
          }}
        >
          {resume.headline}
        </div>
      ) : null}
      {contact.length > 0 ? (
        <div style={{ fontSize: pt(t.meta), color: inverted ? c.invertedMuted : MUTED, textAlign }}>
          {contact.join(' — ')}
        </div>
      ) : null}
      {withSidebar ? (
        <div style={{ width: pt(34), height: pt(2.5), background: c.accent, marginTop: pt(6) }} />
      ) : null}
    </div>
  );

  if (centered) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: pt(m.header),
        }}
      >
        {photo}
        {text}
        <div style={{ alignSelf: 'stretch', height: pt(0.8), background: c.rule, marginTop: pt(10) }} />
      </div>
    );
  }

  const identity = (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {spec.photo.align === 'left' ? photo : null}
      {text}
      {spec.photo.align === 'right' ? photo : null}
    </div>
  );

  switch (spec.header) {
    case 'band':
      // Marges négatives : le bandeau doit toucher les bords de la page, sinon
      // ce n'est plus un en-tête mais un encadré posé au milieu du papier.
      return (
        <div
          style={{
            background: c.band,
            marginTop: pt(-m.padTop),
            marginLeft: pt(-m.padLeft),
            marginRight: pt(-m.padRight),
            marginBottom: pt(m.header),
            padding: `${pt(s.headerPad)} ${pt(m.padRight)} ${pt(s.headerPad)} ${pt(m.padLeft)}`,
          }}
        >
          {identity}
        </div>
      );
    case 'tint':
      return (
        <div
          style={{
            background: c.soft,
            borderRadius: pt(10),
            padding: pt(s.headerPad),
            marginBottom: pt(m.header),
          }}
        >
          {identity}
        </div>
      );
    case 'underline':
      return (
        <div style={{ marginBottom: pt(m.header) }}>
          {identity}
          <div style={{ height: pt(2.5), background: c.accent, marginTop: pt(9) }} />
        </div>
      );
    case 'minimal':
      return <div style={{ marginBottom: pt(m.header) }}>{identity}</div>;
  }
}

function Heading({ spec, section, c, m }: Ctx & { section: SectionId }) {
  const { typography: t } = spec;
  const title = sectionTitle(spec, section);
  const base: CSSProperties = {
    fontSize: pt(t.sectionTitle),
    fontWeight: 700,
    lineHeight: TITLE_LINE_HEIGHT,
    letterSpacing: pt(safeTracking(t.sectionTitle, t.titleTracking)),
    margin: 0,
  };

  switch (spec.sectionStyle) {
    case 'rule':
      return (
        <div style={{ marginTop: pt(m.section), marginBottom: pt(6) }}>
          <h2 style={{ ...base, color: INK }}>{title}</h2>
          <div style={{ borderBottom: `${pt(1)} solid ${c.accent}`, marginTop: pt(3) }} />
        </div>
      );
    case 'bar':
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: pt(m.section),
            marginBottom: pt(5),
          }}
        >
          <span
            aria-hidden
            style={{
              width: pt(3),
              height: pt(t.sectionTitle),
              borderRadius: pt(1.5),
              background: c.accent,
              marginRight: pt(6),
              flexShrink: 0,
            }}
          />
          <h2 style={{ ...base, color: c.ink }}>{title}</h2>
        </div>
      );
    case 'chip':
      return (
        <div
          style={{
            display: 'inline-block',
            background: c.soft,
            borderRadius: pt(4),
            padding: `${pt(3)} ${pt(7)}`,
            marginTop: pt(m.section),
            marginBottom: pt(6),
          }}
        >
          <h2 style={{ ...base, color: c.ink }}>{title}</h2>
        </div>
      );
    case 'plain':
      return (
        <div style={{ marginTop: pt(m.section), marginBottom: pt(5) }}>
          <h2 style={{ ...base, color: c.ink }}>{title}</h2>
        </div>
      );
    case 'banner':
      return (
        <div
          style={{
            background: c.band,
            padding: `${pt(3.5)} ${pt(8)}`,
            marginTop: pt(m.section),
            marginBottom: pt(8),
          }}
        >
          <h2 style={{ ...base, color: c.inverted }}>{title}</h2>
        </div>
      );
    case 'line':
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: pt(m.section),
            marginBottom: pt(6),
          }}
        >
          <h2 style={{ ...base, color: c.ink, flexShrink: 0 }}>{title}</h2>
          <span
            aria-hidden
            style={{ flex: '1 1 auto', height: pt(0.8), background: c.rule, marginLeft: pt(8) }}
          />
        </div>
      );
  }
}

function Bullets({ items, c, m }: { items: string[]; c: TemplatePalette; m: PageMetrics }) {
  if (items.length === 0) return null;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {items.map((text, i) => (
        <li key={i} style={{ marginBottom: pt(m.bullet), display: 'flex' }}>
          <span aria-hidden style={{ color: c.ink, width: pt(10), flexShrink: 0 }}>•</span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

/** Une expérience ou une formation, sous les trois mises en forme du modèle. */
function Entry({ spec, c, m, title, org, dates, bullets }: Ctx & {
  title: string; org: string[]; dates: string; bullets: string[];
}) {
  const { typography: t } = spec;

  if (spec.entryStyle === 'stacked') {
    const meta = clean([...org, dates]);
    return (
      <div style={{ marginBottom: pt(m.entry) }}>
        <div style={{ fontSize: pt(t.entryTitle), fontWeight: 700 }}>{title}</div>
        {meta.length > 0 ? (
          <div style={{ fontSize: pt(t.meta), color: MUTED, marginBottom: pt(2) }}>
            {meta.join(' — ')}
          </div>
        ) : null}
        <Bullets items={bullets} c={c} m={m} />
      </div>
    );
  }

  const body: ReactNode = (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 auto', minWidth: 0, fontSize: pt(t.entryTitle), fontWeight: 700 }}>
          {title}
        </div>
        {dates !== '' ? (
          <div
            style={{
              fontSize: pt(t.meta),
              fontStyle: 'italic',
              color: c.ink,
              marginLeft: pt(10),
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            {dates}
          </div>
        ) : null}
      </div>
      {org.length > 0 ? (
        <div style={{ fontSize: pt(t.meta), fontStyle: 'italic', color: MUTED, marginBottom: pt(2) }}>
          {org.join(' — ')}
        </div>
      ) : null}
      <Bullets items={bullets} c={c} m={m} />
    </>
  );

  if (spec.entryStyle === 'timeline') {
    return (
      <div
        style={{
          position: 'relative',
          borderLeft: `${pt(1)} solid ${c.rule}`,
          marginLeft: pt(4),
          paddingLeft: pt(13),
          paddingBottom: pt(m.entry),
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: pt(-4.5),
            top: pt((t.entryTitle * m.lineHeight - 8) / 2),
            width: pt(8),
            height: pt(8),
            borderRadius: '50%',
            background: c.accent,
            border: `${pt(1.5)} solid #ffffff`,
            boxSizing: 'border-box',
          }}
        />
        {body}
      </div>
    );
  }
  return <div style={{ marginBottom: pt(m.entry) }}>{body}</div>;
}

function languageLines(resume: Resume): string[] {
  return resume.languages
    .filter((l) => l.name.trim() !== '')
    .map((l) => `${l.name.trim()} (${LEVEL_LABELS[l.level] ?? l.level})`);
}

function extraItems(resume: Resume): string[] {
  const certifications = resume.certifications.map(
    (x) => clean([x.name, x.issuer, formatDate(x.date)]).join(' — '),
  );
  const projects = resume.projects.map((p) => clean([p.name, p.description, p.url]).join(' — '));
  return clean([...certifications, ...projects]);
}

function Section(ctx: Ctx & { section: SectionId }) {
  const { resume, section, c, m } = ctx;
  switch (section) {
    case 'personal':
      return <Header {...ctx} />;

    case 'headline':
      return null;

    case 'summary':
      if (resume.summary.trim() === '') return null;
      return (
        <section>
          <Heading {...ctx} />
          <p style={{ margin: 0 }}>{resume.summary}</p>
        </section>
      );

    case 'experience': {
      const items = [...resume.experiences].sort(compareByRecency);
      if (items.length === 0) return null;
      return (
        <section>
          <Heading {...ctx} />
          {items.map((item) => (
            <Entry
              key={item.id}
              {...ctx}
              title={item.role}
              org={clean([item.company, item.location])}
              dates={formatRange(item.start, item.end, item.current)}
              bullets={clean(item.bullets)}
            />
          ))}
        </section>
      );
    }

    case 'education': {
      const items = [...resume.education].sort((a, b) => (b.end?.year ?? 0) - (a.end?.year ?? 0));
      if (items.length === 0) return null;
      return (
        <section>
          <Heading {...ctx} />
          {items.map((item) => (
            <Entry
              key={item.id}
              {...ctx}
              title={item.degree}
              org={clean([item.school, item.location])}
              dates={formatRange(item.start, item.end, false)}
              bullets={clean(item.details)}
            />
          ))}
        </section>
      );
    }

    case 'skills': {
      const skills = clean(resume.skills);
      if (skills.length === 0) return null;
      return (
        <section>
          <Heading {...ctx} />
          <p style={{ margin: 0 }}>{skills.join(', ')}</p>
        </section>
      );
    }

    case 'extras': {
      const languages = languageLines(resume);
      const items = extraItems(resume);
      if (languages.length + items.length === 0) return null;
      return (
        <section>
          <Heading {...ctx} />
          {languages.length > 0 ? (
            <p style={{ margin: 0 }}>{`Langues : ${languages.join(', ')}`}</p>
          ) : null}
          <Bullets items={items} c={c} m={m} />
        </section>
      );
    }
  }
}

function SidebarBlock({ spec, c, m, title, lines, muted = [] }: {
  spec: TemplateSpec;
  c: TemplatePalette;
  m: PageMetrics;
  title: string;
  lines: string[];
  muted?: string[];
}) {
  const { typography: t } = spec;
  if (lines.length + muted.length === 0) return null;
  return (
    <section style={{ marginBottom: pt(m.section) }}>
      <h2
        style={{
          fontSize: pt(t.sectionTitle),
          fontWeight: 700,
          lineHeight: TITLE_LINE_HEIGHT,
          letterSpacing: pt(safeTracking(t.sectionTitle, t.titleTracking)),
          color: c.sidebar.title,
          paddingBottom: pt(3),
          borderBottom: `${pt(0.8)} solid ${c.sidebar.rule}`,
          margin: `0 0 ${pt(6)}`,
        }}
      >
        {title}
      </h2>
      {lines.map((line, i) => (
        <div key={i} style={{ fontSize: pt(t.meta + 0.5), marginBottom: pt(3) }}>{line}</div>
      ))}
      {muted.map((line, i) => (
        <div
          key={`m${i}`}
          style={{ fontSize: pt(t.meta), color: c.sidebar.muted, marginBottom: pt(3) }}
        >
          {line}
        </div>
      ))}
    </section>
  );
}

/** Colonne latérale : photo, coordonnées, puis les sections que le modèle y range. */
function Sidebar(ctx: Ctx) {
  const { spec, resume, c, m } = ctx;
  if (m.sidebar === null) return null;
  const bleed = spec.photo.align === 'bleed';
  const { width, pad, side, top } = m.sidebar;

  return (
    <aside
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: side === 'left' ? 0 : undefined,
        right: side === 'right' ? 0 : undefined,
        width: pt(width),
        background: c.sidebar.background,
        color: c.sidebar.text,
        padding: `${pt(top)} ${pt(pad)} 0`,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {hasPhoto(resume) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resume.personal.photo as string}
          alt={photoAlt(resume)}
          style={bleed
            ? {
              width: pt(width),
              height: pt(width),
              maxWidth: 'none',
              objectFit: 'cover',
              marginLeft: pt(-pad),
              marginBottom: pt(m.section + 4),
            }
            : {
              width: pt(spec.photo.size),
              height: pt(spec.photo.size),
              borderRadius: spec.photo.shape === 'circle' ? '50%' : pt(8),
              objectFit: 'cover',
              alignSelf: 'center',
              border: `${pt(2)} solid ${c.sidebar.text === INK ? '#ffffff' : c.sidebar.rule}`,
              marginBottom: pt(m.section + 4),
            }}
        />
      ) : null}
      <SidebarBlock
        spec={spec}
        c={c}
        m={m}
        title={contactTitle(spec)}
        lines={contactLines(resume)}
      />
      {sidebarSections(spec).map((section) => {
        switch (section) {
          case 'skills':
            return (
              <SidebarBlock
                key={section}
                spec={spec}
                c={c}
                m={m}
                title={sectionTitle(spec, section)}
                lines={clean(resume.skills)}
              />
            );
          case 'extras':
            return (
              <SidebarBlock
                key={section}
                spec={spec}
                c={c}
                m={m}
                title={sectionTitle(spec, section)}
                lines={languageLines(resume)}
                muted={extraItems(resume)}
              />
            );
          default:
            return null;
        }
      })}
    </aside>
  );
}

export function ResumePreview({ resume, decorative = false }: {
  resume: Resume;
  /**
   * Vignette d'illustration (choix du modèle) : masquée aux lecteurs d'écran,
   * qui liraient sinon huit fois le même CV d'exemple.
   */
  decorative?: boolean;
}) {
  const spec = getTemplate(resume.templateId);
  const c = templatePalette(spec, normalizeAccent(resume.accentColor, spec.defaultAccent));
  // Densité 1 : l'aperçu montre le modèle tel qu'il est dessiné. Le
  // resserrement de l'export ne touche que les CV qui débordent, et
  // l'aperçu ne montre que la première page.
  const m = pageMetrics(spec, hasPhoto(resume));
  const ctx: Ctx = { spec, resume, c, m };

  return (
    // Deux éléments et non un seul : `cqw` employé sur l'élément qui déclare
    // lui-même le conteneur se résout contre un ancêtre — et à défaut contre
    // la fenêtre. Le conteneur ne porte donc aucune mesure, et la page, qui
    // est sa descendante, les porte toutes.
    <div
      aria-hidden={decorative || undefined}
      style={{
        containerType: 'inline-size',
        aspectRatio: '210 / 297',
        // L'aperçu montre la première page. Le nombre de pages réel est
        // contrôlé sur le PDF lui-même par `npm run ats:check`.
        overflow: 'hidden',
      }}
      className="bg-white shadow-sm"
    >
      <article
        aria-label="Aperçu du CV"
        className="h-full text-ink"
        style={{
          ['--u' as string]: `calc(100cqw / ${A4_WIDTH_PX})`,
          position: 'relative',
          boxSizing: 'border-box',
          padding: `${pt(m.padTop)} ${pt(m.padRight)} ${pt(m.padBottom)} ${pt(m.padLeft)}`,
          fontSize: pt(spec.typography.body),
          lineHeight: m.lineHeight,
        }}
      >
        {mainSections(spec).map((section) => (
          <Section key={section} {...ctx} section={section} />
        ))}
        <Sidebar {...ctx} />
      </article>
    </div>
  );
}
