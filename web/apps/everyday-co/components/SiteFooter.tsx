import Image from 'next/image';
import { CONTACT_EMAIL, VITAE_LINK, WHATSAPP_CHANNEL_URL } from '../lib/config';
import { FOUNDER } from '../lib/founder';

/**
 * Pied de page, commun à l'accueil et aux pages légales.
 *
 * Les ancres sont écrites `/#…` : depuis /mentions-legales, `#vision` seul
 * ne mènerait nulle part. Le lien WhatsApp s'efface tant que la chaîne
 * n'existe pas.
 */
export function SiteFooter() {
  return (
    <footer className="labs-footer">
      <div className="labs-footer__row">
        <p className="labs-footer__logo">
          <a href="/" aria-label="The Everyday Co. — accueil">
            <Image src="/logo.svg" alt="The Everyday Co." width={633} height={392} unoptimized />
          </a>
        </p>
        <ul className="labs-footer__links">
          <li><a href={VITAE_LINK}>Vitae</a></li>
          <li><a href="/#vision">Vision</a></li>
          <li><a href="/#ecoles">Écoles</a></li>
          {WHATSAPP_CHANNEL_URL === null ? null : (
            <li>
              <a
                href={WHATSAPP_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-track="whatsapp_follow"
              >
                WhatsApp
              </a>
            </li>
          )}
          <li>
            <a href={FOUNDER.linkedinUrl} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          </li>
          <li><a href={`mailto:${CONTACT_EMAIL}`}>Contact</a></li>
          <li><a href="/mentions-legales">Mentions légales</a></li>
          <li><a href="/confidentialite">Confidentialité</a></li>
        </ul>
      </div>
      <p className="labs-footer__copy">
        © {new Date().getFullYear()} The Everyday Co. · Abidjan, Côte d’Ivoire ·
        Bâtisseurs de solutions du quotidien
      </p>
    </footer>
  );
}
