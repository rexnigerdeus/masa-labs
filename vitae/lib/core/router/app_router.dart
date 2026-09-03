import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/screens/splash_screen.dart';
import '../../features/auth/screens/welcome_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/auth/screens/objectif_screen.dart';
import '../../features/dashboard/screens/dashboard_screen.dart';
import '../../features/dashboard/screens/conseils_screen.dart';
import '../../features/resources/screens/resources_screen.dart';
import '../../features/resources/screens/resource_detail_screen.dart';
import '../../features/jobs/screens/jobs_screen.dart';
import '../../features/jobs/screens/job_detail_screen.dart';
import '../../features/cv/screens/create_cv_screen.dart';
import '../../features/cv/screens/edit_cv_screen.dart';
import '../../features/cv/screens/cv_detail_screen.dart';
import '../../features/cv/screens/export_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/subscription/screens/paywall_screen.dart';
import '../providers.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  final isLoggedIn = ref.watch(isLoggedInProvider);

  return GoRouter(
    initialLocation: '/',
    routes: [
      // Onboarding
      GoRoute(path: '/', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/welcome', builder: (context, state) => const WelcomeScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      GoRoute(path: '/onboarding/objectif', builder: (context, state) => const ObjectifScreen()),

      // Dashboard
      GoRoute(path: '/dashboard', builder: (context, state) => const DashboardScreen()),
      GoRoute(path: '/conseils', builder: (context, state) => const ConseilsScreen()),

      // Resources (articles édifiants)
      GoRoute(path: '/resources', builder: (context, state) => const ResourcesScreen()),
      GoRoute(
        path: '/resources/:id',
        builder: (context, state) =>
            ResourceDetailScreen(resourceId: state.pathParameters['id']!),
      ),

      // Jobs (offres d'emploi / stage)
      GoRoute(path: '/jobs', builder: (context, state) => const JobsScreen()),
      GoRoute(
        path: '/jobs/:id',
        builder: (context, state) =>
            JobDetailScreen(jobId: state.pathParameters['id']!),
      ),

      // CV
      GoRoute(path: '/cv/create', builder: (context, state) => const CreateCvScreen()),
      GoRoute(
        path: '/cv/:id',
        builder: (context, state) => CvDetailScreen(cvId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/cv/:id/edit/:step',
        builder: (context, state) => EditCvScreen(
          cvId: state.pathParameters['id']!,
          initialStep: state.pathParameters['step']!,
        ),
      ),
      GoRoute(
        path: '/cv/:id/export',
        builder: (context, state) => ExportScreen(cvId: state.pathParameters['id']!),
      ),

      // Settings & Paywall
      GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
      GoRoute(path: '/paywall', builder: (context, state) => const PaywallScreen()),
    ],
    redirect: (context, state) {
      // Routes qui nécessitent une authentification
      final protectedRoutes = ['/dashboard', '/cv', '/settings', '/conseils', '/resources', '/jobs', '/paywall'];
      final isProtected = protectedRoutes.any((route) => state.matchedLocation.startsWith(route));

      if (isProtected && !isLoggedIn) {
        return '/welcome';
      }
      return null;
    },
  );
});