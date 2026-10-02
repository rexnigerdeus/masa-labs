'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '../../lib/supabase/client';
import { phoneToEmail } from '../../lib/phone';
import { adoptAccount, syncNow } from '../../lib/sync';
import { Button, Field, Input, Notice, Segmented } from '../ui';
import { PasswordInput } from './PasswordInput';

type Mode = 'inscription' | 'connexion';

/**
 * Connexion et inscription par numéro de téléphone, comme Hive : le numéro
 * devient un pseudo-email (`lib/phone.ts`), aucun SMS n'est envoyé.
 *
 * Le compte ne sert qu'à sauvegarder et synchroniser : tout fonctionne
 * avant. À l'inscription, les graines déjà semées sur l'appareil deviennent
 * celles du compte (`adoptAccount`) ; à la connexion sur un nouvel appareil,
 * on attend la première lecture avant d'ouvrir Aujourd'hui, pour ne pas
 * renvoyer quelqu'un dans l'onboarding qu'il a déjà fait ailleurs.
 */
export function AuthForm({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    const email = phoneToEmail(phone);
    if (email === null) {
      setError('Entre un numéro ivoirien à dix chiffres, par exemple 07 00 00 00 00.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }

    setBusy(true);
    const supabase = getSupabaseClient();
    const { data, error: authError } = mode === 'inscription'
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: '' } } })
      : await supabase.auth.signInWithPassword({ email, password });

    if (authError !== null || data.user === null) {
      setError(translate(authError?.message ?? ''));
      setBusy(false);
      return;
    }

    adoptAccount(data.user.id);
    // Hors-ligne juste après la connexion : on n'attend pas, la lecture se
    // fera au retour du réseau.
    await Promise.race([syncNow(), new Promise((r) => setTimeout(r, 8000))]);
    router.replace('/');
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      <Segmented
        label="Mode"
        value={mode}
        onChange={(m) => { setMode(m); setError(null); }}
        options={[
          { id: 'inscription', label: 'Créer un compte' },
          { id: 'connexion', label: 'J’ai un compte' },
        ]}
      />

      <Field label="Numéro de téléphone">
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07 00 00 00 00"
        />
      </Field>

      <Field label="Mot de passe" hint={mode === 'inscription' ? '6 caractères minimum.' : undefined}>
        <PasswordInput
          value={password}
          autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'}
          onChange={setPassword}
        />
      </Field>

      {error !== null ? <Notice>{error}</Notice> : null}

      <Button type="submit" variant="primary" size="lg" disabled={busy}>
        {busy ? 'Un instant…' : mode === 'inscription' ? 'Créer mon compte' : 'Me connecter'}
      </Button>

      <p className="text-xs text-muted">
        Aucun SMS ne te sera envoyé : ton numéro sert d’identifiant. Le même compte ouvre aussi
        les autres apps The Everyday Co.
      </p>
    </form>
  );
}

/** Les messages de GoTrue arrivent en anglais ; l'interface est en français. */
function translate(message: string): string {
  const known: Record<string, string> = {
    'Invalid login credentials': 'Numéro ou mot de passe incorrect.',
    'User already registered': 'Un compte existe déjà avec ce numéro. Choisis « J’ai un compte ».',
    'Password should be at least 6 characters.': 'Le mot de passe doit faire au moins 6 caractères.',
    'Signups not allowed for this instance': 'Les inscriptions sont fermées pour le moment.',
  };
  if (known[message] !== undefined) return known[message];
  if (/fetch|network/i.test(message)) return 'Pas de connexion. Réessaie quand le réseau revient.';
  return 'Connexion impossible pour le moment. Réessaie dans un instant.';
}
