import {
  compareByRecency,
  formatDate,
  formatRange,
  getTemplate,
  sectionTitle,
  type Resume,
  type SectionId,
  type TemplateSpec,
} from '@everyday/cv-core';

/**
 * Aperçu HTML d'un CV.
 *
 * Jumeau de `ResumeDocument` (@everyday/cv-pdf) : même ordre de sections, même
 * hiérarchie, mêmes séparateurs — parce que les deux lisent le même
 * `TemplateSpec`. Toute valeur de mise en page écrite en dur ici serait un bug :
 * l'aperçu mentirait sur le PDF téléchargé.
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

function clean(values: (string | undefined | null)[]): string[] {
  return values.filter((v): v is string => v != null && v.trim() !== '').map((v) => v.trim());
}

function Heading({ spec, section }: { spec: TemplateSpec; section: SectionId }) {
  const { typography: t, spacing: s } = spec;
  return (
    <div
      style={{
        marginTop: pt(s.section),
        marginBottom: pt(spec.sectionRule ? 3 : 5),
        paddingBottom: pt(spec.sectionRule ? 3 : 0),
        borderBottom: spec.sectionRule ? '0.75px solid #999999' : undefined,
      }}
    >
      <h2 style={{ fontSize: pt(t.sectionTitle), fontWeight: 700, margin: 0 }}>
        {sectionTitle(spec, section)}
      </h2>
    </div>
  );
}

function Bullets({ spec, items }: { spec: TemplateSpec; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul style={{ margin: 0, paddingLeft: pt(10), listStyle: 'none' }}>
      {items.map((text, i) => (
        <li key={i} style={{ marginBottom: pt(spec.spacing.bullet), display: 'flex', gap: pt(6) }}>
          <span aria-hidden>•</span>
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

function Entry({ spec, title, meta, bullets }: {
  spec: TemplateSpec; title: string; meta: string[]; bullets: string[];
}) {
  const { typography: t } = spec;
  return (
    <div style={{ marginBottom: pt(spec.spacing.entry) }}>
      <div style={{ fontSize: pt(t.entryTitle), fontWeight: 700 }}>{title}</div>
      {meta.length > 0 ? (
        <div style={{ fontSize: pt(t.meta), color: '#444444', marginBottom: pt(2) }}>
          {meta.join(' — ')}
        </div>
      ) : null}
      <Bullets spec={spec} items={bullets} />
    </div>
  );
}

function Section({ spec, resume, section }: {
  spec: TemplateSpec; resume: Resume; section: SectionId;
}) {
  const { typography: t } = spec;

  switch (section) {
    case 'personal': {
      const p = resume.personal;
      const contact = clean([p.location, p.phone, p.email, ...p.links]);
      return (
        <header>
          <div style={{ fontSize: pt(t.name), fontWeight: 700, marginBottom: pt(2) }}>
            {p.fullName || 'Votre nom'}
          </div>
          {resume.headline.trim() !== '' ? (
            <div style={{ fontSize: pt(t.headline), color: '#444444', marginBottom: pt(4) }}>
              {resume.headline}
            </div>
          ) : null}
          {contact.length > 0 ? (
            <div style={{ fontSize: pt(t.meta), color: '#444444' }}>{contact.join(' — ')}</div>
          ) : null}
        </header>
      );
    }

    case 'headline':
      return null;

    case 'summary':
      if (resume.summary.trim() === '') return null;
      return (
        <section>
          <Heading spec={spec} section={section} />
          <p style={{ margin: 0 }}>{resume.summary}</p>
        </section>
      );

    case 'experience': {
      const items = [...resume.experiences].sort(compareByRecency);
      if (items.length === 0) return null;
      return (
        <section>
          <Heading spec={spec} section={section} />
          {items.map((item) => (
            <Entry
              key={item.id}
              spec={spec}
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
          <Heading spec={spec} section={section} />
          {items.map((item) => (
            <Entry
              key={item.id}
              spec={spec}
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
          <Heading spec={spec} section={section} />
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
          <Heading spec={spec} section={section} />
          {languages.length > 0 ? (
            <p style={{ margin: 0 }}>{`Langues : ${languages.join(', ')}`}</p>
          ) : null}
          <Bullets spec={spec} items={[...certifications, ...projects]} />
        </section>
      );
    }
  }
}

export function ResumePreview({ resume }: { resume: Resume }) {
  const spec = getTemplate(resume.templateId);
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
          <Section key={section} spec={spec} resume={resume} section={section} />
        ))}
      </article>
    </div>
  );
}
