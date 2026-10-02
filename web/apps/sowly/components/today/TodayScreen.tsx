'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { formatLong } from '../../lib/dates';
import type { Task } from '../../lib/model';
import { bringBack } from '../../lib/mutations';
import { leftoverTasks, liveLists, myDayTasks, todayHabits } from '../../lib/selectors';
import { useGate } from '../../lib/gate';
import { commit, setPrefs, useToday } from '../../lib/store';
import { useSyncStatus } from '../../lib/sync';
import { TaskEditor } from '../tasks/TaskEditor';
import { TaskRow } from '../tasks/TaskRow';
import { PlusIcon } from '../icons';
import { ScreenTitle, SectionTitle } from '../ui';
import { HabitRow } from './HabitRow';

/**
 * Écran Aujourd'hui — l'écran le plus sensible du produit (brief §11.3).
 *
 * Deux blocs empilés qui ne se mélangent jamais (brief §3.2, §8.B.1) :
 *   1. les habitudes du jour, en haut, dominantes : grandes lignes, pastilles
 *      rondes, regroupées par moment ou par identité ;
 *   2. « Ma journée », en dessous, plus discret : lignes compactes, cases
 *      carrées.
 *
 * Journée complète : le bloc des habitudes prend un halo ambré (brief
 * §8.B.4) — pas de personnage, pas de feu d'artifice, un état visuel
 * distinct et calme. L'ambre n'apparaît nulle part ailleurs sur l'écran,
 * c'est ce qui lui garde sa valeur de récompense.
 */
export function TodayScreen() {
  const store = useGate('app');
  const today = useToday();
  const sync = useSyncStatus();
  const [editing, setEditing] = useState<Task | null>(null);

  const view = useMemo(() => {
    if (store === null) return null;
    const { data, prefs } = store;
    const lists = new Map(liveLists(data).map((l) => [l.id, l.name]));
    return {
      habits: todayHabits(data, today, prefs.groupBy),
      tasks: myDayTasks(data, today),
      leftovers: leftoverTasks(data, today),
      listName: (id: string | null) => (id === null ? null : lists.get(id) ?? null),
    };
  }, [store, today]);

  // Rien avant la lecture du stockage local : un écran vide qui se remplit
  // une fraction de seconde plus tard ressemble à un bug.
  if (store === null || view === null) return null;

  const { habits, tasks, leftovers } = view;
  const complete = habits.total > 0 && habits.done === habits.total;
  // Compte ouvert sur l'appareil mais session perdue (expirée, effacée par
  // le navigateur) : les données restent là, seule la synchro attend.
  const sessionLost = sync === 'anonymous';

  return (
    <div className="flex flex-col gap-6">
      <ScreenTitle kicker={formatLong(today)}>Aujourd’hui</ScreenTitle>

      {/* ----------------------------------------------------- Habitudes */}
      <section aria-labelledby="habitudes" className="flex flex-col gap-3">
        <SectionTitle
          action={
            <Link href="/habitudes/nouvelle" className="inline-flex items-center gap-1 text-sm font-medium text-primary-ink">
              <PlusIcon className="h-4 w-4" /> Habitude
            </Link>
          }
        >
          <span id="habitudes">Habitudes</span>
          {habits.total > 0 ? (
            <span className="ml-2 font-display text-base font-medium text-muted">
              {habits.done}/{habits.total}
            </span>
          ) : null}
        </SectionTitle>

        {habits.total === 0 ? (
          <div className="card px-5 py-6 text-[15px] text-muted">
            Aucune habitude prévue aujourd’hui.{' '}
            <Link href="/habitudes/nouvelle" className="font-medium text-primary-ink underline-offset-2 hover:underline">
              Semer une nouvelle graine
            </Link>
          </div>
        ) : (
          <motion.div
            className="card overflow-hidden"
            initial={false}
            animate={{
              backgroundColor: complete ? 'var(--reward)' : 'var(--card)',
              borderColor: complete ? 'var(--reward-glow)' : 'var(--line)',
              // Le halo `amber-100` autour du bloc (brief §8.B.4).
              boxShadow: complete ? '0 0 0 6px var(--reward-halo)' : '0 0 0 0px var(--reward-halo)',
            }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {habits.groups.map((group, i) => (
              <div key={group.id} className={i > 0 ? 'border-t border-line' : ''}>
                {habits.groups.length > 1 ? (
                  <p className="px-4 pt-3 text-xs font-semibold tracking-wide text-muted uppercase">
                    {group.label}
                  </p>
                ) : null}
                <ul>
                  {group.lines.map((line) => <HabitRow key={line.habit.id} line={line} today={today} />)}
                </ul>
              </div>
            ))}
            <AnimatePresence>
              {complete ? (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-t border-reward-glow/40 px-4 text-sm font-medium text-reward-ink"
                >
                  <span className="block py-3">Journée complète. Chaque graine a eu son eau.</span>
                </motion.p>
              ) : null}
            </AnimatePresence>
          </motion.div>
        )}

        {habits.total > 0 ? (
          <div className="flex justify-end px-1">
            <button
              type="button"
              onClick={() => setPrefs({ groupBy: store.prefs.groupBy === 'moment' ? 'identity' : 'moment' })}
              className="text-xs font-medium text-muted hover:text-ink"
            >
              Regrouper par {store.prefs.groupBy === 'moment' ? 'identité' : 'moment'}
            </button>
          </div>
        ) : null}
      </section>

      {/* --------------------------------------------------- Ma journée */}
      <section aria-labelledby="ma-journee" className="flex flex-col gap-2">
        <SectionTitle>
          <span id="ma-journee" className="text-base">Ma journée</span>
        </SectionTitle>

        {leftovers.length > 0 ? (
          <button
            type="button"
            onClick={() => commit((d) => bringBack(d, leftovers.map((t) => t.id), today))}
            className="self-start rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
          >
            Reprendre {leftovers.length} tâche{leftovers.length > 1 ? 's' : ''} des jours précédents
          </button>
        ) : null}

        {tasks.length === 0 ? (
          <p className="px-1 text-sm text-muted">
            Rien de prévu. Touche + pour ajouter une tâche à ta journée.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  listName={view.listName(task.listId)}
                  context="myday"
                  onOpen={setEditing}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      {sessionLost ? (
        <aside className="card p-4 text-sm text-muted" role="status">
          Ta session a expiré : tes modifications sont gardées sur cet appareil.{' '}
          <Link href="/connexion?reconnexion=1" className="font-medium text-primary-ink">
            Reconnecte-toi
          </Link>{' '}
          pour les synchroniser.
        </aside>
      ) : null}

      <TaskEditor task={editing} today={today} onClose={() => setEditing(null)} />
    </div>
  );
}
