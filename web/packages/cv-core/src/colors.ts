/**
 * Couleur primaire d'un CV.
 *
 * L'utilisateur choisit une couleur, le reste en découle : teinte de fond,
 * couleur de texte lisible sur un aplat, version assombrie d'un filet. Ces
 * dérivations vivent ici parce que les deux renderers — l'aperçu HTML et le
 * document PDF — doivent produire exactement les mêmes teintes à partir de la
 * même primaire. Une formule dupliquée d'un côté serait un aperçu qui ment.
 *
 * Tout est calculé en sRGB, sans dépendance : le package n'en a aucune, et
 * `@react-pdf/renderer` ne comprend que les couleurs opaques simples — d'où
 * des mélanges rendus en hexadécimal plein plutôt qu'en `rgba()`.
 */

/** Couleur primaire d'un CV tant que l'utilisateur n'en a pas choisi une. */
export const DEFAULT_ACCENT = '#1f3d5c';

/**
 * Couleurs proposées d'un clic dans l'éditeur.
 *
 * Toutes sont assez sombres pour porter du texte blanc et rester lisibles une
 * fois imprimées en noir et blanc — c'est encore la sortie la plus courante
 * d'une candidature déposée en main propre.
 */
export const ACCENT_PRESETS: { value: string; label: string }[] = [
  { value: '#1f3d5c', label: 'Bleu nuit' },
  { value: '#0f6b5c', label: 'Vert sapin' },
  { value: '#6fae2e', label: 'Vert Vitae' },
  { value: '#1f2937', label: 'Anthracite' },
  { value: '#8a4b12', label: 'Ocre' },
  { value: '#9c2b2b', label: 'Grenat' },
  { value: '#5b3a8e', label: 'Violet' },
  { value: '#0e6a86', label: 'Bleu lagune' },
];

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

/** Couleur utilisable, quoi qu'on lui passe : un CV n'a jamais de couleur invalide. */
export function normalizeAccent(value: unknown, fallback: string = DEFAULT_ACCENT): string {
  if (isHexColor(value)) return value.toLowerCase();
  return isHexColor(fallback) ? fallback.toLowerCase() : DEFAULT_ACCENT;
}

function channels(hex: string): [number, number, number] {
  const h = normalizeAccent(hex);
  return [
    Number.parseInt(h.slice(1, 3), 16),
    Number.parseInt(h.slice(3, 5), 16),
    Number.parseInt(h.slice(5, 7), 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((c) => Math.max(0, Math.min(255, Math.round(c)))
    .toString(16).padStart(2, '0')).join('')}`;
}

/** Mélange deux couleurs. `ratio` = part de `b` dans le résultat. */
export function mixColors(a: string, b: string, ratio: number): string {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  const r = Math.max(0, Math.min(1, ratio));
  return toHex([ar + (br - ar) * r, ag + (bg - ag) * r, ab + (bb - ab) * r]);
}

/** Version claire de la primaire, pour un aplat de fond. `amount` = intensité. */
export function tint(accent: string, amount: number): string {
  return mixColors('#ffffff', accent, amount);
}

/** Version assombrie de la primaire, pour un texte posé sur sa propre teinte. */
export function shade(accent: string, amount: number): string {
  return mixColors(accent, '#000000', amount);
}

/** Luminance relative WCAG. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste WCAG entre deux couleurs, de 1 (identiques) à 21 (noir sur blanc). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const WHITE = '#ffffff';
const INK = '#111111';

/**
 * Texte lisible sur un aplat de cette couleur.
 *
 * L'utilisateur choisit librement sa primaire, jaune vif compris : sans ce
 * calcul, le nom en blanc sur le bandeau du modèle Compact deviendrait
 * illisible — à l'écran comme à l'impression. On prend celui des deux encres
 * qui contraste le plus, et non le blanc par défaut.
 */
export function onAccent(accent: string): string {
  return contrastRatio(accent, WHITE) >= contrastRatio(accent, INK) ? WHITE : INK;
}

/**
 * Aplat de couleur et texte qui va dessus, lisibles ensemble.
 *
 * Il existe une bande de couleurs — les verts et bleus moyens, dont la primaire
 * proposée par le modèle « Stage » — où ni le blanc ni l'encre n'atteignent
 * 4,5:1. Choisir « le moins mauvais des deux » y donnerait une ligne de
 * coordonnées difficile à lire, et c'est la ligne dont dépend le rappel du
 * candidat. On assombrit donc l'aplat, par pas, jusqu'à ce qu'il porte
 * franchement son texte : la couleur reste celle de l'utilisateur, à une nuance
 * près qu'il ne remarquera pas, et le contraste est tenu.
 */
export function accentSurface(accent: string): { background: string; text: string } {
  let background = normalizeAccent(accent);
  for (let i = 0; i < 6; i += 1) {
    const text = onAccent(background);
    if (contrastRatio(background, text) >= 4.5) return { background, text };
    background = shade(background, 0.14);
  }
  return { background, text: WHITE };
}

/**
 * Primaire utilisable comme couleur de texte sur fond blanc.
 *
 * Même problème dans l'autre sens : un jaune ou un vert clair passe en titre
 * de section sur du blanc à 1,5:1. On l'assombrit jusqu'à un contraste
 * acceptable plutôt que de refuser le choix de l'utilisateur.
 */
export function inkAccent(accent: string): string {
  let color = normalizeAccent(accent);
  for (let i = 0; i < 8 && contrastRatio(color, WHITE) < 4.5; i += 1) {
    color = shade(color, 0.18);
  }
  return color;
}
