import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../cv/models/cv_model.dart';
import '../screens/edit_cv_screen.dart';
import '../widgets/ats_score_badge.dart';
import '../widgets/cv_preview.dart';

/// Écran de détail d'un CV — aperçu + actions (éditer, dupliquer, supprimer, exporter).
/// Design moderne : aperçu flottant sur fond dégradé doux, barre d'actions
/// en bas avec score ATS intégré (la valeur clé de Vitae toujours visible).
class CvDetailScreen extends ConsumerStatefulWidget {
  final String cvId;

  const CvDetailScreen({super.key, required this.cvId});

  @override
  ConsumerState<CvDetailScreen> createState() => _CvDetailScreenState();
}

class _CvDetailScreenState extends ConsumerState<CvDetailScreen> {
  @override
  Widget build(BuildContext context) {
    final cvAsync = ref.watch(fullCvProvider(widget.cvId));

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.go('/dashboard'),
        ),
        title: cvAsync.when(
          loading: () => const Text('CV'),
          error: (_, __) => const Text('CV'),
          data: (cv) => Text(cv.titre, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600)),
        ),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) => _handleMenuAction(value),
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'edit', child: Text('Modifier')),
              const PopupMenuItem(value: 'rename', child: Text('Renommer')),
              const PopupMenuItem(value: 'duplicate', child: Text('Dupliquer')),
              const PopupMenuItem(value: 'delete', child: Text('Supprimer', style: TextStyle(color: AppTheme.error))),
            ],
          ),
        ],
      ),
      body: cvAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.vitae)),
        error: (e, _) => Center(child: Text('Erreur: $e')),
        data: (cv) => _buildBody(cv),
      ),
      bottomNavigationBar: cvAsync.maybeWhen(
        data: (cv) => _buildBottomBar(cv),
        orElse: () => null,
      ),
    );
  }

  Widget _buildBody(Cv cv) {
    final plan = ref.watch(currentPlanProvider).value ?? 'gratuit';
    final showWatermark = !ref.read(planServiceProvider).exportWithoutWatermark(plan);
    final atsResult = ref.watch(atsScoreProvider((cv: cv, cvKey: atsCvKey(cv))));

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppTheme.vitaeSoft.withValues(alpha: 0.5), AppTheme.bg],
        ),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        child: Column(
          children: [
            // Badge score ATS — la valeur clé de Vitae, visible en premier
            AtsScoreBadge(result: atsResult, showRecommendations: true),
            const SizedBox(height: 16),
            // Aperçu flottant avec ombre portée
            Center(
              child: Container(
                width: 340,
                constraints: const BoxConstraints(minHeight: 480),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.vitaeDark.withValues(alpha: 0.18),
                      blurRadius: 30,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: CvPreview(cv: cv, showWatermark: showWatermark),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Barre d'actions moderne — actions secondaires en icônes,
  /// action principale "Exporter PDF" pleine largeur.
  Widget _buildBottomBar(Cv cv) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            // Action secondaire : Modifier
            _buildActionIcon(
              icon: LucideIcons.pencil,
              label: 'Modifier',
              onTap: () => _goToFirstIncompleteStep(cv),
            ),
            const SizedBox(width: 10),
            // Action secondaire : Template
            _buildActionIcon(
              icon: LucideIcons.layoutTemplate,
              label: 'Design',
              onTap: () => context.go('/cv/${widget.cvId}/edit/template'),
            ),
            const SizedBox(width: 12),
            // Action principale : Exporter
            Expanded(
              child: ElevatedButton.icon(
                onPressed: () => context.go('/cv/${widget.cvId}/export'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.vitae,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  elevation: 0,
                ),
                icon: const Icon(LucideIcons.download, size: 18),
                label: const Text('Exporter PDF'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionIcon({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppTheme.bg2,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: AppTheme.text, size: 18),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: AppTheme.muted,
            ),
          ),
        ],
      ),
    );
  }

  /// Navigue vers la première section incomplète du CV — l'utilisateur
  /// reprend exactement là où il s'est arrêté (pattern "smart resume").
  void _goToFirstIncompleteStep(Cv cv) {
    const sectionOrder = ['perso', 'titre', 'resume', 'experience', 'formation', 'competence', 'langue', 'interet'];
    String firstIncomplete = 'perso';
    for (final type in sectionOrder) {
      final section = cv.sections.where((s) => s.type.name == type).firstOrNull;
      if (section == null || section.donnees.isEmpty) {
        firstIncomplete = type;
        break;
      }
    }
    context.go('/cv/${widget.cvId}/edit/$firstIncomplete');
  }

  Future<void> _handleMenuAction(String action) async {
    switch (action) {
      case 'edit':
        context.go('/cv/${widget.cvId}/edit/perso');
      case 'rename':
        _showRenameDialog();
      case 'duplicate':
        try {
          final cvService = ref.read(cvServiceProvider);
          await cvService.duplicateCv(widget.cvId);
          ref.invalidate(myCvsProvider);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('CV dupliqué avec succès'), backgroundColor: AppTheme.success),
            );
            context.go('/dashboard');
          }
        } catch (e) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Erreur: $e'), backgroundColor: AppTheme.error),
            );
          }
        }
      case 'delete':
        _showDeleteConfirm();
    }
  }

  void _showRenameDialog() {
    final cvAsync = ref.read(fullCvProvider(widget.cvId));
    final currentTitre = cvAsync.maybeWhen(
      data: (cv) => cv.titre,
      orElse: () => 'Mon CV',
    );

    final controller = TextEditingController(text: currentTitre);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Renommer le CV', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: InputDecoration(
            labelText: 'Titre du CV',
            hintText: 'Ex : CV Koné Aya — Comptable',
            border: const OutlineInputBorder(),
            focusedBorder: const OutlineInputBorder(
              borderSide: BorderSide(color: AppTheme.vitae, width: 2),
            ),
          ),
          style: GoogleFonts.inter(fontSize: 15),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Annuler')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.vitae, foregroundColor: Colors.white),
            onPressed: () async {
              final newTitre = controller.text.trim();
              if (newTitre.isEmpty) return;
              Navigator.pop(context);
              try {
                final cvService = ref.read(cvServiceProvider);
                await cvService.updateCv(cvId: widget.cvId, titre: newTitre);
                // Invalider les providers pour recharger le titre
                ref.invalidate(fullCvProvider(widget.cvId));
                ref.invalidate(myCvsProvider);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('CV renommé'), backgroundColor: AppTheme.success),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Erreur: $e'), backgroundColor: AppTheme.error),
                  );
                }
              }
            },
            child: const Text('Renommer'),
          ),
        ],
      ),
    );
  }

  void _showDeleteConfirm() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Supprimer ce CV ?', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
        content: Text('Cette action est irréversible.', style: GoogleFonts.inter(color: AppTheme.muted)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Annuler')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            onPressed: () async {
              Navigator.pop(context);
              try {
                final cvService = ref.read(cvServiceProvider);
                await cvService.deleteCv(widget.cvId);
                ref.invalidate(myCvsProvider);
                if (mounted) context.go('/dashboard');
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Erreur: $e'), backgroundColor: AppTheme.error),
                  );
                }
              }
            },
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
  }
}