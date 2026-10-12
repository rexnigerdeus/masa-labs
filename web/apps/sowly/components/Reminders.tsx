'use client';

import { useEffect, useState } from 'react';
import {
  disablePush, enablePush, PushError, readReminderPrefs, saveReminderPrefs, testNotification,
  usePushState, type ReminderPrefs,
} from '../lib/push';
import { BellIcon, CloseIcon } from './icons';
import { Button, Notice, Switch } from './ui';

const ERRORS: Record<PushError['reason'], string> = {
  denied: 'Tu as refusé les notifications. Tu peux les autoriser plus tard dans les réglages du navigateur.',
  unavailable: 'Les rappels arrivent très bientôt : le serveur est en cours de mise à jour. Réessaie un peu plus tard.',
  server: 'Impossible d’activer les rappels pour le moment. Vérifie ta connexion et réessaie.',
};

/**
 * Réglages des rappels, dans la section « Rappels » des Réglages. Chaque
 * cas où ils sont impossibles a son explication plutôt qu'un bouton mort.
 */
export function RemindersSettings() {
  const state = usePushState();
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setPrefs(readReminderPrefs()), []);

  if (state === null || prefs === null) return null;

  if (state === 'unsupported') {
    return <p className="text-sm text-muted">Ce navigateur ne sait pas afficher de notifications. Essaie Chrome, ou Safari sur iPhone.</p>;
  }
  if (state === 'ios-install') {
    return (
      <p className="text-sm text-muted">
        Sur iPhone, les rappels n’arrivent qu’à une app installée : touche{' '}
        <span className="font-medium text-ink">Partager</span>, puis{' '}
        <span className="font-medium text-ink">« Sur l’écran d’accueil »</span>, et reviens ici depuis l’icône Sowly.
      </p>
    );
  }
  if (state === 'denied') {
    return (
      <p className="text-sm text-muted">
        Les notifications sont bloquées pour Sowly. Autorise-les dans les réglages de ton navigateur
        (ou de ton téléphone, si Sowly est installée), puis reviens ici.
      </p>
    );
  }

  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof PushError ? ERRORS[e.reason] : ERRORS.server);
    } finally {
      setBusy(false);
    }
  };

  if (state === 'off') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Un mot le matin pour ce qui t’attend, et un le soir s’il reste une habitude à valider.
          Jamais de reproche, jamais plus de deux par jour.
        </p>
        <Button variant="primary" className="self-start" disabled={busy} onClick={() => void run(enablePush)}>
          <BellIcon className="h-4 w-4" /> Activer les rappels
        </Button>
        {error !== null ? <Notice>{error}</Notice> : null}
      </div>
    );
  }

  const update = (patch: Partial<ReminderPrefs>): void => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    void run(() => saveReminderPrefs(next));
  };

  return (
    <div className="flex flex-col gap-3">
      <ReminderRow
        label="Le matin"
        hint="Ce qui t’attend aujourd’hui"
        enabled={prefs.morningEnabled}
        time={prefs.morningAt}
        onToggle={(morningEnabled) => update({ morningEnabled })}
        onTime={(morningAt) => update({ morningAt })}
      />
      <ReminderRow
        label="Le soir"
        hint="S’il reste une habitude à valider"
        enabled={prefs.eveningEnabled}
        time={prefs.eveningAt}
        onToggle={(eveningEnabled) => update({ eveningEnabled })}
        onTime={(eveningAt) => update({ eveningAt })}
      />
      {error !== null ? <Notice>{error}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void run(testNotification)} disabled={busy}>Envoyer un essai</Button>
        <Button variant="ghost" onClick={() => void run(disablePush)} disabled={busy}>Désactiver sur cet appareil</Button>
      </div>
    </div>
  );
}

function ReminderRow({ label, hint, enabled, time, onToggle, onTime }: {
  label: string;
  hint: string;
  enabled: boolean;
  time: string;
  onToggle: (on: boolean) => void;
  onTime: (time: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px]">{label}</span>
        <span className="text-xs text-muted">{hint}</span>
      </div>
      <input
        type="time"
        value={time}
        disabled={!enabled}
        aria-label={`Heure du rappel — ${label.toLowerCase()}`}
        onChange={(e) => { if (/^\d{2}:\d{2}$/.test(e.target.value)) onTime(e.target.value); }}
        className="rounded-xl border border-line bg-card px-2.5 py-1.5 font-display text-[15px] text-ink focus:border-primary focus:outline-none disabled:opacity-40"
      />
      <Switch label={`Rappel — ${label.toLowerCase()}`} checked={enabled} onChange={onToggle} />
    </div>
  );
}

const NUDGE_KEY = 'sowly.reminders.nudge';

/**
 * Proposition d'activer les rappels sur l'écran Aujourd'hui, une fois la
 * première habitude semée. Refermable ; revient après 30 jours. Rien si
 * c'est impossible ou déjà fait.
 */
export function RemindersCard() {
  const state = usePushState();
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    try {
      const at = Number(localStorage.getItem(NUDGE_KEY) ?? 0);
      setHidden(Date.now() - at < 30 * 86_400_000);
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden || state !== 'off') return null;
  const dismiss = (): void => {
    try { localStorage.setItem(NUDGE_KEY, String(Date.now())); } catch { /* session seulement */ }
    setHidden(true);
  };

  return (
    <aside className="card flex items-start gap-3 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-done-soft text-primary-ink">
        <BellIcon className="h-5 w-5" />
      </span>
      <div className="flex flex-1 flex-col gap-2">
        <p className="font-display text-[15px] font-semibold">Un petit rappel ?</p>
        <p className="text-sm text-muted">Le matin pour ta journée, le soir s’il reste une graine à arroser.</p>
        <Button
          variant="primary"
          className="self-start"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError(null);
            enablePush()
              .catch((e: unknown) => setError(e instanceof PushError ? ERRORS[e.reason] : ERRORS.server))
              .finally(() => setBusy(false));
          }}
        >
          Activer les rappels
        </Button>
        {error !== null ? <Notice>{error}</Notice> : null}
      </div>
      <button type="button" onClick={dismiss} aria-label="Ne plus proposer pour le moment" className="-m-1 p-1 text-faint hover:text-muted">
        <CloseIcon className="h-4 w-4" />
      </button>
    </aside>
  );
}
