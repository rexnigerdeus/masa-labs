import type { Metadata } from 'next';
import { LegalPage } from '../../components/LegalPage';
import { CONTACT_EMAIL, SITE_URL } from '../../lib/config';
import { FOUNDER } from '../../lib/founder';

export const metadata: Metadata = {
  title: 'Mentions légales — The Everyday Co.',
  alternates: { canonical: `${SITE_URL}/mentions-legales` },
};

/**
 * Mentions légales (brief v2, « Pages légales »).
 *
 * Les champs entre crochets restent tels quels tant que la société n'est
 * pas immatriculée : un numéro RCCM ou un capital inventés seraient pires
 * qu'un blanc visible. Les remplacer ici dès que les statuts existent.
 */
export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales" updated="18 octobre 2026">
      <h2>Éditeur du site</h2>
      <dl>
        <dt>Raison sociale</dt>
        <dd>[Raison sociale]</dd>
        <dt>Forme juridique</dt>
        <dd>[Forme juridique]</dd>
        <dt>Capital social</dt>
        <dd>[Montant] F CFA</dd>
        <dt>RCCM</dt>
        <dd>[Numéro RCCM]</dd>
        <dt>Siège</dt>
        <dd>[Adresse du siège], Abidjan, Côte d’Ivoire</dd>
        <dt>Directrice de la publication</dt>
        <dd>{FOUNDER.name}, {FOUNDER.role.toLowerCase()}</dd>
        <dt>Contact</dt>
        <dd>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </dd>
      </dl>

      <h2>Hébergeur</h2>
      <dl>
        <dt>Société</dt>
        <dd>Vercel Inc.</dd>
        <dt>Adresse</dt>
        <dd>440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</dd>
        <dt>Site</dt>
        <dd><a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a></dd>
      </dl>

      <h2>Données personnelles</h2>
      <p>
        Ce que le site collecte, et ce qu’il ne collecte pas, est décrit dans
        la page <a href="/confidentialite">Confidentialité</a>.
      </p>
    </LegalPage>
  );
}
