import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '../../../components/auth/AuthForm';
import { TrackView } from '../../../components/TrackView';
import { WaitlistForm } from '../../../components/WaitlistForm';
import { VersionForm } from '../../../components/account/VersionForm';
import { listResumes } from '../../../lib/resumes';
import { fetchJob } from '../../../lib/jobs';
import { PAYMENTS_ENABLED, loadRights } from '../../../lib/payments';
import { currentUser } from '../../../lib/supabase/server';
import { isGoogleEnabled } from '../../../lib/supabase/providers';

export const metadata: Metadata = { title: 'Nouvelle version de mon CV', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * « Créer un nouveau CV » quand on en a déjà un (brief v2, lot B, parcours
 * du 2e CV) :
 *
 *   pas de compte  → connexion, puis retour ici ;
 *   pas encore de CV → le premier est gratuit, direction l'éditeur ;
 *   droit actif    → formulaire de version ciblée ;
 *   sinon          → l'écran « Vous avez déjà votre CV gratuit », textes du
 *                    brief mot pour mot, boutons payants remplacés par la
 *                    liste d'attente tant que PAYMENTS_ENABLED est éteint.
 *
 * `?offre=<id>` : la version part d'une offre de /offres.
 */
export default async function VersionPage({ searchParams }: { searchParams: Promise<{ offre?: string }> }) {
  const { offre } = await searchParams;
  const here = offre === undefined ? '/cv/version' : `/cv/version?offre=${encodeURIComponent(offre)}`;
  const user = await currentUser();

  if (user === null) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <h1 className="text-2xl font-bold">Une autre version de votre CV</h1>
        <p className="text-muted">
          Votre premier CV reste gratuit et sans compte. Pour en créer une autre
          version, connectez-vous : votre CV actuel sera rattaché à votre compte.
        </p>
        <AuthForm googleEnabled={await isGoogleEnabled()} next={here} />
      </div>
    );
  }

  const resumes = await listResumes();
  const primary = resumes.find((r) => r.isPrimary) ?? resumes[resumes.length - 1];
  if (primary === undefined) redirect('/cv');

  const [rights, offer] = await Promise.all([
    loadRights(),
    offre === undefined ? Promise.resolve(null) : fetchJob(offre),
  ]);

  if (rights.canCreateVersion) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <h1 className="text-2xl font-bold">Une version ciblée de votre CV</h1>
        <p className="text-muted">
          Une copie de votre CV, avec le poste visé en tête. Vous l’ajustez
          ensuite librement ; votre CV gratuit ne change pas.
        </p>
        <VersionForm
          sources={resumes.map((r) => ({
            id: r.id,
            label: `${r.isPrimary ? 'Mon CV gratuit' : r.targetTitle ?? 'Version'} — ${r.data.personal.fullName || 'sans nom'}`,
          }))}
          offer={offer === null ? null : { id: offer.id, title: offer.title, company: offer.company }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <TrackView event="paywall_viewed" props={{ contexte: '2e_cv' }} />
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Vous avez déjà votre CV gratuit</h1>
        <p className="text-muted">
          Vous pouvez le modifier gratuitement, autant que vous voulez. Une
          deuxième version, ciblée sur un autre poste ou sur une offre, coûte
          500 F.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Link
          href={`/cv?id=${primary.id}`}
          className="inline-flex min-h-13 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-header hover:bg-accent-dark"
        >
          Modifier mon CV (gratuit)
        </Link>

        {PAYMENTS_ENABLED ? (
          <Link
            href="/paiement?offre=cv_credit"
            data-track="checkout_started"
            data-track-props='{"offre":"cv_credit","contexte":"2e_cv"}'
            className="inline-flex min-h-13 items-center justify-center rounded-full border-2 border-accent px-6 text-base font-semibold text-accent-ink hover:bg-accent-soft"
          >
            Créer une version — 500 F
          </Link>
        ) : (
          <details className="card p-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center rounded-full border-2 border-accent px-5 text-base font-semibold text-accent-ink [&::-webkit-details-marker]:hidden">
              Bientôt disponible — me prévenir
            </summary>
            <div className="mt-4">
              <WaitlistForm product="cv_cible" placement="2e_cv" />
            </div>
          </details>
        )}

        <Link href="/tarifs" className="text-center text-sm font-semibold text-accent-ink underline underline-offset-4">
          Je postule beaucoup : voir le Pass Candidature (2 000 F, 30 jours)
        </Link>
      </div>
    </div>
  );
}
