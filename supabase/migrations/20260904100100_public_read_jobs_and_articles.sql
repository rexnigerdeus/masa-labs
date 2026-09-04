-- ============================================================
-- Offres et articles consultables sans compte
--
-- Le front web n'exige un compte qu'au téléchargement du CV. Les sections
-- Offres et Conseils doivent donc s'afficher pour un visiteur anonyme, y
-- compris pour être indexées par les moteurs de recherche — c'est un canal
-- d'acquisition, pas une zone réservée.
--
-- Les policies existantes ne visent que le rôle `authenticated` (voir
-- supabase-schema.sql) : on ajoute `anon` en lecture seule, sans toucher aux
-- droits d'écriture, qui restent réservés au scraper et à la clé de service.
-- ============================================================

drop policy if exists "Anon can view job offers" on public.vitae_job_offers;
create policy "Anon can view job offers"
  on public.vitae_job_offers for select
  to anon
  using (true);

drop policy if exists "Anon can view articles" on public.vitae_articles;
create policy "Anon can view articles"
  on public.vitae_articles for select
  to anon
  using (true);
