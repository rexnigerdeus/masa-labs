'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '../../lib/supabase/client';
import { phoneToEmail } from '../../lib/phone';
import { Button, Field, Input, Notice } from '../ui';

/**
 * Connexion et inscription par numéro de téléphone.
 *
 * Un seul formulaire, deux modes : quelqu'un qui arrive depuis une annonce
 * partagée sur WhatsApp ne sait pas toujours s'il a déjà un compte, et le
 * faire choisir entre deux pages à ce moment-là lui fait quitter le parcours.
 *
 * Le numéro est converti en pseudo-email avant d'être envoyé à Supabase :
 * aucun SMS n'est expédié, donc aucun coût par inscription. Voir lib/phone.ts.
 */

type Mode = 'connexion' | 'inscription';

export function AuthForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('inscription');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    const email = phoneToEmail(phone);
    if (email === null) {
      setError('Entrez un numéro ivoirien à dix chiffres, par exemple 07 00 00 00 00.');
      return;
    }
    if (mode === 'inscription' && fullName.trim().length < 2) {
      setError('Indiquez le nom sous lequel les loueurs vous verront.');
      return;
    }

    setBusy(true);
    const supabase = getSupabaseClient();
    const { error: authError } = mode === 'inscription'
      ? await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim() } },
      })
      : await supabase.auth.signInWithPassword({ email, password });

    if (authError !== null) {
      setError(translate(authError.message));
      setBusy(false);
      return;
    }

    // `refresh()` avant `push()` : les composants serveur doivent revoir la
    // session, sinon la page d'arrivée se rend encore en visiteur anonyme.
    router.refresh();
    router.push(next);
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="card flex max-w-md flex-col gap-4 p-5">
      <div className="flex gap-2 text-sm">
        {(['inscription', 'connexion'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); }}
            className={`rounded-full px-3 py-1.5 ${
              mode === m ? 'bg-primary text-white' : 'border border-line bg-white'
            }`}
          >
            {m === 'inscription' ? 'Créer un compte' : 'J’ai déjà un compte'}
          </button>
        ))}
      </div>

      <Field label="Numéro de téléphone" hint="Celui sur lequel on peut vous joindre.">
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07 00 00 00 00"
        />
      </Field>

      {mode === 'inscription' ? (
        <Field label="Nom ou nom de votre activité">
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Kouassi Studio"
          />
        </Field>
      ) : null}

      <Field
        label="Mot de passe"
        hint={mode === 'inscription' ? '6 caractères minimum.' : undefined}
      >
        <Input
          type="password"
          value={password}
          autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {error !== null ? <Notice>{error}</Notice> : null}

      <Button type="submit" variant="solid" disabled={busy}>
        {busy ? 'Un instant…' : mode === 'inscription' ? 'Créer mon compte' : 'Me connecter'}
      </Button>

      <p className="text-xs text-muted">
        Aucun SMS ne vous sera envoyé : votre numéro sert d’identifiant.
      </p>
    </form>
  );
}

/** Les messages de GoTrue arrivent en anglais ; l'interface est en français. */
function translate(message: string): string {
  const known: Record<string, string> = {
    'Invalid login credentials': 'Numéro ou mot de passe incorrect.',
    'User already registered':
      'Un compte existe déjà avec ce numéro. Choisissez « J’ai déjà un compte ».',
    'Password should be at least 6 characters.':
      'Le mot de passe doit faire au moins 6 caractères.',
    'Signups not allowed for this instance':
      'Les inscriptions sont désactivées sur ce projet.',
  };
  return known[message] ?? `Connexion impossible : ${message}`;
}
