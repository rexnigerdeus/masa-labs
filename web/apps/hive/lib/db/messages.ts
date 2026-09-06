import { createClient } from '../supabase/server';
import type { Conversation, Listing, Message } from '../types';

/**
 * Lecture de la messagerie.
 *
 * Pas de Supabase Realtime : l'écran de conversation redemande les messages
 * postérieurs au dernier reçu toutes les dix secondes. Sur un réseau
 * abidjanais instable, un websocket qui se reconnecte en boucle coûte plus de
 * batterie et de données qu'il n'apporte de fluidité.
 */

export type ConversationSummary = Conversation & {
  listing: Pick<Listing, 'id' | 'title' | 'photos'> | null;
  buyer: { id: string; full_name: string | null } | null;
  seller: { id: string; full_name: string | null } | null;
};

const SELECT =
  '*, listing:hive_listings(id, title, photos), '
  + 'buyer:profiles!hive_conversations_buyer_id_fkey(id, full_name), '
  + 'seller:profiles!hive_conversations_seller_id_fkey(id, full_name)';

export async function conversationsOf(userId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('hive_conversations')
    .select(SELECT)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });
  return (data ?? []) as unknown as ConversationSummary[];
}

export async function getConversation(id: string): Promise<ConversationSummary | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('hive_conversations').select(SELECT).eq('id', id).maybeSingle();
  return (data as unknown as ConversationSummary | null) ?? null;
}

/** `since` est la date du dernier message déjà affiché, au format ISO. */
export async function messagesOf(conversationId: string, since?: string): Promise<Message[]> {
  const supabase = await createClient();
  let query = supabase
    .from('hive_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (since !== undefined && since !== '') query = query.gt('created_at', since);

  const { data } = await query;
  return (data ?? []) as Message[];
}
