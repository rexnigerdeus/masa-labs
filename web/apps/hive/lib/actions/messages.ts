'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, currentUser } from '../supabase/server';

/**
 * Ouvrir ou retrouver la conversation d'une annonce.
 *
 * Un fil par couple (annonce, client) : quelqu'un qui écrit deux fois au même
 * loueur pour la même caméra doit retrouver l'échange précédent, pas repartir
 * d'une page blanche. L'unicité est garantie en base, on la retrouve ici.
 */
export async function openConversation(form: FormData): Promise<void> {
  const listingId = String(form.get('listing_id') ?? '');

  const user = await currentUser();
  if (user === null) redirect(`/connexion?suite=/annonces/${listingId}`);

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from('hive_listings')
    .select('id, user_id')
    .eq('id', listingId)
    .maybeSingle();

  if (listing === null || listing.user_id === user.id) redirect('/messages');

  const { data: existing } = await supabase
    .from('hive_conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', user.id)
    .maybeSingle();

  if (existing !== null) redirect(`/messages/${existing.id}`);

  const { data: created, error } = await supabase
    .from('hive_conversations')
    .insert({ listing_id: listingId, buyer_id: user.id, seller_id: listing.user_id })
    .select('id')
    .single();

  if (error !== null || created === null) redirect('/messages');
  redirect(`/messages/${created.id}`);
}

/**
 * Envoi d'un message.
 *
 * `last_message_at` est remis à jour dans la foulée : c'est lui qui ordonne
 * la liste des conversations, et un fil qui ne remonte pas après une réponse
 * donne l'impression que le message n'est pas parti.
 */
export async function sendMessage(form: FormData): Promise<void> {
  const conversationId = String(form.get('conversation_id') ?? '');
  const body = String(form.get('body') ?? '').trim();

  const user = await currentUser();
  if (user === null) redirect(`/connexion?suite=/messages/${conversationId}`);
  if (body === '') return;

  const supabase = await createClient();
  // La RLS vérifie l'appartenance au fil : inutile de la refaire ici.
  const { error } = await supabase
    .from('hive_messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body: body.slice(0, 2000) });

  if (error === null) {
    await supabase
      .from('hive_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath('/messages');
}
