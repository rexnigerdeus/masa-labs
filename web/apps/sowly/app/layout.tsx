import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { AppShell } from '../components/AppShell';
import { ServiceWorkerRegistration } from '../components/pwa/ServiceWorkerRegistration';
import { APP_URL } from '../lib/config';
import { APPEARANCE_SCRIPT } from '../lib/theme';
import './globals.css';

/*
 * Les quatre polices du hub (brief design), hébergées chez nous par
 * next/font : aucune requête tierce, fichiers versionnés et mis en cache
 * par le service worker avec le reste de `/_next/static/`.
 *
 *   Bricolage Grotesque  titres, gros chiffres (variable 200–800, largeur 75–100 %)
 *   Instrument Serif     le mot en italique des titres, les accroches
 *   Hanken Grotesk       texte courant, boutons, libellés
 *   IBM Plex Mono        compteurs, dates, séries
 */
const bricolage = localFont({
  src: './fonts/hub/bricolage.woff2',
  variable: '--font-bricolage',
  weight: '200 800',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '75% 100%' }],
});
const instrument = localFont({
  src: [
    { path: './fonts/hub/instrument-serif-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/hub/instrument-serif-latin-400-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-instrument',
  display: 'swap',
});
const hanken = localFont({
  src: [
    { path: './fonts/hub/hanken-grotesk-latin-400-normal.woff2', weight: '400' },
    { path: './fonts/hub/hanken-grotesk-latin-500-normal.woff2', weight: '500' },
    { path: './fonts/hub/hanken-grotesk-latin-600-normal.woff2', weight: '600' },
  ],
  variable: '--font-hanken',
  display: 'swap',
});
const plexMono = localFont({
  src: './fonts/hub/ibm-plex-mono-latin-500-normal.woff2',
  variable: '--font-plex-mono',
  weight: '500',
  display: 'swap',
  // Chiffres seulement, rarement au-dessus de la ligne de flottaison.
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: 'Sowly — Graines d’Habitudes', template: '%s — Sowly' },
  description:
    'Suis tes habitudes. Gère tes tâches. Sans limite. De petites graines, de vraies habitudes.',
  applicationName: 'Sowly',
  manifest: '/manifest.webmanifest',
  // Partage : un lien Sowly circule surtout par WhatsApp, qui lit l'Open
  // Graph ; l'image vient de `app/opengraph-image.tsx`.
  openGraph: {
    type: 'website',
    siteName: 'Sowly — Graines d’Habitudes',
    locale: 'fr_CI',
    title: 'Sowly — Suis tes habitudes. Gère tes tâches. Sans limite.',
    description:
      'De petites graines, de vraies habitudes. Habitudes et tâches illimitées, gratuitement, '
      + 'même sans réseau.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sowly — Suis tes habitudes. Gère tes tâches. Sans limite.',
    description: 'De petites graines, de vraies habitudes.',
  },
  appleWebApp: {
    // iOS ignore le manifeste : ces métadonnées rendent l'installation
    // correcte sur iPhone — et sur iOS, seule une app installée reçoit des
    // notifications (lot 2).
    capable: true,
    title: 'Sowly',
    statusBarStyle: 'default',
  },
  // SVG pour les navigateurs récents (net à toutes les tailles), PNG pour
  // Safari et les autres ; `public/favicon.ico` reste pour qui le demande
  // à la racine. Tout sort de `public/icon.svg` (`npm run icons`).
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-48.png', type: 'image/png', sizes: '48x48' },
    ],
    apple: '/apple-touch-icon.png',
  },
  robots: { index: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ECEAF4' },
    { media: '(prefers-color-scheme: dark)', color: '#0E0C18' },
  ],
};

/**
 * Apparence posée avant le premier rendu (mode, palette, densité, titres) :
 * sans ce script, un utilisateur en mode sombre verrait un éclair clair à
 * chaque ouverture. Voir `lib/theme.ts`.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${instrument.variable} ${hanken.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT }} />
      </head>
      <body>
        <ServiceWorkerRegistration />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
