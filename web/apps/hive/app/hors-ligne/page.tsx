import Link from 'next/link';

export const metadata = { title: 'Hors connexion', robots: { index: false } };

/** Page de secours servie par le service worker quand le réseau manque. */
export default function HorsLignePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-10 text-center">
      <h1 className="text-2xl font-bold">Vous êtes hors connexion</h1>
      <p className="text-muted">
        Hive a besoin du réseau pour afficher les annonces : un matériel déjà
        loué qu’on vous montrerait comme disponible vous ferait faire le
        déplacement pour rien.
      </p>
      <p>
        <Link
          href="/"
          className="inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white"
        >
          Réessayer
        </Link>
      </p>
    </div>
  );
}
