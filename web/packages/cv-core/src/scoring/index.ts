import type { Resume, SectionId } from '../types.ts';
import { buildChecks, type Check } from './checks.ts';
import {
  grade,
  type CriterionId,
  type CriterionScore,
  type Recommendation,
  type ScoreResult,
  type SectionScore,
} from './types.ts';

/**
 * Poids des critères dans le score global.
 *
 * `structure` domine délibérément : la promesse du produit est la lisibilité
 * ATS, et un CV mal structuré est éliminé avant d'être jugé sur sa rédaction.
 * La somme vaut 1.
 */
const CRITERION_WEIGHTS: Record<CriterionId, number> = {
  structure: 0.35,
  impact: 0.25,
  brievete: 0.15,
  coherence: 0.15,
  softSkills: 0.10,
};

const CRITERION_LABELS: Record<CriterionId, string> = {
  structure: 'Structure',
  impact: 'Impact',
  brievete: 'Brièveté',
  coherence: 'Cohérence',
  softSkills: 'Soft skills',
};

const SECTION_LABELS: Record<SectionId, string> = {
  personal: 'Informations personnelles',
  headline: 'Titre professionnel',
  summary: 'Résumé',
  experience: 'Expérience',
  education: 'Formation',
  skills: 'Compétences',
  extras: 'Autres',
};

const SECTION_ORDER: SectionId[] = [
  'personal', 'headline', 'summary', 'experience', 'education', 'skills', 'extras',
];

/**
 * Moyenne pondérée sur 100 des contrôles applicables.
 *
 * Renvoie 0 quand aucun contrôle ne s'applique — cas d'un CV encore vide : on
 * ne récompense pas l'absence de contenu.
 */
function weightedScore(checks: Check[], weightOf: (c: Check) => number): number {
  let sum = 0;
  let total = 0;
  for (const c of checks) {
    if (c.value === null) continue;
    const w = weightOf(c);
    sum += w * c.value;
    total += w;
  }
  return total === 0 ? 0 : Math.round((sum / total) * 100);
}

/** true si la section n'a rien à évaluer parce qu'elle est vide. */
function isSectionEmpty(resume: Resume, section: SectionId): boolean {
  switch (section) {
    case 'personal': {
      const p = resume.personal;
      return [p.fullName, p.location, p.phone, p.email].every((v) => v.trim() === '');
    }
    case 'headline': return resume.headline.trim() === '';
    case 'summary': return resume.summary.trim() === '';
    case 'experience': return resume.experiences.length === 0;
    case 'education': return resume.education.length === 0;
    case 'skills': return resume.skills.length === 0;
    case 'extras':
      return resume.languages.length === 0
        && resume.certifications.length === 0
        && resume.projects.length === 0;
  }
}

/**
 * Calcule le score d'un CV.
 *
 * Entièrement déterministe et synchrone : appelable à chaque frappe dans
 * l'éditeur, côté client comme côté serveur, sans réseau. Aucun appel IA.
 */
export function scoreResume(resume: Resume): ScoreResult {
  const checks = buildChecks(resume);

  const criteria: CriterionScore[] = (Object.keys(CRITERION_WEIGHTS) as CriterionId[]).map((id) => {
    const own = checks.filter((c) => c.criterion === id);
    const score = weightedScore(own, (c) => c.weight);
    return { id, label: CRITERION_LABELS[id], score, grade: grade(score) };
  });

  // Score global : moyenne des critères pondérée par CRITERION_WEIGHTS.
  const total = Math.round(
    criteria.reduce((acc, c) => acc + c.score * CRITERION_WEIGHTS[c.id], 0),
  );

  // Score de section : même logique, mais le poids d'un contrôle est aussi
  // multiplié par le poids de son critère — sinon un contrôle de soft skill
  // pèserait autant qu'un contrôle de structure dans la note d'une section.
  const sections: SectionScore[] = SECTION_ORDER.map((id) => {
    const own = checks.filter((c) => c.section === id);
    const score = weightedScore(own, (c) => c.weight * CRITERION_WEIGHTS[c.criterion]);
    return {
      id,
      label: SECTION_LABELS[id],
      score,
      grade: grade(score),
      empty: isSectionEmpty(resume, id),
    };
  });

  const recommendations = buildRecommendations(checks);

  return { total, grade: grade(total), criteria, sections, recommendations };
}

/**
 * Recommandations issues des contrôles non satisfaits, les plus rentables
 * d'abord. `points` est le gain sur le score global si le contrôle passe à 1.
 */
function buildRecommendations(checks: Check[]): Recommendation[] {
  // Le gain d'une reco se mesure par rapport aux seuls contrôles applicables :
  // sinon, sur un CV sans expérience, les règles de rédaction gonfleraient le
  // dénominateur et écraseraient le gain affiché des règles qui, elles, comptent.
  const applicable = checks.filter((c): c is Check & { value: number } => c.value !== null);

  const criterionWeightSum = new Map<CriterionId, number>();
  for (const c of applicable) {
    criterionWeightSum.set(c.criterion, (criterionWeightSum.get(c.criterion) ?? 0) + c.weight);
  }

  return applicable
    .filter((c) => c.value < 1)
    .map((c) => {
      const share = c.weight / (criterionWeightSum.get(c.criterion) ?? c.weight);
      const points = Math.round(CRITERION_WEIGHTS[c.criterion] * share * (1 - c.value) * 100);
      return { id: c.id, section: c.section, label: c.label, points };
    })
    // Un gain arrondi à 0 n'est pas actionnable : on ne l'affiche pas.
    .filter((r) => r.points > 0)
    .sort((a, b) => b.points - a.points);
}

export { CRITERION_WEIGHTS, CRITERION_LABELS, SECTION_LABELS, SECTION_ORDER };
export type { Check };
export * from './types.ts';
