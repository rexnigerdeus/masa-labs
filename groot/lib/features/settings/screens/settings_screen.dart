import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers.dart';

/// Réglages (§6.C) : rappels, apparence (clair/sombre), compte.
/// L'export de données et le mode sombre dès le lancement (§9).
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text('R\u00e9glages', style: theme.textTheme.headlineMedium),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        children: [
          const SizedBox(height: 8),
          // ---- Compte ----
          Text('Compte', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          ListTile(
            leading: const Icon(Icons.person_outline),
            title: Text(
              user?.userMetadata?['full_name'] as String? ?? 'Toi',
              style: theme.textTheme.bodyMedium,
            ),
            subtitle: Text(
              user != null
                  ? 'T\u00e9l\u00e9phone : ${user.userMetadata?['phone'] ?? ' \u2014'}'
                  : 'Hors-ligne \u2014 connecte-toi pour sauvegarder',
              style: theme.textTheme.bodySmall,
            ),
          ),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('D\u00e9connexion'),
            onTap: () async {
              await ref.read(authServiceProvider).signOut();
              if (context.mounted) context.go('/bienvenue');
            },
          ),
          const SizedBox(height: 16),
          // ---- Apparence ----
          Text('Apparence', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          SwitchListTile(
            secondary: Icon(
              isDark ? Icons.nightlight : Icons.light_mode_outlined,
            ),
            title: const Text('Mode Sous-bois (sombre)'),
            // Mode sombre dès le lancement, jamais un ajout tardif (§9).
            value: isDark,
            onChanged: (_) {
              // Le thème est piloté par themeModeNotifier, écouté par le
              // MaterialApp du main.dart — jamais de relecture manuelle.
              themeModeNotifier.value = isDark
                  ? ThemeMode.light
                  : ThemeMode.dark;
            },
          ),
          const SizedBox(height: 16),
          // ---- À propos ----
          Text('\u00c0 propos', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          ListTile(
            leading: const Icon(Icons.eco),
            title: const Text('Groot Habits'),
            subtitle: Text(
              'The Everyday Co. \u2022 v1.0.0 \u2022 Habitudes illimit\u00e9es, pour toujours',
              style: theme.textTheme.bodySmall,
            ),
          ),
          ListTile(
            leading: const Icon(Icons.cloud_outlined),
            title: const Text('Sauvegarde'),
            subtitle: Text(
              user != null
                  ? 'Tes donn\u00e9es vivent sur ton t\u00e9l\u00e9phone et se sauvegardent en ligne automatiquement.'
                  : 'Connecte-toi pour activer la sauvegarde en ligne.',
              style: theme.textTheme.bodySmall,
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

/// Mode thème global — écouté par le MaterialApp du main.dart.
final ValueNotifier<ThemeMode> themeModeNotifier =
    ValueNotifier<ThemeMode>(ThemeMode.system);