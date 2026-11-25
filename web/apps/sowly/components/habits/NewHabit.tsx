'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { silenceDue } from '../../lib/alarm-state';
import { createHabit, type HabitDraft } from '../../lib/mutations';
import { useGate } from '../../lib/gate';
import { commit, newId, today } from '../../lib/store';
import { ChevronLeftIcon } from '../icons';
import { Button } from '../ui';
import { EMPTY_DRAFT, HabitForm } from './HabitForm';

/**
 * Nouvelle habitude : bibliothèque par identité + création libre, sans
 * aucune limite de nombre (brief §8.C, §10).
 */
export function NewHabit() {
  const router = useRouter();
  const store = useGate('app');
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
    <div className="flex flex-col gap-6 pt-2">
      <Link href="/" className="btn btn--fantome btn--petit -ml-2 self-start !pl-1.5 text-muted">
        <ChevronLeftIcon className="h-5 w-5" /> Aujourd’hui
      </Link>
      <header className="flex flex-col gap-2">
        <p className="sur">Nouvelle habitude · sans limite</p>
        <h1 className="titre-page">Sème une <em className="s">graine</em></h1>
      </header>
      <div className="carte">
        <HabitForm value={draft} onChange={setDraft} identities={identities} />
      </div>
      <Button
        variant="primary"
        size="lg"
        disabled={draft.action.trim() === ''}
        onClick={() => {
          commit((d) => createHabit(d, draft, newId(), today()));
          silenceDue('habit');
          router.push('/');
        }}
      >
        Ajouter l’habitude
      </Button>
    </div>
  );
}
