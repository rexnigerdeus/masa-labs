import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/habit_models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/groot_theme.dart';
import '../../shared/widgets/groot_mascot.dart';

/// Le Jardin de Groot (Â§6.C) : Groot dans son environnement, stade
/// global + zone de personnalisation (pots, dÃ©cors, badges) + vue
/// d'ensemble de toutes les graines.
class JardinScreen extends ConsumerWidget {
  const JardinScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final stage = ref.watch(mascotStageProvider);
    final profile = ref.watch(grootProfileProvider);
    final badges = ref.watch(badgesProvider).value ?? [];
    final habits = ref.watch(habitsProvider).value ?? [];
    final unlockedCount = badges.where((b) => b.isUnlocked).length;

    return Scaffold(
      appBar: AppBar(
        title: Text('Le Jardin', style: theme.textTheme.headlineMedium),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        children: [
          const SizedBox(height: 8),
          // ---- Groot dans son environnement (Â§6.C) ----
          Center(
            child: Container(
              // L'environnement : une large feuille-mÃ©daille, rayon
              // "coin de feuille" (Â§3.2).
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                borderRadius: GrootTheme.cardLeaf,
                boxShadow: GrootTheme.warmShadow,
              ),
              child: GrootMascot(
                stage: stage,
                size: 160,
                decorations: profile?.decorations ?? const [],
                // Le jeune arbre penche au tap (Â§5).
                onTap: () => _nudge(context),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: Text(
              switch (stage) {
                MascotStage.graine => 'Groot dort encore \u2014 une graine patiente.',
                MascotStage.pousse => 'Une pousse pointe. Continue.',
                MascotStage.jeuneArbre => 'Regarde comme tu as grandi.',
                MascotStage.arbreAncien => 'Un arbre ancien veille sur ta for\u00eat \u2728',
              },
              style: theme.textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 24),
          // ---- Personnalisation : tout offert, aucun verrou premium ----
          Text('Ta collection', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          _DecorationRow(
            owned: profile?.decorations ?? const [],
            unlockedCount: unlockedCount,
            totalBadges: badges.length,
          ),
          const SizedBox(height: 24),
          // ---- Toutes les graines (Â§6.C : vue growth) ----
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Tes graines (${habits.length})',
                  style: theme.textTheme.titleMedium),
              if (habits.length > 5)
                Text('Illimit\u00e9es, toujours', style: theme.textTheme.bodySmall),
            ],
          ),
          const SizedBox(height: 8),
          ...habits.map(
            (h) => ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                h.family == HabitFamily.arreter
                    ? Icons.content_cut
                    : h.family == HabitFamily.creer
                        ? Icons.palette
                        : Icons.eco,
                color: h.family == HabitFamily.arreter
                    ? GrootTheme.bark600
                    : theme.colorScheme.primary,
              ),
              title: Text(h.name, style: theme.textTheme.bodyMedium),
              subtitle: Text(
                h.frozen
                    ? 'Gel\u00e9e \u2014 en pause sereine'
                    : '${h.currentStreak} j de suite \u2022 record ${h.bestStreak} j',
                style: theme.textTheme.bodySmall,
              ),
              onTap: () => context.go('/habitude/${h.clientId}'),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  void _nudge(BuildContext context) {
    // Groot fait un petit geste quand on le touche (Â§5 : "rÃ©agit").
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Groot fr\u00e9mit \u2014 content de te voir \ud83c\udf3f')),
    );
  }
}

/// Badge Chip (design system Â§6.5) : verrouillÃ© = silhouette Ã©corce Ã 
/// 40 % d'opacitÃ©, dÃ©bloquÃ© = couleur pleine + liserÃ© ambre.
class _DecorationRow extends StatelessWidget {
  const _DecorationRow({
    required this.owned,
    required this.unlockedCount,
    required this.totalBadges,
  });

  final List<String> owned;
  final int unlockedCount;
  final int totalBadges;

  static const _all = [
    ('pot-terracotta', 'Pot terracotta', Icons.local_florist_outlined),
    ('echarpe', '\u00c9charpe', Icons.checkroom),
    ('pot-ceramique', 'Pot c\u00e9ramique', Icons.local_cafe_outlined),
    ('lanterne', 'Lanterne', Icons.lightbulb_outline),
    ('lucioles', 'Lucioles', Icons.auto_awesome),
    ('feuillage-dore', 'Feuillage dor\u00e9', Icons.workspace_premium_outlined),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Text(
          '$unlockedCount badge${unlockedCount > 1 ? 's' : ''} sur $totalBadges',
          style: theme.textTheme.bodySmall,
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 108,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              for (final (id, label, icon) in _all)
                Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: Column(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          // DÃ©bloquÃ© : couleur + liserÃ© ambre (Â§6.5).
                          color: owned.contains(id)
                              ? theme.colorScheme.primary.withValues(alpha: 0.15)
                              : GrootTheme.bark600.withValues(alpha: 0.12),
                          border: owned.contains(id)
                              ? Border.all(
                                  color: GrootTheme.amber500, width: 2)
                              : null,
                        ),
                        child: Icon(
                          icon,
                          // VerrouillÃ© : silhouette 40 % (Â§6.5).
                          color: owned.contains(id)
                              ? theme.colorScheme.primary
                              : GrootTheme.bark600.withValues(alpha: 0.4),
                          size: 26,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(label, style: theme.textTheme.bodySmall),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}