import type { Metadata } from 'next';
import { ConnexionScreen } from '../../components/auth/ConnexionScreen';

export const metadata: Metadata = { title: 'Compte' };

export default function Page() {
  return <ConnexionScreen />;
}
