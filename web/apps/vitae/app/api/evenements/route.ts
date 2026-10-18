import { NextResponse } from 'next/server';
import { createClient, currentUser } from '../../../lib/supabase/server';
import { APP_VERSION } from '../../../lib/config';

/**
 * Réception des événements de mesure (lib/analytics.ts).
 *
 * Une route plutôt qu'une insertion directe depuis le navigateur : la page
 * n'a pas à charger le client Supabase (une trentaine de Ko) pour un compteur,
 * et c'est le serveur qui renseigne `user_id` d'après la session vérifiée et
 * `app_version` d'après le déploiement — deux valeurs qu'on ne demande pas au
 * navigateur de déclarer.
 *
 * Les événements de paiement ne passent pas par ici : ils sont écrits par le
 * webhook Wave, et la base refuse qu'un client les écrive.
 *
 * Réponse 204 dans tous les cas : un `sendBeacon` n'en lit rien, et une mesure
 * perdue ne vaut pas un message d'erreur.
 */

const ALLOWED = new Set([
  'visit', 'cv_started', 'cv_section_completed', 'cv_score_80',
  'cv_pdf_downloaded', 'offer_clicked', 'whatsapp_channel_clicked',
  'waitlist_joined', 'account_created', 'paywall_viewed', 'checkout_started',
]);

const MAX_BODY = 4_000;

function short(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim().slice(0, max) : null;
}

/** Propriétés réduites à des scalaires courts : rien d'imbriqué, rien de long. */
function cleanProps(value: unknown): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (typeof value !== 'object' || value === null) return out;
  for (const [key, v] of Object.entries(value).slice(0, 12)) {
    const k = key.slice(0, 40);
    if (typeof v === 'string') out[k] = v.slice(0, 120);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean' || v === null) out[k] = v;
  }
  return out;
}

export async function POST(request: Request): Promise<Response> {
  const done = new NextResponse(null, { status: 204 });
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return done;
    const body = JSON.parse(text) as Record<string, unknown>;
    const event = short(body.event, 40);
    if (event === null || !ALLOWED.has(event)) return done;

    const user = await currentUser();
    const supabase = await createClient();
    await supabase.from('vitae_events').insert({
      event,
      user_id: user?.id ?? null,
      anon_id: short(body.anonId, 64),
      ref: short(body.ref, 64),
      utm_source: short(body.utmSource, 100),
      utm_campaign: short(body.utmCampaign, 100),
      app_version: APP_VERSION,
      meta: cleanProps(body.props),
    });
  } catch {
    // Corps illisible ou base indisponible : rien à signaler.
  }
  return done;
}
