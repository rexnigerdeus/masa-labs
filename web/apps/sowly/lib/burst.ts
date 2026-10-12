'use client';

/**
 * Gerbe de récompense : de petites graines et des éclats jaillissent de la
 * case qu'on vient de cocher, puis retombent en s'effaçant.
 *
 * Posée en `position: fixed` sur le `<body>` plutôt que dans la ligne : les
 * lignes de tâche sont en `overflow: hidden` (pour le glissement), la gerbe
 * y serait rognée. Animée avec l'API Web Animations, sans état React : rien
 * à monter ni à démonter, les éléments se retirent seuls à la fin.
 *
 * Couleurs : le vert de la pousse et le jaune soleil — le jaune reste ainsi
 * attaché à la récompense, comme le halo de la journée complète.
 */

const COLORS = ['var(--done)', 'var(--color-soleil-300)', 'var(--primary-ink)', 'var(--color-soleil-400)'];

export function burst(origin: Element | null, { count = 12, spread = 1 }: { count?: number; spread?: number } = {}): void {
  if (origin === null || typeof document === 'undefined') return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const rect = origin.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60;overflow:visible;';
  document.body.appendChild(layer);

  const animations: Animation[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const distance = (26 + Math.random() * 26) * spread;
    const dx = Math.cos(angle) * distance;
    // Les graines retombent un peu : la fin de course descend.
    const dy = Math.sin(angle) * distance;
    const fall = 10 + Math.random() * 14;
    const leaf = i % 3 === 0;
    const size = leaf ? 9 : 4 + Math.random() * 4;

    const p = document.createElement('span');
    p.style.cssText = [
      'position:absolute',
      `left:${cx - size / 2}px`,
      `top:${cy - size / 2}px`,
      `width:${size}px`,
      `height:${leaf ? size * 0.6 : size}px`,
      `background:${COLORS[i % COLORS.length]}`,
      // Feuille : ovale pointu ; éclat : rond.
      `border-radius:${leaf ? '100% 0 100% 0' : '999px'}`,
    ].join(';');
    layer.appendChild(p);

    const spin = (Math.random() - 0.5) * 540;
    animations.push(p.animate(
      [
        { transform: 'translate(0,0) scale(0.4) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) scale(1) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx * 1.15}px,${dy * 1.15 + fall}px) scale(0.6) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 620 + Math.random() * 220, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'forwards' },
    ));
  }

  void Promise.allSettled(animations.map((a) => a.finished)).then(() => layer.remove());
}
