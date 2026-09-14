import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/logic/streak_engine.dart';
import '../../../core/models/habit_models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/groot_theme.dart';

/// DÃ©tail d'une habitude (Â§6.C) : historique, stats, notes, rÃ©glages de
/// frÃ©quence, option "geler" (mode pause faÃ§on vacances). Jamais de
/// streak Ã  zÃ©ro affichÃ© brutalement : on montre le total cumulÃ©.
class HabitDetailScreen extends ConsumerStatefulWidget {
  const HabitDetailScreen({super.key, required this.clientId});
  final String clientId;

  @override
  ConsumerState<HabitDetailScreen> createState() =>
      _HabitDetailScreenState();
}

class _HabitDetailScreenState extends ConsumerState<HabitDetailScreen> {
  Habit? _habit;
  Set<String> _entries = {};

  @override
  void initState() {
    super.initState();
    _load();
    // RÃ©activitÃ© : toute Ã©criture locale recharge l'Ã©cran. On s'abonne
    // directement au stream de changements de la base.
    _changesSub = ref
        .read(habitServiceProvider)
        .changes
        .listen((_) => _load());
  }

  StreamSubscription<void>? _changesSub;

  @override
  void dispose() {
    _changesSub?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final service = ref.read(habitServiceProvider);
    final habit = await service.habit(widget.clientId);
    final entries = await service.entryDates(widget.clientId);
    if (!mounted) return;
    setState(() {
      _habit = habit;
      _entries = entries;
    });
  }

  Future<void> _toggleFreeze() async {
    final habit = _habit;
    if (habit == null) return;
    await ref.read(habitServiceProvider).toggleFreeze(habit);
    // Mode vacances (Â§1 Grit) : geler coupe aussi le rappel local.
    if (habit.frozen) {
      await ref.read(reminderServiceProvider).cancelReminder(habit.clientId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final habit = _habit;

    if (habit == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final rate = StreakEngine.consistencyRate(habit: habit, entryDates: _entries);

    return Scaffold(
      appBar: AppBar(
        title: Text(habit.name, style: theme.textTheme.headlineMedium),
        actions: [
          PopupMenuButton<String>(
            onSelected: (action) async {
              if (action == 'archiver') {
                await ref.read(habitServiceProvider).archiveHabit(habit);
                if (context.mounted) context.go('/aujourdhui');
              } else if (action == 'supprimer') {
                final confirmed = await _confirmDelete(context);
                if (confirmed == true) {
                  await ref
                      .read(habitServiceProvider)
                      .softDeleteHabit(habit.clientId);
                  await ref
                      .read(reminderServiceProvider)
                      .cancelReminder(habit.clientId);
                  if (context.mounted) context.go('/aujourdhui');
                }
              }
            },
            itemBuilder: (ctx) => [
              const PopupMenuItem(
                value: 'archiver',
                child: Text('Archiver (l\u2019historique reste)'),
              ),
              const PopupMenuItem(
                value: 'supprimer',
                child: Text('Supprimer d\u00e9finitivement'),
              ),
            ],
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        children: [
          const SizedBox(height: 8),
          // Intention complÃ¨te "Je veux X Ã  Y Ã  Z" (Â§6.A.5).
          if (habit.intentionPhrase.isNotEmpty)
            Text(
              habit.intentionPhrase,
              style: theme.textTheme.bodyLarge,
            ),
          const SizedBox(height: 20),
          // ---- Stats â€” total cumulÃ© en vedette, pas le streak nu ----
          Row(
            children: [
              _StatTile(
                label: 'De suite',
                value: '${habit.currentStreak} j',
              ),
              const SizedBox(width: 12),
              _StatTile(
                label: 'Record',
                value: '${habit.bestStreak} j',
              ),
              const SizedBox(width: 12),
              _StatTile(
                label: 'Constance 30 j',
                value: '${(rate * 100).round()} %',
              ),
            ],
          ),
          const SizedBox(height: 24),
          // ---- Historique : branche qui se remplit (Â§6.B.5) ----
          Text('Ta branche \u2014 8 derni\u00e8res semaines',
              style: theme.textTheme.titleMedium),
          const SizedBox(height: 12),
          _HistoryBranch(habit: habit, entryDates: _entries),
          const SizedBox(height: 24),
          // ---- Notes de journal (Â§6.B.3) ----
          Text('Notes de journal', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          _JournalNotes(clientId: habit.clientId),
          const SizedBox(height: 24),
          // ---- FrÃ©quence ----
          Text('Fr\u00e9quence', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(
            habit.daysOfWeek.length == 7
                ? 'Tous les jours'
                : 'Jours : ${_labelsOf(habit.daysOfWeek)}',
            style: theme.textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),
          // ---- Geler (Â§6.C : mode pause faÃ§on vacances) ----
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            // Le gel protÃ¨ge le streak â€” formulation douce (Â§8).
            title: const Text('Geler l\u2019habitude'),
            subtitle: Text(
              habit.frozen
                  ? 'Gel\u00e9e \u2014 prot\u00e8ge ton streak pendant une pause.'
                  : 'Mode vacances : la graine attend sans rien casser.',
              style: theme.textTheme.bodySmall,
            ),
            value: habit.frozen,
            onChanged: (_) => _toggleFreeze(),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  String _labelsOf(List<int> days) {
    const names = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    return [for (final d in days..sort()) names[d]].join(', ');
  }

  Future<bool?> _confirmDelete(BuildContext context) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: GrootTheme.cardLeaf),
        title: const Text('Supprimer cette graine ?'),
        content: const Text(
          'L\u2019historique et les notes partiront avec elle. Groot gardera le souvenir \u2014 mais pas les donn\u00e9es.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Garder')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(ctx).colorScheme.error,
            ),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: GrootTheme.cardLeaf,
        ),
        child: Column(
          children: [
            // Chiffres en Baloo 2 (design system Â§2).
            Text(value, style: theme.textTheme.headlineMedium),
            Text(label, style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

/// Grille "chaÃ®ne Ã  ne pas casser" en feuilles/fruits (Â§6.B.5) : les
/// jours validÃ©s remplissent une branche, pas des cases grises.
class _HistoryBranch extends StatelessWidget {
  const _HistoryBranch({required this.habit, required this.entryDates});
  final Habit habit;
  final Set<String> entryDates;

  static String _key(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final today = DateTime.now();
    final weeks = 8;
    final columns = <Widget>[];

    for (var w = weeks - 1; w >= 0; w--) {
      final cells = <Widget>[];
      for (var d = 6; d >= 0; d--) {
        final date = DateTime(today.year, today.month, today.day)
            .subtract(Duration(days: w * 7 + d));
        final due = habit.isDueOn(date);
        final done = entryDates.contains(_key(date));
        cells.add(
          Expanded(
            child: AspectRatio(
              aspectRatio: 1,
              child: Container(
                margin: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  // Feuille pleine si validÃ©, contour si dÃ», gris discret
                  // sinon â€” jamais de rouge (design system Â§1.3).
                  shape: BoxShape.circle,
                  color: done
                      ? theme.colorScheme.primary
                      : due
                          ? theme.colorScheme.primary.withValues(alpha: 0.10)
                          : theme.colorScheme.surface.withValues(alpha: 0.5),
                ),
                child: done
                    ? Icon(Icons.eco,
                        size: 12, color: theme.colorScheme.onPrimary)
                    : null,
              ),
            ),
          ),
        );
      }
      columns.add(Expanded(child: Column(children: cells)));
    }

    return Row(children: columns);
  }
}

/// Notes de journal attachÃ©es aux jours validÃ©s (Â§6.B.3).
class _JournalNotes extends ConsumerWidget {
  const _JournalNotes({required this.clientId});
  final String clientId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FutureBuilder(
      future: ref.watch(habitServiceProvider).entriesForHabit(clientId),
      builder: (context, snapshot) {
        final entries = (snapshot.data ?? [])
            .where((e) => e.note.trim().isNotEmpty)
            .toList();
        if (entries.isEmpty) {
          return Text(
            'Glisse une carte vers la gauche pour coller une note \u00e0 un jour.',
            style: Theme.of(context).textTheme.bodySmall,
          );
        }
        return Column(
          children: [
            for (final e in entries.take(10))
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.sticky_note_2_outlined),
                title: Text(e.note, style: Theme.of(context).textTheme.bodyMedium),
                subtitle: Text(
                  '${e.date.day}/${e.date.month}/${e.date.year}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
          ],
        );
      },
    );
  }
}