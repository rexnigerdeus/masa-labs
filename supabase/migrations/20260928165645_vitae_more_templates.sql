-- ============================================================
-- Vitae : quatre modèles de CV de plus
-- ============================================================
-- Horizon, Atelier, Parcours et Élégance rejoignent les quatre modèles
-- d'origine (packages/cv-core/src/templates.ts). La contrainte posée par
-- 20260904100000_vitae_web_resumes.sql n'acceptait que les quatre premiers :
-- enregistrer un CV sur un nouveau modèle aurait échoué en silence côté
-- synchronisation.
--
-- La contrainte était anonyme : on retrouve son nom plutôt que de deviner
-- celui que Postgres lui a donné.
-- ============================================================

do $$
declare
  existing text;
begin
  select con.conname into existing
  from pg_constraint con
  join pg_attribute att
    on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
  where con.conrelid = 'public.vitae_resumes'::regclass
    and con.contype = 'c'
    and att.attname = 'template_id';

  if existing is not null then
    execute format('alter table public.vitae_resumes drop constraint %I', existing);
  end if;
end $$;

alter table public.vitae_resumes
  add constraint vitae_resumes_template_id_check
  check (template_id in (
    'classique', 'sobre', 'compact', 'stage',
    'horizon', 'atelier', 'parcours', 'elegance'
  ));
