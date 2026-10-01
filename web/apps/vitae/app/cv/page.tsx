import type { Metadata } from 'next';
import Link from 'next/link';
import { isTemplateId } from '@everyday/cv-core';
import { ResumeEditor } from '../../components/editor/ResumeEditor';
import { currentUser } from '../../lib/supabase/server';
import { loadResume } from '../../lib/resumes';
import { isStepId } from '../../lib/wizard';

export const metadata: Metadata = {
  title: 'Créer mon CV',
  description:
    'Choisissez un modèle, répondez à quelques questions, voyez votre CV à '
    + 'chaque étape et téléchargez un PDF que les logiciels de tri savent relire.',
  alternates: { canonical: '/cv' },
};

/**
 * Parcours de création.
 *
 * Paramètres, tous facultatifs : `id` ouvre un CV du compte (depuis l'espace
 * compte), `nouveau` en commence un autre, `etape` ouvre une étape précise,
 * `modele` présélectionne un modèle (depuis l'accueil), `suite` signale le
 * retour de la connexion demandée au téléchargement.
 */
export default async function CvPage({
  searchParams,
}: {
  searchParams: Promise<{
    id?: string; nouveau?: string; etape?: string; modele?: string; suite?: string;
  }>;
}) {
  const { id, nouveau, etape, modele, suite } = await searchParams;
  const user = await currentUser();

  // Le CV enregistré n'est lu que pour un compte connecté ; un visiteur
  // anonyme repart de son brouillon local. Un identifiant introuvable (CV
  // supprimé, lien d'un autre compte) retombe sur le dernier CV.
  const requested = user !== null && id !== undefined ? await loadResume(id) : null;
  const stored = requested ?? (user === null || nouveau !== undefined ? null : await loadResume());
  const target = nouveau !== undefined ? 'new' : requested !== null ? 'open' : 'latest';

  return (
    <>
      {user === null ? null : (
        <div className="-mt-2 mb-2 flex flex-wrap items-center justify-between gap-x-3 text-sm">
          <Link href="/compte" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent-ink">
            <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" />
              <path d="M5 5h6M5 8h6M5 11h3" />
            </svg>
            Mes CV
          </Link>
          <span className="truncate text-muted">{user.email}</span>
        </div>
      )}
      <ResumeEditor
        // Passer d'un CV à l'autre reste sur la même route : sans clé, Next
        // garderait l'éditeur monté et son choix initial avec lui.
        key={`${target}:${requested?.id ?? ''}`}
        signedIn={user !== null}
        stored={stored === null ? null : { id: stored.id, data: stored.data }}
        target={target}
        initialStep={isStepId(etape) ? etape : null}
        // Modèle touché sur la page d'accueil ; ignoré s'il n'existe pas.
        initialTemplate={isTemplateId(modele) ? modele : null}
        justSignedIn={user !== null && suite === 'telechargement'}
      />
    </>
  );
}
