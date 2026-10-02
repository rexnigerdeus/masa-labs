'use client';

import { useEffect, useState } from 'react';
import { addDays, isDay, type Day } from '../../lib/dates';
import type { Task } from '../../lib/model';
import { deleteTask, patchTask, postponeTask } from '../../lib/mutations';
import { liveLists } from '../../lib/selectors';
import { commit, getState, nowIso } from '../../lib/store';
import { Sheet } from '../Sheet';
import { Button, Field, Input } from '../ui';

/**
 * Détail d'une tâche, dans un panneau : titre, échéance, liste, « Ma
 * journée ». Rien de plus (brief §3.2). Chaque champ s'enregistre dès
 * qu'il change — il n'y a pas de bouton « Enregistrer » à oublier.
 */
export function TaskEditor({ task, today, onClose }: {
  task: Task | null;
  today: Day;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  // Dernière tâche ouverte, gardée pendant l'animation de fermeture : sans
  // elle, le panneau descendrait vide.
  const [shown, setShown] = useState<Task | null>(task);
  useEffect(() => {
    if (task !== null) {
      setShown(task);
      setTitle(task.title);
    }
  }, [task]);

  // Toujours la version à jour : la tâche a pu changer depuis l'ouverture.
  const current = shown === null ? null : getState().data.tasks[shown.id] ?? null;
  const lists = liveLists(getState().data);

  const saveTitle = (): void => {
    if (current !== null && title.trim() !== '' && title !== current.title) {
      commit((d) => patchTask(d, current.id, { title }));
    }
  };

  return (
    <Sheet open={task !== null} onClose={() => { saveTitle(); onClose(); }} label="Modifier la tâche">
      {current !== null ? (
        <div className="flex flex-col gap-4">
          <Field label="Tâche">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              maxLength={200}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Échéance">
              <Input
                type="date"
                value={current.dueDay ?? ''}
                onChange={(e) => commit((d) => patchTask(d, current.id, {
                  dueDay: isDay(e.target.value) ? e.target.value : null,
                }))}
              />
            </Field>
            <Field label="Liste">
              <select
                value={current.listId ?? ''}
                onChange={(e) => commit((d) => patchTask(d, current.id, {
                  listId: e.target.value === '' ? null : e.target.value,
                }))}
                className="w-full rounded-xl border border-line bg-card px-3 py-2.5 text-[15px] text-ink focus:border-primary focus:outline-none"
              >
                <option value="">Tâches</option>
                {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => commit((d) => patchTask(d, current.id, {
                myDay: current.myDay === today ? null : today,
              }))}
              aria-pressed={current.myDay === today}
            >
              {current.myDay === today ? 'Retirer de Ma journée' : 'Ajouter à Ma journée'}
            </Button>
            {current.doneAt === null && current.myDay !== addDays(today, 1) ? (
              <Button onClick={() => { commit((d) => postponeTask(d, current.id, today)); onClose(); }}>
                Reporter à demain
              </Button>
            ) : null}
          </div>

          <div className="flex justify-between border-t border-line pt-3">
            <Button
              variant="danger"
              onClick={() => { commit((d) => deleteTask(d, current.id, nowIso())); onClose(); }}
            >
              Supprimer
            </Button>
            <Button variant="primary" onClick={() => { saveTitle(); onClose(); }}>
              Terminé
            </Button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
