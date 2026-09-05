import { publicClient } from './supabase/public';

/**
 * Lecture des articles « Conseils ».
 *
 * La table `vitae_articles` est déjà peuplée (contenu rédigé pour le marché
 * ivoirien, partagé avec l'app Flutter). Lecture seule, sans compte.
 */

export interface Article {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  content: string;
  author: string | null;
  readTimeMinutes: number | null;
  publishedAt: string;
  sourceUrl: string | null;
}

const COLUMNS =
  'id, category, title, excerpt, content, author, read_time_minutes, published_at, source_url';

function toArticle(row: Record<string, unknown>): Article {
  return {
    id: row.id as string,
    category: row.category as string,
    title: row.title as string,
    excerpt: row.excerpt as string,
    content: row.content as string,
    author: row.author as string | null,
    readTimeMinutes: row.read_time_minutes as number | null,
    publishedAt: row.published_at as string,
    sourceUrl: row.source_url as string | null,
  };
}

export async function fetchArticles(category?: string): Promise<Article[]> {
  const supabase = publicClient();
  let query = supabase
    .from('vitae_articles')
    .select(COLUMNS)
    .order('published_at', { ascending: false });

  if (category !== undefined && category !== '') query = query.eq('category', category);

  const { data, error } = await query;
  return error !== null || data === null ? [] : data.map(toArticle);
}

export async function fetchArticle(id: string): Promise<Article | null> {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from('vitae_articles')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();
  return error !== null || data === null ? null : toArticle(data);
}

/**
 * Bloc de contenu d'un article.
 *
 * Le contenu stocké est du texte brut avec des paragraphes séparés par une
 * ligne vide et des passages en `**gras**`. Plutôt que d'embarquer un moteur
 * Markdown pour cette seule syntaxe — et son poids sur une connexion lente —
 * on découpe nous-mêmes. Rien n'est interprété comme du HTML : le texte reste
 * du texte, donc aucune injection possible.
 */
export interface Block {
  /** Un paragraphe entièrement en gras sert de titre de section. */
  kind: 'heading' | 'paragraph' | 'listItem';
  /** Fragments alternant texte normal et gras. */
  spans: { text: string; bold: boolean }[];
}

export function parseContent(content: string): Block[] {
  return content
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk !== '')
    .map((chunk) => {
      const listItem = /^[-•]\s+/.test(chunk);
      const body = listItem ? chunk.replace(/^[-•]\s+/, '') : chunk;
      const spans = parseSpans(body.replace(/\n/g, ' '));
      const heading = !listItem
        && spans.length === 1
        && spans[0]?.bold === true;
      return {
        kind: heading ? 'heading' : listItem ? 'listItem' : 'paragraph',
        spans,
      } satisfies Block;
    });
}

function parseSpans(text: string): { text: string; bold: boolean }[] {
  const spans: { text: string; bold: boolean }[] = [];
  // Découpe sur les paires **…**, en conservant les délimiteurs pour savoir
  // quel fragment est en gras.
  for (const part of text.split(/(\*\*[^*]+\*\*)/g)) {
    if (part === '') continue;
    const bold = part.startsWith('**') && part.endsWith('**');
    spans.push({ text: bold ? part.slice(2, -2) : part, bold });
  }
  return spans;
}
