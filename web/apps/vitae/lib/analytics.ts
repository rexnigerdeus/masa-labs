/**
 * Mesure d'audience (brief v2, « Mesure et liens ambassadeurs »).
 *
 * Fait main, sans outil tiers : un outil de mesure pèserait plus lourd que
 * l'éditeur sur un Android d'entrée de gamme, et enverrait le parcours de nos
 * utilisateurs à quelqu'un d'autre. Ici, trois choses seulement :
 *
 * - `anon_id` : identifiant tiré au hasard à la première visite, gardé dans le
 *   stockage local. Il ne dit rien de la personne ; il permet de compter
 *   « une personne » plutôt que « un clic ».
 * - `ref` : code ambassadeur ou canal lu dans l'URL (`?ref=INJS-AMINA`). Le
 *   premier reçu est gardé 30 jours ; un second lien ne l'écrase pas.
 * - `utm_source`, `utm_campaign`, gardés avec le `ref` s'ils sont présents.
 *
 * Aucune donnée personnelle dans les événements : jamais de nom, de numéro ni
 * de contenu de CV dans `props`. L'envoi passe par `sendBeacon`, qui part même
 * si la page se ferme et ne retarde jamais le geste de l'utilisateur. Une
 * mesure qui échoue est perdue en silence : elle ne doit rien casser.
 *
 * Module navigateur uniquement : chaque fonction se tait côté serveur.
 */

export type ClientEvent =
  | 'visit'
  | 'cv_started'
  | 'cv_section_completed'
  | 'cv_score_80'
  | 'cv_pdf_downloaded'
  | 'offer_clicked'
  | 'whatsapp_channel_clicked'
  | 'waitlist_joined'
  | 'account_created'
  | 'paywall_viewed'
  | 'checkout_started';

export type EventProps = Record<string, string | number | boolean | null>;

const ANON_KEY = 'vitae.anon.v1';
const ATTRIBUTION_KEY = 'vitae.ref.v1';
const ONCE_PREFIX = 'vitae.once.';
const VISIT_KEY = 'vitae.visit.v1';
const REF_TTL_MS = 30 * 86_400_000;

interface Attribution {
  ref: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  /** Date de réception, en millisecondes. */
  at: number;
}

/** Valeur d'URL réduite à ce qu'on accepte d'enregistrer. */
function clean(value: string | null, max: number): string | null {
  if (value === null) return null;
  const v = value.trim().replace(/[^\p{L}\p{N}_.-]/gu, '').slice(0, max);
  return v === '' ? null : v;
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    // Navigation privée stricte : pas de stockage, pas de mesure persistante.
    return null;
  }
}

let memoryAnonId: string | null = null;

export function anonId(): string {
  const store = storage();
  try {
    const existing = store?.getItem(ANON_KEY);
    if (existing) return existing;
  } catch {
    // Lecture refusée : on retombe sur un identifiant de session.
  }
  const id = memoryAnonId ?? crypto.randomUUID();
  memoryAnonId = id;
  try {
    store?.setItem(ANON_KEY, id);
  } catch {
    // Quota ou refus : l'identifiant vivra le temps de la page.
  }
  return id;
}

function readAttribution(): Attribution | null {
  try {
    const raw = storage()?.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Attribution;
    return Date.now() - parsed.at > REF_TTL_MS ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Lit `ref` et les UTM de l'URL courante. Le premier code reçu gagne pendant
 * 30 jours : un ambassadeur qui a amené quelqu'un ne se le fait pas reprendre
 * par le lien suivant.
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const incoming: Attribution = {
    ref: clean(params.get('ref'), 64),
    utmSource: clean(params.get('utm_source'), 100),
    utmCampaign: clean(params.get('utm_campaign'), 100),
    at: Date.now(),
  };
  if (incoming.ref === null && incoming.utmSource === null && incoming.utmCampaign === null) return;
  if (readAttribution() !== null) return;
  try {
    storage()?.setItem(ATTRIBUTION_KEY, JSON.stringify(incoming));
  } catch {
    // Stockage refusé : l'attribution est perdue, la visite ne l'est pas.
  }
}

/** Envoie un événement. Ne lève jamais. */
export function track(event: ClientEvent, props: EventProps = {}): void {
  if (typeof window === 'undefined') return;
  try {
    const attribution = readAttribution();
    const body = JSON.stringify({
      event,
      props,
      anonId: anonId(),
      ref: attribution?.ref ?? null,
      utmSource: attribution?.utmSource ?? null,
      utmCampaign: attribution?.utmCampaign ?? null,
    });
    const blob = new Blob([body], { type: 'application/json' });
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon('/api/evenements', blob)) {
      return;
    }
    void fetch('/api/evenements', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Hors ligne : l'événement est perdu, c'est accepté.
    });
  } catch {
    // Une mesure ne casse jamais un parcours.
  }
}

/**
 * true la première fois qu'on la demande pour cette clé dans ce navigateur,
 * false ensuite. Sans stockage, toujours true : on préfère un doublon à un
 * trou dans l'entonnoir.
 */
export function firstTime(key: string): boolean {
  const store = storage();
  try {
    if (store === null) return true;
    if (store.getItem(ONCE_PREFIX + key) !== null) return false;
    store.setItem(ONCE_PREFIX + key, '1');
  } catch {
    // Stockage refusé : voir plus haut.
  }
  return true;
}

/**
 * Envoie un événement une seule fois par navigateur pour une clé donnée
 * (« CV commencé », « score 80 atteint pour la première fois »).
 */
export function trackOnce(key: string, event: ClientEvent, props: EventProps = {}): void {
  if (firstTime(key)) track(event, props);
}

/** Une visite par session de navigation : de quoi calculer les retours. */
export function trackVisit(): void {
  try {
    if (window.sessionStorage.getItem(VISIT_KEY) !== null) return;
    window.sessionStorage.setItem(VISIT_KEY, '1');
  } catch {
    // Sans sessionStorage, une visite par page : surcompte accepté.
  }
  track('visit', { page: window.location.pathname.slice(0, 60) });
}
