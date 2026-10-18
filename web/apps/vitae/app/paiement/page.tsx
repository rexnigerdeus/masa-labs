import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '../../components/auth/AuthForm';
import { WaitlistForm } from '../../components/WaitlistForm';
import { currentUser } from '../../lib/supabase/server';
import { isGoogleEnabled } from '../../lib/supabase/providers';
import { startCheckout } from '../../lib/checkout';
import { OFFERS, PAYMENTS_ENABLED, formatFcfa, isOffer } from '../../lib/payments';

export const metadata: Metadata = { title: 'Paiement', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * Récapitulatif avant paiement (brief v2, règle 4 : prix affiché avant tout
 * paiement, aucun compte à rebours, aucune case précochée, aucun
 * renouvellement caché).
 *
 * Trois états : paiements éteints → liste d'attente ; pas de compte → on le
 * crée ici, et on revient ; sinon → le prix, ce qu'il donne, et un seul
 * bouton vers Wave.
 */
const WHAT_YOU_GET = {
  cv_credit: [
    'Une version supplémentaire de votre CV, adaptée à un autre poste ou à une offre précise.',
    'Modifiable et téléchargeable ensuite autant que vous voulez.',
    'Paiement unique.',
  ],
  pass_candidature: [
    'Pendant 30 jours : versions ciblées illimitées et une lettre de motivation par offre.',
    'Pas de renouvellement automatique : vous rachetez un pass si vous le souhaitez.',
    'À la fin du pass, tout ce que vous avez créé reste modifiable et téléchargeable.',
  ],
} as const;

const ERRORS: Record<string, string> = {
  creation: 'Le paiement n’a pas pu être préparé. Rien n’a été débité ; réessayez.',
  wave: 'Wave ne répond pas pour le moment. Rien n’a été débité ; réessayez dans un instant.',
};

export default async function PaiementPage({
  searchParams,
}: {
  searchParams: Promise<{ offre?: string; erreur?: string }>;
}) {
  const { offre, erreur } = await searchParams;
  if (!isOffer(offre)) redirect('/tarifs');
  const offer = OFFERS[offre];
  const price = formatFcfa(offer.amountXof);
  const user = await currentUser();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-muted">{offer.name}</p>
        <h1 className="text-3xl font-bold">
          {price}
          {offre === 'pass_candidature' ? <span className="text-lg font-semibold text-muted"> / 30 jours</span> : null}
        </h1>
      </header>

      <ul className="card flex flex-col gap-2 p-4 text-sm">
        {WHAT_YOU_GET[offre].map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden className="font-bold text-accent-ink">✓</span>
            {line}
          </li>
        ))}
      </ul>

      {erreur !== undefined && ERRORS[erreur] !== undefined ? (
        <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm">{ERRORS[erreur]}</p>
      ) : null}

      {!PAYMENTS_ENABLED ? (
        <section className="card flex flex-col gap-3 p-4" aria-labelledby="bientot">
          <h2 id="bientot" className="font-semibold">Bientôt disponible — me prévenir</h2>
          <WaitlistForm product={offer.waitlist} placement={`paiement_${offre}`} />
        </section>
      ) : user === null ? (
        <section className="flex flex-col gap-3" aria-labelledby="compte">
          <h2 id="compte" className="font-semibold">Créez votre compte pour continuer</h2>
          <p className="text-sm text-muted">
            Le droit acheté est rattaché à votre compte, pour le retrouver sur
            n’importe quel téléphone. Votre CV y sera rattaché aussi.
          </p>
          <AuthForm googleEnabled={await isGoogleEnabled()} next={`/paiement?offre=${offre}`} />
        </section>
      ) : (
        <form action={startCheckout} className="flex flex-col gap-3">
          <input type="hidden" name="offre" value={offre} />
          <button
            type="submit"
            data-track="checkout_started"
            data-track-props={JSON.stringify({ offre })}
            className="inline-flex min-h-13 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-header hover:bg-accent-dark"
          >
            Payer {price} avec Wave
          </button>
          <p className="text-sm text-muted">
            Vous serez redirigé vers Wave pour confirmer. Paiement par Wave.
            Si votre document ne se génère pas après paiement, écrivez-nous :
            nous vous remboursons.
          </p>
        </form>
      )}

      <Link href="/tarifs" className="text-sm font-semibold text-accent-ink underline underline-offset-4">
        Voir tous les tarifs
      </Link>
    </div>
  );
}
