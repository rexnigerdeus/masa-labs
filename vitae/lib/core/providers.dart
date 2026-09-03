import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/auth/services/auth_service.dart';
import '../../features/cv/models/cv_model.dart';
import '../../features/cv/services/ats_score_service.dart';
import '../../features/cv/services/cv_service.dart';
import '../../features/subscription/services/plan_service.dart';
import '../../features/resources/models/resource_model.dart';
import '../../features/resources/services/resource_service.dart';
import '../../features/jobs/models/job_model.dart';
import '../../features/jobs/services/job_service.dart';

// Provider pour le AuthService
final authServiceProvider = Provider((ref) => AuthService());

// Provider pour le CvService
final cvServiceProvider = Provider((ref) => CvService());

// Provider pour le PlanService
final planServiceProvider = Provider((ref) => PlanService());

// Provider pour le AtsScoreService
final atsScoreServiceProvider = Provider((ref) => AtsScoreService());

// Provider pour le ResourceService
final resourceServiceProvider = Provider((ref) => ResourceService());

// Provider pour le JobService
final jobServiceProvider = Provider((ref) => JobService());

/// Provider calculant le score ATS d'un CV.
/// Recalcule quand le CV change — passer un [cvKey] qui évol avec le contenu
/// (nombre de sections + longueur des données) pour forcer le recalcul
/// quand une section existante est modifiée (pas juste ajout/supprimée).
final atsScoreProvider =
    Provider.family<AtsResult, ({Cv cv, int cvKey})>((ref, params) {
  final service = ref.read(atsScoreServiceProvider);
  return service.calculateScore(params.cv);
});

/// Génère une clé de cache qui change quand le contenu du CV change.
/// Sert de cvKey pour [atsScoreProvider] : nombre de sections + somme des
/// longueurs des JSON de chaque section + templateId + couleur.
/// Suffisamment granulaire pour capter une édition de contenu sans être
/// trop fin (pas de recalcul à chaque caractère tapé — on reste sur la
/// granularité "section sauvegardée").
int atsCvKey(Cv cv) {
  int key = cv.templateId * 1000 + cv.sections.length;
  for (final s in cv.sections) {
    key += s.donnees.length;
    key += (s.donnees['items'] as List?)?.length ?? 0;
  }
  // Inclure la couleur principale (change le rendu mais pas le score —
  // c'est volontaire : on veut pas recalculer le score juste pour une couleur)
  return key;
}

// Provider du plan actuel (recharge quand l'auth change)
final currentPlanProvider = FutureProvider<String>((ref) async {
  ref.watch(authStateProvider);
  final service = ref.read(planServiceProvider);
  return service.getCurrentPlan();
});

// Provider qui écoute l'état d'auth Supabase
final authStateProvider = StreamProvider<AuthState>((ref) {
  return Supabase.instance.client.auth.onAuthStateChange;
});

// Provider pour savoir si l'user est connecté
final isLoggedInProvider = Provider<bool>((ref) {
  final authState = ref.watch(authStateProvider);
  return authState.maybeWhen(
    data: (state) => state.session != null,
    orElse: () => Supabase.instance.client.auth.currentSession != null,
  );
});

// Provider pour la liste des CVs de l'utilisateur
final myCvsProvider = FutureProvider((ref) async {
  // Recharger quand l'auth change
  ref.watch(authStateProvider);
  final service = ref.read(cvServiceProvider);
  return service.getMyCvs();
});

// Provider pour les templates
final templatesProvider = FutureProvider((ref) async {
  final service = ref.read(cvServiceProvider);
  return service.getTemplates();
});

// ============================================================
// Providers — Resources (articles édifiants)
// ============================================================

/// Provider family pour la liste des articles, optionnellement filtrée
/// par catégorie. Passer `null` pour tous les articles.
final resourcesProvider =
    FutureProvider.family<List<Resource>, ResourceCategory?>((ref, category) async {
  final service = ref.read(resourceServiceProvider);
  return service.getResources(category: category);
});

/// Provider family pour un article individuel par ID
final resourceProvider =
    FutureProvider.family<Resource?, String>((ref, id) async {
  final service = ref.read(resourceServiceProvider);
  return service.getResource(id);
});

// ============================================================
// Providers — Jobs (offres d'emploi / stage)
// ============================================================

/// Provider family pour la liste des offres, filtrées par type + catégorie.
/// Passer `null` pour ignorer un filtre.
final jobsProvider =
    FutureProvider.family<List<JobOffer>, ({JobType? type, JobCategory? category})>(
        (ref, params) async {
  final service = ref.read(jobServiceProvider);
  return service.getJobs(type: params.type, category: params.category);
});

/// Provider family pour une offre individuelle par ID
final jobProvider =
    FutureProvider.family<JobOffer?, String>((ref, id) async {
  final service = ref.read(jobServiceProvider);
  return service.getJob(id);
});