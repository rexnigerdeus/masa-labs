import type { Metadata } from 'next';
import { WaitlistForm } from '../../components/WaitlistForm';

export const metadata: Metadata = {
  title: 'Préparer les concours',
  description:
    'Un outil de révision pour les concours de la fonction publique et des grandes '
    + 'écoles, depuis votre téléphone. Dites-nous si cela vous intéresse.',
  alternates: { canonical: '/concours' },
};

/**
 * Mesure de la demande pour une future app de révision (brief v2, lot A).
 * Textes repris mot pour mot ; la question à choix multiple voyage avec
 * l'inscription (`waitlist.details.concours`), pas dans la mesure
 * d'audience, qui ne contient aucune donnée personnelle.
 */
const CONCOURS = [
  'Fonction publique', 'Grandes écoles', 'Police ou gendarmerie', 'Enseignement', 'Autre',
] as const;

export default function ConcoursPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Préparer les concours, depuis votre téléphone
        </h1>
        <p className="text-muted">
          Nous préparons un outil de révision pour les concours de la fonction
          publique et des grandes écoles : un QCM par jour, des annales, des
          examens blancs. Dites-nous si cela vous intéresse.
        </p>
      </header>
      <div className="card p-5">
        <WaitlistForm
          product="concours"
          placement="concours"
          question={{ name: 'concours', label: 'Quel concours préparez-vous ?', options: CONCOURS }}
        />
      </div>
    </div>
  );
}
