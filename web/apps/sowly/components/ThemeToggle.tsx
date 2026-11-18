'use client';

import { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  applyTheme, DEFAULT_APPEARANCE, readAppearance, readThemeChoice, resolvedTheme, THEME_EVENT,
  type Appearance, type ResolvedTheme, type ThemeChoice,
} from '../lib/theme';
import { MoonIcon, SunIcon } from './icons';

/**
 * Abonnement à l'apparence : l'événement de `applyTheme` / `setAppearance`
 * (choix fait dans l'app) et un observateur sur les attributs de <html>
 * (mode « système » qui bascule pendant la session, posé par l'AppShell).
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode', 'data-theme', 'data-densite', 'data-titres'] });
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    observer.disconnect();
  };
}

/** Thème affiché ; `null` côté serveur, qui ne le connaît pas. */
export function useResolvedTheme(): ResolvedTheme | null {
  return useSyncExternalStore(subscribe, resolvedTheme, () => null);
}

/** Choix enregistré (Système / Clair / Sombre), pour Personnaliser. */
export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, readThemeChoice, () => 'system' as const);
}

/** Palette, densité et police des titres, pour Personnaliser. */
export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribe, readAppearance, () => DEFAULT_APPEARANCE);
}

/**
 * Bascule le thème, avec un cercle qui s'ouvre depuis le bouton là où le
 * navigateur sait faire une View Transition (Chrome, Edge, Safari 18) ;
 * ailleurs, ou avec « réduire les animations », le changement est immédiat.
 */
export function switchTheme(next: ResolvedTheme, origin?: HTMLElement | null): void {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (origin == null || reduce || typeof document.startViewTransition !== 'function') {
    applyTheme(next);
    return;
  }
  const rect = origin.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const transition = document.startViewTransition(() => applyTheme(next));
  void transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 520, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {});
}

/**
 * Bouton clair / sombre, présent sur la page d'entrée, la connexion, en
 * tête de chaque onglet et dans la barre latérale. Il force le mode opposé
 * à celui affiché ; revenir à « Système » se fait dans Personnaliser.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useResolvedTheme();
  const dark = theme === 'dark';
  const label = dark ? 'Passer en mode clair' : 'Passer en mode sombre';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => switchTheme(dark ? 'light' : 'dark', e.currentTarget)}
      className={`btn relative h-10 w-10 shrink-0 overflow-hidden !p-0 ${className}`}
    >
      {/* Rien avant l'hydratation : le serveur ne sait pas quel pictogramme montrer. */}
      <AnimatePresence initial={false} mode="popLayout">
        {theme === null ? null : (
          <motion.span
            key={theme}
            initial={{ y: 18, rotate: -90, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            exit={{ y: -18, rotate: 90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="grid place-items-center"
          >
            {dark ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
