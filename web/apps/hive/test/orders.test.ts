import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedTransitions, canTransition, hasDateConflict } from '../lib/orders.ts';
import type { Order } from '../lib/types.ts';

test('le loueur confirme, le client ne se confirme pas lui-même', () => {
  assert.equal(canTransition('demandee', 'confirmee', 'seller'), true);
  assert.equal(canTransition('demandee', 'confirmee', 'buyer'), false);
});

test('les deux parties peuvent annuler avant la remise du matériel', () => {
  for (const party of ['buyer', 'seller'] as const) {
    assert.equal(canTransition('demandee', 'annulee', party), true);
    assert.equal(canTransition('confirmee', 'annulee', party), true);
  }
});

test('une location en cours ne s’annule plus : le matériel est déjà sorti', () => {
  assert.equal(canTransition('en_cours', 'annulee', 'buyer'), false);
  assert.equal(canTransition('en_cours', 'annulee', 'seller'), false);
  assert.equal(canTransition('en_cours', 'terminee', 'seller'), true);
});

test('on ne saute pas d’étape ni ne revient en arrière', () => {
  assert.equal(canTransition('demandee', 'terminee', 'seller'), false);
  assert.equal(canTransition('terminee', 'en_cours', 'seller'), false);
  assert.equal(canTransition('annulee', 'confirmee', 'seller'), false);
  assert.equal(canTransition('confirmee', 'confirmee', 'seller'), false);
});

test('les états terminaux ne proposent plus rien', () => {
  assert.deepEqual(allowedTransitions('terminee', 'seller'), []);
  assert.deepEqual(allowedTransitions('annulee', 'buyer'), []);
});

test('le client ne se voit proposer que l’annulation', () => {
  assert.deepEqual(allowedTransitions('demandee', 'buyer'), ['annulee']);
  assert.deepEqual(allowedTransitions('confirmee', 'seller'), ['en_cours', 'annulee']);
});

/** Réduit aux champs que la disponibilité regarde. */
function order(status: Order['status'], start: string, end: string) {
  return { status, start_date: start, end_date: end };
}

test('une commande confirmée bloque les dates qui la recoupent', () => {
  const existing = [order('confirmee', '2026-12-24', '2026-12-26')];
  assert.equal(hasDateConflict(existing, '2026-12-26', '2026-12-28'), true);
  assert.equal(hasDateConflict(existing, '2026-12-27', '2026-12-28'), false);
});

test('une simple demande ne bloque rien tant que le loueur n’a pas dit oui', () => {
  const existing = [order('demandee', '2026-12-24', '2026-12-26')];
  assert.equal(hasDateConflict(existing, '2026-12-24', '2026-12-26'), false);
});

test('une commande annulée ou terminée libère les dates', () => {
  assert.equal(hasDateConflict([order('annulee', '2026-12-24', '2026-12-26')],
    '2026-12-24', '2026-12-26'), false);
  assert.equal(hasDateConflict([order('terminee', '2026-12-24', '2026-12-26')],
    '2026-12-24', '2026-12-26'), false);
});

test('un achat, sans dates, ne bloque aucune location', () => {
  assert.equal(
    hasDateConflict([{ status: 'confirmee', start_date: null, end_date: null }],
      '2026-12-24', '2026-12-26'),
    false,
  );
});
