'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { addDays, formatRelative, isDay } from '../../lib/dates';
import { createTask } from '../../lib/mutations';
import { liveLists } from '../../lib/selectors';
import { commit, getState, newId, today as getToday } from '../../lib/store';
import { Sheet, SheetBody, SheetHead } from '../Sheet';
import { BellIcon, CalendarIcon, SunIcon } from '../icons';
import { nextHour, stampOf } from '../../lib/clock';
import { useColumnAvailable } from '../../lib/sync';
import { ReminderField } from '../ReminderField';
import { Button, Chip, openPicker } from '../ui';

export interface QuickAddHandle {
  /** À appeler dans le gestionnaire du toucher, pour que le clavier s'ouvre sur iOS. */
  open: (defaults: { listId: string | null; myDay: boolean }) => void;
}

/**
 * Ajout rapide d'une tâche, depuis n'importe quel écran (brief §3.2, §8.B.3).
 *
 * Objectif « ouverture en moins d'une seconde, clavier compris ». Sur iOS,
 * le clavier n'apparaît que si le champ reçoit le focus *dans* le
 * gestionnaire du toucher — un `autoFocus` après une animation arrive trop
 * tard. Le panneau reste donc monté, et `open()` donne le focus de façon
 * synchrone avant même de lancer l'animation.
 *
 * Après un ajout, le panneau reste ouvert et le champ se vide : on ajoute
 * rarement une seule tâche.
 */
export const QuickAdd = forwardRef<QuickAddHandle>(function QuickAdd(_, handle) {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [listId, setListId] = useState<string | null>(null);
  const [myDay, setMyDay] = useState(false);
  const [dueDay, setDueDay] = useState<string | null>(null);
  const [remindAt, setRemindAt] = useState<string | null>(null);
  const [added, setAdded] = useState(0);
  const canRemind = useColumnAvailable('sowly_tasks', 'remind_at');

  useImperativeHandle(handle, () => ({
    open(defaults) {
      // `inert` retiré à la main avant le focus : React ne l'enlèvera qu'au
      // prochain rendu, après la fin du geste.
      if (panelRef.current !== null) panelRef.current.inert = false;
      inputRef.current?.focus({ preventScroll: true });
      setListId(defaults.listId);
      setMyDay(defaults.myDay);
      setDueDay(null);
      setRemindAt(null);
      setAdded(0);
      setOpen(true);
    },
  }), []);

  const close = (): void => {
    inputRef.current?.blur();
    setOpen(false);
    setTitle('');
  };

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (title.trim() === '') return;
    const today = getToday();
    commit((data) => createTask(data, {
      title, listId, myDay: myDay ? today : null, dueDay, remindAt,
    }, newId()));
    setTitle('');
    // Le rappel vaut pour la tâche ajoutée, pas pour la suivante.
    setRemindAt(null);
    setAdded((n) => n + 1);
  };

  const lists = isOpen ? liveLists(getState().data) : [];
  const today = getToday();

  return (
    <Sheet open={isOpen} onClose={close} label="Ajouter une tâche" keepMounted panelRef={panelRef}>
      <SheetHead
        kicker={<>Nouvelle tâche · {listId === null ? 'Tâches' : lists.find((l) => l.id === listId)?.name ?? 'Tâches'}{myDay ? ' · Ma journée' : ''}</>}
        title={<>Ajouter une <em className="s">tâche</em></>}
        onClose={close}
      />
      <SheetBody>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label className="saisie flex !min-h-12 min-w-0 flex-1 items-center gap-2.5 !py-0">
          <span aria-hidden className="h-5 w-5 shrink-0 rounded-[7px] border-2 border-[var(--doux)]" />
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ajouter une tâche"
            aria-label="Titre de la tâche"
            enterKeyHint="done"
            maxLength={200}
            className="h-12 min-w-0 flex-1 bg-transparent text-[17px] text-ink focus:outline-none"
          />
          </label>
          <Button type="submit" variant="primary" size="lg" disabled={title.trim() === ''}>
            Ajouter
          </Button>
        </div>

        <div className="-mx-1 flex flex-wrap items-center gap-2 px-1 pb-1">
          <Chip active={myDay} onClick={() => setMyDay(!myDay)}>
            <SunIcon className="h-4 w-4" /> Ma journée
          </Chip>
          <Chip active={dueDay === today} onClick={() => setDueDay(dueDay === today ? null : today)}>
            <CalendarIcon className="h-4 w-4" /> Aujourd’hui
          </Chip>
          <Chip
            active={dueDay === addDays(today, 1)}
            onClick={() => setDueDay(dueDay === addDays(today, 1) ? null : addDays(today, 1))}
          >
            Demain
          </Chip>
          <label className="relative">
            <span className="sr-only">Autre échéance</span>
            <input
              type="date"
              min={today}
              value={dueDay ?? ''}
              onClick={(e) => openPicker(e.currentTarget)}
              onChange={(e) => setDueDay(isDay(e.target.value) ? e.target.value : null)}
              className="absolute inset-0 opacity-0"
            />
            <Chip active={dueDay !== null && dueDay > addDays(today, 1)} as="span">
              {dueDay !== null && dueDay > addDays(today, 1) ? formatRelative(dueDay, today) : 'Date…'}
            </Chip>
          </label>
        </div>

        {canRemind ? (
          remindAt === null ? (
            <div className="flex">
              <Chip active={false} onClick={() => setRemindAt(dueDay !== null && dueDay > today ? `${dueDay}T08:00` : nextHour(stampOf()))}>
                <BellIcon className="h-4 w-4" /> Ajouter un rappel
              </Chip>
            </div>
          ) : (
            <div className="rounded-[16px] bg-raised">
              <ReminderField value={remindAt} onChange={setRemindAt} today={today} day={dueDay ?? today} />
            </div>
          )
        ) : null}

        {lists.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Liste">
            {[{ id: null, name: 'Tâches' }, ...lists].map((l) => (
              <Chip key={l.id ?? 'defaut'} active={listId === l.id} onClick={() => setListId(l.id)} radio>
                {l.name}
              </Chip>
            ))}
          </div>
        ) : null}

        <p className="min-h-5 text-[12.5px] text-muted" role="status" aria-live="polite">
          {added > 0 ? `${added} tâche${added > 1 ? 's' : ''} ajoutée${added > 1 ? 's' : ''}. Tu ${added > 1 ? 'les' : 'la'} retrouves dans ${listId === null ? 'Tâches' : lists.find((l) => l.id === listId)?.name ?? 'ta liste'}${myDay ? ' et Ma journée' : ''}.` : ''}
        </p>
      </form>
      </SheetBody>
    </Sheet>
  );
});
