import Link from 'next/link';
import { SAMPLE_RESUME, TEMPLATE_LIST, scoreResume } from '@everyday/cv-core';
import { TemplateSketch } from '../components/TemplateSketch';
import {
  AtsFilterIllustration, DotGrid, IconApply, IconCreate, IconLearn,
} from '../components/graphics';

/**
 * Accueil.
 *
 * Composant serveur, sans JavaScript client : c'est la page qui doit s'afficher
 * le plus vite sur une connexion lente.
 *
 * Les modèles sont montrés en croquis et non en CV de démonstration. Un CV
 * complet réduit à 200 px de large ne se lit pas : on y voit du gris, et deux
 * modèles pourtant très différents y paraissent identiques. Le croquis, lui,
 * est dérivé du descripteur du modèle — il montre au bon rapport ce qui les
 * distingue vraiment, sans faire passer un exemple inventé pour un vrai CV.
 * Le rendu réel, avec ses propres mots, est à un clic dans l'éditeur.
 */
export default function HomePage() {
  const demo = scoreResume(SAMPLE_RESUME);

  return (
    <div className="flex flex-col gap-12">
      {/* `isolate` est indispensable : sans contexte d'empilement propre, le
          `-z-10` du fond ponctué le renvoie derrière l'arrière-plan de la page
          et le rend invisible. */}
      <section className="relative isolate grid items-center gap-8 lg:grid-cols-2">
        <div className="pointer-events-none absolute -inset-x-4 -inset-y-8 -z-10 overflow-hidden text-ink opacity-[0.08]">
          <DotGrid className="h-full w-full" />
        </div>
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
            <li>· Votre photo sur le CV, affichée ou masquée d’un clic</li>
            <li>· La couleur principale de votre choix sur chaque modèle</li>
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

        {/* Le CV dessiné, pas photographié : la vignette illustre le produit
            sans exhiber un faux CV qu'on prendrait pour un modèle imposé. */}
        <div className="mx-auto w-full max-w-xs">
          <div className="relative">
            <TemplateSketch
              templateId="classique"
              className="w-full rounded-lg border border-line shadow-sm"
            />
            <p className="absolute -bottom-3 -right-2 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-sm">
              Score {demo.total}/100
            </p>
          </div>
          <p className="mt-5 text-center text-xs text-muted">
            Un CV noté en direct pendant que vous le remplissez.
          </p>
        </div>
      </section>

      {/* Le tri automatique montré plutôt qu'expliqué : c'est la notion que
          la cible ne connaît pas, et une image la fait comprendre plus vite
          qu'un paragraphe. */}
      <section className="card grid items-center gap-6 p-6 sm:grid-cols-[1fr_auto]">
        <div>
          <h2 className="text-xl font-bold">Pourquoi votre CV n’a pas de réponse</h2>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Avant d’arriver sur le bureau d’un recruteur, la plupart des
            candidatures passent par un logiciel qui lit le fichier et écarte
            ce qu’il ne comprend pas : colonnes, tableaux, icônes, texte en
            image. Un beau CV illisible par la machine ne sera jamais lu par
            personne.
          </p>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Les modèles de Vitae sont conçus pour franchir cette étape — et
            vérifiés automatiquement, en réextrayant le texte de chaque PDF
            produit.
          </p>
        </div>
        <AtsFilterIllustration className="h-auto w-full max-w-sm sm:w-80" />
      </section>

      <section>
        <h2 className="mb-1 text-xl font-bold">Les quatre modèles</h2>
        <p className="mb-4 max-w-2xl text-sm text-muted">
          Tous gratuits, tous vérifiés lisibles par les logiciels de tri. Une
          seule colonne, pas d’icône ni de tableau : c’est ce qui les rend
          relisibles. Chacun accepte votre photo et la couleur de votre choix ;
          les croquis ci-dessous en montrent la mise en page.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATE_LIST.map((t) => (
            <li key={t.id} className="flex flex-col gap-3">
              {/* Le croquis lit le descripteur du modèle : marges, densité,
                  habillage des titres et place de la photo y sont à l'échelle
                  de la page. Il ne peut donc pas mentir sur ce que produit le
                  modèle, même s'il n'en montre pas les mots. */}
              <TemplateSketch
                templateId={t.id}
                className="w-full rounded-lg border border-line bg-white"
              />
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
          <span className="text-accent-dark"><IconCreate /></span>
          <h2 className="mt-2 font-semibold">Créer</h2>
          <p className="mt-1 text-sm text-muted">
            Un formulaire guidé, un score en direct, un PDF propre en quelques minutes.
          </p>
        </div>
        <div className="card p-4">
          <span className="text-accent-dark"><IconApply /></span>
          <h2 className="mt-2 font-semibold">Postuler</h2>
          <p className="mt-1 text-sm text-muted">
            Des offres de stage et d’emploi réelles, avec le lien de candidature direct.
          </p>
          <Link href="/offres" className="mt-2 inline-block text-sm text-accent-dark underline">
            Voir les offres
          </Link>
        </div>
        <div className="card p-4">
          <span className="text-accent-dark"><IconLearn /></span>
          <h2 className="mt-2 font-semibold">Progresser</h2>
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
