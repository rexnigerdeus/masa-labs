import type { Metadata } from 'next';
import { isTemplateId } from '@everyday/cv-core';
import { ResumeEditor } from '../../components/editor/ResumeEditor';
import { currentUser } from '../../lib/supabase/server';
import { loadResume } from '../../lib/resumes';

export const metadata: Metadata = {
  title: 'Créer mon CV',
  description:
    'Choisissez un modèle, répondez à quelques questions, voyez votre CV à '
    + 'chaque étape et téléchargez un PDF que les logiciels de tri savent relire.',
  alternates: { canonical: '/cv' },
};

export default async function CvPage({
  searchParams,
}: {
  searchParams: Promise<{ modele?: string; suite?: string }>;
}) {
  const { modele, suite } = await searchParams;
  const user = await currentUser();
  // Le CV enregistré n'est lu que pour un compte connecté ; un visiteur
  // anonyme repart de son brouillon local.
  const stored = user === null ? null : await loadResume();

  return (
    <>
      {user === null ? null : (
        <form
          action="/auth/deconnexion"
          method="post"
          className="-mt-2 mb-2 flex flex-wrap items-center justify-end gap-x-3 text-sm text-muted"
        >
          <span className="truncate">{user.email}</span>
          <button type="submit" className="min-h-11 underline hover:text-ink">
            Se déconnecter
          </button>
        </form>
      )}
      <ResumeEditor
        signedIn={user !== null}
        stored={stored === null ? null : { id: stored.id, data: stored.data }}
        // Modèle touché sur la page d'accueil ; ignoré s'il n'existe pas.
        initialTemplate={isTemplateId(modele) ? modele : null}
        justSignedIn={user !== null && suite === 'telechargement'}
      />
    </>
  );
}
