import type { Metadata } from 'next';
import { ResumeEditor } from '../../components/editor/ResumeEditor';
import { currentUser } from '../../lib/supabase/server';
import { loadResume } from '../../lib/resumes';

export const metadata: Metadata = {
  title: 'Créer mon CV',
  description:
    'Remplissez votre CV section par section, voyez le score progresser en '
    + 'direct et téléchargez un PDF que les logiciels de tri savent relire.',
  alternates: { canonical: '/cv' },
};

export default async function CvPage() {
  const user = await currentUser();
  // Le CV enregistré n'est lu que pour un compte connecté ; un visiteur
  // anonyme repart de son brouillon local.
  const stored = user === null ? null : await loadResume();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Créer mon CV</h1>
        {user === null ? null : (
          <form action="/auth/deconnexion" method="post" className="flex items-center gap-3">
            <span className="text-sm text-muted">{user.email}</span>
            <button type="submit" className="text-sm text-muted underline hover:text-ink">
              Se déconnecter
            </button>
          </form>
        )}
      </div>
      <ResumeEditor
        signedIn={user !== null}
        stored={stored === null ? null : { id: stored.id, data: stored.data }}
      />
    </>
  );
}
