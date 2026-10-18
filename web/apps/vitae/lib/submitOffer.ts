'use server';

import { createClient } from './supabase/server';
import { JOB_CATEGORIES } from './catalog';

/**
 * « Publier une offre gratuitement » (brief v2, offres §6).
 *
 * L'offre est créée au statut `pending` par la fonction SQL
 * `vitae_submit_offer`, qui range à part le contact de l'annonceur (jamais
 * publié) et refuse un doublon. Elle n'apparaît dans /offres qu'après
 * validation dans /admin/offres.
 *
 * Les vérifications sont faites ici pour répondre champ par champ, et refaites
 * par la base, qui ne fait pas confiance au formulaire.
 */

export interface SubmitOfferState {
  status: 'idle' | 'ok' | 'error';
  errors?: Partial<Record<SubmitField, string>>;
  message?: string;
}

export type SubmitField =
  | 'company' | 'title' | 'type' | 'level' | 'city' | 'sector' | 'apply' | 'deadline' | 'contact';

const LEVELS = new Set(['stage', 'debutant', 'confirme', 'senior']);
const EMAIL = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

/**
 * Lien ou e-mail de candidature → valeur acceptée par la base : une adresse
 * devient un lien `mailto:`, un lien doit mener à l'offre elle-même (au
 * moins un chemin après le domaine), pas à la page d'accueil du site.
 */
export async function normalizeApply(raw: string): Promise<string | null> {
  const value = raw.trim();
  if (EMAIL.test(value)) return `mailto:${value}`;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) return null;
    if (url.pathname.replace(/\/+$/, '') === '') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function submitOffer(_prev: SubmitOfferState, form: FormData): Promise<SubmitOfferState> {
  const get = (name: SubmitField): string => String(form.get(name) ?? '').trim();
  const errors: Partial<Record<SubmitField, string>> = {};

  const company = get('company');
  const title = get('title');
  const type = get('type');
  const level = get('level');
  const city = get('city');
  const sector = get('sector');
  const contact = get('contact');
  const deadline = get('deadline');
  const apply = await normalizeApply(get('apply'));

  if (company.length < 2) errors.company = 'Indiquez le nom de la structure.';
  if (title.length < 5) errors.title = 'Indiquez l’intitulé du poste.';
  if (type !== 'stage' && type !== 'emploi') errors.type = 'Choisissez stage ou emploi.';
  if (!LEVELS.has(level)) errors.level = 'Choisissez le niveau attendu.';
  if (city.length < 2) errors.city = 'Indiquez la ville ou la commune.';
  if (!(sector in JOB_CATEGORIES)) errors.sector = 'Choisissez un secteur.';
  if (apply === null) {
    errors.apply = 'Donnez le lien de l’offre elle-même, ou une adresse e-mail de candidature.';
  }
  if (deadline !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || deadline < new Date().toISOString().slice(0, 10))) {
    errors.deadline = 'La date limite doit être aujourd’hui ou plus tard.';
  }
  if (contact.length < 3) errors.contact = 'Laissez un numéro ou un e-mail pour vous joindre.';

  if (Object.keys(errors).length > 0) return { status: 'error', errors };

  const supabase = await createClient();
  const { error } = await supabase.rpc('vitae_submit_offer', {
    p_company: company.slice(0, 120),
    p_title: title.slice(0, 160),
    p_type: type,
    p_level: level,
    p_city: city.slice(0, 80),
    p_sector: sector,
    p_apply: apply,
    p_deadline: deadline === '' ? null : deadline,
    p_contact: contact.slice(0, 200),
  });

  if (error !== null) {
    return {
      status: 'error',
      message: 'L’envoi n’a pas abouti. Vérifiez le lien de candidature, puis réessayez.',
    };
  }
  return { status: 'ok' };
}
