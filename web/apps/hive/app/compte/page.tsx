import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AccountForm } from '../../components/AccountForm';
import { baseProfile, hiveProfile } from '../../lib/db/profile';
import { formatPhone } from '../../lib/phone';
import { currentUser } from '../../lib/supabase/server';

export const metadata: Metadata = { title: 'Mon compte', robots: { index: false } };

export default async function ComptePage() {
  const user = await currentUser();
  if (user === null) redirect('/connexion?suite=/compte');

  const [base, hive] = await Promise.all([baseProfile(user.id), hiveProfile(user.id)]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Mon compte</h1>

      <p className="text-muted">
        Connecté avec le {base?.phone != null ? formatPhone(base.phone) : 'votre numéro'}.
      </p>

      <AccountForm
        profile={{
          fullName: base?.full_name ?? '',
          commune: hive.commune,
          bio: hive.bio,
          acceptsCash: hive.accepts_cash,
          acceptsOnline: hive.accepts_online,
        }}
      />

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/mes-annonces" className="text-primary underline">Mes annonces</Link>
        <Link href="/mes-commandes" className="text-primary underline">Mes commandes</Link>
        <Link href="/messages" className="text-primary underline">Messages</Link>
      </nav>

      <form action="/auth/deconnexion" method="post">
        <button type="submit" className="text-sm text-muted underline">Me déconnecter</button>
      </form>
    </div>
  );
}
