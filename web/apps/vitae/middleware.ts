import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { APP_URL, LEGACY_HOSTS } from './lib/config';

/**
 * Rafraîchissement de la session.
 *
 * Les jetons Supabase expirent en une heure. Sans ce passage, un utilisateur
 * qui revient sur son CV le lendemain se retrouve déconnecté au moment précis
 * où il clique sur « Télécharger » — soit le pire moment possible. Le
 * middleware renouvelle le jeton et réécrit les cookies à chaque requête.
 *
 * Domaine (brief v2, lot A) : une fois `NEXT_PUBLIC_APP_URL` posée sur le
 * domaine définitif, l'ancienne adresse vercel.app redirige en 308 vers la
 * même page sur le nouveau domaine, paramètres compris (`?ref=` d'un lien
 * ambassadeur déjà imprimé ne se perd pas). Tant que la variable pointe
 * encore sur vercel.app, rien ne change.
 */
const CANONICAL_HOST = new URL(APP_URL).host;

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const host = request.headers.get('host') ?? '';
  if (LEGACY_HOSTS.includes(host) && !LEGACY_HOSTS.includes(CANONICAL_HOST) && !CANONICAL_HOST.startsWith('localhost')) {
    const target = new URL(request.nextUrl.pathname + request.nextUrl.search, APP_URL);
    return NextResponse.redirect(target, 308);
  }

  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value, options } of list) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // L'appel lui-même est l'effet recherché : il déclenche le renouvellement.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // On évite les assets et les images : le middleware coûte une requête au
  // serveur d'auth, il n'a rien à faire sur un fichier statique.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
