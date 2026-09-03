import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/auth/services/auth_service.dart';
import '../../features/tontines/services/plan_service.dart';
import '../../features/tontines/services/tontine_service.dart';

// Provider pour le AuthService
final authServiceProvider = Provider((ref) => AuthService());

// Provider pour le TontineService
final tontineServiceProvider = Provider((ref) => TontineService());

// Provider pour le PlanService
final planServiceProvider = Provider((ref) => PlanService());

// Provider du plan actuel (recharge quand l'auth change)
final currentPlanProvider = FutureProvider<String>((ref) async {
  // Recharge quand l'auth change
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