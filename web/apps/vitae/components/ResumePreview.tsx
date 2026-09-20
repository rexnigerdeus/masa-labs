import {
  compareByRecency,
  formatDate,
  formatRange,
  accentSurface,
  getTemplate,
  inkAccent,
  mixColors,
  normalizeAccent,
  sectionTitle,
  tint,
  type Resume,
  type SectionId,
  type TemplateSpec,
} from '@everyday/cv-core';

/**
 * Aperçu HTML d'un CV.
 *
 * Jumeau de `ResumeDocument` (@everyday/cv-pdf) : même ordre de sections, même
 * hiérarchie, mêmes habillages d'en-tête, mêmes teintes — parce que les deux
 * lisent le même `TemplateSpec` et dérivent leurs couleurs des mêmes fonctions.
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

const INK = '#111111';
const MUTED = '#444444';

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

/** Palette dérivée de la couleur choisie — l'exact pendant de `buildStyles`. */
function palette(accent: string) {
  const band = accentSurface(accent);
  return {
    accent,
    ink: inkAccent(accent),
    /** Fond du bandeau : la primaire, assombrie si elle ne portait pas son texte. */
    band: band.background,
    inverted: band.text,
    invertedMuted: mixColors(band.text, band.background, 0.28),
    soft: tint(accent, 0.12),
    photoBorder: tint(accent, 0.35),
  };
}

type Palette = ReturnType<typeof palette>;

function clean(values: (string | undefined | null)[]): string[] {
  return values.filter((v): v is string => v != null && v.trim() !== '').map((v) => v.trim());
}

/**
 * Photo du candidat.
 *
 * `<img>` et non `next/image` : la source est une data URL portée par le CV
 * lui-même, il n'y a ni fichier distant à optimiser ni requête à épargner.
 */
function CandidatePhoto({ spec, resume, colors }: {
  spec: TemplateSpec; resume: Resume; colors: Palette;
}) {
  const { photo, showPhoto, fullName } = resume.personal;
  if (photo === null || !showPhoto) return null;

  const border = spec.header === 'band'
    ? colors.inverted
    : spec.header === 'tint' ? '#ffffff' : colors.photoBorder;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo}
      alt={fullName.trim() === '' ? 'Photo du candidat' : `Photo de ${fullName}`}
      style={{
        width: pt(spec.photo.size),
        height: pt(spec.photo.size),
        borderRadius: spec.photo.shape === 'circle' ? '50%' : pt(8),
        objectFit: 'cover',
        flexShrink: 0,
        border: `${pt(spec.header === 'underline' || spec.header === 'minimal' ? 1 : 1.5)} solid ${border}`,
        marginLeft: spec.photo.align === 'right' ? pt(14) : undefined,
        marginRight: spec.photo.align === 'left' ? pt(14) : undefined,
      }}
    />
  );
}

/** Bloc d'identité : quatre habillages, un seul et même contenu textuel. */
function Header({ spec, resume, colors }: {
  spec: TemplateSpec; resume: Resume; colors: Palette;
}) {
  const { typography: t, spacing: s } = spec;
  const p = resume.personal;
  const contact = clean([p.location, p.phone, p.email, ...p.links]);
  const inverted = spec.header === 'band';
  const photo = <CandidatePhoto spec={spec} resume={resume} colors={colors} />;

  const identity = (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {spec.photo.align === 'left' ? photo : null}
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <div
          style={{
            fontSize: pt(t.name),
            fontWeight: 700,
            marginBottom: pt(2),
            color: inverted ? colors.inverted : INK,
          }}
        >
          {p.fullName || 'Votre nom'}
        </div>
        {resume.headline.trim() !== '' ? (
          <div
            style={{
              fontSize: pt(t.headline),
              color: inverted ? colors.inverted : colors.ink,
              marginBottom: pt(4),
            }}
          >
            {resume.headline}
          </div>
        ) : null}
        {contact.length > 0 ? (
          <div
            style={{
              fontSize: pt(t.meta),
              color: inverted ? colors.invertedMuted : MUTED,
            }}
          >
            {contact.join(' — ')}
          </div>
        ) : null}
      </div>
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
            background: colors.band,
            marginTop: pt(-s.page),
            marginLeft: pt(-s.page),
            marginRight: pt(-s.page),
            marginBottom: pt(s.header),
            padding: `${pt(s.headerPad)} ${pt(s.page)}`,
          }}
        >
          {identity}
        </div>
      );
    case 'tint':
      return (
        <div
          style={{
            background: colors.soft,
            borderRadius: pt(10),
            padding: pt(s.headerPad),
            marginBottom: pt(s.header),
          }}
        >
          {identity}
        </div>
      );
    case 'underline':
      return (
        <div style={{ marginBottom: pt(s.header) }}>
          {identity}
          <div style={{ height: pt(2.5), background: colors.accent, marginTop: pt(9) }} />
        </div>
      );
    case 'minimal':
      return <div style={{ marginBottom: pt(s.header) }}>{identity}</div>;
  }
}

function Heading({ spec, section, colors }: {
  spec: TemplateSpec; section: SectionId; colors: Palette;
}) {
  const { typography: t, spacing: s } = spec;
  const title = sectionTitle(spec, section);
  const base = {
    fontSize: pt(t.sectionTitle),
    fontWeight: 700,
    letterSpacing: pt(t.titleTracking),
    margin: 0,
  } as const;

  switch (spec.sectionStyle) {
    case 'rule':
      return (
        <div style={{ marginTop: pt(s.section), marginBottom: pt(6) }}>
          <h2 style={{ ...base, color: INK }}>{title}</h2>
          <div
            style={{ borderBottom: `${pt(1)} solid ${colors.accent}`, marginTop: pt(3) }}
          />
        </div>
      );
    case 'bar':
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: pt(s.section),
            marginBottom: pt(5),
          }}
        >
          <span
            aria-hidden
            style={{
              width: pt(3),
              height: pt(t.sectionTitle),
              borderRadius: pt(1.5),
              background: colors.accent,
              marginRight: pt(6),
              flexShrink: 0,
            }}
          />
          <h2 style={{ ...base, color: colors.ink }}>{title}</h2>
        </div>
      );
    case 'chip':
      return (
        <div
          style={{
            alignSelf: 'flex-start',
            display: 'inline-block',
            background: colors.soft,
            borderRadius: pt(4),
            padding: `${pt(3)} ${pt(7)}`,
            marginTop: pt(s.section),
            marginBottom: pt(6),
          }}
        >
          <h2 style={{ ...base, color: colors.ink }}>{title}</h2>
        </div>
      );
    case 'plain':
      return (
        <div style={{ marginTop: pt(s.section), marginBottom: pt(5) }}>
          <h2 style={{ ...base, color: colors.ink }}>{title}</h2>
        </div>
      );
  }
}

function Bullets({ spec, items, colors }: {
  spec: TemplateSpec; items: string[]; colors: Palette;
}) {
  if (items.length === 0) return null;
  return (
    <ul style={{ margin: 0, paddingLeft: pt(10), listStyle: 'none' }}>
      {items.map((text, i) => (
        <li key={i} style={{ marginBottom: pt(spec.spacing.bullet), display: 'flex', gap: pt(6) }}>
          <span aria-hidden style={{ color: colors.ink }}>•</span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

function Entry({ spec, title, meta, bullets, colors }: {
  spec: TemplateSpec; title: string; meta: string[]; bullets: string[]; colors: Palette;
}) {
  const { typography: t } = spec;
  return (
    <div style={{ marginBottom: pt(spec.spacing.entry) }}>
      <div style={{ fontSize: pt(t.entryTitle), fontWeight: 700 }}>{title}</div>
      {meta.length > 0 ? (
        <div style={{ fontSize: pt(t.meta), color: MUTED, marginBottom: pt(2) }}>
          {meta.join(' — ')}
        </div>
      ) : null}
      <Bullets spec={spec} items={bullets} colors={colors} />
    </div>
  );
}

function Section({ spec, resume, section, colors }: {
  spec: TemplateSpec; resume: Resume; section: SectionId; colors: Palette;
}) {
  switch (section) {
    case 'personal':
      return <Header spec={spec} resume={resume} colors={colors} />;

    case 'headline':
      return null;

    case 'summary':
      if (resume.summary.trim() === '') return null;
      return (
        <section>
          <Heading spec={spec} section={section} colors={colors} />
          <p style={{ margin: 0 }}>{resume.summary}</p>
        </section>
      );

    case 'experience': {
      const items = [...resume.experiences].sort(compareByRecency);
      if (items.length === 0) return null;
      return (
        <section>
          <Heading spec={spec} section={section} colors={colors} />
          {items.map((item) => (
            <Entry
              key={item.id}
              spec={spec}
              colors={colors}
              title={item.role}
              meta={clean([item.company, item.location, formatRange(item.start, item.end, item.current)])}
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
          <Heading spec={spec} section={section} colors={colors} />
          {items.map((item) => (
            <Entry
              key={item.id}
              spec={spec}
              colors={colors}
              title={item.degree}
              meta={clean([item.school, item.location, formatRange(item.start, item.end, false)])}
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
          <Heading spec={spec} section={section} colors={colors} />
          <p style={{ margin: 0 }}>{skills.join(', ')}</p>
        </section>
      );
    }

    case 'extras': {
      const languages = resume.languages.map(
        (l) => `${l.name} (${LEVEL_LABELS[l.level] ?? l.level})`,
      );
      const certifications = resume.certifications.map(
        (c) => clean([c.name, c.issuer, formatDate(c.date)]).join(' — '),
      );
      const projects = resume.projects.map(
        (p) => clean([p.name, p.description, p.url]).join(' — '),
      );
      if (languages.length + certifications.length + projects.length === 0) return null;
      return (
        <section>
          <Heading spec={spec} section={section} colors={colors} />
          {languages.length > 0 ? (
            <p style={{ margin: 0 }}>{`Langues : ${languages.join(', ')}`}</p>
          ) : null}
          <Bullets spec={spec} items={[...certifications, ...projects]} colors={colors} />
        </section>
      );
    }
  }
}

export function ResumePreview({ resume }: { resume: Resume }) {
  const spec = getTemplate(resume.templateId);
  const colors = palette(normalizeAccent(resume.accentColor, spec.defaultAccent));
  const { typography: t, spacing: s } = spec;

  return (
    // Deux éléments et non un seul : `cqw` employé sur l'élément qui déclare
    // lui-même le conteneur se résout contre un ancêtre — et à défaut contre
    // la fenêtre. Le conteneur ne porte donc aucune mesure, et la page, qui
    // est sa descendante, les porte toutes.
    <div
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
          padding: pt(s.page),
          fontSize: pt(t.body),
          lineHeight: t.lineHeight,
        }}
      >
        {spec.sectionOrder.map((section) => (
          <Section key={section} spec={spec} resume={resume} section={section} colors={colors} />
        ))}
      </article>
    </div>
  );
}
