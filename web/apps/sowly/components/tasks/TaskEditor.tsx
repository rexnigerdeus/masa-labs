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
import { CalendarIcon, ChevronRightIcon, ListIcon, SunIcon, TrashIcon } from '../icons';
import { Sheet, SheetBody, SheetFoot, SheetHead } from '../Sheet';
import { ReminderField } from '../ReminderField';
import { AutoTextarea, Button, Chip, openPicker, Switch } from '../ui';

/**
 * Détail d'une tâche (brief §3.2), dans un panneau :
 *
 *   [case]  Titre, en entier — il passe à la ligne au lieu d'être coupé
 *           Description, facultative
 *   ─────────────────────────────
 *   Ma journée                            [interrupteur]
 *   Échéance          Aujourd'hui · Demain · Date… · Retirer
 *   Rappel            Dans 1 h · Ce soir · Demain 8 h · Choisir…
 *   Liste                                     Tâches ›
 *   ─────────────────────────────
 *   [corbeille]          Reporter à demain     Fermer
 *
 * Structure du tiroir du hub : tête (où vit la tâche, bouton fermer),
 * corps qui défile, pied collé en bas avec les actions.
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
  const canRemind = useColumnAvailable('sowly_tasks', 'remind_at');
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

  const listLabel = current === null ? '' : lists.find((l) => l.id === current.listId)?.name ?? 'Tâches';
  const inMyDay = current?.myDay === today;

  return (
    <Sheet open={task !== null} onClose={close} label="Détail de la tâche">
      {current !== null ? (
        <>
          <SheetHead
            kicker={<>{done ? 'Faite' : 'À faire'} · {listLabel}{inMyDay ? ' · Ma journée' : ''}</>}
            onClose={close}
            closeLabel="Fermer la tâche"
          />

          <SheetBody>
            {/* ------------------------------------------------ Titre */}
            <div className="flex items-start gap-3">
              <button
                ref={box}
                type="button"
                onClick={() => completeTask(current, today, box.current)}
                aria-label={done ? 'Rouvrir la tâche' : 'Terminer la tâche'}
                aria-pressed={done}
                className="-m-1 mt-0 shrink-0 p-1"
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
                className={`display titre-tiroir min-w-0 flex-1 rounded-[10px] bg-transparent !leading-[1.15] focus:outline-none ${
                  done ? 'text-muted line-through decoration-faint' : 'text-ink'
                }`}
              />
            </div>

            {hasDescription ? (
              <label className="champ">
                <span className="flex items-baseline justify-between gap-3">
                  Description
                  {description.length > 1500 ? <span className="mono">{description.length}/2000</span> : null}
                </span>
                <AutoTextarea
                  scroll
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={saveText}
                  maxLength={2000}
                  placeholder="Détails, lien, adresse, liste de courses…"
                  aria-label="Description"
                  className="zone-longue"
                />
              </label>
            ) : null}

            {/* ------------------------------------------ Propriétés */}
            <div className="flex flex-col divide-y divide-line rounded-[16px] bg-raised">
              <div className="flex items-center gap-3 px-3.5 py-3">
                <SunIcon className="h-5 w-5 shrink-0 text-muted" />
                <span className="flex-1 text-[15px] font-medium">Ma journée</span>
                <Switch
                  label="Dans Ma journée"
                  checked={inMyDay}
                  onChange={(on) => commit((d) => patchTask(d, current.id, { myDay: on ? today : null }))}
                />
              </div>

              <div className="flex flex-col gap-2.5 px-3.5 py-3">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 shrink-0 text-muted" />
                  <span className="flex-1 text-[15px] font-medium">Échéance</span>
                  {due === null ? (
                    <span className="text-[13px] text-muted">Aucune</span>
                  ) : (
                    <span className={`date ${due < today ? 'retard' : due <= tomorrow ? 'proche' : '!bg-card'}`}>
                      {due < today ? 'En retard · ' : ''}{formatRelative(due, today)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 pl-8">
                  <Chip active={due === today} onClick={() => setDue(due === today ? null : today)}>Aujourd’hui</Chip>
                  <Chip active={due === tomorrow} onClick={() => setDue(due === tomorrow ? null : tomorrow)}>Demain</Chip>
                  <label className="relative">
                    <span className="sr-only">Choisir une date</span>
                    <input
                      type="date"
                      value={due ?? ''}
                      onClick={(e) => openPicker(e.currentTarget)}
                      onChange={(e) => setDue(isDay(e.target.value) ? e.target.value : null)}
                      className="absolute inset-0 opacity-0"
                    />
                    <Chip active={customDue} as="span">{customDue && due !== null ? formatRelative(due, today) : 'Date…'}</Chip>
                  </label>
                  {due !== null ? (
                    <button type="button" onClick={() => setDue(null)} className="puce !border-transparent text-muted">
                      Retirer
                    </button>
                  ) : null}
                </div>
              </div>

              {canRemind ? (
                <ReminderField
                  value={current.remindAt}
                  onChange={(remindAt) => commit((d) => patchTask(d, current.id, { remindAt }))}
                  today={today}
                  day={due ?? current.myDay ?? today}
                />
              ) : null}

              <label className="relative flex items-center gap-3 px-3.5 py-3">
                <ListIcon className="h-5 w-5 shrink-0 text-muted" />
                <span className="flex-1 text-[15px] font-medium">Liste</span>
                <span className="text-[13px] text-muted">{listLabel}</span>
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
          </SheetBody>

          {/* -------------------------------------------------- Pied */}
          <SheetFoot>
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
              className={`btn btn--fantome btn--danger ${confirmDelete ? '' : 'w-10 !px-0'}`}
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
          </SheetFoot>
        </>
      ) : null}
    </Sheet>
  );
}
