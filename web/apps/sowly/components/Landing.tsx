'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { useInstallPrompt } from '@everyday/pwa';
import { redirectFor } from '../lib/routing';
import { useStore } from '../lib/store';
import { BrandMark } from './icons';
import {
  GrowingSprout, HistoryDemo, IdentityCycle, InfinityDraw, OfflineDemo, TasksDemo, ThemeSwitch, TodayDemo,
} from './landing/demos';
import { EASE, Tile, TileText } from './landing/Tile';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui';

const SIGN_UP = '/connexion?mode=inscription';
const SIGN_IN = '/connexion?mode=connexion';

const STEPS = [
  {
    title: 'Crée ton compte',
    text: 'Ton numéro et un mot de passe. Pas de SMS, pas d’email.',
    time: '30 secondes',
  },
  {
    title: 'Choisis qui tu deviens',
    text: 'Une identité, puis une habitude minuscule qui la prouve. Tu t’y engages en maintenant le bouton.',
    time: '1 minute',
  },
  {
    title: 'Coche chaque jour',
    text: 'Un geste depuis « Aujourd’hui ». Ta série grandit, et une journée complète s’illumine.',
    time: 'chaque jour',
  },
];

/**
 * Page d'entrée : tout ce qu'il faut savoir pour se lancer, avant la
 * création du compte, obligatoire pour utiliser l'application.
 *
 * Grille bento : une tuile par idée, chacune avec une illustration vivante
 * (`landing/demos.tsx`) qui montre le geste réel de l'app — la démo
 * « Aujourd'hui » se touche pour de vrai. L'ordre du DOM est l'ordre de
 * lecture sur téléphone : promesse, essai, trois étapes, puis le détail.
 *
 * Si un compte est déjà ouvert sur l'appareil, on file vers l'application.
 */
export function Landing() {
  const router = useRouter();
  const store = useStore();
  const target = store === null ? null : redirectFor('guest', store);
  useEffect(() => {
    if (target !== null) router.replace(target);
  }, [target, router]);

  // Barre d'inscription collante (téléphone) : seulement quand aucun des
  // deux appels à l'action n'est déjà à l'écran.
  const heroCta = useRef<HTMLDivElement>(null);
  const endCta = useRef<HTMLDivElement>(null);
  const heroVisible = useInView(heroCta);
  const endVisible = useInView(endCta);
  const showSticky = !heroVisible && !endVisible;

  if (target !== null) return null;

  return (
    <div className="flex min-h-dvh flex-col gap-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:gap-6">
      <header className="flex items-center justify-between gap-3 py-1">
        <span className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-on-primary">
            <BrandMark className="h-6 w-6" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">Sowly</span>
        </span>
        <span className="flex items-center gap-2">
          <Link
            href={SIGN_IN}
            className="hidden h-10 items-center rounded-full px-4 text-sm font-medium text-muted hover:bg-raised hover:text-ink sm:inline-flex"
          >
            Se connecter
          </Link>
          <ThemeToggle />
        </span>
      </header>

      <div className="grid grid-flow-row-dense grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {/* ------------------------------------------------------ Promesse */}
        <Tile
          label="Sowly, Graines d’Habitudes"
          className="relative min-h-[26rem] border-transparent bg-primary text-on-primary sm:col-span-2 lg:row-span-2 lg:min-h-[34rem]"
        >
          <GrowingSprout className="absolute -right-16 -bottom-8 h-64 w-64 text-on-primary opacity-[0.16] sm:h-80 sm:w-80" />
          <p className="relative text-sm font-medium tracking-wide uppercase opacity-80">Graines d’Habitudes</p>
          <h1 className="relative mt-4 font-display text-[2.5rem] leading-[1.02] font-semibold tracking-tight sm:text-[3.4rem]">
            {['Suis tes habitudes.', 'Gère tes tâches.', 'Sans limite.'].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  className={`block ${i === 2 ? 'opacity-70' : ''}`}
                  initial={{ y: '105%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.12 }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>
          <p className="relative mt-4 max-w-sm text-[16px] leading-relaxed opacity-85">
            De petites graines, de vraies habitudes. Gratuit, illimité, et ça marche même sans réseau.
          </p>
          <div ref={heroCta} className="relative mt-auto flex flex-wrap items-center gap-2 pt-8">
            <Link
              href={SIGN_UP}
              className="inline-flex h-12 items-center justify-center rounded-full bg-on-primary px-6 text-base font-semibold text-primary-ink transition hover:scale-[1.03] active:scale-95"
            >
              Créer mon compte
            </Link>
            <Link
              href={SIGN_IN}
              className="inline-flex h-12 items-center rounded-full px-4 text-[15px] font-medium underline-offset-4 opacity-90 hover:underline"
            >
              J’ai déjà un compte
            </Link>
          </div>
        </Tile>

        {/* ------------------------------------------------------- L'essai */}
        <Tile delay={0.1} className="border-line bg-card sm:col-span-2 lg:row-span-2">
          <TodayDemo />
          <TileText title="Un écran, un geste par jour">
            « Aujourd’hui » rassemble tes habitudes du matin, de la journée et du soir. Touche une
            pastille pour valider : ta série grandit d’un jour.
          </TileText>
        </Tile>

        {/* ------------------------------------------------ Trois étapes */}
        <Tile className="border-line bg-card sm:col-span-2 lg:col-span-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Se lancer en 3 étapes</h2>
            <p className="text-sm text-muted">Moins de deux minutes avant ta première graine.</p>
          </div>
          <ol className="relative mt-6 grid gap-5 sm:grid-cols-3 sm:gap-6">
            {/* Le fil qui relie les étapes se trace à l'arrivée de la tuile. */}
            <motion.span
              aria-hidden
              className="absolute top-5 right-[16%] left-[16%] hidden h-0.5 origin-left bg-line sm:block"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}
            />
            {STEPS.map((s, i) => (
              <motion.li
                key={s.title}
                className="relative flex gap-4 sm:flex-col sm:items-center sm:text-center"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.3 + i * 0.25 }}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary font-display text-lg font-semibold text-on-primary ring-4 ring-card">
                  {i + 1}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-display text-lg font-semibold">{s.title}</span>
                  <span className="text-[15px] leading-relaxed text-muted">{s.text}</span>
                  <span className="mt-1 self-start rounded-full bg-raised px-2.5 py-0.5 text-xs font-medium text-muted sm:self-center">
                    {s.time}
                  </span>
                </span>
              </motion.li>
            ))}
          </ol>
        </Tile>

        {/* ------------------------------------------------------ Identité */}
        <Tile className="border-line bg-card sm:col-span-2">
          <IdentityCycle />
          <TileText title="Commence par qui tu veux devenir">
            Chaque habitude est la preuve quotidienne d’une identité. Et elle commence minuscule : une
            page, cinq pompes, deux minutes. Le but des premières semaines, c’est de ne jamais rater.
          </TileText>
        </Tile>

        {/* ---------------------------------------------------- Historique */}
        <Tile delay={0.1} className="border-line bg-card lg:row-span-2">
          <HistoryDemo />
          <TileText title="Jamais culpabilisant">
            Un jour manqué reste une case vide : ni rouge, ni reproche. Ce qui compte, c’est de revenir
            le lendemain. Oublié de cocher hier soir ? Touche la case, c’est rattrapé.
          </TileText>
        </Tile>

        {/* -------------------------------------------------------- Tâches */}
        <Tile delay={0.2} className="border-line bg-card">
          <TasksDemo />
          <TileText title="Tes tâches, à côté">
            « Ma journée », tes listes, et le bouton + depuis n’importe quel écran.
          </TileText>
        </Tile>

        {/* ---------------------------------------------------- Hors réseau */}
        <Tile className="border-line bg-card">
          <OfflineDemo />
          <TileText title="Même sans réseau">
            Tout est gardé sur ton téléphone et repart vers ton compte au retour du réseau.
          </TileText>
        </Tile>

        {/* ------------------------------------------------------- Illimité */}
        <Tile delay={0.1} className="border-line bg-done-soft">
          <div className="flex items-end gap-3">
            <InfinityDraw />
            <p className="pb-3 font-display text-3xl font-semibold tracking-tight text-primary-ink">0 F</p>
          </div>
          <TileText title="Sans limite, gratuit">
            Habitudes et tâches illimitées. Pas d’abonnement, pas de publicité.
          </TileText>
        </Tile>

        {/* ---------------------------------------------------------- Thème */}
        <Tile delay={0.2} className="border-line bg-card">
          <ThemeSwitch />
          <TileText title="Clair ou sombre">
            Bascule ici ou en haut de chaque écran. Dans Réglages, Sowly peut aussi suivre ton téléphone.
          </TileText>
        </Tile>

        {/* --------------------------------------------------------- Compte */}
        <Tile className="border-line bg-card sm:col-span-2">
          <div aria-hidden className="flex flex-col gap-2">
            <FakeField label="Numéro de téléphone" value="07 •• •• •• 12" />
            <FakeField label="Mot de passe" value="••••••••••" />
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {['Aucun SMS', 'Aucun email', 'Tous tes appareils', 'Même compte que les apps The Everyday Co.'].map((c) => (
              <span key={c} className="rounded-full bg-raised px-2.5 py-1 text-xs font-medium text-muted">{c}</span>
            ))}
          </div>
          <TileText title="Un compte, et c’est tout">
            Il garde tes habitudes et tes tâches en sécurité et les retrouve sur ton téléphone comme sur
            ton ordinateur.
          </TileText>
        </Tile>

        {/* ----------------------------------------------------- Installer */}
        <Tile delay={0.1} className="border-line bg-card sm:col-span-2">
          <InstallBlock />
        </Tile>

        {/* ------------------------------------------------------ Dernier mot */}
        <Tile className="items-start border-transparent bg-raised sm:col-span-2 sm:flex-row sm:items-center sm:justify-between lg:col-span-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Plante ta première graine aujourd’hui.
            </h2>
            <p className="text-[15px] text-muted">Deux minutes suffisent. Le reste pousse tout seul.</p>
          </div>
          <div ref={endCta} className="mt-5 flex flex-wrap items-center gap-2 sm:mt-0">
            <Link
              href={SIGN_UP}
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-semibold text-on-primary transition hover:brightness-110 active:scale-95"
            >
              Créer mon compte
            </Link>
            <Link href={SIGN_IN} className="inline-flex h-12 items-center px-3 text-sm font-medium text-muted hover:text-ink">
              J’ai déjà un compte
            </Link>
          </div>
        </Tile>
      </div>

      <p className="px-1 text-center text-xs text-faint">Sowly — Graines d’Habitudes · The Everyday Co.</p>

      <AnimatePresence>
        {showSticky ? (
          <motion.div
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ duration: 0.35, ease: EASE }}
            className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden"
          >
            <Link
              href={SIGN_UP}
              className="flex h-12 items-center justify-center rounded-full bg-primary text-base font-semibold text-on-primary active:scale-95"
            >
              Créer mon compte
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function FakeField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas px-3.5 py-2.5">
      <span className="text-sm text-muted">{label}</span>
      <span className="font-display text-[15px] tracking-wider">{value}</span>
    </div>
  );
}

/**
 * Installer l'app : le bon mode d'emploi selon le navigateur. La tuile
 * existe toujours (contrairement à `InstallCard`) pour ne pas trouer la
 * grille.
 */
function InstallBlock() {
  const { state, install } = useInstallPrompt();
  const body = {
    available: (
      <Button variant="primary" onClick={() => void install()} className="self-start">
        Installer l’app
      </Button>
    ),
    ios: (
      <p className="text-[15px] text-muted">
        Dans Safari, touche <span className="font-medium text-ink">Partager</span>, puis{' '}
        <span className="font-medium text-ink">« Sur l’écran d’accueil »</span>.
      </p>
    ),
    installed: <p className="text-[15px] font-medium text-primary-ink">Sowly est déjà installée sur cet appareil.</p>,
    unsupported: (
      <p className="text-[15px] text-muted">
        Ouvre Sowly dans Chrome ou Safari, puis choisis{' '}
        <span className="font-medium text-ink">« Ajouter à l’écran d’accueil »</span> dans le menu.
      </p>
    ),
  }[state];

  return (
    <>
      <div aria-hidden className="flex items-end gap-3">
        {[0, 1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className={`grid h-14 w-14 place-items-center rounded-2xl ${i === 1 ? 'bg-primary text-on-primary' : 'bg-raised'}`}
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={i === 1
              ? { type: 'spring', stiffness: 260, damping: 14, delay: 0.55 }
              : { duration: 0.4, ease: EASE, delay: 0.15 + i * 0.08 }}
          >
            {i === 1 ? <BrandMark className="h-7 w-7" /> : null}
          </motion.span>
        ))}
      </div>
      <TileText title="Sur ton écran d’accueil">
        Sowly s’ouvre alors en un geste, comme une app, même sans réseau. C’est fait pour les
        quelques secondes de chaque jour.
      </TileText>
      <div className="pt-3">{body}</div>
    </>
  );
}
