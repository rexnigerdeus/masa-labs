/**
 * Catalogue des identités (« Qui veux-tu devenir ? », brief §8.A.2) et des
 * habitudes suggérées pour chacune.
 *
 * Principe hérité d'Atomic Habits : on choisit d'abord qui l'on veut
 * devenir, l'habitude n'est qu'une preuve quotidienne de cette identité.
 * D'où la formulation « Quelqu'un qui… », qui évite aussi d'accorder au
 * masculin ou au féminin.
 *
 * Chaque suggestion est **volontairement minuscule** (brief §2, « commence
 * minuscule ») : deux minutes, une page, un verre. Le but des premières
 * semaines est de ne jamais rater, pas de performer.
 *
 * Les identifiants sont stockés tels quels en base (`sowly_profiles.
 * identities`, `sowly_habits.identity`) : on peut en ajouter, jamais en
 * renommer un sans migration de données.
 */

import type { Moment } from './model.ts';

export interface Suggestion {
  action: string;
  moment: Moment;
  cue: string;
}

export interface Identity {
  id: string;
  /** Complète « Je veux devenir… » */
  label: string;
  /** Forme courte, pour les étiquettes. */
  short: string;
  suggestions: Suggestion[];
}

export const IDENTITIES: readonly Identity[] = [
  {
    id: 'lecture',
    label: 'Quelqu’un qui lit',
    short: 'Lecture',
    suggestions: [
      { action: 'Lire une page', moment: 'soir', cue: 'au coucher' },
      { action: 'Lire 10 minutes', moment: 'matin', cue: 'avec le café' },
      { action: 'Noter une idée tirée d’un livre', moment: 'soir', cue: 'après le dîner' },
    ],
  },
  {
    id: 'mouvement',
    label: 'Quelqu’un qui bouge',
    short: 'Mouvement',
    suggestions: [
      { action: 'Faire 5 pompes', moment: 'matin', cue: 'au réveil' },
      { action: 'Marcher 10 minutes', moment: 'journee', cue: 'après le déjeuner' },
      { action: 'S’étirer 2 minutes', moment: 'soir', cue: 'avant de dormir' },
    ],
  },
  {
    id: 'serenite',
    label: 'Quelqu’un de serein',
    short: 'Sérénité',
    suggestions: [
      { action: 'Respirer calmement 1 minute', moment: 'matin', cue: 'au réveil' },
      { action: 'Écrire une chose positive de la journée', moment: 'soir', cue: 'au coucher' },
      { action: 'Poser le téléphone 30 minutes', moment: 'soir', cue: 'après le dîner' },
    ],
  },
  {
    id: 'sante',
    label: 'Quelqu’un qui prend soin de son corps',
    short: 'Santé',
    suggestions: [
      { action: 'Boire un verre d’eau', moment: 'matin', cue: 'au réveil' },
      { action: 'Manger un fruit', moment: 'journee', cue: 'au goûter' },
      { action: 'Se coucher avant 23 h', moment: 'soir', cue: '' },
    ],
  },
  {
    id: 'organisation',
    label: 'Quelqu’un d’organisé',
    short: 'Organisation',
    suggestions: [
      { action: 'Choisir les 3 tâches du jour', moment: 'matin', cue: 'avant d’ouvrir mes messages' },
      { action: 'Ranger mon bureau 2 minutes', moment: 'soir', cue: 'en fin de journée' },
      { action: 'Noter mes dépenses du jour', moment: 'soir', cue: 'après le dîner' },
    ],
  },
  {
    id: 'apprentissage',
    label: 'Quelqu’un qui apprend',
    short: 'Apprentissage',
    suggestions: [
      { action: 'Apprendre 5 mots d’une langue', moment: 'matin', cue: 'dans le trajet' },
      { action: 'Regarder un cours de 10 minutes', moment: 'soir', cue: 'après le dîner' },
      { action: 'Réviser une fiche', moment: 'journee', cue: 'à la pause' },
    ],
  },
  {
    id: 'creation',
    label: 'Quelqu’un qui crée',
    short: 'Création',
    suggestions: [
      { action: 'Écrire 3 phrases', moment: 'matin', cue: 'avec le café' },
      { action: 'Dessiner 5 minutes', moment: 'soir', cue: 'après le dîner' },
      { action: 'Jouer de mon instrument 5 minutes', moment: 'soir', cue: 'en rentrant' },
    ],
  },
  {
    id: 'proches',
    label: 'Quelqu’un de présent pour les siens',
    short: 'Proches',
    suggestions: [
      { action: 'Envoyer un message à un proche', moment: 'journee', cue: 'à la pause' },
      { action: 'Dîner sans téléphone', moment: 'soir', cue: '' },
      { action: 'Prendre des nouvelles d’un parent', moment: 'soir', cue: 'en rentrant' },
    ],
  },
];

const BY_ID = new Map(IDENTITIES.map((i) => [i.id, i]));

export function identityById(id: string | null): Identity | null {
  return id === null ? null : BY_ID.get(id) ?? null;
}

/** Nombre d'identités qu'on peut choisir à l'onboarding (brief §8.A.2 : 2 ou 3). */
export const MAX_IDENTITIES = 3;
