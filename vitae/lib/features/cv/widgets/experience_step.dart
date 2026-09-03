import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../cv/models/cv_model.dart';
import '../screens/edit_cv_screen.dart';

/// Étape 4 : Expériences professionnelles
class ExperienceStep extends ConsumerStatefulWidget {
  final String cvId;
  final Cv cv;
  final VoidCallback onNext;

  const ExperienceStep({super.key, required this.cvId, required this.cv, required this.onNext});

  @override
  ConsumerState<ExperienceStep> createState() => _ExperienceStepState();
}

class _ExperienceStepState extends ConsumerState<ExperienceStep> {
  List<Map<String, dynamic>> _items = [];
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final section = widget.cv.getSection(SectionType.experience);
    _items = List<Map<String, dynamic>>.from(
      (section?.donnees['items'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [],
    );
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      final cvService = ref.read(cvServiceProvider);
      await cvService.saveSection(
        cvId: widget.cvId,
        type: SectionType.experience,
        donnees: {'items': _items},
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

  void _addItem() {
    setState(() {
      _items.add({
        'poste': '',
        'entreprise': '',
        'duree': '',
        'description': '',
      });
    });
  }

  void _removeItem(int index) {
    setState(() => _items.removeAt(index));
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHint('Ajoutez vos expériences, de la plus récente à la plus ancienne.'),
          const SizedBox(height: 16),
          ..._items.asMap().entries.map((entry) {
            final index = entry.key;
            final item = entry.value;
            return _buildExperienceCard(index, item);
          }),
          if (_items.isEmpty)
            _buildEmptyState(),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _addItem,
              icon: const Icon(LucideIcons.plus, size: 18),
              label: const Text('Ajouter une expérience'),
            ),
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

  Widget _buildExperienceCard(int index, Map<String, dynamic> item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.bg2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Expérience ${index + 1}', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppTheme.text)),
              IconButton(
                icon: const Icon(LucideIcons.trash2, size: 18, color: AppTheme.error),
                onPressed: () => _removeItem(index),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _buildField('Poste', item, 'poste', hint: 'Ex: Comptable junior'),
          const SizedBox(height: 12),
          _buildField('Entreprise', item, 'entreprise', hint: 'Ex: Cabinet Kone & Associés'),
          const SizedBox(height: 12),
          _buildField('Durée', item, 'duree', hint: 'Ex: Jan 2023 - Présent'),
          const SizedBox(height: 12),
          _buildField('Description des tâches', item, 'description', hint: 'Décrivez vos missions...', maxLines: 3),
        ],
      ),
    );
  }

  Widget _buildField(String label, Map<String, dynamic> item, String key, {String? hint, int maxLines = 1}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.muted)),
        const SizedBox(height: 4),
        TextFormField(
          initialValue: item[key] as String? ?? '',
          maxLines: maxLines,
          decoration: InputDecoration(hintText: hint),
          onChanged: (val) => item[key] = val,
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          const Icon(LucideIcons.briefcase, color: AppTheme.muted2, size: 40),
          const SizedBox(height: 12),
          Text('Aucune expérience ajoutée', style: GoogleFonts.inter(fontSize: 14, color: AppTheme.muted)),
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