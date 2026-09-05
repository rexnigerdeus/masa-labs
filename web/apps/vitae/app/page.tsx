import Link from 'next/link';
import { SAMPLE_RESUME, TEMPLATE_LIST, scoreResume } from '@everyday/cv-core';
import { ResumePreview } from '../components/ResumePreview';

/**
 * Accueil.
 *
 * Composant serveur, sans JavaScript client : c'est la page qui doit s'afficher
 * le plus vite sur une connexion lente. L'aperçu du CV de démonstration est
 * rendu côté serveur, il n'y a rien à hydrater.
 */
export default function HomePage() {
  const demo = scoreResume(SAMPLE_RESUME);

  return (
    <div className="flex flex-col gap-12">
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Un CV que les recruteurs — et leurs logiciels — savent lire.
          </h1>
          <p className="text-muted">
            Vitae vous guide section par section, note votre CV en direct et vous
            dit quoi corriger. Pas de mise en page à gérer, pas de logiciel à
            installer, pas de paiement.
          </p>
          <ul className="flex flex-col gap-1.5 text-sm">
            <li>· Quatre modèles vérifiés lisibles par les logiciels de tri (ATS)</li>
            <li>· Score et conseils calculés dans votre navigateur, en direct</li>
            <li>· Téléchargement PDF gratuit, sans filigrane</li>
            <li>· Offres de stage et d’emploi en Côte d’Ivoire, mises à jour chaque jour</li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/cv"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-dark"
            >
              Créer mon CV
            </Link>
            <Link
              href="/cv?import=linkedin"
              className="rounded-full border border-accent px-5 py-2.5 text-sm font-medium text-accent-dark hover:bg-accent-soft"
            >
              Importer depuis LinkedIn
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <ResumePreview resume={SAMPLE_RESUME} />
          <p className="mt-2 text-center text-xs text-muted">
            Exemple de CV — score {demo.total}/100
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-bold">Les quatre modèles</h2>
        <p className="mb-4 max-w-2xl text-sm text-muted">
          Tous gratuits, tous vérifiés lisibles par les logiciels de tri. Une
          seule colonne, pas d’icône ni de tableau : c’est ce qui les rend
          relisibles. Ce que vous voyez ici est le rendu réel, pas une image.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATE_LIST.map((t) => (
            <li key={t.id} className="flex flex-col gap-3">
              {/* Miniature rendue par le même composant que l'aperçu de
                  l'éditeur, avec le même CV d'exemple : la vignette ne peut
                  pas mentir sur ce que produit le modèle. */}
              <div className="overflow-hidden rounded-lg border border-line">
                <ResumePreview resume={{ ...SAMPLE_RESUME, templateId: t.id }} />
              </div>
              <div>
                <h3 className="font-semibold">{t.name}</h3>
                <p className="mt-1 text-sm text-muted">{t.description}</p>
                <p className="mt-1 text-xs text-muted">Idéal pour : {t.bestFor}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <h2 className="font-semibold">Créer</h2>
          <p className="mt-1 text-sm text-muted">
            Un formulaire guidé, un score en direct, un PDF propre en quelques minutes.
          </p>
        </div>
        <div className="card p-4">
          <h2 className="font-semibold">Postuler</h2>
          <p className="mt-1 text-sm text-muted">
            Des offres de stage et d’emploi réelles, avec le lien de candidature direct.
          </p>
          <Link href="/offres" className="mt-2 inline-block text-sm text-accent-dark underline">
            Voir les offres
          </Link>
        </div>
        <div className="card p-4">
          <h2 className="font-semibold">Progresser</h2>
          <p className="mt-1 text-sm text-muted">
            Entretien, relance, droit du travail : les codes du recrutement expliqués.
          </p>
          <Link href="/conseils" className="mt-2 inline-block text-sm text-accent-dark underline">
            Lire les conseils
          </Link>
        </div>
      </section>
    </div>
  );
}
