import Link from 'next/link';
import { getTemplate, scoreResume } from '@everyday/cv-core';
import { DeleteResumeButton } from './DeleteResumeButton';
import { ResumePreview } from '../ResumePreview';
import { GRADE_LABEL } from '../ScorePanel';
import { formatLongDate } from '../../lib/catalog';
import type { StoredResume } from '../../lib/resumes';

/** Un CV de la liste : le haut de sa vraie page, son nom, son score, et de quoi le rouvrir. */
export function ResumeCard({ resume: r }: { resume: StoredResume }) {
  const score = scoreResume(r.data);
  const name = r.data.personal.fullName.trim() || 'CV sans nom';
  const href = `/cv?id=${r.id}`;
  return (
    <li className="card flex flex-col overflow-hidden">
      {/* Le haut de la vraie page : nom, en-tête, couleurs — de quoi
          reconnaître chaque CV sans lire. */}
      <Link href={href} aria-label={`Ouvrir le CV ${name}`} className="block bg-canvas px-5 pt-5">
        <div className="h-44 overflow-hidden rounded-t-md shadow-[0_10px_24px_-14px_rgba(23,33,12,0.5)]">
          <ResumePreview resume={r.data} decorative />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h2 className="font-semibold">{name}</h2>
        {r.data.headline.trim() !== '' ? (
          <p className="line-clamp-1 text-sm text-muted">{r.data.headline}</p>
        ) : null}
        <p className="text-sm text-muted">
          Modèle {getTemplate(r.data.templateId).name} · modifié le {formatLongDate(r.updatedAt)}
        </p>
        <p className="mt-1">
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-header">
            Score {score.total}/100 · {GRADE_LABEL[score.grade]}
          </span>
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          <Link
            href={href}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border-2 border-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-soft"
          >
            Voir, modifier, télécharger
          </Link>
          <DeleteResumeButton id={r.id} label={name} />
        </div>
      </div>
    </li>
  );
}
