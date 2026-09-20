/**
 * Les quatre comportements du langage `labs-ui` qui ne tiennent pas en CSS,
 * en un seul script sans dépendance (~1,2 Ko), rendu tel quel dans la page.
 *
 * Composant serveur : il n'expédie pas de React, seulement la balise.
 *
 * Pourquoi un script inline plutôt qu'un composant client : ces quatre
 * tâches n'ont ni état ni rendu. Les confier à React coûterait une
 * hydratation complète pour poser trois écouteurs — sur le téléphone
 * d'entrée de gamme visé, c'est exactement la dépense qu'on refuse.
 */
export function LabsPageScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){
          var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

          /* 1. Largeur de la barre de défilement, pour que les blocs pleine
                largeur (.labs-bleed) s'arrêtent au bord visible et non à
                100vw, qui la comprend. Zéro sur mobile. */
          function sb(){
            var w = window.innerWidth - document.documentElement.clientWidth;
            document.documentElement.style.setProperty('--labs-sb', (w > 0 ? w : 0) + 'px');
          }
          sb();
          window.addEventListener('resize', sb, { passive: true });

          /* 2. Révélation au défilement. Sans IntersectionObserver (ou en
                mode animations réduites), tout est affiché d'emblée. */
          var els = document.querySelectorAll('.labs-reveal');
          if (reduce || !('IntersectionObserver' in window)) {
            for (var i = 0; i < els.length; i++) els[i].classList.add('is-in');
          } else {
            var io = new IntersectionObserver(function(entries){
              entries.forEach(function(e){
                if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
              });
            }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
            els.forEach(function(el){ io.observe(el); });
          }

          /* 3. Barre de navigation fixe : fond opaque dès qu'on quitte le
                hero, repli vers le haut quand on descend. Seule la vitrine
                en a une ; les applications gardent leur propre en-tête. */
          var nav = document.getElementById('labs-nav');
          if (nav !== null) {
            var last = 0;
            var ticking = false;
            var onScroll = function(){
              var y = window.scrollY;
              nav.classList.toggle('is-scrolled', y > 24);
              nav.classList.toggle('is-hidden', y > 320 && y > last + 4);
              last = y;
              ticking = false;
            };
            window.addEventListener('scroll', function(){
              if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
            }, { passive: true });
            onScroll();
          }

          /* 4. Boutons liquides : la pastille grossit depuis l'endroit où le
                curseur est entré, pas depuis le centre. */
          document.addEventListener('pointerenter', function(e){
            var btn = e.target instanceof Element ? e.target.closest('.is-liquid') : null;
            if (btn === null) return;
            var r = btn.getBoundingClientRect();
            btn.style.setProperty('--lx', ((e.clientX - r.left) / r.width * 100) + '%');
            btn.style.setProperty('--ly', ((e.clientY - r.top) / r.height * 100) + '%');
          }, true);
        })();`,
      }}
    />
  );
}
