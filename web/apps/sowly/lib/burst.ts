'use client';

/**
 * Gerbe de réussite du hub (brief design) : 9 emoji jaillissent en cercle
 * depuis l'élément qu'on vient de cocher, choisis selon l'action — 🌱✨
 * pour une habitude, ✅✨ pour une tâche, ☀️✨ pour une journée complète.
 * 0,9 s, puis ils s'effacent.
 *
 * Posée en `position: fixed` sur le `<body>` plutôt que dans la ligne : les
 * lignes de tâche sont en `overflow: hidden` (pour le glissement), la gerbe
 * y serait rognée. Animée avec l'API Web Animations, sans état React : rien
 * à monter ni à démonter, les éléments se retirent seuls à la fin. Rien ne
 * part si le système demande moins d'animations.
 */

export const BURST = {
  habit: ['🌱', '✨'],
  task: ['✅', '✨'],
  day: ['☀️', '✨', '🌱'],
} as const;

export type BurstKind = keyof typeof BURST;

export function burst(origin: Element | null, kind: BurstKind = 'task'): void {
  if (origin === null || typeof document === 'undefined') return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const rect = origin.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const emoji = BURST[kind];
  const count = 9;
  const reach = kind === 'day' ? 96 : 64;

  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:70;overflow:visible;';
  document.body.appendChild(layer);

  const animations: Animation[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const distance = reach * (0.75 + Math.random() * 0.4);
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const rot = (Math.random() - 0.5) * 120;

    const p = document.createElement('span');
    p.textContent = emoji[i % emoji.length]!;
    p.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;font-size:20px;line-height:1;translate:-50% -50%;`;
    layer.appendChild(p);

    animations.push(p.animate(
      [
        { transform: 'translate(0,0) scale(.4) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) scale(1) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: 900, easing: 'cubic-bezier(.2, .7, .3, 1)', fill: 'forwards' },
    ));
  }

  void Promise.allSettled(animations.map((a) => a.finished)).then(() => layer.remove());
}
