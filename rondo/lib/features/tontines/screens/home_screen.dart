import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';

// Provider pour les tontines de l'utilisateur
final myTontinesProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final service = ref.read(tontineServiceProvider);
  try {
    final adminData = await service.getHomeAdmin();
    final membreData = await service.getHomeMembre();

    final tontineIds = <String>{};
    final allTontines = <Map<String, dynamic>>[];

    for (final t in adminData) {
      final id = t['tontine_id'] as String;
      if (!tontineIds.contains(id)) {
        tontineIds.add(id);
        allTontines.add({
          'id': id,
          'name': t['tontine_name'],
          'mise': t['mise'],
          'nb_membres_actifs': t['nb_membres_actifs'],
          'nb_membres_total': t['nb_membres_total'],
          'statut': t['statut'],
          'tour_actuel_numero': t['tour_actuel_numero'],
          'cagnotte_actuelle': t['cagnotte_actuelle'],
          'is_admin': true,
        });
      }
    }

    for (final t in membreData) {
      final id = t['tontine_id'] as String;
      if (!tontineIds.contains(id)) {
        tontineIds.add(id);
        allTontines.add({
          'id': id,
          'name': t['tontine_name'],
          'mise': t['mise'],
          'statut': t['statut'],
          'is_admin': false,
          'mon_tour_numero': t['mon_tour_numero'],
          'prochain_paiement_date': t['prochain_paiement_date'],
          'cotisation_due': t['cotisation_due'],
        });
      }
    }

    return allTontines;
  } catch (e) {
    return [];
  }
});

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tontinesAsync = ref.watch(myTontinesProvider);

    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: CustomScrollView(
        slivers: [
          // Header
          SliverToBoxAdapter(
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Mes tontines',
                          style: GoogleFonts.inter(
                            fontSize: 28,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.text,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Gérez vos cercles d\'épargne',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            color: AppTheme.muted,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(LucideIcons.bell, color: AppTheme.muted, size: 22),
                          onPressed: () => context.push('/notifications'),
                        ),
                        IconButton(
                          icon: const Icon(LucideIcons.settings, color: AppTheme.muted, size: 22),
                          onPressed: () => context.push('/settings'),
                        ),
                      ],
                    ),
                  ],
                ),
              ).animate().fadeIn(duration: 400.ms),
            ),
          ),

          // Content
          tontinesAsync.when(
            loading: () => const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator(color: AppTheme.rondo)),
            ),
            error: (error, _) => SliverFillRemaining(
              hasScrollBody: false,
              child: _EmptyState(
                icon: LucideIcons.alertCircle,
                title: 'Une erreur est survenue',
                subtitle: 'Tirez pour réessayer',
                onRefresh: () => ref.invalidate(myTontinesProvider),
              ),
            ),
            data: (tontines) {
              if (tontines.isEmpty) {
                // État vide : hasScrollBody = false → écran fixe, non scrollable
                return SliverFillRemaining(
                  hasScrollBody: false,
                  child: _EmptyState(
                    icon: LucideIcons.users,
                    title: 'Aucune tontine',
                    subtitle: 'Créez une tontine ou rejoignez-en une avec un code',
                    actions: [
                      const SizedBox(height: 24),
                      // Bouton Créer agrandi (pleine largeur)
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: () => context.push('/create-tontine'),
                          child: const Text('Créer une tontine'),
                        ),
                      ),
                      const SizedBox(height: 12),
                      // Bouton Rejoindre
                      TextButton(
                        onPressed: () => context.push('/join-tontine'),
                        child: Text(
                          'Rejoindre',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.rondo,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }

              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final t = tontines[index];
                    return _TontineCard(
                      tontine: t,
                      onTap: () => context.push('/tontine/${t['id']}'),
                    ).animate().fadeIn(
                      delay: Duration(milliseconds: 100 * index),
                      duration: 400.ms,
                    ).slideY(begin: 0.1);
                  },
                  childCount: tontines.length,
                ),
              );
            },
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
      // FAB
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/create-tontine'),
        backgroundColor: AppTheme.rondo,
        foregroundColor: Colors.white,
        icon: const Icon(LucideIcons.plus, size: 22),
        label: Text(
          'Nouvelle tontine',
          style: GoogleFonts.inter(fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final List<Widget>? actions;
  final VoidCallback? onRefresh;

  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.actions,
    this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 56, color: AppTheme.muted2),
            const SizedBox(height: 20),
            Text(
              title,
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppTheme.text,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: GoogleFonts.inter(
                fontSize: 14,
                color: AppTheme.muted,
              ),
              textAlign: TextAlign.center,
            ),
            if (actions != null) ...actions!,
          ],
        ),
      ),
    );
  }
}

class _TontineCard extends StatelessWidget {
  final Map<String, dynamic> tontine;
  final VoidCallback onTap;

  const _TontineCard({required this.tontine, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final name = tontine['name'] as String? ?? 'Tontine';
    final mise = tontine['mise'] as int? ?? 0;
    final statut = tontine['statut'] as String? ?? 'en_attente';
    final isAdmin = tontine['is_admin'] as bool? ?? false;
    final cagnotte = tontine['cagnotte_actuelle'] as int? ?? 0;
    final nbMembresActifs = tontine['nb_membres_actifs'] as int? ?? 0;
    final nbMembresTotal = tontine['nb_membres_total'] as int? ?? 0;
    final tourActuel = tontine['tour_actuel_numero'] as int?;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 6),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: AppTheme.card,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppTheme.text.withValues(alpha: 0.08)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        name,
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.text,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: statut == 'active'
                            ? AppTheme.rondoSoft
                            : AppTheme.bg2,
                        borderRadius: BorderRadius.circular(50),
                      ),
                      child: Text(
                        _statutLabel(statut),
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: statut == 'active' ? AppTheme.rondo : AppTheme.muted2,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _InfoChip(
                        icon: LucideIcons.piggyBank,
                        label: 'Mise',
                        value: '$mise FCFA',
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _InfoChip(
                        icon: LucideIcons.users,
                        label: 'Membres',
                        value: '$nbMembresActifs/$nbMembresTotal',
                      ),
                    ),
                    const SizedBox(width: 12),
                    if (tourActuel != null)
                      Expanded(
                        child: _InfoChip(
                          icon: LucideIcons.trophy,
                          label: 'Tour',
                          value: '$tourActuel',
                        ),
                      ),
                  ],
                ),
                if (isAdmin && statut == 'active') ...[
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Cagnotte',
                        style: GoogleFonts.inter(fontSize: 13, color: AppTheme.muted),
                      ),
                      Text(
                        '$cagnotte FCFA',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.rondo,
                        ),
                      ),
                    ],
                  ),
                ],
                if (!isAdmin && tontine['cotisation_due'] == true) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.warning.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.alarmClock, color: AppTheme.warning, size: 16),
                        const SizedBox(width: 8),
                        Text(
                          'Cotisation due',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.warning,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _statutLabel(String statut) {
    switch (statut) {
      case 'en_attente':
        return 'En attente';
      case 'active':
        return 'Active';
      case 'terminee':
        return 'Terminée';
      case 'annulee':
        return 'Annulée';
      default:
        return statut;
    }
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoChip({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: AppTheme.muted2),
        const SizedBox(height: 4),
        Text(
          label,
          style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted2),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppTheme.text,
          ),
        ),
      ],
    );
  }
}