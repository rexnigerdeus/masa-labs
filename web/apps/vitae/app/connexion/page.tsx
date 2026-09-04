import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '../../components/auth/AuthForm';
import { currentUser } from '../../lib/supabase/server';
import { isGoogleEnabled } from '../../lib/supabase/providers';

export const metadata: Metadata = { title: 'Connexion — Vitae' };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>;
}) {
  const { suite } = await searchParams;
  const user = await currentUser();
  if (user !== null) redirect('/cv');

  const googleEnabled = await isGoogleEnabled();
  const fromDownload = suite === 'telechargement';

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">
        {fromDownload ? 'Encore une étape' : 'Votre compte Vitae'}
      </h1>
      {fromDownload ? (
        <p className="max-w-md text-muted">
          Créez un compte pour télécharger votre CV. C’est gratuit, et votre
          travail est déjà enregistré : vous reviendrez exactement où vous en
          étiez.
        </p>
      ) : null}
      <AuthForm googleEnabled={googleEnabled} next="/cv" />
    </div>
  );
}
