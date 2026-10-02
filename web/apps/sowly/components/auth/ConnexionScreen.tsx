'use client';

import Link from 'next/link';
import { useStore } from '../../lib/store';
import { ChevronLeftIcon } from '../icons';
import { AuthForm } from './AuthForm';

/**
 * Écran de compte. Quelqu'un qui a déjà semé des graines sur cet appareil
 * vient presque toujours pour *créer* son compte ; quelqu'un qui arrive de
 * l'accueil sans rien, pour se *connecter*. Le mode par défaut suit.
 */
export function ConnexionScreen() {
  const store = useStore();
  if (store === null) return null;
  const onboarded = store.data.profile.onboardedAt !== null;

  return (
    <div className="flex min-h-dvh flex-col gap-6 pt-[max(1rem,env(safe-area-inset-top))] pb-8">
      <Link
        href={onboarded ? '/reglages' : '/bienvenue'}
        className="-ml-2 inline-flex items-center gap-1 self-start rounded-full py-1.5 pr-3 pl-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ChevronLeftIcon className="h-5 w-5" /> Retour
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight">
          {onboarded ? 'Sauvegarde tes graines' : 'Retrouve tes graines'}
        </h1>
        <p className="text-[15px] text-muted">
          {onboarded
            ? 'Un numéro et un mot de passe : tes habitudes et tes tâches te suivent sur tous tes appareils.'
            : 'Connecte-toi pour retrouver tes habitudes et tes tâches sur cet appareil.'}
        </p>
      </header>
      <AuthForm initialMode={onboarded ? 'inscription' : 'connexion'} />
    </div>
  );
}
