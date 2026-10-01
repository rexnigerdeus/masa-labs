'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '../../lib/supabase/client';
import { Button, Field, PasswordInput, TextInput } from '../editor/fields';

/**
 * Connexion et inscription.
 *
 * Un seul formulaire, deux modes : la cible arrive ici depuis le bouton de
 * téléchargement et ne sait pas toujours si elle a déjà un compte. Un écran
 * unique évite de la faire hésiter à ce moment-là.
 */

type Mode = 'connexion' | 'inscription';

export function AuthForm({ googleEnabled, next }: { googleEnabled: boolean; next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('inscription');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = getSupabaseClient();
    const { error: authError } = mode === 'inscription'
      ? await supabase.auth.signUp({ email, password })
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

  async function withGoogle(): Promise<void> {
    setBusy(true);
    const supabase = getSupabaseClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (authError !== null) {
      setError(translate(authError.message));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="card flex w-full max-w-md flex-col gap-5 p-5">
      {/* Deux onglets de même poids : on voit d'un coup d'œil lequel est actif. */}
      <div className="grid grid-cols-2 gap-1 rounded-full bg-canvas p-1" role="group" aria-label="Type de compte">
        {(['inscription', 'connexion'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => { setMode(m); setError(null); }}
            className={`min-h-11 rounded-full px-3 text-sm font-semibold ${
              mode === m ? 'bg-header text-white shadow' : 'text-muted hover:text-ink'
            }`}
          >
            {m === 'inscription' ? 'Créer un compte' : 'J’ai déjà un compte'}
          </button>
        ))}
      </div>

      <Field label="Email">
        <TextInput
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          placeholder="vous@exemple.ci"
        />
      </Field>

      <Field
        label="Mot de passe"
        hint={mode === 'inscription' ? '6 caractères minimum.' : undefined}
      >
        <PasswordInput
          value={password}
          onChange={setPassword}
          autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'}
        />
      </Field>

      {error !== null ? (
        <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="solid" size="lg" full disabled={busy}>
        {busy ? 'Un instant…' : mode === 'inscription' ? 'Créer mon compte' : 'Me connecter'}
      </Button>

      {googleEnabled ? (
        <Button full onClick={() => void withGoogle()}>Continuer avec Google</Button>
      ) : null}

      <p className="text-xs text-muted">
        Votre CV reste enregistré dans ce navigateur : créer un compte sert à le
        retrouver ailleurs et à télécharger le PDF.
      </p>
    </form>
  );
}

/** Les messages de GoTrue arrivent en anglais ; l'interface est en français. */
function translate(message: string): string {
  const known: Record<string, string> = {
    'Invalid login credentials': 'Email ou mot de passe incorrect.',
    'User already registered': 'Un compte existe déjà avec cet email. Choisissez « J’ai déjà un compte ».',
    'Password should be at least 6 characters.': 'Le mot de passe doit faire au moins 6 caractères.',
    'Unable to validate email address: invalid format': 'Format d’email invalide.',
    'Signups not allowed for this instance': 'Les inscriptions sont désactivées sur ce projet.',
  };
  return known[message] ?? `Connexion impossible : ${message}`;
}
