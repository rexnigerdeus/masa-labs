import type { Metadata } from 'next';
import { publicClient } from '../../../lib/supabase/public';

export const metadata: Metadata = {
  title: 'Espace ambassadeur',
  robots: { index: false, follow: false },
};

/**
 * Page d'un ambassadeur (brief v2, « Tableaux de bord »).
 *
 * `/ambassadeur/<code>?t=<jeton>` : deux nombres, rien d'autre — CV
 * téléchargés cette semaine et au total avec son code. Le jeton est remis à la
 * main ; la fonction SQL `vitae_ambassador_stats` ne renvoie rien si le code
 * est inconnu, inactif ou le jeton faux, et la page ne dit pas lequel des
 * trois : un mauvais jeton ne montre rien.
 */
export const dynamic = 'force-dynamic';

export default async function AmbassadeurPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { code } = await params;
  const { t } = await searchParams;

  let stats: { week_count: number; total_count: number; first_name: string } | null = null;
  if (typeof t === 'string' && t.length >= 16 && t.length <= 128 && /^[A-Za-z0-9_-]{2,40}$/.test(code)) {
    const { data } = await publicClient().rpc('vitae_ambassador_stats', { p_code: code, p_token: t });
    const rows = data as { week_count: number; total_count: number; first_name: string }[] | null;
    stats = rows?.[0] ?? null;
  }

  if (stats === null) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-2">
        <h1 className="text-2xl font-bold">Lien invalide</h1>
        <p className="text-muted">Vérifiez le lien reçu, ou redemandez-le à l’équipe Vitae.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <header>
        <p className="text-sm font-semibold text-muted">Code {code.toUpperCase()}</p>
        <h1 className="text-2xl font-bold">Bonjour {stats.first_name}</h1>
      </header>
      <dl className="grid grid-cols-2 gap-3">
        <div className="card flex flex-col gap-1 p-4">
          <dt className="text-sm text-muted">CV téléchargés cette semaine</dt>
          <dd className="text-4xl font-bold">{stats.week_count}</dd>
        </div>
        <div className="card flex flex-col gap-1 p-4">
          <dt className="text-sm text-muted">Au total</dt>
          <dd className="text-4xl font-bold">{stats.total_count}</dd>
        </div>
      </dl>
      <p className="text-sm text-muted">
        Chaque personne qui télécharge son CV après avoir ouvert votre lien
        compte une fois, même si elle le télécharge plusieurs fois. La semaine
        commence le lundi.
      </p>
    </div>
  );
}
