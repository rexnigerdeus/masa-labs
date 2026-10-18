import { VITAE_URL } from '../lib/config';

/**
 * Mesure d'audience : Vercel Web Analytics, sans cookie ni identifiant
 * stocké (brief v2, « Mesure »).
 *
 * Le script de Vercel est posé tel quel plutôt que via `@vercel/analytics` :
 * le paquet n'apporte ici qu'un composant client, donc une hydratation de
 * plus, pour écrire une balise. Rendu seulement sur Vercel, où
 * `/_vercel/insights/script.js` existe ; en local, il répondrait 404.
 *
 * Trois clics remontent comme événements, par délégation sur le document
 * plutôt qu'un écouteur par bouton :
 *   open_vitae       tout lien vers Vitae, reconnu à son adresse — y compris
 *                    le bouton du hero, rendu par le composant partagé
 *   whatsapp_follow  `data-track` sur les liens vers la chaîne
 *   school_contact   `data-track` sur « Organiser un atelier »
 * `where` dit d'où vient le clic (identifiant de la section la plus proche).
 *
 * La file `vaq` reprend le format de `@vercel/analytics` : un clic fait
 * avant la fin du chargement du script n'est pas perdu.
 */
export function Measure() {
  if (process.env.VERCEL !== '1') return null;

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){
            window.va = window.va || function(){ (window.vaq = window.vaq || []).push(Array.prototype.slice.call(arguments)); };
            var vitae = ${JSON.stringify(VITAE_URL)};
            document.addEventListener('click', function(e){
              var a = e.target instanceof Element ? e.target.closest('a') : null;
              if (a === null) return;
              var name = a.getAttribute('data-track') || (a.href.indexOf(vitae) === 0 ? 'open_vitae' : null);
              if (name === null) return;
              var zone = a.closest('[id]');
              window.va('event', { name: name, data: { where: zone === null ? 'page' : zone.id } });
            }, true);
          })();`,
        }}
      />
      <script defer src="/_vercel/insights/script.js" />
    </>
  );
}
