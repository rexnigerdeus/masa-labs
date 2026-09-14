import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/habit_models.dart';
import '../../shared/widgets/groot_mascot.dart';

/// Accroche (§6.A.2) : "Des habitudes illimitées, une créature qui
/// grandit avec toi."
class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const Spacer(),
              const GrootMascot(stage: MascotStage.jeuneArbre, size: 180),
              const SizedBox(height: 32),
              Text(
                'Des habitudes illimit\u00e9es,\nune cr\u00e9ature qui grandit avec toi.',
                style: theme.textTheme.headlineLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'Chaque petite habitude est une graine. Groot grandit avec toi, jamais contre toi.',
                style: theme.textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              // Différenciateur central (§1) : illimité dès le départ,
              // jamais de limite artificielle pour forcer l'abonnement.
              _Pillar(
                icon: Icons.all_inclusive,
                text: 'Habitudes illimit\u00e9es, gratuitement, pour toujours',
              ),
              const SizedBox(height: 12),
              _Pillar(
                icon: Icons.pets,
                text: 'Une cr\u00e9ature vivante qui pousse avec ta constance',
              ),
              const SizedBox(height: 12),
              _Pillar(
                icon: Icons.eco,
                text: 'Construire, arr\u00eater, cr\u00e9er — trois familles, une for\u00eat',
              ),
              const SizedBox(height: 32),
              FilledButton(
                onPressed: () => context.go('/inscription'),
                child: const Text('Commencer \u2014 c\u2019est gratuit'),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => context.go('/connexion'),
                child: const Text('J\u2019ai d\u00e9j\u00e0 un compte'),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _Pillar extends StatelessWidget {
  const _Pillar({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Icon(icon, color: theme.colorScheme.primary, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Text(text, style: theme.textTheme.bodyMedium),
        ),
      ],
    );
  }
}