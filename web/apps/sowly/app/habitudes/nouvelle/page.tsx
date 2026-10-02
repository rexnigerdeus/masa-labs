import type { Metadata } from 'next';
import { NewHabit } from '../../../components/habits/NewHabit';

export const metadata: Metadata = { title: 'Nouvelle habitude' };

export default function Page() {
  return <NewHabit />;
}
