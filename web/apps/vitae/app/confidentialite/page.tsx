import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL } from '../../lib/config';

export const metadata: Metadata = {
  title: 'Confidentialité',
  description: 'Ce que Vitae enregistre quand vous créez votre CV, où, pourquoi, et comment le supprimer.',
};

/**
 * Politique de confidentialité de Vitae.
 *
 * Demandée par la vitrine (brief v2, page /confidentialite du site, qui
 * renvoie ici pour les données des CV). Chaque phrase décrit ce que fait le
 * code au moment de l'écrire :
 *   - brouillon dans le navigateur : lib/draft.ts, lib/wizard.ts
 *   - compte requis seulement pour le PDF : app/api/export/route.ts
 *   - CV et photo en base : lib/resumes.ts, table `vitae_resumes`
 *   - aucun outil de mesure d'audience ni de publicité dans l'app
 *   - base Supabase en région eu-west-3 (Paris)
 * Si l'un de ces points change, cette page change avec lui.
 */

const UPDATED = '18 octobre 2026';

export default function ConfidentialitePage() {
  const mail = <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4 leading-relaxed [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_li]:text-muted [&_p]:text-muted [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      <h1 className="text-2xl font-bold">Confidentialité</h1>
      <p className="text-sm">Mise à jour : {UPDATED}</p>

      <p>
        Vitae est une application de The Everyday Co., à Abidjan, pour créer
        un CV depuis son téléphone. Un CV contient des informations
        personnelles : cette page dit ce que nous en faisons, simplement.
      </p>

      <h2>En bref</h2>
      <ul>
        <li>Vous pouvez remplir tout votre CV sans compte : il reste dans votre téléphone.</li>
        <li>Un compte n’est demandé que pour télécharger le PDF et retrouver vos CV sur un autre appareil.</li>
        <li>Vos données servent à faire votre CV, rien d’autre. Nous ne les vendons pas et ne les montrons à aucun recruteur.</li>
        <li>Pas de publicité, pas d’outil de mesure d’audience dans l’application.</li>
        <li>Vous pouvez supprimer vos CV à tout moment depuis votre compte.</li>
      </ul>

      <h2>Sans compte : tout reste dans votre navigateur</h2>
      <p>
        Pendant que vous remplissez votre CV, il est enregistré dans la mémoire
        de votre navigateur, sur votre appareil, avec l’étape où vous en êtes.
        Rien n’est envoyé à nos serveurs à ce stade. Vider les données du
        navigateur efface ce brouillon.
      </p>

      <h2>Avec un compte</h2>
      <p>Quand vous créez un compte, nous enregistrons :</p>
      <ul>
        <li>votre adresse e-mail et votre mot de passe, jamais stocké en clair : ils servent seulement à vous connecter ;</li>
        <li>vos CV : le texte que vous avez saisi, la photo si vous en avez ajouté une (recadrée et compressée sur votre téléphone avant l’envoi), le modèle et la couleur choisis, et le score calculé ;</li>
        <li>la date de création et de dernière modification de chaque CV.</li>
      </ul>
      <p>
        Pour fabriquer le PDF, le contenu de votre CV est envoyé à notre
        serveur, mis en page, puis renvoyé à votre téléphone. Le fichier PDF
        lui-même n’est pas conservé.
      </p>
      <p>
        Un petit fichier technique (cookie de session) garde votre connexion
        ouverte. Il est indispensable au compte et ne sert à rien d’autre.
      </p>

      <h2>Qui y a accès</h2>
      <p>
        Vos CV ne sont lisibles que par vous : la base de données refuse de les
        montrer à un autre compte. Personne d’autre ne les voit, ni les
        recruteurs, ni les autres utilisateurs. Ils ne sont pas publiés.
      </p>
      <p>Deux prestataires techniques les hébergent pour nous :</p>
      <ul>
        <li>
          <strong>Supabase</strong> : base de données et comptes, sur des
          serveurs situés à Paris (France) ;
        </li>
        <li>
          <strong>Vercel</strong> : hébergement de l’application et fabrication
          des PDF. Comme tout hébergeur, il tient des journaux techniques
          (adresse IP, page demandée) pour faire fonctionner et protéger le
          service.
        </li>
      </ul>

      <h2>Les offres d’emploi et les conseils</h2>
      <p>
        Les offres affichées dans Vitae sont reprises de sites d’emploi publics.
        Postuler vous emmène sur le site qui a publié l’offre : ce que vous y
        transmettez relève de ce site, pas de Vitae. Consulter les offres et
        les conseils ne demande aucun compte.
      </p>

      <h2>Combien de temps</h2>
      <ul>
        <li>Le brouillon reste dans votre navigateur tant que vous ne l’effacez pas.</li>
        <li>Un CV enregistré reste dans votre compte jusqu’à ce que vous le supprimiez.</li>
        <li>Votre compte reste ouvert jusqu’à ce que vous demandiez sa suppression.</li>
      </ul>

      <h2>Supprimer vos données</h2>
      <p>
        Chaque CV se supprime depuis <Link className="underline" href="/compte">votre compte</Link>,
        bouton « Supprimer ». La suppression est définitive.
      </p>
      <p>
        Pour fermer votre compte et effacer tout ce qui s’y rattache, écrivez-nous
        à {mail} depuis l’adresse du compte. Nous le faisons sous 30 jours et
        vous le confirmons.
      </p>

      <h2>Vos droits</h2>
      <p>
        Conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à
        la protection des données à caractère personnel, vous pouvez demander
        l’accès à vos données, leur rectification ou leur suppression, et vous
        opposer à leur traitement, en écrivant à {mail}. Si vous estimez que
        vos droits ne sont pas respectés, vous pouvez saisir l’ARTCI (Autorité
        de Régulation des Télécommunications/TIC de Côte d’Ivoire).
      </p>

      <h2>Si cette page change</h2>
      <p>
        Nous mettons à jour la date en haut de la page.
      </p>
    </article>
  );
}
