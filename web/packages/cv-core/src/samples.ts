import type { Resume } from './types.ts';

/**
 * CV de référence : complet, bien rédigé, ancré sur le marché ivoirien.
 *
 * Sert de trois façons : fixture de test du scoring, jeu de données du harnais
 * `ats:check` (c'est ce CV qui est rendu puis réextrait pour chaque template),
 * et contenu de l'aperçu de démonstration dans l'écran de choix de template.
 */
export const SAMPLE_RESUME: Resume = {
  schemaVersion: 1,
  templateId: 'classique',
  personal: {
    fullName: 'Aya Koffi',
    location: 'Abidjan, Côte d’Ivoire',
    phone: '+225 07 00 00 00 00',
    email: 'aya.koffi@example.ci',
    links: ['linkedin.com/in/ayakoffi'],
  },
  headline: 'Comptable junior spécialisée en comptabilité fournisseurs',
  summary:
    'Comptable junior avec trois ans de pratique en cabinet et en entreprise, '
    + 'habituée aux clôtures mensuelles et au rapprochement bancaire. Reconnue '
    + 'pour ma rigueur et mon autonomie sur les dossiers sensibles, je cherche '
    + 'un poste de comptable au sein d’une PME en croissance à Abidjan.',
  experiences: [
    {
      id: 'e1',
      role: 'Assistante comptable',
      company: 'Cabinet Diarra',
      location: 'Abidjan',
      start: { year: 2023, month: 4 },
      end: null,
      current: true,
      bullets: [
        'Traité 350 factures fournisseurs par mois en réduisant les retards de paiement de 40 %',
        'Automatisé le rapprochement bancaire sous Excel, économisant 6 heures de saisie chaque semaine',
        'Accompagné 12 clients du cabinet dans la préparation de leurs déclarations fiscales annuelles',
      ],
    },
    {
      id: 'e2',
      role: 'Stagiaire comptabilité',
      company: 'SOTRA',
      location: 'Abidjan',
      start: { year: 2022, month: 6 },
      end: { year: 2022, month: 9 },
      current: false,
      bullets: [
        'Contrôlé 1 200 pièces comptables et corrigé 85 anomalies avant la clôture semestrielle',
        'Rédigé une procédure de classement adoptée par les trois agents du service',
      ],
    },
  ],
  education: [
    {
      id: 'f1',
      degree: 'Licence en comptabilité et gestion',
      school: 'Université Félix Houphouët-Boigny',
      location: 'Abidjan',
      start: { year: 2019 },
      end: { year: 2022 },
      details: ['Mention bien'],
    },
  ],
  skills: [
    'Sage 100', 'Excel avancé', 'SYSCOHADA', 'Rapprochement bancaire',
    'Déclarations fiscales', 'Rigueur', 'Travail en équipe', 'Autonomie',
  ],
  languages: [
    { id: 'l1', name: 'Français', level: 'natif' },
    { id: 'l2', name: 'Anglais', level: 'intermediaire' },
  ],
  certifications: [
    { id: 'c1', name: 'Certificat Sage 100 Comptabilité', issuer: 'Sage', date: { year: 2023 } },
  ],
  projects: [],
};
