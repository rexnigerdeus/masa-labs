import { SAMPLE_RESUME, type Resume } from '@everyday/cv-core';

/**
 * CV long, calqué sur un cas réel qui débordait de deux lignes sur une
 * seconde page : trois expériences, deux formations, une douzaine de
 * compétences, langues et certification. Il sert à vérifier que l'export le
 * ramène sur une page, et que les colonnes latérales tiennent une liste de
 * compétences réaliste.
 */
export const LONG_RESUME: Resume = {
  ...SAMPLE_RESUME,
  personal: {
    ...SAMPLE_RESUME.personal,
    fullName: 'Koffi Yao Dembélé',
    location: 'Bouaké',
    phone: '+225 05 11 22 33 44',
    email: 'koffi.dembele@example.ci',
    links: [],
  },
  headline: 'Motion designer',
  summary:
    'Créatif, curieux et passionné, j’aime imaginer des solutions visuelles pratiques. '
    + 'J’évolue depuis trois ans dans le motion design et le projection mapping. '
    + 'Je recherche une agence créative avec des défis et des projets ambitieux pour '
    + 'continuer à progresser dans mon métier.',
  experiences: [
    {
      id: 'x1', role: 'Motion designer', company: 'Studio Lagune', location: '',
      start: { year: 2023, month: 11 }, end: null, current: true,
      bullets: ['Animation de personnages', 'Motion d’objets irréels', 'Création de paysages imaginaires'],
    },
    {
      id: 'x2', role: 'Concepteur 2D/3D', company: 'Baobab Films', location: '',
      start: { year: 2021, month: 10 }, end: { year: 2023, month: 3 }, current: false,
      bullets: ['Modélisation d’objets réels ou imaginaires, personnages, paysages 2D et 3D'],
    },
    {
      id: 'x3', role: 'Illustrateur', company: 'Atelier Kanga', location: '',
      start: { year: 2019, month: 9 }, end: { year: 2021, month: 7 }, current: false,
      bullets: ['Illustration de bibliothèques d’icônes', 'Planches de bandes dessinées', 'Création de logos'],
    },
  ],
  education: [
    {
      id: 'y1', degree: 'Master en création 2D/3D', school: 'École des beaux-arts d’Abidjan',
      location: '', start: { year: 2017 }, end: { year: 2019 }, details: [],
    },
    {
      id: 'y2', degree: 'Licence en arts plastiques', school: 'École des beaux-arts d’Abidjan',
      location: '', start: { year: 2014 }, end: { year: 2017 }, details: [],
    },
  ],
  skills: [
    'Illustrator', 'After Effects', 'Blender', 'Maya', 'Cinema 4D', 'Photoshop',
    'Vidéographie', 'Création visuelle IA', 'Créatif', 'Patient', 'Rigoureux', 'Sens du détail',
  ],
  languages: [
    { id: 'z1', name: 'Français', level: 'natif' },
    { id: 'z2', name: 'Anglais', level: 'courant' },
  ],
  certifications: [
    { id: 'w1', name: 'Certification Maya et Cinema 4D', issuer: '', date: null },
  ],
  projects: [],
};
