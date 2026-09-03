import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../cv/models/cv_model.dart';
import '../screens/edit_cv_screen.dart';

/// Étape 3 : Résumé professionnel
class ResumeStep extends ConsumerStatefulWidget {
  final String cvId;
  final Cv cv;
  final VoidCallback onNext;

  const ResumeStep({super.key, required this.cvId, required this.cv, required this.onNext});

  @override
  ConsumerState<ResumeStep> createState() => _ResumeStepState();
}

class _ResumeStepState extends ConsumerState<ResumeStep> {
  final _controller = TextEditingController();
  bool _isSaving = false;

  final _exemplesParSecteur = {
    'Comptabilité / Finance': 'Diplômé en comptabilité, rigoureux et organisé. Maîtrise de Sage et Excel. Expérience en tenue de comptabilité et déclarations fiscales.',
    'Marketing / Communication': 'Professionnel créatif passionné par la communication digitale. Expérience en gestion de réseaux sociaux et création de contenu. À l\'aise en français et en anglais.',
    'Informatique / Tech': 'Développeur polyvalent avec expérience en développement web et mobile. Capacité à travailler en équipe et à résoudre des problèmes complexes.',
    'Commercial / Ventes': 'Commercial dynamique avec expérience en B2B et B2C. Excellente capacité de négociation et de persuasion. Orienté résultats et satisfaction client.',
    'Administration / Secrétariat': 'Assistant de direction organisé et efficace. Maîtrise des outils bureautiques. Excellente gestion du temps et sens du service.',
  };

  String? _selectedSecteur;

  @override
  void initState() {
    super.initState();
    final section = widget.cv.getSection(SectionType.perso);
    _controller.text = section?.donnees['resume'] as String? ?? '';
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
      donnees['resume'] = _controller.text.trim();

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
          _buildHint('3 à 5 lignes pour vous présenter. Soyez concret et professionnel.'),
          const SizedBox(height: 20),
          Text('Résumé professionnel', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.text)),
          const SizedBox(height: 6),
          TextField(
            controller: _controller,
            maxLines: 6,
            maxLength: 300,
            decoration: const InputDecoration(
              hintText: 'Décrivez votre profil en quelques lignes...',
            ),
          ),
          const SizedBox(height: 20),
          Text('Besoin d\'inspiration ? Choisissez votre secteur', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.text)),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _selectedSecteur,
            decoration: const InputDecoration(hintText: 'Sélectionner un secteur'),
            items: _exemplesParSecteur.keys.map((s) => DropdownMenuItem(value: s, child: Text(s, style: GoogleFonts.inter(fontSize: 14)))).toList(),
            onChanged: (val) {
              setState(() => _selectedSecteur = val);
              if (val != null && _controller.text.isEmpty) {
                _controller.text = _exemplesParSecteur[val]!;
              }
            },
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