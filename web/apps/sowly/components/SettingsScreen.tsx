'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IDENTITIES, MAX_IDENTITIES } from '../lib/identities';
import { setIdentities } from '../lib/mutations';
import { archivedHabits } from '../lib/selectors';
import { useAccount } from '../lib/session';
import { useGate } from '../lib/gate';
import { commit, setPrefs } from '../lib/store';
import { pendingCount, signOut, syncNow, useColumnAvailable, useSyncStatus } from '../lib/sync';
import { useInstallPrompt } from '@everyday/pwa';
import { applyTheme, PALETTES, setAppearance, type Palette } from '../lib/theme';
import { InstallCard } from './pwa/InstallCard';
import { PrayerSettings } from './PrayerSettings';
import { RemindersSettings } from './Reminders';
import { useAppearance, useThemeChoice } from './ThemeToggle';
import { Button, ScreenTitle, Segmented, Switch } from './ui';
import { play, haptic, readFeedbackPrefs, writeFeedbackPrefs, type FeedbackPrefs } from '../lib/feedback';

const STATUS_LABEL = {
  idle: 'À jour',
  syncing: 'Synchronisation…',
  offline: 'Hors connexion — tout est gardé sur l’appareil',
  anonymous: 'Session expirée',
  error: 'Serveur injoignable, nouvel essai automatique. Tout est gardé sur l’appareil',
} as const;

const PALETTE_LABEL: Record<Palette, string> = { wax: 'Wax', sorbet: 'Sorbet', lagune: 'Lagune', neon: 'Néon' };

/**
 * Personnaliser (brief §8.C, et terme commun aux apps de la maison) :
 * compte, apparence — mode, palette, densité, titres, comme dans le hub —,
 * rappels, sons et vibrations, identités, habitudes archivées, export.
 * Un bento de cartes, deux par ligne sur ordinateur.
 */
export function SettingsScreen() {
  const router = useRouter();
  const store = useGate('app');
  const account = useAccount();
  const sync = useSyncStatus();
  const installState = useInstallPrompt().state;
  const theme = useThemeChoice();
  const appearance = useAppearance();
  const prayerAvailable = useColumnAvailable('sowly_profiles', 'prayer_hours');
  const [confirmOut, setConfirmOut] = useState(false);
  // Lu après l'hydratation : le serveur ne connaît pas le stockage local.
  const [feedback, setFeedback] = useState<FeedbackPrefs | null>(null);
  useEffect(() => setFeedback(readFeedbackPrefs()), []);

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
    <div className="flex flex-col gap-[calc(var(--pas)+8px)]">
      <ScreenTitle kicker={`Personnaliser · ${data.profile.identities.length} identité${data.profile.identities.length > 1 ? 's' : ''} · ${archived.length} archivée${archived.length > 1 ? 's' : ''}`}>
        Sowly, <em className="s">à ta façon</em>
      </ScreenTitle>

      <div className="bento">

      <Section title="Compte">
        {account === undefined ? (
          sync === 'error' || sync === 'offline' ? (
            <p className="text-[15px] text-muted">{STATUS_LABEL[sync]}</p>
          ) : null
        ) : account === null ? (
          <div className="flex flex-col gap-3">
            <p className="text-[15px] text-muted">
              Ta session a expiré. Tes habitudes et tes tâches sont toujours sur cet appareil ;
              reconnecte-toi pour reprendre la synchronisation.
            </p>
            <Link href="/connexion?reconnexion=1" className="btn btn--plein self-start">
              Me reconnecter
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[15px]">
              Connecté avec le <span className="mono text-[15px]">{account.phone}</span>
            </p>
            <p className={`etat self-start !whitespace-normal ${sync === 'idle' ? 'etat--ok' : sync === 'error' || sync === 'anonymous' ? 'etat--urgent' : sync === 'offline' ? 'etat--chaud' : 'etat--neutre'}`}>
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
              <p className="text-sm font-medium text-urgent">
                {pending} modification{pending > 1 ? 's' : ''} n’{pending > 1 ? 'ont' : 'a'} pas encore
                été envoyée{pending > 1 ? 's' : ''}. Se déconnecter efface les données de cet appareil :
                elles seraient perdues.
              </p>
            ) : (
              <p className="text-[12.5px] text-muted">Se déconnecter efface les données de cet appareil ; elles restent sur ton compte.</p>
            )}
          </div>
        )}
      </Section>

      {installState === 'available' || installState === 'ios' ? (
        <Section title="Application">
          <InstallCard variant="settings" />
        </Section>
      ) : null}

      <Section title="Apparence" wide>
        <Labeled label="Mode">
          <Segmented
            label="Mode"
            value={theme}
            onChange={applyTheme}
            options={[
              { id: 'system', label: 'Système' },
              { id: 'light', label: 'Clair' },
              { id: 'dark', label: 'Sombre' },
            ]}
          />
        </Labeled>
        <Labeled label="Thème">
          <div role="radiogroup" aria-label="Thème" className="nuancier">
            {PALETTES.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={appearance.palette === p}
                onClick={() => setAppearance({ palette: p })}
                className="nuance"
              >
                {/* L'aperçu porte sa propre palette : aucune couleur recopiée ici. */}
                <span aria-hidden data-theme={p}>
                  <i className="bg-mangue" /><i className="bg-hibiscus" /><i className="bg-lagune" />
                </span>
                {PALETTE_LABEL[p]}
              </button>
            ))}
          </div>
        </Labeled>
        <div className="grid gap-3 sm:grid-cols-2">
          <Labeled label="Densité">
            <Segmented
              label="Densité"
              value={appearance.densite}
              onChange={(densite) => setAppearance({ densite })}
              options={[{ id: 'aeree', label: 'Aérée' }, { id: 'compacte', label: 'Compacte' }]}
            />
          </Labeled>
          <Labeled label="Titres">
            <Segmented
              label="Police des titres"
              value={appearance.titres}
              onChange={(titres) => setAppearance({ titres })}
              options={[{ id: 'bricolage', label: 'Bricolage' }, { id: 'serif', label: 'Instrument' }]}
            />
          </Labeled>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-muted">Regrouper les habitudes du jour par</span>
          <Segmented
            label="Regroupement"
            value={prefs.groupBy}
            onChange={(groupBy) => setPrefs({ groupBy })}
            options={[{ id: 'moment', label: 'Moment' }, { id: 'identity', label: 'Identité' }]}
          />
        </div>
      </Section>

      <Section title="Rappels">
        <RemindersSettings />
      </Section>

      {prayerAvailable ? (
        <Section title="Heures de prière">
          <PrayerSettings hours={data.profile.prayerHours} />
        </Section>
      ) : null}

      {feedback !== null ? (
        <Section title="Sons et vibrations">
          <p className="text-sm text-muted">
            Quand tu valides une habitude ou termines une tâche, le son suit le mode silencieux du téléphone. La sonnerie des rappels, elle, cherche à s’entendre.
          </p>
          <SettingRow label="Sons">
            <Switch
              label="Sons"
              checked={feedback.sound}
              onChange={(sound) => {
                const next = { ...feedback, sound };
                writeFeedbackPrefs(next);
                setFeedback(next);
                if (sound) play('task');
              }}
            />
          </SettingRow>
          <SettingRow label="Sonnerie des rappels">
            <Switch
              label="Sonnerie des rappels"
              checked={feedback.alarm}
              onChange={(alarm) => {
                const next = { ...feedback, alarm };
                writeFeedbackPrefs(next);
                setFeedback(next);
              }}
            />
          </SettingRow>
          <SettingRow label="Vibrations">
            <Switch
              label="Vibrations"
              checked={feedback.haptics}
              onChange={(haptics) => {
                const next = { ...feedback, haptics };
                writeFeedbackPrefs(next);
                setFeedback(next);
                if (haptics) haptic('task');
              }}
            />
          </SettingRow>
        </Section>
      ) : null}

      <Section title="Qui je deviens">
        <p className="text-sm text-muted">Jusqu’à <span className="mono">{MAX_IDENTITIES}</span> identités. Chaque habitude en est une preuve.</p>
        <div className="flex flex-wrap gap-1.5">
          {IDENTITIES.map((i) => {
            const on = data.profile.identities.includes(i.id);
            return (
              <button
                key={i.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleIdentity(i.id)}
                className="puce"
              >
                {i.label}
              </button>
            );
          })}
        </div>
      </Section>

      {archived.length > 0 ? (
        <Section title="Habitudes archivées">
          <ul className="liste -mx-2.5">
            {archived.map((h) => (
              <li key={h.id}>
                <Link href={`/habitude?id=${h.id}`} className="block rounded-[12px] px-2.5 py-2 text-[15px] font-semibold transition-colors hover:bg-line">
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

      </div>

      <p className="px-1 text-[12.5px] text-muted">
        Sowly — <em className="s text-[15px]">Graines d’Habitudes</em> · The Everyday Co.
      </p>
    </div>
  );
}

function Section({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={`carte reglage ${wide ? '' : 'span-6'}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      {children}
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[15px]">{label}</span>
      {children}
    </div>
  );
}
