import type { SectionId } from '../types.ts';

/** Palier affiché en badge (brief §5.1) : vert / vert / pêche. */
export type Grade = 'excellent' | 'bon' | 'moyen';

/**
 * Critères transverses.
 *
 * `structure` n'est pas dans la liste du brief mais porte les règles ATS
 * héritées de l'app Flutter (sections présentes, contact complet, dates
 * lisibles). C'est le critère qui pèse le plus lourd : un CV brillamment
 * rédigé mais sans email n'est pas exploitable par un ATS.
 *
 * `coherence` remplace le « Style » du brief : sans service d'orthographe, on
 * ne vérifie que ce qui est vérifiable de façon déterministe.
 */
export type CriterionId = 'structure' | 'impact' | 'brievete' | 'coherence' | 'softSkills';

export interface Recommendation {
  /** Identifiant stable — sert de clé de rendu et de suivi KPI. */
  id: string;
  section: SectionId;
  /** Consigne actionnable, à afficher telle quelle. */
  label: string;
  /** Points gagnés sur le score global si la reco est appliquée (approximatif). */
  points: number;
}

export interface CriterionScore {
  id: CriterionId;
  label: string;
  /** 0-100. */
  score: number;
  grade: Grade;
}

export interface SectionScore {
  id: SectionId;
  label: string;
  /** 0-100. */
  score: number;
  grade: Grade;
  /** true si la section n'a simplement pas encore été remplie. */
  empty: boolean;
}

export interface ScoreResult {
  /** Score global 0-100. */
  total: number;
  grade: Grade;
  criteria: CriterionScore[];
  sections: SectionScore[];
  /** Triées par points décroissants : les plus rentables en premier. */
  recommendations: Recommendation[];
}

export function grade(score: number): Grade {
  if (score >= 80) return 'excellent';
  if (score >= 55) return 'bon';
  return 'moyen';
}
