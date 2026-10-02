import type { Metadata } from 'next';
import { SettingsScreen } from '../../components/SettingsScreen';

export const metadata: Metadata = { title: 'Réglages' };

export default function Page() {
  return <SettingsScreen />;
}
