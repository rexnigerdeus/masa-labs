'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { useInstallPrompt } from '@everyday/pwa';
import { redirectFor } from '../lib/routing';
import { useStore } from '../lib/store';
import { AppBadge } from './icons';
import {
  GrowingSprout, HistoryDemo, RisingSun, IdentityCycle, InfinityDraw, OfflineDemo, TasksDemo, ThemeSwitch, TodayDemo,
} from './landing/demos';
import { EASE, Tile, TileText } from './landing/Tile';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui';

const SIGN_UP = '/connexion?mode=inscription';
const SIGN_IN = '/connexion?mode=connexion';

/** Les pastilles des trois étapes : trois aplats de la palette. */
const STEP_COLORS = [
  'bg-mangue text-[var(--sur-mangue)]',
  'bg-hibiscus text-[var(--sur-hibiscus)]',
  'bg-lagune text-[var(--sur-lagune)]',
];

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
          <AppBadge className="h-10 w-10" />
          <span className="flex flex-col gap-1">
            <span className="display text-[21px] !leading-none [font-stretch:80%]">Sowly</span>
            <span className="s text-[15px] leading-none text-muted">graines d’habitudes</span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          <Link href={SIGN_IN} className="btn btn--fantome hidden sm:inline-flex">
            Se connecter
          </Link>
          <ThemeToggle />
        </span>
      </header>

      <div className="grid grid-flow-row-dense grid-cols-1 gap-[var(--pas)] sm:grid-cols-2 lg:grid-cols-4">
        {/* ------------------------------------------------------ Promesse */}
        <Tile
          label="Sowly, Graines d’Habitudes"
          className="carte--lagune hero relative min-h-[26rem] sm:col-span-2 lg:row-span-2 lg:min-h-[34rem]"
        >
          {/* Le hero du hub : un aplat de la couleur de l'app, le grand titre
              serré et sa fin en serif italique. */}
          <GrowingSprout className="absolute -right-10 -bottom-4 h-60 w-60 opacity-20 sm:h-72 sm:w-72" />
          <RisingSun className="absolute top-6 right-6 h-9 w-9 sm:top-8 sm:right-8 sm:h-11 sm:w-11" />
          <p className="sur relative">Graines d’habitudes · 0 F · sans réseau</p>
          <h1 className="titre-hero relative mt-4">
            {['Suis tes habitudes.', 'Gère tes tâches.', 'Sans limite.'].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.08em]">
                <motion.span
                  className={`block ${i === 2 ? 's' : ''}`}
                  initial={{ y: '105%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.12 }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>
          <p className="relative mt-4 max-w-sm text-[17px] leading-relaxed opacity-85">
            De petites graines, de vraies habitudes. Gratuit, illimité, et ça marche même sans réseau.
          </p>
          <div ref={heroCta} className="relative mt-auto flex flex-wrap items-center gap-2 pt-8">
            <Link href={SIGN_UP} className="btn btn--plein btn--grand">
              Créer mon compte
            </Link>
            <Link href={SIGN_IN} className="btn btn--grand">
              J’ai déjà un compte
            </Link>
          </div>
        </Tile>

        {/* ------------------------------------------------------- L'essai */}
        <Tile delay={0.1} className="sm:col-span-2 lg:row-span-2">
          <TodayDemo />
          <TileText title={<>Un écran, <em className="s">un geste</em> par jour</>}>
            « Aujourd’hui » rassemble tes habitudes du matin, de la journée et du soir. Touche une
            pastille pour valider : ta série grandit d’un jour.
          </TileText>
        </Tile>

        {/* ------------------------------------------------ Trois étapes */}
        <Tile className="sm:col-span-2 lg:col-span-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="titre-section">Se lancer en <em className="s">3 étapes</em></h2>
            <p className="text-sm text-muted">Moins de deux minutes avant ta première graine.</p>
          </div>
          <ol className="relative mt-6 grid gap-5 sm:grid-cols-3 sm:gap-6">
            {/* Le fil qui relie les étapes se trace à l'arrivée de la tuile. */}
            <motion.span
              aria-hidden
              className="absolute top-[30px] right-[16%] left-[16%] hidden h-0 origin-left border-t-[1.5px] border-dashed border-line sm:block"
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
                <span className={`display grid h-[62px] w-[62px] shrink-0 rotate-[4deg] place-items-center rounded-[20px] text-[26px] [font-stretch:75%] transition duration-300 ease-[var(--ressort)] hover:-rotate-3 hover:scale-[1.08] ${STEP_COLORS[i]}`}>
                  {i + 1}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="display text-[21px]">{s.title}</span>
                  <span className="text-[15px] leading-relaxed text-muted">{s.text}</span>
                  <span className="mono mt-1 self-start rounded-[7px] bg-raised px-2 py-0.5 text-muted sm:self-center">
                    {s.time}
                  </span>
                </span>
              </motion.li>
            ))}
          </ol>
        </Tile>

        {/* ------------------------------------------------------ Identité */}
        <Tile className="carte--citron sm:col-span-2">
          <IdentityCycle />
          <TileText title={<>Commence par qui tu veux <em className="s">devenir</em></>}>
            Chaque habitude est la preuve quotidienne d’une identité. Et elle commence minuscule : une
            page, cinq pompes, deux minutes. Le but des premières semaines, c’est de ne jamais rater.
          </TileText>
        </Tile>

        {/* ---------------------------------------------------- Historique */}
        <Tile delay={0.1} className="lg:row-span-2">
          <HistoryDemo />
          <TileText title={<>Jamais <em className="s">culpabilisant</em></>}>
            Un jour manqué reste une case vide : ni rouge, ni reproche. Ce qui compte, c’est de revenir
            le lendemain. Oublié de cocher hier soir ? Touche la case, c’est rattrapé.
          </TileText>
        </Tile>

        {/* -------------------------------------------------------- Tâches */}
        <Tile delay={0.2}>
          <TasksDemo />
          <TileText title={<>Tes tâches, <em className="s">à côté</em></>}>
            « Ma journée », tes listes, et le bouton + depuis n’importe quel écran.
          </TileText>
        </Tile>

        {/* ---------------------------------------------------- Hors réseau */}
        <Tile className="carte--ciel">
          <OfflineDemo />
          <TileText title={<>Même <em className="s">sans réseau</em></>}>
            Tout est gardé sur ton téléphone et repart vers ton compte au retour du réseau.
          </TileText>
        </Tile>

        {/* ------------------------------------------------------- Illimité */}
        <Tile delay={0.1} className="carte--hibiscus">
          <div className="flex items-end gap-3">
            <InfinityDraw />
            <p className="chiffre pb-2">0 F</p>
          </div>
          <TileText title={<>Sans limite, <em className="s">gratuit</em></>}>
            Habitudes et tâches illimitées. Pas d’abonnement, pas de publicité.
          </TileText>
        </Tile>

        {/* ---------------------------------------------------------- Thème */}
        <Tile delay={0.2}>
          <ThemeSwitch />
          <TileText title={<>Clair ou <em className="s">sombre</em></>}>
            Bascule ici ou en haut de chaque écran. Dans Personnaliser, choisis aussi ta palette, ta densité et
            la police des titres.
          </TileText>
        </Tile>

        {/* --------------------------------------------------------- Compte */}
        <Tile className="sm:col-span-2">
          <div aria-hidden className="flex flex-col gap-2">
            <FakeField label="Numéro de téléphone" value="07 •• •• •• 12" />
            <FakeField label="Mot de passe" value="••••••••••" />
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {['Aucun SMS', 'Aucun email', 'Tous tes appareils', 'Même compte que les apps The Everyday Co.'].map((c) => (
              <span key={c} className="puce">{c}</span>
            ))}
          </div>
          <TileText title={<>Un compte, <em className="s">et c’est tout</em></>}>
            Il garde tes habitudes et tes tâches en sécurité et les retrouve sur ton téléphone comme sur
            ton ordinateur.
          </TileText>
        </Tile>

        {/* ----------------------------------------------------- Installer */}
        <Tile delay={0.1} className="carte--indigo sm:col-span-2">
          <InstallBlock />
        </Tile>

        {/* ------------------------------------------------------ Dernier mot */}
        <Tile className="carte--encre hero items-start sm:col-span-2 sm:flex-row sm:items-center sm:justify-between lg:col-span-4">
          <div className="flex flex-col gap-2">
            <h2 className="titre-page">
              Plante ta première <em className="s">graine</em>
            </h2>
            <p className="text-[17px] text-muted">Deux minutes suffisent. Le reste pousse tout seul.</p>
          </div>
          <div ref={endCta} className="mt-5 flex flex-wrap items-center gap-2 sm:mt-0">
            <Link href={SIGN_UP} className="btn btn--plein btn--grand">
              Créer mon compte
            </Link>
            <Link href={SIGN_IN} className="btn btn--grand">
              J’ai déjà un compte
            </Link>
          </div>
        </Tile>
      </div>

      <p className="px-1 text-center text-[12.5px] text-muted">
        Sowly — <em className="s text-[15px]">Graines d’Habitudes</em> · The Everyday Co.
      </p>

      <AnimatePresence>
        {showSticky ? (
          <motion.div
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ duration: 0.35, ease: EASE }}
            className="fixed inset-x-2.5 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-20 rounded-[20px] bg-encre p-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,.45)] sm:hidden"
          >
            <Link href={SIGN_UP} className="btn btn--grand w-full !border-transparent !bg-[var(--fond)] !text-[var(--encre)]">
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
    <div className="saisie flex items-center justify-between gap-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="mono text-[14px] tracking-wider">{value}</span>
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
    installed: <p className="etat etat--ok self-start">Sowly est déjà installée sur cet appareil</p>,
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
            className={`grid h-14 w-14 place-items-center rounded-[16px] ${i === 1 ? '' : 'bg-[rgba(255,255,255,.16)]'}`}
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={i === 1
              ? { type: 'spring', stiffness: 260, damping: 14, delay: 0.55 }
              : { duration: 0.4, ease: EASE, delay: 0.15 + i * 0.08 }}
          >
            {i === 1 ? <AppBadge className="h-14 w-14" /> : null}
          </motion.span>
        ))}
      </div>
      <TileText title={<>Sur ton <em className="s">écran d’accueil</em></>}>
        Sowly s’ouvre alors en un geste, comme une app, même sans réseau. C’est fait pour les
        quelques secondes de chaque jour.
      </TileText>
      <div className="pt-3">{body}</div>
    </>
  );
}
