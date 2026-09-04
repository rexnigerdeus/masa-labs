import { NextResponse } from 'next/server';
import { pdfFileName, renderResumePdf } from '@everyday/cv-pdf';
import type { Resume } from '@everyday/cv-core';
import { currentUser } from '../../../lib/supabase/server';

/**
 * Export PDF.
 *
 * Rendu côté serveur avec `@react-pdf/renderer` : le PDF contient du texte réel
 * avec police embarquée, jamais une image de la page. C'est exactement le
 * chemin que vérifie `npm run ats:check`.
 *
 * C'est le seul endroit du produit qui exige un compte. Tout le reste — saisie,
 * score, aperçu, offres, conseils — est accessible sans inscription.
 */

// react-pdf lit les fichiers de police sur le disque : runtime Node obligatoire.
export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  const user = await currentUser();
  if (user === null) {
    return NextResponse.json(
      { error: 'Créez un compte pour télécharger votre CV.' },
      { status: 401 },
    );
  }

  let resume: Resume;
  try {
    resume = (await request.json()) as Resume;
  } catch {
    return NextResponse.json({ error: 'Corps de requête illisible.' }, { status: 400 });
  }

  if (typeof resume !== 'object' || resume === null || resume.schemaVersion !== 1) {
    return NextResponse.json({ error: 'Format de CV non reconnu.' }, { status: 422 });
  }

  const pdf = await renderResumePdf(resume);
  const filename = pdfFileName(resume);

  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${filename}"`,
      // Le client lit le nom ici : `content-disposition` n'est pas exposé au
      // JavaScript sur une réponse lue en blob.
      'x-filename': filename,
      'access-control-expose-headers': 'x-filename',
      'cache-control': 'no-store',
    },
  });
}
