import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

/**
 * Retour d'un provider OAuth.
 *
 * Le provider renvoie un code à usage unique ; on l'échange ici contre une
 * session posée en cookie, puis on renvoie l'utilisateur là où il allait.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/cv';

  if (code === null) {
    return NextResponse.redirect(new URL('/connexion?erreur=code_absent', url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error !== null) {
    return NextResponse.redirect(new URL('/connexion?erreur=echange', url.origin));
  }

  // `next` vient de l'URL : on n'accepte qu'un chemin interne, sinon la page de
  // connexion devient un tremplin de redirection vers n'importe quel domaine.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/cv';
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
