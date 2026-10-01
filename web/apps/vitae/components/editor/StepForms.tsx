'use client';

import type { LanguageLevel, Resume } from '@everyday/cv-core';
import { Field, FieldError, LinesArea, TagInput, TextArea, TextInput } from './fields';
import { PhotoField } from './PhotoField';

/**
 * Contenu des étapes courtes du parcours : deux à trois champs par écran.
 *
 * Chaque composant reçoit le CV et une fonction de mise à jour, jamais d'état
 * propre : le CV reste l'unique source, l'aperçu et le score en dérivent.
 */

type Update = (patch: Partial<Resume>) => void;
type Errors = Record<string, string>;

const newId = (): string => crypto.randomUUID();

export function IdentityStep({ resume, update, errors }: {
  resume: Resume; update: Update; errors: Errors;
}) {
  return (
    <>
      <Field label="Prénom et nom" error={errors.fullName}>
        <TextInput
          value={resume.personal.fullName}
          invalid={errors.fullName !== undefined}
          autoComplete="name"
          onChange={(v) => update({ personal: { ...resume.personal, fullName: v } })}
          placeholder="Ex. : Aya Koffi"
        />
      </Field>
      <Field
        label="Le poste que vous cherchez"
        error={errors.headline}
        hint="Quelques mots, pas une phrase. Ex. : Stagiaire en comptabilité, Commercial terrain."
      >
        <TextInput
          value={resume.headline}
          invalid={errors.headline !== undefined}
          onChange={(v) => update({ headline: v })}
          placeholder="Ex. : Assistante comptable junior"
        />
      </Field>
    </>
  );
}

export function ContactStep({ resume, update, errors }: {
  resume: Resume; update: Update; errors: Errors;
}) {
  const p = resume.personal;
  return (
    <>
      <Field label="Téléphone" error={errors.phone}>
        <TextInput
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={p.phone}
          invalid={errors.phone !== undefined}
          onChange={(v) => update({ personal: { ...p, phone: v } })}
          placeholder="+225 07 00 00 00 00"
        />
      </Field>
      <Field label="Email" error={errors.email}>
        <TextInput
          type="email"
          inputMode="email"
          autoComplete="email"
          value={p.email}
          invalid={errors.email !== undefined}
          onChange={(v) => update({ personal: { ...p, email: v } })}
          placeholder="aya.koffi@gmail.com"
        />
      </Field>
      <Field label="Ville" optional hint="Les recruteurs cherchent souvent par ville.">
        <TextInput
          autoComplete="address-level2"
          value={p.location}
          onChange={(v) => update({ personal: { ...p, location: v } })}
          placeholder="Abidjan, Côte d’Ivoire"
        />
      </Field>
    </>
  );
}

export function PhotoStep({ resume, update }: { resume: Resume; update: Update }) {
  return (
    <PhotoField
      photo={resume.personal.photo}
      showPhoto={resume.personal.showPhoto}
      fullName={resume.personal.fullName}
      onChange={(patch) => update({ personal: { ...resume.personal, ...patch } })}
    />
  );
}

const SUMMARY_EXAMPLE =
  'Étudiante en licence de comptabilité, rigoureuse et à l’aise avec Excel, '
  + 'je cherche un stage de six mois en cabinet pour mettre en pratique la '
  + 'saisie et le rapprochement bancaire.';

export function SummaryStep({ resume, update }: { resume: Resume; update: Update }) {
  const words = resume.summary.trim() === '' ? 0 : resume.summary.trim().split(/\s+/).length;
  return (
    <>
      <Field label="Votre présentation" hint="2 à 4 phrases suffisent.">
        <TextArea
          rows={6}
          value={resume.summary}
          onChange={(v) => update({ summary: v })}
          placeholder="Qui êtes-vous ? Que savez-vous faire ? Que cherchez-vous ?"
        />
      </Field>
      <p className="-mt-2 text-sm text-muted" aria-live="polite">
        {words === 0 ? 'Aucun mot pour l’instant.' : `${words} mot${words > 1 ? 's' : ''}.`}
      </p>
      <div className="rounded-xl bg-accent-soft/60 p-4 text-sm">
        <p className="font-semibold">Exemple</p>
        <p className="mt-1 text-ink/80">« {SUMMARY_EXAMPLE} »</p>
        {resume.summary.trim() === '' ? (
          <button
            type="button"
            className="mt-2 min-h-11 font-semibold text-accent-ink underline underline-offset-4"
            onClick={() => update({ summary: SUMMARY_EXAMPLE })}
          >
            Partir de cet exemple et le modifier
          </button>
        ) : null}
      </div>
    </>
  );
}

/** Compétences proposées d'un toucher : les plus demandées, tous métiers confondus. */
const SKILL_SUGGESTIONS = [
  'Word', 'Excel', 'PowerPoint', 'Travail en équipe', 'Rigueur', 'Autonomie',
  'Sens de l’organisation', 'Communication', 'Service client', 'Ponctualité',
];

export function SkillsStep({ resume, update }: { resume: Resume; update: Update }) {
  return (
    <Field label="Vos compétences" hint="Séparez-les par des virgules. Visez 6 à 10.">
      <TagInput
        items={resume.skills}
        onChange={(skills) => update({ skills })}
        placeholder="Ex. : Sage 100, Excel, Vente, Rigueur"
        suggestions={SKILL_SUGGESTIONS}
      />
    </Field>
  );
}

const LEVELS: { value: LanguageLevel; label: string }[] = [
  { value: 'natif', label: 'Langue maternelle' },
  { value: 'courant', label: 'Courant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'debutant', label: 'Notions' },
];

const COMMON_LANGUAGES = ['Français', 'Anglais'];

export function LanguagesStep({ resume, update, errors }: {
  resume: Resume; update: Update; errors: Errors;
}) {
  const names = resume.languages.map((l) => l.name.trim().toLowerCase());
  const quick = COMMON_LANGUAGES.filter((l) => !names.includes(l.toLowerCase()));
  const add = (name: string): void => update({
    languages: [
      ...resume.languages,
      { id: newId(), name, level: name === 'Français' ? 'natif' : 'intermediaire' },
    ],
  });

  return (
    <>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 text-sm font-semibold">Langues</legend>
        {resume.languages.map((lang) => (
          <div key={lang.id} className="card flex flex-col gap-2 p-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <TextInput
                  value={lang.name}
                  invalid={errors.languages !== undefined && lang.name.trim() === ''}
                  onChange={(v) => update({
                    languages: resume.languages.map((l) => (l.id === lang.id ? { ...l, name: v } : l)),
                  })}
                  placeholder="Nom de la langue"
                />
              </div>
              <button
                type="button"
                aria-label={`Retirer ${lang.name || 'cette langue'}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink"
                onClick={() => update({ languages: resume.languages.filter((l) => l.id !== lang.id) })}
              >
                <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
            <select
              className="w-full rounded-xl border border-line bg-white px-3.5 py-3 text-base"
              value={lang.level}
              aria-label={`Niveau en ${lang.name || 'cette langue'}`}
              onChange={(e) => update({
                languages: resume.languages.map((l) => (l.id === lang.id
                  ? { ...l, level: e.target.value as LanguageLevel }
                  : l)),
              })}
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        ))}
        {errors.languages !== undefined ? <FieldError>{errors.languages}</FieldError> : null}
        <div className="flex flex-wrap gap-2">
          {quick.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => add(name)}
              className="min-h-11 rounded-full border-2 border-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-soft"
            >
              + {name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => add('')}
            className="min-h-11 rounded-full border-2 border-dashed border-line px-4 text-sm font-semibold hover:border-accent"
          >
            + Autre langue
          </button>
        </div>
      </fieldset>

      <Field
        label="Certifications"
        optional
        hint="Une par ligne. Ex. : Certificat Sage 100, TOEIC 750, Permis B."
      >
        <LinesArea
          items={resume.certifications.map((c) => c.name)}
          rows={3}
          placeholder="Certificat Sage 100 Comptabilité"
          onChange={(names) => update({
            // Rapprochement par position : c'est ainsi que la saisie ligne à
            // ligne se comporte, et l'émetteur ou la date déjà connus d'une
            // certification la suivent tant qu'elle garde sa place.
            certifications: names.map((name, i) => ({
              id: resume.certifications[i]?.id ?? newId(),
              name,
              issuer: resume.certifications[i]?.issuer ?? '',
              date: resume.certifications[i]?.date ?? null,
            })),
          })}
        />
      </Field>
    </>
  );
}
