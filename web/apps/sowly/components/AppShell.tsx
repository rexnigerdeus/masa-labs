'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MotionConfig } from 'motion/react';
import { startSync } from '../lib/sync';
import { applyTheme, readThemeChoice, syncThemeColor } from '../lib/theme';
import { ListIcon, PlusIcon, SettingsIcon, SproutIcon } from './icons';
import { QuickAdd, type QuickAddHandle } from './tasks/QuickAdd';

const TABS = [
  { href: '/', label: 'Aujourd’hui', Icon: SproutIcon },
  { href: '/taches', label: 'Tâches', Icon: ListIcon },
  { href: '/reglages', label: 'Réglages', Icon: SettingsIcon },
] as const;

/** Écrans plein cadre, sans onglets ni bouton d'ajout. */
const BARE = ['/bienvenue', '/premiers-pas', '/connexion'];

/**
 * Coque de l'application : barre d'onglets, bouton d'ajout rapide et mise en
 * route de la synchronisation. Une seule fois pour toutes les pages, pour
 * que l'ajout rapide soit « accessible partout » (brief §8.B.3).
 *
 * `MotionConfig reducedMotion="user"` : toutes les animations Motion
 * respectent le réglage « réduire les animations » du système, sans que
 * chaque composant ait à y penser.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const quickAdd = useRef<QuickAddHandle>(null);
  const bare = BARE.includes(pathname);
  // La page d'entrée est une grille bento : elle prend la largeur d'un écran
  // d'ordinateur, là où l'app reste une colonne de téléphone.
  const wide = pathname === '/bienvenue';

  useEffect(() => {
    startSync();
    syncThemeColor();
    // Thème « système » : suivre le système s'il change pendant la session.
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

  return (
    <MotionConfig reducedMotion="user">
      <main className={`mx-auto w-full px-4 ${wide ? 'max-w-6xl sm:px-6' : 'max-w-xl'} ${bare ? '' : 'pb-shell'}`}>{children}</main>

      {bare ? null : (
        <>
          <button
            type="button"
            onClick={openQuickAdd}
            aria-label="Ajouter une tâche"
            className="fixed z-30 grid h-14 w-14 place-items-center rounded-full bg-primary text-on-primary shadow-lg shadow-sprout-900/20 transition active:scale-95"
            style={{
              bottom: 'calc(env(safe-area-inset-bottom) + 5.25rem)',
              right: 'max(1rem, calc((100vw - 36rem) / 2 + 1rem))',
            }}
          >
            <PlusIcon className="h-7 w-7" />
          </button>

          <nav
            aria-label="Navigation principale"
            className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas/90 backdrop-blur-md"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <ul className="mx-auto flex max-w-xl">
              {TABS.map(({ href, label, Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                return (
                  <li key={href} className="flex-1">
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
                        active ? 'text-primary-ink' : 'text-muted hover:text-ink'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <QuickAdd ref={quickAdd} />
        </>
      )}
    </MotionConfig>
  );
}
