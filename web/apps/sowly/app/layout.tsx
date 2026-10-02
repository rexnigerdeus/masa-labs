import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { AppShell } from '../components/AppShell';
import { ServiceWorkerRegistration } from '../components/pwa/ServiceWorkerRegistration';
import { APP_URL } from '../lib/config';
import { THEME_KEY } from '../lib/theme';
import './globals.css';

// next/font télécharge Inter au build et la sert depuis notre domaine : pas
// de requête vers Google à l'exécution, ni de police manquante hors-ligne.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

// General Sans (Fontshare, licence ITF FFL — voir app/fonts/) : version
// variable réduite au latin français par `pyftsubset`, 25 Ko au lieu de 38.
const general = localFont({
  src: './fonts/GeneralSans-Variable-latin.woff2',
  variable: '--font-general',
  weight: '200 700',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: 'Sowly — Graines d’Habitudes', template: '%s — Sowly' },
  description:
    'Suis tes habitudes. Gère tes tâches. Sans limite. De petites graines, de vraies habitudes.',
  applicationName: 'Sowly',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    // iOS ignore le manifeste : ces métadonnées rendent l'installation
    // correcte sur iPhone — et sur iOS, seule une app installée reçoit des
    // notifications (lot 2).
    capable: true,
    title: 'Sowly',
    statusBarStyle: 'default',
  },
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
  robots: { index: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8f5' },
    { media: '(prefers-color-scheme: dark)', color: '#13150f' },
  ],
};

/**
 * Thème posé avant le premier rendu : sans ce script, un utilisateur en
 * mode sombre verrait un éclair blanc à chaque ouverture. Écrit en ES5 et
 * enveloppé d'un `try` : il s'exécute avant tout le reste, rien ne doit
 * pouvoir le faire échouer.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${general.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-canvas text-ink antialiased">
        <ServiceWorkerRegistration />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
