import { WaitlistForm } from '../components/WaitlistForm';
import { VITAE_LINK } from '../lib/pause';

/**
 * Hive fait une pause (brief v2 de la vitrine, « Archivage de Hive »).
 *
 * Page unique : toutes les autres routes y sont renvoyées par le
 * middleware. Elle dit honnêtement ce qui se passe, propose d'être prévenu
 * au retour, et renvoie vers Vitae en attendant. Plus aucune annonce n'est
 * lue ni affichée.
 *
 * L'ancien accueil (hero, catalogue, recherche) reste dans l'historique Git.
 */
export default function PausePage() {
  return (
    <section className="mx-auto flex max-w-lg flex-col gap-6 py-6 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Hive fait une pause.</h1>
      <p className="leading-relaxed text-muted">
        On a construit Hive pour que le matériel audiovisuel qui dort trouve
        preneur à Abidjan. On le reprendra quand on pourra le faire bien :
        loueurs vérifiés, cautions, contrats.
      </p>

      <div className="rounded-[var(--radius-card)] border border-line bg-card p-5">
        <WaitlistForm />
      </div>

      <a href={VITAE_LINK} className="font-medium text-primary underline-offset-4 hover:underline">
        En attendant, découvre Vitae →
      </a>
    </section>
  );
}
