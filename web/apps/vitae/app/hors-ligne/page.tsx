import Link from 'next/link';

export const metadata = { title: 'Hors connexion', robots: { index: false } };

/** Page de secours servie par le service worker quand le réseau manque. */
export default function HorsLignePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-10 text-center">
      <h1 className="text-2xl font-bold">Vous êtes hors connexion</h1>
      <p className="text-muted">
        Votre CV est enregistré dans ce navigateur : il n’est pas perdu. Vous
        pouvez continuer à le remplir, la sauvegarde en ligne et le
        téléchargement reprendront dès le retour du réseau.
      </p>
      <p>
        <Link
          href="/cv"
          className="inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white"
        >
          Revenir à mon CV
        </Link>
      </p>
      <p className="text-sm text-muted">
        Les offres d’emploi, elles, ont besoin d’une connexion : une annonce
        périmée ne vaut rien.
      </p>
    </div>
  );
}
