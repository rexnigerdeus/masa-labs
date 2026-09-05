'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SECTION_LABELS,
  scoreResume,
  TEMPLATE_LIST,
  type Education,
  type Experience,
  type LanguageLevel,
  type Resume,
  type SectionId,
  type TemplateId,
} from '@everyday/cv-core';
import { ResumePreview } from '../ResumePreview';
import { ScorePanel } from '../ScorePanel';
import { Button, DateInput, Field, LineList, TagInput, TextArea, TextInput } from './fields';
import { loadDraft, saveDraft } from '../../lib/draft';
import { saveResume } from '../../lib/resumes';

/**
 * Éditeur de CV.
 *
 * Un seul état : le `Resume`. Le score et l'aperçu en sont dérivés à chaque
 * rendu — pas de synchronisation à maintenir, donc pas de dérive possible entre
 * ce que l'utilisateur voit et ce qu'il télécharge.
 *
 * Deux lieux de stockage, une règle d'arbitrage simple : le brouillon local
 * gagne dès qu'il contient quelque chose. Quelqu'un qui vient de remplir son CV
 * puis s'inscrit pour le télécharger ne doit pas le voir écrasé par une version
 * enregistrée l'an dernier ; le CV du serveur ne reprend la main que sur un
 * navigateur où rien n'a été saisi.
 */

/** Identifiant local d'une entrée. `crypto.randomUUID` est disponible partout où la PWA tourne. */
const newId = (): string => crypto.randomUUID();

const EMPTY_EXPERIENCE = (): Experience => ({
  id: newId(), role: '', company: '', location: '',
  start: null, end: null, current: false, bullets: [''],
});

const EMPTY_EDUCATION = (): Education => ({
  id: newId(), degree: '', school: '', location: '', start: null, end: null, details: [],
});

const LEVELS: { value: LanguageLevel; label: string }[] = [
  { value: 'natif', label: 'Langue maternelle' },
  { value: 'courant', label: 'Courant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'debutant', label: 'Notions' },
];

/** Ordre de saisie. « headline » est fusionné avec l'identité : c'est un seul écran mental. */
const STEPS: { id: SectionId; label: string }[] = [
  { id: 'personal', label: 'Vous' },
  { id: 'summary', label: 'Résumé' },
  { id: 'experience', label: 'Expérience' },
  { id: 'education', label: 'Formation' },
  { id: 'skills', label: 'Compétences' },
  { id: 'extras', label: 'Autres' },
];

/** true si l'utilisateur a réellement saisi quelque chose. */
function hasContent(resume: Resume): boolean {
  return (
    resume.personal.fullName.trim() !== ''
    || resume.headline.trim() !== ''
    || resume.summary.trim() !== ''
    || resume.experiences.length > 0
    || resume.education.length > 0
    || resume.skills.length > 0
  );
}

export function ResumeEditor({ signedIn, stored }: {
  signedIn: boolean;
  stored: { id: string; data: Resume } | null;
}) {
  const [resume, setResume] = useState<Resume | null>(null);
  const [step, setStep] = useState<SectionId>('personal');
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const resumeId = useRef<string | null>(stored?.id ?? null);

  // Le brouillon est lu après le montage : le rendu serveur ne connaît pas
  // le localStorage, et rendre un CV vide puis le remplacer provoquerait une
  // désynchronisation d'hydratation.
  useEffect(() => {
    const draft = loadDraft();
    setResume(hasContent(draft) || stored === null ? draft : stored.data);
  }, [stored]);

  // Sauvegarde différée : inutile d'écrire à chaque frappe.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (resume === null) return;
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraft(resume);
      // Le local est écrit d'abord, et sans condition : la copie en ligne est
      // un confort, elle ne doit jamais être le seul exemplaire.
      if (!signedIn || !hasContent(resume)) return;
      void saveResume(resume, resumeId.current).then((outcome) => {
        if (outcome.ok) {
          resumeId.current = outcome.id ?? resumeId.current;
          setSyncError(null);
        } else {
          setSyncError(outcome.error ?? null);
        }
      });
    }, 800);
    return () => {
      if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    };
  }, [resume, signedIn]);

  const score = useMemo(() => (resume === null ? null : scoreResume(resume)), [resume]);

  if (resume === null || score === null) {
    return <p className="p-8 text-sm text-muted">Chargement de votre CV…</p>;
  }

  const update = (patch: Partial<Resume>): void => setResume({ ...resume, ...patch });

  const updateExperience = (id: string, patch: Partial<Experience>): void =>
    update({ experiences: resume.experiences.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  const updateEducation = (id: string, patch: Partial<Education>): void =>
    update({ education: resume.education.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  async function download(): Promise<void> {
    if (resume === null) return;
    setExporting(true);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(resume),
      });
      if (response.status === 401) {
        // Le compte n'est exigé qu'ici : le brouillon est déjà en local, on
        // renvoie vers l'inscription et l'utilisateur reprend où il en était.
        window.location.href = '/connexion?suite=telechargement';
        return;
      }
      if (!response.ok) throw new Error(`export ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.headers.get('x-filename') ?? 'CV.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start">
      <div className="flex flex-col gap-4">
        {/* Navigation par section : la barre de progression du remplissage. */}
        <nav className="flex flex-wrap gap-2" aria-label="Sections du CV">
          {STEPS.map((s) => {
            const sectionScore = score.sections.find((x) => x.id === s.id);
            const active = s.id === step;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                aria-current={active ? 'step' : undefined}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  active ? 'bg-header text-white' : 'border border-line bg-white'
                }`}
              >
                {s.label}
                {sectionScore !== undefined && !sectionScore.empty ? (
                  <span className="ml-1.5 text-xs opacity-70">{sectionScore.score}</span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* En dessous de `lg`, la colonne de droite passe sous le formulaire :
            l'aperçu serait hors de vue pendant la saisie. On le replie donc, et
            on le montre ici, juste sous la navigation, quand l'utilisateur le
            demande. Au-delà de `lg`, il est visible en permanence à droite. */}
        <div className="lg:hidden">
          <Button onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? 'Masquer l’aperçu' : 'Voir l’aperçu du CV'}
          </Button>
          {showPreview ? (
            <div className="mt-3">
              <ResumePreview resume={resume} />
            </div>
          ) : null}
        </div>

        <section className="card flex flex-col gap-4 p-4">
          <h2 className="text-base font-semibold">{SECTION_LABELS[step]}</h2>

          {step === 'personal' ? (
            <>
              <Field label="Nom complet">
                <TextInput
                  value={resume.personal.fullName}
                  onChange={(v) => update({ personal: { ...resume.personal, fullName: v } })}
                  placeholder="Aya Koffi"
                />
              </Field>
              <Field label="Titre professionnel" hint="Le poste que vous visez, en quelques mots.">
                <TextInput
                  value={resume.headline}
                  onChange={(v) => update({ headline: v })}
                  placeholder="Comptable junior spécialisée en comptabilité fournisseurs"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ville">
                  <TextInput
                    value={resume.personal.location}
                    onChange={(v) => update({ personal: { ...resume.personal, location: v } })}
                    placeholder="Abidjan, Côte d’Ivoire"
                  />
                </Field>
                <Field label="Téléphone">
                  <TextInput
                    type="tel"
                    value={resume.personal.phone}
                    onChange={(v) => update({ personal: { ...resume.personal, phone: v } })}
                    placeholder="+225 07 00 00 00 00"
                  />
                </Field>
              </div>
              <Field label="Email">
                <TextInput
                  type="email"
                  value={resume.personal.email}
                  onChange={(v) => update({ personal: { ...resume.personal, email: v } })}
                  placeholder="aya.koffi@exemple.ci"
                />
              </Field>
            </>
          ) : null}

          {step === 'summary' ? (
            <Field
              label="Résumé professionnel"
              hint="2 à 4 phrases : votre profil, votre expérience, ce que vous cherchez."
            >
              <TextArea
                rows={6}
                value={resume.summary}
                onChange={(v) => update({ summary: v })}
                placeholder="Comptable junior avec trois ans de pratique en cabinet…"
              />
            </Field>
          ) : null}

          {step === 'experience' ? (
            <>
              {resume.experiences.map((exp) => (
                <div key={exp.id} className="flex flex-col gap-3 border-t border-line pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Intitulé du poste">
                      <TextInput
                        value={exp.role}
                        onChange={(v) => updateExperience(exp.id, { role: v })}
                        placeholder="Assistante comptable"
                      />
                    </Field>
                    <Field label="Entreprise">
                      <TextInput
                        value={exp.company}
                        onChange={(v) => updateExperience(exp.id, { company: v })}
                        placeholder="Cabinet Diarra"
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DateInput
                      label="Début"
                      value={exp.start}
                      onChange={(v) => updateExperience(exp.id, { start: v })}
                    />
                    {exp.current ? null : (
                      <DateInput
                        label="Fin"
                        value={exp.end}
                        onChange={(v) => updateExperience(exp.id, { end: v })}
                      />
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={exp.current}
                      onChange={(e) =>
                        updateExperience(exp.id, { current: e.target.checked, end: null })}
                    />
                    Poste occupé actuellement
                  </label>
                  <Field
                    label="Réalisations"
                    hint="Une puce par réalisation, commencée par un verbe d’action et chiffrée si possible."
                  >
                    <LineList
                      items={exp.bullets}
                      onChange={(bullets) => updateExperience(exp.id, { bullets })}
                      placeholder="Traité 350 factures fournisseurs par mois en réduisant les retards de 40 %"
                      addLabel="Ajouter une réalisation"
                    />
                  </Field>
                  <div>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        update({ experiences: resume.experiences.filter((e) => e.id !== exp.id) })}
                    >
                      Supprimer cette expérience
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button
                  onClick={() => update({ experiences: [...resume.experiences, EMPTY_EXPERIENCE()] })}
                >
                  Ajouter une expérience
                </Button>
              </div>
            </>
          ) : null}

          {step === 'education' ? (
            <>
              {resume.education.map((edu) => (
                <div key={edu.id} className="flex flex-col gap-3 border-t border-line pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Diplôme">
                      <TextInput
                        value={edu.degree}
                        onChange={(v) => updateEducation(edu.id, { degree: v })}
                        placeholder="Licence en comptabilité et gestion"
                      />
                    </Field>
                    <Field label="Établissement">
                      <TextInput
                        value={edu.school}
                        onChange={(v) => updateEducation(edu.id, { school: v })}
                        placeholder="Université Félix Houphouët-Boigny"
                      />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DateInput
                      label="Début"
                      value={edu.start}
                      onChange={(v) => updateEducation(edu.id, { start: v })}
                    />
                    <DateInput
                      label="Obtention"
                      value={edu.end}
                      onChange={(v) => updateEducation(edu.id, { end: v })}
                    />
                  </div>
                  <Field label="Précisions" hint="Mention, spécialisation, travaux notables.">
                    <LineList
                      items={edu.details}
                      onChange={(details) => updateEducation(edu.id, { details })}
                      placeholder="Mention bien"
                      addLabel="Ajouter une précision"
                    />
                  </Field>
                  <div>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        update({ education: resume.education.filter((e) => e.id !== edu.id) })}
                    >
                      Supprimer cette formation
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button onClick={() => update({ education: [...resume.education, EMPTY_EDUCATION()] })}>
                  Ajouter une formation
                </Button>
              </div>
            </>
          ) : null}

          {step === 'skills' ? (
            <Field
              label="Compétences"
              hint="Séparées par des virgules. Mélangez outils, savoir-faire métier et qualités."
            >
              <TagInput
                items={resume.skills}
                onChange={(skills) => update({ skills })}
                placeholder="Sage 100, Excel avancé, SYSCOHADA, Rigueur, Travail en équipe"
              />
            </Field>
          ) : null}

          {step === 'extras' ? (
            <>
              <Field label="Langues">
                <div className="flex flex-col gap-2">
                  {resume.languages.map((lang) => (
                    <div key={lang.id} className="flex gap-2">
                      <TextInput
                        value={lang.name}
                        onChange={(v) =>
                          update({
                            languages: resume.languages.map((l) =>
                              (l.id === lang.id ? { ...l, name: v } : l)),
                          })}
                        placeholder="Anglais"
                      />
                      <select
                        className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
                        value={lang.level}
                        aria-label={`Niveau de ${lang.name || 'la langue'}`}
                        onChange={(e) =>
                          update({
                            languages: resume.languages.map((l) =>
                              (l.id === lang.id
                                ? { ...l, level: e.target.value as LanguageLevel }
                                : l)),
                          })}
                      >
                        {LEVELS.map((l) => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          update({ languages: resume.languages.filter((l) => l.id !== lang.id) })}
                      >
                        Retirer
                      </Button>
                    </div>
                  ))}
                  <div>
                    <Button
                      onClick={() =>
                        update({
                          languages: [
                            ...resume.languages,
                            { id: newId(), name: '', level: 'courant' },
                          ],
                        })}
                    >
                      Ajouter une langue
                    </Button>
                  </div>
                </div>
              </Field>

              <Field label="Certifications">
                <LineList
                  items={resume.certifications.map((c) => c.name)}
                  onChange={(names) =>
                    update({
                      certifications: names.map((name, i) => ({
                        id: resume.certifications[i]?.id ?? newId(),
                        name,
                        issuer: resume.certifications[i]?.issuer ?? '',
                        date: resume.certifications[i]?.date ?? null,
                      })),
                    })}
                  placeholder="Certificat Sage 100 Comptabilité"
                  addLabel="Ajouter une certification"
                />
              </Field>
            </>
          ) : null}
        </section>

        {/* Modèle de CV : le choix est réversible à tout moment, il ne change
            que la mise en forme, jamais le contenu. */}
        <section className="card flex flex-col gap-3 p-4">
          <h2 className="text-base font-semibold">Modèle</h2>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_LIST.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => update({ templateId: t.id as TemplateId })}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  resume.templateId === t.id
                    ? 'border-accent bg-accent-soft'
                    : 'border-line bg-white'
                }`}
              >
                <span className="block font-medium">{t.name}</span>
                <span className="block text-xs text-muted">{t.bestFor}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            Les quatre modèles sont gratuits et vérifiés lisibles par les logiciels
            de tri automatique.
          </p>
        </section>

        {syncError !== null ? (
          <p role="status" className="rounded-lg bg-warn-soft px-3 py-2 text-sm">
            {syncError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="solid" onClick={() => void download()}>
            {exporting ? 'Génération…' : 'Télécharger mon CV en PDF'}
          </Button>
          {signedIn ? null : (
            <span className="text-xs text-muted">
              Un compte gratuit est demandé au téléchargement.
            </span>
          )}
        </div>

      </div>

      {/* Colonne collante : l'aperçu doit rester sous les yeux pendant qu'on
          tape. Sans `sticky`, il défilait hors de l'écran dès la deuxième
          expérience saisie — un aperçu en direct qu'il faut aller chercher
          n'est pas un aperçu en direct. */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:pr-1">
        <div className="hidden lg:block">
          <ResumePreview resume={resume} />
        </div>
        <ScorePanel
          score={score}
          // « headline » n'a pas d'étape propre : le titre professionnel se
          // saisit avec l'identité, une recommandation qui le vise doit y mener.
          onFocusSection={(section) => setStep(section === 'headline' ? 'personal' : section)}
        />
      </div>
    </div>
  );
}
