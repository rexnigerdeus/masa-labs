'use client';

import { useState } from 'react';

/**
 * Mot de passe avec bouton « Afficher » / « Masquer ».
 *
 * Sur un clavier de téléphone, une faute de frappe invisible est la première
 * cause de « mot de passe incorrect » — et de compte créé avec un mot de passe
 * qu'on ne connaît pas soi-même. Voir ce qu'on tape règle les deux.
 *
 * Composant à part plutôt que dans `ui.tsx` : il a un état, et les primitives
 * partagées doivent rester utilisables par les composants serveur.
 */
export function PasswordInput({ value, onChange, autoComplete }: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
}) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <input
        className="saisie !pr-28"
        type={visible ? 'text' : 'password'}
        value={value}
        autoComplete={autoComplete}
        // Pas de correction ni de majuscule automatique quand le texte est
        // visible : le clavier « corrigerait » le mot de passe.
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-pressed={visible}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        className="absolute inset-y-1 right-1 inline-flex items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold text-muted hover:bg-line hover:text-ink"
      >
        {visible ? (
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 3l14 14M8.6 8.7a2 2 0 002.7 2.7M6.2 5.6C3.6 7 1.8 10 1.8 10s3 6 8.2 6c1.4 0 2.7-.4 3.8-1M11 4.1c-.3 0-.7-.1-1-.1 5.2 0 8.2 6 8.2 6s-.6 1.2-1.7 2.5" />
          </svg>
        ) : (
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M1.8 10S4.8 4 10 4s8.2 6 8.2 6-3 6-8.2 6-8.2-6-8.2-6z" />
            <circle cx="10" cy="10" r="2.5" />
          </svg>
        )}
        <span aria-hidden>{visible ? 'Masquer' : 'Afficher'}</span>
      </button>
    </span>
  );
}
