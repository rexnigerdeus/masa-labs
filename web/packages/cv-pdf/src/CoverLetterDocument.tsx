import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import {
  INK,
  MUTED,
  letterParagraphs,
  normalizeAccent,
  getTemplate,
  type CoverLetter,
  type Resume,
} from '@everyday/cv-core';
import { FONT_FAMILY, registerFonts } from './fonts.ts';

/**
 * Lettre de motivation en PDF (brief Vitae v2, Pass Candidature), « dans le
 * style du modèle de CV » : même police embarquée, même couleur primaire que
 * le CV dont elle part, même en-tête d'identité. Une seule colonne, du texte
 * réel : comme le CV, elle se relit par un logiciel de tri.
 *
 * Volontairement plus simple que le CV : une lettre n'a ni sections ni
 * colonnes, et la mise en page d'une lettre française est une convention,
 * pas un choix de modèle.
 */

function contact(resume: Resume): string {
  const p = resume.personal;
  return [p.location, p.phone, p.email].map((v) => v.trim()).filter(Boolean).join('  ·  ');
}

function styles(accent: string) {
  return StyleSheet.create({
    page: {
      fontFamily: FONT_FAMILY,
      fontSize: 10.5,
      lineHeight: 1.5,
      color: INK,
      paddingTop: 48,
      paddingBottom: 48,
      paddingHorizontal: 56,
    },
    rule: { height: 3, width: 48, backgroundColor: accent, marginBottom: 14 },
    name: { fontSize: 20, fontWeight: 700, color: accent, lineHeight: 1.2 },
    headline: { fontSize: 11, color: MUTED, marginTop: 2 },
    contact: { fontSize: 9.5, color: MUTED, marginTop: 6 },
    meta: { marginTop: 28, alignItems: 'flex-end' },
    recipient: { marginTop: 18, fontWeight: 700 },
    object: { marginTop: 18, fontWeight: 700 },
    paragraph: { marginTop: 11, textAlign: 'justify' },
    signature: { marginTop: 22, fontWeight: 700 },
  });
}

export function CoverLetterDocument({ letter, resume }: { letter: CoverLetter; resume: Resume }) {
  registerFonts();
  const accent = normalizeAccent(resume.accentColor, getTemplate(resume.templateId).defaultAccent);
  const s = styles(accent);
  const name = resume.personal.fullName.trim();
  const position = letter.position.trim();

  return (
    <Document title={`Lettre de motivation — ${name}`} author={name} language="fr">
      <Page size="A4" style={s.page}>
        <View style={s.rule} />
        {name === '' ? null : <Text style={s.name}>{name}</Text>}
        {resume.headline.trim() === '' ? null : <Text style={s.headline}>{resume.headline.trim()}</Text>}
        {contact(resume) === '' ? null : <Text style={s.contact}>{contact(resume)}</Text>}

        {letter.placeDate.trim() === '' ? null : (
          <View style={s.meta}><Text>{letter.placeDate.trim()}</Text></View>
        )}
        {letter.company.trim() === '' ? null : <Text style={s.recipient}>{letter.company.trim()}</Text>}
        {position === '' ? null : <Text style={s.object}>Objet : candidature au poste de {position}</Text>}

        {letterParagraphs(letter.body).map((p, i) => (
          // Un paragraphe = un bloc de texte : l'extraction le rend d'un seul tenant.
          <Text key={i} style={s.paragraph}>{p}</Text>
        ))}

        {name === '' ? null : <Text style={s.signature}>{name}</Text>}
      </Page>
    </Document>
  );
}

export async function renderCoverLetterPdf(letter: CoverLetter, resume: Resume): Promise<Buffer> {
  return renderToBuffer(<CoverLetterDocument letter={letter} resume={resume} />);
}

/** Nom de fichier proposé au téléchargement. */
export function letterFileName(resume: Resume): string {
  const base = resume.personal.fullName.trim() === ''
    ? 'Lettre de motivation'
    : `Lettre de motivation ${resume.personal.fullName}`;
  return `${base.replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, '-')}.pdf`;
}
