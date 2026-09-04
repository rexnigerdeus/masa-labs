import { Document, Page, Text, View } from '@react-pdf/renderer';
import {
  compareByRecency,
  formatDate,
  formatRange,
  getTemplate,
  sectionTitle,
  type Education,
  type Experience,
  type Resume,
  type SectionId,
  type TemplateSpec,
} from '@everyday/cv-core';
import { registerFonts } from './fonts.ts';
import { buildStyles, type ResumeStyles } from './styles.ts';

/** Niveaux de langue en toutes lettres — pas de barre de progression. */
const LEVEL_LABELS: Record<string, string> = {
  natif: 'langue maternelle',
  courant: 'courant',
  intermediaire: 'intermédiaire',
  debutant: 'notions',
};

function nonEmpty(values: (string | undefined | null)[]): string[] {
  return values.filter((v): v is string => v != null && v.trim() !== '').map((v) => v.trim());
}

function SectionHeading({ spec, styles, section }: {
  spec: TemplateSpec; styles: ResumeStyles; section: SectionId;
}) {
  return (
    <View wrap={false}>
      <Text style={styles.sectionTitle}>{sectionTitle(spec, section)}</Text>
      {spec.sectionRule ? <View style={styles.sectionRule} /> : null}
    </View>
  );
}

function Bullets({ styles, items }: { styles: ResumeStyles; items: string[] }) {
  return (
    <>
      {items.map((text, i) => (
        <View style={styles.bulletRow} key={i}>
          {/* Une puce texte simple : les glyphes décoratifs ressortent en
              caractère de remplacement lors de l'extraction. */}
          <Text style={styles.bulletMark}>•</Text>
          <Text style={styles.bulletText}>{text}</Text>
        </View>
      ))}
    </>
  );
}

function ExperienceEntry({ styles, item }: { styles: ResumeStyles; item: Experience }) {
  const meta = nonEmpty([
    item.company,
    item.location,
    formatRange(item.start, item.end, item.current),
  ]);
  return (
    <View style={styles.entry} wrap={false}>
      <Text style={styles.entryTitle}>{item.role}</Text>
      {meta.length > 0 ? <Text style={styles.entryMeta}>{meta.join(' — ')}</Text> : null}
      <Bullets styles={styles} items={nonEmpty(item.bullets)} />
    </View>
  );
}

function EducationEntry({ styles, item }: { styles: ResumeStyles; item: Education }) {
  const meta = nonEmpty([
    item.school,
    item.location,
    formatRange(item.start, item.end, false),
  ]);
  return (
    <View style={styles.entry} wrap={false}>
      <Text style={styles.entryTitle}>{item.degree}</Text>
      {meta.length > 0 ? <Text style={styles.entryMeta}>{meta.join(' — ')}</Text> : null}
      <Bullets styles={styles} items={nonEmpty(item.details)} />
    </View>
  );
}

function Section({ spec, styles, resume, section }: {
  spec: TemplateSpec; styles: ResumeStyles; resume: Resume; section: SectionId;
}) {
  switch (section) {
    case 'personal': {
      const p = resume.personal;
      const contact = nonEmpty([p.location, p.phone, p.email, ...p.links]);
      return (
        <View>
          <Text style={styles.name}>{p.fullName}</Text>
          {resume.headline.trim() !== ''
            ? <Text style={styles.headline}>{resume.headline}</Text>
            : null}
          {contact.length > 0 ? <Text style={styles.contact}>{contact.join(' — ')}</Text> : null}
        </View>
      );
    }

    // Le titre professionnel est rendu dans l'en-tête, sous le nom : il n'a pas
    // de section propre dans le document.
    case 'headline':
      return null;

    case 'summary': {
      if (resume.summary.trim() === '') return null;
      return (
        <View>
          <SectionHeading spec={spec} styles={styles} section={section} />
          <Text style={styles.paragraph}>{resume.summary}</Text>
        </View>
      );
    }

    case 'experience': {
      const items = [...resume.experiences].sort(compareByRecency);
      if (items.length === 0) return null;
      return (
        <View>
          <SectionHeading spec={spec} styles={styles} section={section} />
          {items.map((item) => <ExperienceEntry styles={styles} item={item} key={item.id} />)}
        </View>
      );
    }

    case 'education': {
      const items = [...resume.education].sort(
        (a, b) => (b.end?.year ?? 0) - (a.end?.year ?? 0),
      );
      if (items.length === 0) return null;
      return (
        <View>
          <SectionHeading spec={spec} styles={styles} section={section} />
          {items.map((item) => <EducationEntry styles={styles} item={item} key={item.id} />)}
        </View>
      );
    }

    case 'skills': {
      const skills = nonEmpty(resume.skills);
      if (skills.length === 0) return null;
      return (
        <View>
          <SectionHeading spec={spec} styles={styles} section={section} />
          {/* Liste séparée par des virgules sur une ligne courante : chaque
              mot-clé reste un mot isolé à l'extraction, sans colonne. */}
          <Text style={styles.inlineList}>{skills.join(', ')}</Text>
        </View>
      );
    }

    case 'extras': {
      const languages = resume.languages.map(
        (l) => `${l.name} (${LEVEL_LABELS[l.level] ?? l.level})`,
      );
      const certifications = resume.certifications.map((c) => {
        const date = formatDate(c.date);
        return nonEmpty([c.name, c.issuer, date]).join(' — ');
      });
      const projects = resume.projects.map(
        (p) => nonEmpty([p.name, p.description, p.url]).join(' — '),
      );
      if (languages.length + certifications.length + projects.length === 0) return null;
      return (
        <View>
          <SectionHeading spec={spec} styles={styles} section={section} />
          {languages.length > 0
            ? <Text style={styles.inlineList}>{`Langues : ${languages.join(', ')}`}</Text>
            : null}
          <Bullets styles={styles} items={[...certifications, ...projects]} />
        </View>
      );
    }
  }
}

/**
 * Document PDF d'un CV.
 *
 * Contraintes ATS tenues par construction : une seule colonne, texte réel avec
 * police embarquée, aucune image, aucun tableau, en-têtes de section standard,
 * ordre de lecture identique à l'ordre visuel. Le harnais `ats:check` vérifie
 * que ces propriétés survivent à la réextraction.
 */
export function ResumeDocument({ resume }: { resume: Resume }) {
  registerFonts();
  const spec = getTemplate(resume.templateId);
  const styles = buildStyles(spec);

  return (
    <Document
      title={`CV — ${resume.personal.fullName}`}
      author={resume.personal.fullName}
      creator="Vitae — The Everyday Co"
      producer="Vitae — The Everyday Co"
      language="fr"
    >
      <Page size="A4" style={styles.page}>
        {spec.sectionOrder.map((section) => (
          <Section spec={spec} styles={styles} resume={resume} section={section} key={section} />
        ))}
      </Page>
    </Document>
  );
}
