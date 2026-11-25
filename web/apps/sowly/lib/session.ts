'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from './supabase/client.ts';
import { formatPhone, phoneFromEmail } from './phone.ts';
import { isUnreachable } from './sync.ts';

export interface Account {
  userId: string;
  /** Numéro lisible, tiré du pseudo-email (voir `lib/phone.ts`). */
  phone: string;
}

/**
 * Compte connecté sur cet appareil : `undefined` pendant la lecture (ou si
 * le serveur est injoignable, on ne sait pas), `null` sans compte. Sert à l'affichage seulement — aucune donnée n'est
 * protégée par ce hook, c'est la RLS qui s'en charge côté serveur.
 */
export function useAccount(): Account | null | undefined {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const toAccount = (user: { id: string; email?: string } | null | undefined): Account | null =>
      user === null || user === undefined
        ? null
        : { userId: user.id, phone: formatPhone(phoneFromEmail(user.email) ?? '') };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (data.session === null && isUnreachable(error)) return;
      setAccount(toAccount(data.session?.user));
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Déjà traité par `getSession`, qui distingue « pas de session » de
      // « serveur injoignable » ; cet événement, lui, les confond.
      if (event === 'INITIAL_SESSION') return;
      setAccount(toAccount(session?.user));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return account;
}
