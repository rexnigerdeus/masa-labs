'use client';

import { formatRange, type Education, type Experience } from '@everyday/cv-core';
import { Button, DateInput, Field, FieldError, LinesArea, TextInput } from './fields';

/**
 * Étapes « Expériences » et « Formation » : une liste de fiches, et une fiche
 * à la fois en édition.
 *
 * L'ancien écran empilait toutes les expériences ouvertes, chacune avec six
 * champs et ses boutons : à la deuxième, on ne savait plus quel champ
 * appartenait à quel poste. Ici la liste ne montre que des résumés ; toucher
 * « Ajouter » ou « Modifier » ouvre un seul formulaire, qu'on enregistre pour
 * revenir à la liste. Le bouton d'enregistrement est le bouton principal de la
 * barre du bas — toujours au même endroit.
 */

type Errors = Record<string, string>;

function EntryCard({ title, subtitle, dates, onEdit, onRemove, incomplete }: {
  title: string;
  subtitle: string;
  dates: string;
  onEdit: () => void;
  onRemove: () => void;
  incomplete: boolean;
}) {
  return (
    <li className={`card flex flex-col gap-3 p-4 ${incomplete ? 'border-danger' : ''}`}>
      <div className="min-w-0">
        <p className="font-semibold">{title.trim() === '' ? 'Sans intitulé' : title}</p>
        {subtitle.trim() !== '' ? <p className="text-sm text-muted">{subtitle}</p> : null}
        {dates !== '' ? <p className="text-sm text-muted">{dates}</p> : null}
        {incomplete ? <p className="mt-1 text-sm font-medium text-danger">À compléter</p> : null}
      </div>
      <div className="flex gap-2">
        <Button onClick={onEdit}>Modifier</Button>
        <Button variant="ghost" onClick={onRemove}>Supprimer</Button>
      </div>
    </li>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent bg-white px-4 text-base font-semibold text-accent-ink hover:bg-accent-soft"
    >
      <span aria-hidden className="text-xl leading-none">+</span>
      {label}
    </button>
  );
}

/* ---------- Expériences ---------- */

export function ExperienceList({ items, isIncomplete, listError, onAdd, onEdit, onRemove }: {
  items: Experience[];
  isIncomplete: (e: Experience) => boolean;
  listError?: string;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((e) => (
            <EntryCard
              key={e.id}
              title={e.role}
              subtitle={[e.company, e.location].filter((v) => v.trim() !== '').join(' — ')}
              dates={formatRange(e.start, e.end, e.current)}
              incomplete={isIncomplete(e)}
              onEdit={() => onEdit(e.id)}
              onRemove={() => {
                if (window.confirm('Supprimer cette expérience ?')) onRemove(e.id);
              }}
            />
          ))}
        </ul>
      ) : null}
      {listError !== undefined ? <FieldError>{listError}</FieldError> : null}
      <AddButton
        label={items.length === 0 ? 'Ajouter une expérience' : 'Ajouter une autre expérience'}
        onClick={onAdd}
      />
      {items.length === 0 ? (
        <p className="text-sm text-muted">
          Pas encore d’expérience ? Ce n’est pas grave : touchez « Passer cette
          étape » en bas de l’écran, votre formation prendra la place.
        </p>
      ) : null}
    </div>
  );
}

export function ExperienceForm({ entry, errors, onChange }: {
  entry: Experience;
  errors: Errors;
  onChange: (patch: Partial<Experience>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Field label="Intitulé du poste" error={errors.role}>
        <TextInput
          value={entry.role}
          invalid={errors.role !== undefined}
          onChange={(v) => onChange({ role: v })}
          placeholder="Ex. : Assistante comptable, Vendeur, Stagiaire RH"
        />
      </Field>
      <Field label="Entreprise ou organisation" error={errors.company}>
        <TextInput
          value={entry.company}
          invalid={errors.company !== undefined}
          onChange={(v) => onChange({ company: v })}
          placeholder="Ex. : Cabinet Diarra"
        />
      </Field>
      <Field label="Ville" optional>
        <TextInput
          value={entry.location}
          onChange={(v) => onChange({ location: v })}
          placeholder="Ex. : Abidjan"
        />
      </Field>
      <DateInput
        label="Début"
        value={entry.start}
        error={errors.start}
        onChange={(v) => onChange({ start: v })}
      />
      <label className="flex min-h-11 items-center gap-3 text-base">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--color-accent-ink)]"
          checked={entry.current}
          onChange={(e) => onChange({ current: e.target.checked, end: null })}
        />
        J’occupe encore ce poste
      </label>
      {entry.current ? null : (
        <DateInput
          label="Fin"
          value={entry.end}
          error={errors.end}
          onChange={(v) => onChange({ end: v })}
        />
      )}
      <Field
        label="Ce que vous avez fait"
        optional
        hint="Une mission par ligne. Commencez par un verbe (Accueilli, Géré, Vendu…) et donnez un chiffre si possible."
      >
        <LinesArea
          items={entry.bullets}
          onChange={(bullets) => onChange({ bullets })}
          rows={5}
          placeholder={'Traité 350 factures par mois\nAccueilli 40 clients par jour'}
        />
      </Field>
    </div>
  );
}

/* ---------- Formation ---------- */

export function EducationList({ items, isIncomplete, listError, onAdd, onEdit, onRemove }: {
  items: Education[];
  isIncomplete: (e: Education) => boolean;
  listError?: string;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((e) => (
            <EntryCard
              key={e.id}
              title={e.degree}
              subtitle={[e.school, e.location].filter((v) => v.trim() !== '').join(' — ')}
              dates={formatRange(e.start, e.end, false)}
              incomplete={isIncomplete(e)}
              onEdit={() => onEdit(e.id)}
              onRemove={() => {
                if (window.confirm('Supprimer cette formation ?')) onRemove(e.id);
              }}
            />
          ))}
        </ul>
      ) : null}
      {listError !== undefined ? <FieldError>{listError}</FieldError> : null}
      <AddButton
        label={items.length === 0 ? 'Ajouter un diplôme' : 'Ajouter un autre diplôme'}
        onClick={onAdd}
      />
    </div>
  );
}

export function EducationForm({ entry, errors, onChange }: {
  entry: Education;
  errors: Errors;
  onChange: (patch: Partial<Education>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <Field label="Diplôme ou formation" error={errors.degree}>
        <TextInput
          value={entry.degree}
          invalid={errors.degree !== undefined}
          onChange={(v) => onChange({ degree: v })}
          placeholder="Ex. : Licence en comptabilité, BTS, BAC série D"
        />
      </Field>
      <Field label="Établissement" error={errors.school}>
        <TextInput
          value={entry.school}
          invalid={errors.school !== undefined}
          onChange={(v) => onChange({ school: v })}
          placeholder="Ex. : Université Félix Houphouët-Boigny"
        />
      </Field>
      <Field label="Ville" optional>
        <TextInput
          value={entry.location}
          onChange={(v) => onChange({ location: v })}
          placeholder="Ex. : Abidjan"
        />
      </Field>
      <DateInput
        label="Année d’obtention (ou prévue)"
        value={entry.end}
        error={errors.end}
        onChange={(v) => onChange({ end: v })}
      />
      <DateInput
        label="Début (facultatif)"
        value={entry.start}
        onChange={(v) => onChange({ start: v })}
      />
      <Field label="Précisions" optional hint="Une par ligne : mention, spécialité, mémoire…">
        <LinesArea
          items={entry.details}
          onChange={(details) => onChange({ details })}
          rows={3}
          placeholder="Mention bien"
        />
      </Field>
    </div>
  );
}
