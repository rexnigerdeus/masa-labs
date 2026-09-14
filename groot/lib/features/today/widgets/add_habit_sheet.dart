import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/habit_models.dart';
import '../../../core/providers.dart';

/// Add Habit Sheet (design system §6.4) : bottom sheet avec le format
/// "Je veux ___ à ___" + chips de famille à radius plein. Illimité,
/// sans friction, jamais compté (différenciateur central, §2).
class AddHabitSheet extends ConsumerStatefulWidget {
  const AddHabitSheet({super.key});

  @override
  ConsumerState<AddHabitSheet> createState() => _AddHabitSheetState();
}

class _AddHabitSheetState extends ConsumerState<AddHabitSheet> {
  final _nameController = TextEditingController();
  HabitFamily _family = HabitFamily.construire;
  String _zoneId = 'libre';
  String _time = '';
  String _place = '';
  String? _reminder;
  bool _reminderOn = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  bool get _valid => _nameController.text.trim().isNotEmpty;

  Future<void> _plant() async {
    final service = ref.read(habitServiceProvider);
    final habit = await service.plantHabit(
      name: _nameController.text.trim(),
      family: _family,
      zoneId: _zoneId,
      habitText: _nameController.text.trim(),
      timeOfDay: _time.isNotEmpty ? _time : null,
      place: _place.isNotEmpty ? _place : null,
      reminderTime: _reminderOn ? _reminder : null,
    );

    if (_reminderOn && _reminder != null) {
      await ref.read(reminderServiceProvider).scheduleDailyReminder(
            habitClientId: habit.clientId,
            habitName: habit.name,
            timeOfDay: _reminder!,
          );
    }

    // Sync en arrière-plan — l'utilisateur ne voit jamais la sync.
    ref.read(autoSyncProvider).sync();

    if (!mounted) return;
    Navigator.pop(context);
    // Cohérence des verbes (design system §8) : "Planter" →
    // confirmation "Graine plantée 🌱", jamais un autre verbe.
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Graine plant\u00e9e \ud83c\udf31')),
    );
    context.go('/habitude/${habit.clientId}');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      // Clavier : le sheet remonte au-dessus, jamais écrasé.
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Nouvelle graine', style: theme.textTheme.headlineMedium),
            const SizedBox(height: 4),
            Text(
              'Commence minuscule \u2014 c\u2019est la bonne taille.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 20),
            // Format implementation intention (§6.A.5).
            Row(
              children: [
                Text('Je veux', style: theme.textTheme.titleMedium),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    controller: _nameController,
                    autofocus: true,
                    decoration: const InputDecoration(hintText: 'lire 5 min'),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Text('\u00e0', style: theme.textTheme.titleMedium),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    decoration: const InputDecoration(
                      hintText: 'le matin au r\u00e9veil (optionnel)',
                    ),
                    onChanged: (v) => _time = v,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Text('\u00e0', style: theme.textTheme.titleMedium),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    decoration: const InputDecoration(
                      hintText: 'dans mon lit (optionnel)',
                    ),
                    onChanged: (v) => _place = v,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            // Chips de famille à radius plein (design system §6.4).
            Text('Famille', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                for (final family in HabitFamily.values)
                  FilterChip(
                    label: Text(family.label),
                    selected: _family == family,
                    onSelected: (_) => setState(() => _family = family),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            Text('Zone de vie', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final zone in HabitZone.all)
                  FilterChip(
                    label: Text(zone.label),
                    selected: _zoneId == zone.id,
                    onSelected: (_) => setState(() => _zoneId = zone.id),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            // Rappel optionnel, expliqué, jamais forcé (§6.A.7).
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('Petit rappel quotidien', style: theme.textTheme.bodyMedium),
              value: _reminderOn,
              onChanged: (v) async {
                if (v) {
                  final messenger = ScaffoldMessenger.of(context);
                  final smallStyle = Theme.of(context).textTheme.bodySmall;
                  final granted = await ref
                      .read(reminderServiceProvider)
                      .requestPermissions();
                  if (!granted) {
                    if (mounted) {
                      messenger.showSnackBar(
                        SnackBar(
                          content: Text(
                            'Pas de souci \u2014 l\u2019habitude marche tr\u00e8s bien sans rappel.',
                            style: smallStyle,
                          ),
                        ),
                      );
                    }
                    return;
                  }
                }
                if (!mounted) return;
                setState(() {
                  _reminderOn = v;
                  _reminder ??= '08:00';
                });
              },
            ),
            if (_reminderOn)
              Wrap(
                spacing: 8,
                children: [
                  for (final slot
                      in ['06:30', '07:00', '08:00', '12:30', '19:00', '21:00'])
                    FilterChip(
                      label: Text(slot),
                      selected: _reminder == slot,
                      onSelected: (_) => setState(() => _reminder = slot),
                    ),
                ],
              ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _valid ? _plant : null,
              child: const Text('Planter \ud83c\udf31'),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}