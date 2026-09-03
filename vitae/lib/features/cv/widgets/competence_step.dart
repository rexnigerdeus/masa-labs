import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../cv/models/cv_model.dart';
import '../screens/edit_cv_screen.dart';

/// Étape 6 : Compétences (tags + champ libre)
class CompetenceStep extends ConsumerStatefulWidget {
  final String cvId;
  final Cv cv;
  final VoidCallback onNext;

  const CompetenceStep({super.key, required this.cvId, required this.cv, required this.onNext});

  @override
  ConsumerState<CompetenceStep> createState() => _CompetenceStepState();
}

class _CompetenceStepState extends ConsumerState<CompetenceStep> {
  List<String> _items = [];
  bool _isSaving = false;
  final _inputController = TextEditingController();

  final _suggestions = [
    'Excel', 'Word', 'PowerPoint', 'Sage', 'Photoshop', 'Illustrator',
    'Suite Adobe', 'Canva', 'Figma', 'HTML/CSS', 'JavaScript', 'Python',
    'Java', 'SQL', 'Marketing digital', 'Réseaux sociaux', 'Gestion de projet',
    'Comptabilité', 'Facturation', 'Service client', 'Négociation',
    'Anglais', 'Français', 'Gestion du temps', 'Leadership',
  ];

  @override
  void initState() {
    super.initState();
    final section = widget.cv.getSection(SectionType.competence);
    _items = List<String>.from(
      (section?.donnees['items'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }

  @override
  void dispose() {
    _inputController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      final cvService = ref.read(cvServiceProvider);
      await cvService.saveSection(cvId: widget.cvId, type: SectionType.competence, donnees: {'items': _items});
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

  void _addCompetence(String value) {
    final trimmed = value.trim();
    if (trimmed.isNotEmpty && !_items.contains(trimmed)) {
      setState(() {
        _items.add(trimmed);
        _inputController.clear();
      });
    }
  }

  void _removeCompetence(String value) {
    setState(() => _items.remove(value));
  }

  @override
  Widget build(BuildContext context) {
    final availableSuggestions = _suggestions.where((s) => !_items.contains(s)).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHint('Cochez ou ajoutez vos compétences techniques, logiciels et qualités.'),
          const SizedBox(height: 16),
          // Champ de saisie
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _inputController,
                  decoration: const InputDecoration(
                    hintText: 'Ajouter une compétence...',
                    prefixIcon: Icon(LucideIcons.plus, size: 20),
                  ),
                  onSubmitted: _addCompetence,
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filled(
                onPressed: () => _addCompetence(_inputController.text),
                icon: const Icon(LucideIcons.check, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Tags sélectionnés
          if (_items.isNotEmpty) ...[
            Text('Vos compétences', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.text)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _items.map((comp) {
                return Chip(
                  label: Text(comp, style: GoogleFonts.inter(fontSize: 13, color: AppTheme.vitaeDark)),
                  backgroundColor: AppTheme.vitaeSoft,
                  side: BorderSide.none,
                  deleteIcon: const Icon(LucideIcons.x, size: 16),
                  onDeleted: () => _removeCompetence(comp),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
          ],
          // Suggestions
          if (availableSuggestions.isNotEmpty) ...[
            Text('Suggestions', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.text)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: availableSuggestions.map((s) {
                return ActionChip(
                  label: Text(s, style: GoogleFonts.inter(fontSize: 13)),
                  backgroundColor: AppTheme.bg2,
                  side: BorderSide.none,
                  onPressed: () => _addCompetence(s),
                );
              }).toList(),
            ),
          ],
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