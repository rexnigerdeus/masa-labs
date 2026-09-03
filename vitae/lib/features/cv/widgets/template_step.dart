import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../cv/models/cv_model.dart';
import '../screens/edit_cv_screen.dart';

/// Étape 9 : Choix du template + couleur
class TemplateStep extends ConsumerStatefulWidget {
  final String cvId;
  final Cv cv;
  final VoidCallback onNext;

  const TemplateStep({super.key, required this.cvId, required this.cv, required this.onNext});

  @override
  ConsumerState<TemplateStep> createState() => _TemplateStepState();
}

class _TemplateStepState extends ConsumerState<TemplateStep> {
  late int _selectedTemplate;
  late Color _selectedColor;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _selectedTemplate = widget.cv.templateId;
    _selectedColor = _parseColor(widget.cv.couleurPrincipale);
  }

  Color _parseColor(String hex) {
    try {
      return Color(int.parse(hex.replaceFirst('#', '0xFF')));
    } catch (_) {
      return AppTheme.vitae;
    }
  }

  String _colorToHex(Color color) {
    return '#${color.toARGB32().toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      final cvService = ref.read(cvServiceProvider);
      await cvService.updateCv(
        cvId: widget.cvId,
        templateId: _selectedTemplate,
        couleurPrincipale: _colorToHex(_selectedColor),
      );
      ref.invalidate(fullCvProvider(widget.cvId));
      widget.onNext();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: AppTheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final templatesAsync = ref.watch(templatesProvider);
    final plan = ref.watch(currentPlanProvider).value ?? 'gratuit';

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Template', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.text)),
          const SizedBox(height: 12),
          templatesAsync.when(
            loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.vitae)),
            error: (_, __) => const SizedBox(),
            data: (templates) {
              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  childAspectRatio: 0.7,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                ),
                itemCount: templates.length,
                itemBuilder: (context, index) {
                  final template = templates[index];
                  final isSelected = _selectedTemplate == template.id;
                  final canUse = ref.read(planServiceProvider).canUseTemplate(plan, template.id);

                  return GestureDetector(
                    onTap: canUse
                        ? () => setState(() => _selectedTemplate = template.id)
                        : () => context.go('/paywall'),
                    child: Container(
                      decoration: BoxDecoration(
                        color: isSelected ? AppTheme.vitaeSoft : AppTheme.card,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? AppTheme.vitae : AppTheme.bg2,
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      child: Stack(
                        children: [
                          Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  _getTemplateIcon(template.id),
                                  size: 28,
                                  color: isSelected ? AppTheme.vitae : AppTheme.muted2,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  template.nom,
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: isSelected ? AppTheme.vitaeDark : AppTheme.muted,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                                if (!canUse)
                                  const Icon(LucideIcons.lock, size: 10, color: AppTheme.warning),
                              ],
                            ),
                          ),
                          if (isSelected)
                            Positioned(
                              top: 4,
                              right: 4,
                              child: Container(
                                padding: const EdgeInsets.all(3),
                                decoration: const BoxDecoration(color: AppTheme.vitae, shape: BoxShape.circle),
                                child: const Icon(LucideIcons.check, color: Colors.white, size: 10),
                              ),
                            ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
          const SizedBox(height: 24),
          Text('Couleur principale', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.text)),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: AppTheme.cvAccentColors.map((color) {
              final isSelected = _selectedColor.toARGB32() == color.toARGB32();
              return GestureDetector(
                onTap: () => setState(() => _selectedColor = color),
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected ? AppTheme.text : Colors.transparent,
                      width: 3,
                    ),
                  ),
                  child: isSelected
                      ? const Icon(LucideIcons.check, color: Colors.white, size: 18)
                      : null,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isSaving ? null : _save,
              child: _isSaving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Enregistrer et continuer'),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  IconData _getTemplateIcon(int id) {
    switch (id) {
      case 1: return LucideIcons.fileText;
      case 2: return LucideIcons.layoutGrid;
      case 3: return LucideIcons.userCircle;
      case 4: return LucideIcons.minimize2;
      case 5: return LucideIcons.bookOpen;
      case 6: return LucideIcons.graduationCap;
      default: return LucideIcons.fileText;
    }
  }
}