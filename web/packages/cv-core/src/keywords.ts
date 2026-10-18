import type { Resume } from './types.ts';
import { normalize } from './scoring/text.ts';

/**
 * Mots importants d'une offre, et ceux que le CV contient déjà.
 *
 * Brief Vitae v2, « CV ciblé » : l'éditeur affiche les mots importants de
 * l'offre (titre, compétences répétées) et coche ceux déjà présents dans le
 * CV. Version 1 par règles simples, sans intelligence artificielle — même
 * esprit que le score : déterministe, gratuit à calculer, vérifiable à l'œil.
 *
 * Règles :
 * 1. Chaque mot significatif du titre de l'offre (« Assistant », «
 *    marketing », « digital »), dans l'ordre.
 * 2. Puis les mots et paires de mots qui reviennent au moins deux fois dans la
 *    description, du plus fréquent au moins fréquent.
 * Les mots vides, les mentions de contrat (CDI, H/F) et les mots de moins de
 * trois lettres sont écartés : ce ne sont pas des compétences.
 */

const STOPWORDS = new Set(`
a afin ainsi alors au aux avec avoir bon bonne ce cela ces cet cette chez comme
dans de des deja doit dont du elle en entre est et etre fait faire il ils la le
les leur leurs lors mais meme moins nos notre nous ou par parmi pas plus pour
qu que qui sa sans se ses si son sont sous sur ta te tes toute toutes tous tout
tres un une vos votre vous y vers ainsi
the and for with you your our are from this that will have has into who what
job poste offre recrute recrutement recherche recherchons candidat candidate
candidats profil mission missions h f hf cdi cdd stage stagiaire emploi
entreprise societe client clients equipe annee annees ans experience
experiences niveau minimum date lieu cote ivoire abidjan
`.split(/\s+/).filter(Boolean));

function significant(word: string): boolean {
  return word.length >= 3 && !STOPWORDS.has(word) && !/^\d+$/.test(word);
}

/**
 * Jusqu'à `max` mots-clés, sous leur forme normalisée (sans accent, en
 * minuscules) : c'est sous cette forme qu'on les cherche dans le CV, et
 * qu'on les affiche — un mot-clé n'a pas besoin de ses majuscules.
 */
export function offerKeywords(title: string, description: string, max = 12): string[] {
  const out: string[] = [];
  const add = (term: string): void => {
    if (out.length < max && !out.includes(term)) out.push(term);
  };

  for (const word of normalize(title).split(' ')) {
    if (significant(word)) add(word);
  }

  const words = normalize(description).split(' ').filter(Boolean);
  const counts = new Map<string, number>();
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i] as string;
    if (significant(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
    const next = words[i + 1];
    if (next !== undefined && significant(w) && significant(next)) {
      const pair = `${w} ${next}`;
      counts.set(pair, (counts.get(pair) ?? 0) + 1);
    }
  }
  const repeated = [...counts.entries()]
    .filter(([, n]) => n >= 2)
    // Les paires d'abord à fréquence égale : « gestion projet » dit plus
    // que « gestion ».
    .sort((a, b) => b[1] - a[1] || b[0].split(' ').length - a[0].split(' ').length)
    .map(([term]) => term);
  for (const term of repeated) {
    // Un mot déjà couvert par une paire retenue n'ajoute rien.
    if (out.some((kept) => kept.split(' ').includes(term))) continue;
    add(term);
  }
  return out;
}

/** Tout le texte du CV, normalisé, entouré d'espaces pour chercher des mots entiers. */
function resumeText(resume: Resume): string {
  const parts: string[] = [
    resume.headline,
    resume.summary,
    ...resume.skills,
    ...resume.experiences.flatMap((e) => [e.role, e.company, ...e.bullets]),
    ...resume.education.flatMap((e) => [e.degree, e.school, ...e.details]),
    ...resume.languages.map((l) => l.name),
    ...resume.certifications.map((c) => c.name),
    ...resume.projects.flatMap((p) => [p.name, p.description]),
  ];
  return ` ${normalize(parts.join(' '))} `;
}

export interface KeywordCoverage {
  keyword: string;
  present: boolean;
}

/** Chaque mot-clé, coché s'il apparaît en mot entier dans le CV. */
export function keywordCoverage(resume: Resume, keywords: readonly string[]): KeywordCoverage[] {
  const text = resumeText(resume);
  return keywords.map((keyword) => ({ keyword, present: text.includes(` ${keyword} `) }));
}
