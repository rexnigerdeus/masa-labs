import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '../../components/auth/AuthForm';
import { currentUser } from '../../lib/supabase/server';
import { isGoogleEnabled } from '../../lib/supabase/providers';

export const metadata: Metadata = { title: 'Connexion', robots: { index: false } };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>;
}) {
  const { suite } = await searchParams;
  const user = await currentUser();
  // `suite` : où reprendre après la connexion (un paiement, une version).
  // Seul un chemin interne est accepté : la page ne doit pas servir de
  // tremplin vers un autre site.
  const next = typeof suite === 'string' && suite.startsWith('/') && !suite.startsWith('//')
    ? suite
    : null;
  if (user !== null) redirect(next ?? (suite === 'telechargement' ? '/cv' : '/compte'));

  const googleEnabled = await isGoogleEnabled();
  const fromDownload = suite === 'telechargement';

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Votre compte Vitae</h1>
      {next !== null ? (
        <p className="max-w-md text-muted">
          Un compte est nécessaire pour cette étape. Votre CV est déjà
          enregistré sur ce téléphone : il sera rattaché à votre compte.
        </p>
      ) : null}
      {/* Venu du téléchargement : le retour ramène sur l'écran final du
          parcours, qui annonce que le téléchargement est désormais possible. */}
      <AuthForm
        googleEnabled={googleEnabled}
        next={next ?? (fromDownload ? '/cv?suite=telechargement' : '/cv')}
      />
    </div>
  );
}
