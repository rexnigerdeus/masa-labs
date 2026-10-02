'use client';

import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';
import { formatRelative, type Day } from '../../lib/dates';
import type { Task } from '../../lib/model';
import { postponeTask, toggleMyDay, toggleTask } from '../../lib/mutations';
import { isOverdue } from '../../lib/selectors';
import { commit, nowIso } from '../../lib/store';
import { CheckMark, tick } from '../CheckMark';
import { CalendarIcon, SunIcon } from '../icons';

const SWIPE = 84;

/**
 * Une tâche : case carrée, titre, échéance. Pensée pour le pouce :
 *   - glisser vers la droite → faite ;
 *   - glisser vers la gauche → reportée à demain (dans « Ma journée »
 *     seulement, là où « demain » a un sens — brief §9).
 * Chaque geste a son bouton équivalent : la case, et « Demain » dans
 * l'éditeur. Le glissement est un raccourci, jamais le seul chemin.
 *
 * `layout` : quand la tâche change de place (faite → en bas de liste,
 * reportée → sortie de la vue), Motion anime le déplacement au lieu de la
 * faire sauter.
 */
export function TaskRow({ task, today, listName, context, onOpen, handle, nested = false }: {
  task: Task;
  today: Day;
  listName?: string | null;
  context: 'myday' | 'list';
  onOpen: (task: Task) => void;
  /** Poignée de réordonnancement, quand la liste le permet. */
  handle?: React.ReactNode;
  /** Déjà dans un `<li>` (élément de `Reorder`) : on rend un simple bloc. */
  nested?: boolean;
}) {
  const x = useMotionValue(0);
  const doneHint = useTransform(x, [0, SWIPE], [0, 1]);
  const laterHint = useTransform(x, [-SWIPE, 0], [1, 0]);
  const done = task.doneAt !== null;
  const canPostpone = context === 'myday' && !done;

  const onDragEnd = (_: unknown, info: PanInfo): void => {
    if (info.offset.x > SWIPE) {
      tick();
      commit((d) => toggleTask(d, task.id, nowIso()));
    } else if (info.offset.x < -SWIPE && canPostpone) {
      commit((d) => postponeTask(d, task.id, today));
    }
  };

  const overdue = isOverdue(task, today);
  const meta: React.ReactNode[] = [];
  if (task.dueDay !== null) {
    meta.push(
      <span key="e" className={`inline-flex items-center gap-1 ${overdue ? 'text-clay-ink' : ''}`}>
        <CalendarIcon className="h-3.5 w-3.5" />
        {formatRelative(task.dueDay, today)}
      </span>,
    );
  }
  if (listName !== undefined && listName !== null) meta.push(<span key="l">{listName}</span>);

  const Root = nested ? motion.div : motion.li;
  return (
    <Root
      layout={nested ? undefined : 'position'}
      initial={nested ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.18 } }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Ce que le glissement va faire, révélé sous la ligne. */}
      <motion.div aria-hidden style={{ opacity: doneHint }} className="absolute inset-0 flex items-center bg-done-soft pl-5 text-sm font-medium text-primary-ink">
        {done ? 'À refaire' : 'Faite'}
      </motion.div>
      {canPostpone ? (
        <motion.div aria-hidden style={{ opacity: laterHint }} className="absolute inset-0 flex items-center justify-end bg-raised pr-5 text-sm font-medium text-muted">
          Demain →
        </motion.div>
      ) : null}

      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: canPostpone ? 0.5 : 0.05, right: 0.5 }}
        onDragEnd={onDragEnd}
        className="relative flex items-center gap-3 bg-card px-3 py-2.5"
      >
        {handle}
        <button
          type="button"
          onClick={() => {
            if (!done) tick();
            commit((d) => toggleTask(d, task.id, nowIso()));
          }}
          aria-label={done ? `Rouvrir « ${task.title} »` : `Terminer « ${task.title} »`}
          aria-pressed={done}
          className="-m-2 p-2"
        >
          <CheckMark checked={done} shape="square" size="sm" />
        </button>

        <button
          type="button"
          onClick={() => onOpen(task)}
          className="flex min-w-0 flex-1 flex-col items-start text-left"
        >
          <span className={`w-full truncate text-[15px] ${done ? 'text-muted line-through decoration-faint' : 'text-ink'}`}>
            {task.title}
          </span>
          {meta.length > 0 ? (
            <span className="flex flex-wrap gap-x-3 text-xs text-muted">{meta}</span>
          ) : null}
        </button>

        {context === 'list' && !done ? (
          <button
            type="button"
            onClick={() => commit((d) => toggleMyDay(d, task.id, today))}
            aria-label={task.myDay === today ? 'Retirer de Ma journée' : 'Ajouter à Ma journée'}
            aria-pressed={task.myDay === today}
            className={`-m-1 rounded-full p-1.5 ${task.myDay === today ? 'text-primary-ink' : 'text-faint hover:text-muted'}`}
          >
            <SunIcon className="h-5 w-5" />
          </button>
        ) : null}
      </motion.div>
    </Root>
  );
}
