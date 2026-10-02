'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDays } from '../../lib/dates';
import { identityById } from '../../lib/identities';
import { MOMENTS } from '../../lib/model';
import {
  deleteHabit, setHabitArchived, toggleCheck, updateHabit, type HabitDraft,
} from '../../lib/mutations';
import { checkedDays } from '../../lib/selectors';
import { computeStreak } from '../../lib/streak';
import { useGate } from '../../lib/gate';
import { commit, nowIso, useToday } from '../../lib/store';
import { ChevronLeftIcon } from '../icons';
import { Button } from '../ui';
import { HabitForm, intention } from './HabitForm';
import { HistoryGrid } from './HistoryGrid';

/**
 * Détail d'une habitude (brief §8.C) : séries, historique, intention,
 * « pourquoi », et les actions rares — modifier, archiver, supprimer.
 *
 * Adresse `/habitude?id=…` plutôt que `/habitudes/[id]` : la page est une
 * coquille statique que le service worker garde en cache, et elle s'ouvre
 * donc hors-ligne pour n'importe quelle habitude, y compris créée
 * hors-ligne. Une route dynamique demanderait le serveur pour chaque `id`.
 */
export function HabitDetail() {
  const router = useRouter();
  const id = useSearchParams().get('id');
  const store = useGate('app');
  const today = useToday();
  const [editing, setEditing] = useState<HabitDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const habit = store !== null && id !== null ? store.data.habits[id] ?? null : null;
  const live = habit !== null && habit.deletedAt === null;

  useEffect(() => {
    if (store !== null && !live) router.replace('/');
  }, [store, live, router]);

  const checked = useMemo(
    () => (store !== null && habit !== null ? checkedDays(store.data, habit.id) : new Set<string>()),
    [store, habit],
  );

  if (store === null || habit === null || !live) return null;

  const streak = computeStreak(habit, checked, today);
  const identity = identityById(habit.identity);
  const archived = habit.archivedAt !== null;

  if (editing !== null) {
    return (
      <div className="flex flex-col gap-6 pt-4">
        <BackBar onBack={() => setEditing(null)} label="Annuler" />
        <h1 className="font-display text-[1.75rem] font-semibold tracking-tight">Modifier l’habitude</h1>
        <HabitForm value={editing} onChange={setEditing} identities={store.data.profile.identities} />
        <Button
          variant="primary" size="lg" disabled={editing.action.trim() === ''}
          onClick={() => { commit((d) => updateHabit(d, habit.id, editing)); setEditing(null); }}
        >
          Enregistrer
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pt-4">
      <BackBar href="/" label="Aujourd’hui" />

      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted">
          {[identity?.short, MOMENTS.find((m) => m.id === habit.moment)?.label, formatDays(habit.days)]
            .filter(Boolean).join(' · ')}
        </p>
        <h1 className="font-display text-[2rem] leading-tight font-semibold tracking-tight">{habit.action}</h1>
        <p className="text-[15px] text-muted">{intention(habit)}</p>
        {archived ? <p className="text-sm font-medium text-muted">Archivée — n’apparaît plus dans Aujourd’hui.</p> : null}
      </header>

      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Série" value={streak.current} />
        <Stat label="Record" value={streak.best} />
        <Stat label="Jours validés" value={streak.total} />
      </dl>

      <section className="card flex flex-col gap-3 p-4">
        <h2 className="text-sm font-semibold">Douze dernières semaines</h2>
        <HistoryGrid
          habit={habit}
          checked={checked}
          today={today}
          onToggle={(day) => commit((d) => toggleCheck(d, habit.id, day, today, nowIso()))}
        />
        <p className="text-xs text-muted">Touche un jour passé pour le valider ou l’annuler.</p>
      </section>

      {habit.why !== '' ? (
        <section className="flex flex-col gap-1 px-1">
          <h2 className="text-sm font-semibold">Pourquoi c’est important</h2>
          <p className="text-[15px] whitespace-pre-line text-muted">{habit.why}</p>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setEditing({
          action: habit.action, moment: habit.moment, cue: habit.cue, place: habit.place,
          identity: habit.identity, why: habit.why, days: habit.days,
        })}
        >
          Modifier
        </Button>
        <Button onClick={() => commit((d) => setHabitArchived(d, habit.id, !archived, nowIso()))}>
          {archived ? 'Réactiver' : 'Archiver'}
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            if (!confirmDelete) { setConfirmDelete(true); return; }
            commit((d) => deleteHabit(d, habit.id, nowIso()));
            router.replace('/');
          }}
        >
          {confirmDelete ? 'Supprimer définitivement, historique compris' : 'Supprimer'}
        </Button>
      </div>
      {!archived ? (
        <p className="px-1 text-xs text-muted">
          Archiver met l’habitude de côté sans rien effacer : son historique reste, et tu peux la réactiver.
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card flex flex-col gap-0.5 px-3 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-display text-2xl font-semibold">{value}</dd>
    </div>
  );
}

function BackBar({ href, onBack, label }: { href?: string; onBack?: () => void; label: string }) {
  const className = '-ml-2 inline-flex items-center gap-1 self-start rounded-full py-1.5 pr-3 pl-1.5 text-sm font-medium text-muted hover:text-ink';
  const content = <><ChevronLeftIcon className="h-5 w-5" />{label}</>;
  return href !== undefined
    ? <Link href={href} className={className}>{content}</Link>
    : <button type="button" onClick={onBack} className={className}>{content}</button>;
}
