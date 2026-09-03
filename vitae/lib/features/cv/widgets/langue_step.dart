import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../cv/models/cv_model.dart';
import '../screens/edit_cv_screen.dart';

/// Étape 7 : Langues avec niveau
class LangueStep extends ConsumerStatefulWidget {
  final String cvId;
  final Cv cv;
  final VoidCallback onNext;

  const LangueStep({super.key, required this.cvId, required this.cv, required this.onNext});

  @override
  ConsumerState<LangueStep> createState() => _LangueStepState();
}

class _LangueStepState extends ConsumerState<LangueStep> {
  List<Map<String, dynamic>> _items = [];
  bool _isSaving = false;

  final _niveaux = ['Notions', 'Intermédiaire', 'Courant', 'Bilingue', 'Natif'];
  final _languesCourantes = ['Français', 'Anglais', 'Allemand', 'Espagnol', 'Italien', 'Arabe', 'Wolof', 'Bambara'];

  @override
  void initState() {
    super.initState();
    final section = widget.cv.getSection(SectionType.langue);
    _items = List<Map<String, dynamic>>.from(
      (section?.donnees['items'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [],
    );
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      final cvService = ref.read(cvServiceProvider);
      await cvService.saveSection(cvId: widget.cvId, type: SectionType.langue, donnees: {'items': _items});
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

  void _addLangue(String langue) {
    setState(() {
      _items.add({'langue': langue, 'niveau': 'Intermédiaire'});
    });
  }

  void _removeLangue(int index) {
    setState(() => _items.removeAt(index));
  }

  @override
  Widget build(BuildContext context) {
    final availableLangues = _languesCourantes.where((l) => !_items.any((i) => i['langue'] == l)).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHint('Indiquez les langues que vous parlez et votre niveau.'),
          const SizedBox(height: 16),
          // Langues ajoutées
          ..._items.asMap().entries.map((entry) {
            final index = entry.key;
            final item = entry.value;
            return _buildLangueCard(index, item);
          }),
          if (_items.isEmpty)
            _buildEmptyState(),
          const SizedBox(height: 16),
          // Suggestions rapides
          if (availableLangues.isNotEmpty) ...[
            Text('Ajouter rapidement', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.text)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: availableLangues.map((l) {
                return ActionChip(
                  label: Text(l, style: GoogleFonts.inter(fontSize: 13)),
                  backgroundColor: AppTheme.bg2,
                  side: BorderSide.none,
                  avatar: const Icon(LucideIcons.plus, size: 14),
                  onPressed: () => _addLangue(l),
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

  Widget _buildLangueCard(int index, Map<String, dynamic> item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.bg2),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: TextFormField(
              initialValue: item['langue'] as String? ?? '',
              decoration: const InputDecoration(hintText: 'Langue'),
              onChanged: (val) => item['langue'] = val,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 3,
            child: DropdownButtonFormField<String>(
              value: _niveaux.contains(item['niveau'] as String?) ? item['niveau'] as String? : 'Intermédiaire',
              isExpanded: true,
              decoration: const InputDecoration(hintText: 'Niveau'),
              items: _niveaux.map((n) => DropdownMenuItem(value: n, child: Text(n, style: GoogleFonts.inter(fontSize: 13), overflow: TextOverflow.ellipsis))).toList(),
              onChanged: (val) => setState(() => item['niveau'] = val),
            ),
          ),
          const SizedBox(width: 4),
          SizedBox(
            width: 40,
            child: IconButton(
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              icon: const Icon(LucideIcons.trash2, size: 18, color: AppTheme.error),
              onPressed: () => _removeLangue(index),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          const Icon(LucideIcons.languages, color: AppTheme.muted2, size: 40),
          const SizedBox(height: 12),
          Text('Aucune langue ajoutée', style: GoogleFonts.inter(fontSize: 14, color: AppTheme.muted)),
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