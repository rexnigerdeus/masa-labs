import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { OrderCard } from '../../components/OrderCard';
import { EmptyState } from '../../components/ui';
import { ordersAsBuyer } from '../../lib/db/orders';
import { currentUser } from '../../lib/supabase/server';

export const metadata: Metadata = { title: 'Mes commandes — Hive' };

export default async function MesCommandesPage() {
  const user = await currentUser();
  if (user === null) redirect('/connexion?suite=/mes-commandes');

  const orders = await ordersAsBuyer(user.id);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Mes commandes</h1>

      {orders.length === 0 ? (
        <EmptyState title="Aucune commande pour l’instant">
          <Link href="/annonces" className="text-primary underline">
            Parcourez les annonces
          </Link>{' '}
          et envoyez une demande de réservation.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}><OrderCard order={order} party="buyer" /></li>
          ))}
        </ul>
      )}
    </div>
  );
}
