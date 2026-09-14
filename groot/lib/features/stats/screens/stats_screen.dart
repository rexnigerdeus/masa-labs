import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/logic/streak_engine.dart';
import '../../../core/models/habit_models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/groot_theme.dart';

/// Statistiques globales (Â§6.C) : taux de constance par famille
/// (construire/arrÃªter/crÃ©er), meilleurs jours, tendances.
class StatsScreen extends ConsumerWidget {
  const StatsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final habits = ref.watch(habitsProvider).value ?? [];
    final entryDates = ref.watch(entryDatesProvider).value ?? {};

    final weekdayRates = StreakEngine.bestWeekdays(
      habits: habits,
      entriesByHabit: entryDates,
    );

    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    final bestDay = weekdayRates.entries
        .reduce((a, b) => a.value >= b.value ? a : b);

    return Scaffold(
      appBar: AppBar(
        title: Text('Statistiques', style: theme.textTheme.headlineMedium),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        children: [
          const SizedBox(height: 8),
          // ---- Constance par famille (Â§6.C) ----
          Text('Par famille', style: theme.textTheme.titleMedium),
          const SizedBox(height: 12),
          ...HabitFamily.values.map((family) {
            final familyHabits = habits.where((h) => h.family == family).toList();
            final rate = _familyRate(familyHabits, entryDates);
            return _FamilyBar(
              family: family,
              rate: rate,
              habitCount: familyHabits.length,
            );
          }),
          const SizedBox(height: 24),
          // ---- Meilleurs jours (Â§6.C) ----
          Text('Tes meilleurs jours', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(
            bestDay.value > 0
                ? '${dayNames[bestDay.key]} est ton jour le plus r\u00e9gulier (${(bestDay.value * 100).round()} %).'
                // Jamais culpabilisant : une statistique vide reste une
                // invitation (design system Â§6.7).
                : 'Plante une graine pour voir pousser tes statistiques.',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          _WeekdayChart(rates: weekdayRates),
          const SizedBox(height: 24),
          // ---- Vue d'ensemble ----
          Text('Vue d\u2019ensemble', style: theme.textTheme.titleMedium),
          const SizedBox(height: 12),
          _OverviewTiles(habits: habits, entryDates: entryDates),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  double _familyRate(
    List<Habit> familyHabits,
    Map<String, Set<String>> entryDates,
  ) {
    if (familyHabits.isEmpty) return 0;
    var sum = 0.0;
    for (final h in familyHabits) {
      sum += StreakEngine.consistencyRate(
        habit: h,
        entryDates: entryDates[h.clientId] ?? const {},
      );
    }
    return sum / familyHabits.length;
  }
}

class _FamilyBar extends StatelessWidget {
  const _FamilyBar({
    required this.family,
    required this.rate,
    required this.habitCount,
  });

  final HabitFamily family;
  final double rate;
  final int habitCount;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = family == HabitFamily.arreter
        ? GrootTheme.bark600
        : theme.colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('${family.label} \u2022 $habitCount graine${habitCount > 1 ? 's' : ''}',
                  style: theme.textTheme.bodyMedium),
              Text('${(rate * 100).round()} %',
                  style: theme.textTheme.bodyMedium),
            ],
          ),
          const SizedBox(height: 6),
          // Barre "sÃ¨ve qui monte" (Â§6.2), teintÃ©e par famille.
          ClipRRect(
            borderRadius: const BorderRadius.all(Radius.circular(100)),
            child: LinearProgressIndicator(
              value: rate,
              minHeight: 10,
              color: color,
              backgroundColor: color.withValues(alpha: 0.12),
            ),
          ),
        ],
      ),
    );
  }
}

class _WeekdayChart extends StatelessWidget {
  const _WeekdayChart({required this.rates});
  final Map<int, double> rates;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    return SizedBox(
      height: 120,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (var i = 0; i < 7; i++)
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: double.infinity,
                    height: 8 + 80 * (rates[i] ?? 0),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary
                          .withValues(alpha: 0.25 + 0.6 * (rates[i] ?? 0)),
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(8),
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(dayNames[i], style: theme.textTheme.bodySmall),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _OverviewTiles extends StatelessWidget {
  const _OverviewTiles({required this.habits, required this.entryDates});
  final List<Habit> habits;
  final Map<String, Set<String>> entryDates;

  @override
  Widget build(BuildContext context) {
    var totalValidations = 0;
    var bestRecord = 0;
    for (final h in habits) {
      totalValidations += entryDates[h.clientId]?.length ?? 0;
      if (h.bestStreak > bestRecord) bestRecord = h.bestStreak;
    }

    return Row(
      children: [
        Expanded(
          child: _Tile(
            label: 'Graines plant\u00e9es',
            value: '${habits.length}',
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _Tile(
            label: 'Jours valid\u00e9s au total',
            value: '$totalValidations',
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _Tile(
            label: 'Meilleur streak',
            value: '$bestRecord j',
          ),
        ),
      ],
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: GrootTheme.cardLeaf,
      ),
      child: Column(
        children: [
          // Chiffres en Baloo 2 (design system Â§2).
          Text(value, style: theme.textTheme.headlineMedium),
          Text(label, style: theme.textTheme.bodySmall,
              textAlign: TextAlign.center),
        ],
      ),
    );
  }
}