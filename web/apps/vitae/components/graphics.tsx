/**
 * Illustrations de Vitae.
 *
 * SVG en ligne uniquement : rien à télécharger, net sur tous les écrans, et
 * aucune requête supplémentaire sur une connexion lente. Les couleurs viennent
 * de `currentColor`, les dessins suivent donc la palette sans la redéfinir.
 */

/**
 * Le tri automatique, expliqué en une image.
 *
 * Trois CV arrivent, un tamis les filtre, un seul ressort. C'est exactement ce
 * que le produit corrige, et c'est plus rapide à comprendre qu'un paragraphe
 * sur les logiciels ATS.
 */
export function AtsFilterIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="Trois CV passent dans un filtre automatique ; un seul en ressort"
      viewBox="0 0 320 180"
      className={className}
      fill="none"
    >
      {/* Les CV qui arrivent */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(6 ${18 + i * 52})`}>
          <rect width="52" height="44" rx="5" fill="#ffffff" stroke="var(--color-line)" />
          <rect x="8" y="9" width="24" height="4" rx="2" fill="var(--color-ink)" opacity="0.7" />
          <rect x="8" y="19" width="36" height="3" rx="1.5" fill="var(--color-ink)" opacity="0.2" />
          <rect x="8" y="26" width="30" height="3" rx="1.5" fill="var(--color-ink)" opacity="0.2" />
          <rect x="8" y="33" width="34" height="3" rx="1.5" fill="var(--color-ink)" opacity="0.2" />
        </g>
      ))}

      {/* Trajectoires vers le tamis */}
      <path
        d="M62 40C100 40 108 78 132 84M62 92h70M62 144c38 0 46-38 70-44"
        stroke="var(--color-ink)"
        strokeOpacity="0.25"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />

      {/* Le tamis */}
      <g transform="translate(140 44)">
        <rect width="40" height="92" rx="8" fill="var(--color-header)" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x="9"
            y={12 + i * 16}
            width="22"
            height="6"
            rx="3"
            fill="#ffffff"
            opacity={i === 2 ? 1 : 0.28}
          />
        ))}
      </g>
      <text
        x="160"
        y="154"
        textAnchor="middle"
        fontSize="9"
        fill="var(--color-muted)"
      >
        Logiciel de tri
      </text>

      {/* Ce qui ressort */}
      <path
        d="M182 90h26"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g transform="translate(212 62)">
        <rect width="62" height="56" rx="6" fill="#ffffff" stroke="var(--color-accent)" strokeWidth="2" />
        <rect x="10" y="11" width="28" height="5" rx="2.5" fill="var(--color-ink)" opacity="0.75" />
        <rect x="10" y="23" width="42" height="3.5" rx="1.75" fill="var(--color-ink)" opacity="0.2" />
        <rect x="10" y="31" width="36" height="3.5" rx="1.75" fill="var(--color-ink)" opacity="0.2" />
        <rect x="10" y="39" width="40" height="3.5" rx="1.75" fill="var(--color-ink)" opacity="0.2" />
      </g>
      <g transform="translate(262 108)">
        <circle r="13" fill="var(--color-accent)" />
        <path
          d="M-5.5 0.5 -1.5 4.5 5.5 -3.5"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/** Icônes des trois étapes du parcours. */
function IconFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 36 36"
      width="34"
      height="34"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Créer : une feuille en cours d'écriture. */
export function IconCreate() {
  return (
    <IconFrame>
      <path d="M8 5h13l7 7v19H8z" />
      <path d="M21 5v7h7" />
      <path d="M13 20h10M13 25h6" />
    </IconFrame>
  );
}

/** Postuler : une offre et son lien sortant. */
export function IconApply() {
  return (
    <IconFrame>
      <rect x="5" y="10" width="26" height="20" rx="3" />
      <path d="M13 10V7.5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2V10" />
      <path d="M5 18h26" />
      <path d="M15.5 21.5h5" />
    </IconFrame>
  );
}

/** Progresser : une courbe qui monte. */
export function IconLearn() {
  return (
    <IconFrame>
      <path d="M5 28h26" />
      <path d="M8 23l7-7 5 5 9-11" />
      <path d="M29 6v4.5h-4.5" />
    </IconFrame>
  );
}

/**
 * Fond ponctué très léger.
 *
 * Casse l'aplat du blanc cassé sur les grandes zones vides sans jamais entrer
 * en concurrence avec le texte.
 */
export function DotGrid({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden className={className} width="100%" height="100%">
      <defs>
        <pattern id="vitae-dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#vitae-dots)" />
    </svg>
  );
}
