import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../jobs/models/job_model.dart';

/// Écran recherche d'emploi / stage
class JobsScreen extends ConsumerStatefulWidget {
  const JobsScreen({super.key});

  @override
  ConsumerState<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends ConsumerState<JobsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  JobCategory? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) {
        setState(() {
          _selectedCategory = null;
        });
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  JobType get _currentType =>
      _tabController.index == 0 ? JobType.emploi : JobType.stage;

  @override
  Widget build(BuildContext context) {
    final jobsAsync = ref.watch(jobsProvider((type: _currentType, category: _selectedCategory)));

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.go('/dashboard'),
        ),
        title: Text(
          'Opportunités',
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.vitae,
          unselectedLabelColor: AppTheme.muted,
          indicatorColor: AppTheme.vitae,
          indicatorSize: TabBarIndicatorSize.tab,
          labelStyle: GoogleFonts.inter(
              fontSize: 14, fontWeight: FontWeight.w600),
          unselectedLabelStyle: GoogleFonts.inter(
              fontSize: 14, fontWeight: FontWeight.w500),
          tabs: const [
            Tab(text: 'Emplois'),
            Tab(text: 'Stages'),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Filtres par catégorie
            _buildCategoryFilters(),
            const SizedBox(height: 8),
            // Liste des offres
            Expanded(
              child: jobsAsync.when(
                loading: () => const Center(
                  child: CircularProgressIndicator(color: AppTheme.vitae),
                ),
                error: (e, _) => _buildError(),
                data: (jobs) {
                  if (jobs.isEmpty) return _buildEmpty();
                  return ListView.builder(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 4),
                    itemCount: jobs.length,
                    itemBuilder: (context, index) {
                      final job = jobs[index];
                      return _buildJobCard(job).animate().fadeIn(
                            duration: 300.ms,
                            delay: Duration(milliseconds: index * 40),
                          );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryFilters() {
    final categories = JobCategory.values;
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        itemCount: categories.length + 1,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          if (index == 0) {
            final isSelected = _selectedCategory == null;
            return _buildChip(
              label: 'Toutes',
              icon: LucideIcons.layers,
              selected: isSelected,
              onTap: () => setState(() => _selectedCategory = null),
            );
          }
          final cat = categories[index - 1];
          final isSelected = _selectedCategory == cat;
          return _buildChip(
            label: cat.label,
            icon: cat.icon,
            selected: isSelected,
            onTap: () => setState(() => _selectedCategory = cat),
          );
        },
      ),
    );
  }

  Widget _buildChip({
    required String label,
    required IconData icon,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppTheme.vitae : AppTheme.bg2,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: selected ? Colors.white : AppTheme.muted),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                color: selected ? Colors.white : AppTheme.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildJobCard(JobOffer job) {
    final isClosed = !job.isOpen;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: () => context.go('/jobs/${job.id ?? job.title}'),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.bg2, width: 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppTheme.vitaeSoft,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        job.category.icon,
                        color: AppTheme.vitae,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            job.title,
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.text,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            job.company,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              color: AppTheme.muted,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    if (isClosed)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.error.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Expiré',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.error,
                          ),
                        ),
                      )
                    else
                      const Icon(LucideIcons.chevronRight,
                          color: AppTheme.muted2, size: 20),
                  ],
                ),
                const SizedBox(height: 12),
                // Tags: catégorie + localisation + type de contrat
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _buildTag(job.category.label, AppTheme.vitaeSoft, AppTheme.vitaeDark),
                    if (job.location != null)
                      _buildTag(job.location!, AppTheme.bg2, AppTheme.muted),
                    if (job.contractType != null)
                      _buildTag(job.contractType!, AppTheme.bg2, AppTheme.muted),
                    if (job.isRemote)
                      _buildTag('Remote', AppTheme.success.withValues(alpha: 0.1), AppTheme.success),
                  ],
                ),
                const SizedBox(height: 8),
                // Date + salaire
                Row(
                  children: [
                    if (job.postedAgo.isNotEmpty) ...[
                      const Icon(LucideIcons.clock, size: 12, color: AppTheme.muted2),
                      const SizedBox(width: 4),
                      Text(
                        job.postedAgo,
                        style: GoogleFonts.inter(
                            fontSize: 12, color: AppTheme.muted2),
                      ),
                    ],
                    if (job.salaryRange != null) ...[
                      const Spacer(),
                      const Icon(LucideIcons.wallet, size: 12, color: AppTheme.muted2),
                      const SizedBox(width: 4),
                      Text(
                        job.salaryRange!,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.vitaeDark,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTag(String label, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: fg,
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(LucideIcons.briefcase, color: AppTheme.muted2, size: 48),
          const SizedBox(height: 16),
          Text(
            'Aucune offre dans cette catégorie',
            style: GoogleFonts.inter(fontSize: 15, color: AppTheme.muted),
          ),
          const SizedBox(height: 8),
          Text(
            'Revenez plus tard ou changez de filtre',
            style: GoogleFonts.inter(fontSize: 13, color: AppTheme.muted2),
          ),
        ],
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(LucideIcons.wifiOff, color: AppTheme.muted2, size: 48),
          const SizedBox(height: 16),
          Text(
            'Impossible de charger les offres',
            style: GoogleFonts.inter(fontSize: 15, color: AppTheme.muted),
          ),
        ],
      ),
    );
  }
}