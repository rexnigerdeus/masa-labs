import type {
  Education, Experience, Recommendation, Resume, SectionId,
} from '@everyday/cv-core';

/**
 * Parcours de création du CV, étape par étape.
 *
 * L'éditeur précédent montrait toutes les sections d'un coup, en onglets, avec
 * le choix du modèle, la couleur, le score et le téléchargement sur le même
 * écran. Les retours d'usage sont sans ambiguïté : « je vois des sections à
 * remplir mais je ne sais pas où », « je ne vois pas où télécharger ». Le
 * public visé — étudiants, personnes peu à l'aise avec le numérique — se perd
 * dès que les options se multiplient.
 *
 * D'où un parcours linéaire : une question par écran, un seul bouton
 * principal, et on ne passe à la suite que lorsque l'écran est valide. Les
 * étapes facultatives le disent et se passent d'un geste.
 *
 * Fonctions pures, sans React : la règle « peut-on continuer ? » se lit ici en
 * un coup d'œil et ne dépend pas de l'écran qui l'affiche.
 */

export type StepId =
  | 'modele'
  | 'identite'
  | 'coordonnees'
  | 'photo'
  | 'profil'
  | 'experience'
  | 'formation'
  | 'competences'
  | 'langues'
  | 'final';

export interface StepDef {
  id: StepId;
  /** Libellé court, pour la barre de progression. */
  label: string;
  /** La question posée, en titre de l'écran. */
  title: string;
  /** Une phrase qui dit quoi faire — pas plus. */
  lead: string;
  /** Une étape facultative affiche « Passer » tant qu'elle est vide. */
  optional: boolean;
}

export const STEPS: StepDef[] = [
  {
    id: 'modele',
    label: 'Modèle',
    title: 'Choisissez le modèle de votre CV',
    lead: 'Touchez un modèle pour le choisir. Vous pourrez en changer à la fin.',
    optional: false,
  },
  {
    id: 'identite',
    label: 'Nom',
    title: 'Comment vous appelez-vous ?',
    lead: 'Votre nom et le poste que vous cherchez s’affichent en haut du CV.',
    optional: false,
  },
  {
    id: 'coordonnees',
    label: 'Contact',
    title: 'Comment le recruteur peut-il vous joindre ?',
    lead: 'Donnez au moins un téléphone ou un email.',
    optional: false,
  },
  {
    id: 'photo',
    label: 'Photo',
    title: 'Ajoutez une photo',
    lead: 'Facultatif, mais attendu par la plupart des recruteurs en Côte d’Ivoire.',
    optional: true,
  },
  {
    id: 'profil',
    label: 'Profil',
    title: 'Présentez-vous en quelques phrases',
    lead: 'Qui vous êtes, ce que vous savez faire, ce que vous cherchez.',
    optional: true,
  },
  {
    id: 'experience',
    label: 'Expériences',
    title: 'Vos expériences',
    lead: 'Emplois, stages, petits boulots, bénévolat : tout compte.',
    optional: true,
  },
  {
    id: 'formation',
    label: 'Formation',
    title: 'Vos diplômes et formations',
    lead: 'Commencez par le plus récent.',
    optional: true,
  },
  {
    id: 'competences',
    label: 'Compétences',
    title: 'Ce que vous savez faire',
    lead: 'Logiciels, savoir-faire, qualités : touchez une suggestion ou écrivez les vôtres.',
    optional: true,
  },
  {
    id: 'langues',
    label: 'Langues',
    title: 'Les langues que vous parlez',
    lead: 'Et vos certifications, si vous en avez.',
    optional: true,
  },
  {
    id: 'final',
    label: 'Terminé',
    title: 'Votre CV est prêt',
    lead: 'Vérifiez-le, puis téléchargez-le.',
    optional: false,
  },
];

export const STEP_IDS: StepId[] = STEPS.map((s) => s.id);

export function isStepId(value: unknown): value is StepId {
  return typeof value === 'string' && (STEP_IDS as string[]).includes(value);
}

export function stepIndex(id: StepId): number {
  return STEP_IDS.indexOf(id);
}

export function getStep(id: StepId): StepDef {
  return STEPS[stepIndex(id)] as StepDef;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const blank = (value: string): boolean => value.trim() === '';
const digits = (value: string): number => value.replace(/\D/g, '').length;

/** Champs manquants d'une expérience ; vide si elle peut être enregistrée. */
export function experienceErrors(exp: Experience): Record<string, string> {
  const errors: Record<string, string> = {};
  if (blank(exp.role)) errors.role = 'Indiquez l’intitulé du poste.';
  if (blank(exp.company)) errors.company = 'Indiquez l’entreprise ou l’organisation.';
  if (exp.start === null) errors.start = 'Indiquez au moins l’année de début.';
  if (!exp.current && exp.start !== null && exp.end !== null && exp.end.year < exp.start.year) {
    errors.end = 'La fin ne peut pas précéder le début.';
  }
  return errors;
}

/** Champs manquants d'une formation ; vide si elle peut être enregistrée. */
export function educationErrors(edu: Education): Record<string, string> {
  const errors: Record<string, string> = {};
  if (blank(edu.degree)) errors.degree = 'Indiquez le diplôme ou la formation.';
  if (blank(edu.school)) errors.school = 'Indiquez l’établissement.';
  if (edu.start !== null && edu.end !== null && edu.end.year < edu.start.year) {
    errors.end = 'L’obtention ne peut pas précéder le début.';
  }
  return errors;
}

/**
 * Erreurs qui empêchent de quitter l'étape, par champ.
 *
 * Un objet vide veut dire « on peut continuer ». Les messages sont écrits pour
 * être affichés tels quels sous le champ concerné : ils disent quoi faire, pas
 * ce qui ne va pas.
 */
export function stepErrors(step: StepId, resume: Resume): Record<string, string> {
  const errors: Record<string, string> = {};
  const p = resume.personal;

  switch (step) {
    case 'identite':
      if (blank(p.fullName)) errors.fullName = 'Écrivez votre prénom et votre nom.';
      if (blank(resume.headline)) {
        errors.headline = 'Écrivez le poste que vous cherchez, même approximatif.';
      }
      break;

    case 'coordonnees':
      if (blank(p.phone) && blank(p.email)) {
        errors.phone = 'Donnez au moins un numéro de téléphone ou un email.';
      }
      if (!blank(p.phone) && digits(p.phone) < 8) {
        errors.phone = 'Ce numéro semble incomplet.';
      }
      if (!blank(p.email) && !EMAIL.test(p.email.trim())) {
        errors.email = 'Cette adresse email n’est pas valide (exemple : nom@gmail.com).';
      }
      break;

    case 'experience':
      // Une fiche incomplète ne se rattrape pas à la fin : on la signale ici.
      if (resume.experiences.some((e) => Object.keys(experienceErrors(e)).length > 0)) {
        errors.list = 'Une expérience est incomplète : touchez « Modifier » pour la compléter.';
      }
      break;

    case 'formation':
      if (resume.education.some((e) => Object.keys(educationErrors(e)).length > 0)) {
        errors.list = 'Une formation est incomplète : touchez « Modifier » pour la compléter.';
      }
      break;

    case 'langues':
      if (resume.languages.some((l) => blank(l.name))) {
        errors.languages = 'Écrivez le nom de chaque langue, ou retirez la ligne vide.';
      }
      break;

    default:
      break;
  }
  return errors;
}

/** true si l'utilisateur n'a encore rien saisi à cette étape. */
export function isStepEmpty(step: StepId, resume: Resume): boolean {
  switch (step) {
    case 'photo': return resume.personal.photo === null;
    case 'profil': return blank(resume.summary);
    case 'experience': return resume.experiences.length === 0;
    case 'formation': return resume.education.length === 0;
    case 'competences': return resume.skills.length === 0;
    case 'langues': return resume.languages.length === 0 && resume.certifications.length === 0;
    default: return false;
  }
}

/**
 * Étape où corriger une recommandation du score.
 *
 * Le score raisonne en sections, le parcours en écrans : l'identité du score
 * couvre à la fois l'écran « Nom » et l'écran « Contact ».
 */
export function stepForRecommendation(rec: Recommendation): StepId {
  return rec.id === 'structure.name' ? 'identite' : stepForSection(rec.section);
}

/**
 * Étape d'une section du score. Le nom étant obligatoire dès l'écran « Nom »,
 * ce qui reste à corriger dans l'identité relève presque toujours du contact.
 */
export function stepForSection(section: SectionId): StepId {
  switch (section) {
    case 'personal': return 'coordonnees';
    case 'headline': return 'identite';
    case 'summary': return 'profil';
    case 'experience': return 'experience';
    case 'education': return 'formation';
    case 'skills': return 'competences';
    case 'extras': return 'langues';
  }
}

/** true si l'utilisateur a réellement saisi quelque chose. */
export function hasContent(resume: Resume): boolean {
  return (
    !blank(resume.personal.fullName)
    || !blank(resume.headline)
    || !blank(resume.summary)
    || resume.experiences.length > 0
    || resume.education.length > 0
    || resume.skills.length > 0
  );
}

/* ---------- Mémoire de l'étape ----------
   Quelqu'un qui ferme l'application au milieu, ou qui part créer son compte
   pour télécharger, doit revenir sur l'écran qu'il a quitté — pas en haut
   d'un formulaire qu'il a déjà rempli. */

const STEP_KEY = 'vitae.step.v1';

export function loadStep(): StepId | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STEP_KEY);
    return isStepId(raw) ? raw : null;
  } catch {
    // Stockage indisponible : on repart du début, rien n'est perdu.
    return null;
  }
}

export function saveStep(step: StepId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STEP_KEY, step);
  } catch {
    // Quota ou stockage refusé : l'étape ne sera simplement pas retrouvée.
  }
}
