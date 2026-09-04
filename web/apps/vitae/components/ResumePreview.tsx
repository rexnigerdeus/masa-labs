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

/** Points du descripteur → pixels de l'aperçu, à l'échelle d'une page A4. */
const PX_PER_PT = 1.333;
const pt = (value: number): string => `${(value * PX_PER_PT).toFixed(2)}px`;

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
    <article
      // Ratio A4 : la largeur suit le conteneur, la hauteur suit le contenu.
      // L'aperçu ne prétend pas paginer — c'est `ats:check` qui contrôle le
      // nombre de pages réel, sur le PDF lui-même.
      className="bg-white text-ink shadow-sm"
      style={{
        aspectRatio: '210 / 297',
        padding: pt(s.page),
        fontSize: pt(t.body),
        lineHeight: t.lineHeight,
        overflow: 'hidden',
      }}
    >
      {spec.sectionOrder.map((section) => (
        <Section key={section} spec={spec} resume={resume} section={section} />
      ))}
    </article>
  );
}
