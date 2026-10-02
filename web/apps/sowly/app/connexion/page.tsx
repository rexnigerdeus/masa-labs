import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ConnexionScreen } from '../../components/auth/ConnexionScreen';

export const metadata: Metadata = { title: 'Compte' };

// `Suspense` : l'écran lit `?mode=` côté client, la page reste statique.
export default function Page() {
  return (
    <Suspense>
      <ConnexionScreen />
    </Suspense>
  );
}
