/**
 * Thème clair / sombre / système.
 *
 * Module sans `'use client'` : le layout (composant serveur) en importe la
 * clé pour son script anti-flash, et une constante importée d'un module
 * client n'arriverait côté serveur que sous forme de référence opaque.
 *
 * Le choix vit dans sa propre clé `localStorage`, hors de l'état principal :
 * le script du layout doit la lire en une ligne, avant que React existe.
 */

export const THEME_KEY = 'sowly.theme';

export type ThemeChoice = 'system' | 'light' | 'dark';

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
    // Stockage refusé : le thème s'applique quand même pour la session.
  }
  const dark = choice === 'dark'
    || (choice === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  syncThemeColor();
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Prévient le bouton rapide et les Réglages qu'un choix a été fait ailleurs. */
export const THEME_EVENT = 'sowly:theme';

export type ResolvedTheme = 'light' | 'dark';

export function resolvedTheme(): ResolvedTheme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/**
 * Barre d'état du téléphone : les balises `theme-color` du layout suivent le
 * système (media queries). Un thème forcé dans l'app doit l'emporter, sinon
 * une app sombre garde une barre d'état claire.
 */
export function syncThemeColor(): void {
  const color = resolvedTheme() === 'dark' ? '#13150f' : '#f7f8f5';
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = color;
  });
}
