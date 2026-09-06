import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Thread } from '../../../components/Thread';
import { getConversation, messagesOf } from '../../../lib/db/messages';
import { currentUser } from '../../../lib/supabase/server';

export const metadata: Metadata = { title: 'Conversation', robots: { index: false } };

// Une conversation est propre à deux personnes : jamais de cache partagé.
export const dynamic = 'force-dynamic';

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await currentUser();
  if (user === null) redirect(`/connexion?suite=/messages/${id}`);

  // La RLS renvoie `null` si l'appelant n'est pas partie prenante : rien à
  // vérifier de plus ici, et un 404 en dit moins qu'un « accès refusé ».
  const conversation = await getConversation(id);
  if (conversation === null) notFound();

  const messages = await messagesOf(id);
  const other = conversation.buyer_id === user.id ? conversation.seller : conversation.buyer;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Link href="/messages" className="text-sm text-muted underline">
          Retour aux messages
        </Link>
        <h1 className="text-xl font-bold">{other?.full_name ?? 'Utilisateur Hive'}</h1>
        <Link
          href={`/annonces/${conversation.listing_id}`}
          className="text-sm text-primary underline"
        >
          {conversation.listing?.title ?? 'Annonce supprimée'}
        </Link>
      </header>

      <Thread conversationId={id} currentUserId={user.id} initial={messages} />
    </div>
  );
}
