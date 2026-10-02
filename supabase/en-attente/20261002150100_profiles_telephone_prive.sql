-- ============================================================
-- Durcissement de sécurité — partie 2 : le téléphone n'est plus lisible
-- dans `profiles`
--
-- ⚠️ À appliquer APRÈS la mise en ligne des versions de Hive (web) et de
-- Rondo (Flutter) qui lisent les numéros par les fonctions de la partie 1.
-- Appliquée avant, la version en ligne de Hive échoue sur /compte et
-- /mes-commandes (« permission denied for column phone »).
--
-- Le trou : la policy « Hive: read profiles of listing owners » ouvre la
-- ligne entière de `profiles` à tout utilisateur connecté — et un compte se
-- crée sans SMS, en dix secondes. N'importe qui pouvait donc moissonner le
-- numéro de tous les loueurs, alors que Hive ne l'affiche qu'aux deux
-- parties d'une commande confirmée. La RLS s'arrête à la ligne ; c'est donc
-- le droit sur la colonne qu'on retire, à `authenticated` comme il l'avait
-- déjà été à `anon` (20260906120000_hive_lot1.sql).
--
-- Qui lit encore un numéro, et comment :
--   - soi-même : il est dans le pseudo-email du compte (`0700000000@everyday.co`),
--     les apps le lisent là ;
--   - les co-membres d'une tontine Rondo : `rondo_telephones(tontine)` ;
--   - les parties d'une commande Hive confirmée : `hive_telephones_commandes(ids)`.
--
-- Au passage, l'écriture se limite aux colonnes qu'un utilisateur a des
-- raisons de changer : son nom et sa photo. Le téléphone est son
-- identifiant, posé par `handle_new_user` à l'inscription ; le modifier ici
-- permettait d'afficher le numéro de quelqu'un d'autre sur son profil.
--
-- Rappel Postgres : retirer un droit sur la table retire aussi les droits
-- colonne par colonne ; on rend ensuite exactement ceux qu'on veut.
-- ============================================================

revoke all on public.profiles from anon, authenticated;

grant select (id, full_name, avatar_url, created_at, updated_at)
  on public.profiles to anon, authenticated;

grant update (full_name, avatar_url, updated_at)
  on public.profiles to authenticated;
