/**
 * Apparence : mode clair / sombre / système, palette, densité, police des
 * titres — les réglages du hub (brief design, « Tout se personnalise sans
 * casser »), posés en attributs sur <html>.
 *
 * Module sans `'use client'` : le layout (composant serveur) en importe le
 * script anti-flash, et une constante importée d'un module client
 * n'arriverait côté serveur que sous forme de référence opaque.
 *
 * Chaque choix vit dans sa propre clé `localStorage`, hors de l'état
 * principal : le script du layout doit les lire avant que React existe.
 * `sowly.theme` garde son nom et ses valeurs (`light` / `dark`) : les
 * choix déjà faits avant la refonte restent valables.
 */

export const THEME_KEY = 'sowly.theme';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const PALETTES = ['wax', 'sorbet', 'lagune', 'neon'] as const;
export type Palette = (typeof PALETTES)[number];

export interface Appearance {
  palette: Palette;
  densite: 'aeree' | 'compacte';
  titres: 'bricolage' | 'serif';
}

const KEYS = { palette: 'sowly.palette', densite: 'sowly.densite', titres: 'sowly.titres' } as const;
const DEFAULTS: Appearance = { palette: 'wax', densite: 'aeree', titres: 'bricolage' };

/** Prévient le bouton rapide et Personnaliser qu'un choix a été fait ailleurs. */
export const THEME_EVENT = 'sowly:theme';

/**
 * Script anti-flash, en ES5 et dans un `try` : il s'exécute avant tout le
 * reste, rien ne doit pouvoir le faire échouer.
 */
export const APPEARANCE_SCRIPT = `try{var d=document.documentElement,s=localStorage,t=s.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}d.dataset.mode=t==='dark'?'sombre':'clair';var p=s.getItem('${KEYS.palette}');d.dataset.theme=/^(wax|sorbet|lagune|neon)$/.test(p)?p:'wax';d.dataset.densite=s.getItem('${KEYS.densite}')==='compacte'?'compacte':'aeree';d.dataset.titres=s.getItem('${KEYS.titres}')==='serif'?'serif':'bricolage'}catch(e){document.documentElement.dataset.mode='clair'}`;

export function readThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(choice: ThemeChoice): void {
  try {
    if (choice === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Stockage refusé : le mode s'applique quand même pour la session.
  }
  const dark = choice === 'dark'
    || (choice === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.mode = dark ? 'sombre' : 'clair';
  syncThemeColor();
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function resolvedTheme(): ResolvedTheme {
  return document.documentElement.dataset.mode === 'sombre' ? 'dark' : 'light';
}

// Instantané stable pour `useSyncExternalStore` : un nouvel objet à chaque
// lecture ferait boucler le rendu.
let snapshot: Appearance = DEFAULTS;

export function readAppearance(): Appearance {
  const ds = document.documentElement.dataset;
  const palette = (PALETTES as readonly string[]).includes(ds.theme ?? '') ? ds.theme as Palette : 'wax';
  const densite = ds.densite === 'compacte' ? 'compacte' : 'aeree';
  const titres = ds.titres === 'serif' ? 'serif' : 'bricolage';
  if (snapshot.palette !== palette || snapshot.densite !== densite || snapshot.titres !== titres) {
    snapshot = { palette, densite, titres };
  }
  return snapshot;
}

export const DEFAULT_APPEARANCE = DEFAULTS;

export function setAppearance(patch: Partial<Appearance>): void {
  const ds = document.documentElement.dataset;
  for (const [key, value] of Object.entries(patch) as Array<[keyof Appearance, string]>) {
    if (key === 'palette') ds.theme = value;
    else ds[key] = value;
    try {
      if (value === DEFAULTS[key]) localStorage.removeItem(KEYS[key]);
      else localStorage.setItem(KEYS[key], value);
    } catch {
      // Session seulement.
    }
  }
  syncThemeColor();
  window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * Barre d'état du téléphone : elle prend la couleur du fond réellement
 * affiché (mode et palette), lue dans les tokens plutôt que recopiée ici.
 */
export function syncThemeColor(): void {
  const color = getComputedStyle(document.documentElement).getPropertyValue('--fond').trim()
    || (resolvedTheme() === 'dark' ? '#0E0C18' : '#ECEAF4');
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = color;
  });
}
