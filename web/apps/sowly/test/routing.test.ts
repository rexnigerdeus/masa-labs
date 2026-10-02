import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redirectFor } from '../lib/routing.ts';

const state = (ownerId: string | null, onboardedAt: string | null) => ({
  meta: { ownerId }, data: { profile: { onboardedAt } },
});

test('sans compte, toute l’application renvoie à la page d’entrée', () => {
  assert.equal(redirectFor('app', state(null, null)), '/bienvenue');
  assert.equal(redirectFor('onboarding', state(null, null)), '/bienvenue');
  assert.equal(redirectFor('guest', state(null, null)), null);
});

test('un compte neuf passe par les premiers pas, et pas ailleurs', () => {
  assert.equal(redirectFor('app', state('u', null)), '/premiers-pas');
  assert.equal(redirectFor('onboarding', state('u', null)), null);
  assert.equal(redirectFor('guest', state('u', null)), '/premiers-pas');
});

test('premiers pas faits : l’application, et plus l’entrée ni les premiers pas', () => {
  const done = state('u', '2026-10-02T08:00:00Z');
  assert.equal(redirectFor('app', done), null);
  assert.equal(redirectFor('onboarding', done), '/');
  assert.equal(redirectFor('guest', done), '/');
});

test('des données d’onboarding sans compte ne donnent pas accès à l’application', () => {
  assert.equal(redirectFor('app', state(null, '2026-10-02T08:00:00Z')), '/bienvenue');
});
