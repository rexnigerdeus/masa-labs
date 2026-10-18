import type { Metadata } from 'next';
import Link from 'next/link';
import { TrackView } from '../../components/TrackView';
import { WaitlistForm } from '../../components/WaitlistForm';
import { PAYMENTS_ENABLED } from '../../lib/payments';

export const metadata: Metadata = {
  title: 'Tarifs',
  description:
    'Votre premier CV est gratuit pour toujours. CV ciblé à 500 F, Pass Candidature à '
    + '2 000 F pour 30 jours, sans renouvellement automatique.',
  alternates: { canonical: '/tarifs' },
};

/**
 * Page Tarifs (brief v2, lot B). Cartes et mention reprises mot pour mot.
 *
 * Paiements éteints (`PAYMENTS_ENABLED`) : les deux boutons payants
 * deviennent « Bientôt disponible — me prévenir » et déplient la liste
 * d'attente sur place (`<details>`, sans JavaScript). Allumés : ils mènent
 * au récapitulatif /paiement, qui affiche le prix avant Wave.
 *
 * Revalidée : l'interrupteur est lu au rendu, une heure de décalage au plus
 * après son changement, ce qui est le délai d'un redéploiement de toute façon.
 */
export const revalidate = 3600;

const CARDS = [
  {
    name: 'Gratuit',
    price: null,
    text: 'Un CV complet, modifiable à volonté. 8 modèles, score en direct, offres et conseils. Pour toujours.',
    button: 'Créer mon CV',
    href: '/cv',
    waitlist: null,
  },
  {
    name: 'CV ciblé — 500 F',
    price: '500 F',
    text: 'Une version supplémentaire de votre CV, adaptée à un autre poste ou à une offre précise. Paiement unique.',
    button: 'Créer une version',
    href: '/cv/version',
    waitlist: 'cv_cible',
  },
  {
    name: 'Pass Candidature — 2 000 F / 30 jours',
    price: '2 000 F',
    text: 'Versions ciblées illimitées et une lettre de motivation par offre, pendant 30 jours. Pas de renouvellement automatique : vous rachetez un pass si vous le souhaitez.',
    button: 'Prendre le pass',
    href: '/paiement?offre=pass_candidature',
    waitlist: 'pass',
  },
] as const;

export default function TarifsPage() {
  return (
    <div className="flex flex-col gap-6">
      <TrackView event="paywall_viewed" props={{ contexte: 'tarifs' }} />
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Tarifs</h1>
        <p className="max-w-2xl text-muted">
          Votre premier CV est gratuit pour toujours. Prix affiché avant
          paiement, sans abonnement.
        </p>
      </header>

      <ul className="grid gap-4 md:grid-cols-3">
        {CARDS.map((card, i) => (
          <li
            key={card.name}
            className={`card flex flex-col gap-3 p-5 ${i === 0 ? 'ring-2 ring-accent' : ''}`}
          >
            <h2 className="text-lg font-bold">{card.name}</h2>
            <p className="flex-1 text-sm text-muted">{card.text}</p>
            {card.waitlist === null || PAYMENTS_ENABLED ? (
              <Link
                href={card.href}
                className={`inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold ${
                  i === 0 ? 'bg-accent text-header hover:bg-accent-dark' : 'border-2 border-accent text-accent-ink hover:bg-accent-soft'
                }`}
              >
                {card.button}
              </Link>
            ) : (
              <details className="group">
                <summary className="inline-flex min-h-12 w-full cursor-pointer list-none items-center justify-center rounded-full border-2 border-accent px-5 text-sm font-semibold text-accent-ink hover:bg-accent-soft [&::-webkit-details-marker]:hidden">
                  Bientôt disponible — me prévenir
                </summary>
                <div className="mt-4">
                  <WaitlistForm product={card.waitlist} placement="tarifs" />
                </div>
              </details>
            )}
          </li>
        ))}
      </ul>

      <p className="text-sm text-muted">
        Paiement par Wave. Si votre document ne se génère pas après paiement,
        écrivez-nous : nous vous remboursons.
      </p>
    </div>
  );
}
