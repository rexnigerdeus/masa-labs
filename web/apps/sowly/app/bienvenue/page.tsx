import type { Metadata } from 'next';
import { Landing } from '../../components/Landing';

export const metadata: Metadata = { title: 'Bienvenue' };

export default function Page() {
  return <Landing />;
}
