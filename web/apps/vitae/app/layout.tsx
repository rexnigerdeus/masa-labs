import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { ServiceWorkerRegistration } from '../components/pwa/ServiceWorkerRegistration';
import { APP_URL, SITE_URL } from '../lib/config';
import './globals.css';

export const metadata: Metadata = {
  // Base des URL relatives des métadonnées de partage : sans elle, Next
  // avertit au build et les aperçus sur WhatsApp ou LinkedIn sortent cassés.
  metadataBase: new URL(APP_URL),
  // Gabarit plutôt que titres complets : chaque page nomme seulement ce
  // qu'elle est, et la marque s'ajoute au même endroit pour toutes.
  title: {
    default: 'Vitae — Créez un CV lisible par les recruteurs, gratuitement',
    template: '%s — Vitae',
  },
  description:
    'Créez gratuitement un CV professionnel compatible ATS, trouvez des offres '
    + 'de stage et d’emploi en Côte d’Ivoire, et apprenez les codes du recrutement.',
  applicationName: 'Vitae',
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'Vitae',
    locale: 'fr_CI',
    title: 'Vitae — Le CV qui passe les filtres',
    description:
      'La plupart des candidatures sont écartées par un logiciel avant d’être '
      + 'lues. Vitae produit un CV que ces logiciels savent relire. Gratuit, '
      + 'sans filigrane.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vitae — Le CV qui passe les filtres',
    description: 'CV compatible ATS, score en direct, offres d’emploi en Côte d’Ivoire.',
  },
  alternates: { canonical: '/' },
  appleWebApp: {
    // iOS ignore le manifeste : ces méta-données sont ce qui rend
    // l'installation correcte sur iPhone.
    capable: true,
    title: 'Vitae',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#17210c',
  width: 'device-width',
  initialScale: 1,
};

const NAV = [
  { href: '/cv', label: 'Mon CV' },
  { href: '/offres', label: 'Offres' },
  { href: '/conseils', label: 'Conseils' },
];

// L'état de connexion n'est volontairement pas lu ici : le layout resterait
// dynamique et la page d'accueil perdrait son rendu statique, qui est ce qui la
// rend rapide sur une connexion lente. Le lien mène à /connexion, qui redirige
// vers /cv quand la session existe déjà.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-canvas text-ink">
        <ServiceWorkerRegistration />
        <header className="bg-header text-white">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Vitae
            </Link>
            <ul className="flex flex-1 gap-5 text-sm">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-accent">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/connexion" className="text-sm hover:text-accent">
              Compte
            </Link>
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

        <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted">
          Vitae est un produit{' '}
          {SITE_URL === null ? (
            // Pas de lien tant que le site vitrine n'a pas d'adresse connue.
            <span className="font-medium">The Everyday Co</span>
          ) : (
            <a className="underline" href={SITE_URL}>
              The Everyday Co
            </a>
          )}
          . Création et téléchargement gratuits.
        </footer>
      </body>
    </html>
  );
}
