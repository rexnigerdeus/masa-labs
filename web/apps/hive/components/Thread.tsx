'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sendMessage } from '../lib/actions/messages';
import { Button } from './ui';
import type { Message } from '../lib/types';

const POLL_MS = 10_000;

/**
 * Fil de discussion.
 *
 * Rafraîchissement par interrogation périodique plutôt que par Supabase
 * Realtime : sur un réseau mobile abidjanais, un websocket passe son temps à
 * se reconnecter, consomme de la batterie et échoue silencieusement. Une
 * requête de quelques centaines d'octets toutes les dix secondes est plus
 * fiable et se suspend d'elle-même quand l'onglet passe à l'arrière-plan.
 */
export function Thread({ conversationId, currentUserId, initial }: {
  conversationId: string; currentUserId: string; initial: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [sending, setSending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const poll = useCallback(async (): Promise<void> => {
    const since = messages.at(-1)?.created_at ?? '';
    const response = await fetch(
      `/api/messages/${conversationId}?since=${encodeURIComponent(since)}`,
      { cache: 'no-store' },
    );
    if (!response.ok) return;

    const payload = (await response.json()) as { messages: Message[] };
    if (payload.messages.length === 0) return;

    setMessages((current) => {
      // Le `since` est envoyé au départ de la requête : une réponse en retard
      // peut rapporter un message déjà affiché. On dédoublonne par identifiant.
      const known = new Set(current.map((m) => m.id));
      return [...current, ...payload.messages.filter((m) => !known.has(m.id))];
    });
  }, [conversationId, messages]);

  useEffect(() => {
    // Rien à interroger quand personne ne regarde : un onglet en
    // arrière-plan qui appelle toutes les dix secondes vide la batterie.
    const tick = (): void => {
      if (document.visibilityState === 'visible') void poll();
    };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [poll]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  async function submit(form: FormData): Promise<void> {
    const body = String(form.get('body') ?? '').trim();
    if (body === '') return;

    setSending(true);
    await sendMessage(form);
    formRef.current?.reset();
    // On ne devine pas ce que le serveur a écrit : on relit. Le message
    // affiché est donc toujours celui qui est réellement enregistré.
    await poll();
    setSending(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
        {messages.map((message) => {
          const mine = message.sender_id === currentUserId;
          return (
            <li
              key={message.id}
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                mine ? 'self-end bg-primary text-white' : 'self-start bg-surface'
              }`}
            >
              <p className="whitespace-pre-line">{message.body}</p>
            </li>
          );
        })}
        <div ref={bottomRef} />
      </ul>

      <form ref={formRef} action={(form) => void submit(form)} className="flex gap-2">
        <input type="hidden" name="conversation_id" value={conversationId} />
        <input
          name="body"
          autoComplete="off"
          placeholder="Votre message…"
          className="w-full rounded-full border border-line bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <Button type="submit" variant="solid" disabled={sending}>
          {sending ? '…' : 'Envoyer'}
        </Button>
      </form>
    </div>
  );
}
