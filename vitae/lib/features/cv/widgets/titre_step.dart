import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../cv/models/cv_model.dart';
import '../screens/edit_cv_screen.dart';

/// Étape 2 : Titre professionnel
class TitreStep extends ConsumerStatefulWidget {
  final String cvId;
  final Cv cv;
  final VoidCallback onNext;

  const TitreStep({super.key, required this.cvId, required this.cv, required this.onNext});

  @override
  ConsumerState<TitreStep> createState() => _TitreStepState();
}

class _TitreStepState extends ConsumerState<TitreStep> {
  final _controller = TextEditingController();
  bool _isSaving = false;

  final _suggestions = [
    'Comptable junior',
    'Chargé de communication',
    'Développeur web',
    'Assistant de direction',
    'Commercial',
    'Graphiste designer',
    'Juriste d\'entreprise',
    'Responsable marketing',
    'Assistant comptable',
    'Community manager',
  ];

  @override
  void initState() {
    super.initState();
    final section = widget.cv.getSection(SectionType.perso);
    _controller.text = section?.donnees['titre'] as String? ?? '';
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      final section = widget.cv.getSection(SectionType.perso);
      final donnees = Map<String, dynamic>.from(section?.donnees ?? {});
      donnees['titre'] = _controller.text.trim();

      final cvService = ref.read(cvServiceProvider);
      await cvService.saveSection(cvId: widget.cvId, type: SectionType.perso, donnees: donnees);
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
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHint('Le titre est la première chose que le recruteur lit. Soyez précis.'),
          const SizedBox(height: 20),
          Text('Titre visé', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.text)),
          const SizedBox(height: 6),
          TextField(
            controller: _controller,
            decoration: const InputDecoration(
              hintText: 'Ex: Comptable Junior',
              prefixIcon: Icon(LucideIcons.briefcase, size: 20),
            ),
          ),
          const SizedBox(height: 24),
          Text('Suggestions', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.text)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _suggestions.map((s) {
              return ActionChip(
                label: Text(s, style: GoogleFonts.inter(fontSize: 13)),
                backgroundColor: AppTheme.bg2,
                side: BorderSide.none,
                onPressed: () => _controller.text = s,
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

  Widget _buildHint(String text) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppTheme.vitaeSoft, borderRadius: BorderRadius.circular(12)),
      child: Row(
        children: [
          const Icon(LucideIcons.info, color: AppTheme.vitae, size: 18),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: GoogleFonts.inter(fontSize: 13, color: AppTheme.vitaeDark))),
        ],
      ),
    );
  }
}