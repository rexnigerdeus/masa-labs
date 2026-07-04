import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/auth/screens/otp_verify_screen.dart';
import '../../features/tontines/screens/home_screen.dart';
import '../../features/tontines/screens/splash_screen.dart';

// Provider pour l'état d'auth
class AuthState extends Notifier<bool> {
  @override
  bool build() => false;

  void login() => state = true;
  void logout() => state = false;
}

final authStateProvider =
    NotifierProvider<AuthState, bool>(AuthState.new);

final goRouterProvider = Provider<GoRouter>((ref) {
  final isLoggedIn = ref.watch(authStateProvider);

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
        path: '/verify-otp',
        builder: (context, state) {
          final phone = state.uri.queryParameters['phone'] ?? '';
          return OtpVerifyScreen(phone: phone);
        },
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
          state.matchedLocation == '/register' ||
          state.matchedLocation == '/verify-otp';

      // Si pas connecté et pas sur une route auth → rediriger vers login
      if (!loggedIn && !isAuthRoute) {
        return '/login';
      }

      // Si connecté et sur une route auth → rediriger vers home
      if (loggedIn && isAuthRoute && state.matchedLocation != '/') {
        return '/home';
      }

      return null;
    },
  );
});