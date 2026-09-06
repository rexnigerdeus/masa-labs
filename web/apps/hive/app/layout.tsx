import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { ServiceWorkerRegistration } from '../components/pwa/ServiceWorkerRegistration';
import { APP_URL, SUPPORT_WHATSAPP } from '../lib/config';
import './globals.css';

export const metadata: Metadata = {
  // Base des URL relatives des métadonnées de partage : sans elle, les
  // aperçus sur WhatsApp — le canal de diffusion du lancement — sortent cassés.
  metadataBase: new URL(APP_URL),
  title: 'Hive — Louez et vendez du matériel audiovisuel à Abidjan',
  description:
    'Louez, vendez et trouvez du matériel audiovisuel, de sonorisation et de '
    + 'musique à Abidjan, entre particuliers et professionnels.',
  applicationName: 'Hive',
  manifest: '/manifest.webmanifest',
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
