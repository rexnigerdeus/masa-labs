import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { strengthChoices } from '@everyday/cv-core';
import { LetterEditor } from '../../../components/letters/LetterEditor';
import { loadLetter } from '../../../lib/letters';
import { loadResume } from '../../../lib/resumes';

export const metadata: Metadata = { title: 'Ma lettre de motivation', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * Une lettre enregistrée : modifiable et téléchargeable sans limite, pass
 * actif ou non (brief v2 : « tout ce qui existe reste modifiable et
 * téléchargeable »).
 */
export default async function LettrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stored = await loadLetter(id);
  if (stored === null) notFound();
  const resume = (stored.resumeId === null ? null : await loadResume(stored.resumeId)) ?? (await loadResume());
  if (resume === null) notFound();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Ma lettre de motivation</h1>
        <a
          href={`/api/lettre/${stored.id}`}
          className="inline-flex min-h-12 items-center rounded-full bg-header px-5 text-sm font-semibold text-white hover:bg-ink"
        >
          Télécharger en PDF
        </a>
      </div>
      <p className="text-sm text-muted">
        Enregistrez vos modifications avant de télécharger.{' '}
        <Link href="/compte" className="font-semibold text-accent-ink underline">Mes CV et lettres</Link>
      </p>
      <LetterEditor
        id={stored.id}
        initial={stored.letter}
        resume={resume.data}
        resumeId={stored.resumeId}
        offerId={null}
        choices={strengthChoices(resume.data)}
      />
    </div>
  );
}
