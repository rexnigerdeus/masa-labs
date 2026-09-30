'use client';

import { getTemplate, type Resume, type ScoreResult } from '@everyday/cv-core';
import { ResumePreview } from '../ResumePreview';
import { GRADE_LABEL, ScorePanel, ScoreRing } from '../ScorePanel';
import {
  STEPS, stepForRecommendation, stepForSection, type StepId,
} from '../../lib/wizard';

/**
 * Dernier écran : le CV tel qu'il sera téléchargé, son score, et ce qu'il
 * reste à gagner.
 *
 * Le téléchargement n'est pas ici mais dans la barre du bas, à l'endroit
 * exact où se trouvait « Continuer » à chaque étape : le pouce y va déjà. Cet
 * écran ne porte que des actions secondaires — corriger un point, changer de
 * modèle — volontairement plus discrètes.
 */

const GRADE_SENTENCE = {
  excellent: 'Votre CV est solide. Vous pouvez l’envoyer tel quel.',
  bon: 'Votre CV est prêt à être envoyé. Quelques retouches peuvent encore l’améliorer.',
  moyen: 'Vous pouvez déjà le télécharger, mais quelques ajouts le rendront bien plus convaincant.',
} as const;

export function FinalStep({ resume, score, signedIn, justSignedIn, onGoTo }: {
  resume: Resume;
  score: ScoreResult;
  signedIn: boolean;
  /** Retour de la page de connexion, lancée par un premier essai de téléchargement. */
  justSignedIn: boolean;
  onGoTo: (step: StepId) => void;
}) {
  const template = getTemplate(resume.templateId);
  const top = score.recommendations.slice(0, 3);
  const count = score.recommendations.length;
  const editable = STEPS.filter((s) => s.id !== 'final');

  return (
    <div className="flex flex-col gap-6">
      {justSignedIn && signedIn ? (
        <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-header">
          Votre compte est prêt. Touchez « Télécharger mon CV » en bas de l’écran.
        </p>
      ) : null}

      {/* Sur téléphone, le détail du score tombe sous l'aperçu : on en donne
          l'essentiel ici, avant que le pouce n'aille au téléchargement. */}
      <a
        href="#score-titre"
        className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 lg:hidden"
      >
        <ScoreRing score={score.total} className="h-14 w-14 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Score : {GRADE_LABEL[score.grade]}</span>
          <span className="block text-sm text-muted">
            {count === 0
              ? 'Aucune correction à faire.'
              : `${count} conseil${count > 1 ? 's' : ''} pour l’améliorer`}
          </span>
        </span>
        <span aria-hidden className="text-accent-ink">↓</span>
      </a>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-start">
        <figure className="mx-auto flex w-full min-w-0 max-w-[560px] flex-col gap-2">
          <div className="overflow-hidden rounded-lg border border-line shadow-[0_18px_40px_-20px_rgba(23,33,12,0.45)]">
            <ResumePreview resume={resume} />
          </div>
          <figcaption className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
            <span>Modèle {template.name} — première page</span>
            <button
              type="button"
              onClick={() => onGoTo('modele')}
              className="min-h-11 font-semibold text-accent-ink underline underline-offset-4"
            >
              Changer de modèle ou de couleur
            </button>
          </figcaption>
        </figure>

        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
          <section className="card flex flex-col gap-4 p-4" aria-labelledby="score-titre">
            <div className="flex items-center gap-4">
              <ScoreRing score={score.total} className="h-24 w-24 shrink-0" />
              <div>
                <h2 id="score-titre" className="text-lg font-bold">
                  Score : {GRADE_LABEL[score.grade]}
                </h2>
                <p className="mt-1 text-sm text-muted">{GRADE_SENTENCE[score.grade]}</p>
              </div>
            </div>

            {top.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Pour gagner des points</h3>
                <ul className="flex flex-col gap-2">
                  {top.map((r) => (
                    <li key={r.id} className="flex items-start justify-between gap-3 rounded-xl bg-canvas p-3">
                      <span className="text-sm">
                        {r.label}{' '}
                        <span className="whitespace-nowrap font-semibold text-accent-ink">+{r.points} pts</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onGoTo(stepForRecommendation(r))}
                        className="min-h-9 shrink-0 rounded-full border-2 border-accent px-3 text-sm font-semibold text-accent-ink hover:bg-accent-soft"
                      >
                        Corriger
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <details className="group">
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-accent-ink">
                Voir le détail du score
              </summary>
              <div className="mt-2">
                <ScorePanel
                  score={score}
                  onFocusSection={(section) => onGoTo(stepForSection(section))}
                />
              </div>
            </details>
          </section>

          <details className="card p-4">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">
              Modifier une partie de mon CV
            </summary>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {editable.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onGoTo(s.id)}
                    className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-left text-sm hover:border-accent"
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </details>

          {signedIn ? null : (
            <p className="text-sm text-muted">
              Au moment de télécharger, un compte gratuit vous sera demandé. Votre CV
              est déjà enregistré sur cet appareil : vous reviendrez ici
              directement.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
