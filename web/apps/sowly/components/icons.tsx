/**
 * Pictogrammes, écrits à la main (aucune librairie d'icônes dans le dépôt).
 * Trait de 1,8 sur une grille de 24, extrémités arrondies : une seule
 * famille de dessin pour toute l'application.
 */

import type React from 'react';

function Svg({ children, className = 'h-6 w-6' }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

type P = { className?: string };

/** Une pousse : l'onglet Aujourd'hui, et la marque. */
export const SproutIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M12 21v-8" />
    <path d="M12 13c0-4 2.5-6.5 7-6.5 0 4.5-2.5 6.5-7 6.5z" />
    <path d="M12 15.5C12 12 9.8 10 5.5 10c0 3.5 2.2 5.5 6.5 5.5z" />
  </Svg>
);

export const ListIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M4 7l1.5 1.5L8 6" />
    <path d="M4 15l1.5 1.5L8 14" />
    <path d="M11 7.5h9M11 15.5h9" />
  </Svg>
);

export const SettingsIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Svg>
);

export const PlusIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const SunIcon = ({ className }: P) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
  </Svg>
);

export const ArrowRightIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const ChevronLeftIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);

export const ChevronRightIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);

export const CalendarIcon = ({ className }: P) => (
  <Svg className={className}>
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Svg>
);

export const TrashIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.5a1.5 1.5 0 001.5 1.5h7a1.5 1.5 0 001.5-1.5L18 7M9 7V4.5h6V7" />
  </Svg>
);

export const GripIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" strokeWidth="2.6" />
  </Svg>
);

export const CloseIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const MoonIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />
  </Svg>
);

export const NoteIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M5 6h14M5 11h14M5 16h9" />
  </Svg>
);

export const BellIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 1.5h-15z" />
    <path d="M10 20.5a2 2 0 004 0" />
  </Svg>
);

export const CloudIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M7 18.5h10a4 4 0 00.6-7.96A5.5 5.5 0 006.9 9.2 4.65 4.65 0 007 18.5z" />
  </Svg>
);

export const CloudOffIcon = ({ className }: P) => (
  <Svg className={className}>
    <path d="M8.5 7.6A5.5 5.5 0 0117.6 10.54 4 4 0 0119.4 17.6M15 18.5H7a4.65 4.65 0 01-.9-9.2M3.5 3.5l17 17" />
  </Svg>
);

/**
 * Marque Sowly : la pousse de l'icône d'application (`public/icon.svg`),
 * sans son fond. Même tracé partout — écran d'accueil du téléphone, page
 * d'entrée, aperçu de partage.
 *
 * `sun` ajoute le soleil jaune de l'icône (le jaune du logo The Everyday
 * Co.), à réserver aux fonds verts ou sombres : sur fond clair, il disparaît.
 */
export const BrandMark = ({ className, sun = false }: P & { sun?: boolean }) => (
  <svg aria-hidden viewBox={sun ? '76 72 356 386' : '96 104 336 354'} fill="currentColor" className={className}>
    {sun ? <circle cx="128" cy="124" r="44" fill="var(--color-soleil-300)" /> : null}
    <path d="M214 440c-4-60 12-116 48-164h22c-26 52-38 110-34 164a18 18 0 01-36 0z" />
    <path d="M262 284c-6-104 50-172 160-172 6 108-54 170-160 172z" />
    <path d="M252 334c4-84-46-136-150-134-6 86 46 136 150 134z" />
  </svg>
);
