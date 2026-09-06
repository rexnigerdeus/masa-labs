/**
 * Catalogue figé : catégories de matériel et communes d'Abidjan.
 *
 * Ces identifiants sont verrouillés côté base — `hive_categories` est
 * alimentée par la migration et référencée par une clé étrangère, la commune
 * par une colonne non nulle. Les changer ici sans changer la base casserait
 * la publication d'annonce : les deux listes doivent rester en miroir de
 * `supabase/migrations/20260906120000_hive_lot1.sql`.
 */

export type Category = { id: string; label: string; children: { id: string; label: string }[] };

export const CATEGORIES: Category[] = [
  {
    id: 'audiovisuel',
    label: 'Audiovisuel',
    children: [
      { id: 'camera', label: 'Caméras' },
      { id: 'objectif', label: 'Objectifs' },
      { id: 'stabilisation', label: 'Trépieds & stabilisation' },
      { id: 'drone', label: 'Drones' },
    ],
  },
  {
    id: 'son',
    label: 'Sonorisation',
    children: [
      { id: 'enceinte', label: 'Enceintes & caissons' },
      { id: 'console', label: 'Consoles de mixage' },
      { id: 'micro', label: 'Microphones' },
      { id: 'enregistrement', label: 'Enregistrement' },
    ],
  },
  {
    id: 'eclairage',
    label: 'Éclairage',
    children: [
      { id: 'projecteur', label: 'Projecteurs & mandarines' },
      { id: 'effet-lumiere', label: 'Jeux de lumière' },
      { id: 'structure', label: 'Structures & pieds' },
    ],
  },
  {
    id: 'instrument',
    label: 'Instruments & DJ',
    children: [
      { id: 'clavier', label: 'Claviers & synthés' },
      { id: 'guitare', label: 'Guitares & basses' },
      { id: 'percussion', label: 'Percussions & batteries' },
      { id: 'dj', label: 'Matériel DJ' },
    ],
  },
];

/** Toutes les catégories à plat, parents compris — pour les filtres et les libellés. */
export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.flatMap((parent) => [
    [parent.id, parent.label] as const,
    ...parent.children.map((child) => [child.id, child.label] as const),
  ]),
);

/**
 * Filtrer par « Sonorisation » doit remonter les enceintes comme les micros :
 * personne ne cherche une catégorie feuille en premier.
 */
export function categoryWithDescendants(id: string): string[] {
  const parent = CATEGORIES.find((c) => c.id === id);
  return parent === undefined ? [id] : [parent.id, ...parent.children.map((c) => c.id)];
}

/**
 * Communes du Grand Abidjan.
 *
 * L'ordre est celui de l'activité événementielle citée au brief §6 : Cocody,
 * Marcory et Yopougon d'abord, le reste ensuite par ordre alphabétique.
 */
export const COMMUNES: string[] = [
  'Cocody',
  'Marcory',
  'Yopougon',
  'Abobo',
  'Adjamé',
  'Anyama',
  'Attécoubé',
  'Bingerville',
  'Grand-Bassam',
  'Koumassi',
  'Plateau',
  'Port-Bouët',
  'Songon',
  'Treichville',
  'Autre',
];

export const CONDITIONS = [
  { id: 'neuf', label: 'Neuf' },
  { id: 'occasion', label: 'Occasion' },
] as const;
