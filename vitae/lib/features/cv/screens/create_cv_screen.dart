import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';

/// Écran de création d'un nouveau CV — première étape : titre + template
class CreateCvScreen extends ConsumerStatefulWidget {
  const CreateCvScreen({super.key});

  @override
  ConsumerState<CreateCvScreen> createState() => _CreateCvScreenState();
}

class _CreateCvScreenState extends ConsumerState<CreateCvScreen> {
  final _titreController = TextEditingController(text: 'Mon CV');
  int _selectedTemplate = 1;
  bool _isLoading = false;

  @override
  void dispose() {
    _titreController.dispose();
    super.dispose();
  }

  Future<void> _createCv() async {
    if (_titreController.text.trim().isEmpty) {
      _showError('Veuillez donner un titre à votre CV');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final cvService = ref.read(cvServiceProvider);
      final cvId = await cvService.createCv(
        titre: _titreController.text.trim(),
        templateId: _selectedTemplate,
      );

      if (mounted) {
        context.go('/cv/$cvId/edit/perso');
      }
    } catch (e) {
      if (mounted) {
        _showError('Erreur lors de la création : $e');
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.error,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final templatesAsync = ref.watch(templatesProvider);
    final plan = ref.watch(currentPlanProvider).value ?? 'gratuit';

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.go('/dashboard'),
        ),
        title: Text(
          'Nouveau CV',
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              Text(
                'Titre du CV',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.text,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _titreController,
                decoration: const InputDecoration(
                  hintText: 'Ex: CV - Comptable Junior',
                  prefixIcon: Icon(LucideIcons.fileText, size: 20),
                ),
              ),
              const SizedBox(height: 32),

              Text(
                'Choisir un template',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.text,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Vous pourrez le changer plus tard',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: AppTheme.muted,
                ),
              ),
              const SizedBox(height: 16),

              templatesAsync.when(
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(color: AppTheme.vitae),
                  ),
                ),
                error: (_, __) => const SizedBox(),
                data: (templates) {
                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.85,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: templates.length,
                    itemBuilder: (context, index) {
                      final template = templates[index];
                      final isSelected = _selectedTemplate == template.id;
                      final canUse = ref
                          .read(planServiceProvider)
                          .canUseTemplate(plan, template.id);

                      return _buildTemplateCard(
                        template: template,
                        isSelected: isSelected,
                        canUse: canUse,
                        onTap: canUse
                            ? () => setState(() => _selectedTemplate = template.id)
                            : () => context.go('/paywall'),
                      );
                    },
                  );
                },
              ),

              const SizedBox(height: 32),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _createCv,
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text('Créer et commencer'),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTemplateCard({
    required dynamic template,
    required bool isSelected,
    required bool canUse,
    required VoidCallback onTap,
  }) {
    return Material(
      color: isSelected ? AppTheme.vitaeSoft : AppTheme.card,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSelected ? AppTheme.vitae : AppTheme.bg2,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Stack(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Aperçu visuel miniature
                  Expanded(
                    child: Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: AppTheme.bg2,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: _buildTemplatePreview(template.id as int),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        template.nom as String,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.text,
                        ),
                      ),
                      if (!canUse) ...[
                        const SizedBox(width: 4),
                        const Icon(LucideIcons.lock, size: 12, color: AppTheme.warning),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    template.idealPour as String,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: AppTheme.muted,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
              if (isSelected)
                Positioned(
                  top: 4,
                  right: 4,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppTheme.vitae,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      LucideIcons.check,
                      color: Colors.white,
                      size: 12,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  /// Aperçu visuel simplifié du template
  Widget _buildTemplatePreview(int templateId) {
    switch (templateId) {
      case 1: // Classique — 1 colonne
        return Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(height: 4, width: 60, color: AppTheme.muted2),
              const SizedBox(height: 4),
              Container(height: 2, width: 40, color: AppTheme.muted2),
              const Spacer(),
              Container(height: 2, width: double.infinity, color: AppTheme.bg),
              const SizedBox(height: 2),
              Container(height: 2, width: double.infinity, color: AppTheme.bg),
              const SizedBox(height: 2),
              Container(height: 2, width: 80, color: AppTheme.bg),
            ],
          ),
        );
      case 2: // Moderne — 2 colonnes
        return Padding(
          padding: const EdgeInsets.all(8),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 30,
                color: AppTheme.vitaeSoft,
                child: Column(
                  children: [
                    const SizedBox(height: 4),
                    Container(height: 3, width: 16, color: AppTheme.vitae),
                    const SizedBox(height: 2),
                    Container(height: 2, width: 20, color: AppTheme.muted2),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(height: 4, width: 40, color: AppTheme.muted2),
                    const SizedBox(height: 2),
                    Container(height: 2, width: double.infinity, color: AppTheme.bg),
                    const SizedBox(height: 2),
                    Container(height: 2, width: 30, color: AppTheme.bg),
                  ],
                ),
              ),
            ],
          ),
        );
      case 3: // Élégant — en-tête photo
        return Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            children: [
              Container(
                height: 24,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: AppTheme.vitaeDark,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Center(
                  child: Container(
                    width: 16,
                    height: 16,
                    decoration: const BoxDecoration(
                      color: AppTheme.bg,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Container(height: 2, width: double.infinity, color: AppTheme.bg),
              const SizedBox(height: 2),
              Container(height: 2, width: 60, color: AppTheme.bg),
            ],
          ),
        );
      case 4: // Minimal — très épuré
        return Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(height: 3, width: 50, color: AppTheme.muted2),
              const SizedBox(height: 8),
              Container(height: 1, width: double.infinity, color: AppTheme.bg),
              const SizedBox(height: 4),
              Container(height: 1, width: 40, color: AppTheme.bg),
              const Spacer(),
              Container(height: 1, width: 30, color: AppTheme.bg),
            ],
          ),
        );
      case 5: // Académique — détaillé
        return Padding(
          padding: const EdgeInsets.all(6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(height: 3, width: 50, color: AppTheme.muted2),
              const SizedBox(height: 2),
              Container(height: 1, width: 30, color: AppTheme.muted2),
              const SizedBox(height: 4),
              for (var i = 0; i < 4; i++) ...[
                Container(height: 1, width: double.infinity, color: AppTheme.bg),
                const SizedBox(height: 1),
              ],
            ],
          ),
        );
      case 6: // Stage — court
        return Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(height: 3, width: 40, color: AppTheme.vitae),
              const SizedBox(height: 4),
              Container(height: 2, width: double.infinity, color: AppTheme.bg),
              const SizedBox(height: 2),
              Container(height: 2, width: 50, color: AppTheme.bg),
              const Spacer(),
              Container(height: 2, width: 30, color: AppTheme.bg),
            ],
          ),
        );
      default:
        return const SizedBox();
    }
  }
}