'use client';

import { useEffect, useRef, useState } from 'react';
import { addDays, formatRelative, isDay, type Day } from '../../lib/dates';
import { completeTask } from '../../lib/complete';
import type { Task } from '../../lib/model';
import { deleteTask, patchTask, postponeTask } from '../../lib/mutations';
import { liveLists } from '../../lib/selectors';
import { commit, getState, nowIso, useStore } from '../../lib/store';
import { useColumnAvailable } from '../../lib/sync';
import { CheckMark } from '../CheckMark';
import { CalendarIcon, ChevronRightIcon, ListIcon, NoteIcon, SunIcon, TrashIcon } from '../icons';
import { Sheet } from '../Sheet';
import { AutoTextarea, Button, Chip, Switch } from '../ui';

/**
 * Détail d'une tâche (brief §3.2), dans un panneau :
 *
 *   [case]  Titre, en entier — il passe à la ligne au lieu d'être coupé
 *           Description, facultative
 *   ─────────────────────────────
 *   Ma journée                            [interrupteur]
 *   Échéance          Aujourd'hui · Demain · Date… · Retirer
 *   Liste                                     Tâches ›
 *   ─────────────────────────────
 *   [corbeille]          Reporter à demain     Fermer
 *
 * « Fermer » et non « Terminé » : dans une app de tâches, « Terminé » se lit
 * comme « marquer la tâche faite ». Pour ça, il y a la case.
 *
 * Chaque champ s'enregistre dès qu'il change — il n'y a pas de bouton
 * « Enregistrer » à oublier ; le titre et la description, eux, à la sortie
 * du champ ou à la fermeture.
 *
 * L'échéance passe par des pastilles et un sélecteur de date caché sous
 * « Date… » : un `<input type="date">` vide s'affiche sur iPhone comme une
 * boîte vide, sans libellé ni hauteur cohérente.
 */
export function TaskEditor({ task, today, onClose }: {
  task: Task | null;
  today: Day;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const box = useRef<HTMLButtonElement>(null);
  const hasDescription = useColumnAvailable('sowly_tasks', 'description');
  // Dernière tâche ouverte, gardée pendant l'animation de fermeture : sans
  // elle, le panneau descendrait vide.
  const [shown, setShown] = useState<Task | null>(task);
  useEffect(() => {
    if (task !== null) {
      setShown(task);
      setTitle(task.title);
      setDescription(task.description);
      setConfirmDelete(false);
    }
  }, [task]);

  // Abonné au store : la case et les pastilles suivent chaque changement.
  useStore();
  const current = shown === null ? null : getState().data.tasks[shown.id] ?? null;
  const lists = liveLists(getState().data);

  const saveText = (): void => {
    if (current === null) return;
    const patch: Partial<Task> = {};
    if (title.trim() !== '' && title !== current.title) patch.title = title;
    if (description.trim() !== current.description) patch.description = description;
    if (Object.keys(patch).length > 0) commit((d) => patchTask(d, current.id, patch));
  };

  const close = (): void => { saveText(); onClose(); };
  const setDue = (dueDay: Day | null): void => {
    if (current !== null) commit((d) => patchTask(d, current.id, { dueDay }));
  };

  const tomorrow = addDays(today, 1);
  const done = current?.doneAt != null;
  const due = current?.dueDay ?? null;
  const customDue = due !== null && due !== today && due !== tomorrow;

  return (
    <Sheet open={task !== null} onClose={close} label="Détail de la tâche">
      {current !== null ? (
        <div className="flex flex-col gap-4">
          {/* ------------------------------------------------ Titre */}
          <div className="flex items-start gap-3">
            <button
              ref={box}
              type="button"
              onClick={() => completeTask(current, today, box.current)}
              aria-label={done ? 'Rouvrir la tâche' : 'Terminer la tâche'}
              aria-pressed={done}
              className="mt-0.5 -ml-1 p-1"
            >
              <CheckMark checked={done} shape="square" />
            </button>
            <AutoTextarea
              value={title}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
              onBlur={saveText}
              onKeyDown={(e) => {
                // Entrée valide le titre plutôt que d'y ajouter une ligne.
                if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
              }}
              enterKeyHint="done"
              maxLength={200}
              aria-label="Titre de la tâche"
              className={`min-w-0 flex-1 bg-transparent py-1 font-display text-[1.35rem] leading-snug font-semibold tracking-tight focus:outline-none ${
                done ? 'text-muted line-through decoration-faint' : 'text-ink'
              }`}
            />
          </div>

          {hasDescription ? (
            <label className="flex items-start gap-3 rounded-2xl bg-raised px-3.5 py-3 focus-within:ring-2 focus-within:ring-primary/40">
              <NoteIcon className="mt-0.5 h-5 w-5 shrink-0 text-faint" />
              <AutoTextarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={saveText}
                maxLength={2000}
                placeholder="Ajouter une description…"
                aria-label="Description"
                className="min-h-[3rem] min-w-0 flex-1 bg-transparent text-[15px] leading-relaxed text-ink placeholder:text-faint focus:outline-none"
              />
            </label>
          ) : null}

          {/* ------------------------------------------ Propriétés */}
          <div className="flex flex-col divide-y divide-line rounded-2xl border border-line">
            <div className="flex items-center gap-3 px-3.5 py-3">
              <SunIcon className="h-5 w-5 shrink-0 text-muted" />
              <span className="flex-1 text-[15px]">Ma journée</span>
              <Switch
                label="Dans Ma journée"
                checked={current.myDay === today}
                onChange={(on) => commit((d) => patchTask(d, current.id, { myDay: on ? today : null }))}
              />
            </div>

            <div className="flex flex-col gap-2.5 px-3.5 py-3">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 shrink-0 text-muted" />
                <span className="flex-1 text-[15px]">Échéance</span>
                <span className="text-sm text-muted">{due === null ? 'Aucune' : formatRelative(due, today)}</span>
              </div>
              <div className="flex flex-wrap gap-2 pl-8">
                <Chip active={due === today} onClick={() => setDue(due === today ? null : today)}>Aujourd’hui</Chip>
                <Chip active={due === tomorrow} onClick={() => setDue(due === tomorrow ? null : tomorrow)}>Demain</Chip>
                <label className="relative">
                  <span className="sr-only">Choisir une date</span>
                  <input
                    type="date"
                    value={due ?? ''}
                    onChange={(e) => setDue(isDay(e.target.value) ? e.target.value : null)}
                    className="absolute inset-0 opacity-0"
                  />
                  <Chip active={customDue} as="span">{customDue && due !== null ? formatRelative(due, today) : 'Date…'}</Chip>
                </label>
                {due !== null ? (
                  <button type="button" onClick={() => setDue(null)} className="px-2 text-sm font-medium text-muted hover:text-ink">
                    Retirer
                  </button>
                ) : null}
              </div>
            </div>

            <label className="relative flex items-center gap-3 px-3.5 py-3">
              <ListIcon className="h-5 w-5 shrink-0 text-muted" />
              <span className="flex-1 text-[15px]">Liste</span>
              <span className="text-sm text-muted">
                {lists.find((l) => l.id === current.listId)?.name ?? 'Tâches'}
              </span>
              <ChevronRightIcon className="h-4 w-4 text-faint" />
              {/* Le sélecteur natif, invisible par-dessus la ligne : la roue
                  d'iOS et la liste d'Android, sans en subir l'apparence. */}
              <select
                aria-label="Liste"
                value={current.listId ?? ''}
                onChange={(e) => commit((d) => patchTask(d, current.id, {
                  listId: e.target.value === '' ? null : e.target.value,
                }))}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                <option value="">Tâches</option>
                {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
          </div>

          {/* -------------------------------------------- Actions */}
          <div className="flex items-center gap-2 pt-1">
            {/* Corbeille en icône : à 390 px, trois boutons libellés ne
                tiennent pas sur une ligne. Deux touchers pour supprimer. */}
            <button
              type="button"
              onClick={() => {
                if (!confirmDelete) { setConfirmDelete(true); return; }
                commit((d) => deleteTask(d, current.id, nowIso()));
                onClose();
              }}
              aria-label={confirmDelete ? 'Confirmer la suppression' : 'Supprimer la tâche'}
              className={`inline-flex h-10 items-center gap-1.5 rounded-full text-sm font-medium text-clay-ink transition hover:bg-raised ${
                confirmDelete ? 'bg-raised px-3.5' : 'w-10 justify-center'
              }`}
            >
              <TrashIcon className="h-5 w-5" />
              {confirmDelete ? 'Supprimer ?' : null}
            </button>
            <span className="flex-1" />
            {!done && current.myDay !== tomorrow ? (
              <Button onClick={() => { saveText(); commit((d) => postponeTask(d, current.id, today)); onClose(); }}>
                Reporter à demain
              </Button>
            ) : null}
            <Button variant="primary" onClick={close}>Fermer</Button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
