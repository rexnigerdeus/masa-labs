import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Wave Business — API Checkout. Serveur uniquement.
 *
 * Tout ce qui suit vient de la documentation officielle, consultée le
 * 18/10/2026, et rien d'autre (brief v2 : « l'agent n'invente aucun détail
 * d'API ») :
 *
 * - https://docs.wave.com/checkout
 *   `POST https://api.wave.com/v1/checkout/sessions`, en-tête
 *   `Authorization: Bearer <clé>`, corps `amount` (chaîne, sans décimale en
 *   XOF), `currency`, `success_url` et `error_url` (https obligatoire),
 *   `client_reference` (255 caractères au plus). Réponse : `id` (`cos-…`),
 *   `wave_launch_url`, `checkout_status`, `payment_status`, `when_expires`
 *   (30 minutes par défaut).
 * - https://docs.wave.com/webhook
 *   En-tête `Wave-Signature: t=<horodatage>,v1=<signature>[,v1=…]`.
 *   Signature = HMAC-SHA256 hexadécimal de `horodatage + corps brut`, avec
 *   le secret de signature du webhook. Rejeter au-delà de 5 minutes. Les
 *   événements peuvent arriver en double ou dans le désordre : dédoublonner.
 *   Types utilisés : `checkout.session.completed`,
 *   `checkout.session.payment_failed`.
 *
 * Non géré : la signature des requêtes sortantes, que Wave n'exige que si
 * l'option est activée sur la clé. Créer la clé API sans cette option.
 */

const API = 'https://api.wave.com/v1/checkout/sessions';
const MAX_SKEW_SECONDS = 5 * 60;

export interface CheckoutSession {
  id: string;
  waveLaunchUrl: string;
}

export class WaveError extends Error {}

/** Crée une session de paiement. Lève `WaveError` si Wave refuse ou ne répond pas. */
export async function createCheckoutSession(input: {
  amountXof: number;
  clientReference: string;
  successUrl: string;
  errorUrl: string;
}): Promise<CheckoutSession> {
  const key = process.env.WAVE_API_KEY;
  if (key === undefined || key === '') throw new WaveError('WAVE_API_KEY absente');

  let response: Response;
  try {
    response = await fetch(API, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        amount: String(Math.round(input.amountXof)),
        currency: 'XOF',
        success_url: input.successUrl,
        error_url: input.errorUrl,
        client_reference: input.clientReference,
      }),
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
  } catch (error) {
    throw new WaveError(`Wave injoignable : ${String(error)}`);
  }

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const id = body?.id;
  const url = body?.wave_launch_url;
  if (!response.ok || typeof id !== 'string' || typeof url !== 'string') {
    throw new WaveError(`Wave a refusé la session (HTTP ${response.status})`);
  }
  return { id, waveLaunchUrl: url };
}

/**
 * Vérifie l'en-tête `Wave-Signature` d'un webhook sur le corps BRUT (avant
 * tout `JSON.parse` : la signature dépend de l'ordre des clés et des espaces).
 */
export function verifyWaveSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds: number = Date.now() / 1000,
): boolean {
  if (header === null || secret === '') return false;
  const parts = header.split(',').map((p) => p.trim());
  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
  const signatures = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (timestamp === undefined || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > MAX_SKEW_SECONDS) return false;

  const expected = Buffer.from(
    createHmac('sha256', secret).update(timestamp + rawBody).digest('hex'),
  );
  return signatures.some((signature) => {
    const given = Buffer.from(signature);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
