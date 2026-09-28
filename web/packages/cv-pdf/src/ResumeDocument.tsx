import { Document, Image, Page, Text, View } from '@react-pdf/renderer';
import {
  compareByRecency,
  contactTitle,
  formatDate,
  formatRange,
  getTemplate,
  mainSections,
  normalizeAccent,
  pageMetrics,
  sectionTitle,
  sidebarSections,
  templatePalette,
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

function contactLines(resume: Resume): string[] {
  const p = resume.personal;
  return nonEmpty([p.location, p.phone, p.email, ...p.links]);
}

function hasPhoto(resume: Resume): boolean {
  return resume.personal.photo !== null && resume.personal.showPhoto;
}

interface Ctx {
  spec: TemplateSpec;
  styles: ResumeStyles;
  resume: Resume;
}

/**
 * Photo du candidat, à côté de l'identité.
 *
 * Posée à côté du texte, jamais à sa place : aucune information du CV n'existe
 * seulement dans cette image, un logiciel de tri qui l'ignore ne perd rien.
 */
function HeaderPhoto({ spec, styles, resume }: Ctx) {
  if (!hasPhoto(resume) || spec.layout.kind === 'sidebar') return null;
  const frame = spec.header === 'band'
    ? styles.photoOnBand
    : spec.header === 'tint' ? styles.photoOnTint : styles.photoOnPaper;
  return <Image src={resume.personal.photo as string} style={[styles.photo, frame]} />;
}

/**
 * Bloc d'identité.
 *
 * Nom, titre professionnel, ligne de coordonnées — dans cet ordre quel que
 * soit l'habillage. Un modèle à colonne latérale y garde le nom et le titre ;
 * photo et coordonnées passent dans la colonne.
 */
function Header(ctx: Ctx) {
  const { spec, styles, resume } = ctx;
  const inverted = spec.header === 'band';
  const centered = spec.header === 'centered';
  const withSidebar = spec.layout.kind === 'sidebar';
  const contact = withSidebar ? [] : contactLines(resume);
  const photo = <HeaderPhoto {...ctx} />;
  const align = centered ? styles.textCenter : {};

  const text = (
    <View style={[styles.identity, centered ? styles.identityCentered : {}]}>
      <Text style={[inverted ? styles.nameInverted : styles.name, align]}>
        {resume.personal.fullName}
      </Text>
      {resume.headline.trim() !== ''
        ? (
          <Text style={[inverted ? styles.headlineInverted : styles.headline, align]}>
            {resume.headline}
          </Text>
        )
        : null}
      {contact.length > 0
        ? (
          <Text style={[inverted ? styles.contactInverted : styles.contact, align]}>
            {contact.join(' — ')}
          </Text>
        )
        : null}
      {withSidebar ? <View style={styles.headerAccentBar} /> : null}
    </View>
  );

  if (centered) {
    return (
      <View style={styles.headerCentered}>
        {photo}
        {text}
        <View style={styles.headerHairline} />
      </View>
    );
  }

  const identity = (
    <View style={styles.headerRow}>
      {spec.photo.align === 'left' ? photo : null}
      {text}
      {spec.photo.align === 'right' ? photo : null}
    </View>
  );

  switch (spec.header) {
    case 'band':
      return <View style={styles.headerBand}>{identity}</View>;
    case 'tint':
      return <View style={styles.headerTint}>{identity}</View>;
    case 'underline':
      return (
        <View style={styles.header}>
          {identity}
          <View style={styles.headerUnderline} />
        </View>
      );
    case 'minimal':
      return <View style={styles.header}>{identity}</View>;
  }
}

/**
 * En-tête de section.
 *
 * `minPresenceAhead` : un titre ne reste jamais seul en bas de page. Sans ça,
 * « Langues et certifications » finissait la page 1 et son contenu ouvrait la
 * page 2.
 */
function SectionHeading({ spec, styles, section }: Ctx & { section: SectionId }) {
  const title = sectionTitle(spec, section);
  const accentText = [styles.sectionTitle, styles.sectionTitleAccent];
  const keep = { wrap: false, minPresenceAhead: 36 } as const;

  switch (spec.sectionStyle) {
    case 'rule':
      return (
        <View style={styles.sectionRuleWrap} {...keep}>
          <Text style={[styles.sectionTitle, styles.sectionTitleInk]}>{title}</Text>
          <View style={styles.sectionRule} />
        </View>
      );
    case 'bar':
      return (
        <View style={styles.sectionBarWrap} {...keep}>
          <View style={styles.sectionBar} />
          <Text style={accentText}>{title}</Text>
        </View>
      );
    case 'chip':
      return (
        <View style={styles.sectionChipWrap} {...keep}>
          <Text style={accentText}>{title}</Text>
        </View>
      );
    case 'plain':
      return (
        <View style={styles.sectionPlainWrap} {...keep}>
          <Text style={accentText}>{title}</Text>
        </View>
      );
    case 'banner':
      return (
        <View style={styles.sectionBannerWrap} {...keep}>
          <Text style={[styles.sectionTitle, styles.sectionTitleInverted]}>{title}</Text>
        </View>
      );
    case 'line':
      return (
        <View style={styles.sectionLineWrap} {...keep}>
          <Text style={accentText}>{title}</Text>
          <View style={styles.sectionLine} />
        </View>
      );
  }
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

/**
 * Une expérience ou une formation, sous les trois mises en forme du modèle.
 *
 * L'ordre du texte est le même partout — intitulé, dates, organisation — pour
 * que la réextraction ne dépende pas de l'habillage.
 */
function Entry({ spec, styles, title, org, dates, bullets }: {
  spec: TemplateSpec;
  styles: ResumeStyles;
  title: string;
  org: string[];
  dates: string;
  bullets: string[];
}) {
  if (spec.entryStyle === 'stacked') {
    const meta = nonEmpty([...org, dates]);
    return (
      <View style={styles.entry} wrap={false}>
        <Text style={styles.entryTitle}>{title}</Text>
        {meta.length > 0 ? <Text style={styles.entryMeta}>{meta.join(' — ')}</Text> : null}
        <Bullets styles={styles} items={bullets} />
      </View>
    );
  }

  const body = (
    <>
      <View style={styles.entryHead}>
        <Text style={styles.entryHeadTitle}>{title}</Text>
        {dates !== '' ? <Text style={styles.entryDates}>{dates}</Text> : null}
      </View>
      {org.length > 0 ? <Text style={styles.entryOrg}>{org.join(' — ')}</Text> : null}
      <Bullets styles={styles} items={bullets} />
    </>
  );

  if (spec.entryStyle === 'timeline') {
    return (
      <View style={styles.timelineEntry} wrap={false}>
        <View style={styles.timelineDot} />
        {body}
      </View>
    );
  }
  return <View style={styles.entry} wrap={false}>{body}</View>;
}

function languageLines(resume: Resume): string[] {
  return resume.languages
    .filter((l) => l.name.trim() !== '')
    .map((l) => `${l.name.trim()} (${LEVEL_LABELS[l.level] ?? l.level})`);
}

function extraItems(resume: Resume): string[] {
  const certifications = resume.certifications.map(
    (c) => nonEmpty([c.name, c.issuer, formatDate(c.date)]).join(' — '),
  );
  const projects = resume.projects.map(
    (p) => nonEmpty([p.name, p.description, p.url]).join(' — '),
  );
  return nonEmpty([...certifications, ...projects]);
}

function Section(ctx: Ctx & { section: SectionId }) {
  const { spec, styles, resume, section } = ctx;
  switch (section) {
    case 'personal':
      return <Header {...ctx} />;

    // Le titre professionnel est rendu dans l'en-tête, sous le nom : il n'a pas
    // de section propre dans le document.
    case 'headline':
      return null;

    case 'summary': {
      if (resume.summary.trim() === '') return null;
      return (
        <View>
          <SectionHeading {...ctx} />
          <Text style={styles.paragraph}>{resume.summary}</Text>
        </View>
      );
    }

    case 'experience': {
      const items = [...resume.experiences].sort(compareByRecency);
      if (items.length === 0) return null;
      return (
        <View>
          <SectionHeading {...ctx} />
          {items.map((item) => (
            <Entry
              key={item.id}
              spec={spec}
              styles={styles}
              title={item.role}
              org={nonEmpty([item.company, item.location])}
              dates={formatRange(item.start, item.end, item.current)}
              bullets={nonEmpty(item.bullets)}
            />
          ))}
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
          <SectionHeading {...ctx} />
          {items.map((item) => (
            <Entry
              key={item.id}
              spec={spec}
              styles={styles}
              title={item.degree}
              org={nonEmpty([item.school, item.location])}
              dates={formatRange(item.start, item.end, false)}
              bullets={nonEmpty(item.details)}
            />
          ))}
        </View>
      );
    }

    case 'skills': {
      const skills = nonEmpty(resume.skills);
      if (skills.length === 0) return null;
      return (
        <View>
          <SectionHeading {...ctx} />
          {/* Liste séparée par des virgules sur une ligne courante : chaque
              mot-clé reste un mot isolé à l'extraction, sans colonne. */}
          <Text style={styles.inlineList}>{skills.join(', ')}</Text>
        </View>
      );
    }

    case 'extras': {
      const languages = languageLines(resume);
      const items = extraItems(resume);
      if (languages.length + items.length === 0) return null;
      return (
        <View>
          <SectionHeading {...ctx} />
          {languages.length > 0
            ? <Text style={styles.inlineList}>{`Langues : ${languages.join(', ')}`}</Text>
            : null}
          <Bullets styles={styles} items={items} />
        </View>
      );
    }
  }
}

/** Une section de la colonne latérale : une information par ligne. */
function SidebarBlock({ styles, title, lines, muted = [] }: {
  styles: ResumeStyles; title: string; lines: string[]; muted?: string[];
}) {
  if (lines.length + muted.length === 0) return null;
  return (
    <View style={styles.sidebarBlock}>
      <Text style={styles.sidebarTitle}>{title}</Text>
      {lines.map((line, i) => <Text key={i} style={styles.sidebarLine}>{line}</Text>)}
      {muted.map((line, i) => <Text key={`m${i}`} style={styles.sidebarMuted}>{line}</Text>)}
    </View>
  );
}

/**
 * Colonne latérale.
 *
 * Positionnée en absolu et écrite *après* le corps : visuellement à gauche,
 * elle est lue en second — le logiciel de tri rencontre le nom, le résumé et
 * les expériences avant les coordonnées et les compétences, jamais un mélange
 * ligne à ligne des deux colonnes.
 */
function Sidebar({ spec, styles, resume }: Ctx) {
  const sections = sidebarSections(spec);
  return (
    <View style={styles.sidebarColumn}>
      {hasPhoto(resume)
        ? <Image src={resume.personal.photo as string} style={styles.sidebarPhoto} />
        : null}
      <SidebarBlock styles={styles} title={contactTitle(spec)} lines={contactLines(resume)} />
      {sections.map((section) => {
        switch (section) {
          case 'skills':
            return (
              <SidebarBlock
                key={section}
                styles={styles}
                title={sectionTitle(spec, section)}
                lines={nonEmpty(resume.skills)}
              />
            );
          case 'extras':
            return (
              <SidebarBlock
                key={section}
                styles={styles}
                title={sectionTitle(spec, section)}
                lines={languageLines(resume)}
                muted={extraItems(resume)}
              />
            );
          default:
            return null;
        }
      })}
    </View>
  );
}

/**
 * Document PDF d'un CV.
 *
 * Contraintes ATS tenues par construction : texte réel avec police embarquée,
 * aucun tableau, aucune icône, en-têtes de section standard, un seul flux de
 * lecture. Les aplats de couleur et la photo sont décoratifs — aucune
 * information n'y est enfermée. Le harnais `ats:check` vérifie que ces
 * propriétés survivent à la réextraction, photo comprise.
 *
 * `density` (1 par défaut) resserre les espacements verticaux : voir
 * `renderResumePdf`, qui le baisse quand un CV déborde de peu.
 */
export function ResumeDocument({ resume, density = 1 }: { resume: Resume; density?: number }) {
  registerFonts();
  const spec = getTemplate(resume.templateId);
  // Une couleur venue d'un brouillon ou d'une requête n'est pas une couleur
  // tant qu'elle n'a pas été validée : `normalizeAccent` rend toujours un
  // hexadécimal exploitable par react-pdf.
  const accent = normalizeAccent(resume.accentColor, spec.defaultAccent);
  const styles = buildStyles(
    spec,
    templatePalette(spec, accent),
    pageMetrics(spec, hasPhoto(resume), density),
  );
  const ctx = { spec, styles, resume };

  return (
    <Document
      title={`CV — ${resume.personal.fullName}`}
      author={resume.personal.fullName}
      creator="Vitae — The Everyday Co"
      producer="Vitae — The Everyday Co"
      language="fr"
    >
      <Page size="A4" style={styles.page}>
        {spec.layout.kind === 'sidebar' ? <View fixed style={styles.sidebarBackdrop} /> : null}
        {mainSections(spec).map((section) => (
          <Section {...ctx} section={section} key={section} />
        ))}
        {spec.layout.kind === 'sidebar' ? <Sidebar {...ctx} /> : null}
      </Page>
    </Document>
  );
}
