import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import { verifyWaveSignature } from '../lib/wave.ts';
import { normalizePhone, phoneFromEmail, phoneToEmail } from '../lib/phone.ts';

/**
 * Signature Wave : HMAC-SHA256 hexadécimal de « horodatage + corps brut »
 * (docs.wave.com/webhook). Ces tests rejouent l'algorithme de la doc.
 */
const SECRET = 'wave_sn_WHS_test';
const BODY = '{"id":"EV_1","type":"checkout.session.completed","data":{"amount":"500"}}';
const sign = (t: number, body = BODY, secret = SECRET): string =>
  createHmac('sha256', secret).update(`${t}${body}`).digest('hex');

test('une signature correcte et récente est acceptée', () => {
  const t = 1_800_000_000;
  assert.equal(verifyWaveSignature(BODY, `t=${t},v1=${sign(t)}`, SECRET, t + 10), true);
});

test('plusieurs v1 (rotation de clé) : une seule valide suffit', () => {
  const t = 1_800_000_000;
  assert.equal(verifyWaveSignature(BODY, `t=${t},v1=${'0'.repeat(64)},v1=${sign(t)}`, SECRET, t), true);
});

test('corps modifié, mauvais secret, horodatage trop vieux, en-tête absent : refus', () => {
  const t = 1_800_000_000;
  const header = `t=${t},v1=${sign(t)}`;
  assert.equal(verifyWaveSignature(`${BODY} `, header, SECRET, t), false);
  assert.equal(verifyWaveSignature(BODY, `t=${t},v1=${sign(t, BODY, 'autre')}`, SECRET, t), false);
  assert.equal(verifyWaveSignature(BODY, header, SECRET, t + 301), false);
  assert.equal(verifyWaveSignature(BODY, null, SECRET, t), false);
  assert.equal(verifyWaveSignature(BODY, header, '', t), false);
});

test('les numéros ivoiriens sont ramenés au format local, comme dans Hive', () => {
  assert.equal(normalizePhone('+225 07 00 00 00 00'), '0700000000');
  assert.equal(normalizePhone('002250500000000'), '0500000000');
  assert.equal(normalizePhone('07 00 00'), null);
  assert.equal(normalizePhone('0900000000'), null);
  assert.equal(phoneToEmail('07 00 00 00 00'), '0700000000@everyday.co');
  assert.equal(phoneFromEmail('0700000000@everyday.co'), '0700000000');
  assert.equal(phoneFromEmail('aya@gmail.com'), null);
});
