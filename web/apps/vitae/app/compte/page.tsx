import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthForm } from '../../components/auth/AuthForm';
import { DeleteAccountButton } from '../../components/account/DeleteAccountButton';
import { LocalDraftNotice } from '../../components/account/LocalDraftNotice';
import { ResumeCard } from '../../components/account/ResumeCard';
import { listResumes } from '../../lib/resumes';
import { listLetters } from '../../lib/letters';
import { formatLongDate } from '../../lib/catalog';
import { formatPhone, phoneFromEmail } from '../../lib/phone';
import { loadRights, passEndsSoon } from '../../lib/payments';
import { currentUser } from '../../lib/supabase/server';
import { isGoogleEnabled } from '../../lib/supabase/providers';

export const metadata: Metadata = { title: 'Mon compte', robots: { index: false } };

/**
 * Espace compte : les CV, les lettres, les droits, et la suppression.
 *
 * Déconnecté, on se connecte ; connecté, on retrouve chaque CV avec son vrai
 * rendu, son score, sa date — et un seul geste pour le rouvrir. Le CV gratuit
 * vient en tête ; « Créer un nouveau CV » mène à l'écran du 2e CV (brief v2,
 * lot B) dès qu'il en existe un.
 *
 * Le rappel de fin de pass (brief v2) s'affiche trois jours avant la fin,
 * texte mot pour mot.
 */
const DELETED = {
  compte: 'Votre compte et vos CV ont été supprimés.',
  donnees: 'Vos CV et vos lettres Vitae ont été supprimés. Votre compte est conservé, car il sert à une autre application de The Everyday Co.',
} as const;

export default async function ComptePage({
  searchParams,
}: {
  searchParams: Promise<{ supprime?: string }>;
}) {
  const { supprime } = await searchParams;
  const user = await currentUser();

  if (user === null) {
    const googleEnabled = await isGoogleEnabled();
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        {supprime === 'compte' || supprime === 'donnees' ? (
          <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-header">
            {DELETED[supprime]}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold">Votre compte Vitae</h1>
        <p className="text-muted">
          Votre premier CV se crée et se télécharge sans compte. Connectez-vous
          pour le retrouver sur un autre téléphone, ou en créer d’autres
          versions.
        </p>
        <AuthForm googleEnabled={googleEnabled} next="/compte" />
      </div>
    );
  }

  const [resumes, letters, rights] = await Promise.all([listResumes(), listLetters(), loadRights()]);
  const phone = phoneFromEmail(user.email);
  const who = phone === null ? user.email : formatPhone(phone);
  const newHref = resumes.length === 0 ? '/cv?nouveau=1' : '/cv/version';

  return (
    <div className="flex flex-col gap-6">
      {supprime === 'donnees' ? (
        <p role="status" className="rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-header">
          {DELETED.donnees}
        </p>
      ) : null}

      {passEndsSoon(rights) && rights.passEndsAt !== null ? (
        <p role="status" className="rounded-xl bg-warn-soft px-4 py-3 text-sm">
          Votre Pass Candidature se termine le {formatLongDate(rights.passEndsAt)}. Vos CV
          et lettres restent accessibles et téléchargeables. Pour continuer à
          créer des versions, vous pourrez reprendre un pass.
        </p>
      ) : null}

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
          href={newHref}
          className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-accent px-6 text-base font-semibold text-header hover:bg-accent-dark"
        >
          <span aria-hidden className="text-xl leading-none">+</span>
          Créer un nouveau CV
        </Link>
      </header>

      <LocalDraftNotice hasPrimary={resumes.length > 0} />

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

      {/* Droits : ce qui a été acheté, et jusqu'à quand. Rien ne s'affiche
          tant qu'on n'a rien acheté. */}
      {rights.passEndsAt !== null || rights.credits > 0 ? (
        <section className="card flex flex-col gap-1.5 p-4" aria-labelledby="droits-titre">
          <h2 id="droits-titre" className="font-semibold">Mes options</h2>
          {rights.passEndsAt === null ? null : (
            <p className="text-sm text-muted">
              Pass Candidature actif jusqu’au {formatLongDate(rights.passEndsAt)} (sans renouvellement automatique).
            </p>
          )}
          {rights.credits > 0 ? (
            <p className="text-sm text-muted">
              {rights.credits} version{rights.credits > 1 ? 's' : ''} ciblée{rights.credits > 1 ? 's' : ''} à créer.
            </p>
          ) : null}
        </section>
      ) : null}

      {letters.length > 0 || rights.canCreateLetter ? (
        <section className="flex flex-col gap-3" aria-labelledby="lettres-titre">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="lettres-titre" className="text-xl font-bold">Mes lettres de motivation</h2>
            {rights.canCreateLetter ? (
              <Link href="/lettres/nouvelle" className="inline-flex min-h-11 items-center rounded-full border-2 border-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-soft">
                Nouvelle lettre
              </Link>
            ) : null}
          </div>
          {letters.length === 0 ? (
            <p className="text-sm text-muted">Aucune lettre pour l’instant.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {letters.map((l) => (
                <li key={l.id} className="card flex flex-col gap-1 p-4">
                  <h3 className="font-semibold">{l.letter.position || 'Lettre de motivation'}</h3>
                  <p className="text-sm text-muted">
                    {[l.letter.company, `modifiée le ${formatLongDate(l.updatedAt)}`].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link href={`/lettres/${l.id}`} className="inline-flex min-h-11 items-center rounded-full border-2 border-accent px-4 text-sm font-semibold text-accent-ink">
                      Modifier
                    </Link>
                    <a href={`/api/lettre/${l.id}`} className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-accent-ink underline">
                      Télécharger
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Connecté</h2>
          <p className="truncate text-sm text-muted">{who}</p>
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

      <section className="flex flex-col items-start gap-2" aria-labelledby="supprimer-titre">
        <h2 id="supprimer-titre" className="text-sm font-semibold">Supprimer mes données</h2>
        <p className="text-sm text-muted">
          Effectif immédiatement. Voir <Link href="/confidentialite" className="underline">ce que nous conservons</Link>.
        </p>
        <DeleteAccountButton />
      </section>
    </div>
  );
}
