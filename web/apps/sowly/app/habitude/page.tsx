import type { Metadata } from 'next';
import { Suspense } from 'react';
import { HabitDetail } from '../../components/habits/HabitDetail';

export const metadata: Metadata = { title: 'Habitude' };

export default function Page() {
  return (
    <Suspense>
      <HabitDetail />
    </Suspense>
  );
}
