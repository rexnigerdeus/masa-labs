'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { dismiss, dismissed, PREVIEW_EVENT } from '../../lib/alarm-state';
import { alarmKey, dueAlarms, isPending, type Alarm } from '../../lib/alarms';
import { addMinutes, stampDay, stampOf, stampTime } from '../../lib/clock';
import { completeHabit, completeTask } from '../../lib/complete';
import { formatRelative } from '../../lib/dates';
import { startAlarm, stopAlarm, unlockAudio } from '../../lib/feedback';
import { patchTask, snoozeHabit } from '../../lib/mutations';
import { checkedDays } from '../../lib/selectors';
import { commit, useStore, useToday, type State } from '../../lib/store';
import { computeStreak } from '../../lib/streak';
import { hourLabel, PRAYER_HOURS, verseFor } from '../../lib/verses';
import { BellIcon } from '../icons';
import { Accent } from '../ui';

const SNOOZE_MINUTES = 10;

/**
 * L'alarme plein écran : à l'heure d'une tâche, d'une habitude ou d'une
 * prière, elle prend tout l'écran et sonne jusqu'à ce qu'on réponde (une
 * minute au plus).
 *
 * Deux chemins :
 *   - Sowly est ouverte : l'heure est vérifiée ici, toutes les 5 s ;
 *   - Sowly est fermée : la notification ouvre `/?alarme=task:<id>`, avec
 *     `action=fait` ou `action=plus-tard` pour ses deux boutons.
 *
 * Un navigateur ne peut pas réveiller un téléphone verrouillé pour prendre
 * l'écran : c'est la notification qui prévient, et l'alarme qui suit.
 */
export function AlarmHost() {
  const store = useStore();
  const today = useToday();
  const [now, setNow] = useState<string | null>(null);
  const [opened, setOpened] = useState<Alarm | null>(null);
  const [preview, setPreview] = useState<Alarm | null>(null);
  const [asked, setAsked] = useState<{ alarm: Alarm; action: string } | null>(null);

  useEffect(() => {
    const tick = (): void => setNow(stampOf());
    tick();
    const timer = window.setInterval(tick, 5000);
    document.addEventListener('visibilitychange', tick);

    const url = new URL(window.location.href);
    const [kind, id] = (url.searchParams.get('alarme') ?? '').split(':');
    if ((kind === 'task' || kind === 'habit' || kind === 'prayer') && id !== undefined) {
      const at = kind === 'prayer' ? prayerStamp(Number(id)) : stampOf();
      const alarm: Alarm = { kind, id, at };
      const action = url.searchParams.get('action');
      if (action === null) setOpened(alarm);
      else setAsked({ alarm, action });
      url.searchParams.delete('alarme');
      url.searchParams.delete('action');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
    }

    // Le son n'est accordé qu'après un geste : on le débloque au premier.
    const unlock = (): void => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    const onPreview = (e: Event): void => setPreview((e as CustomEvent<Alarm>).detail);
    window.addEventListener(PREVIEW_EVENT, onPreview);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener(PREVIEW_EVENT, onPreview);
    };
  }, []);

  const ready = store !== null && store.meta.ownerId !== null && store.data.profile.onboardedAt !== null;

  // Répondre à une occurrence répond aux autres du même élément (le rappel
  // du jour et un « dans 10 minutes » peuvent tomber ensemble).
  const close = useCallback((alarm: Alarm): void => {
    const same = store === null ? [] : dueAlarms(store.data, stampOf(), dismissed())
      .filter((a) => a.kind === alarm.kind && a.id === alarm.id);
    dismiss([alarm, ...same]);
    setOpened((o) => (o !== null && o.kind === alarm.kind && o.id === alarm.id ? null : o));
    setNow(stampOf());
    void closeNotification(alarm);
  }, [store]);

  const snooze = useCallback((alarm: Alarm): void => {
    const at = addMinutes(stampOf(), SNOOZE_MINUTES);
    if (alarm.kind === 'task') commit((d) => patchTask(d, alarm.id, { remindAt: at }));
    if (alarm.kind === 'habit') commit((d) => snoozeHabit(d, alarm.id, at));
    close(alarm);
  }, [close]);

  const done = useCallback((alarm: Alarm, state: State, origin: Element | null): void => {
    if (alarm.kind === 'task') {
      const task = state.data.tasks[alarm.id];
      if (task !== undefined && task.doneAt === null) completeTask(task, today, origin);
    } else if (alarm.kind === 'habit' && isPending(state.data, alarm, today)) {
      completeHabit(alarm.id, false, today, origin);
    }
    close(alarm);
  }, [close, today]);

  // Bouton touché sur la notification : appliqué dès que l'élément est
  // connu ici (il peut arriver avec la synchronisation).
  useEffect(() => {
    if (asked === null || !ready || store === null) return;
    const { alarm, action } = asked;
    const known = alarm.kind === 'task' ? store.data.tasks[alarm.id] : store.data.habits[alarm.id];
    if (alarm.kind !== 'prayer' && known === undefined) return;
    setAsked(null);
    if (action === 'plus-tard') snooze(alarm);
    else done(alarm, store, null);
  }, [asked, ready, store, snooze, done]);

  let queue: Alarm[] = [];
  if (ready && store !== null && now !== null) {
    queue = dueAlarms(store.data, now, dismissed());
    if (opened !== null && isPending(store.data, opened, today)) {
      queue = [opened, ...queue.filter((a) => a.kind !== opened.kind || a.id !== opened.id)];
    }
  }

  const current = preview ?? queue[0] ?? null;
  const key = current === null ? null : alarmKey(current);

  useEffect(() => {
    if (key === null) return;
    startAlarm();
    return stopAlarm;
  }, [key]);

  if (store === null) return null;
  return createPortal(
    <AnimatePresence>
      {current !== null ? (
        <AlarmScreen
          key={key}
          alarm={current}
          state={store}
          today={today}
          position={preview !== null || queue.length < 2 ? null : `1/${queue.length}`}
          preview={preview !== null}
          onDone={(origin) => { if (preview !== null) setPreview(null); else done(current, store, origin); }}
          onSnooze={() => { if (preview !== null) setPreview(null); else snooze(current); }}
          onClose={() => { if (preview !== null) setPreview(null); else close(current); }}
        />
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/** L'occurrence du jour d'une heure de prière (celle que la notification annonce). */
function prayerStamp(hour: number): string {
  return `${stampDay(stampOf())}T${String(hour).padStart(2, '0')}:00`;
}

/** Retire la notification correspondante, si elle est encore affichée. */
async function closeNotification(alarm: Alarm): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    const tag = alarm.kind === 'prayer' ? 'sowly-prayer' : `sowly-${alarm.kind}-${alarm.id}`;
    for (const n of await registration?.getNotifications({ tag }) ?? []) n.close();
  } catch {
    // Notifications indisponibles : rien à retirer.
  }
}

const TONE = { task: 'carte--mangue', habit: 'carte--lagune', prayer: 'carte--indigo' } as const;
const DONE = { task: 'C’est fait', habit: 'C’est arrosé', prayer: 'Amen, j’ai prié' } as const;

function AlarmScreen({ alarm, state, today, position, preview, onDone, onSnooze, onClose }: {
  alarm: Alarm;
  state: State;
  today: string;
  position: string | null;
  preview: boolean;
  onDone: (origin: Element | null) => void;
  onSnooze: () => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  // Rappelé par une référence stable : `onClose` change à chaque tic.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    primary.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); }
      if (e.key !== 'Tab') return;
      // Le focus reste dans l'alarme : le reste de l'app est recouvert.
      const buttons = [...(panel.current?.querySelectorAll('button') ?? [])];
      const i = buttons.findIndex((b) => b === document.activeElement);
      e.preventDefault();
      buttons[(i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, []);

  const view = describe(alarm, state, today);
  const prayer = alarm.kind === 'prayer';

  return (
    <motion.div
      ref={panel}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alarme-titre"
      className={`alarme ${TONE[alarm.kind]}`}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.32, ease: [0.2, 0.9, 0.3, 1] }}
    >
      <div className="alarme__tete">
        <span aria-hidden className="alarme__cloche"><BellIcon className="h-7 w-7" /></span>
        <p className="chiffre">{stampTime(alarm.at)}</p>
        {position !== null ? <span className="mono ml-auto opacity-70">{position}</span> : null}
      </div>

      <div className="alarme__corps">
        <p className="sur">{preview ? 'Essai · ' : ''}{view.kicker}</p>
        <h2 id="alarme-titre" className="titre-hero break-words">{view.title}</h2>
        {view.lead !== null ? <p className={prayer ? 'alarme__verset' : 'accroche'}>{view.lead}</p> : null}
        {view.note !== null ? (
          <p className={prayer ? 'mono' : 'max-w-[46ch] text-[17px] break-words whitespace-pre-line'}>{view.note}</p>
        ) : null}
      </div>

      <div className="alarme__pied">
        <button ref={primary} type="button" className="btn btn--plein btn--grand" onClick={(e) => onDone(e.currentTarget)}>
          {DONE[alarm.kind]}
        </button>
        {prayer ? null : (
          <button type="button" className="btn btn--grand" onClick={onSnooze}>
            <span>Dans <span className="mono">{SNOOZE_MINUTES}</span> minutes</span>
          </button>
        )}
        <button type="button" className="btn btn--grand" onClick={onClose}>Arrêter l’alarme</button>
      </div>
    </motion.div>
  );
}

function describe(alarm: Alarm, state: State, today: string): {
  kicker: string; title: React.ReactNode; lead: string | null; note: string | null;
} {
  if (alarm.kind === 'prayer') {
    const asked = Number(alarm.id);
    const hour = PRAYER_HOURS.find((h) => h === asked) ?? 0;
    const verse = verseFor(hour, stampDay(alarm.at));
    return {
      kicker: hourLabel(hour),
      title: <>L’heure de la <em className="s">prière</em></>,
      lead: `« ${verse.text} »`,
      note: `${verse.ref} (LSG)`,
    };
  }
  if (alarm.kind === 'habit') {
    const h = state.data.habits[alarm.id];
    if (h === undefined) return { kicker: 'C’est l’heure', title: 'Ton habitude', lead: null, note: null };
    const streak = computeStreak(h, checkedDays(state.data, h.id), today).current;
    return {
      kicker: `C’est l’heure de ta graine${streak >= 2 ? ` · ${streak} jours d’affilée` : ''}`,
      title: <Accent text={h.action} />,
      lead: [h.cue, h.place].filter((s) => s !== '').join(', ') || null,
      note: h.why !== '' ? h.why : null,
    };
  }
  const t = state.data.tasks[alarm.id];
  if (t === undefined) return { kicker: 'C’est l’heure', title: 'Ta tâche', lead: null, note: null };
  const list = t.listId === null ? 'Tâches' : state.data.lists[t.listId]?.name ?? 'Tâches';
  return {
    kicker: `C’est l’heure · ${list}`,
    title: <Accent text={t.title} />,
    lead: t.dueDay !== null ? `Échéance : ${formatRelative(t.dueDay, today).toLowerCase()}` : null,
    note: t.description !== '' ? t.description : null,
  };
}
