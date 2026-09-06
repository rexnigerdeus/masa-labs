import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRentQuote, formatFcfa } from '../lib/pricing.ts';
import { countDays, parseDay, rangesOverlap } from '../lib/dates.ts';

const PRICES = { rent_price_day: 10_000, rent_price_week: 50_000 };

test('louer « du 5 au 5 » est une journée facturée', () => {
  assert.equal(countDays('2026-09-05', '2026-09-05'), 1);
  assert.equal(computeRentQuote(PRICES, '2026-09-05', '2026-09-05')?.total, 10_000);
});

test('en dessous de sept jours, tout est facturé au jour', () => {
  const quote = computeRentQuote(PRICES, '2026-09-01', '2026-09-06');
  assert.equal(quote?.days, 6);
  assert.equal(quote?.weeklyApplied, false);
  assert.equal(quote?.total, 60_000);
});

test('le tarif semaine prend le relais au septième jour', () => {
  const quote = computeRentQuote(PRICES, '2026-09-01', '2026-09-07');
  assert.equal(quote?.days, 7);
  assert.equal(quote?.weeklyApplied, true);
  assert.equal(quote?.total, 50_000);
});

test('semaines entières et jours restants se cumulent', () => {
  // 10 jours = une semaine à 50 000 + trois jours à 10 000.
  const quote = computeRentQuote(PRICES, '2026-09-01', '2026-09-10');
  assert.equal(quote?.weeks, 1);
  assert.equal(quote?.extraDays, 3);
  assert.equal(quote?.total, 80_000);
});

test('un tarif semaine plus cher que sept jours à l’unité est ignoré', () => {
  // Saisie manifestement erronée du loueur : ce n'est pas au client de la payer.
  const quote = computeRentQuote({ rent_price_day: 10_000, rent_price_week: 90_000 },
    '2026-09-01', '2026-09-07');
  assert.equal(quote?.weeklyApplied, false);
  assert.equal(quote?.total, 70_000);
});

test('sans tarif semaine, la longue durée reste au tarif jour', () => {
  const quote = computeRentQuote({ rent_price_day: 10_000, rent_price_week: null },
    '2026-09-01', '2026-09-14');
  assert.equal(quote?.total, 140_000);
});

test('dates inversées ou invalides : pas de devis, jamais de NaN', () => {
  assert.equal(computeRentQuote(PRICES, '2026-09-10', '2026-09-01'), null);
  assert.equal(computeRentQuote(PRICES, '2026-02-31', '2026-03-02'), null);
  assert.equal(computeRentQuote(PRICES, 'demain', '2026-03-02'), null);
  assert.equal(parseDay('2026-02-31'), null);
});

test('une annonce en vente seule n’a pas de devis de location', () => {
  assert.equal(
    computeRentQuote({ rent_price_day: null, rent_price_week: null }, '2026-09-01', '2026-09-03'),
    null,
  );
});

test('chevauchement de périodes, bornes incluses', () => {
  assert.equal(rangesOverlap('2026-09-01', '2026-09-05', '2026-09-05', '2026-09-08'), true);
  assert.equal(rangesOverlap('2026-09-01', '2026-09-05', '2026-09-06', '2026-09-08'), false);
  assert.equal(rangesOverlap('2026-09-02', '2026-09-03', '2026-09-01', '2026-09-08'), true);
});

test('les montants se lisent groupés par milliers, en espaces insécables', () => {
  assert.equal(formatFcfa(125_000), '125 000 FCFA');
  assert.equal(formatFcfa(900), '900 FCFA');
});
