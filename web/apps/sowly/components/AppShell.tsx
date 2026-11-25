'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MotionConfig } from 'motion/react';
import { startSync } from '../lib/sync';
import { applyTheme, readThemeChoice, syncThemeColor } from '../lib/theme';
import { AppBadge, ListIcon, PlusIcon, SettingsIcon, SproutIcon } from './icons';
import { AlarmHost } from './alarm/AlarmHost';
import { QuickAdd, type QuickAddHandle } from './tasks/QuickAdd';
import { ThemeToggle } from './ThemeToggle';

const TABS = [
  { href: '/', label: 'Aujourd’hui', Icon: SproutIcon },
  { href: '/taches', label: 'Tâches', Icon: ListIcon },
  // « Personnaliser » : le terme commun aux apps de la maison (brief design).
  { href: '/reglages', label: 'Personnaliser', Icon: SettingsIcon },
] as const;

/** Écrans plein cadre, sans navigation ni bouton d'ajout. */
const BARE = ['/bienvenue', '/premiers-pas', '/connexion'];

/** Largeur du contenu : bento large pour les tableaux de bord, colonne ailleurs. */
function widthFor(pathname: string): string {
  if (pathname === '/') return 'max-w-6xl';
  if (pathname === '/reglages') return 'max-w-5xl';
  return 'max-w-2xl';
}

/**
 * Coque de l'application, celle du hub : barre latérale collante de 232 px
 * sur ordinateur, barre flottante en bas (fond encre, rayon 20 px) sous
 * 860 px. Ajout rapide « accessible partout » (brief §8.B.3) et mise en
 * route de la synchronisation, une seule fois pour toutes les pages.
 *
 * `MotionConfig reducedMotion="user"` : toutes les animations Motion
 * respectent le réglage « réduire les animations » du système, sans que
 * chaque composant ait à y penser.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const quickAdd = useRef<QuickAddHandle>(null);
  const bare = BARE.includes(pathname);

  useEffect(() => {
    startSync();
    syncThemeColor();
    // Mode « système » : suivre le système s'il change pendant la session.
    const media = matchMedia('(prefers-color-scheme: dark)');
    const onChange = (): void => { if (readThemeChoice() === 'system') applyTheme('system'); };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const openQuickAdd = (): void => {
    const params = new URLSearchParams(window.location.search);
    quickAdd.current?.open({
      // Sur une liste, on ajoute dans cette liste ; sur Aujourd'hui, dans
      // « Ma journée » — là où l'on regarde quand on appuie sur +.
      listId: pathname === '/taches' ? params.get('liste') : null,
      myDay: pathname === '/' || (pathname === '/taches' && params.get('vue') === 'ma-journee'),
    });
  };

  if (bare) {
    return (
      <MotionConfig reducedMotion="user">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[99] focus:rounded-[10px] focus:bg-card focus:px-3 focus:py-2">
          Aller au contenu
        </a>
        <main id="contenu" className={`mx-auto w-full px-4 ${pathname === '/bienvenue' ? 'max-w-6xl sm:px-6' : 'max-w-xl'}`}>
          {children}
        </main>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[99] focus:rounded-[10px] focus:bg-card focus:px-3 focus:py-2">
        Aller au contenu
      </a>
      <div className="app">
        <nav aria-label="Navigation principale" className="rail">
          <Link href="/" className="rail__logo">
            <AppBadge className="h-[34px] w-[34px]" />
            <span className="rail__nom">
              <b>Sowly</b>
              <i>graines d’habitudes</i>
            </span>
          </Link>
          {TABS.map(({ href, label, Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined} className="lien">
                <Icon />
                {label}
              </Link>
            );
          })}
          <div className="rail__bas">
            <button type="button" onClick={openQuickAdd} className="btn btn--plein w-full">
              <PlusIcon className="h-4 w-4" /> Ajouter une tâche
            </button>
            <div className="flex items-center justify-between gap-2 px-2">
              <span className="text-[13px] text-muted">Clair ou sombre</span>
              <ThemeToggle />
            </div>
          </div>
        </nav>

        <main id="contenu" tabIndex={-1} className="vue">
          {/* La clé rejoue l'entrée (le contenu monte de 8 px) à chaque page. */}
          <div key={pathname} className={`mx-auto w-full ${widthFor(pathname)}`}>{children}</div>
        </main>
      </div>

      <button type="button" onClick={openQuickAdd} aria-label="Ajouter une tâche" className="fab">
        <PlusIcon className="h-7 w-7" />
      </button>

      <QuickAdd ref={quickAdd} />
      <AlarmHost />
    </MotionConfig>
  );
}
