import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/habit_models.dart';
import '../../shared/widgets/groot_mascot.dart';

/// Splash (§6.A.1) : une graine tombe, Groot germe. 2 secondes puis
/// le redirect d'auth prend le relais.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // Le temps de voir germer — le redirect du router enchaîne.
    Future.delayed(const Duration(milliseconds: 2200), () {
      if (mounted) context.go('/bienvenue');
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // La graine qui germe — une seule animation non déclenchée
            // par l'utilisateur par écran (design system §7).
            const GrootMascot(stage: MascotStage.graine, size: 150)
                .animate()
                .fadeIn(duration: 600.ms)
                .scale(
                  delay: 500.ms,
                  duration: 900.ms,
                  curve: Curves.easeOutBack,
                ),
            const SizedBox(height: 32),
            Text(
              'Groot Habits',
              style: theme.textTheme.headlineLarge,
            )
                .animate(delay: 800.ms)
                .fadeIn(duration: 500.ms)
                .slideY(begin: 0.3, end: 0),
            const SizedBox(height: 8),
            Text(
              'Des habitudes illimitées, une cr\u00e9ature qui grandit avec toi.',
              style: theme.textTheme.bodyMedium,
              textAlign: TextAlign.center,
            )
                .animate(delay: 1200.ms)
                .fadeIn(duration: 500.ms),
          ],
        ),
      ),
    );
  }
}