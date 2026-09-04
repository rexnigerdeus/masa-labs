import { renderToBuffer } from '@react-pdf/renderer';
import type { Resume } from '@everyday/cv-core';
import { ResumeDocument } from './ResumeDocument.tsx';

/**
 * Rend un CV en PDF.
 *
 * Utilisé par la route d'export de l'app et par le harnais `ats:check`. Le fait
 * que les deux passent exactement par ici est ce qui donne sa valeur au
 * harnais : il vérifie le PDF que les utilisateurs téléchargent, pas une
 * approximation.
 */
export async function renderResumePdf(resume: Resume): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument resume={resume} />);
}

/** Nom de fichier proposé au téléchargement. */
export function pdfFileName(resume: Resume): string {
  const base = resume.personal.fullName.trim() === '' ? 'CV' : `CV ${resume.personal.fullName}`;
  return `${base.replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, '-')}.pdf`;
}
