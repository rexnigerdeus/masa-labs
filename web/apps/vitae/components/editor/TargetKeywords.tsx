'use client';

import { keywordCoverage, type Resume } from '@everyday/cv-core';

/**
 * Encart d'une version ciblée (brief v2, lot B, « CV ciblé ») : le poste visé,
 * le lien de l'offre, et ses mots importants cochés quand le CV les contient.
 *
 * Les mots-clés sont extraits côté serveur, une fois, à l'ouverture
 * (`offerKeywords`, cv-core) ; la couverture est recalculée ici à chaque
 * frappe, comme le score : voir un mot se cocher en l'écrivant est le
 * meilleur mode d'emploi.
 */
export interface ResumeTarget {
  title: string;
  offerUrl: string | null;
  keywords: string[];
}

export function TargetKeywords({ target, resume }: { target: ResumeTarget; resume: Resume }) {
  const coverage = keywordCoverage(resume, target.keywords);
  const found = coverage.filter((k) => k.present).length;

  return (
    <section className="card flex flex-col gap-3 p-4" aria-labelledby="cible-titre">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Version ciblée</p>
        <h2 id="cible-titre" className="text-lg font-bold">{target.title}</h2>
        {target.offerUrl === null ? null : (
          <a
            href={target.offerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-accent-ink underline underline-offset-4"
          >
            Revoir l’offre
          </a>
        )}
      </div>

      {coverage.length === 0 ? (
        <p className="text-sm text-muted">
          Reprenez dans votre CV les mots exacts de l’offre : ce sont ceux que le
          logiciel de tri cherche.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">
            {found} mot{found > 1 ? 's' : ''} de l’offre sur {coverage.length} dans votre CV.
            Ajoutez les autres là où ils sont vrais.
          </p>
          <ul className="flex flex-wrap gap-2">
            {coverage.map((k) => (
              <li
                key={k.keyword}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-sm ${
                  k.present ? 'bg-accent-soft font-semibold text-header' : 'border border-line bg-white text-muted'
                }`}
              >
                <span aria-hidden>{k.present ? '✓' : '○'}</span>
                {k.keyword}
                <span className="sr-only">{k.present ? ' (présent)' : ' (absent)'}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
