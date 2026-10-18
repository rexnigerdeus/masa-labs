import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL } from '../../lib/config';

export const metadata: Metadata = {
  title: 'Confidentialité',
  description: 'Ce que Vitae enregistre quand vous créez votre CV, où, pourquoi, combien de temps, et comment le supprimer.',
};

/**
 * Politique de confidentialité de Vitae.
 *
 * Plan imposé par le brief v2 (lot A, « Confidentialité ») : ce qui est
 * collecté, pourquoi, ce qui n'est jamais fait, durée de conservation, droits,
 * contact, autorité de contrôle (ARTCI), suppression depuis /compte. Chaque
 * phrase décrit ce que fait le code au moment de l'écrire :
 *   - brouillon dans le navigateur : lib/draft.ts, lib/wizard.ts
 *   - téléchargement du PDF sans compte : app/api/export/route.ts
 *   - compte par numéro (pseudo-e-mail) : lib/phone.ts, AuthForm
 *   - CV, lettres en base : lib/resumes.ts, lib/letters.ts
 *   - mesure d'audience maison, sans donnée personnelle : lib/analytics.ts
 *   - listes d'attente : lib/waitlist.ts, table `waitlist`
 *   - paiements Wave : lib/checkout.ts, app/api/wave/webhook/route.ts
 *   - suppression : vitae_delete_my_account (migration 20261018120000)
 *   - base Supabase en région eu-west-3 (Paris)
 * Si l'un de ces points change, cette page change avec lui.
 *
 * Les durées de conservation sont une proposition à valider par Daniel
 * (brief : « Durée de conservation » à écrire) : voir le récapitulatif de la
 * branche feat/vitae-brief-v2.
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
        <li>Vous créez et téléchargez votre premier CV sans compte : il reste dans votre téléphone.</li>
        <li>Vos données servent à faire votre CV, rien d’autre. Nous ne vendons ni ne partageons vos CV, et ne les montrons à aucun recruteur.</li>
        <li>Pas de publicité. Aucun message publicitaire sans votre accord.</li>
        <li>Nos statistiques d’usage ne contiennent aucune donnée personnelle.</li>
        <li>Vous supprimez votre compte et vos CV depuis votre compte, immédiatement.</li>
      </ul>

      <h2>Ce que nous collectons</h2>
      <ul>
        <li>
          <strong>Le contenu de votre CV</strong>, et votre photo si vous en
          ajoutez une (recadrée et compressée sur votre téléphone). Sans
          compte, il reste dans la mémoire de votre navigateur : rien n’est
          envoyé à nos serveurs, sauf au moment de fabriquer le PDF.
        </li>
        <li>
          <strong>Votre numéro de téléphone</strong>, seulement si vous créez
          un compte ou vous inscrivez à une liste d’attente. Pour un compte, il
          sert d’identifiant avec votre mot de passe, jamais stocké en clair ;
          les comptes plus anciens utilisent une adresse e-mail.
        </li>
        <li>
          <strong>Avec un compte</strong> : vos CV, vos lettres de motivation,
          les options achetées et leur date de fin.
        </li>
        <li>
          <strong>Si vous payez</strong> : l’option choisie, son montant, son
          statut et la référence du paiement chez Wave. Le paiement se fait
          chez Wave ; nous ne voyons ni votre code ni votre solde.
        </li>
        <li>
          <strong>Des statistiques d’usage, sans donnée personnelle</strong> :
          les étapes franchies (CV commencé, téléchargé…), avec un identifiant
          tiré au hasard et gardé dans votre navigateur, et le code du lien qui
          vous a amené (par exemple celui d’un ambassadeur). Jamais votre nom,
          votre numéro ni le contenu de votre CV.
        </li>
      </ul>
      <p>
        Pour fabriquer le PDF, le contenu de votre CV est envoyé à notre
        serveur, mis en page, puis renvoyé à votre téléphone. Le fichier PDF
        lui-même n’est pas conservé. Avec un compte, un petit fichier technique
        (cookie de session) garde votre connexion ouverte.
      </p>

      <h2>Pourquoi</h2>
      <ul>
        <li>Produire votre CV et vos lettres.</li>
        <li>Gérer votre compte et vos achats.</li>
        <li>Prévenir les personnes inscrites à une liste d’attente, une seule fois, le jour où le service est prêt.</li>
        <li>Savoir ce qui aide vraiment (les statistiques, sans donnée personnelle).</li>
      </ul>

      <h2>Ce que nous ne faisons jamais</h2>
      <ul>
        <li>Vendre ou partager vos CV.</li>
        <li>Vous envoyer des messages publicitaires sans votre consentement.</li>
      </ul>

      <h2>Qui y a accès</h2>
      <p>
        Vos CV ne sont lisibles que par vous : la base de données refuse de les
        montrer à un autre compte. Ils ne sont pas publiés. Deux prestataires
        techniques les hébergent pour nous :
      </p>
      <ul>
        <li><strong>Supabase</strong> : base de données et comptes, sur des serveurs situés à Paris (France) ;</li>
        <li>
          <strong>Vercel</strong> : hébergement de l’application et fabrication
          des PDF. Comme tout hébergeur, il tient des journaux techniques
          (adresse IP, page demandée) pour faire fonctionner et protéger le
          service.
        </li>
      </ul>
      <p>Les paiements sont traités par <strong>Wave</strong>, selon ses propres conditions.</p>

      <h2>Les offres d’emploi et les conseils</h2>
      <p>
        Les offres affichées viennent de sources dont nous avons vérifié
        qu’elles autorisent la reprise, ou nous sont envoyées par les
        recruteurs ; chacune indique sa source. Postuler vous emmène sur le
        site ou l’adresse de l’annonceur : ce que vous y transmettez relève de
        lui, pas de Vitae.
      </p>

      <h2>Combien de temps</h2>
      <ul>
        <li>Le brouillon reste dans votre navigateur tant que vous ne l’effacez pas.</li>
        <li>Vos CV et lettres restent dans votre compte jusqu’à ce que vous les supprimiez, ou supprimiez votre compte.</li>
        <li>Un numéro inscrit à une liste d’attente est effacé après le message annoncé, et au plus tard 12 mois après l’inscription.</li>
        <li>Les statistiques d’usage sont gardées 24 mois.</li>
        <li>Les traces de paiement sont gardées 10 ans, comme l’exige la comptabilité, détachées de votre compte s’il est supprimé.</li>
      </ul>

      <h2>Supprimer vos données</h2>
      <p>
        Dans <Link className="underline" href="/compte">votre compte</Link>, le
        bouton « Supprimer mon compte et mes CV » efface immédiatement vos CV,
        vos lettres et vos options. Si votre compte sert aussi à une autre
        application de The Everyday Co., seules vos données Vitae sont
        effacées et l’écran vous le dit. Chaque CV se supprime aussi un par un.
      </p>

      <h2>Vos droits</h2>
      <p>
        Conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à
        la protection des données à caractère personnel, vous pouvez demander
        l’accès à vos données, leur rectification ou leur suppression, et vous
        opposer à leur traitement, en écrivant à {mail}. Si vous estimez que
        vos droits ne sont pas respectés, vous pouvez saisir l’ARTCI (Autorité
        de Régulation des Télécommunications/TIC de Côte d’Ivoire), autorité de
        contrôle.
      </p>

      <h2>Si cette page change</h2>
      <p>Nous mettons à jour la date en haut de la page.</p>
    </article>
  );
}
