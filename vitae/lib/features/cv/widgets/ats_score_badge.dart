import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../services/ats_score_service.dart';

/// Badge "Score ATS : XX/100" + liste repliable de recommandations.
///
/// Affiché sur l'aperçu (écran 14) et l'export (écran 16).
/// - Score >= 80 : badge vert "CV compatible ATS"
/// - Score < 80  : badge rouge/amber + liste des recommandations actionnables
class AtsScoreBadge extends StatelessWidget {
  final AtsResult result;
  final bool expanded;
  final bool showRecommendations;

  const AtsScoreBadge({
    super.key,
    required this.result,
    this.expanded = false,
    this.showRecommendations = true,
  });

  @override
  Widget build(BuildContext context) {
    final ok = result.canExport;
    final color = ok ? AppTheme.success : AppTheme.warning;
    final icon = ok ? LucideIcons.shieldCheck : LucideIcons.alertTriangle;
    final label = ok
        ? 'Score ATS : ${result.score}/100 — CV compatible ATS'
        : 'Score ATS : ${result.score}/100 — ${result.missingPoints} pts manquants';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.text,
                  ),
                ),
              ),
            ],
          ),
          if (showRecommendations && !ok && result.recommendations.isNotEmpty) ...[
            const SizedBox(height: 10),
            const Divider(height: 1, color: Color(0x11000000)),
            const SizedBox(height: 10),
            Text(
              'Pour atteindre 80/100 et pouvoir exporter :',
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppTheme.muted,
              ),
            ),
            const SizedBox(height: 6),
            ...result.recommendations.map((r) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(LucideIcons.circleDot, size: 12, color: AppTheme.warning),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          r.label,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: AppTheme.text,
                            height: 1.3,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '+${r.points}',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: color,
                          ),
                        ),
                      ),
                    ],
                  ),
                )),
          ],
          if (showRecommendations && ok) ...[
            const SizedBox(height: 6),
            Text(
              'Vous pouvez postuler en ligne sereinement — votre CV sera lu par les ATS.',
              style: GoogleFonts.inter(
                fontSize: 11,
                color: AppTheme.muted,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ],
      ),
    );
  }
}