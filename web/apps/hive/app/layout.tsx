import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { ServiceWorkerRegistration } from '../components/pwa/ServiceWorkerRegistration';
import { APP_URL, SUPPORT_WHATSAPP } from '../lib/config';
import './globals.css';

export const metadata: Metadata = {
  // Base des URL relatives des métadonnées de partage : sans elle, les
  // aperçus sur WhatsApp — le canal de diffusion du lancement — sortent cassés.
  metadataBase: new URL(APP_URL),
  // Gabarit plutôt que titres complets : chaque page nomme seulement ce
  // qu'elle est, et la marque s'ajoute au même endroit pour toutes.
  title: {
    default: 'Hive — Louer du matériel audiovisuel, son et lumière à Abidjan',
    template: '%s — Hive',
  },
  description:
    'Le Vinted de l’audiovisuel. Louez caméras, enceintes, projecteurs et '
    + 'instruments auprès de particuliers et de professionnels d’Abidjan, ou '
    + 'mettez les vôtres en location. Sans commission, paiement en main propre.',
  applicationName: 'Hive',
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'Hive',
    locale: 'fr_CI',
    title: 'Hive — Le Vinted de l’audiovisuel, à Abidjan',
    description:
      'Le matériel qui dort chez l’un tourne chez l’autre. Caméras, enceintes, '
      + 'projecteurs, instruments : à louer ou à vendre près de chez vous.',
  },
  // Le partage se fait surtout par WhatsApp, qui lit les balises Open Graph ;
  // les cartes Twitter coûtent deux lignes et couvrent le reste.
  twitter: {
    card: 'summary_large_image',
    title: 'Hive — Le Vinted de l’audiovisuel, à Abidjan',
    description: 'Louez du matériel audiovisuel, son et lumière près de chez vous.',
  },
  alternates: { canonical: '/' },
  appleWebApp: {
    // iOS ignore le manifeste : ces méta-données sont ce qui rend
    // l'installation correcte sur iPhone.
    capable: true,
    title: 'Hive',
    statusBarStyle: 'black-translucent',
  },
  icons: { apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#9a2b32',
  width: 'device-width',
  initialScale: 1,
};

const NAV = [
  { href: '/annonces', label: 'Annonces' },
  { href: '/publier', label: 'Publier' },
  { href: '/messages', label: 'Messages' },
];

// L'état de connexion n'est pas lu ici : le layout resterait dynamique et la
// page d'accueil perdrait le rendu qui la rend rapide sur une connexion
// lente. Le lien « Compte » mène à /compte, qui redirige vers /connexion.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-canvas text-ink">
        <ServiceWorkerRegistration />
        <header className="bg-primary text-white">
          <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Hive
            </Link>
            <ul className="flex flex-1 gap-4 text-sm">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-surface">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/compte" className="text-sm hover:text-surface">
              Compte
            </Link>
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

        <footer className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-10 text-sm text-muted">
          <p>Hive — location et vente de matériel audiovisuel, son et musique à Abidjan.</p>
          <p>Aucune commission pendant la période de lancement.</p>
          {SUPPORT_WHATSAPP !== null ? (
            <p>
              Un problème ?{' '}
              <a className="underline" href={`https://wa.me/${SUPPORT_WHATSAPP}`}>
                Écrivez-nous sur WhatsApp
              </a>
              .
            </p>
          ) : null}
        </footer>
      </body>
    </html>
  );
}
