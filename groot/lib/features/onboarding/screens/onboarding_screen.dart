import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/models/habit_models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/groot_theme.dart';
import '../../shared/widgets/groot_mascot.dart';

/// Onboarding (brief Â§6.A) : quiz d'identitÃ© â†’ familles â†’ premiÃ¨re
/// habitude â†’ contrat d'engagement tactile â†’ rappels â†’ accueil.
/// Max 3 Ã©crans visuels d'accroche, puis le flux guidÃ© (convention
/// masa-labs : onboarding court, jamais un tunnel interminable).
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int _step = 0;
  final _identities = <String>{};
  final _families = <String>{};
  final _habitNameController = TextEditingController();
  String _habitZone = 'matin';
  String _habitTime = '';
  String _habitPlace = '';
  String? _reminderTime;

  @override
  void dispose() {
    _habitNameController.dispose();
    super.dispose();
  }

  bool get _canContinue {
    switch (_step) {
      case 0: // Quiz d'identitÃ© : 2-3 identitÃ©s (Â§6.A.3)
        return _identities.length >= 2;
      case 1: // Familles : multi-sÃ©lection, pas de limite (Â§6.A.4)
        return _families.isNotEmpty;
      case 2: // PremiÃ¨re habitude : nom + moment + lieu (Â§6.A.5)
        return _habitNameController.text.trim().isNotEmpty;
      case 3: // Contrat : maintiens pour t'engager â€” gÃ©rÃ© par le hold.
        return true;
      case 4: // Rappels : optionnels, jamais bloquants (Â§6.A.7).
        return true;
      default:
        return true;
    }
  }

  Future<void> _next() async {
    if (_step == 4) {
      // TerminÃ© : on plante la premiÃ¨re graine et on sauve le profil.
      await _plantAndFinish();
      return;
    }
    setState(() => _step++);
  }

  Future<void> _plantAndFinish() async {
    final service = ref.read(habitServiceProvider);

    // La premiÃ¨re habitude, plantÃ©e au moment du contrat (Â§6.A.6).
    await service.plantHabit(
      name: _habitNameController.text.trim(),
      family: HabitFamily.construire,
      zoneId: _habitZone,
      habitText: _habitNameController.text.trim(),
      timeOfDay: _habitTime.isNotEmpty ? _habitTime : null,
      place: _habitPlace.isNotEmpty ? _habitPlace : null,
      reminderTime: _reminderTime,
    );

    // Rappel local si activÃ©.
    if (_reminderTime != null) {
      await ref.read(reminderServiceProvider).scheduleDailyReminder(
            habitClientId: (await service.activeHabits()).last.clientId,
            habitName: _habitNameController.text.trim(),
            timeOfDay: _reminderTime!,
          );
    }

    await ref.read(grootProfileProvider.notifier).completeOnboarding(
          identities: _identities.toList(),
          families: _families.toList(),
        );

    // Sync immÃ©diate â€” le contrat vient d'Ãªtre signÃ©, on grave Ã§a vite.
    ref.read(autoSyncProvider).sync();

    if (mounted) context.go('/aujourdhui');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: _step > 0
            ? BackButton(onPressed: () => setState(() => _step--))
            : null,
        title: Text('\u00c9tape ${_step + 1} sur 5'),
      ),
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 400),
          child: _stepContent(_step),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: _step == 3
              // Le contrat se tient au doigt â€” pas de bouton "suivant".
              ? const SizedBox.shrink()
              : FilledButton(
                  onPressed: _canContinue ? _next : null,
                  child: Text(_step == 4 ? 'Planter ma graine \ud83c\udf31' : 'Continuer'),
                ),
        ),
      ),
    );
  }

  Widget _stepContent(int step) {
    switch (step) {
      case 0:
        return _identityQuiz();
      case 1:
        return _familyPicker();
      case 2:
        return _firstHabitForm();
      case 3:
        return _commitmentHold();
      case 4:
        return _reminderStep();
      default:
        return const SizedBox.shrink();
    }
  }

  // ==================== Ã‰TAPE 1 : QUI VEUX-TU DEVENIR ? ====================

  Widget _identityQuiz() {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      key: const ValueKey('identity'),
      children: [
        const SizedBox(height: 8),
        Text('Qui veux-tu devenir ?', style: theme.textTheme.headlineLarge),
        const SizedBox(height: 8),
        Text(
          'On part de qui tu veux \u00eatre, pas de la t\u00e2che. Choisis 2 ou 3 identit\u00e9s.',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 24),
        ...GrootIdentity.all.map((identity) {
          final selected = _identities.contains(identity.id);
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _OptionCard(
              selected: selected,
              leading: Text(identity.emoji, style: const TextStyle(fontSize: 24)),
              title: identity.label,
              onTap: () => setState(() {
                selected
                    ? _identities.remove(identity.id)
                    : _identities.add(identity.id);
              }),
            ),
          );
        }),
      ],
    );
  }

  // ==================== Ã‰TAPE 2 : FAMILLES Ã€ EXPLORER ====================

  Widget _familyPicker() {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      key: const ValueKey('families'),
      children: [
        const SizedBox(height: 8),
        Text('Ta for\u00eat, tes familles',
            style: theme.textTheme.headlineLarge),
        const SizedBox(height: 8),
        Text(
          'Trois familles cohabitent. Explore celles qui te parlent aujourd\u2019hui.',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 24),
        ...HabitFamily.values.map((family) {
          final selected = _families.contains(family.id);
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _OptionCard(
              selected: selected,
              leading: Icon(
                family == HabitFamily.construire
                    ? Icons.eco
                    : family == HabitFamily.arreter
                        ? Icons.content_cut
                        : Icons.palette,
                color: family == HabitFamily.arreter
                    ? GrootTheme.bark600
                    : theme.colorScheme.primary,
              ),
              title: family.label,
              subtitle: family.description,
              onTap: () => setState(() {
                selected
                    ? _families.remove(family.id)
                    : _families.add(family.id);
              }),
            ),
          );
        }),
      ],
    );
  }

  // ==================== Ã‰TAPE 3 : PREMIÃˆRE HABITUDE ====================

  Widget _firstHabitForm() {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      key: const ValueKey('habit'),
      children: [
        const SizedBox(height: 8),
        Text('Ta premi\u00e8re graine', style: theme.textTheme.headlineLarge),
        const SizedBox(height: 8),
        Text(
          'Commence minuscule â€” c\u2019est voulu. Une habitude trop grosse ne germe jamais.',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 24),
        // Format "Je veux [action] Ã  [moment] Ã  [lieu]" (Â§6.A.5).
        Text('Je veux\u2026', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        TextFormField(
          controller: _habitNameController,
          decoration: const InputDecoration(
            hintText: 'ex. lire 5 minutes',
          ),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: 20),
        Text('\u00e0 quel moment ?', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        TextFormField(
          initialValue: _habitTime,
          decoration: const InputDecoration(hintText: 'ex. le matin au r\u00e9veil'),
          onChanged: (v) => _habitTime = v,
        ),
        const SizedBox(height: 20),
        Text('\u00e0 quel endroit ?', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        TextFormField(
          initialValue: _habitPlace,
          decoration: const InputDecoration(hintText: 'ex. dans mon lit'),
          onChanged: (v) => _habitPlace = v,
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
                selected: _habitZone == zone.id,
                onSelected: (_) => setState(() => _habitZone = zone.id),
              ),
          ],
        ),
      ],
    );
  }

  // ==================== Ã‰TAPE 4 : CONTRAT TACTILE ====================

  Widget _commitmentHold() {
    final theme = Theme.of(context);
    return Center(
      key: const ValueKey('hold'),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const GrootMascot(stage: MascotStage.graine, size: 110),
            const SizedBox(height: 24),
            Text('Maintiens pour t\u2019engager',
                style: theme.textTheme.headlineLarge),
            const SizedBox(height: 8),
            Text(
              'Je m\u2019engage \u00e0 commencer minuscule. Groot plante sa premi\u00e8re graine maintenant.',
              style: theme.textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            _HoldToCommitButton(
              onCommitted: () {
                setState(() => _step = 4);
              },
            ),
          ],
        ),
      ),
    );
  }

  // ==================== Ã‰TAPE 5 : RAPPELS ====================

  Widget _reminderStep() {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      key: const ValueKey('reminders'),
      children: [
        const SizedBox(height: 8),
        Text('Un petit coup de pouce ?',
            style: theme.textTheme.headlineLarge),
        const SizedBox(height: 8),
        Text(
          'Groot peut te rappeler tes habitudes en douceur. On explique d\u2019abord \u2014 la permission se demande au bon moment, jamais brutalement.',
          style: theme.textTheme.bodyMedium,
        ),
        const SizedBox(height: 24),
        if (_reminderTime != null) ...[
          Text('Heure du rappel', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          _TimeChips(
            initial: _reminderTime!,
            onChanged: (t) => setState(() => _reminderTime = t),
          ),
        ],
        const SizedBox(height: 24),
        OutlinedButton.icon(
          icon: const Icon(Icons.notifications_outlined),
          label: Text(
            _reminderTime == null
                ? 'Activer un rappel pour ma premi\u00e8re habitude'
                : 'Rappel pr\u00e9vu \u00e0 $_reminderTime \u2014 modifier',
          ),
          onPressed: () async {
            final granted =
                await ref.read(reminderServiceProvider).requestPermissions();
            if (!mounted) return;
            if (!granted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    'Pas de souci \u2014 tes habitudes fonctionnent tr\u00e8s bien sans rappel.',
                    style: theme.textTheme.bodySmall,
                  ),
                ),
              );
              return;
            }
            setState(() => _reminderTime ??= '08:00');
          },
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () => setState(() => _reminderTime = null),
          child: const Text('Aucun rappel, je g\u00e8re tout seul'),
        ),
      ],
    );
  }
}

/// Carte d'option multi-sÃ©lectionnable â€” rayon "coin de feuille".
class _OptionCard extends StatelessWidget {
  const _OptionCard({
    required this.selected,
    required this.leading,
    required this.title,
    this.subtitle,
    required this.onTap,
  });

  final bool selected;
  final Widget leading;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: selected
          ? theme.colorScheme.primary.withValues(alpha: 0.12)
          : theme.colorScheme.surface,
      borderRadius: GrootTheme.cardLeaf,
      child: InkWell(
        borderRadius: GrootTheme.cardLeaf,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              leading,
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: theme.textTheme.titleMedium),
                    if (subtitle != null)
                      Text(subtitle!, style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
              // Ã‰tat doublÃ© d'un changement de forme (accessibilitÃ© Â§4 :
              // jamais couleur seule pour indiquer un Ã©tat).
              Icon(
                selected ? Icons.check_circle : Icons.circle_outlined,
                color: selected ? theme.colorScheme.primary : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Contrat d'engagement tactile (faÃ§on Grit, brief Â§1) : maintenir le
/// doigt 1,2 s pour signer. La jauge se remplit pendant l'appui.
class _HoldToCommitButton extends StatefulWidget {
  const _HoldToCommitButton({required this.onCommitted});
  final VoidCallback onCommitted;

  @override
  State<_HoldToCommitButton> createState() => _HoldToCommitButtonState();
}

class _HoldToCommitButtonState extends State<_HoldToCommitButton> {
  double _progress = 0;

  Future<void> _start() async {
    final duration = const Duration(milliseconds: 1200);
    const steps = 24;
    for (var i = 1; i <= steps; i++) {
      await Future.delayed(duration ~/ steps);
      if (!mounted) return;
      setState(() => _progress = i / steps);
    }
    widget.onCommitted();
  }

  void _cancel() {
    if (_progress >= 1) return;
    setState(() => _progress = 0);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return GestureDetector(
      onLongPressStart: (_) => _start(),
      onLongPressEnd: (_) => _cancel(),
      onLongPressCancel: _cancel,
      child: SizedBox(
        width: double.infinity,
        height: 72,
        child: Stack(
          children: [
            // Fond : la jauge de sÃ¨ve qui monte (design system Â§6.2).
            Positioned.fill(
              child: ClipRRect(
                borderRadius: GrootTheme.button,
                child: Align(
                  alignment: Alignment.bottomCenter,
                  child: FractionallySizedBox(
                    heightFactor: _progress,
                    child: Container(
                      color: theme.colorScheme.primary.withValues(alpha: 0.25),
                    ),
                  ),
                ),
              ),
            ),
            // Bord.
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: GrootTheme.button,
                  border: Border.all(color: theme.colorScheme.primary, width: 2),
                ),
              ),
            ),
            Center(
              child: _progress == 0
                  ? Text('Maintiens ici pour signer ton engagement',
                      style: theme.textTheme.labelLarge)
                  : Text(
                      _progress < 1 ? 'Presque\u2026' : 'Sign\u00e9 \u2713',
                      style: theme.textTheme.labelLarge,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Chips de sÃ©lection d'heure 'HH:MM' â€” pas de TimePicker lourd en v1.
class _TimeChips extends StatelessWidget {
  const _TimeChips({required this.initial, required this.onChanged});
  final String initial;
  final ValueChanged<String> onChanged;

  static const _slots = ['06:30', '07:00', '08:00', '12:30', '19:00', '21:00'];

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final slot in _slots)
          FilterChip(
            label: Text(slot),
            selected: initial == slot,
            onSelected: (_) => onChanged(slot),
          ),
      ],
    );
  }
}