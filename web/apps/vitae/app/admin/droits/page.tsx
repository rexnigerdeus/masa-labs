import { requireAdmin } from '../../../lib/admin';
import { grantEntitlementManually, revokeEntitlement } from '../../../lib/adminActions';
import { formatLongDate } from '../../../lib/catalog';
import { OFFERS, formatFcfa, isOffer } from '../../../lib/payments';

/**
 * Paiements et droits (brief v2, paiement, étape 6). Un remboursement se fait
 * dans l'espace marchand Wave ; ici, on retire ensuite le droit, ce qui
 * marque aussi le paiement comme remboursé.
 */
interface Entitlement {
  id: string;
  user_id: string;
  type: string;
  credits_left: number | null;
  starts_at: string;
  ends_at: string | null;
  revoked_at: string | null;
  payment_id: string | null;
}

interface Payment {
  id: string;
  offer: string;
  amount_xof: number;
  status: string;
  provider_ref: string | null;
  created_at: string;
}

const STATUS: Record<string, string> = {
  pending: 'en attente',
  succeeded: 'payé',
  failed: 'échoué',
  cancelled: 'annulé',
  refunded: 'remboursé',
};

export default async function AdminDroitsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: ents, error }, { data: pays }] = await Promise.all([
    supabase
      .from('vitae_entitlements')
      .select('id, user_id, type, credits_left, starts_at, ends_at, revoked_at, payment_id')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('vitae_payments')
      .select('id, offer, amount_xof, status, provider_ref, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  const entitlements = (ents as Entitlement[] | null) ?? [];
  const payments = (pays as Payment[] | null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Droits et paiements</h1>
      {error !== null ? (
        <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm">
          Lecture impossible ({error.message}). La migration 20261018120100_vitae_lot_b.sql est-elle appliquée ?
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Droits</h2>
        {entitlements.length === 0 ? <p className="text-sm text-muted">Aucun droit accordé.</p> : (
          <ul className="flex flex-col gap-2">
            {entitlements.map((e) => (
              <li key={e.id} className="card flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                <span>
                  <strong>{isOffer(e.type) ? OFFERS[e.type].name : e.type}</strong>
                  {' · '}compte {e.user_id.slice(0, 8)}…
                  {e.type === 'cv_credit' ? ` · ${e.credits_left ?? 0} crédit restant` : ''}
                  {e.ends_at === null ? '' : ` · jusqu’au ${formatLongDate(e.ends_at)}`}
                  {e.payment_id === null ? ' · accordé à la main' : ''}
                  {e.revoked_at === null ? '' : ` · retiré le ${formatLongDate(e.revoked_at)}`}
                </span>
                {e.revoked_at === null ? (
                  <form action={revokeEntitlement}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="min-h-11 rounded-full border border-danger/40 px-4 font-semibold text-danger">
                      Retirer le droit
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={grantEntitlementManually} className="card flex flex-wrap items-end gap-3 p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Identifiant du compte</span>
          <input name="user_id" required className="min-h-11 w-80 max-w-full rounded-xl border border-line bg-white px-3 font-mono text-sm" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Droit</span>
          <select name="type" className="min-h-11 rounded-xl border border-line bg-white px-3">
            <option value="cv_credit">Crédit CV</option>
            <option value="pass_candidature">Pass Candidature (30 jours)</option>
          </select>
        </label>
        <button className="min-h-11 rounded-full bg-header px-5 text-sm font-semibold text-white">Accorder à la main</button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Paiements</h2>
        {payments.length === 0 ? <p className="text-sm text-muted">Aucun paiement.</p> : (
          <ul className="flex flex-col gap-2">
            {payments.map((p) => (
              <li key={p.id} className="card p-3 text-sm">
                {formatLongDate(p.created_at)} · {isOffer(p.offer) ? OFFERS[p.offer].name : p.offer}
                {' · '}{formatFcfa(p.amount_xof)} · {STATUS[p.status] ?? p.status}
                {p.provider_ref === null ? '' : ` · Wave ${p.provider_ref}`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
