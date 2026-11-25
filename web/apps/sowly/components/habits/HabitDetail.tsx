'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { silenceDue } from '../../lib/alarm-state';
import { addDays, formatDays, type Day } from '../../lib/dates';
import { identityById } from '../../lib/identities';
import { MOMENTS } from '../../lib/model';
import {
  deleteHabit, setHabitArchived, toggleCheck, updateHabit, type HabitDraft,
} from '../../lib/mutations';
import { checkedDays, isScheduled } from '../../lib/selectors';
import { computeStreak } from '../../lib/streak';
import { useGate } from '../../lib/gate';
import { commit, nowIso, useToday } from '../../lib/store';
import { ChevronLeftIcon } from '../icons';
import { Accent, Button, Ring } from '../ui';
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
      <div className="flex flex-col gap-6 pt-2">
        <BackBar onBack={() => setEditing(null)} label="Annuler" />
        <h1 className="titre-page">Modifier l’<em className="s">habitude</em></h1>
        <div className="carte">
          <HabitForm value={editing} onChange={setEditing} identities={store.data.profile.identities} />
        </div>
        <Button
          variant="primary" size="lg" disabled={editing.action.trim() === ''}
          onClick={() => { commit((d) => updateHabit(d, habit.id, editing)); silenceDue('habit'); setEditing(null); }}
        >
          Enregistrer
        </Button>
      </div>
    );
  }

  const regularity = regularityOf(habit, checked, today);

  return (
    <div className="flex flex-col gap-[var(--pas)] pt-2">
      <BackBar href="/" label="Aujourd’hui" />

      {/* Hero : la couleur de l'app, titre à gauche, anneau à droite. */}
      <header className="carte carte--lagune hero !flex-row items-end justify-between gap-5 max-[520px]:!flex-col-reverse max-[520px]:!items-start">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="sur">
            {[identity?.short, MOMENTS.find((m) => m.id === habit.moment)?.label, formatDays(habit.days),
              habit.remindTime !== null ? `rappel ${habit.remindTime}` : null]
              .filter(Boolean).join(' · ')}
          </p>
          <h1 className="titre-hero break-words"><Accent text={habit.action} /></h1>
          <p className="accroche mt-1.5">{intention(habit)}</p>
          {archived ? <p className="etat mt-2 self-start !bg-[rgba(255,255,255,.4)]">Archivée — n’apparaît plus dans Aujourd’hui</p> : null}
        </div>
        {regularity !== null ? <Ring value={regularity} label="Régularité sur douze semaines" size={104} /> : null}
      </header>

      <dl className="grid grid-cols-3 gap-[var(--pas)]">
        <Stat label="Série" value={streak.current} unit="j" />
        <Stat label="Record" value={streak.best} unit="j" />
        <Stat label="Validés" value={streak.total} />
      </dl>

      <section className="carte">
        <div className="carte__tete">
          <h2 className="titre-carte">Douze <em className="s">semaines</em></h2>
          {regularity !== null ? <span className="mono text-muted">{regularity} % tenus</span> : null}
        </div>
        <HistoryGrid
          habit={habit}
          checked={checked}
          today={today}
          onToggle={(day) => commit((d) => toggleCheck(d, habit.id, day, today, nowIso()))}
        />
        <p className="text-[12.5px] text-muted">Touche un jour passé pour le valider ou l’annuler. Un jour manqué reste une case vide, sans reproche.</p>
      </section>

      {habit.why !== '' ? (
        <section className="carte carte--citron">
          <p className="sur">Pourquoi c’est important</p>
          <p className="font-serif text-[22px] leading-[1.3] whitespace-pre-line">{habit.why}</p>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setEditing({
          action: habit.action, moment: habit.moment, cue: habit.cue, place: habit.place,
          identity: habit.identity, why: habit.why, days: habit.days, remindTime: habit.remindTime,
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
          {confirmDelete ? 'Supprimer pour de bon, historique compris ?' : 'Supprimer'}
        </Button>
      </div>
      {!archived ? (
        <p className="px-1 text-[12.5px] text-muted">
          Archiver met l’habitude de côté sans rien effacer : son historique reste, et tu peux la réactiver.
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="carte !gap-1 !p-4">
      <dt className="sur">{label}</dt>
      <dd className="chiffre !text-[clamp(34px,4vw,52px)]">
        {value}{unit !== undefined ? <span className="mono ml-1 text-[15px] font-medium tracking-normal opacity-60">{unit}</span> : null}
      </dd>
    </div>
  );
}

/**
 * Part des jours prévus tenus sur les douze dernières semaines (depuis le
 * début de l'habitude si elle est plus jeune). `null` tant qu'aucun jour
 * n'est encore passé : un 0 % le premier matin serait un reproche.
 */
function regularityOf(habit: Parameters<typeof isScheduled>[0], checked: ReadonlySet<Day>, today: Day): number | null {
  let planned = 0;
  let kept = 0;
  for (let i = 0; i < 84; i++) {
    const day = addDays(today, -i);
    if (day < habit.startDay) break;
    if (!isScheduled(habit, day)) continue;
    // Aujourd'hui ne compte que s'il est déjà validé : la journée n'est pas finie.
    if (day === today && !checked.has(day)) continue;
    planned++;
    if (checked.has(day)) kept++;
  }
  return planned === 0 ? null : Math.round((kept / planned) * 100);
}

function BackBar({ href, onBack, label }: { href?: string; onBack?: () => void; label: string }) {
  const className = 'btn btn--fantome btn--petit -ml-2 self-start !pl-1.5 text-muted';
  const content = <><ChevronLeftIcon className="h-5 w-5" />{label}</>;
  return href !== undefined
    ? <Link href={href} className={className}>{content}</Link>
    : <button type="button" onClick={onBack} className={className}>{content}</button>;
}
