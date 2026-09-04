import type { Resume, SectionId, Experience } from '../types.ts';
import type { CriterionId } from './types.ts';
import { ACTION_VERBS, SOFT_SKILLS, WEAK_OPENERS } from './lexicons.ts';
import {
  containsAny, hasNumber, isBlank, matches, normalize, startsWithAny, wordCount,
} from './text.ts';

/**
 * Un contrôle élémentaire du CV.
 *
 * Tout le moteur est construit là-dessus : les scores par critère, les scores
 * par section et les recommandations sont trois lectures différentes de la même
 * liste de contrôles. Ajouter une règle = ajouter un `Check`, rien d'autre.
 */
export interface Check {
  id: string;
  section: SectionId;
  criterion: CriterionId;
  /** Poids relatif à l'intérieur de son critère. */
  weight: number;
  /**
   * 0 = raté, 1 = réussi, valeurs intermédiaires pour les règles graduelles.
   *
   * `null` = contrôle sans objet, exclu du calcul. Indispensable pour ne pas
   * créditer un CV vide : vérifier la ponctuation de puces qui n'existent pas
   * n'est pas une réussite, c'est une question qui ne se pose pas encore.
   */
  value: number | null;
  /** Consigne affichée quand `value < 1`. */
  label: string;
}

const ok = (v: boolean): number => (v ? 1 : 0);

/** Proportion bornée à [0,1]. Renvoie `whenEmpty` si l'échantillon est vide. */
function ratio(part: number, whole: number, whenEmpty: number): number {
  if (whole === 0) return whenEmpty;
  return Math.max(0, Math.min(1, part / whole));
}

/** Proportion sur un échantillon qui peut ne pas exister : vide = sans objet. */
function ratioOrNa(part: number, whole: number): number | null {
  return whole === 0 ? null : Math.max(0, Math.min(1, part / whole));
}

/** Idem, mais la valeur mesurée est un défaut : plus il y en a, plus on perd. */
function penaltyOrNa(bad: number, whole: number): number | null {
  const r = ratioOrNa(bad, whole);
  return r === null ? null : 1 - r;
}

/** Règle booléenne qui ne s'applique que si `applicable`. */
function okOrNa(applicable: boolean, passed: boolean): number | null {
  return applicable ? ok(passed) : null;
}

/** Toutes les puces d'expérience du CV, à plat. */
function allBullets(resume: Resume): string[] {
  return resume.experiences.flatMap((e) => e.bullets).filter((b) => !isBlank(b));
}

/** Texte libre du CV, pour la détection de soft skills. */
function narrativeText(resume: Resume): string {
  return [resume.summary, ...resume.skills, ...allBullets(resume)].join(' . ');
}

function hasAnyDate(exp: Experience): boolean {
  return exp.start !== null;
}

// ---------------------------------------------------------------- structure

function structureChecks(resume: Resume): Check[] {
  const p = resume.personal;
  const bullets = allBullets(resume);
  const datedExp = resume.experiences.filter(hasAnyDate).length;
  const datedEdu = resume.education.filter((e) => e.end !== null || e.start !== null).length;

  return [
    {
      id: 'structure.name', section: 'personal', criterion: 'structure', weight: 3,
      value: ok(!isBlank(p.fullName)),
      label: "Renseignez votre nom complet — un ATS qui ne trouve pas de nom classe le CV en dernier.",
    },
    {
      id: 'structure.contact', section: 'personal', criterion: 'structure', weight: 3,
      value: ratio([p.phone, p.email].filter((v) => !isBlank(v)).length, 2, 0),
      label: "Ajoutez un téléphone et un email — sans moyen de contact, la candidature est perdue.",
    },
    {
      id: 'structure.location', section: 'personal', criterion: 'structure', weight: 1,
      value: ok(!isBlank(p.location)),
      label: "Indiquez votre ville — les recruteurs filtrent souvent par localisation.",
    },
    {
      id: 'structure.headline', section: 'headline', criterion: 'structure', weight: 2,
      value: ok(!isBlank(resume.headline)),
      label: "Ajoutez un titre professionnel (ex. « Assistant comptable junior ») en haut du CV.",
    },
    {
      id: 'structure.summary', section: 'summary', criterion: 'structure', weight: 2,
      value: ok(!isBlank(resume.summary)),
      label: "Rédigez un résumé de 2 à 4 phrases : c'est la première chose lue par un humain.",
    },
    {
      id: 'structure.experience', section: 'experience', criterion: 'structure', weight: 3,
      // Un étudiant sans expérience formelle peut compenser par des projets :
      // c'est explicitement une des cibles du brief (§3).
      value: ok(resume.experiences.length > 0 || resume.projects.length > 0),
      label: "Ajoutez au moins une expérience — à défaut, un projet personnel, associatif ou académique.",
    },
    {
      id: 'structure.bullets', section: 'experience', criterion: 'structure', weight: 2,
      value: ok(bullets.length > 0),
      label: "Décrivez chaque expérience en puces : un intitulé de poste seul n'apprend rien au recruteur.",
    },
    {
      id: 'structure.education', section: 'education', criterion: 'structure', weight: 2,
      value: ok(resume.education.length > 0),
      label: "Ajoutez votre formation (diplôme, établissement, année).",
    },
    {
      id: 'structure.skills', section: 'skills', criterion: 'structure', weight: 2,
      value: ratio(resume.skills.filter((s) => !isBlank(s)).length, 5, 0),
      label: "Listez au moins 5 compétences : c'est sur ces mots-clés que les ATS filtrent.",
    },
    {
      id: 'structure.languages', section: 'extras', criterion: 'structure', weight: 1,
      value: ok(resume.languages.length > 0),
      label: "Précisez vos langues et votre niveau (français, anglais…).",
    },
    {
      id: 'structure.expDates', section: 'experience', criterion: 'structure', weight: 2,
      value: ratioOrNa(datedExp, resume.experiences.length),
      label: "Datez chaque expérience : un ATS qui ne peut pas calculer votre ancienneté vous pénalise.",
    },
    {
      id: 'structure.eduDates', section: 'education', criterion: 'structure', weight: 1,
      value: ratioOrNa(datedEdu, resume.education.length),
      label: "Datez chaque formation (au minimum l'année d'obtention).",
    },
  ];
}

// ------------------------------------------------------------------- impact

function impactChecks(resume: Resume): Check[] {
  const bullets = allBullets(resume);
  const withVerb = bullets.filter((b) => startsWithAny(b, ACTION_VERBS)).length;
  const withNumber = bullets.filter((b) => hasNumber(b)).length;
  const weak = bullets.filter((b) => startsWithAny(b, WEAK_OPENERS)).length;

  return [
    {
      id: 'impact.actionVerbs', section: 'experience', criterion: 'impact', weight: 4,
      value: ratioOrNa(withVerb, bullets.length),
      label: "Commencez chaque puce par un verbe d'action (« Géré », « Développé », « Négocié »).",
    },
    {
      id: 'impact.numbers', section: 'experience', criterion: 'impact', weight: 3,
      // Viser la moitié des puces chiffrées : tout chiffrer sonne faux.
      value: ratioOrNa(withNumber, bullets.length === 0 ? 0 : Math.ceil(bullets.length / 2)),
      label: "Chiffrez vos résultats sur au moins une puce sur deux (montants, volumes, pourcentages, délais).",
    },
    {
      id: 'impact.weakOpeners', section: 'experience', criterion: 'impact', weight: 2,
      value: penaltyOrNa(weak, bullets.length),
      label: "Remplacez les formules passives (« Responsable de… », « Participation à… ») par ce que vous avez fait.",
    },
    {
      id: 'impact.headlinePrecise', section: 'headline', criterion: 'impact', weight: 1,
      value: ok(!isBlank(resume.headline) && wordCount(resume.headline) >= 2),
      label: "Précisez votre titre : « Comptable » seul est trop vague, ajoutez le domaine ou le niveau.",
    },
  ];
}

// ----------------------------------------------------------------- brièveté

function brieveteChecks(resume: Resume): Check[] {
  const bullets = allBullets(resume);
  // Une puce lisible tient sur une ligne et demie : 8 à 30 mots.
  const wellSized = bullets.filter((b) => {
    const w = wordCount(b);
    return w >= 8 && w <= 30;
  }).length;
  const overloaded = resume.experiences.filter((e) => e.bullets.length > 6).length;
  const summaryWords = wordCount(resume.summary);
  const headlineWords = wordCount(resume.headline);

  return [
    {
      id: 'brievete.bulletLength', section: 'experience', criterion: 'brievete', weight: 4,
      value: ratioOrNa(wellSized, bullets.length),
      label: "Visez 8 à 30 mots par puce : une puce trop courte n'informe pas, une puce trop longue n'est pas lue.",
    },
    {
      id: 'brievete.bulletCount', section: 'experience', criterion: 'brievete', weight: 2,
      value: penaltyOrNa(overloaded, resume.experiences.length),
      label: "Limitez-vous à 6 puces maximum par expérience — gardez les plus fortes.",
    },
    {
      id: 'brievete.summary', section: 'summary', criterion: 'brievete', weight: 3,
      value: ok(summaryWords >= 25 && summaryWords <= 80),
      label: "Calibrez le résumé entre 25 et 80 mots (2 à 4 phrases).",
    },
    {
      id: 'brievete.headline', section: 'headline', criterion: 'brievete', weight: 1,
      value: ok(headlineWords > 0 && headlineWords <= 10),
      label: "Gardez un titre court : 10 mots maximum, sans phrase complète.",
    },
  ];
}

// ---------------------------------------------------------------- cohérence

function coherenceChecks(resume: Resume): Check[] {
  const bullets = allBullets(resume);

  // Uniformité du format de date : soit toutes les expériences portent un mois,
  // soit aucune. Un mélange « 03/2024 » / « 2024 » se voit immédiatement.
  const dated = resume.experiences.filter((e) => e.start !== null);
  const withMonth = dated.filter((e) => e.start?.month != null).length;
  const dateUniform = withMonth === 0 || withMonth === dated.length;

  // Majuscule initiale sur chaque puce.
  const capitalized = bullets.filter((b) => {
    const first = b.trim().charAt(0);
    return first === first.toUpperCase() && first !== first.toLowerCase();
  }).length;

  // Ponctuation finale homogène : toutes les puces avec point, ou aucune.
  const ended = bullets.filter((b) => /[.!?]$/.test(b.trim())).length;
  const punctUniform = ended === 0 || ended === bullets.length;

  // Intitulés en capitales : cassent la lecture et certains parseurs.
  const shouty = resume.experiences.filter((e) => {
    const t = `${e.role} ${e.company}`;
    return t.trim().length > 3 && t === t.toUpperCase();
  }).length;

  // Doublons de compétences (« Excel » et « excel »).
  const skillKeys = resume.skills.map(normalize).filter((s) => s.length > 0);
  const duplicateSkills = skillKeys.length - new Set(skillKeys).size;

  return [
    {
      id: 'coherence.dateFormat', section: 'experience', criterion: 'coherence', weight: 3,
      value: okOrNa(dated.length > 0, dateUniform),
      label: "Uniformisez le format des dates : soit mois + année partout, soit l'année seule partout.",
    },
    {
      id: 'coherence.capitalization', section: 'experience', criterion: 'coherence', weight: 2,
      value: ratioOrNa(capitalized, bullets.length),
      label: "Commencez chaque puce par une majuscule.",
    },
    {
      id: 'coherence.punctuation', section: 'experience', criterion: 'coherence', weight: 2,
      value: okOrNa(bullets.length > 0, punctUniform),
      label: "Terminez vos puces de la même façon : toutes avec un point, ou toutes sans.",
    },
    {
      id: 'coherence.noCaps', section: 'experience', criterion: 'coherence', weight: 1,
      value: penaltyOrNa(shouty, resume.experiences.length),
      label: "Évitez les intitulés tout en majuscules : écrivez « Chef de projet », pas « CHEF DE PROJET ».",
    },
    {
      id: 'coherence.skillDuplicates', section: 'skills', criterion: 'coherence', weight: 2,
      value: penaltyOrNa(duplicateSkills, skillKeys.length),
      label: "Supprimez les compétences en double.",
    },
    {
      id: 'coherence.emailFormat', section: 'personal', criterion: 'coherence', weight: 2,
      value: ok(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resume.personal.email.trim())),
      label: "Vérifiez le format de votre adresse email.",
    },
  ];
}

// --------------------------------------------------------------- soft skills

function softSkillChecks(resume: Resume): Check[] {
  const found = matches(narrativeText(resume), SOFT_SKILLS);
  const inSkills = resume.skills.some((s) => containsAny(s, SOFT_SKILLS));

  return [
    {
      id: 'soft.presence', section: 'skills', criterion: 'softSkills', weight: 4,
      // Trois soft skills distinctes suffisent : au-delà, l'effet s'inverse.
      value: ratio(found.length, 3, 0),
      label: "Mentionnez 3 compétences comportementales (travail en équipe, rigueur, autonomie…).",
    },
    {
      id: 'soft.inSkillList', section: 'skills', criterion: 'softSkills', weight: 2,
      value: ok(inSkills),
      label: "Faites figurer au moins une compétence comportementale dans la liste des compétences.",
    },
    {
      id: 'soft.inSummary', section: 'summary', criterion: 'softSkills', weight: 2,
      value: ok(containsAny(resume.summary, SOFT_SKILLS)),
      label: "Glissez une qualité personnelle dans votre résumé, illustrée plutôt qu'affirmée.",
    },
  ];
}

/** Tous les contrôles du CV, dans l'ordre des critères. */
export function buildChecks(resume: Resume): Check[] {
  return [
    ...structureChecks(resume),
    ...impactChecks(resume),
    ...brieveteChecks(resume),
    ...coherenceChecks(resume),
    ...softSkillChecks(resume),
  ];
}
