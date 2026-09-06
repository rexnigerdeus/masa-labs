import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { SITE_URL } from '../lib/config';
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'The Everyday Co. — Des apps pour l’Afrique qui avance',
  description:
    'The Everyday Co. construit des applications simples et abordables pour les '
    + 'communautés, commerces et jeunes d’Afrique de l’Ouest : Vitae pour le CV '
    + 'et l’emploi, Hive pour la location de matériel audiovisuel à Abidjan. '
    + 'Un problème. Une app. Réglé.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'The Everyday Co.',
    description: 'Des apps pour l’Afrique qui avance. Un problème. Une app. Réglé.',
    locale: 'fr_CI',
    type: 'website',
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
      </body>
    </html>
  );
}
