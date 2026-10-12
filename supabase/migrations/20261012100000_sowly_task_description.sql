-- ============================================================
-- MIGRATION: Sowly — description des tâches
--
-- Une note libre sous le titre d'une tâche (détail de la tâche).
-- Chaîne vide plutôt que NULL : l'app n'a qu'un seul « vide » à gérer.
--
-- Ordre de déploiement indifférent : tant que cette colonne manque,
-- l'app la retire de ses requêtes et masque le champ (voir
-- web/apps/sowly/lib/sync.ts, OPTIONAL_COLUMNS) ; dès qu'elle existe,
-- le champ réapparaît au lancement suivant.
-- ============================================================

alter table public.sowly_tasks
  add column if not exists description text not null default ''
    check (length(description) <= 2000);

-- PostgREST relit le schéma : sans cela, l'API ignorerait la colonne
-- jusqu'au prochain redémarrage.
notify pgrst, 'reload schema';
