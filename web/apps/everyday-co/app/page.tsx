import Image from 'next/image';
import { CONTACT_EMAIL, VITAE_URL } from '../lib/config';
import { FOUNDER } from '../lib/founder';
import {
  Divider, IconAccess, IconFocus, IconMobile, PatternBackground, PhoneMockup,
} from '../components/graphics';

/**
 * Page d'accueil de The Everyday Co.
 *
 * Rythme repris de themobilefirstcompany.com (brief §8) : constat, promesse,
 * action, produit — puis seulement l'argumentaire long.
 *
 * Le texte doit tenir deux lectures à la fois. Un jeune diplômé cherche « à
 * quoi ça me sert, maintenant » : il trouve des phrases courtes, des scènes
 * concrètes et un bouton. Un investisseur cherche le problème, la taille du
 * marché, la stratégie et le modèle : il trouve les sections Vision, Objectifs
 * et Modèle. Aucune des deux lectures ne dilue l'autre, parce qu'elles ne se
 * disputent pas les mêmes blocs.
 *
 * Ce qui n'y figure pas est volontaire : pas de preuve sociale chiffrée, pas de
 * levée de fonds, pas de client cité. Le site de référence en affiche ; nous
 * n'en avons pas, et on ne les fabrique pas.
 *
 * Une seule application est présentée : Vitae (brief §8).
 */

const NAV = [
  { href: '#probleme', label: 'Le problème' },
  { href: '#vitae', label: 'Vitae' },
  { href: '#vision', label: 'Vision' },
  { href: '#fondatrice', label: 'Fondatrice' },
];

/** Trois scènes concrètes plutôt qu'un paragraphe d'analyse. */
const PROBLEMS = [
  {
    title: 'Le CV qui ne passe pas',
    body: 'Un diplômé envoie trente candidatures, n’obtient aucune réponse, et ne saura jamais que son CV a été écarté par un logiciel avant d’être lu.',
  },
  {
    title: 'La caisse dans un cahier',
    body: 'Une couturière connaît son chiffre du jour, mais pas sa marge du mois. Les logiciels de gestion coûtent plus cher que son bénéfice.',
  },
  {
    title: 'La tontine sur WhatsApp',
    body: 'Huit personnes, une cagnotte, aucune trace commune. La confiance tient jusqu’au premier désaccord sur qui a payé quoi.',
  },
];

const VITAE_FEATURES = [
  'Modèles vérifiés lisibles par les logiciels de tri (ATS)',
  'Score et conseils de correction en direct, section par section',
  'Offres de stage et d’emploi en Côte d’Ivoire, mises à jour chaque jour',
  'Téléchargement PDF gratuit, sans filigrane',
];

const PRINCIPLES = [
  {
    Icon: IconMobile,
    title: 'Mobile d’abord',
    body: 'Ici, le téléphone est déjà la banque, la boutique et le bureau. Nos outils partent de là — ils ne s’y adaptent pas après coup.',
  },
  {
    Icon: IconFocus,
    title: 'Un problème. Une app.',
    body: 'Chaque produit règle une seule chose, complètement. Pas de tableau de bord dont personne n’a besoin.',
  },
  {
    Icon: IconAccess,
    title: 'Marche en 3G',
    body: 'Téléphone d’entrée de gamme, connexion capricieuse, forfait compté. Ce n’est pas un cas limite : c’est le cahier des charges.',
  },
];

/**
 * Objectifs déclarés, par horizon.
 *
 * Formulés comme des intentions et non comme des résultats : rien ici n'est
 * présenté comme déjà atteint, hormis la mise en ligne de Vitae, qui l'est.
 */
const OBJECTIVES = [
  {
    horizon: 'Aujourd’hui',
    title: 'Vitae en ligne, gratuit, sans filigrane',
    body: 'Création de CV, score ATS, offres d’emploi et conseils. Fait — c’est le produit que vous pouvez ouvrir maintenant.',
    done: true,
  },
  {
    horizon: 'Prochains mois',
    title: 'Faire la preuve de l’usage',
    body: 'Mesurer ce qui compte vraiment : combien de CV sont menés jusqu’au téléchargement, et de combien le score progresse entre la première et la dernière minute.',
    done: false,
  },
  {
    horizon: 'Ensuite',
    title: 'La deuxième application',
    body: 'Le même travail sur un autre problème du quotidien. Une seule à la fois, annoncée quand elle est prête — pas avant.',
    done: false,
  },
];

const MARKET = [
  { figure: '15M+', label: 'Internautes connectés en Côte d’Ivoire en 2025' },
  { figure: '89 %', label: 'Des emplois sont informels — sans outil de gestion adapté' },
  { figure: '40K', label: 'Diplômés par an en Côte d’Ivoire cherchant leur voie' },
  { figure: '10M', label: 'Emplois numériques attendus en Afrique d’ici 2030 (Banque mondiale)' },
];

function FounderSection() {
  return (
    <section id="fondatrice" className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted2">Qui construit</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Une fondatrice, à Abidjan.
        </h2>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-line bg-card p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
        {FOUNDER.photo === '' ? null : (
          // Cadrage sur le visage, en CSS, sans toucher au fichier.
          //
          // `object-fit: cover` ne suffit pas : sur un portrait 3:4 ramené dans
          // un carré, il ne rogne qu'un quart de la hauteur, et la personne
          // reste minuscule au milieu du décor. Il faut donc agrandir l'image à
          // 400 % du cadre et la décaler pour amener le visage au centre. Les
          // décalages sont exprimés en pourcentage du cadre, ils suivent donc
          // sa taille. Ils valent pour cette photo précise : une autre photo
          // demandera d'autres valeurs.
          <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-2xl bg-card2">
            <Image
              src={FOUNDER.photo}
              alt={FOUNDER.name}
              width={960}
              height={1280}
              // 704 px et non 176 : l'image est rendue à 400 % du cadre.
              // Annoncer la taille du cadre ferait choisir au navigateur une
              // source trop petite, étirée puis floue.
              sizes="704px"
              className="absolute left-[-137%] top-[-181%] w-[400%] max-w-none"
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-xl font-bold">{FOUNDER.name}</h3>
            <p className="text-muted">
              {FOUNDER.role} · {FOUNDER.location}
            </p>
          </div>

          {FOUNDER.bio === '' ? null : (
            <p className="max-w-xl text-muted">{FOUNDER.bio}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <a
              href={FOUNDER.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-line2 px-5 py-2 text-sm font-medium hover:bg-card2"
            >
              Profil LinkedIn
            </a>
            {CONTACT_EMAIL === null ? null : (
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="rounded-full border border-line2 px-5 py-2 text-sm font-medium hover:bg-card2"
              >
                La contacter
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-5 py-4">
          <a href="#top" className="font-bold tracking-tight">The Everyday Co.</a>
          <ul className="hidden flex-1 gap-6 text-sm text-muted lg:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="hover:text-text">{item.label}</a>
              </li>
            ))}
          </ul>
          <a
            href={VITAE_URL}
            className="ml-auto rounded-full bg-dark px-4 py-2 text-sm font-medium text-bg hover:bg-dark2 lg:ml-0"
          >
            Ouvrir Vitae
          </a>
        </nav>
      </header>

      <main id="top" className="flex flex-col">
        {/* Accroche. Le motif de fond donne de la matière sans rien ajouter à
            lire ni un seul octet d'image à télécharger. */}
        <section className="relative overflow-hidden border-b border-line">
          <div className="pointer-events-none absolute inset-0 text-dark opacity-[0.05]">
            <PatternBackground className="h-full w-full" />
          </div>

          <div className="relative mx-auto grid max-w-5xl items-center gap-10 px-5 py-16 lg:grid-cols-[1.15fr_1fr] lg:py-24">
            <div className="flex flex-col gap-6">
              <p className="text-sm text-muted2">Abidjan, Côte d’Ivoire</p>
              <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                Les bons outils.{' '}
                <span className="bg-yellow-soft px-1.5">Enfin faits pour ici.</span>
              </h1>
              <p className="max-w-xl text-lg text-muted">
                Nos parents ont géré leur travail dans des cahiers, faute de
                mieux. Nous construisons les outils qu’ils n’ont jamais eus —
                pour le téléphone qu’on a déjà dans la poche.
              </p>
              <p className="max-w-xl font-medium">
                Un problème. Une app. Réglé.
              </p>

              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href={VITAE_URL}
                  className="rounded-full bg-[var(--color-vitae)] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
                >
                  Essayer Vitae — gratuit
                </a>
                <a
                  href="#vision"
                  className="rounded-full border border-line2 px-6 py-3 text-sm font-medium hover:bg-card2"
                >
                  Notre vision
                </a>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[260px] lg:max-w-none">
              <PhoneMockup className="h-auto w-full" />
            </div>
          </div>
        </section>

        <div className="mx-auto flex max-w-5xl flex-col gap-24 px-5 py-20">
          {/* Le problème, en trois scènes. Un jeune s'y reconnaît, un
              investisseur y lit le marché adressable. */}
          <section id="probleme" className="flex flex-col gap-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted2">Le problème</p>
              <h2 className="mt-3 max-w-3xl text-2xl font-bold leading-snug sm:text-3xl">
                Ce n’est pas que les gens manquent d’ambition. C’est qu’ils
                travaillent sans outils.
              </h2>
            </div>

            <ul className="grid gap-4 sm:grid-cols-3">
              {PROBLEMS.map((problem) => (
                <li key={problem.title} className="rounded-2xl border border-line bg-card p-5">
                  <h3 className="font-bold">{problem.title}</h3>
                  <p className="mt-2 text-sm text-muted">{problem.body}</p>
                </li>
              ))}
            </ul>

            <p className="max-w-2xl text-muted">
              Les logiciels qui règlent ces problèmes existent — ailleurs. Ils
              coûtent en euros, s’apprennent en formation et supposent une
              connexion stable. Aucune de ces trois conditions n’est vraie ici.
            </p>
          </section>

          <Divider className="text-line2" />

          {/* Le produit : la seule chose concrète à montrer. */}
          <section id="vitae" className="flex flex-col gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted2">
                Notre première application
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                Vitae — le CV qui passe les filtres.
              </h2>
            </div>

            <div className="rounded-2xl border border-line bg-card p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-dark text-xl font-bold text-[var(--color-vitae)]"
                >
                  V
                </span>
                <div>
                  <h3 className="text-xl font-bold">Vitae</h3>
                  <p className="text-sm text-muted">Emploi · En ligne</p>
                </div>
              </div>

              <p className="mt-5 max-w-2xl text-muted">
                La plupart des candidatures sont écartées par un logiciel de tri
                avant qu’un humain ne les lise. Vitae guide la rédaction section
                par section, note le CV en direct, et produit un PDF que ces
                logiciels savent relire — puis renvoie vers de vraies offres.
              </p>

              <ul className="mt-5 flex flex-col gap-2 text-sm">
                {VITAE_FEATURES.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span aria-hidden className="text-[var(--color-vitae)]">—</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={VITAE_URL}
                className="mt-7 inline-block rounded-full bg-[var(--color-vitae)] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
              >
                Ouvrir Vitae
              </a>
            </div>
          </section>

          {/* Vision et mission : deux phrases, séparées, qu'on doit pouvoir
              citer de mémoire. */}
          <section id="vision" className="flex flex-col gap-10">
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="rounded-2xl bg-dark p-7 text-bg">
                <p className="text-xs uppercase tracking-widest text-[color:rgba(250,250,247,0.5)]">
                  Notre vision
                </p>
                <p className="mt-4 text-xl font-bold leading-snug">
                  Que chacun ici travaille avec des outils aussi bons que ceux
                  d’une grande entreprise — depuis un téléphone, et gratuitement
                  pour commencer.
                </p>
              </div>

              <div className="rounded-2xl border border-line bg-card p-7">
                <p className="text-xs uppercase tracking-widest text-muted2">Notre mission</p>
                <p className="mt-4 text-xl font-bold leading-snug">
                  Sortir une application à la fois, qui règle complètement un
                  problème du quotidien et qui marche sur le téléphone que les
                  gens ont déjà.
                </p>
              </div>
            </div>

            <ul className="grid gap-4 sm:grid-cols-3">
              {PRINCIPLES.map(({ Icon, title, body }) => (
                <li key={title} className="rounded-2xl border border-line bg-card p-5">
                  <span className="text-[var(--color-vitae)]">
                    <Icon />
                  </span>
                  <h3 className="mt-3 font-bold">{title}</h3>
                  <p className="mt-2 text-sm text-muted">{body}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Objectifs : la section que lit un investisseur. Chronologie
              explicite, et ce qui est fait est distingué de ce qui est visé. */}
          <section id="objectifs" className="flex flex-col gap-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted2">Nos objectifs</p>
              <h2 className="mt-3 max-w-3xl text-2xl font-bold leading-snug sm:text-3xl">
                Une chose à la fois, dans cet ordre.
              </h2>
            </div>

            <ol className="flex flex-col">
              {OBJECTIVES.map((objective, index) => (
                <li
                  key={objective.title}
                  className="flex gap-5 border-l border-line2 pb-8 pl-6 last:pb-0"
                >
                  <div className="-ml-[31px] flex flex-col items-center">
                    <span
                      aria-hidden
                      className={`mt-1 flex h-3 w-3 rounded-full ring-4 ring-bg ${
                        objective.done ? 'bg-[var(--color-vitae)]' : 'bg-line2'
                      }`}
                    />
                  </div>
                  <div className="-mt-1">
                    <p className="text-xs uppercase tracking-widest text-muted2">
                      {objective.horizon}
                      {objective.done ? ' · fait' : null}
                    </p>
                    <h3 className="mt-1.5 font-bold">{objective.title}</h3>
                    <p className="mt-1.5 max-w-2xl text-sm text-muted">{objective.body}</p>
                  </div>
                  <span className="sr-only">{`Étape ${index + 1}`}</span>
                </li>
              ))}
            </ol>
          </section>

          <section id="marche" className="flex flex-col gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted2">Pourquoi maintenant</p>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                Un continent sous-outillé. Un marché immense.
              </h2>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MARKET.map((stat) => (
                <li key={stat.figure} className="rounded-2xl bg-card2 p-5">
                  <p className="text-3xl font-extrabold tracking-tight">{stat.figure}</p>
                  <p className="mt-2 text-sm text-muted">{stat.label}</p>
                </li>
              ))}
            </ul>

            {/* Le modèle économique, dit franchement : un investisseur le
                cherche, et un utilisateur a le droit de savoir ce qui est
                gratuit et pourquoi. */}
            <div className="mt-2 rounded-2xl border border-line bg-card p-6">
              <h3 className="font-bold">Comment ça se finance</h3>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Tout est gratuit aujourd’hui, y compris le téléchargement du CV :
                à ce stade, ce qui compte est l’usage, pas le revenu. Le modèle
                viendra plus tard des fonctionnalités avancées — jamais de la
                porte d’entrée, et jamais en rendant payant ce qui est gratuit
                aujourd’hui.
              </p>
            </div>
          </section>

          <FounderSection />

          <section className="rounded-2xl bg-dark p-8 text-bg sm:p-12">
            <h2 className="max-w-2xl text-2xl font-bold sm:text-3xl">
              Votre prochain emploi commence par un CV qu’on peut lire.
            </h2>
            <p className="mt-3 max-w-xl text-[color:rgba(250,250,247,0.62)]">
              Vitae est en ligne et gratuit. Rien à installer, aucun compte à
              créer pour commencer, pas de filigrane sur le PDF.
            </p>
            <a
              href={VITAE_URL}
              className="mt-6 inline-block rounded-full bg-[var(--color-vitae)] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
            >
              Ouvrir Vitae
            </a>
          </section>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-text">The Everyday Co.</p>
          <ul className="flex flex-wrap gap-5">
            <li><a href={VITAE_URL} className="hover:text-text">Vitae</a></li>
            <li><a href="#vision" className="hover:text-text">Vision</a></li>
            <li>
              <a
                href={FOUNDER.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text"
              >
                LinkedIn
              </a>
            </li>
            {CONTACT_EMAIL === null ? null : (
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-text">Contact</a>
              </li>
            )}
          </ul>
        </div>
        <p className="mx-auto max-w-5xl px-5 pb-10 text-xs text-muted2">
          © {new Date().getFullYear()} The Everyday Co. · Abidjan, Côte d’Ivoire ·
          Bâtisseurs de solutions du quotidien
        </p>
      </footer>
    </>
  );
}
