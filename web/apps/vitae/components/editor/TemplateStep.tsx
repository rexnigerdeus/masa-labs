'use client';

import {
  getTemplate,
  SAMPLE_RESUME,
  TEMPLATE_LIST,
  type Resume,
  type TemplateId,
} from '@everyday/cv-core';
import { ResumePreview } from '../ResumePreview';
import { ColorPicker } from './fields';
import { hasContent } from '../../lib/wizard';

/**
 * Première étape : le choix du modèle, avant toute saisie.
 *
 * Ici on montre de vrais CV, pas les croquis de la page d'accueil. Le croquis
 * sert à comparer huit mises en page d'un coup d'œil ; au moment de choisir,
 * la question devient « à quoi ressemblera *mon* CV ? », et seul un document
 * réel y répond. Chaque vignette est donc le rendu exact — même composant que
 * l'aperçu, mêmes descripteurs que le PDF — du CV d'exemple, ou du CV de la
 * personne dès qu'elle a commencé à le remplir.
 *
 * Un grand aperçu du modèle choisi, une rangée de vignettes pour changer : on
 * compare sans quitter l'écran, et il n'y a qu'une chose à faire — toucher.
 */
export function TemplateStep({ resume, onChoose, onAccent }: {
  resume: Resume;
  onChoose: (id: TemplateId) => void;
  onAccent: (color: string) => void;
}) {
  const selected = getTemplate(resume.templateId);
  const own = hasContent(resume);
  // L'exemple prend la photo et le modèle choisis, mais le contenu d'Aya :
  // tant que le CV est vide, un aperçu de « Votre nom » ne montrerait rien.
  const example = (templateId: TemplateId, accentColor: string): Resume => (own
    ? { ...resume, templateId, accentColor }
    : { ...SAMPLE_RESUME, templateId, accentColor });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start">
      <div className="order-2 flex min-w-0 flex-col gap-5 lg:sticky lg:top-4">
        <figure className="mx-auto flex w-full max-w-[420px] flex-col gap-3">
          <div className="overflow-hidden rounded-lg border border-line shadow-[0_18px_40px_-20px_rgba(23,33,12,0.45)]">
            <ResumePreview resume={example(selected.id, resume.accentColor)} />
          </div>
          <figcaption className="flex flex-col gap-0.5">
            <span className="text-lg font-bold">Modèle {selected.name}</span>
            <span className="text-sm text-muted">{selected.description}</span>
            <span className="text-sm text-muted">
              {own ? 'Aperçu avec votre contenu.' : 'Exemple rempli avec le CV d’Aya Koffi.'}
            </span>
          </figcaption>
        </figure>

        <div className="mx-auto flex w-full max-w-[420px] flex-col gap-2">
          <span className="text-sm font-semibold">
            Couleur <span className="font-normal text-muted">(facultatif)</span>
          </span>
          <ColorPicker value={resume.accentColor} onChange={onAccent} />
        </div>
      </div>

      <div className="order-1 min-w-0">
        <h2 className="mb-3 text-sm font-semibold">
          Les {TEMPLATE_LIST.length} modèles — touchez pour voir
        </h2>
        {/* Défilement horizontal sur téléphone : les vignettes restent à une
            taille où l'on distingue la mise en page, et le grand aperçu ne
            descend pas sous la ligne de flottaison. En grille au-delà. */}
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
          {TEMPLATE_LIST.map((t) => {
            const active = t.id === resume.templateId;
            return (
              <li
                key={t.id}
                className={`relative w-[38%] shrink-0 snap-start rounded-xl border-2 p-1.5 transition-colors sm:w-auto ${
                  active ? 'border-accent bg-accent-soft' : 'border-transparent hover:border-line'
                }`}
              >
                {/* Le document réel contient titres et listes, qu'un bouton
                    n'a pas le droit de contenir : la vignette est posée à
                    côté, et le bouton la recouvre. */}
                <div aria-hidden className="flex flex-col gap-2">
                  <div className="overflow-hidden rounded-md border border-line">
                    <ResumePreview
                      decorative
                      resume={example(t.id, active ? resume.accentColor : t.defaultAccent)}
                    />
                  </div>
                  <div className="px-1 pb-1">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs leading-snug text-muted">{t.bestFor}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label={`Modèle ${t.name} — idéal pour : ${t.bestFor}`}
                  onClick={() => onChoose(t.id)}
                  className="absolute inset-0 rounded-xl"
                />
                {active ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-header shadow"
                  >
                    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M3.5 8.5l3 3 6-7" />
                    </svg>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm text-muted">
          Tous les modèles sont gratuits et vérifiés lisibles par les logiciels de
          tri des recruteurs.
        </p>
      </div>
    </div>
  );
}
