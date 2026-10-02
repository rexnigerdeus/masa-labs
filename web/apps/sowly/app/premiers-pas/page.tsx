import type { Metadata } from 'next';
import { Onboarding } from '../../components/onboarding/Onboarding';

export const metadata: Metadata = { title: 'Premiers pas' };

export default function Page() {
  return <Onboarding />;
}
