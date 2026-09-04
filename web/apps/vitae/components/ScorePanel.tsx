import type { Grade, ScoreResult, SectionId } from '@everyday/cv-core';

/**
 * Panneau de score : anneau global, sous-scores par critère, sections notées et
 * recommandations classées par gain. C'est le retour permanent du brief §5.1.
 *
 * Aucun état, aucun effet : le composant est purement dérivé du `ScoreResult`.
 */

const GRADE_LABEL: Record<Grade, string> = {
  excellent: 'Excellent',
  bon: 'Bon',
  moyen: 'Moyen',
};

/** Vert pour bon et excellent, pêche pour moyen — code couleur du brief §7. */
const GRADE_CLASS: Record<Grade, string> = {
  excellent: 'bg-accent-soft text-header',
  bon: 'bg-accent-soft text-header',
  moyen: 'bg-warn-soft text-header',
};

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <svg
      viewBox="0 0 120 120"
      className="h-32 w-32"
      role="img"
      aria-label={`Score du CV : ${score} sur 100`}
    >
      <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e2dd" strokeWidth="12" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        // Départ à midi plutôt qu'à 3 h.
        transform="rotate(-90 60 60)"
      />
      <text
        x="60"
        y="60"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="30"
        fontWeight="700"
        fill="var(--color-ink)"
      >
        {score}
      </text>
    </svg>
  );
}

function Badge({ grade }: { grade: Grade }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${GRADE_CLASS[grade]}`}>
      {GRADE_LABEL[grade]}
    </span>
  );
}

export function ScorePanel({
  score,
  onFocusSection,
}: {
  score: ScoreResult;
  /** Permet à une recommandation de renvoyer vers la section concernée. */
  onFocusSection?: (section: SectionId) => void;
}) {
  return (
    <aside className="card flex flex-col gap-5 p-4">
      <div className="flex items-center gap-4">
        <ScoreRing score={score.total} />
        <div>
          <h2 className="text-base font-semibold">Score de votre CV</h2>
          <p className="mt-1 text-sm text-muted">
            Calculé en direct, sans envoi de vos données. Le téléchargement reste
            possible quel que soit le score.
          </p>
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Par critère</h3>
        <ul className="flex flex-col gap-1.5">
          {score.criteria.map((c) => (
            <li key={c.id} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 text-muted">{c.label}</span>
              <span className="h-1.5 flex-1 rounded-full bg-line">
                <span
                  className="block h-1.5 rounded-full bg-accent"
                  style={{ width: `${c.score}%` }}
                />
              </span>
              <span className="w-9 text-right tabular-nums">{c.score}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Par section</h3>
        <ul className="flex flex-col gap-1.5">
          {score.sections.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
              <span className={s.empty ? 'text-muted' : undefined}>{s.label}</span>
              {s.empty ? (
                <span className="text-xs text-muted">à remplir</span>
              ) : (
                <Badge grade={s.grade} />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">
          À améliorer{' '}
          <span className="font-normal text-muted">({score.recommendations.length})</span>
        </h3>
        {score.recommendations.length === 0 ? (
          <p className="text-sm text-muted">
            Rien à signaler : votre CV coche tous les contrôles.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {score.recommendations.slice(0, 8).map((r) => (
              <li key={r.id} className="text-sm">
                <button
                  type="button"
                  className="text-left hover:underline"
                  onClick={onFocusSection ? () => onFocusSection(r.section) : undefined}
                >
                  {r.label}
                </button>{' '}
                <span className="whitespace-nowrap text-xs font-medium text-accent-dark">
                  +{r.points} pts
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
