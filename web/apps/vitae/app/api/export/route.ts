import { NextResponse } from 'next/server';
import { pdfFileName, renderResumePdf } from '@everyday/cv-pdf';
import { normalizeResume, type Resume } from '@everyday/cv-core';

/**
 * Export PDF.
 *
 * Rendu côté serveur avec `@react-pdf/renderer` : le PDF contient du texte réel
 * avec police embarquée, jamais une image de la page. C'est exactement le
 * chemin que vérifie `npm run ats:check`.
 *
 * Ouvert sans compte (brief v2, règle 1) : le premier CV se crée et se
 * télécharge sans inscription, autant de fois qu'on veut. Le compte n'apparaît
 * qu'au moment où il sert — un deuxième CV, un achat. La route ne lit ni
 * n'écrit rien en base : elle met en page ce qu'on lui envoie et le renvoie.
 */

// react-pdf lit les fichiers de police sur le disque : runtime Node obligatoire.
export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête illisible.' }, { status: 400 });
  }

  // Le corps vient du navigateur : il est remis en forme avant d'atteindre le
  // renderer, photo et couleur comprises. Une photo qui n'est pas une image ou
  // une couleur qui n'est pas un hexadécimal est écartée ici, pas plus loin.
  const resume: Resume | null = normalizeResume(payload);
  if (resume === null) {
    return NextResponse.json({ error: 'Format de CV non reconnu.' }, { status: 422 });
  }

  let pdf: Buffer;
  try {
    pdf = await renderResumePdf(resume);
  } catch (error) {
    console.error('[export] rendu PDF impossible', error);
    return NextResponse.json(
      { error: 'Rendu PDF impossible.' },
      { status: 500 },
    );
  }
  const filename = pdfFileName(resume);

  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      // Un en-tête HTTP n'admet que de l'ASCII : « Koné » y voyage encodé,
      // comme le prévoit RFC 6266, et le client le décode.
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      // Le client lit le nom ici : `content-disposition` n'est pas exposé au
      // JavaScript sur une réponse lue en blob.
      'x-filename': encodeURIComponent(filename),
      'access-control-expose-headers': 'x-filename',
      'cache-control': 'no-store',
    },
  });
}
