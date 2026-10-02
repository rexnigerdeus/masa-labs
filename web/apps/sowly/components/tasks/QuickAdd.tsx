'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { addDays, formatRelative, isDay } from '../../lib/dates';
import { createTask } from '../../lib/mutations';
import { liveLists } from '../../lib/selectors';
import { commit, getState, newId, today as getToday } from '../../lib/store';
import { Sheet } from '../Sheet';
import { CalendarIcon, SunIcon } from '../icons';
import { Button } from '../ui';

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
  const [added, setAdded] = useState(0);

  useImperativeHandle(handle, () => ({
    open(defaults) {
      // `inert` retiré à la main avant le focus : React ne l'enlèvera qu'au
      // prochain rendu, après la fin du geste.
      if (panelRef.current !== null) panelRef.current.inert = false;
      inputRef.current?.focus({ preventScroll: true });
      setListId(defaults.listId);
      setMyDay(defaults.myDay);
      setDueDay(null);
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
      title, listId, myDay: myDay ? today : null, dueDay,
    }, newId()));
    setTitle('');
    setAdded((n) => n + 1);
  };

  const lists = isOpen ? liveLists(getState().data) : [];
  const today = getToday();

  return (
    <Sheet open={isOpen} onClose={close} label="Ajouter une tâche" keepMounted panelRef={panelRef}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="h-5 w-5 shrink-0 rounded-[6px] border-2 border-faint" />
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ajouter une tâche"
            aria-label="Titre de la tâche"
            enterKeyHint="done"
            maxLength={200}
            className="min-w-0 flex-1 bg-transparent py-2 text-[17px] text-ink placeholder:text-faint focus:outline-none focus-visible:outline-none"
          />
          <Button type="submit" variant="primary" disabled={title.trim() === ''}>
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
              onChange={(e) => setDueDay(isDay(e.target.value) ? e.target.value : null)}
              className="absolute inset-0 opacity-0"
            />
            <Chip active={dueDay !== null && dueDay > addDays(today, 1)} as="span">
              {dueDay !== null && dueDay > addDays(today, 1) ? formatRelative(dueDay, today) : 'Date…'}
            </Chip>
          </label>
        </div>

        {lists.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Liste">
            {[{ id: null, name: 'Tâches' }, ...lists].map((l) => (
              <Chip key={l.id ?? 'defaut'} active={listId === l.id} onClick={() => setListId(l.id)} radio>
                {l.name}
              </Chip>
            ))}
          </div>
        ) : null}

        <p className="min-h-5 text-xs text-muted" role="status">
          {added > 0 ? `${added} tâche${added > 1 ? 's' : ''} ajoutée${added > 1 ? 's' : ''}.` : ''}
        </p>
      </form>
    </Sheet>
  );
});

function Chip({ active, onClick, children, as = 'button', radio = false }: {
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  as?: 'button' | 'span';
  radio?: boolean;
}) {
  const className = `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
    active ? 'border-primary bg-done-soft text-primary-ink' : 'border-line text-muted hover:text-ink'
  }`;
  if (as === 'span') return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      {...(radio ? { role: 'radio', 'aria-checked': active } : { 'aria-pressed': active })}
    >
      {children}
    </button>
  );
}
