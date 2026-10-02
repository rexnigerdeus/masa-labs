'use client';

/**
 * Qui a le droit d'être sur quel écran (règle : `lib/routing.ts`).
 *
 * Le compte est obligatoire : la page d'entrée (`/bienvenue`) explique
 * l'application et mène à la création de compte ; viennent ensuite les
 * premiers pas, puis l'application.
 *
 * La décision se prend sur l'état **local** (`meta.ownerId`, posé à la
 * connexion), jamais sur un appel réseau : l'application doit s'ouvrir
 * hors-ligne, et un compte déjà ouvert sur l'appareil le reste tant qu'on
 * ne se déconnecte pas. Le serveur, lui, revérifie le jeton à chaque
 * synchronisation (RLS).
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { redirectFor, type Need } from './routing.ts';
import { useStore, type State } from './store.ts';

/**
 * Renvoie l'état si l'écran peut s'afficher, `null` sinon (et redirige).
 *
 * `once` : la décision n'est prise qu'au premier affichage. C'est le cas de
 * l'écran de connexion, où le compte apparaît *pendant* la connexion, avant
 * que la première lecture ait dit si les premiers pas sont déjà faits :
 * c'est le formulaire qui choisit alors la destination.
 *
 * `enabled: false` : aucune redirection (reconnexion après une session
 * expirée, où le compte est volontairement encore ouvert sur l'appareil).
 */
export function useGate(need: Need, { once = false, enabled = true } = {}): State | null {
  const router = useRouter();
  const store = useStore();
  const decided = useRef<string | null | undefined>(undefined);

  let target: string | null = null;
  if (store !== null && enabled) {
    if (once) {
      if (decided.current === undefined) decided.current = redirectFor(need, store);
      target = decided.current;
    } else {
      target = redirectFor(need, store);
    }
  }

  useEffect(() => {
    if (target !== null) router.replace(target);
  }, [target, router]);

  return store === null || target !== null ? null : store;
}
