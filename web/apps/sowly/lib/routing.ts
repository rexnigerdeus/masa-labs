/**
 * Règle d'accès aux écrans, en fonction pure (testée) — appliquée par
 * `lib/gate.ts`.
 *
 *   sans compte                  → /bienvenue (page d'entrée)
 *   compte, premiers pas à faire → /premiers-pas
 *   compte, premiers pas faits   → l'application
 */

export type Need = 'guest' | 'onboarding' | 'app';

export const ENTRY = '/bienvenue';
export const FIRST_STEPS = '/premiers-pas';

export interface AccessState {
  meta: { ownerId: string | null };
  data: { profile: { onboardedAt: string | null } };
}

/** Où envoyer quelqu'un dans cet état, ou `null` s'il est au bon endroit. */
export function redirectFor(need: Need, state: AccessState): string | null {
  const signedIn = state.meta.ownerId !== null;
  const onboarded = state.data.profile.onboardedAt !== null;
  if (need === 'guest') return signedIn ? (onboarded ? '/' : FIRST_STEPS) : null;
  if (!signedIn) return ENTRY;
  if (need === 'onboarding') return onboarded ? '/' : null;
  return onboarded ? null : FIRST_STEPS;
}
