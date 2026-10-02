'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useGate } from '../../lib/gate';
import { ChevronLeftIcon } from '../icons';
import { AuthForm } from './AuthForm';

/**
 * Création de compte ou connexion — passage obligé avant l'application.
 *
 * Deux arrivées possibles :
 *   - depuis la page d'entrée (`?mode=inscription` ou `?mode=connexion`) :
 *     quelqu'un qui a déjà un compte ouvert sur l'appareil est renvoyé vers
 *     l'application ;
 *   - `?reconnexion=1` : la session a expiré alors que le compte est encore
 *     ouvert sur l'appareil. On ne redirige pas, et on ne propose que la
 *     connexion — avec le même numéro, rien de ce qui est en attente ne se perd.
 */
export function ConnexionScreen() {
  const params = useSearchParams();
  const reconnect = params.get('reconnexion') === '1';
  // La décision n'est prise qu'à l'arrivée : pendant la connexion, le compte
  // apparaît sur l'appareil et c'est le formulaire qui choisit où aller.
  const store = useGate('guest', { once: true, enabled: !reconnect });
  if (store === null) return null;

  const mode = reconnect || params.get('mode') === 'connexion' ? 'connexion' : 'inscription';

  return (
    <div className="flex min-h-dvh flex-col gap-6 pt-[max(1rem,env(safe-area-inset-top))] pb-8">
      <Link
        href={reconnect ? '/reglages' : '/bienvenue'}
        className="-ml-2 inline-flex items-center gap-1 self-start rounded-full py-1.5 pr-3 pl-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ChevronLeftIcon className="h-5 w-5" /> Retour
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight">
          {reconnect ? 'Reconnecte-toi' : mode === 'inscription' ? 'Crée ton compte' : 'Content de te revoir'}
        </h1>
        <p className="text-[15px] text-muted">
          {reconnect
            ? 'Avec le même numéro, tes modifications gardées sur cet appareil repartiront vers ton compte.'
            : 'Un numéro et un mot de passe : tes habitudes et tes tâches te suivent sur tous tes appareils.'}
        </p>
      </header>
      <AuthForm initialMode={mode} lockMode={reconnect} />
    </div>
  );
}
