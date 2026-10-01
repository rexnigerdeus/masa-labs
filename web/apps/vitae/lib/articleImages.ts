/**
 * Illustrations des articles « Conseils ».
 *
 * Des photographies, pas des dessins : comme la vitrine et l'accueil, on
 * montre les personnes à qui le produit s'adresse — en entretien, au bureau,
 * au marché. Toutes viennent de Pexels (licence libre, usage commercial
 * autorisé, attribution non obligatoire mais faite quand même).
 *
 * Servies depuis `public/conseils/`, recadrées en 16:9 et encodées en WebP en
 * deux largeurs : 640 px (vignettes, téléphones) et 1200 px (en-tête
 * d'article sur grand écran). Entre 8 et 45 Ko la vignette — la contrainte
 * « réseau lent » exclut l'image pleine résolution comme le service
 * d'optimisation à la volée, qui ajoute un aller-retour serveur.
 *
 * Pour les aperçus de partage, une version JPEG 1200 × 630 (`-og.jpg`) :
 * WhatsApp et Facebook lisent mal le WebP.
 *
 * Un article sans image dédiée prend celle de sa catégorie : la liste ne doit
 * jamais montrer de trou le jour où un nouvel article est publié.
 */

export interface ArticleImage {
  /** Chemin de base, sans suffixe de largeur ni extension. */
  base: string;
  alt: string;
  credit: string;
  source: string;
}

const IMAGES: Record<string, ArticleImage> = {
  'res-search-01': {
    base: '/conseils/res-search-01',
    alt: 'Jeune femme concentrée devant son ordinateur portable, dans un bureau décoré de post-it.',
    credit: 'Vitaly Gariev',
    source: 'https://www.pexels.com/photo/39219918/',
  },
  'res-search-02': {
    base: '/conseils/res-search-02',
    alt: 'Candidat souriant face à son recruteur lors d’un entretien, dans un bureau à Lagos.',
    credit: 'Ninthgrid',
    source: 'https://www.pexels.com/photo/30688591/',
  },
  'res-network-01': {
    base: '/conseils/res-network-01',
    alt: 'Trois jeunes professionnels souriants, badge au cou, lors d’un événement d’entreprise.',
    credit: 'Pavel Danilyuk',
    source: 'https://www.pexels.com/photo/8761679/',
  },
  'res-relations-02': {
    base: '/conseils/res-relations-02',
    alt: 'Femme rédigeant un message sur son ordinateur portable à son bureau.',
    credit: 'Sora Shimazaki',
    source: 'https://www.pexels.com/photo/5668861/',
  },
  'res-market-01': {
    base: '/conseils/res-market-01',
    alt: 'Équipe d’ingénieurs en casques et gilets étudiant un plan ensemble.',
    credit: 'Harrun Muhammad',
    source: 'https://www.pexels.com/photo/37198883/',
  },
  'res-law-01': {
    base: '/conseils/res-law-01',
    alt: 'Juriste prenant des notes à son bureau, à côté d’une statuette de la Justice.',
    credit: 'Katrin Bolovtsova',
    source: 'https://www.pexels.com/photo/6077381/',
  },
  'res-relations-01': {
    base: '/conseils/res-relations-01',
    alt: 'Deux collègues se serrant la main lors d’une réunion d’accueil.',
    credit: 'Monstera Production',
    source: 'https://www.pexels.com/photo/9489083/',
  },
  'res-market-02': {
    base: '/conseils/res-market-02',
    alt: 'Vendeuse souriante derrière son étal de piments et de tomates au marché.',
    credit: 'Seun Adeniyi',
    source: 'https://www.pexels.com/photo/17691084/',
  },
  'res-law-02': {
    base: '/conseils/res-law-02',
    alt: 'Signature d’un contrat de travail, un stylo à la main, un conseiller désignant la ligne.',
    credit: 'RDNE Stock project',
    source: 'https://www.pexels.com/photo/7841499/',
  },
  'res-law-03': {
    base: '/conseils/res-law-03',
    alt: 'Portrait d’un homme âgé souriant au soleil.',
    credit: 'Mehmet Turgut Kirkgoz',
    source: 'https://www.pexels.com/photo/19355372/',
  },
};

/** Image de repli par catégorie, prise parmi celles ci-dessus. */
const BY_CATEGORY: Record<string, string> = {
  rechercheEmploi: 'res-search-01',
  reseauage: 'res-network-01',
  relationsPro: 'res-relations-01',
  marcheTravail: 'res-market-01',
  droitTravail: 'res-law-01',
};

export function articleImage(id: string, category: string): ArticleImage {
  return IMAGES[id]
    ?? IMAGES[BY_CATEGORY[category] ?? '']
    ?? (IMAGES['res-search-01'] as ArticleImage);
}

/** Attributs `src` / `srcSet` prêts à poser sur un `<img>`. */
export function imageSources(image: ArticleImage): { src: string; srcSet: string } {
  return {
    src: `${image.base}-640.webp`,
    srcSet: `${image.base}-640.webp 640w, ${image.base}-1200.webp 1200w`,
  };
}
