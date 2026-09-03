import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../cv/models/cv_model.dart';
import 'ats_score_badge.dart';
import 'cv_preview.dart';

/// Étape 10 : Aperçu du CV en temps réel
class ApercuStep extends ConsumerWidget {
  final String cvId;
  final Cv cv;
  final VoidCallback onNext;

  const ApercuStep({
    super.key,
    required this.cvId,
    required this.cv,
    required this.onNext,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plan = ref.watch(currentPlanProvider).value ?? 'gratuit';
    final showWatermark = !ref.read(planServiceProvider).exportWithoutWatermark(plan);

    // ⚠️ MVP v1.0 — showWatermark toujours false (PlanService = Premium en dur).
    // Le score ATS reste calculé et affiché quel que soit le plan (promesse cœur).
    final atsResult = ref.watch(atsScoreProvider((cv: cv, cvKey: atsCvKey(cv))));

    return Column(
      children: [
        // Info bar
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: AppTheme.vitaeSoft,
          child: Row(
            children: [
              const Icon(LucideIcons.eye, color: AppTheme.vitae, size: 16),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Aperçu de votre CV — Template: ${_getTemplateName(cv.templateId)}',
                  style: GoogleFonts.inter(fontSize: 12, color: AppTheme.vitaeDark, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
        // Badge ATS — temps réel, recalculé quand le contenu change
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: AtsScoreBadge(result: atsResult),
        ),
        // Aperçu scrollable
        Expanded(
          child: Container(
            color: AppTheme.bg2,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Center(
                child: Container(
                  width: 340,
                  constraints: const BoxConstraints(minHeight: 480),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: CvPreview(cv: cv, showWatermark: showWatermark),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  String _getTemplateName(int id) {
    const names = {1: 'Classique', 2: 'Moderne', 3: 'Élégant', 4: 'Minimal', 5: 'Académique', 6: 'Stage'};
    return names[id] ?? 'Classique';
  }
}