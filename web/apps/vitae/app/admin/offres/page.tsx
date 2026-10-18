import { requireAdmin } from '../../../lib/admin';
import { moderateOffer } from '../../../lib/adminActions';
import { JOB_LEVELS, formatLongDate, jobCategoryLabel } from '../../../lib/catalog';

/**
 * Offres déposées en attente de validation (brief v2, offres §6). Le contact
 * de l'annonceur, jamais publié, n'est lisible qu'ici.
 */
interface PendingOffer {
  id: string;
  type: string;
  level: string;
  category: string;
  title: string;
  company: string;
  location: string | null;
  apply_url: string;
  deadline: string | null;
  posted_at: string;
  vitae_offer_submissions: { contact: string } | { contact: string }[] | null;
}

export default async function AdminOffresPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from('vitae_job_offers')
    .select('id, type, level, category, title, company, location, apply_url, deadline, posted_at, vitae_offer_submissions(contact)')
    .eq('status', 'pending')
    .order('posted_at', { ascending: true })
    .limit(100);
  const offers = (data as PendingOffer[] | null) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Offres à valider</h1>
      {error !== null ? (
        <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm">Lecture impossible ({error.message}).</p>
      ) : offers.length === 0 ? (
        <p className="text-muted">Aucune offre en attente.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {offers.map((o) => {
            const sub = Array.isArray(o.vitae_offer_submissions)
              ? o.vitae_offer_submissions[0]
              : o.vitae_offer_submissions;
            return (
              <li key={o.id} className="card flex flex-col gap-2 p-4">
                <p className="text-xs text-muted">
                  Déposée le {formatLongDate(o.posted_at)} · {o.type === 'stage' ? 'Stage' : 'Emploi'}
                  {' · '}{JOB_LEVELS[o.level] ?? o.level} · {jobCategoryLabel(o.category)}
                </p>
                <h2 className="font-semibold">{o.title}</h2>
                <p className="text-sm text-muted">{[o.company, o.location].filter(Boolean).join(' · ')}</p>
                <p className="break-all text-sm">
                  Candidature :{' '}
                  <a className="underline" href={o.apply_url} target="_blank" rel="noopener noreferrer">{o.apply_url}</a>
                </p>
                {o.deadline === null ? null : <p className="text-sm">Date limite : {formatLongDate(o.deadline)}</p>}
                <p className="text-sm">Contact (non publié) : {sub?.contact ?? '—'}</p>
                <form action={moderateOffer} className="mt-2 flex gap-2">
                  <input type="hidden" name="id" value={o.id} />
                  <button name="decision" value="publier" className="min-h-11 flex-1 rounded-full bg-accent px-4 text-sm font-semibold text-header">
                    Publier
                  </button>
                  <button name="decision" value="refuser" className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold">
                    Refuser
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
