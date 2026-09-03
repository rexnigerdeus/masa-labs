import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../cv/models/cv_model.dart';
import '../screens/edit_cv_screen.dart';

/// Étape 1 : Informations personnelles
class PersoStep extends ConsumerStatefulWidget {
  final String cvId;
  final Cv cv;
  final VoidCallback onNext;

  const PersoStep({
    super.key,
    required this.cvId,
    required this.cv,
    required this.onNext,
  });

  @override
  ConsumerState<PersoStep> createState() => _PersoStepState();
}

class _PersoStepState extends ConsumerState<PersoStep> {
  final _prenomController = TextEditingController();
  final _nomController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _villeController = TextEditingController();
  final _linkedinController = TextEditingController();
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final section = widget.cv.getSection(SectionType.perso);
    final d = section?.donnees ?? {};
    _prenomController.text = d['prenom'] as String? ?? '';
    _nomController.text = d['nom'] as String? ?? '';
    _phoneController.text = d['phone'] as String? ?? '';
    _emailController.text = d['email'] as String? ?? '';
    _villeController.text = d['ville'] as String? ?? '';
    _linkedinController.text = d['linkedin'] as String? ?? '';
  }

  @override
  void dispose() {
    _prenomController.dispose();
    _nomController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _villeController.dispose();
    _linkedinController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    try {
      final cvService = ref.read(cvServiceProvider);
      await cvService.saveSection(
        cvId: widget.cvId,
        type: SectionType.perso,
        donnees: {
          'prenom': _prenomController.text.trim(),
          'nom': _nomController.text.trim(),
          'phone': _phoneController.text.trim(),
          'email': _emailController.text.trim(),
          'ville': _villeController.text.trim(),
          'linkedin': _linkedinController.text.trim(),
        },
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
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHint('Ces informations apparaissent en haut de votre CV'),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(child: _buildField('Prénom', _prenomController, hint: 'Aya')),
              const SizedBox(width: 12),
              Expanded(child: _buildField('Nom', _nomController, hint: 'Koné')),
            ],
          ),
          const SizedBox(height: 16),
          _buildField('Téléphone', _phoneController, hint: '07 00 00 00 00', icon: LucideIcons.phone),
          const SizedBox(height: 16),
          _buildField('Email (optionnel)', _emailController, hint: 'aya.kone@email.com', icon: LucideIcons.mail),
          const SizedBox(height: 16),
          _buildField('Ville / Pays', _villeController, hint: 'Abidjan, Côte d\'Ivoire', icon: LucideIcons.mapPin),
          const SizedBox(height: 16),
          _buildField('LinkedIn (optionnel)', _linkedinController, hint: 'linkedin.com/in/aya-kone', icon: LucideIcons.link),
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
      decoration: BoxDecoration(
        color: AppTheme.vitaeSoft,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(LucideIcons.info, color: AppTheme.vitae, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.inter(fontSize: 13, color: AppTheme.vitaeDark),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildField(String label, TextEditingController controller, {String? hint, IconData? icon}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.text)),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: icon != null ? Icon(icon, size: 20) : null,
          ),
        ),
      ],
    );
  }
}