-- ============================================================
-- MIGRATION: Contrainte anti-fake sur apply_url
-- Garantit que chaque offre de vitae_job_offers pointe vers la
-- page de CANDIDATURE RÉELLE de l'offre (avec identifiant unique),
-- jamais vers une page de listing générique.
--
-- ⚠️ À exécuter dans le SQL Editor de Supabase Dashboard.
-- ============================================================

-- 1. Supprimer les offres existantes avec un lien générique/fake
--    (celles insérées par l'ancien scraper avec applyUrl par défaut
--    "https://jobivoire.com/offres" ou pages de listing)
delete from public.vitae_job_offers
where apply_url ~ '(jobivoire\.com|emploi\.ci)'
   or apply_url ~ 'linkedin\.com/jobs/search'
   or apply_url ~ 'novojob\.com/[a-z-]+/offres-d-emploi(/stages)?$'
   or length(apply_url) <= 20;

-- 2. Ajouter la contrainte CHECK sur apply_url
--    (drop d'abord si elle existe déjà, pour idempotence)
alter table public.vitae_job_offers
  drop constraint if exists vitae_job_offers_apply_url_direct;

alter table public.vitae_job_offers
  add constraint vitae_job_offers_apply_url_direct check (
    apply_url ~ '^https?://'
    and length(apply_url) > 20
    and (
      apply_url ~ '/jobs/view/.+[0-9]{6,}'                 -- LinkedIn offre
      or apply_url ~ '/offre-d-emploi/.+[0-9]+-'          -- Novojob offre
      or apply_url ~ '^mailto:'                            -- candidature email
      or (
        apply_url !~ '(jobivoire\.com|emploi\.ci)'        -- domaines fake bannis
        and apply_url !~ '(linkedin\.com/jobs/search|novojob\.com/[a-z-]+/offres-d-emploi(/stages)?)'
        and split_part(split_part(apply_url, '://', 2), '/', 2) != ''
      )
    )
  );

-- 3. Vérification : afficher les offres restantes (toutes avec lien direct)
select id, title, company, apply_url
from public.vitae_job_offers
order by posted_at desc
limit 20;

-- Compter les offres valides par type
select type, count(*) as valides
from public.vitae_job_offers
group by type;