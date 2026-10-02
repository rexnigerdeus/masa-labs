import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Hors connexion' };

/**
 * Dernier recours du service worker : une page jamais visitée et pas encore
 * en cache, demandée sans réseau. Les écrans principaux, eux, sont mis en
 * cache dès l'installation et s'ouvrent normalement hors-ligne.
 */
export default function Page() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold">Pas de réseau</h1>
      <p className="text-muted">
        Cette page n’est pas encore disponible hors connexion. Tes habitudes et tes tâches, elles,
        le sont : elles vivent sur ton appareil.
      </p>
      <p>
        <Link href="/" className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-on-primary">
          Revenir à Aujourd’hui
        </Link>
      </p>
    </div>
  );
}
