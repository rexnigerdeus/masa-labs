import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthForm } from '../../components/auth/AuthForm';
import { LocalDraftNotice } from '../../components/account/LocalDraftNotice';
import { ResumeCard } from '../../components/account/ResumeCard';
import { listResumes } from '../../lib/resumes';
import { currentUser } from '../../lib/supabase/server';
import { isGoogleEnabled } from '../../lib/supabase/providers';

export const metadata: Metadata = { title: 'Mon compte', robots: { index: false } };

/**
 * Espace compte : la liste des CV, et de quoi les rouvrir.
 *
 * Le lien « Compte » du menu menait à la page de connexion, qui renvoyait
 * aussitôt vers l'éditeur une fois connecté : on n'y voyait ni ses CV ni son
 * compte. Ici, déconnecté, on se connecte ; connecté, on retrouve chaque CV
 * avec son vrai rendu, son score, sa date — et un seul geste pour le rouvrir.
 */
export default async function ComptePage() {
  const user = await currentUser();

  if (user === null) {
    const googleEnabled = await isGoogleEnabled();
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <h1 className="text-2xl font-bold">Votre compte Vitae</h1>
        <p className="text-muted">
          Connectez-vous pour retrouver vos CV sur tous vos appareils et les
          télécharger en PDF. C’est gratuit.
        </p>
        <AuthForm googleEnabled={googleEnabled} next="/compte" />
      </div>
    );
  }

  const resumes = await listResumes();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Mes CV</h1>
          <p className="mt-1 text-sm text-muted">
            {resumes.length === 0
              ? 'Aucun CV enregistré pour l’instant.'
              : `${resumes.length} CV enregistré${resumes.length > 1 ? 's' : ''} · touchez un CV pour le modifier ou le télécharger.`}
          </p>
        </div>
        <Link
          href="/cv?nouveau=1"
          className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-accent px-6 text-base font-semibold text-header hover:bg-accent-dark"
        >
          <span aria-hidden className="text-xl leading-none">+</span>
          Créer un nouveau CV
        </Link>
      </header>

      <LocalDraftNotice />

      {resumes.length === 0 ? (
        <div className="card flex flex-col items-start gap-3 p-6">
          <h2 className="text-lg font-semibold">Votre premier CV vous attend</h2>
          <p className="text-sm text-muted">
            Choisissez un modèle, répondez à quelques questions : il sera
            enregistré ici automatiquement.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => <ResumeCard key={r.id} resume={r} />)}
        </ul>
      )}

      <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Connecté</h2>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
        <form action="/auth/deconnexion" method="post">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold hover:border-ink"
          >
            Se déconnecter
          </button>
        </form>
      </section>
    </div>
  );
}
