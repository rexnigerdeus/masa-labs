import { NextResponse } from 'next/server';
import { messagesOf } from '../../../../lib/db/messages';
import { currentUser } from '../../../../lib/supabase/server';

/**
 * Nouveaux messages d'un fil, postérieurs à `since`.
 *
 * C'est le seul appel répété de l'application : l'écran de conversation le
 * relance toutes les dix secondes tant que l'onglet est visible. Il ne
 * renvoie que le delta, donc quelques centaines d'octets, là où un websocket
 * demanderait une connexion ouverte en permanence.
 *
 * Aucun contrôle d'accès ici : la RLS ne laisse remonter que les messages
 * d'un fil dont l'appelant est partie prenante.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await currentUser();
  if (user === null) return NextResponse.json({ messages: [] }, { status: 401 });

  const { id } = await params;
  const since = new URL(request.url).searchParams.get('since') ?? undefined;
  const messages = await messagesOf(id, since);

  // Jamais de cache : deux messages successifs se ressemblent trop pour
  // qu'une réponse mise en cache passe inaperçue.
  return NextResponse.json({ messages }, { headers: { 'Cache-Control': 'no-store' } });
}
