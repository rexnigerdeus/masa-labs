'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { formatRelative, type Day } from '../../lib/dates';
import type { Task } from '../../lib/model';
import { bringBack, createList, deleteList, renameList, reorderTasks } from '../../lib/mutations';
import {
  countOpen, leftoverTasks, liveLists, myDayTasks, plannedTasks, tasksOfList,
} from '../../lib/selectors';
import { useGate } from '../../lib/gate';
import { commit, newId, nowIso, useToday } from '../../lib/store';
import { Sheet } from '../Sheet';
import { GripIcon, PlusIcon } from '../icons';
import { Button, Field, Input, ScreenTitle } from '../ui';
import { TaskEditor } from './TaskEditor';
import { TaskRow } from './TaskRow';

/**
 * Module Tâches, façon Microsoft To Do (brief §3.2) : « Ma journée », les
 * tâches planifiées, la liste par défaut et les listes de l'utilisateur.
 * Pas de projets, pas de sous-tâches, pas d'étiquettes — c'est le contrat.
 *
 * La vue courante vit dans l'URL (`?vue=` ou `?liste=`) plutôt que dans un
 * état React : le bouton retour du téléphone revient à la liste précédente,
 * et l'ajout rapide sait dans quelle liste ranger la tâche.
 */
export function TasksScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const store = useGate('app');
  const today = useToday();
  const [editing, setEditing] = useState<Task | null>(null);
  const [listSheet, setListSheet] = useState<'new' | 'edit' | null>(null);

  const vue = params.get('vue');
  const listeParam = params.get('liste');

  const view = useMemo(() => {
    if (store === null) return null;
    const { data } = store;
    const lists = liveLists(data);
    const names = new Map(lists.map((l) => [l.id, l.name]));
    const current = listeParam !== null ? lists.find((l) => l.id === listeParam) ?? null : null;
    return {
      lists,
      names,
      current,
      myDay: myDayTasks(data, today),
      leftovers: leftoverTasks(data, today),
      planned: plannedTasks(data, today),
      inList: tasksOfList(data, current?.id ?? null),
      counts: {
        myDay: myDayTasks(data, today).filter((t) => t.doneAt === null).length,
        planned: plannedTasks(data, today).length,
        inbox: countOpen(data, null),
        lists: new Map(lists.map((l) => [l.id, countOpen(data, l.id)])),
      },
    };
  }, [store, today, listeParam]);

  if (store === null || view === null) return null;

  // Une liste supprimée sur un autre appareil : on retombe sur « Tâches ».
  const mode: 'myday' | 'planned' | 'list' =
    vue === 'ma-journee' ? 'myday' : vue === 'planifie' ? 'planned' : 'list';
  const title = mode === 'myday' ? 'Ma journée' : mode === 'planned' ? 'Planifiées' : view.current?.name ?? 'Tâches';
  const listName = (id: string | null): string | null => (id === null ? 'Tâches' : view.names.get(id) ?? null);

  return (
    <div className="flex flex-col gap-5">
      <ScreenTitle kicker={title === 'Tâches' ? undefined : 'Tâches'}>{title}</ScreenTitle>

      <nav aria-label="Listes" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <ListChip href="/taches?vue=ma-journee" active={mode === 'myday'} count={view.counts.myDay}>Ma journée</ListChip>
        <ListChip href="/taches?vue=planifie" active={mode === 'planned'} count={view.counts.planned}>Planifiées</ListChip>
        <ListChip href="/taches" active={mode === 'list' && view.current === null} count={view.counts.inbox}>Tâches</ListChip>
        {view.lists.map((l) => (
          <ListChip key={l.id} href={`/taches?liste=${l.id}`} active={view.current?.id === l.id} count={view.counts.lists.get(l.id) ?? 0}>
            {l.name}
          </ListChip>
        ))}
        <button
          type="button"
          onClick={() => setListSheet('new')}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-sm font-medium text-muted hover:text-ink"
        >
          <PlusIcon className="h-4 w-4" /> Liste
        </button>
      </nav>

      {mode === 'myday' ? (
        <>
          {view.leftovers.length > 0 ? (
            <button
              type="button"
              onClick={() => commit((d) => bringBack(d, view.leftovers.map((t) => t.id), today))}
              className="self-start rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
            >
              Reprendre {view.leftovers.length} tâche{view.leftovers.length > 1 ? 's' : ''} des jours précédents
            </button>
          ) : null}
          <SimpleList tasks={view.myDay} today={today} context="myday" listName={listName} onOpen={setEditing}
            empty="Rien dans ta journée. Choisis des tâches avec ☀ ou ajoute-en avec +." />
        </>
      ) : mode === 'planned' ? (
        <PlannedList tasks={view.planned} today={today} listName={listName} onOpen={setEditing} />
      ) : (
        <>
          <ReorderableList
            key={view.current?.id ?? 'defaut'}
            tasks={view.inList.filter((t) => t.doneAt === null)}
            today={today}
            onOpen={setEditing}
          />
          <DoneList tasks={view.inList.filter((t) => t.doneAt !== null)} today={today} onOpen={setEditing} />
          {view.current !== null ? (
            <button type="button" onClick={() => setListSheet('edit')} className="self-start px-1 text-sm font-medium text-muted hover:text-ink">
              Renommer ou supprimer la liste
            </button>
          ) : null}
        </>
      )}

      <TaskEditor task={editing} today={today} onClose={() => setEditing(null)} />
      <ListSheet
        mode={listSheet}
        list={view.current}
        onClose={() => setListSheet(null)}
        onCreated={(id) => router.push(`/taches?liste=${id}`)}
        onDeleted={() => router.replace('/taches')}
      />
    </div>
  );
}

function ListChip({ href, active, count, children }: {
  href: string; active: boolean; count: number; children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      replace
      aria-current={active ? 'page' : undefined}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active ? 'bg-ink text-canvas' : 'bg-raised text-muted hover:text-ink'
      }`}
    >
      {children}
      {count > 0 ? <span className={`font-display text-xs ${active ? 'opacity-70' : 'text-faint'}`}>{count}</span> : null}
    </Link>
  );
}

function SimpleList({ tasks, today, context, listName, onOpen, empty }: {
  tasks: Task[]; today: Day; context: 'myday' | 'list';
  listName: (id: string | null) => string | null; onOpen: (t: Task) => void; empty: string;
}) {
  if (tasks.length === 0) return <p className="px-1 text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      <AnimatePresence initial={false}>
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} today={today} context={context} listName={listName(t.listId)} onOpen={onOpen} />
        ))}
      </AnimatePresence>
    </ul>
  );
}

/** Planifiées : regroupées par jour, dans l'ordre où elles arrivent. */
function PlannedList({ tasks, today, listName, onOpen }: {
  tasks: Task[]; today: Day; listName: (id: string | null) => string | null; onOpen: (t: Task) => void;
}) {
  if (tasks.length === 0) {
    return <p className="px-1 text-sm text-muted">Aucune tâche avec une échéance ou prévue pour demain.</p>;
  }
  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    const day = t.dueDay ?? t.myDay ?? today;
    const key = day < today ? 'En retard' : formatRelative(day, today);
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return (
    <div className="flex flex-col gap-4">
      {[...groups].map(([label, items]) => (
        <section key={label} className="flex flex-col gap-1.5">
          <h2 className={`px-1 text-xs font-semibold tracking-wide uppercase ${label === 'En retard' ? 'text-clay-ink' : 'text-muted'}`}>
            {label}
          </h2>
          <ul className="flex flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {items.map((t) => (
                <TaskRow key={t.id} task={t} today={today} context="list" listName={listName(t.listId)} onOpen={onOpen} />
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Tâches à faire, réordonnables au doigt par la poignée (brief §8.C). La
 * poignée seule déclenche le glisser vertical : le reste de la ligne garde
 * le glissement horizontal pour terminer une tâche.
 *
 * L'ordre suit le doigt en local pendant le geste ; il n'est écrit qu'au
 * lâcher, en une seule mutation.
 */
function ReorderableList({ tasks, today, onOpen }: {
  tasks: Task[]; today: Day; onOpen: (t: Task) => void;
}) {
  const [order, setOrder] = useState(() => tasks.map((t) => t.id));
  const ids = tasks.map((t) => t.id).join(',');
  // Ajout, suppression ou fin d'une tâche : on repart de l'ordre du store.
  useEffect(() => { setOrder(ids === '' ? [] : ids.split(',')); }, [ids]);

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visible = order.filter((id) => byId.has(id));

  if (tasks.length === 0) {
    return <p className="px-1 text-sm text-muted">Tout est fait ici. Touche + pour ajouter une tâche.</p>;
  }

  return (
    <Reorder.Group axis="y" values={visible} onReorder={setOrder} className="flex flex-col gap-1.5">
      {visible.map((id) => (
        <ReorderRow key={id} task={byId.get(id)!} today={today} onOpen={onOpen} onDrop={() => commit((d) => reorderTasks(d, visible))} />
      ))}
    </Reorder.Group>
  );
}

function ReorderRow({ task, today, onOpen, onDrop }: {
  task: Task; today: Day; onOpen: (t: Task) => void; onDrop: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={task.id} dragListener={false} dragControls={controls} onDragEnd={onDrop} className="relative">
      <TaskRow
        nested
        task={task}
        today={today}
        context="list"
        onOpen={onOpen}
        handle={
          <span
            onPointerDown={(e) => controls.start(e)}
            aria-hidden
            className="-ml-1 cursor-grab touch-none text-faint active:cursor-grabbing"
          >
            <GripIcon className="h-5 w-5" />
          </span>
        }
      />
    </Reorder.Item>
  );
}

function DoneList({ tasks, today, onOpen }: { tasks: Task[]; today: Day; onOpen: (t: Task) => void }) {
  const [open, setOpen] = useState(false);
  if (tasks.length === 0) return null;
  return (
    <section className="flex flex-col gap-1.5">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="self-start px-1 text-sm font-medium text-muted hover:text-ink">
        {open ? '▾' : '▸'} Terminées ({tasks.length})
      </button>
      {open ? (
        <ul className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {tasks.map((t) => <TaskRow key={t.id} task={t} today={today} context="list" onOpen={onOpen} />)}
          </AnimatePresence>
        </ul>
      ) : null}
    </section>
  );
}

function ListSheet({ mode, list, onClose, onCreated, onDeleted }: {
  mode: 'new' | 'edit' | null;
  list: { id: string; name: string } | null;
  onClose: () => void;
  onCreated: (id: string) => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState('');
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    setName(mode === 'edit' ? list?.name ?? '' : '');
    setConfirming(false);
  }, [mode, list]);

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (name.trim() === '') return;
    if (mode === 'new') {
      const id = newId();
      commit((d) => createList(d, name, id));
      onClose();
      onCreated(id);
    } else if (list !== null) {
      commit((d) => renameList(d, list.id, name));
      onClose();
    }
  };

  return (
    <Sheet open={mode !== null} onClose={onClose} label={mode === 'new' ? 'Nouvelle liste' : 'Modifier la liste'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={mode === 'new' ? 'Nouvelle liste' : 'Nom de la liste'}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Courses, Travail, Maison…" maxLength={60} />
        </Field>
        <div className="flex justify-between gap-2">
          {mode === 'edit' && list !== null ? (
            <Button
              variant="danger"
              onClick={() => {
                if (!confirming) { setConfirming(true); return; }
                commit((d) => deleteList(d, list.id, nowIso()));
                onClose();
                onDeleted();
              }}
            >
              {confirming ? 'Supprimer la liste et ses tâches' : 'Supprimer'}
            </Button>
          ) : <span />}
          <Button type="submit" variant="primary" disabled={name.trim() === ''}>
            {mode === 'new' ? 'Créer' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
