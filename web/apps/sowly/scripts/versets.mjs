/**
 * Versets des heures de prière, pris mot pour mot dans la Bible Louis
 * Segond 1910 (LSG, domaine public) en ligne : api.getbible.net, version
 * `ls1910`. Seuls les espaces sont normalisés.
 *
 * Écrit deux copies identiques — l'app (hors connexion) et l'Edge Function
 * (texte des notifications), qui ne peuvent pas partager un fichier ; un
 * test vérifie qu'elles ne divergent pas. À relancer pour changer la liste :
 *   node scripts/versets.mjs
 */
import { writeFile } from 'node:fs/promises';

// Heure → [référence affichée, livre, chapitre, versets].
const CHOICE = {
  0: [['Psaume 119:62', 19, 119, [62]], ['Actes 16:25', 44, 16, [25]], ['Luc 6:12', 42, 6, [12]], ['Psaume 42:9', 19, 42, [9]]],
  4: [['Marc 1:35', 41, 1, [35]], ['Psaume 119:147', 19, 119, [147]], ['Psaume 63:2', 19, 63, [2]]],
  6: [['Psaume 5:4', 19, 5, [4]], ['Lamentations 3:22-23', 25, 3, [22, 23]], ['Psaume 143:8', 19, 143, [8]], ['Psaume 90:14', 19, 90, [14]], ['Psaume 92:2-3', 19, 92, [2, 3]]],
  12: [['Psaume 55:18', 19, 55, [18]], ['Actes 10:9', 44, 10, [9]], ['Philippiens 4:6', 50, 4, [6]]],
  15: [['Actes 3:1', 44, 3, [1]], ['Hébreux 4:16', 58, 4, [16]], ['Matthieu 27:46', 40, 27, [46]]],
  18: [['Psaume 141:2', 19, 141, [2]], ['Luc 24:29', 42, 24, [29]], ['Psaume 113:3', 19, 113, [3]]],
  20: [['Psaume 4:9', 19, 4, [9]], ['Psaume 134:2', 19, 134, [2]], ['Psaume 16:7', 19, 16, [7]], ['Psaume 63:7', 19, 63, [7]]],
};

const clean = (s) => s.replace(/\s+/g, ' ').replace(/ ,/g, ',').replace(/ ([;:!?])/g, '\u00a0$1').trim();
const cache = {};
async function verse(book, chapter, n) {
  const key = `${book}/${chapter}`;
  cache[key] ??= await fetch(`https://api.getbible.net/v2/ls1910/${key}.json`).then((r) => r.json());
  const v = cache[key].verses.find((x) => x.verse === n);
  if (v === undefined) throw new Error(`Verset introuvable : ${key}:${n}`);
  return clean(v.text);
}

const out = {};
for (const [hour, list] of Object.entries(CHOICE)) {
  out[hour] = [];
  for (const [ref, book, chapter, ns] of list) {
    const parts = [];
    for (const n of ns) parts.push(await verse(book, chapter, n));
    out[hour].push({ ref, text: parts.join(' ').replace(/[,;\u00a0 ]+$/, '.') });
  }
}

const source = `/**
 * Heures de prière et versets — Bible Louis Segond 1910 (LSG).
 * Fichier généré par web/apps/sowly/scripts/versets.mjs : ne pas modifier à
 * la main. Deux copies identiques (app et Edge Function).
 */

export interface Verse { ref: string; text: string }

export const PRAYER_HOURS = [0, 4, 6, 12, 15, 18, 20] as const;

export const VERSES: Readonly<Record<number, readonly Verse[]>> = ${JSON.stringify(out, null, 2)};

/** Le verset du jour pour une heure : il change chaque jour, le même sur tous les appareils. */
export function verseFor(hour: number, day: string): Verse {
  const list = VERSES[hour] ?? VERSES[0]!;
  const n = Math.floor(Date.parse(\`\${day}T00:00:00Z\`) / 86_400_000);
  return list[n % list.length]!;
}

/** « 4 h », « Midi », « Minuit ». */
export function hourLabel(hour: number): string {
  return hour === 0 ? 'Minuit' : hour === 12 ? 'Midi' : \`\${hour} h\`;
}
`;
for (const target of ['../lib/verses.ts', '../../../../supabase/functions/sowly-push/verses.ts']) {
  await writeFile(new URL(target, import.meta.url), source);
}
console.log('Versets écrits.');
