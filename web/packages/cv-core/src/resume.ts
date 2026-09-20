import { normalizeAccent } from './colors.ts';
import { TEMPLATES } from './templates.ts';
import type { Resume, SchemaVersion, TemplateId } from './types.ts';

/**
 * Fabrique et remise en forme d'un CV.
 *
 * Un CV arrive de trois endroits qui échappent au typage : le brouillon
 * `localStorage`, la colonne `jsonb` en base, et le corps de la requête
 * d'export. `normalizeResume` est le seul point d'entrée de ces trois chemins —
 * il complète les champs ajoutés depuis, remplace les valeurs aberrantes, et
 * rend un `Resume` sur lequel les renderers peuvent compter sans garde.
 */

/** Version produite par cette version du code. */
export const CURRENT_SCHEMA_VERSION: SchemaVersion = 2;

/** Taille maximale d'une photo acceptée, en caractères de data URL (~2 Mo). */
const MAX_PHOTO_CHARS = 2_800_000;

export function emptyResume(templateId: TemplateId = 'classique'): Resume {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    templateId,
    accentColor: TEMPLATES[templateId].defaultAccent,
    personal: {
      fullName: '', location: '', phone: '', email: '', links: [],
      photo: null, showPhoto: true,
    },
    headline: '',
    summary: '',
    experiences: [],
    education: [],
    skills: [],
    languages: [],
    certifications: [],
    projects: [],
  };
}

function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && Object.hasOwn(TEMPLATES, value);
}

/**
 * Photo exploitable, ou `null`.
 *
 * On n'accepte qu'une data URL d'image : la valeur part telle quelle dans une
 * balise `<img>` de l'aperçu et dans le PDF, et une chaîne arbitraire venue
 * d'un brouillon trafiqué n'a rien à y faire. La borne de taille protège le
 * rendu PDF, qui décode l'image en mémoire sur le serveur.
 */
function normalizePhoto(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('data:image/')) return null;
  if (value.length > MAX_PHOTO_CHARS) return null;
  return value;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/**
 * Remet un CV inconnu en forme, ou rend `null` s'il n'en est pas un.
 *
 * Volontairement tolérant sur le contenu et strict sur la structure : le but
 * n'est pas de valider la saisie — le scoring s'en charge — mais d'éviter
 * qu'un brouillon d'une version antérieure fasse planter l'éditeur ou l'export.
 */
export function normalizeResume(value: unknown): Resume | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Partial<Resume> & Record<string, unknown>;

  if (v.schemaVersion !== 1 && v.schemaVersion !== 2) return null;
  if (typeof v.personal !== 'object' || v.personal === null) return null;
  if (!Array.isArray(v.experiences) || !Array.isArray(v.education)
    || !Array.isArray(v.skills)) return null;

  const templateId: TemplateId = isTemplateId(v.templateId) ? v.templateId : 'classique';
  const personal = v.personal as Partial<Resume['personal']>;
  const base = emptyResume(templateId);

  return {
    ...base,
    ...v,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    templateId,
    // Un CV d'avant la couleur primaire hérite de celle de son modèle.
    accentColor: normalizeAccent(v.accentColor, TEMPLATES[templateId].defaultAccent),
    personal: {
      ...base.personal,
      ...personal,
      links: strings(personal.links),
      photo: normalizePhoto(personal.photo),
      showPhoto: personal.showPhoto !== false,
    },
    languages: Array.isArray(v.languages) ? v.languages : [],
    certifications: Array.isArray(v.certifications) ? v.certifications : [],
    projects: Array.isArray(v.projects) ? v.projects : [],
    skills: strings(v.skills),
  };
}
