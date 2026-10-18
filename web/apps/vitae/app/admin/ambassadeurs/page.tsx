import { requireAdmin } from '../../../lib/admin';
import { createAmbassador, toggleAmbassador } from '../../../lib/adminActions';
import { APP_URL } from '../../../lib/config';

/**
 * Codes ambassadeurs (brief v2, « Gestion des codes »). Le lien de suivi est
 * affiché complet, jeton compris, pour être remis à la main : c'est la seule
 * page où il se lit. Le lien avec `?ref=` est celui que l'ambassadeur partage.
 */
interface Ambassador {
  code: string;
  first_name: string;
  school: string | null;
  active: boolean;
  token: string;
}

const input = 'min-h-11 rounded-xl border border-line bg-white px-3 text-base';

export default async function AdminAmbassadeursPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from('vitae_ambassadors')
    .select('code, first_name, school, active, token')
    .order('created_at', { ascending: false });
  const list = (data as Ambassador[] | null) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">Ambassadeurs</h1>

      <form action={createAmbassador} className="card flex flex-wrap items-end gap-3 p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Code</span>
          <input name="code" required placeholder="INJS-AMINA" className={input} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Prénom</span>
          <input name="first_name" required className={input} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">École</span>
          <input name="school" placeholder="INJS" className={input} />
        </label>
        <button type="submit" className="min-h-11 rounded-full bg-header px-5 text-sm font-semibold text-white">
          Créer
        </button>
      </form>

      {error !== null ? (
        <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm">Lecture impossible ({error.message}).</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((a) => (
            <li key={a.code} className="card flex flex-col gap-1.5 p-4 text-sm">
              <p className="font-semibold">
                {a.code} · {a.first_name}{a.school === null ? '' : ` · ${a.school}`}{a.active ? '' : ' (inactif)'}
              </p>
              <p className="break-all text-muted">Lien à partager : {APP_URL}/?ref={a.code}</p>
              <p className="break-all text-muted">
                Son tableau, à remettre à la main : {APP_URL}/ambassadeur/{a.code}?t={a.token}
              </p>
              <form action={toggleAmbassador}>
                <input type="hidden" name="code" value={a.code} />
                <input type="hidden" name="active" value={a.active ? 'false' : 'true'} />
                <button className="min-h-11 text-sm font-semibold underline">
                  {a.active ? 'Désactiver' : 'Réactiver'}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
