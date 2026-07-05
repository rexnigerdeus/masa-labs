import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/auth/services/auth_service.dart';
import '../../features/tontines/services/tontine_service.dart';

// Provider pour le AuthService
final authServiceProvider = Provider((ref) => AuthService());

// Provider pour le TontineService
final tontineServiceProvider = Provider((ref) => TontineService());

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