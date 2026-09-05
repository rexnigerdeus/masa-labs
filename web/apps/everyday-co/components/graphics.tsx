/**
 * Illustrations du site.
 *
 * Tout est en SVG en ligne : aucune requête réseau, aucun octet d'image à
 * télécharger, et un rendu net à n'importe quelle densité d'écran. Sur une
 * connexion lente en Côte d'Ivoire, une illustration de 40 Ko est une
 * illustration que personne ne voit.
 *
 * Les couleurs viennent de `currentColor` ou des variables de thème : les
 * dessins suivent la palette sans être redéfinis.
 */

/**
 * Motif géométrique de fond.
 *
 * Losanges et traits inspirés des tissages ouest-africains, posés en très
 * faible opacité : c'est une texture, pas un décor. Un seul `<pattern>` répété
 * par le navigateur, donc quelques centaines d'octets pour couvrir un écran.
 */
export function PatternBackground({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="eco-weave" width="56" height="56" patternUnits="userSpaceOnUse">
          <path
            d="M28 4 44 28 28 52 12 28Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <circle cx="28" cy="28" r="3" fill="currentColor" />
          <path d="M0 28H8M48 28H56M28 0V6M28 50v6" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#eco-weave)" />
    </svg>
  );
}

/**
 * Téléphone montrant Vitae de façon abstraite.
 *
 * Volontairement schématique : un vrai écran capturé vieillit à chaque
 * changement d'interface et se lit mal à cette taille. Ce qu'il faut
 * comprendre en une seconde, c'est « un CV, une note, des conseils ».
 */
export function PhoneMockup({ className = '' }: { className?: string }) {
  const score = 82;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg
      role="img"
      aria-label="Aperçu de l’application Vitae sur un téléphone : un CV et son score"
      viewBox="0 0 260 480"
      className={className}
    >
      {/* Corps du téléphone */}
      <rect x="10" y="10" width="240" height="460" rx="34" fill="var(--color-dark)" />
      <rect x="20" y="20" width="220" height="440" rx="26" fill="#ffffff" />
      <rect x="104" y="28" width="52" height="7" rx="3.5" fill="var(--color-dark)" opacity="0.25" />

      {/* En-tête de l'app */}
      <rect x="20" y="46" width="220" height="34" fill="var(--color-dark)" />
      <text x="36" y="69" fill="#ffffff" fontSize="15" fontWeight="700">Vitae</text>

      {/* Anneau de score */}
      <g transform="translate(130 138)">
        <circle r={radius} fill="none" stroke="#e6e6e1" strokeWidth="9" />
        <circle
          r={radius}
          fill="none"
          stroke="var(--color-vitae)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
          transform="rotate(-90)"
        />
        <text textAnchor="middle" dy="6" fontSize="18" fontWeight="700" fill="var(--color-dark)">
          {score}
        </text>
      </g>
      <text x="130" y="184" textAnchor="middle" fontSize="10" fill="#6b6b66">
        Score de votre CV
      </text>

      {/* Lignes de CV */}
      <g fill="#d9d9d4">
        <rect x="42" y="204" width="90" height="8" rx="4" fill="var(--color-dark)" />
        <rect x="42" y="220" width="140" height="6" rx="3" />
        <rect x="42" y="246" width="64" height="7" rx="3.5" fill="var(--color-vitae)" />
        <rect x="42" y="262" width="176" height="6" rx="3" />
        <rect x="42" y="276" width="150" height="6" rx="3" />
        <rect x="42" y="290" width="164" height="6" rx="3" />
        <rect x="42" y="316" width="64" height="7" rx="3.5" fill="var(--color-vitae)" />
        <rect x="42" y="332" width="176" height="6" rx="3" />
        <rect x="42" y="346" width="122" height="6" rx="3" />
      </g>

      {/* Conseil en cours */}
      <rect x="30" y="376" width="200" height="34" rx="10" fill="var(--color-yellow-soft)" />
      <circle cx="48" cy="393" r="6" fill="var(--color-vitae)" />
      <g fill="#5c5650">
        <rect x="62" y="386" width="130" height="5" rx="2.5" />
        <rect x="62" y="396" width="92" height="5" rx="2.5" />
      </g>

      {/* Bouton */}
      <rect x="30" y="422" width="200" height="26" rx="13" fill="var(--color-vitae)" />
      <text x="130" y="439" textAnchor="middle" fontSize="10" fontWeight="600" fill="#ffffff">
        Télécharger le PDF
      </text>
    </svg>
  );
}

/** Icônes des principes. Trait uniforme, aucune zone pleine : lisibles en petit. */
function IconFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 40"
      width="40"
      height="40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function IconMobile() {
  return (
    <IconFrame>
      <rect x="12" y="5" width="16" height="30" rx="3.5" />
      <path d="M17 9h6" />
      <circle cx="20" cy="30" r="1.4" fill="currentColor" stroke="none" />
    </IconFrame>
  );
}

export function IconFocus() {
  return (
    <IconFrame>
      <circle cx="20" cy="20" r="13" />
      <circle cx="20" cy="20" r="6.5" />
      <circle cx="20" cy="20" r="1.6" fill="currentColor" stroke="none" />
    </IconFrame>
  );
}

export function IconAccess() {
  return (
    <IconFrame>
      {/* Un signal de réseau faible : deux barres sur quatre. */}
      <path d="M8 28h4v6H8zM16 23h4v11h-4z" />
      <path d="M24 18h4v16h-4zM32 11h4v23h-4z" opacity="0.35" />
    </IconFrame>
  );
}

/**
 * Séparateur de section.
 *
 * Une ligne qui s'épaissit puis s'affine, plutôt qu'un filet uniforme : donne
 * un rythme aux longues pages sans ajouter de bloc à lire.
 */
export function Divider({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 12"
      preserveAspectRatio="none"
      className={className}
      height="12"
      width="100%"
    >
      <path
        d="M0 6h300c60 0 60-4 120-4s60 8 120 8 60-8 120-8 60 4 120 4h420"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
