import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { ServiceWorkerRegistration } from '../components/pwa/ServiceWorkerRegistration';
import { APP_URL } from '../lib/config';
import './globals.css';

export const metadata: Metadata = {
  // Base des URL relatives des métadonnées de partage : sans elle, les
  // aperçus sur WhatsApp — le canal de diffusion du lancement — sortent cassés.
  metadataBase: new URL(APP_URL),
  // Pause (lib/pause.ts) : titre honnête, et plus rien à indexer.
  title: 'Hive — en pause',
  description:
    'Hive fait une pause. On le reprendra quand on pourra le faire bien : '
    + 'loueurs vérifiés, cautions, contrats.',
  robots: { index: false, follow: false },
  applicationName: 'Hive',
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'Hive',
    locale: 'fr_CI',
    title: 'Hive — en pause',
    description: 'Hive fait une pause. Laisse ton numéro pour être prévenu au retour.',
  },
  twitter: {
    card: 'summary',
    title: 'Hive — en pause',
    description: 'Hive fait une pause. Laisse ton numéro pour être prévenu au retour.',
  },
  appleWebApp: {
    // iOS ignore le manifeste : ces méta-données sont ce qui rend
    // l'installation correcte sur iPhone.
    capable: true,
    title: 'Hive',
    statusBarStyle: 'black-translucent',
  },
  // Favicon : PNG déclaré ici, `public/favicon.ico` pour qui le demande à la
  // racine. Générés depuis `public/icon-512.png` (packages/pwa/favicon.mjs).
  icons: {
    icon: [{ url: '/favicon-48.png', type: 'image/png', sizes: '48x48' }],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#9a2b32',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-canvas text-ink">
        <ServiceWorkerRegistration />
        <header className="bg-primary text-white">
          <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
            {/* Pause : plus de navigation, il n'y a qu'une page. */}
            <Link href="/" className="text-lg font-bold tracking-tight">
              Hive
            </Link>
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

        <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted">
          <p>Hive est un projet de The Everyday Co., en pause depuis octobre 2026.</p>
        </footer>
      </body>
    </html>
  );
}
