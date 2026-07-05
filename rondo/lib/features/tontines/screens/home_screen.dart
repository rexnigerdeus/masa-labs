import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../core/theme/app_theme.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppTheme.rondoSoft,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.notifications_none,
                        color: AppTheme.rondo,
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(duration: 400.ms),
            ),
          ),

          // Quick stats
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      label: 'Tontines actives',
                      value: '2',
                      color: AppTheme.rondo,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatCard(
                      label: 'Cagnotte totale',
                      value: '170K',
                      color: AppTheme.dark,
                    ),
                  ),
                ],
              ).animate().fadeIn(delay: 100.ms, duration: 400.ms).slideY(begin: 0.1),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 28)),

          // Tontines list
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                'Tontines',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.text,
                ),
              ).animate().fadeIn(duration: 400.ms),
            ),
          ),
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final tontines = _mockTontines();
                if (index < tontines.length) {
                  return _TontineCard(tontine: tontines[index])
                      .animate()
                      .fadeIn(delay: Duration(milliseconds: 150 * index), duration: 400.ms)
                      .slideY(begin: 0.15);
                }
                return null;
              },
              childCount: _mockTontines().length,
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
      // FAB: créer une tontine
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          // TODO: Naviguer vers créer une tontine
        },
        backgroundColor: AppTheme.rondo,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: Text(
          'Nouvelle tontine',
          style: GoogleFonts.inter(fontWeight: FontWeight.w600),
        ),
      ),
    );
  }

  List<_TontineData> _mockTontines() {
    return [
      _TontineData(
        name: 'Famille Koné',
        mise: 10000,
        frequence: 'Mensuelle',
        nbMembres: 8,
        cotisationsRecues: 6,
        statut: 'active',
        prochainTour: '15 août',
      ),
      _TontineData(
        name: 'Commerçantes Adjamé',
        mise: 25000,
        frequence: 'Semaine',
        nbMembres: 5,
        cotisationsRecues: 4,
        statut: 'active',
        prochainTour: '22 juillet',
      ),
    ];
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.text.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: color,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              color: AppTheme.muted,
            ),
          ),
        ],
      ),
    );
  }
}

class _TontineData {
  final String name;
  final int mise;
  final String frequence;
  final int nbMembres;
  final int cotisationsRecues;
  final String statut;
  final String prochainTour;

  _TontineData({
    required this.name,
    required this.mise,
    required this.frequence,
    required this.nbMembres,
    required this.cotisationsRecues,
    required this.statut,
    required this.prochainTour,
  });
}

class _TontineCard extends StatelessWidget {
  final _TontineData tontine;

  const _TontineCard({required this.tontine});

  @override
  Widget build(BuildContext context) {
    final progress = tontine.cotisationsRecues / tontine.nbMembres;
    final cagnotte = tontine.mise * tontine.cotisationsRecues;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 6),
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
                      tontine.name,
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
                      color: AppTheme.rondoSoft,
                      borderRadius: BorderRadius.circular(50),
                    ),
                    child: Text(
                      'Active',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.rondo,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _InfoChip(
                      icon: Icons.savings_outlined,
                      label: 'Mise',
                      value: '${tontine.mise} FCFA',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _InfoChip(
                      icon: Icons.calendar_today_outlined,
                      label: 'Fréquence',
                      value: tontine.frequence,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _InfoChip(
                      icon: Icons.group_outlined,
                      label: 'Membres',
                      value: '${tontine.nbMembres}',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Cagnotte
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Cagnotte',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppTheme.muted,
                    ),
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
              const SizedBox(height: 8),
              // Progress bar
              ClipRRect(
                borderRadius: BorderRadius.circular(50),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 6,
                  backgroundColor: AppTheme.text.withValues(alpha: 0.08),
                  valueColor: const AlwaysStoppedAnimation(AppTheme.rondo),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${tontine.cotisationsRecues}/${tontine.nbMembres} cotisations',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppTheme.muted2,
                    ),
                  ),
                  Text(
                    'Prochain tour : ${tontine.prochainTour}',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppTheme.muted2,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
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
          style: GoogleFonts.inter(
            fontSize: 11,
            color: AppTheme.muted2,
          ),
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