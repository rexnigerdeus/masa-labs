import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TasksScreen } from '../../components/tasks/TasksScreen';

export const metadata: Metadata = { title: 'Tâches' };

// `Suspense` : l'écran lit `?vue=` / `?liste=` côté client, ce qui garde la
// page statique — donc disponible hors-ligne depuis le cache.
export default function Page() {
  return (
    <Suspense>
      <TasksScreen />
    </Suspense>
  );
}
