import Link from 'next/link';
import { requireAdmin } from '../../../lib/admin';

/**
 * Entonnoir de la semaine (brief v2, « Tableaux de bord »).
 *
 * Calculé en base (`vitae_funnel`) : une « personne » est un compte s'il
 * existe, sinon un navigateur. Le filtre `ref` restreint aux événements
 * portant ce code ambassadeur ou ce canal.
 */
interface FunnelRow {
  week: string;
  started: number;
  score80: number;
  downloaded: number;
  returned: number;
  purchased: number;
}

const COLUMNS: { key: keyof Omit<FunnelRow, 'week'>; label: string }[] = [
  { key: 'started', label: 'CV commencé' },
  { key: 'score80', label: 'Score 80' },
  { key: 'downloaded', label: 'PDF téléchargé' },
  { key: 'returned', label: 'Retour sous 30 j' },
  { key: 'purchased', label: 'Achat' },
];

function formatWeek(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  });
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { supabase } = await requireAdmin();
  const { ref } = await searchParams;
  const selected = typeof ref === 'string' && /^[A-Za-z0-9_.-]{1,64}$/.test(ref) ? ref : null;

  const [{ data: funnel, error }, { data: refs }] = await Promise.all([
    supabase.rpc('vitae_funnel', { p_weeks: 8, p_ref: selected }),
    supabase.rpc('vitae_refs'),
  ]);
  const rows = (funnel as FunnelRow[] | null) ?? [];
  const refList = (refs as { ref: string; people: number }[] | null) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Entonnoir par semaine</h1>
        <p className="mt-1 text-sm text-muted">
          Personnes distinctes ayant atteint chaque étape, semaine commençant le
          lundi. « Retour sous 30 j » est compté dans la semaine du premier
          téléchargement : les quatre dernières semaines sont encore incomplètes.
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Code ou canal (ref)</span>
          <select name="ref" defaultValue={selected ?? ''} className="min-h-11 rounded-xl border border-line bg-white px-3 text-base">
            <option value="">Tous</option>
            {refList.map((r) => (
              <option key={r.ref} value={r.ref}>{r.ref} ({r.people})</option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-11 rounded-full bg-header px-5 text-sm font-semibold text-white">Filtrer</button>
        {selected === null ? null : (
          <Link href="/admin/stats" className="min-h-11 px-2 py-3 text-sm underline">Retirer le filtre</Link>
        )}
      </form>

      {error !== null ? (
        <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm">
          Lecture impossible ({error.message}). La migration
          20261018120000_vitae_lot_a.sql est-elle appliquée ?
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-canvas text-left">
              <tr>
                <th scope="col" className="px-3 py-2">Semaine du</th>
                {COLUMNS.map((c) => <th key={c.key} scope="col" className="px-3 py-2 text-right">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.week} className="border-t border-line">
                  <th scope="row" className="px-3 py-2 text-left font-medium">{formatWeek(r.week)}</th>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-right tabular-nums">{r[c.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
