import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPhone, normalizePhone, phoneToEmail } from '../lib/phone.ts';

test('les trois écritures d’un même numéro mènent au même compte', () => {
  for (const written of ['0700000000', '07 00 00 00 00', '+225 07 00 00 00 00', '002250700000000']) {
    assert.equal(normalizePhone(written), '0700000000');
  }
});

test('le pseudo-email reproduit exactement la fonction SQL', () => {
  assert.equal(phoneToEmail('07 00 00 00 00'), '0700000000@everyday.co');
});

test('un numéro qui n’est pas ivoirien est refusé plutôt que corrigé', () => {
  assert.equal(normalizePhone('0600000000'), null);   // préfixe inexistant en CI
  assert.equal(normalizePhone('070000000'), null);    // neuf chiffres
  assert.equal(normalizePhone('07000000000'), null);  // onze chiffres
  assert.equal(normalizePhone('+33612345678'), null);
  assert.equal(phoneToEmail('bonjour'), null);
});

test('le numéro se relit deux chiffres par deux chiffres', () => {
  assert.equal(formatPhone('0700000000'), '07 00 00 00 00');
});
