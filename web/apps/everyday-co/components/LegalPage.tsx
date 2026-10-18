import Image from 'next/image';
import { SiteFooter } from './SiteFooter';

/**
 * Gabarit des pages légales : en-tête réduit au logo, une colonne de
 * lecture, le pied de page commun. Pas de hero ni de script de page —
 * rien à animer, rien à charger en plus.
 */
export function LegalPage({
  title, updated, children,
}: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <header className="site-legal-nav">
        <a href="/" aria-label="The Everyday Co. — accueil">
          <Image src="/logo-ligne.svg" alt="The Everyday Co." width={1044} height={181} priority unoptimized />
        </a>
        <a href="/" className="site-legal-nav__back">← Accueil</a>
      </header>
      <main className="site-legal">
        <h1>{title}</h1>
        <p className="site-legal__updated">Mise à jour : {updated}</p>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
