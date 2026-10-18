import type { Metadata } from 'next';
import { PublishOfferForm } from '../../components/PublishOfferForm';

export const metadata: Metadata = {
  title: 'Publier une offre gratuitement',
  description:
    'Entreprises, écoles, associations : publiez gratuitement une offre de stage ou de '
    + 'premier emploi, lue par des étudiants et jeunes diplômés d’Abidjan.',
  alternates: { canonical: '/publier-une-offre' },
};

/**
 * Dépôt d'offre par les recruteurs, écoles et associations (brief v2,
 * offres §6) : la source d'offres pour débutants que la collecte automatique
 * ne fournit pas. Page statique ; seul le formulaire est un îlot client.
 */
export default function PublierUneOffrePage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Publier une offre gratuitement</h1>
        <p className="text-muted">
          Vous cherchez un stagiaire, un animateur, un premier emploi ? Vitae est
          lu par des étudiants et jeunes diplômés d’Abidjan. La publication est
          gratuite ; chaque offre est relue avant sa mise en ligne.
        </p>
      </header>
      <PublishOfferForm />
    </div>
  );
}
