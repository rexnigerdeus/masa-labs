import { emptyResume, type Resume } from '../src/types.ts';
import { SAMPLE_RESUME } from '../src/samples.ts';

/** CV vierge, tel qu'à l'ouverture de l'éditeur. */
export const EMPTY: Resume = emptyResume();

/**
 * CV « à mi-parcours » : les informations sont là, la rédaction ne l'est pas.
 * Puces descriptives, sans verbe d'action ni chiffre, formats de dates mêlés.
 * C'est le cas que le panneau de recommandations doit savoir redresser.
 */
export const PARTIAL: Resume = {
  schemaVersion: 1,
  templateId: 'classique',
  personal: {
    fullName: 'Aya Koffi',
    location: 'Abidjan, Côte d’Ivoire',
    phone: '+225 07 00 00 00 00',
    email: 'aya.koffi@example.ci',
    links: [],
  },
  headline: 'Comptable',
  summary: 'Je cherche un poste de comptable.',
  experiences: [
    {
      id: 'e1',
      role: 'ASSISTANTE COMPTABLE',
      company: 'Cabinet Diarra',
      location: 'Abidjan',
      start: { year: 2023, month: 4 },
      end: null,
      current: true,
      bullets: [
        'Responsable de la saisie des factures',
        'participation aux clôtures mensuelles.',
      ],
    },
    {
      id: 'e2',
      role: 'Stagiaire',
      company: 'SOTRA',
      location: 'Abidjan',
      // Année seule alors que l'expérience précédente porte un mois : c'est
      // exactement l'incohérence de format que le critère « Cohérence » attrape.
      start: { year: 2022 },
      end: { year: 2022 },
      current: false,
      bullets: ['Aide au classement'],
    },
  ],
  education: [
    {
      id: 'f1',
      degree: 'Licence en comptabilité',
      school: 'Université Félix Houphouët-Boigny',
      location: 'Abidjan',
      start: null,
      end: { year: 2022 },
      details: [],
    },
  ],
  skills: ['Excel', 'excel', 'Sage'],
  languages: [],
  certifications: [],
  projects: [],
};

/** CV complet : l'échantillon de référence partagé (voir src/samples.ts). */
export const COMPLETE: Resume = SAMPLE_RESUME;
