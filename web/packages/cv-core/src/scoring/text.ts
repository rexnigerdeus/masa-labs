/** Utilitaires texte partagés par le moteur de scoring. */

/**
 * Minuscule, sans accent, ponctuation ramenée à des espaces, espaces compressés.
 * Permet de comparer « Développé » et « developpe », et « esprit d'équipe » et
 * « esprit d equipe » — c'est pour ça que les lexiques sont écrits sans accent.
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Découpe en mots normalisés. */
export function words(input: string): string[] {
  const n = normalize(input);
  return n.length === 0 ? [] : n.split(' ');
}

/** true si la chaîne contient un nombre : chiffre isolé, pourcentage, montant. */
export function hasNumber(input: string): boolean {
  return /\d/.test(input);
}

/** true si l'un des termes du lexique apparaît dans le texte normalisé. */
export function containsAny(input: string, lexicon: readonly string[]): boolean {
  const n = normalize(input);
  return lexicon.some((term) => n.includes(term));
}

/** true si le texte normalisé commence par l'un des termes du lexique. */
export function startsWithAny(input: string, lexicon: readonly string[]): boolean {
  const n = normalize(input);
  return lexicon.some((term) => n === term || n.startsWith(term + ' '));
}

/** Termes du lexique effectivement présents, dédupliqués. */
export function matches(input: string, lexicon: readonly string[]): string[] {
  const n = normalize(input);
  return [...new Set(lexicon.filter((term) => n.includes(term)))];
}

/** Nombre de mots réels (utilisé pour les seuils de longueur). */
export function wordCount(input: string): number {
  return words(input).length;
}

export function isBlank(input: string | null | undefined): boolean {
  return input == null || input.trim().length === 0;
}
