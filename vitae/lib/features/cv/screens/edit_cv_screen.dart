import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../cv/models/cv_model.dart';
import '../widgets/perso_step.dart';
import '../widgets/titre_step.dart';
import '../widgets/resume_step.dart';
import '../widgets/experience_step.dart';
import '../widgets/formation_step.dart';
import '../widgets/competence_step.dart';
import '../widgets/langue_step.dart';
import '../widgets/interet_step.dart';
import '../widgets/template_step.dart';
import '../widgets/apercu_step.dart';

/// Écran d'édition du CV — navigation par étapes (stepper horizontal)
/// Étapes : perso → titre → résumé → expériences → formation → compétences → langues → interets → template → aperçu
class EditCvScreen extends ConsumerStatefulWidget {
  final String cvId;
  final String initialStep;

  const EditCvScreen({
    super.key,
    required this.cvId,
    this.initialStep = 'perso',
  });

  @override
  ConsumerState<EditCvScreen> createState() => _EditCvScreenState();
}

class _EditCvScreenState extends ConsumerState<EditCvScreen> {
  final _steps = [
    EditStep.perso,
    EditStep.titre,
    EditStep.resume,
    EditStep.experience,
    EditStep.formation,
    EditStep.competence,
    EditStep.langue,
    EditStep.interet,
    EditStep.template,
    EditStep.apercu,
  ];

  late int _currentStep;

  @override
  void initState() {
    super.initState();
    _currentStep = _steps.indexWhere((s) => s.key == widget.initialStep);
    if (_currentStep < 0) _currentStep = 0;
  }

  void _next() {
    if (_currentStep < _steps.length - 1) {
      setState(() => _currentStep++);
    }
  }

  void _previous() {
    if (_currentStep > 0) {
      setState(() => _currentStep--);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cvAsync = ref.watch(fullCvProvider(widget.cvId));
    final step = _steps[_currentStep];
    final completedSteps = _completedStepKeys(cvAsync);

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.go('/cv/${widget.cvId}'),
        ),
        title: Text(
          step.title,
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        actions: [
          // Accès direct aperçu depuis n'importe quelle étape
          IconButton(
            icon: const Icon(LucideIcons.eye),
            tooltip: 'Aperçu du CV',
            onPressed: () => setState(() => _currentStep = _steps.length - 1),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Stepper moderne — steps numérotés, complétés, cliquables
            _buildStepIndicator(completedSteps),
            // Contenu
            Expanded(
              child: cvAsync.when(
                loading: () => const Center(
                  child: CircularProgressIndicator(color: AppTheme.vitae),
                ),
                error: (e, _) => Center(child: Text('Erreur: $e')),
                data: (cv) => _buildStepContent(step, cv),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: cvAsync.maybeWhen(
        data: (_) => _buildNavButtons(),
        orElse: () => const SizedBox.shrink(),
      ),
    );
  }

  /// Détermine quelles étapes sont complétées (données non vides).
  Set<EditStep> _completedStepKeys(AsyncValue<Cv> cvAsync) {
    return cvAsync.maybeWhen(
      data: (cv) {
        final done = <EditStep>{};
        for (final step in _steps) {
          final sectionType = _stepSectionType(step);
          if (sectionType == null) {
            // Étapes sans section dédiée (template, aperçu) — considérées
            // comme complétées
            done.add(step);
            continue;
          }
          final section = cv.getSection(sectionType);
          if (section != null && _isSectionFilled(section)) {
            done.add(step);
          }
        }
        return done;
      },
      orElse: () => {},
    );
  }

  SectionType? _stepSectionType(EditStep step) {
    switch (step) {
      case EditStep.perso:
        return SectionType.perso;
      case EditStep.experience:
        return SectionType.experience;
      case EditStep.formation:
        return SectionType.formation;
      case EditStep.competence:
        return SectionType.competence;
      case EditStep.langue:
        return SectionType.langue;
      case EditStep.interet:
        return SectionType.interet;
      default:
        return null;
    }
  }

  bool _isSectionFilled(CvSection section) {
    final data = section.donnees;
    if (data.isEmpty) return false;
    if (data['items'] is List) return (data['items'] as List).isNotEmpty;
    return data.values.any((v) => v != null && v.toString().trim().isNotEmpty);
  }

  /// Stepper horizontal moderne — chips numérotées scrollables.
  /// Étape complétée : check vert. Étape active : chip pleine couleur.
  Widget _buildStepIndicator(Set<EditStep> completed) {
    return Container(
      height: 76,
      color: AppTheme.bg,
      child: Column(
        children: [
          SizedBox(
            height: 68,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: _steps.length,
              itemBuilder: (context, index) {
                final step = _steps[index];
                final isActive = index == _currentStep;
                final isDone = completed.contains(step);

                return GestureDetector(
                  onTap: () => setState(() => _currentStep = index),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: isActive
                          ? AppTheme.vitae
                          : isDone
                              ? AppTheme.success.withValues(alpha: 0.1)
                              : AppTheme.card,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isActive
                            ? AppTheme.vitae
                            : isDone
                                ? AppTheme.success.withValues(alpha: 0.3)
                                : AppTheme.bg2,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Numéro ou check
                        Container(
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            color: isActive
                                ? Colors.white.withValues(alpha: 0.25)
                                : isDone
                                    ? AppTheme.success
                                    : AppTheme.bg2,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: isDone
                                ? const Icon(LucideIcons.check, size: 12, color: Colors.white)
                                : Text(
                                    '${index + 1}',
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: isActive
                                          ? Colors.white
                                          : AppTheme.muted,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          step.title,
                          style: GoogleFonts.inter(
                            fontSize: 12.5,
                            fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                            color: isActive
                                ? Colors.white
                                : isDone
                                    ? AppTheme.success
                                    : AppTheme.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          // Barre de progression fine
          Container(
            height: 2,
            margin: const EdgeInsets.symmetric(horizontal: 16),
            child: LinearProgressIndicator(
              value: (_currentStep + 1) / _steps.length,
              backgroundColor: AppTheme.bg2,
              valueColor: const AlwaysStoppedAnimation(AppTheme.vitae),
              minHeight: 2,
              borderRadius: BorderRadius.circular(1),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepContent(EditStep step, Cv cv) {
    switch (step) {
      case EditStep.perso:
        return PersoStep(cvId: widget.cvId, cv: cv, onNext: _next);
      case EditStep.titre:
        return TitreStep(cvId: widget.cvId, cv: cv, onNext: _next);
      case EditStep.resume:
        return ResumeStep(cvId: widget.cvId, cv: cv, onNext: _next);
      case EditStep.experience:
        return ExperienceStep(cvId: widget.cvId, cv: cv, onNext: _next);
      case EditStep.formation:
        return FormationStep(cvId: widget.cvId, cv: cv, onNext: _next);
      case EditStep.competence:
        return CompetenceStep(cvId: widget.cvId, cv: cv, onNext: _next);
      case EditStep.langue:
        return LangueStep(cvId: widget.cvId, cv: cv, onNext: _next);
      case EditStep.interet:
        return InteretStep(cvId: widget.cvId, cv: cv, onNext: _next);
      case EditStep.template:
        return TemplateStep(cvId: widget.cvId, cv: cv, onNext: _next);
      case EditStep.apercu:
        return ApercuStep(cvId: widget.cvId, cv: cv, onNext: () => context.go('/cv/${widget.cvId}/export'));
    }
  }

  Widget _buildNavButtons() {
    final isLastStep = _currentStep == _steps.length - 1;

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
            if (_currentStep > 0)
              _buildNavIcon(
                icon: LucideIcons.arrowLeft,
                onTap: _previous,
              ),
            if (_currentStep > 0) const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: isLastStep ? () => context.go('/cv/${widget.cvId}/export') : _next,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.vitae,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  elevation: 0,
                ),
                child: Text(
                  isLastStep ? 'Exporter mon CV' : 'Continuer',
                ),
              ),
            ),
            if (!isLastStep) const SizedBox(width: 12),
            if (!isLastStep)
              _buildNavIcon(
                icon: LucideIcons.eye,
                onTap: () => setState(() => _currentStep = _steps.length - 1),
              ),
          ],
        ),
      ),
    );
  }

  /// Petit bouton icône pour actions secondaires de la barre de nav.
  Widget _buildNavIcon({required IconData icon, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: AppTheme.bg2,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Icon(icon, color: AppTheme.text, size: 20),
      ),
    );
  }
}

/// Provider pour un CV complet (avec sections)
final fullCvProvider = FutureProvider.family<Cv, String>((ref, cvId) async {
  final service = ref.read(cvServiceProvider);
  return service.getFullCv(cvId);
});

/// Définition des étapes d'édition
enum EditStep {
  perso('Informations personnelles'),
  titre('Titre professionnel'),
  resume('Résumé professionnel'),
  experience('Expériences'),
  formation('Formation'),
  competence('Compétences'),
  langue('Langues'),
  interet("Centres d'intérêt"),
  template('Template'),
  apercu('Aperçu');

  final String title;
  const EditStep(this.title);

  String get key => name;
}