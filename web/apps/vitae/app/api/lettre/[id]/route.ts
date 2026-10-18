import { NextResponse } from 'next/server';
import { letterFileName, renderCoverLetterPdf } from '@everyday/cv-pdf';
import { loadLetter } from '../../../../lib/letters';
import { loadResume } from '../../../../lib/resumes';

/**
 * PDF d'une lettre enregistrée.
 *
 * Rendu à partir de la base, pas d'un corps envoyé par le navigateur : seule
 * une lettre réellement créée — donc avec un pass actif au moment de sa
 * création — se télécharge, et seulement par son propriétaire (RLS).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const stored = await loadLetter(id);
  if (stored === null) return NextResponse.json({ error: 'Lettre introuvable.' }, { status: 404 });
  const resume = (stored.resumeId === null ? null : await loadResume(stored.resumeId)) ?? (await loadResume());
  if (resume === null) return NextResponse.json({ error: 'CV introuvable.' }, { status: 404 });

  let pdf: Buffer;
  try {
    pdf = await renderCoverLetterPdf(stored.letter, resume.data);
  } catch (error) {
    console.error('[lettre] rendu PDF impossible', error);
    return NextResponse.json({ error: 'Rendu PDF impossible.' }, { status: 500 });
  }
  const filename = letterFileName(resume.data);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'cache-control': 'no-store',
    },
  });
}
