import { NextResponse, type NextRequest } from 'next/server';

/**
 * Hive en pause : toute route renvoie vers la page d'attente.
 *
 * /annonces, /publier, /messages, /compte, /connexion, /api… n'affichent
 * plus rien, y compris pour un lien partagé avant la pause. Redirection
 * temporaire (307) et non permanente : Hive doit pouvoir rouvrir sans que
 * les navigateurs aient mémorisé un détour. Les écritures sont de toute
 * façon refusées par les actions (lib/pause.ts) et par la base.
 *
 * L'ancien middleware rafraîchissait la session Supabase à chaque requête ;
 * plus aucune page ne la lit, l'appel au serveur d'auth est donc supprimé.
 */
export function middleware(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname === '/') return NextResponse.next();
  return NextResponse.redirect(new URL('/', request.url), 307);
}

export const config = {
  // Restent servis tels quels : fichiers statiques, icônes, manifeste,
  // robots et image de partage de la page d'attente.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|opengraph-image|sw.js|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
