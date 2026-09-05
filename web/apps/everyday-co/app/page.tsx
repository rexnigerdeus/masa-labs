import { VITAE_URL } from '../lib/config';

/**
 * Page d'accueil de The Everyday Co.
 *
 * Reprise de l'ancien site (dailyco.influencemood.com, sauvegardé dans
 * `the-everyday-co-landing.html`) : même vision, même ton, mêmes chiffres de
 * marché, même philosophie.
 *
 * Une seule différence, exigée par le brief §8 : **seul Vitae est présenté**.
 * Rondo, Kassa et Krédi ne sont pas encore annoncés publiquement, donc ni les
 * fiches produit, ni le bandeau défilant, ni les liens de pied de page ne les
 * mentionnent. La section « Quatre apps. Quatre problèmes réels. » de
 * l'ancienne version disparaît avec eux — on ne promet pas un portefeuille
 * qu'on ne montre pas.
 *
 * Autre correction de fond : Vitae était marqué « Bientôt disponible ». Il est
 * en ligne, la page le dit et y renvoie.
 */

const NAV = [
  { href: '#produit', label: 'Vitae' },
  { href: '#mission', label: 'Notre mission' },
  { href: '#marche', label: 'Le marché' },
];

const VITAE_FEATURES = [
  'Modèles vérifiés lisibles par les logiciels de tri (ATS)',
  'Score et conseils de correction en direct, section par section',
  'Offres de stage et d’emploi en Côte d’Ivoire, mises à jour chaque jour',
  'Entièrement gratuit — création et téléchargement PDF',
];

const PRINCIPLES = [
  {
    number: '01',
    title: 'Mobile d’abord',
    body: 'Toutes nos apps sont pensées pour le smartphone. Pas adaptées — conçues.',
  },
  {
    number: '02',
    title: 'Un problème. Une app.',
    body: 'Chaque produit résout un seul problème, parfaitement. Pas de complexité inutile.',
  },
  {
    number: '03',
    title: 'Accessible à tous',
    body: 'Des outils qui marchent avec une connexion lente, sur un téléphone d’entrée de gamme.',
  },
];

const MARKET = [
  { figure: '15M+', label: 'Internautes connectés en Côte d’Ivoire en 2025' },
  { figure: '89 %', label: 'Des emplois sont informels — sans outil de gestion adapté' },
  { figure: '40K', label: 'Diplômés par an en Côte d’Ivoire cherchant leur voie' },
  { figure: '10M', label: 'Emplois numériques attendus en Afrique d’ici 2030 (Banque mondiale)' },
];

export default function HomePage() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-bg/85 backdrop-blur">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-5 py-4">
          <a href="#top" className="font-bold tracking-tight">The Everyday Co.</a>
          <ul className="hidden flex-1 gap-6 text-sm text-muted sm:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="hover:text-text">{item.label}</a>
              </li>
            ))}
          </ul>
          <a
            href={VITAE_URL}
            className="ml-auto rounded-full bg-dark px-4 py-2 text-sm font-medium text-bg hover:bg-dark2 sm:ml-0"
          >
            Ouvrir Vitae
          </a>
        </nav>
      </header>

      <main id="top" className="mx-auto flex max-w-5xl flex-col gap-24 px-5 py-16">
        <section className="flex flex-col gap-6">
          <p className="text-sm text-muted2">Abidjan, Côte d’Ivoire</p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Des apps pour{' '}
            <span className="bg-yellow-soft px-1.5">l’Afrique</span> qui avance.
          </h1>
          <p className="max-w-2xl text-lg text-muted">
            On construit des applications mobiles simples, abordables et bâties
            pour les réalités du terrain. Un problème. Une app. Réglé.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={VITAE_URL}
              className="rounded-full bg-dark px-6 py-3 text-sm font-medium text-bg hover:bg-dark2"
            >
              Découvrir Vitae
            </a>
            <a
              href="#mission"
              className="rounded-full border border-line2 px-6 py-3 text-sm font-medium hover:bg-card2"
            >
              Notre mission
            </a>
          </div>
        </section>

        <section className="border-y border-line py-12">
          <p className="text-xs uppercase tracking-widest text-muted2">Le constat</p>
          <h2 className="mt-4 max-w-3xl text-2xl font-bold leading-snug sm:text-3xl">
            Une génération entière gère ses tontines dans des cahiers, ses
            créances sur WhatsApp et son avenir sans les bons outils.
          </h2>
          <p className="mt-4 max-w-2xl text-muted">
            Il est temps que ça change. Nous construisons les outils que cette
            génération attendait — un par un, en commençant par celui qui ouvre
            toutes les portes : le CV.
          </p>
        </section>

        <section id="produit" className="flex flex-col gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted2">Notre application</p>
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
                <p className="text-sm text-muted">Emploi · Disponible</p>
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
              Créer mon CV gratuitement
            </a>
          </div>

          <p className="text-sm text-muted2">
            D’autres applications sont en préparation. Nous les présenterons
            quand elles seront prêtes, pas avant.
          </p>
        </section>

        <section id="mission" className="flex flex-col gap-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted2">Notre mission</p>
            <h2 className="mt-3 max-w-3xl text-2xl font-bold leading-snug sm:text-3xl">
              Nous construisons des outils{' '}
              <span className="bg-yellow-soft px-1.5">plus jeunes</span> que les
              problèmes qu’ils résolvent.
            </h2>
            <p className="mt-4 max-w-2xl text-muted">
              Créer des applications que les Ivoiriens adorent utiliser. Des
              outils modernes, intuitifs et au juste prix — construits sur le
              terrain, pour le terrain.
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <li key={principle.number} className="rounded-2xl border border-line bg-card p-5">
                <p className="text-sm font-medium text-muted2">{principle.number}</p>
                <h3 className="mt-2 font-bold">{principle.title}</h3>
                <p className="mt-2 text-sm text-muted">{principle.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="marche" className="flex flex-col gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted2">Le marché</p>
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
        </section>

        <section className="rounded-2xl bg-dark p-8 text-bg sm:p-12">
          <h2 className="max-w-2xl text-2xl font-bold sm:text-3xl">
            Votre prochain emploi commence par un CV qu’on peut lire.
          </h2>
          <p className="mt-3 max-w-xl text-[color:rgba(250,250,247,0.62)]">
            Vitae est en ligne et gratuit. Pas de compte à créer pour commencer,
            pas de filigrane sur le PDF.
          </p>
          <a
            href={VITAE_URL}
            className="mt-6 inline-block rounded-full bg-[var(--color-vitae)] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            Ouvrir Vitae
          </a>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-text">The Everyday Co.</p>
          <ul className="flex flex-wrap gap-5">
            <li><a href={VITAE_URL} className="hover:text-text">Vitae</a></li>
            <li><a href="#mission" className="hover:text-text">Notre mission</a></li>
            <li>
              <a href="mailto:contact@theeveryday.co" className="hover:text-text">Contact</a>
            </li>
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
