import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../cv/models/cv_model.dart';
import '../widgets/dashboard_widgets.dart';

/// Dashboard — écran principal de Vitae.
/// Design moderne inspiré des apps productivité récentes (Canva, Teal,
/// Revolut) : header personnalisé, carte hero pour l'action principale,
/// grille d'accès rapide, cartes CV riches avec reprise rapide.
class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  Widget build(BuildContext context) {
    final cvsAsync = ref.watch(myCvsProvider);
    final userName = _getUserName();

    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: SafeArea(
        bottom: false,
        child: cvsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.vitae)),
          error: (e, _) => _buildError(e.toString()),
          data: (cvs) => _buildBody(cvs, userName),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createCv,
        backgroundColor: AppTheme.vitae,
        foregroundColor: Colors.white,
        elevation: 2,
        icon: const Icon(LucideIcons.plus, size: 20),
        label: const Text('Nouveau CV'),
      ),
    );
  }

  String _getUserName() {
    final user = ref.read(authServiceProvider).currentUser;
    return (user?.userMetadata?['full_name'] as String?) ?? '';
  }

  String get _firstName => _getUserName().trim().split(' ').first;

  Future<void> _createCv() async {
    final canCreate = await ref.read(planServiceProvider).canCreateCv();
    if (!mounted) return;
    if (!canCreate) {
      context.go('/paywall');
      return;
    }
    context.go('/cv/create');
  }

  Widget _buildBody(List<Cv> cvs, String userName) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          floating: true,
          pinned: false,
          backgroundColor: AppTheme.bg,
          toolbarHeight: 64,
          titleSpacing: 0,
          title: DashboardHeader(
            userName: userName,
            onSettingsTap: () => context.go('/settings'),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              // Hero card — action principale mise en avant
              HeroCard(
                firstName: _firstName,
                hasCv: cvs.isNotEmpty,
                onCreateTap: _createCv,
              ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.05, end: 0, duration: 400.ms),

              const SizedBox(height: 20),

              // Quick actions — accès 1-tap aux fonctionnalités clés
              const QuickActionsGrid()
                  .animate().fadeIn(duration: 400.ms, delay: 100.ms).slideY(begin: 0.05, end: 0, duration: 400.ms, delay: 100.ms),

              const SizedBox(height: 28),

              // Mes CVs
              if (cvs.isEmpty)
                _buildEmptyCvsState().animate().fadeIn(duration: 500.ms, delay: 200.ms)
              else ...[
                const SectionHeader(title: 'Mes CVs'),
                ...cvs.asMap().entries.map((entry) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: ModernCvCard(
                        cv: entry.value,
                        onTap: () => context.go('/cv/${entry.value.id}'),
                        onResume: () => _resumeCv(entry.value),
                      ).animate().fadeIn(
                            duration: 300.ms,
                            delay: Duration(milliseconds: 200 + entry.key * 40),
                          ),
                    )),
              ],

              const SizedBox(height: 28),

              // Opportunités
              const SectionHeader(title: 'Opportunités'),
              _buildOpportunityRow().animate().fadeIn(duration: 400.ms, delay: 300.ms),

              const SizedBox(height: 24),
            ]),
          ),
        ),
      ],
    );
  }

  /// Retrouve la première section incomplète pour reprendre là où
  /// l'utilisateur s'est arrêté (pattern "continue where you left off").
  void _resumeCv(Cv cv) {
    const sectionOrder = ['perso', 'titre', 'resume', 'experience', 'formation', 'competence', 'langue', 'interet'];
    String firstIncomplete = 'perso';
    for (final type in sectionOrder) {
      final section = cv.sections.where((s) => s.type.name == type).firstOrNull;
      if (section == null || section.donnees.isEmpty) {
        firstIncomplete = type;
        break;
      }
    }
    if (cv.statut == 'finalise') {
      context.go('/cv/${cv.id}');
    } else {
      context.go('/cv/${cv.id}/edit/$firstIncomplete');
    }
  }

  Widget _buildOpportunityRow() {
    return Column(
      children: [
        _buildOpportunityCard(
          icon: LucideIcons.briefcase,
          title: 'Offres d\'emploi & Stages',
          subtitle: 'Postulez aux opportunités près de chez vous',
          onTap: () => context.go('/jobs'),
        ),
        const SizedBox(height: 10),
        _buildOpportunityCard(
          icon: LucideIcons.bookOpen,
          title: 'Articles & Conseils',
          subtitle: 'Recherche d\'emploi, réseautage, droit du travail',
          onTap: () => context.go('/resources'),
        ),
      ],
    );
  }

  Widget _buildOpportunityCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Material(
      color: AppTheme.card,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppTheme.bg2, width: 1),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppTheme.vitaeSoft,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: AppTheme.vitae, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.text,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: GoogleFonts.inter(
                        fontSize: 12.5,
                        color: AppTheme.muted,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const Icon(LucideIcons.arrowRight, color: AppTheme.vitae, size: 18),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyCvsState() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.bg2),
      ),
      child: Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: AppTheme.vitaeSoft,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(LucideIcons.filePlus, color: AppTheme.vitae, size: 34),
          ),
          const SizedBox(height: 16),
          Text(
            'Aucun CV pour l\'instant',
            style: GoogleFonts.inter(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: AppTheme.text,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Créez votre premier CV professionnel\nen moins de 3 minutes',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 13,
              color: AppTheme.muted,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _createCv,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.vitae,
              foregroundColor: Colors.white,
            ),
            icon: const Icon(LucideIcons.plus, size: 18),
            label: const Text('Créer mon CV'),
          ),
        ],
      ),
    );
  }

  Widget _buildError(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(LucideIcons.wifiOff, color: AppTheme.muted2, size: 48),
          const SizedBox(height: 16),
          Text(
            'Impossible de charger vos CVs',
            style: GoogleFonts.inter(fontSize: 16, color: AppTheme.muted),
          ),
          const SizedBox(height: 8),
          ElevatedButton(
            onPressed: () => ref.invalidate(myCvsProvider),
            child: const Text('Réessayer'),
          ),
        ],
      ),
    );
  }
}