import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/tontines/screens/create_tontine_screen.dart';
import '../../features/tontines/screens/home_screen.dart';
import '../../features/tontines/screens/join_tontine_screen.dart';
import '../../features/tontines/screens/members_screen.dart';
import '../../features/tontines/screens/history_screen.dart';
import '../../features/tontines/screens/notifications_screen.dart';
import '../../features/tontines/screens/record_payment_screen.dart';
import '../../features/tontines/screens/reorder_beneficiaires_screen.dart';
import '../../features/tontines/screens/settings_screen.dart';
import '../../features/tontines/screens/splash_screen.dart';
import '../../features/tontines/screens/tontine_detail_screen.dart';
import '../providers.dart';

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
      GoRoute(
        path: '/create-tontine',
        builder: (context, state) => const CreateTontineScreen(),
      ),
      GoRoute(
        path: '/join-tontine',
        builder: (context, state) => const JoinTontineScreen(),
      ),
      GoRoute(
        path: '/tontine/:id',
        builder: (context, state) =>
            TontineDetailScreen(tontineId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/tontine/:id/members',
        builder: (context, state) =>
            MembersScreen(tontineId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/tontine/:id/tour/:tourId',
        builder: (context, state) => RecordPaymentScreen(
          tontineId: state.pathParameters['id']!,
          tourId: state.pathParameters['tourId']!,
        ),
      ),
      GoRoute(
        path: '/tontine/:id/reorder',
        builder: (context, state) =>
            ReorderBeneficiairesScreen(tontineId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/history',
        builder: (context, state) {
          final tontineId = state.uri.queryParameters['tontineId'];
          final tontineName = state.uri.queryParameters['tontineName'];
          return HistoryScreen(tontineId: tontineId, tontineName: tontineName);
        },
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
    ],
    redirect: (context, state) {
      final loggedIn = isLoggedIn;
      final isAuthRoute = state.matchedLocation == '/' ||
          state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';

      if (!loggedIn && !isAuthRoute) {
        return '/login';
      }

      if (loggedIn && isAuthRoute && state.matchedLocation != '/') {
        return '/home';
      }

      return null;
    },
  );
});