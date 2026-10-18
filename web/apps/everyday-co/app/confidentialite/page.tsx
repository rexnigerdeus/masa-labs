import type { Metadata } from 'next';
import { LegalPage } from '../../components/LegalPage';
import { CONTACT_EMAIL, SITE_URL, VITAE_LINK, VITAE_PRIVACY_URL } from '../../lib/config';

export const metadata: Metadata = {
  title: 'Confidentialité — The Everyday Co.',
  alternates: { canonical: `${SITE_URL}/confidentialite` },
};

/**
 * Confidentialité (brief v2, « Pages légales ») : le site ne collecte que
 * des statistiques de visite anonymes ; les données des CV relèvent de
 * Vitae, qui a sa propre politique.
 *
 * Chaque phrase décrit ce que fait le code : si la mesure change
 * (components/Measure.tsx), cette page change avec elle.
 */
export default function ConfidentialitePage() {
  return (
    <LegalPage title="Confidentialité" updated="18 octobre 2026">
      <h2>En bref</h2>
      <p>
        Ce site ne vous demande aucune information, ne pose aucun cookie et
        ne vous suit pas d’un site à l’autre. Il compte seulement ses visites,
        de façon anonyme.
      </p>

      <h2>Les statistiques de visite</h2>
      <p>
        Nous utilisons Vercel Web Analytics pour savoir combien de personnes
        consultent le site, depuis quel pays et quel type d’appareil, d’où
        elles arrivent, et combien cliquent sur trois boutons : « Ouvrir
        Vitae », « Suivre sur WhatsApp » et « Organiser un atelier ».
      </p>
      <p>
        Cet outil ne dépose aucun cookie et n’enregistre aucune donnée qui
        permette de vous identifier : les visites sont comptées de façon
        agrégée, sans profil individuel ni publicité.
      </p>

      <h2>Quand vous nous écrivez</h2>
      <p>
        Si vous nous envoyez un e-mail
        {CONTACT_EMAIL === null ? null : <> (<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>)</>},
        nous conservons votre message et votre adresse le temps de vous
        répondre et d’assurer le suivi de votre demande, sans autre usage.
        Vous pouvez demander à tout moment qu’ils soient supprimés.
      </p>

      <h2>Vos CV et Vitae</h2>
      <p>
        Les CV ne passent pas par ce site : ils sont créés et enregistrés dans
        l’application <a href={VITAE_LINK}>Vitae</a>, qui a sa propre politique
        de confidentialité
        {VITAE_PRIVACY_URL === null
          ? '.'
          : <>, à lire <a href={VITAE_PRIVACY_URL}>sur Vitae</a>.</>}
      </p>

      <h2>Liens externes</h2>
      <p>
        Les liens vers WhatsApp, LinkedIn et les sources des chiffres mènent à
        des sites qui appliquent leurs propres règles.
      </p>

      <h2>Vos droits</h2>
      <p>
        Conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à
        la protection des données à caractère personnel, vous pouvez demander
        l’accès à vos données, leur rectification ou leur suppression en nous
        écrivant, et saisir l’ARTCI si vous estimez que vos droits ne sont pas
        respectés.
      </p>
    </LegalPage>
  );
}
