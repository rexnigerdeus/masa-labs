'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { redirectFor } from '../lib/routing';
import { useStore } from '../lib/store';
import { CalendarIcon, ListIcon, SproutIcon, SunIcon } from './icons';

const POINTS = [
  {
    Icon: SproutIcon,
    title: 'Qui tu deviens',
    text: 'Choisis qui tu veux devenir, puis une habitude minuscule qui le prouve chaque jour. Tes séries se construisent toutes seules.',
  },
  {
    Icon: SunIcon,
    title: 'Ce que tu as à faire',
    text: 'À côté de tes habitudes, une liste de tâches simple : « Ma journée », tes listes, un ajout en un geste depuis n’importe quel écran.',
  },
  {
    Icon: CalendarIcon,
    title: 'Jamais culpabilisant',
    text: 'Un jour manqué reste une case vide, sans rouge ni reproche. Ce qui compte, c’est de revenir le lendemain.',
  },
  {
    Icon: ListIcon,
    title: 'Sans limite, même sans réseau',
    text: 'Habitudes et tâches illimitées, gratuitement. Une fois ouverte, l’app fonctionne hors connexion et se synchronise au retour du réseau.',
  },
];

/**
 * Page d'entrée : ce qu'il faut savoir avant de créer son compte, qui est
 * obligatoire pour utiliser l'application.
 *
 * Rendue côté serveur en entier (pas d'attente de l'état local) : c'est la
 * première chose que voit quelqu'un qui arrive d'un lien partagé. Si un
 * compte est déjà ouvert sur l'appareil, on file vers l'application.
 */
export function Landing() {
  const router = useRouter();
  const store = useStore();
  const target = store === null ? null : redirectFor('guest', store);
  useEffect(() => {
    if (target !== null) router.replace(target);
  }, [target, router]);

  if (target !== null) return null;

  return (
    <div className="flex min-h-dvh flex-col gap-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-6">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-on-primary">
          <SproutIcon className="h-8 w-8" />
        </span>
        <h1 className="font-display text-[2.6rem] leading-[1.05] font-semibold tracking-tight">
          Suis tes habitudes.
          <br />
          Gère tes tâches.
          <br />
          <span className="text-primary-ink">Sans limite.</span>
        </h1>
        <p className="max-w-md text-[16px] text-muted">
          Sowly — Graines d’Habitudes. De petites graines, de vraies habitudes.
        </p>
      </header>

      <ul className="flex flex-col gap-5">
        {POINTS.map(({ Icon, title, text }) => (
          <li key={title} className="flex gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-done-soft text-primary-ink">
              <Icon className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <h2 className="font-display text-[17px] font-semibold">{title}</h2>
              <p className="text-[15px] text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ul>

      <section className="card flex flex-col gap-2 p-5">
        <h2 className="font-display text-[17px] font-semibold">Un compte, et c’est tout</h2>
        <p className="text-[15px] text-muted">
          Ton numéro de téléphone et un mot de passe suffisent — aucun SMS, aucun email. Ton compte
          garde tes habitudes et tes tâches en sécurité et les retrouve sur tous tes appareils. C’est
          le même compte que pour les autres apps The Everyday Co.
        </p>
      </section>

      <div className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-2 bg-canvas px-4 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Link
          href="/connexion?mode=inscription"
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary text-base font-medium text-on-primary hover:brightness-110"
        >
          Créer mon compte
        </Link>
        <Link
          href="/connexion?mode=connexion"
          className="py-2 text-center text-sm font-medium text-muted hover:text-ink"
        >
          J’ai déjà un compte
        </Link>
      </div>
    </div>
  );
}
