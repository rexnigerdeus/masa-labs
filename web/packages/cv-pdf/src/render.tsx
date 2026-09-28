import { renderToBuffer } from '@react-pdf/renderer';
import { MIN_DENSITY, type Resume } from '@everyday/cv-core';
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
  const first = await renderToBuffer(<ResumeDocument resume={resume} />);
  const pages = countPages(first);
  if (pages <= 1) return first;

  // Un CV qui déborde de quelques lignes sur une page de plus se resserre :
  // espacements et interligne, jamais la taille du texte. On garde le premier
  // resserrement qui économise une page ; s'il n'y en a aucun, le CV est
  // vraiment long et garde sa mise en page d'origine.
  for (const density of FIT_STEPS) {
    const tighter = await renderToBuffer(<ResumeDocument resume={resume} density={density} />);
    if (countPages(tighter) < pages) return tighter;
  }
  return first;
}

/** Paliers de resserrement essayés, du plus léger au plus serré. */
const FIT_STEPS = [0.85, MIN_DENSITY];

/**
 * Nombre de pages d'un PDF produit par react-pdf.
 *
 * Lu dans les objets du fichier plutôt qu'en le réanalysant : react-pdf écrit
 * ses dictionnaires en clair, un `/Type /Page` par page (`/Pages` exclu).
 */
export function countPages(pdf: Buffer): number {
  return pdf.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0;
}

/** Nom de fichier proposé au téléchargement. */
export function pdfFileName(resume: Resume): string {
  const base = resume.personal.fullName.trim() === '' ? 'CV' : `CV ${resume.personal.fullName}`;
  return `${base.replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, '-')}.pdf`;
}
