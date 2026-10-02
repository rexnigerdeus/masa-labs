'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IDENTITIES, MAX_IDENTITIES } from '../lib/identities';
import { setIdentities } from '../lib/mutations';
import { archivedHabits } from '../lib/selectors';
import { useAccount } from '../lib/session';
import { commit, setPrefs, useStore } from '../lib/store';
import { pendingCount, signOut, syncNow, useSyncStatus } from '../lib/sync';
import { applyTheme, readThemeChoice, type ThemeChoice } from '../lib/theme';
import { Button, ScreenTitle, Segmented } from './ui';

const STATUS_LABEL = {
  idle: 'À jour',
  syncing: 'Synchronisation…',
  offline: 'Hors connexion — tout est gardé sur l’appareil',
  anonymous: 'Sans compte',
  error: 'Échec de la dernière synchronisation, nouvel essai automatique',
} as const;

/**
 * Réglages (brief §8.C) : compte, apparence, identités, habitudes archivées,
 * export. Les notifications arrivent au lot 2 avec le Web Push.
 */
export function SettingsScreen() {
  const router = useRouter();
  const store = useStore();
  const account = useAccount();
  const sync = useSyncStatus();
  const [theme, setTheme] = useState<ThemeChoice>('system');
  const [confirmOut, setConfirmOut] = useState(false);

  useEffect(() => setTheme(readThemeChoice()), []);

  if (store === null) return null;
  const { data, prefs, meta } = store;
  const pending = pendingCount();
  const archived = archivedHabits(data);

  const exportData = (): void => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sowly-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleIdentity = (id: string): void => {
    const current = data.profile.identities;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    if (next.length === 0 || next.length > MAX_IDENTITIES) return;
    commit((d) => setIdentities(d, next));
  };

  return (
    <div className="flex flex-col gap-6">
      <ScreenTitle>Réglages</ScreenTitle>

      <Section title="Compte">
        {account === undefined ? null : account === null ? (
          <div className="flex flex-col gap-3">
            <p className="text-[15px] text-muted">
              Tes habitudes et tes tâches vivent sur cet appareil. Un compte les sauvegarde et les
              synchronise entre ton téléphone et ton ordinateur.
            </p>
            <Link
              href="/connexion"
              className="inline-flex h-10 items-center self-start rounded-full bg-primary px-4 text-sm font-medium text-on-primary hover:brightness-110"
            >
              Créer un compte ou se connecter
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[15px]">
              Connecté avec le <span className="font-medium">{account.phone}</span>
            </p>
            <p className="text-sm text-muted">
              {STATUS_LABEL[sync]}
              {pending > 0 && sync !== 'syncing' ? ` · ${pending} modification${pending > 1 ? 's' : ''} en attente` : ''}
              {meta.lastSyncAt !== null && sync === 'idle'
                ? ` · ${new Date(meta.lastSyncAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void syncNow()}>Synchroniser</Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (pending > 0 && !confirmOut) { setConfirmOut(true); return; }
                  await signOut();
                  router.replace('/bienvenue');
                }}
              >
                {confirmOut ? 'Se déconnecter quand même' : 'Se déconnecter'}
              </Button>
            </div>
            {confirmOut ? (
              <p className="text-sm text-clay-ink">
                {pending} modification{pending > 1 ? 's' : ''} n’{pending > 1 ? 'ont' : 'a'} pas encore
                été envoyée{pending > 1 ? 's' : ''}. Se déconnecter efface les données de cet appareil :
                elles seraient perdues.
              </p>
            ) : (
              <p className="text-xs text-muted">Se déconnecter efface les données de cet appareil ; elles restent sur ton compte.</p>
            )}
          </div>
        )}
      </Section>

      <Section title="Apparence">
        <Segmented
          label="Thème"
          value={theme}
          onChange={(t) => { setTheme(t); applyTheme(t); }}
          options={[
            { id: 'system', label: 'Système' },
            { id: 'light', label: 'Clair' },
            { id: 'dark', label: 'Sombre' },
          ]}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">Regrouper les habitudes du jour par</span>
          <Segmented
            label="Regroupement"
            value={prefs.groupBy}
            onChange={(groupBy) => setPrefs({ groupBy })}
            options={[{ id: 'moment', label: 'Moment' }, { id: 'identity', label: 'Identité' }]}
          />
        </div>
      </Section>

      <Section title="Qui je deviens">
        <p className="text-sm text-muted">Jusqu’à {MAX_IDENTITIES} identités.</p>
        <div className="flex flex-wrap gap-2">
          {IDENTITIES.map((i) => {
            const on = data.profile.identities.includes(i.id);
            return (
              <button
                key={i.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleIdentity(i.id)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  on ? 'border-primary bg-done-soft text-primary-ink' : 'border-line text-muted hover:text-ink'
                }`}
              >
                {i.label}
              </button>
            );
          })}
        </div>
      </Section>

      {archived.length > 0 ? (
        <Section title="Habitudes archivées">
          <ul className="flex flex-col divide-y divide-line">
            {archived.map((h) => (
              <li key={h.id}>
                <Link href={`/habitude?id=${h.id}`} className="block py-2.5 text-[15px] hover:text-primary-ink">
                  {h.action}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Mes données">
        <p className="text-sm text-muted">Toutes tes habitudes, validations et tâches, dans un fichier JSON.</p>
        <Button onClick={exportData} className="self-start">Exporter mes données</Button>
      </Section>

      <p className="px-1 text-xs text-faint">Sowly — Graines d’Habitudes · The Everyday Co.</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card flex flex-col gap-3 p-4">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
