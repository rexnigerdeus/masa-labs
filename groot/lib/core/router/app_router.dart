import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/auth/screens/splash_screen.dart';
import '../../features/auth/screens/welcome_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/onboarding/screens/onboarding_screen.dart';
import '../../features/today/screens/today_screen.dart';
import '../../features/jardin/screens/jardin_screen.dart';
import '../../features/stats/screens/stats_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/habit_detail/screens/habit_detail_screen.dart';
import '../providers.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();

/// Router Groot — 4 zones (Aujourd'hui / Jardin / Stats / Réglages,
/// design system §6) + onboarding + auth.
final goRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/splash',
    redirect: (context, state) {
      final user =
          authState.value?.session?.user ?? Supabase.instance.client.auth.currentUser;
      final loggingIn = state.matchedLocation == '/connexion' ||
          state.matchedLocation == '/inscription' ||
          state.matchedLocation == '/bienvenue' ||
          state.matchedLocation == '/splash';
      final onboarded = ref.read(grootProfileProvider)?.onboardingCompleted ?? false;

      if (user == null) {
        return loggingIn ? null : '/bienvenue';
      }
      if (loggingIn && state.matchedLocation != '/splash') {
        // Connecté mais onboarding incomplet → onboarding d'abord.
        return onboarded ? '/aujourdhui' : '/onboarding';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/bienvenue',
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: '/connexion',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/inscription',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      // Coquille à onglets persistants : chaque zone garde son état.
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            GrootShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/aujourdhui',
                builder: (context, state) => const TodayScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/jardin',
                builder: (context, state) => const JardinScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/stats',
                builder: (context, state) => const StatsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/reglages',
                builder: (context, state) => const SettingsScreen(),
              ),
            ],
          ),
        ],
      ),
      // Hors coquille : détail d'habitude plein écran.
      GoRoute(
        path: '/habitude/:clientId',
        parentNavigatorKey: rootNavigatorKey,
        builder: (context, state) => HabitDetailScreen(
          clientId: state.pathParameters['clientId']!,
        ),
      ),
    ],
  );
});

/// Coquille commune : bottom nav 4 zones (design system §6.1).
class GrootShell extends StatelessWidget {
  const GrootShell({super.key, required this.navigationShell});
  final StatefulNavigationShell navigationShell;

  static const _tabs = [
    ('/aujourdhui', 'Aujourd\u2019hui', Icons.eco_outlined),
    ('/jardin', 'Jardin', Icons.park_outlined),
    ('/stats', 'Stats', Icons.insights_outlined),
    ('/reglages', 'R\u00e9glages', Icons.settings_outlined),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (i) => navigationShell.goBranch(
          i,
          initialLocation: i == navigationShell.currentIndex,
        ),
        destinations: [
          for (final (_, label, icon) in _tabs)
            NavigationDestination(
              icon: Icon(icon, color: theme.colorScheme.onSurface),
              selectedIcon: Icon(icon, color: theme.colorScheme.primary),
              label: label,
            ),
        ],
      ),
    );
  }
}