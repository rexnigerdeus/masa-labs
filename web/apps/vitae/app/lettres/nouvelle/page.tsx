import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { emptyCoverLetter, strengthChoices } from '@everyday/cv-core';
import { LetterEditor } from '../../../components/letters/LetterEditor';
import { TrackView } from '../../../components/TrackView';
import { WaitlistForm } from '../../../components/WaitlistForm';
import { listResumes, loadResume } from '../../../lib/resumes';
import { fetchJob } from '../../../lib/jobs';
import { PAYMENTS_ENABLED, loadRights } from '../../../lib/payments';
import { currentUser } from '../../../lib/supabase/server';

export const metadata: Metadata = { title: 'Nouvelle lettre de motivation', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * Nouvelle lettre (Pass Candidature). `?cv=<id>` choisit le CV dont la lettre
 * reprend l'identité et la couleur ; `?offre=<id>` pré-remplit structure et
 * poste depuis une offre de /offres. Sans pass actif : le pass, ou la liste
 * d'attente tant que les paiements sont éteints.
 */
export default async function NouvelleLettrePage({
  searchParams,
}: {
  searchParams: Promise<{ cv?: string; offre?: string }>;
}) {
  const { cv, offre } = await searchParams;
  const user = await currentUser();
  if (user === null) redirect('/connexion?suite=/lettres/nouvelle');

  const rights = await loadRights();
  if (!rights.canCreateLetter) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <TrackView event="paywall_viewed" props={{ contexte: 'lettre' }} />
        <h1 className="text-2xl font-bold">Une lettre de motivation par offre</h1>
        <p className="text-muted">
          Les lettres font partie du Pass Candidature : 2 000 F pour 30 jours,
          versions ciblées illimitées et une lettre de motivation par offre.
          Pas de renouvellement automatique.
        </p>
        {PAYMENTS_ENABLED ? (
          <Link href="/paiement?offre=pass_candidature" className="inline-flex min-h-13 items-center justify-center rounded-full bg-accent px-6 font-semibold text-header">
            Prendre le pass
          </Link>
        ) : (
          <details className="card p-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center rounded-full border-2 border-accent px-5 font-semibold text-accent-ink [&::-webkit-details-marker]:hidden">
              Bientôt disponible — me prévenir
            </summary>
            <div className="mt-4"><WaitlistForm product="pass" placement="lettre" /></div>
          </details>
        )}
      </div>
    );
  }

  const source = (cv === undefined ? null : await loadResume(cv))
    ?? (await listResumes()).find((r) => r.isPrimary)
    ?? (await loadResume());
  if (source === null) redirect('/cv');

  const offer = offre === undefined ? null : await fetchJob(offre);
  const initial = {
    ...emptyCoverLetter(),
    company: offer?.company ?? '',
    position: offer?.title ?? source.targetTitle ?? source.data.headline,
    offerUrl: offer?.applyUrl ?? '',
    placeDate: `Abidjan, le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-2xl font-bold">Nouvelle lettre de motivation</h1>
      <p className="text-muted">
        Répondez aux questions, assemblez la lettre, puis relisez-la : elle
        reste entièrement modifiable.
      </p>
      <LetterEditor
        id={null}
        initial={initial}
        resume={source.data}
        resumeId={source.id}
        offerId={offer?.id ?? null}
        choices={strengthChoices(source.data)}
      />
    </div>
  );
}
