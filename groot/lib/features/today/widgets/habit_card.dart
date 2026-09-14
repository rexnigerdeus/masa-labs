import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/habit_models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/groot_theme.dart';

/// Habit Card (design system Â§6.2) : icÃ´ne zone + nom + grande case de
/// validation (min 44Ã—44px, Â§9) + micro-jauge de streak en fond, faÃ§on
/// "sÃ¨ve qui monte".
///
/// Interactions (brief Â§6.B) :
///   - tap sur la case â†’ validation avec micro-animation feuille ;
///   - swipe gauche â†’ note de journal attachÃ©e au jour (Â§6.B.3) ;
///   - tap sur la carte â†’ dÃ©tail.
class HabitCard extends ConsumerWidget {
  const HabitCard({
    super.key,
    required this.habit,
    required this.doneToday,
    required this.entryDates,
  });

  final Habit habit;
  final bool doneToday;
  final Set<String> entryDates;

  Future<void> _toggle(BuildContext context, WidgetRef ref) async {
    final service = ref.read(habitServiceProvider);
    final newlyBadges = await service.toggleToday(habit);
    if (!context.mounted) return;

    // Toast de validation (Â§6.6) : bandeau bas, disparaÃ®t, jamais bloquant.
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        duration: const Duration(seconds: 2),
        content: Row(
          children: [
            Icon(
              doneToday ? Icons.undo : Icons.eco,
              color: Theme.of(context).colorScheme.onPrimary,
              size: 18,
            ),
            const SizedBox(width: 10),
            // Ton de voix Groot (Â§5) : chaleureux, jamais culpabilisant.
            Expanded(
              child: Text(
                doneToday
                    ? 'Graine r\u00e9cup\u00e9r\u00e9e \u2014 tu peux la replanter quand tu veux.'
                    : 'Une feuille de plus \ud83c\udf3f',
              ),
            ),
          ],
        ),
      ),
    );

    // CÃ©lÃ©bration de badge (Â§7) : "Une branche est apparue".
    if (newlyBadges.isNotEmpty) {
      await Future.delayed(const Duration(milliseconds: 600));
      if (!context.mounted) return;
      _showBadgeDialog(context, ref, newlyBadges.first);
    }
  }

  void _showBadgeDialog(
    BuildContext context,
    WidgetRef ref,
    GrootBadge badge,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        // Rayon "coin de feuille" sur la carte de cÃ©lÃ©bration.
        shape: RoundedRectangleBorder(borderRadius: GrootTheme.cardLeaf),
        title: Text('\ud83c\udf40 ${badge.label}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(badge.description),
            if (badge.unlocksDecoration != null) ...[
              const SizedBox(height: 12),
              Text(
                'Cadeau : un nouveau d\u00e9cor pour le Jardin, d\u00e9j\u00e0 pos\u00e9 dans le pot.',
                style: Theme.of(ctx).textTheme.bodySmall,
              ),
            ],
          ],
        ),
        actions: [
          FilledButton(
            onPressed: () {
              if (badge.unlocksDecoration != null) {
                ref.read(grootProfileProvider.notifier)
                    .addDecoration(badge.unlocksDecoration!);
              }
              Navigator.pop(ctx);
            },
            child: const Text('Regarde comme tu as grandi'),
          ),
        ],
      ),
    );
  }

  Future<void> _addNote(BuildContext context, WidgetRef ref) {
    final controller = TextEditingController();
    return showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: GrootTheme.cardLeaf),
        title: Text('Note du jour \u2014 ${habit.name}'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 3,
          decoration: const InputDecoration(
            hintText: 'Comment \u00e7a s\u2019est pass\u00e9 ?',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Fermer')),
          FilledButton(
            onPressed: () async {
              await ref.read(habitServiceProvider).saveNote(
                    habit: habit,
                    date: DateTime.now(),
                    note: controller.text.trim(),
                  );
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Coller la note \ud83c\udf52'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final familyColor = habit.family == HabitFamily.arreter
        ? GrootTheme.bark600
        : theme.colorScheme.primary;

    return Dismissible(
      key: ValueKey('habit-${habit.clientId}'),
      // Swipe gauche â†’ note de journal (Â§6.B.3) ; jamais de swipe-delete
      // accidentel : la suppression vit dans le dÃ©tail.
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: theme.colorScheme.secondary.withValues(alpha: 0.25),
          borderRadius: GrootTheme.cardLeaf,
        ),
        child: const Icon(Icons.edit_note),
      ),
      onDismissed: (_) => _addNote(context, ref),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Material(
          // Carte "en cours" en pousse tendre (Â§1.1) une fois validÃ©e.
          color: doneToday
              ? theme.colorScheme.primary.withValues(alpha: 0.10)
              : theme.colorScheme.surface,
          borderRadius: GrootTheme.cardLeaf,
          child: InkWell(
            borderRadius: GrootTheme.cardLeaf,
            onTap: () => context.go('/habitude/${habit.clientId}'),
            child: Stack(
              children: [
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      // IcÃ´ne de zone, teintÃ©e par la famille.
                      _ZoneIcon(zoneId: habit.zoneId, color: familyColor),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              habit.name,
                              style: theme.textTheme.titleMedium?.copyWith(
                                decoration:
                                    doneToday ? TextDecoration.lineThrough : null,
                              ),
                            ),
                            if (habit.currentStreak > 0)
                              Text(
                                // Total cumulÃ© affichÃ©, pas de "streak Ã 
                                // zÃ©ro" brutal (Â§7 : retour aprÃ¨s pause).
                                '\ud83c\udf3f ${habit.currentStreak} jour${habit.currentStreak > 1 ? 's' : ''} de suite',
                                style: theme.textTheme.bodySmall,
                              )
                            else if (habit.reminderTime != null)
                              Text(
                                'Rappel \u00e0 ${habit.reminderTime}',
                                style: theme.textTheme.bodySmall,
                              ),
                          ],
                        ),
                      ),
                      // Grande case de validation â€” min 44Ã—44 (Â§9).
                      _CheckButton(
                        done: doneToday,
                        color: familyColor,
                        onTap: () => _toggle(context, ref),
                      ),
                    ],
                  ),
                ),
                // Micro-jauge de streak en fond de carte, "sÃ¨ve qui
                // monte" (Â§6.2) : se remplit vers le prochain palier.
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: ClipRRect(
                    borderRadius: const BorderRadius.only(
                      bottomLeft: Radius.circular(8),
                      bottomRight: Radius.circular(8),
                    ),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: FractionallySizedBox(
                        widthFactor: _progressToNextBadge,
                        child: Container(
                          height: 3,
                          color: familyColor.withValues(alpha: 0.4),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ).animate(key: ValueKey('anim-${habit.clientId}'))
        .fadeIn(duration: 200.ms);
  }

  /// Progression vers le prochain palier de badge (7, 21, 60, 100, 365).
  double get _progressToNextBadge {
    const thresholds = [7, 21, 60, 100, 365];
    final streak = habit.currentStreak;
    for (final t in thresholds) {
      if (streak < t) return (streak % t == streak) ? streak / t : 0;
    }
    return 1;
  }
}

class _ZoneIcon extends StatelessWidget {
  const _ZoneIcon({required this.zoneId, required this.color});
  final String zoneId;
  final Color color;

  IconData _icon() {
    switch (zoneId) {
      case 'matin':
        return Icons.wb_sunny_outlined;
      case 'corps':
        return Icons.fitness_center_outlined;
      case 'esprit':
        return Icons.psychology_outlined;
      case 'creer':
        return Icons.palette_outlined;
      case 'travail':
        return Icons.work_outline;
      case 'soir':
        return Icons.nightlight_outlined;
      default:
        return Icons.eco_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        shape: BoxShape.circle,
      ),
      child: Icon(_icon(), color: color, size: 20),
    );
  }
}

class _CheckButton extends StatelessWidget {
  const _CheckButton({
    required this.done,
    required this.color,
    required this.onTap,
  });

  final bool done;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: done ? 'D\u00e9valider' : 'Valider l\u2019habitude',
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(50),
        child: Container(
          // Cible tactile â‰¥ 44Ã—44px (design system Â§9).
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: done ? color : color.withValues(alpha: 0.08),
          ),
          child: done
              // Micro-animation "pousse qui se dÃ©plie" (Â§7) : le check
              // apparaÃ®t en ease-out-back depuis le point de tap.
              ? const Icon(Icons.check, color: Colors.white)
                  .animate()
                  .scale(
                    duration: 250.ms,
                    curve: Curves.easeOutBack,
                  )
              : Icon(Icons.circle_outlined, color: color),
        ),
      ),
    );
  }
}