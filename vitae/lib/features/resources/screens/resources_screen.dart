import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../resources/models/resource_model.dart';

/// Écran liste des articles édifiants
class ResourcesScreen extends ConsumerStatefulWidget {
  const ResourcesScreen({super.key});

  @override
  ConsumerState<ResourcesScreen> createState() => _ResourcesScreenState();
}

class _ResourcesScreenState extends ConsumerState<ResourcesScreen> {
  ResourceCategory? _selectedCategory;

  @override
  Widget build(BuildContext context) {
    final resourcesAsync = ref.watch(resourcesProvider(_selectedCategory));

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.go('/dashboard'),
        ),
        title: Text(
          'Conseils & Articles',
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Filtres par catégorie — chips horizontaux
            _buildCategoryFilters(),
            const SizedBox(height: 8),
            // Liste des articles
            Expanded(
              child: resourcesAsync.when(
                loading: () => const Center(
                  child: CircularProgressIndicator(color: AppTheme.vitae),
                ),
                error: (e, _) => _buildError(e.toString()),
                data: (resources) {
                  if (resources.isEmpty) {
                    return _buildEmpty();
                  }
                  return ListView.builder(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 4),
                    itemCount: resources.length,
                    itemBuilder: (context, index) {
                      final resource = resources[index];
                      return _buildResourceCard(resource).animate().fadeIn(
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
    final categories = ResourceCategory.values;
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length + 1,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          // Index 0 = "Tous"
          if (index == 0) {
            final isSelected = _selectedCategory == null;
            return _buildChip(
              label: 'Tous',
              selected: isSelected,
              onTap: () => setState(() => _selectedCategory = null),
            );
          }
          final cat = categories[index - 1];
          final isSelected = _selectedCategory == cat;
          return _buildChip(
            label: cat.label,
            selected: isSelected,
            onTap: () => setState(() => _selectedCategory = cat),
          );
        },
      ),
    );
  }

  Widget _buildChip({
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppTheme.vitae : AppTheme.bg2,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected ? Colors.white : AppTheme.muted,
          ),
        ),
      ),
    );
  }

  Widget _buildResourceCard(Resource resource) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: () => context.go('/resources/${resource.id ?? resource.title}'),
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
                        resource.category.icon,
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
                            resource.title,
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
                            resource.excerpt,
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
                    const Icon(LucideIcons.chevronRight,
                        color: AppTheme.muted2, size: 20),
                  ],
                ),
                const SizedBox(height: 12),
                // Tags: catégorie + temps de lecture (même modèle que jobs_screen)
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _buildTag(resource.category.label, AppTheme.vitaeSoft, AppTheme.vitaeDark),
                    if (resource.readTimeMinutes != null)
                      _buildTag('${resource.readTimeMinutes} min', AppTheme.bg2, AppTheme.muted),
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
          const Icon(LucideIcons.fileText,
              color: AppTheme.muted2, size: 48),
          const SizedBox(height: 16),
          Text(
            'Aucun article dans cette catégorie',
            style: GoogleFonts.inter(fontSize: 15, color: AppTheme.muted),
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
            'Impossible de charger les articles',
            style: GoogleFonts.inter(fontSize: 15, color: AppTheme.muted),
          ),
        ],
      ),
    );
  }
}