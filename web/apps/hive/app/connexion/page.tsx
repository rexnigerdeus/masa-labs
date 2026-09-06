import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '../../components/auth/AuthForm';
import { currentUser } from '../../lib/supabase/server';

export const metadata: Metadata = { title: 'Connexion — Hive' };

/**
 * `suite` porte la page d'où l'on vient : quelqu'un qui voulait réserver doit
 * revenir sur l'annonce après s'être connecté, pas atterrir sur l'accueil.
 */
export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string }>;
}) {
  const { suite } = await searchParams;
  const user = await currentUser();
  // Une destination doit être interne : une URL absolue transformerait ce
  // paramètre en redirection ouverte vers n'importe quel site.
  const next = suite !== undefined && suite.startsWith('/') && !suite.startsWith('//')
    ? suite
    : '/';

  if (user !== null) redirect(next);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Votre compte Hive</h1>
      <p className="max-w-md text-muted">
        Un numéro et un mot de passe suffisent. Le compte sert à publier une
        annonce, réserver du matériel et échanger avec le loueur.
      </p>
      <AuthForm next={next} />
    </div>
  );
}
