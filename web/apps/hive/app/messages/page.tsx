import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState } from '../../components/ui';
import { conversationsOf } from '../../lib/db/messages';
import { coverUrl } from '../../lib/storage';
import { currentUser } from '../../lib/supabase/server';

export const metadata: Metadata = { title: 'Messages', robots: { index: false } };

export default async function MessagesPage() {
  const user = await currentUser();
  if (user === null) redirect('/connexion?suite=/messages');

  const conversations = await conversationsOf(user.id);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Messages</h1>

      {conversations.length === 0 ? (
        <EmptyState title="Aucune conversation">
          Écrivez à un loueur depuis une{' '}
          <Link href="/annonces" className="text-primary underline">annonce</Link>.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {conversations.map((conversation) => {
            const other = conversation.buyer_id === user.id
              ? conversation.seller
              : conversation.buyer;
            const cover = coverUrl(conversation.listing?.photos ?? []);
            return (
              <li key={conversation.id}>
                <Link href={`/messages/${conversation.id}`} className="card flex items-center gap-3 p-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                    {cover !== null ? (
                      <img src={cover} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {conversation.listing?.title ?? 'Annonce supprimée'}
                    </span>
                    <span className="text-sm text-muted">
                      Avec {other?.full_name ?? 'un utilisateur Hive'}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
