import type { Resume } from './types.ts';

/**
 * Lettre de motivation guidée (brief Vitae v2, Pass Candidature).
 *
 * Un formulaire en quatre questions — l'offre visée, pourquoi cette
 * structure, deux ou trois atouts choisis dans le CV, la disponibilité — et
 * une lettre assemblée à partir des réponses, que la personne relit et
 * modifie librement. Par règles, sans intelligence artificielle : le texte
 * produit est prévisible et ne promet rien que la personne n'a pas écrit.
 *
 * Le corps assemblé n'est qu'un point de départ : c'est `body`, modifié ou
 * non, qui part dans le PDF.
 */

export interface CoverLetter {
  /** Structure qui recrute. */
  company: string;
  /** Intitulé du poste visé. */
  position: string;
  /** Lien de l'offre, si la lettre part d'une offre de Vitae. */
  offerUrl: string;
  /** Réponse à « Pourquoi cette structure ? ». */
  why: string;
  /** Deux ou trois atouts choisis dans le CV. */
  strengths: string[];
  /** Disponibilité (« dès maintenant », « à partir du 1er décembre »). */
  availability: string;
  /** Ville et date en tête de lettre (« Abidjan, le 18 octobre 2026 »). */
  placeDate: string;
  /** Texte de la lettre, une ligne vide entre deux paragraphes. */
  body: string;
}

export function emptyCoverLetter(): CoverLetter {
  return {
    company: '', position: '', offerUrl: '', why: '', strengths: [],
    availability: '', placeDate: '', body: '',
  };
}

/** Atouts proposés au choix : intitulés d'expériences, diplômes, compétences. */
export function strengthChoices(resume: Resume): string[] {
  const choices = [
    ...resume.experiences
      .filter((e) => e.role.trim() !== '')
      .map((e) => (e.company.trim() === '' ? e.role.trim() : `${e.role.trim()} chez ${e.company.trim()}`)),
    ...resume.education
      .filter((e) => e.degree.trim() !== '')
      .map((e) => e.degree.trim()),
    ...resume.skills.map((s) => s.trim()).filter((s) => s !== ''),
  ];
  return [...new Set(choices)].slice(0, 15);
}

function sentence(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t === '') return '';
  const capital = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(capital) ? capital : `${capital}.`;
}

function list(items: string[]): string {
  const clean = items.map((s) => s.trim()).filter(Boolean);
  if (clean.length <= 1) return clean[0] ?? '';
  return `${clean.slice(0, -1).join(', ')} et ${clean[clean.length - 1]}`;
}

/** Assemble le corps de la lettre à partir des réponses et du CV. */
export function composeCoverLetter(letter: CoverLetter, resume: Resume): string {
  const position = letter.position.trim() || resume.headline.trim() || 'le poste proposé';
  const company = letter.company.trim() || 'votre structure';
  const paragraphs: string[] = [];

  paragraphs.push('Madame, Monsieur,');
  paragraphs.push(
    `Je vous propose ma candidature au poste de ${position} au sein de ${company}.`
    + (letter.why.trim() === '' ? '' : ` ${sentence(letter.why)}`),
  );

  const strengths = letter.strengths.map((s) => s.trim()).filter(Boolean).slice(0, 3);
  if (strengths.length > 0) {
    paragraphs.push(
      `Mon parcours m’a permis de développer des atouts utiles à ce poste : ${list(strengths)}. `
      + `Je souhaite les mettre au service de ${company} et continuer à apprendre à vos côtés.`,
    );
  }

  const availability = letter.availability.trim().replace(/[.]$/, '');
  paragraphs.push(
    (availability === ''
      ? 'Je suis disponible pour un entretien à votre convenance.'
      : `Je suis disponible ${availability}, et pour un entretien à votre convenance.`)
    + ' Vous trouverez mon CV joint à ce message.',
  );

  paragraphs.push(
    'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.',
  );
  return paragraphs.join('\n\n');
}

/** Paragraphes du corps, pour la mise en page. */
export function letterParagraphs(body: string): string[] {
  return body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

/** Remet en forme une lettre venue du navigateur ou de la base ; `null` si illisible. */
export function normalizeCoverLetter(input: unknown): CoverLetter | null {
  if (typeof input !== 'object' || input === null) return null;
  const o = input as Record<string, unknown>;
  const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '');
  return {
    company: str(o.company, 120),
    position: str(o.position, 160),
    offerUrl: str(o.offerUrl, 500),
    why: str(o.why, 1200),
    strengths: Array.isArray(o.strengths)
      ? o.strengths.filter((s): s is string => typeof s === 'string').slice(0, 3).map((s) => s.slice(0, 160))
      : [],
    availability: str(o.availability, 120),
    placeDate: str(o.placeDate, 120),
    body: str(o.body, 6000),
  };
}
