import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/habit_models.dart';
import '../../../core/providers.dart';
import '../../shared/widgets/groot_mascot.dart';
import '../widgets/growth_ring.dart';
import '../widgets/habit_card.dart';
import '../widgets/add_habit_sheet.dart';

/// Accueil "Aujourd'hui" (brief §6.B.1) : Groot en haut avec sa jauge
/// de croissance du jour (Growth Ring), habitudes groupées par zone.
class TodayScreen extends ConsumerWidget {
  const TodayScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final habitsByZone = ref.watch(todayByZoneProvider).value ?? {};
    final entryDates = ref.watch(entryDatesProvider).value ?? {};
    final stage = ref.watch(mascotStageProvider);
    final profile = ref.watch(grootProfileProvider);

    final today = DateTime.now();
    final todayKey =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    // Jauge du jour : habitudes dues / validées (§6.B.1).
    final allToday = [for (final list in habitsByZone.values) ...list];
    final doneToday = allToday
        .where((h) => entryDates[h.clientId]?.contains(todayKey) ?? false)
        .length;

    final totalHabits = ref.watch(habitsProvider).value?.length ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: Text('Aujourd\u2019hui',
            style: theme.textTheme.headlineMedium),
        actions: [
          // Ajout rapide : la promesse "illimité sans friction" (§2)
          // se lit dans ce bouton, toujours présent, jamais compté.
          IconButton(
            icon: const Icon(Icons.add_circle_outline, size: 28),
            onPressed: () => _openAddSheet(context),
          ),
        ],
      ),
      body: totalHabits == 0
          ? _EmptyGarden(onPlant: () => _openAddSheet(context))
          : ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                const SizedBox(height: 8),
                // ---- Groot + Growth Ring du jour ----
                Row(
                  children: [
                    GrowthRing(
                      progress: allToday.isEmpty
                          ? 0
                          : doneToday / allToday.length,
                      child: GrootMascot(
                        stage: stage,
                        size: 72,
                        decorations: profile?.decorations ?? const [],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            doneToday == allToday.length && allToday.isNotEmpty
                                // Fin de journée complète (§6.B.4) :
                                // Groot secoue ses feuilles.
                                ? 'Journ\u00e9e compl\u00e8te \u2014 Groot secoue ses feuilles \u2728'
                                : doneToday > 0
                                    ? 'Une feuille de plus \ud83c\udf3f'
                                    : 'Groot attend sa premi\u00e8re graine du jour.',
                            style: theme.textTheme.titleMedium,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$doneToday sur ${allToday.length} habitudes du jour',
                            style: theme.textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                // ---- Groupement par zone (§6.B.1) ----
                for (final zone in HabitZone.all)
                  if ((habitsByZone[zone.id] ?? []).isNotEmpty) ...[
                    _ZoneHeader(zone: zone),
                    ...habitsByZone[zone.id]!.map(
                      (h) => HabitCard(
                        habit: h,
                        doneToday:
                            entryDates[h.clientId]?.contains(todayKey) ?? false,
                        entryDates: entryDates[h.clientId] ?? const {},
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                // Zones personnalisées éventuelles.
                for (final zoneId in habitsByZone.keys)
                  if (!HabitZone.all.any((z) => z.id == zoneId) &&
                      (habitsByZone[zoneId] ?? []).isNotEmpty) ...[
                    _ZoneHeader(zone: HabitZone.byId(zoneId)),
                    ...habitsByZone[zoneId]!.map(
                      (h) => HabitCard(
                        habit: h,
                        doneToday:
                            entryDates[h.clientId]?.contains(todayKey) ?? false,
                        entryDates: entryDates[h.clientId] ?? const {},
                      ),
                    ),
                  ],
                const SizedBox(height: 24),
              ],
            ),
      // FAB : planter une habitude, geste premier de l'app.
      floatingActionButton: totalHabits > 0
          ? FloatingActionButton.extended(
              onPressed: () => _openAddSheet(context),
              icon: const Icon(Icons.eco),
              label: const Text('Planter une habitude'),
            )
          : null,
    );
  }

  void _openAddSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => const AddHabitSheet(),
    );
  }
}

/// Empty state (design system §6.7) : toujours une invitation à agir,
/// jamais une illustration passive.
class _EmptyGarden extends StatelessWidget {
  const _EmptyGarden({required this.onPlant});
  final VoidCallback onPlant;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const GrootMascot(stage: MascotStage.graine, size: 140),
            const SizedBox(height: 24),
            Text('Ton jardin est vide',
                style: theme.textTheme.headlineMedium),
            const SizedBox(height: 8),
            Text(
              'Plante ta premi\u00e8re graine — aussi minuscule soit-elle.',
              style: theme.textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onPlant,
              icon: const Icon(Icons.eco),
              label: const Text('Planter ma premi\u00e8re graine'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ZoneHeader extends StatelessWidget {
  const _ZoneHeader({required this.zone});
  final HabitZone zone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 12, bottom: 8, left: 4),
      child: Text(
        zone.label,
        style: theme.textTheme.titleMedium?.copyWith(
          // H2 de section (design system §2) — Baloo 2 medium.
          fontSize: 18,
        ),
      ),
    );
  }
}