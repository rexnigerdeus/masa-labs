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
import { PlusIcon, SunIcon } from '../icons';
import { InstallCard } from '../pwa/InstallCard';
import { RemindersCard } from '../Reminders';
import { Ring, ScreenTitle } from '../ui';
import { HabitRow } from './HabitRow';

/**
 * Écran Aujourd'hui — l'écran le plus sensible du produit (brief §11.3),
 * en bento du hub : un hero lagune avec l'anneau d'avancement du jour, puis
 * deux cartes qui ne se mélangent jamais (brief §3.2, §8.B.1) :
 *   1. les habitudes du jour, dominantes : grandes lignes, pastilles
 *      rondes, regroupées par moment ou par identité ;
 *   2. « Ma journée », plus discrète : lignes compactes, cases carrées.
 *
 * Journée complète : le hero passe en aplat mangue (brief §8.B.4) — un état
 * visuel distinct et calme. La mangue n'apparaît nulle part ailleurs sur
 * l'écran, c'est ce qui lui garde sa valeur de récompense.
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
  const tasksLeft = tasks.filter((t) => t.doneAt === null).length;
  const dayLooped = tasks.length > 0 && tasksLeft === 0;
  // Compte ouvert sur l'appareil mais session perdue (expirée, effacée par
  // le navigateur) : les données restent là, seule la synchro attend.
  const sessionLost = sync === 'anonymous';

  const kicker = [
    formatLong(today),
    habits.total > 0 ? `${habits.done}/${habits.total} habitude${habits.total > 1 ? 's' : ''}` : null,
    tasks.length > 0 ? `${tasksLeft} tâche${tasksLeft > 1 ? 's' : ''} à faire` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-[calc(var(--pas)+8px)]">
      <ScreenTitle kicker={kicker}>
        {complete ? <>Journée <em className="s">complète</em></> : <>Arrose <em className="s">tes graines</em></>}
      </ScreenTitle>

      <div className="bento">
        {/* ------------------------------------------------------- Hero */}
        <section
          aria-label="Avancement du jour"
          className={`carte hero !flex-row items-end justify-between gap-5 ${complete ? 'carte--mangue' : 'carte--lagune'}`}
        >
          <div className="flex min-w-0 flex-col gap-3">
            <p className="sur">{complete ? 'Chaque graine a eu son eau' : 'Habitudes du jour'}</p>
            {habits.total > 0 ? (
              <p className="chiffre">
                {habits.done}<span className="opacity-60">/{habits.total}</span>
              </p>
            ) : (
              <p className="titre-carte">Sème ta <em className="s">première</em> graine</p>
            )}
            <p className="max-w-[30ch] text-[15px] opacity-85">
              {habits.total === 0
                ? 'Une habitude minuscule, que tu ne peux pas rater. Tu la coches ici chaque jour.'
                : complete
                  ? 'Tout est validé pour aujourd’hui. Reviens demain, ta série t’attend.'
                  : `Encore ${habits.total - habits.done} à valider. Touche la pastille, ta série grandit d’un jour.`}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/habitudes/nouvelle" className="btn btn--petit">
                <PlusIcon className="h-4 w-4" /> Semer une habitude
              </Link>
            </div>
          </div>
          {habits.total > 0 ? (
            <Ring value={(habits.done / habits.total) * 100} label="Avancement du jour" size={112} />
          ) : null}
        </section>

        {/* -------------------------------------------------- Habitudes */}
        <section aria-labelledby="habitudes" className="carte span-7 !gap-2 !px-0 !pb-2">
          <div className="carte__tete px-[var(--pad)]">
            <h2 id="habitudes" className="titre-section">
              Habitudes{' '}
              {habits.total > 0 ? <span className="mono text-[15px] font-medium tracking-normal text-muted">{habits.done}/{habits.total}</span> : null}
            </h2>
            {habits.total > 0 ? (
              <button
                type="button"
                onClick={() => setPrefs({ groupBy: store.prefs.groupBy === 'moment' ? 'identity' : 'moment' })}
                className="lien"
              >
                Par {store.prefs.groupBy === 'moment' ? 'identité' : 'moment'}
              </button>
            ) : null}
          </div>

          {habits.total === 0 ? (
            <p className="vide mx-[var(--pad)] mb-3">
              Aucune habitude prévue aujourd’hui.{' '}
              <Link href="/habitudes/nouvelle" className="font-semibold text-ink underline decoration-mangue decoration-[3px] underline-offset-4">
                Semer une nouvelle graine
              </Link>
            </p>
          ) : (
            <div className="flex flex-col">
              {habits.groups.map((group) => (
                <div key={group.id} className="pt-2">
                  {habits.groups.length > 1 ? <p className="sur px-[var(--pad)] pb-1">{group.label}</p> : null}
                  <ul className="liste px-[calc(var(--pad)-10px)]">
                    {group.lines.map((line) => <HabitRow key={line.habit.id} line={line} today={today} />)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ------------------------------------------------- Ma journée */}
        <section aria-labelledby="ma-journee" className="carte span-5">
          <div className="carte__tete">
            <h2 id="ma-journee" className="titre-section">
              Ma <em className="s">journée</em>
            </h2>
            <Link href="/taches?vue=ma-journee">Tout voir</Link>
          </div>

          {leftovers.length > 0 ? (
            <button
              type="button"
              onClick={() => commit((d) => bringBack(d, leftovers.map((t) => t.id), today))}
              className="btn btn--petit self-start"
            >
              Reprendre <span className="mono">{leftovers.length}</span> tâche{leftovers.length > 1 ? 's' : ''} d’avant
            </button>
          ) : null}

          {tasks.length === 0 ? (
            <p className="vide">Rien de prévu. Touche + pour ajouter une tâche à ta journée.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {/* Ma journée bouclée : la même récompense mangue que les
                  habitudes, en plus discret — une ligne, pas un bloc. */}
              <AnimatePresence initial={false}>
                {dayLooped ? (
                  <motion.li
                    key="boucle"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: [0.2, 0.9, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p role="status" className="mb-1 flex items-center gap-2.5 rounded-[14px] bg-reward px-4 py-3 text-sm font-semibold text-reward-ink">
                      <motion.span
                        initial={{ rotate: -90, scale: 0.4 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
                      >
                        <SunIcon className="h-5 w-5" />
                      </motion.span>
                      Ma journée est bouclée. Profite du reste !
                    </p>
                  </motion.li>
                ) : null}
              </AnimatePresence>
              <AnimatePresence initial={false}>
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    today={today}
                    listName={view.listName(task.listId)}
                    context="myday"
                    surface="creux"
                    onOpen={setEditing}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        {sessionLost ? (
          <aside className="carte carte--hibiscus span-6" role="status">
            <p className="sur">Session expirée</p>
            <p className="text-[15px]">
              Tes modifications sont gardées sur cet appareil. Reconnecte-toi pour les synchroniser.
            </p>
            <Link href="/connexion?reconnexion=1" className="btn btn--plein btn--petit self-start">
              Me reconnecter
            </Link>
          </aside>
        ) : null}

        {/* Les rappels n'ont de sens qu'une fois une habitude semée. */}
        {habits.total > 0 ? <RemindersCard /> : null}

        <InstallCard variant="card" />
      </div>

      <TaskEditor task={editing} today={today} onClose={() => setEditing(null)} />
    </div>
  );
}
