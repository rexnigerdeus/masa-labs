import { CONTACT_EMAIL, VITAE_URL } from '../lib/config';
import { FOUNDER, initials } from '../lib/founder';

/**
 * Page d'accueil de The Everyday Co.
 *
 * Structure et ton repris de themobilefirstcompany.com, désigné comme modèle
 * au brief §8 : une accroche qui part d'un constat de génération, des bénéfices
 * en une ligne, la mission, puis le produit — et rien qui ne soit vrai.
 *
 * Deux emprunts assumés à ce modèle : le rythme (accroche courte, promesse,
 * appel à l'action immédiat) et l'adresse directe au lecteur. Deux refus tout
 * aussi assumés : le site de référence affiche « Trusted by 5,000+ businesses »
 * et une levée de fonds. Nous n'avons ni l'un ni l'autre, et on ne fabrique pas
 * une preuve sociale — la seule chose qu'on peut montrer, c'est le produit.
 *
 * Une seule application est présentée : Vitae. Rondo, Kassa et Krédi ne sont
 * pas encore annoncés (brief §8), ils n'apparaissent nulle part.
 */

const NAV = [
  { href: '#vitae', label: 'Vitae' },
  { href: '#mission', label: 'Mission' },
  { href: '#fondatrice', label: 'Fondatrice' },
];

const PROMISES = [
  'Conçu pour le téléphone, pas adapté après coup',
  'Fonctionne avec une connexion lente',
  'Gratuit, sans compte pour commencer',
];

const VITAE_FEATURES = [
  'Modèles vérifiés lisibles par les logiciels de tri (ATS)',
  'Score et conseils de correction en direct, section par section',
  'Offres de stage et d’emploi en Côte d’Ivoire, mises à jour chaque jour',
  'Téléchargement PDF gratuit, sans filigrane',
];

const PRINCIPLES = [
  {
    number: '01',
    title: 'Mobile d’abord',
    body: 'Ici le smartphone est déjà la banque, le commerce et le bureau. Nos outils partent de là, ils ne s’y adaptent pas.',
  },
  {
    number: '02',
    title: 'Un problème. Une app.',
    body: 'Chaque produit règle une seule chose, complètement. Pas de tableau de bord dont personne n’a besoin.',
  },
  {
    number: '03',
    title: 'Accessible à tous',
    body: 'Un téléphone d’entrée de gamme et une connexion capricieuse restent la norme. C’est notre cahier des charges.',
  },
];

const MARKET = [
  { figure: '15M+', label: 'Internautes connectés en Côte d’Ivoire en 2025' },
  { figure: '89 %', label: 'Des emplois sont informels — sans outil de gestion adapté' },
  { figure: '40K', label: 'Diplômés par an en Côte d’Ivoire cherchant leur voie' },
  { figure: '10M', label: 'Emplois numériques attendus en Afrique d’ici 2030 (Banque mondiale)' },
];

function FounderSection() {
  const hasPhoto = FOUNDER.photo !== '';

  return (
    <section id="fondatrice" className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted2">Qui construit</p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          Une fondatrice, à Abidjan.
        </h2>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl border border-line bg-card p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={FOUNDER.photo}
            alt={FOUNDER.name}
            width={128}
            height={128}
            className="h-32 w-32 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-dark text-3xl font-bold text-[var(--color-vitae)]"
          >
            {initials(FOUNDER.name)}
          </span>
        )}

        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-xl font-bold">{FOUNDER.name}</h3>
            <p className="text-muted">
              {FOUNDER.role} · {FOUNDER.location}
            </p>
          </div>

          {FOUNDER.bio !== '' ? (
            <p className="max-w-xl text-muted">{FOUNDER.bio}</p>
          ) : null}

          <a
            href={FOUNDER.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit rounded-full border border-line2 px-5 py-2 text-sm font-medium hover:bg-card2"
          >
            Profil LinkedIn
          </a>
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
        {/* Accroche : le constat de génération d'abord, la promesse ensuite,
            l'action tout de suite — le rythme du site de référence. */}
        <section className="flex flex-col gap-6">
          <p className="text-sm text-muted2">Abidjan, Côte d’Ivoire</p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            La génération de nos parents n’a jamais eu les{' '}
            <span className="bg-yellow-soft px-1.5">bons outils</span>.
          </h1>
          <p className="max-w-2xl text-lg text-muted">
            Tontines dans des cahiers, créances sur WhatsApp, CV bricolés sur un
            téléphone emprunté. Nous construisons des logiciels plus jeunes que
            les problèmes qu’ils résolvent. Un problème. Une app. Réglé.
          </p>

          <ul className="flex flex-col gap-1.5 text-sm text-muted">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex gap-2">
                <span aria-hidden className="text-[var(--color-vitae)]">—</span>
                {promise}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3 pt-1">
            <a
              href={VITAE_URL}
              className="rounded-full bg-[var(--color-vitae)] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
            >
              Essayer Vitae — c’est gratuit
            </a>
            <a
              href="#mission"
              className="rounded-full border border-line2 px-6 py-3 text-sm font-medium hover:bg-card2"
            >
              Pourquoi nous faisons ça
            </a>
          </div>
        </section>

        {/* Le produit, juste après l'accroche : c'est la seule chose à montrer,
            elle ne doit pas attendre le bas de page. */}
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

          <p className="text-sm text-muted2">
            D’autres applications sont en préparation. Nous les présenterons
            quand elles seront prêtes, pas avant.
          </p>
        </section>

        <section id="mission" className="flex flex-col gap-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted2">Notre mission</p>
            <h2 className="mt-3 max-w-3xl text-2xl font-bold leading-snug sm:text-3xl">
              Des outils que les Ivoiriens{' '}
              <span className="bg-yellow-soft px-1.5">adorent utiliser</span> —
              construits sur le terrain, pour le terrain.
            </h2>
            <p className="mt-4 max-w-2xl text-muted">
              Les logiciels de gestion coûtent cher, s’apprennent en formation et
              supposent une connexion stable. Rien de tout ça n’est vrai ici.
              Alors nous repartons de zéro, une app à la fois.
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

        <FounderSection />

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
            Vitae est en ligne et gratuit. Rien à installer, aucun compte à créer
            pour commencer, pas de filigrane sur le PDF.
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
            <li><a href="#mission" className="hover:text-text">Mission</a></li>
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
