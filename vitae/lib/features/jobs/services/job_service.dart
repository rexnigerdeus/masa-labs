import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/job_model.dart';

/// Service pour les offres d'emploi et de stage (Vitae)
class JobService {
  final SupabaseClient _client = Supabase.instance.client;

  /// Récupère toutes les offres, filtrées par type et/ou catégorie
  Future<List<JobOffer>> getJobs({
    JobType? type,
    JobCategory? category,
  }) async {
    try {
      final result = await _client
          .from('vitae_job_offers')
          .select()
          .order('posted_at', ascending: false);

      var jobs = (result as List)
          .map((e) => JobOffer.fromJson(e as Map<String, dynamic>))
          .toList();

      if (type != null) {
        jobs = jobs.where((j) => j.type == type).toList();
      }
      if (category != null) {
        jobs = jobs.where((j) => j.category == category).toList();
      }

      // Si Supabase ne renvoie rien, on utilise le fallback local
      if (jobs.isEmpty) {
        return _fallbackJobs(type: type, category: category);
      }

      return jobs;
    } catch (_) {
      return _fallbackJobs(type: type, category: category);
    }
  }

  List<JobOffer> _fallbackJobs({JobType? type, JobCategory? category}) {
    // Le fallback ne contient QUE des redirections réelles et vérifiées
    // vers les plateformes d'emploi CI actives — jamais d'offres inventées.
    // Le scraper quotidien (Edge Function scrape-job-offers) peuple
    // vitae_job_offers avec de vraies offres + liens de candidature exacts.
    var jobs = fallbackJobs;
    if (type != null) {
      jobs = jobs.where((j) => j.type == type).toList();
    }
    if (category != null) {
      jobs = jobs.where((j) => j.category == category).toList();
    }
    return jobs;
  }

  Future<JobOffer?> getJob(String id) async {
    try {
      final result = await _client
          .from('vitae_job_offers')
          .select()
          .eq('id', id)
          .maybeSingle();

      if (result == null) {
        return fallbackJobs.where((j) => j.id == id).firstOrNull;
      }
      return JobOffer.fromJson(result);
    } catch (_) {
      return fallbackJobs.where((j) => j.id == id).firstOrNull;
    }
  }
}

/// Fallback — redirections réelles vers les plateformes d'emploi CI
/// actives (vérifiées 2026-08-30).
///
/// ⚠️ PAS d'offres inventées ici. Les vraies offres (avec lien de
/// candidature exact) sont scrapées toutes les 24h par l'Edge Function
/// `scrape-job-offers` (LinkedIn Guest API + Novojob CI) dans la table
/// `vitae_job_offers`. Ce fallback n'affiche que des liens de recherche
/// réels, utiles si l'utilisateur est hors-ligne à la première ouverture.
final List<JobOffer> fallbackJobs = [
  JobOffer(
    id: 'fb-emplois-linkedin',
    type: JobType.emploi,
    category: JobCategory.autre,
    title: 'Rechercher les offres d\'emploi en Côte d\'Ivoire',
    company: 'LinkedIn Jobs',
    location: 'Côte d\'Ivoire',
    description:
        'LinkedIn référence chaque jour des dizaines d\'offres d\'emploi '
        'en Côte d\'Ivoire : tech, finance, commercial, BTP, santé...\n\n'
        'Reconnectez-vous à Internet pour voir les offres du jour '
        'récupérées automatiquement dans Vitae, ou consultez LinkedIn '
        'directement.',
    contractType: 'Tous contrats',
    postedAt: DateTime.now(),
    applyUrl:
        'https://www.linkedin.com/jobs/search?location=Cote%20d%27Ivoire',
  ),
  JobOffer(
    id: 'fb-emplois-novojob',
    type: JobType.emploi,
    category: JobCategory.autre,
    title: 'Offres d\'emploi du jour — Novojob Côte d\'Ivoire',
    company: 'Novojob',
    location: 'Côte d\'Ivoire',
    description:
        'Novojob est l\'un des principaux portails d\'emploi en Côte '
        'd\'Ivoire : des dizaines d\'offres vérifiées publiées chaque '
        'semaine par des entreprises locales (SOLIBRA, YESHI GROUP, '
        'banques, industrie...).\n\n'
        'Reconnectez-vous à Internet pour voir les offres du jour '
        'récupérées automatiquement dans Vitae, ou consultez Novojob '
        'directement.',
    contractType: 'Tous contrats',
    postedAt: DateTime.now(),
    applyUrl: 'https://www.novojob.com/cote-d-ivoire/offres-d-emploi',
  ),
  JobOffer(
    id: 'fb-stages-linkedin',
    type: JobType.stage,
    category: JobCategory.autre,
    title: 'Rechercher les stages en Côte d\'Ivoire',
    company: 'LinkedIn Jobs',
    location: 'Côte d\'Ivoire',
    description:
        'Recherche de stages en Côte d\'Ivoire : finance, marketing, '
        'informatique, juridique, ingénierie...\n\n'
        'Reconnectez-vous à Internet pour voir les stages du jour '
        'récupérés automatiquement dans Vitae, ou consultez LinkedIn '
        'directement.',
    contractType: 'Stage',
    postedAt: DateTime.now(),
    applyUrl:
        'https://www.linkedin.com/jobs/search?keywords=stage&location=Cote%20d%27Ivoire',
  ),
];