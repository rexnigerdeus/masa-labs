'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getTemplate,
  scoreResume,
  type Education,
  type Experience,
  type Resume,
  type TemplateId,
} from '@everyday/cv-core';
import { ResumePreview } from '../ResumePreview';
import { Button } from './fields';
import { TemplateStep } from './TemplateStep';
import { EducationForm, EducationList, ExperienceForm, ExperienceList } from './EntrySteps';
import {
  ContactStep, IdentityStep, LanguagesStep, PhotoStep, SkillsStep, SummaryStep,
} from './StepForms';
import { FinalStep } from './FinalStep';
import {
  DownloadDialog, detectPlatform, saveToDownloads, type DownloadedCv,
} from './DownloadDialog';
import { loadDraft, saveDraft } from '../../lib/draft';
import { saveResume } from '../../lib/resumes';
import {
  STEPS,
  STEP_IDS,
  educationErrors,
  experienceErrors,
  getStep,
  hasContent,
  isStepEmpty,
  loadStep,
  saveStep,
  stepErrors,
  stepIndex,
  type StepId,
} from '../../lib/wizard';

/**
 * Parcours de création du CV.
 *
 * Un écran par question, un seul bouton principal, toujours au même endroit
 * (la barre du bas), et on n'avance que sur un écran valide — voir
 * `lib/wizard.ts` pour le pourquoi. Le modèle se choisit avant tout, sur de
 * vrais CV ; l'aperçu du CV, dans ce modèle, est à un toucher à chaque étape ;
 * le dernier écran réunit aperçu, score et téléchargement.
 *
 * Un seul état de données : le `Resume`. Le score, l'aperçu et les erreurs de
 * saisie en sont dérivés à chaque rendu — pas de synchronisation à maintenir,
 * donc pas de dérive possible entre ce que l'utilisateur voit et ce qu'il
 * télécharge. Le reste de l'état ne décrit que la navigation.
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
  start: null, end: null, current: false, bullets: [],
});

const EMPTY_EDUCATION = (): Education => ({
  id: newId(), degree: '', school: '', location: '', start: null, end: null, details: [],
});

/** Fiche d'expérience ou de formation ouverte en édition. */
interface Editing {
  kind: 'experience' | 'education';
  id: string;
  /** État avant édition, pour « Annuler » ; `null` pour une fiche neuve. */
  snapshot: Experience | Education | null;
}

/** Nombre d'écrans à remplir : l'écran final n'est pas une question. */
const QUESTIONS = STEPS.length - 1;

function scrollToTop(): void {
  window.scrollTo({ top: 0 });
}

/** Amène le premier champ en erreur sous les yeux, clavier ouvert si c'est un champ. */
function revealFirstError(): void {
  requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?? document.querySelector<HTMLElement>('main [role="alert"]');
    if (target === null) return;
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.focus({ preventScroll: true });
    }
  });
}

export function ResumeEditor({ signedIn, stored, initialTemplate, justSignedIn }: {
  signedIn: boolean;
  stored: { id: string; data: Resume } | null;
  /** Modèle choisi sur la page d'accueil (`/cv?modele=…`). */
  initialTemplate: TemplateId | null;
  /** Retour de la connexion demandée au premier téléchargement. */
  justSignedIn: boolean;
}) {
  const [resume, setResume] = useState<Resume | null>(null);
  const [step, setStep] = useState<StepId>('modele');
  const [returnToFinal, setReturnToFinal] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<DownloadedCv | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const resumeId = useRef<string | null>(stored?.id ?? null);
  const heading = useRef<HTMLHeadingElement>(null);

  // Le brouillon et l'étape sont lus après le montage : le rendu serveur ne
  // connaît pas le localStorage, et rendre un CV vide puis le remplacer
  // provoquerait une désynchronisation d'hydratation.
  useEffect(() => {
    const draft = loadDraft();
    let initial = hasContent(draft) || stored === null ? draft : stored.data;
    let first: StepId;
    if (justSignedIn) {
      first = 'final';
      // Le paramètre a servi : un rechargement ne doit pas ramener ici.
      window.history.replaceState(null, '', '/cv');
    } else if (initialTemplate !== null && !hasContent(initial)) {
      // Venu de la page d'accueil en touchant un modèle : il est déjà choisi,
      // il reste à le confirmer.
      initial = {
        ...initial,
        templateId: initialTemplate,
        accentColor: getTemplate(initialTemplate).defaultAccent,
      };
      first = 'modele';
    } else {
      first = loadStep() ?? (hasContent(initial) ? 'identite' : 'modele');
    }
    setResume(initial);
    setStep(first);
  }, [stored, initialTemplate, justSignedIn]);

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

  useEffect(() => {
    if (resume !== null) saveStep(step);
    // Seul le changement d'étape compte : réécrire à chaque frappe n'apporte rien.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // L'URL `blob:` survit un moment à la fermeture : la feuille de partage ou
  // l'onglet du PDF peuvent encore la lire.
  useEffect(() => {
    if (downloaded === null) return;
    const { url } = downloaded;
    return () => {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    };
  }, [downloaded]);

  const closeDialog = useCallback(() => setDownloaded(null), []);

  const score = useMemo(() => (resume === null ? null : scoreResume(resume)), [resume]);

  if (resume === null || score === null) {
    return <p className="p-8 text-sm text-muted">Chargement de votre CV…</p>;
  }

  const def = getStep(step);
  const index = stepIndex(step);
  const nextStep = STEP_IDS[index + 1] ?? 'final';

  const update = (patch: Partial<Resume>): void =>
    setResume((r) => (r === null ? r : { ...r, ...patch }));

  const updateExperience = (id: string, patch: Partial<Experience>): void =>
    setResume((r) => (r === null ? r : {
      ...r, experiences: r.experiences.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));

  const updateEducation = (id: string, patch: Partial<Education>): void =>
    setResume((r) => (r === null ? r : {
      ...r, education: r.education.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));

  /**
   * Change de modèle en respectant la couleur choisie.
   *
   * Tant que l'utilisateur garde la couleur proposée par son modèle, changer de
   * modèle adopte celle du nouveau — c'est ce qu'on attend en parcourant les
   * modèles. Dès qu'il en a choisi une, elle le suit : sa couleur ne doit pas
   * disparaître parce qu'il a voulu comparer deux mises en page.
   */
  const chooseTemplate = (templateId: TemplateId): void => {
    const untouched = resume.accentColor === getTemplate(resume.templateId).defaultAccent;
    update({
      templateId,
      accentColor: untouched ? getTemplate(templateId).defaultAccent : resume.accentColor,
    });
  };

  /** Change d'écran : haut de page, titre annoncé, erreurs remises à zéro. */
  const goTo = (target: StepId, fromFinal = false): void => {
    setStep(target);
    setReturnToFinal(fromFinal);
    setAttempted(false);
    setEditing(null);
    setShowPreview(false);
    setExportError(null);
    scrollToTop();
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  };

  /* ---------- Fiches d'expérience et de formation ---------- */

  const openEntry = (next: Editing): void => {
    setEditing(next);
    setAttempted(false);
    setShowPreview(false);
    scrollToTop();
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  };

  const addEntry = (kind: Editing['kind']): void => {
    if (kind === 'experience') {
      const entry = EMPTY_EXPERIENCE();
      update({ experiences: [...resume.experiences, entry] });
      openEntry({ kind, id: entry.id, snapshot: null });
    } else {
      const entry = EMPTY_EDUCATION();
      update({ education: [...resume.education, entry] });
      openEntry({ kind, id: entry.id, snapshot: null });
    }
  };

  const editEntry = (kind: Editing['kind'], id: string): void => {
    const list: (Experience | Education)[] = kind === 'experience' ? resume.experiences : resume.education;
    const found = list.find((e) => e.id === id);
    if (found !== undefined) openEntry({ kind, id, snapshot: found });
  };

  const removeEntry = (kind: Editing['kind'], id: string): void => {
    if (kind === 'experience') update({ experiences: resume.experiences.filter((e) => e.id !== id) });
    else update({ education: resume.education.filter((e) => e.id !== id) });
  };

  const closeEntry = (): void => {
    setEditing(null);
    setAttempted(false);
    scrollToTop();
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  };

  const saveEntry = (current: Editing): void => {
    const errors = current.kind === 'experience'
      ? experienceErrors(resume.experiences.find((e) => e.id === current.id) ?? EMPTY_EXPERIENCE())
      : educationErrors(resume.education.find((e) => e.id === current.id) ?? EMPTY_EDUCATION());
    if (Object.keys(errors).length > 0) {
      setAttempted(true);
      revealFirstError();
      return;
    }
    closeEntry();
  };

  /** « Annuler » : une fiche neuve disparaît, une fiche existante reprend son état d'avant. */
  const cancelEntry = (current: Editing): void => {
    const { snapshot, id, kind } = current;
    if (snapshot === null) {
      removeEntry(kind, id);
    } else if (kind === 'experience') {
      update({ experiences: resume.experiences.map((e) => (e.id === id ? snapshot as Experience : e)) });
    } else {
      update({ education: resume.education.map((e) => (e.id === id ? snapshot as Education : e)) });
    }
    closeEntry();
  };

  /* ---------- Navigation ---------- */

  const next = (): void => {
    if (editing !== null) {
      saveEntry(editing);
      return;
    }
    if (step === 'final') {
      void download();
      return;
    }
    if (Object.keys(stepErrors(step, resume)).length > 0) {
      setAttempted(true);
      revealFirstError();
      return;
    }
    goTo(returnToFinal ? 'final' : nextStep);
  };

  const back = (): void => {
    if (editing !== null) cancelEntry(editing);
    else if (showPreview) setShowPreview(false);
    else if (returnToFinal) goTo('final');
    else if (index > 0) goTo(STEP_IDS[index - 1] as StepId);
  };

  /* ---------- Téléchargement ---------- */

  async function download(): Promise<void> {
    if (exporting || resume === null) return;
    setExporting(true);
    setExportError(null);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(resume),
      });
      if (response.status === 401) {
        // Le compte n'est exigé qu'ici : le brouillon et l'étape sont déjà en
        // local, on renvoie vers l'inscription et l'utilisateur revient sur
        // cet écran, prêt à télécharger.
        window.location.href = '/connexion?suite=telechargement';
        return;
      }
      if (!response.ok) throw new Error(`export ${response.status}`);
      const blob = await response.blob();
      const encodedName = response.headers.get('x-filename');
      const name = encodedName === null ? 'CV.pdf' : decodeURIComponent(encodedName);
      const file = new File([blob], name, { type: 'application/pdf' });
      const url = URL.createObjectURL(file);
      const platform = detectPlatform();
      // Sur iPhone, le fichier ne part pas tout seul : voir `DownloadDialog`.
      const saved = platform !== 'ios';
      if (saved) saveToDownloads(url, name);
      setDownloaded({ file, url, platform, saved });
    } catch {
      setExportError(
        navigator.onLine
          ? 'Le téléchargement a échoué. Réessayez dans un instant.'
          : 'Vous êtes hors connexion. Votre CV est bien enregistré : réessayez une fois connecté.',
      );
    } finally {
      setExporting(false);
    }
  }

  /* ---------- Rendu ---------- */

  const fieldErrors = attempted && editing === null ? stepErrors(step, resume) : {};
  const editedExperience = editing?.kind === 'experience'
    ? resume.experiences.find((e) => e.id === editing.id) ?? null
    : null;
  const editedEducation = editing?.kind === 'education'
    ? resume.education.find((e) => e.id === editing.id) ?? null
    : null;

  let title = def.title;
  let lead = def.lead;
  if (editing !== null) {
    const fresh = editing.snapshot === null;
    title = editing.kind === 'experience'
      ? (fresh ? 'Nouvelle expérience' : 'Modifier cette expérience')
      : (fresh ? 'Nouveau diplôme' : 'Modifier ce diplôme');
    lead = 'Remplissez les champs, puis touchez « Enregistrer » en bas de l’écran.';
  }

  let primaryLabel: string;
  if (editing !== null) {
    // Le titre de l'écran dit déjà quoi : le bouton tient sur une ligne.
    primaryLabel = 'Enregistrer';
  } else if (step === 'final') {
    primaryLabel = exporting ? 'Préparation du PDF…' : 'Télécharger mon CV';
  } else if (step === 'modele') {
    primaryLabel = returnToFinal ? 'Garder ce modèle' : 'Commencer avec ce modèle';
  } else if (returnToFinal) {
    primaryLabel = 'Valider et revoir mon CV';
  } else if (def.optional && isStepEmpty(step, resume)) {
    primaryLabel = 'Passer cette étape';
  } else if (nextStep === 'final') {
    primaryLabel = 'Terminer mon CV';
  } else {
    primaryLabel = 'Continuer';
  }

  const fullWidth = step === 'modele' || step === 'final';
  const canGoBack = editing !== null || returnToFinal || index > 0;

  let form: React.ReactNode = null;
  switch (step) {
    case 'identite':
      form = <IdentityStep resume={resume} update={update} errors={fieldErrors} />;
      break;
    case 'coordonnees':
      form = <ContactStep resume={resume} update={update} errors={fieldErrors} />;
      break;
    case 'photo':
      form = <PhotoStep resume={resume} update={update} />;
      break;
    case 'profil':
      form = <SummaryStep resume={resume} update={update} />;
      break;
    case 'experience':
      form = editedExperience !== null ? (
        <ExperienceForm
          entry={editedExperience}
          errors={attempted ? experienceErrors(editedExperience) : {}}
          onChange={(patch) => updateExperience(editedExperience.id, patch)}
        />
      ) : (
        <ExperienceList
          items={resume.experiences}
          isIncomplete={(e) => Object.keys(experienceErrors(e)).length > 0}
          listError={fieldErrors.list}
          onAdd={() => addEntry('experience')}
          onEdit={(id) => editEntry('experience', id)}
          onRemove={(id) => removeEntry('experience', id)}
        />
      );
      break;
    case 'formation':
      form = editedEducation !== null ? (
        <EducationForm
          entry={editedEducation}
          errors={attempted ? educationErrors(editedEducation) : {}}
          onChange={(patch) => updateEducation(editedEducation.id, patch)}
        />
      ) : (
        <EducationList
          items={resume.education}
          isIncomplete={(e) => Object.keys(educationErrors(e)).length > 0}
          listError={fieldErrors.list}
          onAdd={() => addEntry('education')}
          onEdit={(id) => editEntry('education', id)}
          onRemove={(id) => removeEntry('education', id)}
        />
      );
      break;
    case 'competences':
      form = <SkillsStep resume={resume} update={update} />;
      break;
    case 'langues':
      form = <LanguagesStep resume={resume} update={update} errors={fieldErrors} />;
      break;
    default:
      break;
  }

  return (
    // Réserve sous le contenu : la barre d'action fixe ne doit rien masquer.
    <div className="pb-36">
      <header className="mb-6 flex flex-col gap-3">
        <div className="flex min-h-11 items-center justify-between gap-3">
          {canGoBack ? (
            <button
              type="button"
              onClick={back}
              className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-muted hover:text-ink"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 3L5 8l5 5" />
              </svg>
              {editing !== null ? 'Annuler' : returnToFinal ? 'Revenir à mon CV' : 'Retour'}
            </button>
          ) : <span />}
          <span className="text-sm font-medium text-muted">
            {step === 'final' ? 'Terminé' : `Étape ${index + 1} sur ${QUESTIONS}`}
          </span>
        </div>

        {/* Un segment par écran : on voit d'un coup d'œil où l'on est et ce
            qu'il reste, sans avoir à lire. */}
        <ol className="flex gap-1" aria-label="Progression">
          {STEPS.filter((s) => s.id !== 'final').map((s, i) => (
            <li
              key={s.id}
              aria-current={s.id === step ? 'step' : undefined}
              className={`h-1.5 flex-1 rounded-full ${
                i < index || step === 'final' ? 'bg-accent' : i === index ? 'bg-header' : 'bg-line'
              }`}
            >
              <span className="sr-only">
                {s.label}{i < index ? ' (fait)' : s.id === step ? ' (en cours)' : ''}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-1">
          <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold leading-tight outline-none sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1.5 text-base text-muted">{lead}</p>
        </div>
      </header>

      {step === 'modele' ? (
        <TemplateStep
          resume={resume}
          onChoose={chooseTemplate}
          onAccent={(accentColor) => update({ accentColor })}
        />
      ) : null}

      {step === 'final' ? (
        <FinalStep
          resume={resume}
          score={score}
          signedIn={signedIn}
          justSignedIn={justSignedIn}
          onGoTo={(target) => goTo(target, true)}
        />
      ) : null}

      {fullWidth ? null : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-start">
          <section className={`card min-w-0 flex-col gap-5 p-4 sm:p-6 ${showPreview ? 'hidden lg:flex' : 'flex'}`}>
            {form}
          </section>

          {/* L'aperçu : en colonne fixe sur grand écran, à la demande sur
              téléphone — où il remplace le formulaire plutôt que de s'empiler
              dessous, hors de vue. */}
          <aside
            aria-label="Aperçu de votre CV"
            className={`${showPreview ? 'flex' : 'hidden'} min-w-0 flex-col gap-2 lg:sticky lg:top-4 lg:flex`}
          >
            <p className="text-sm text-muted">
              Votre CV en ce moment — modèle {getTemplate(resume.templateId).name}
            </p>
            <div className="overflow-hidden rounded-lg border border-line shadow-[0_18px_40px_-20px_rgba(23,33,12,0.45)]">
              <ResumePreview resume={resume} />
            </div>
          </aside>
        </div>
      )}

      {syncError !== null ? (
        <p role="status" className="mt-4 rounded-lg bg-warn-soft px-3 py-2 text-sm">
          {syncError}
        </p>
      ) : null}

      {/* Barre d'action : le bouton principal ne bouge jamais d'une étape à
          l'autre, et l'aperçu est à côté, sous le même pouce. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {exportError !== null ? (
            <p role="alert" className="text-sm font-medium text-danger">{exportError}</p>
          ) : null}
          <div className="flex items-center gap-3">
            {fullWidth ? null : (
              <button
                type="button"
                aria-pressed={showPreview}
                onClick={() => {
                  setShowPreview(!showPreview);
                  scrollToTop();
                }}
                className={`inline-flex min-h-13 shrink-0 items-center justify-center gap-2 rounded-full border-2 px-4 text-base font-semibold lg:hidden ${
                  showPreview
                    ? 'flex-1 border-header bg-header text-white'
                    : 'border-header text-header'
                }`}
              >
                {showPreview ? (
                  <>
                    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                      <path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z" />
                    </svg>
                    Revenir à la saisie
                  </>
                ) : (
                  <>
                    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z" />
                      <circle cx="10" cy="10" r="2.5" />
                    </svg>
                    Voir mon CV
                  </>
                )}
              </button>
            )}
            <div className={`flex-1 lg:ml-auto lg:w-96 lg:flex-none ${showPreview ? 'hidden lg:block' : ''}`}>
              <Button variant="solid" size="lg" full onClick={next} disabled={exporting}>
                {step === 'final' && editing === null ? (
                  <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 3v10M5.5 8.5L10 13l4.5-4.5M4 17h12" />
                  </svg>
                ) : null}
                {primaryLabel}
                {step !== 'final' && editing === null ? (
                  <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                ) : null}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {downloaded !== null ? <DownloadDialog cv={downloaded} onClose={closeDialog} /> : null}
    </div>
  );
}
