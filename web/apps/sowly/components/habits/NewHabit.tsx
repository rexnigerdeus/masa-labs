'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createHabit, type HabitDraft } from '../../lib/mutations';
import { commit, newId, today, useStore } from '../../lib/store';
import { ChevronLeftIcon } from '../icons';
import { Button } from '../ui';
import { EMPTY_DRAFT, HabitForm } from './HabitForm';

/**
 * Nouvelle habitude : bibliothèque par identité + création libre, sans
 * aucune limite de nombre (brief §8.C, §10).
 */
export function NewHabit() {
  const router = useRouter();
  const store = useStore();
  const [draft, setDraft] = useState<HabitDraft>(EMPTY_DRAFT);
  const identities = store?.data.profile.identities ?? [];

  // Première identité choisie présélectionnée : ses suggestions s'affichent
  // tout de suite.
  const first = identities[0] ?? null;
  useEffect(() => {
    setDraft((d) => (d.identity === null && d.action === '' ? { ...d, identity: first } : d));
  }, [first]);

  if (store === null) return null;

  return (
    <div className="flex flex-col gap-6 pt-4">
      <Link href="/" className="-ml-2 inline-flex items-center gap-1 self-start rounded-full py-1.5 pr-3 pl-1.5 text-sm font-medium text-muted hover:text-ink">
        <ChevronLeftIcon className="h-5 w-5" /> Aujourd’hui
      </Link>
      <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight">Semer une habitude</h1>
      <HabitForm value={draft} onChange={setDraft} identities={identities} />
      <Button
        variant="primary"
        size="lg"
        disabled={draft.action.trim() === ''}
        onClick={() => {
          commit((d) => createHabit(d, draft, newId(), today()));
          router.push('/');
        }}
      >
        Ajouter l’habitude
      </Button>
    </div>
  );
}
