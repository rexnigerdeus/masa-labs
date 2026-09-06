import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

/** Déconnexion. En POST : une déconnexion ne doit pas être déclenchable par un simple lien. */
export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', new URL(request.url).origin), { status: 303 });
}
