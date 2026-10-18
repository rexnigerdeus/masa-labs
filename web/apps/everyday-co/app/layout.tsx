import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { SITE_URL } from '../lib/config';
import { Measure } from '../components/Measure';
import './globals.css';

/**
 * Inter, la police de l'ancien site — mais servie par `next/font`, donc
 * auto-hébergée. L'ancienne version la chargeait depuis Google Fonts, ce qui
 * ajoutait deux connexions à un domaine tiers avant le premier texte affiché.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const SHARE_DESCRIPTION = 'Des apps pour l’Afrique qui avance. Un problème. Une app. Réglé.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'The Everyday Co. — Des apps pour l’Afrique qui avance',
  description:
    'The Everyday Co. construit des applications simples pour les jeunes et '
    + 'les petites activités d’Afrique de l’Ouest. Première app : Vitae, le CV '
    + 'pro depuis le téléphone, premier CV gratuit.',
  // Absolue : la canonique désigne le domaine propre (NEXT_PUBLIC_SITE_URL),
  // jamais l'adresse vercel.app qui y redirige.
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: {
    title: 'The Everyday Co.',
    description: SHARE_DESCRIPTION,
    url: `${SITE_URL}/`,
    siteName: 'The Everyday Co.',
    locale: 'fr_CI',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'The Everyday Co.',
    description: SHARE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: '#171411',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="bg-bg font-[family-name:var(--font-inter)] text-text antialiased">
        {children}
        <Measure />
      </body>
    </html>
  );
}
