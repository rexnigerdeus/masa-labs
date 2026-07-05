import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/auth/services/auth_service.dart';
import '../../features/tontines/screens/home_screen.dart';
import '../../features/tontines/screens/splash_screen.dart';

// Provider pour le AuthService
final authServiceProvider = Provider((ref) => AuthService());

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

final goRouterProvider = Provider<GoRouter>((ref) {
  final isLoggedIn = ref.watch(isLoggedInProvider);

  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomeScreen(),
      ),
    ],
    redirect: (context, state) {
      final loggedIn = isLoggedIn;
      final isAuthRoute = state.matchedLocation == '/' ||
          state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';

      // Si pas connecté et pas sur une route auth → rediriger vers login
      if (!loggedIn && !isAuthRoute) {
        return '/login';
      }

      // Si connecté et sur une route auth (sauf splash) → rediriger vers home
      if (loggedIn && isAuthRoute && state.matchedLocation != '/') {
        return '/home';
      }

      return null;
    },
  );
});