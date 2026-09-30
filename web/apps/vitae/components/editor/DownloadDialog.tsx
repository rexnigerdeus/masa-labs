'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './fields';

/**
 * Confirmation du téléchargement : ce qui s'est passé, où est le fichier, et
 * comment l'enregistrer ou l'envoyer.
 *
 * Retour d'usage à l'origine de cet écran : « quand je télécharge mon CV, je
 * ne sais pas où il va dans mon téléphone ». Sur Android, le fichier atterrit
 * en silence dans Téléchargements ; sur iPhone, Safari l'ouvre ou le range
 * selon la version, et dans l'application installée il peut même ouvrir le PDF
 * par-dessus l'interface sans bouton pour revenir.
 *
 * D'où deux choix :
 *
 * - Sur iPhone, pas de téléchargement automatique : on propose la feuille de
 *   partage du système, qui contient « Enregistrer dans Fichiers », WhatsApp
 *   et Mail. C'est le seul chemin fiable vers l'app Fichiers.
 * - Ailleurs, le fichier part tout de suite dans Téléchargements, et cet écran
 *   dit où le retrouver — avec le partage en plus quand le navigateur le sait.
 *
 * Le partage est proposé ici, sur un nouveau geste, et non enchaîné à la
 * génération : `navigator.share` exige un geste récent de l'utilisateur, que
 * l'attente de la génération du PDF a consommé.
 */

export type Platform = 'android' | 'ios' | 'desktop';

export interface DownloadedCv {
  file: File;
  /** URL `blob:` du fichier, révoquée à la fermeture. */
  url: string;
  platform: Platform;
  /** true si le fichier a déjà été déposé dans Téléchargements. */
  saved: boolean;
}

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  // iPadOS se présente comme un Mac : on le reconnaît à son écran tactile.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  return 'desktop';
}

/** Application installée sur l'écran d'accueil, sans barre de navigateur. */
function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Dépose le fichier dans le dossier de téléchargement du navigateur. */
export function saveToDownloads(url: string, name: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  // Le lien doit être dans le document pour que Firefox déclenche le
  // téléchargement, et l'URL survivre au clic : Safari la lit en différé.
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function canShareFile(file: File): boolean {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} Ko`
    : `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

/** Où est le fichier, en gestes concrets, pour l'appareil en main. */
function whereToFind(platform: Platform, shareable: boolean): { title: string; steps: string[] } {
  switch (platform) {
    case 'android':
      return {
        title: 'Où trouver votre CV',
        steps: [
          'Ouvrez l’application « Fichiers » (ou « Mes fichiers »).',
          'Touchez « Téléchargements ».',
          'Votre CV est en haut de la liste.',
        ],
      };
    case 'ios':
      return shareable
        ? {
          title: 'Pour le garder sur votre iPhone',
          steps: [
            'Touchez le bouton vert ci-dessous.',
            'Dans le menu qui s’ouvre, choisissez « Enregistrer dans Fichiers ».',
            'Retrouvez-le ensuite dans l’application « Fichiers ».',
          ],
        }
        : {
          title: 'Pour le garder sur votre iPhone',
          steps: [
            'Touchez « Télécharger » ci-dessous, puis confirmez.',
            'Ouvrez l’application « Fichiers », puis « Téléchargements ».',
          ],
        };
    case 'desktop':
      return {
        title: 'Où trouver votre CV',
        steps: [
          'Il est dans le dossier « Téléchargements » de votre ordinateur.',
          'Vous pouvez aussi l’ouvrir directement avec le bouton ci-dessous.',
        ],
      };
  }
}

export function DownloadDialog({ cv, onClose }: { cv: DownloadedCv; onClose: () => void }) {
  const title = useRef<HTMLHeadingElement>(null);
  const [shareable, setShareable] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    setShareable(canShareFile(cv.file));
    setStandalone(isStandalone());
    title.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cv, onClose]);

  async function share(): Promise<void> {
    try {
      await navigator.share({ files: [cv.file], title: 'Mon CV' });
      setShared(true);
    } catch (error) {
      // Feuille de partage refermée : l'utilisateur a changé d'avis, rien à faire.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      saveToDownloads(cv.url, cv.file.name);
    }
  }

  const where = whereToFind(cv.platform, shareable);
  const open = (
    <a
      href={cv.url}
      target="_blank"
      rel="noopener"
      className="inline-flex min-h-11 w-full items-center justify-center rounded-full border-2 border-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-soft"
    >
      Ouvrir mon CV
    </a>
  );

  // Une action principale et au plus une secondaire, choisies selon
  // l'appareil : c'est l'écran où il ne faut surtout pas hésiter.
  let primary: React.ReactNode;
  let secondary: React.ReactNode = null;
  if (cv.platform === 'ios') {
    primary = shareable
      ? <Button variant="solid" size="lg" full onClick={() => void share()}>Enregistrer dans Fichiers</Button>
      : <Button variant="solid" size="lg" full onClick={() => saveToDownloads(cv.url, cv.file.name)}>Télécharger</Button>;
    // Dans l'application installée, ouvrir le PDF le pose par-dessus
    // l'interface sans retour possible : on s'en abstient.
    secondary = standalone ? null : open;
  } else if (cv.platform === 'android') {
    primary = shareable
      ? <Button variant="solid" size="lg" full onClick={() => void share()}>Envoyer ou enregistrer ailleurs</Button>
      : <Button variant="solid" size="lg" full onClick={() => saveToDownloads(cv.url, cv.file.name)}>Télécharger à nouveau</Button>;
    secondary = shareable
      ? <Button full onClick={() => saveToDownloads(cv.url, cv.file.name)}>Télécharger à nouveau</Button>
      : null;
  } else {
    primary = (
      <a
        href={cv.url}
        target="_blank"
        rel="noopener"
        className="inline-flex min-h-13 w-full items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-header hover:bg-accent-dark"
      >
        Ouvrir mon CV
      </a>
    );
    secondary = <Button full onClick={() => saveToDownloads(cv.url, cv.file.name)}>Télécharger à nouveau</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-header/60 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="telechargement-titre"
        className="flex max-h-[92dvh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
            <svg aria-hidden viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <h2 id="telechargement-titre" ref={title} tabIndex={-1} className="text-xl font-bold outline-none">
            {shared ? 'C’est fait !' : cv.saved ? 'Votre CV est téléchargé' : 'Votre CV est prêt'}
          </h2>
        </div>

        {/* Le fichier, tel qu'il apparaîtra dans le gestionnaire de fichiers :
            le nom affiché ici est celui qu'il faudra chercher. */}
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-canvas p-3">
          <span aria-hidden className="flex h-12 w-10 shrink-0 items-center justify-center rounded-md bg-danger text-[0.65rem] font-bold text-white">
            PDF
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{cv.file.name}</span>
            <span className="block text-sm text-muted">{formatSize(cv.file.size)}</span>
          </span>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">{where.title}</h3>
          <ol className="flex flex-col gap-2">
            {where.steps.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm">
                <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-header text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-2.5">
          {primary}
          {secondary}
          <Button variant="ghost" full onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}
