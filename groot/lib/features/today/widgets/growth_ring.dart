import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/theme/groot_theme.dart';

/// Growth Ring (design system Â§6.3) : anneau de progression du jour
/// autour de l'avatar de Groot â€” un anneau d'Ã©corce qui s'Ã©paissit,
/// jamais une barre de progression classique.
class GrowthRing extends StatelessWidget {
  const GrowthRing({
    super.key,
    required this.progress,
    required this.child,
    this.size = 96,
  });

  /// 0..1 â€” part des habitudes du jour dÃ©jÃ  validÃ©e.
  final double progress;
  final Widget child;
  final double size;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final track = isDark
        ? GrootTheme.textDarkSecondary.withValues(alpha: 0.25)
        : GrootTheme.green300.withValues(alpha: 0.5);
    final fill =
        isDark ? GrootTheme.greenDarkAccent : GrootTheme.green600;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Anneau d'Ã©corce : l'Ã©paisseur croÃ®t avec la progression
          // ("s'Ã©paissit", design system Â§6.3), pas seulement la couleur.
          CustomPaint(
            size: Size.square(size),
            painter: _BarkRingPainter(
              track: track,
              fill: fill,
              progress: progress.clamp(0, 1),
            ),
          ),
          child,
        ],
      ),
    );
  }
}

class _BarkRingPainter extends CustomPainter {
  _BarkRingPainter({
    required this.track,
    required this.fill,
    required this.progress,
  });

  final Color track;
  final Color fill;
  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    // Anneau de fond â€” Ã©corce.
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = track
        ..style = PaintingStyle.stroke
        ..strokeWidth = 5,
    );

    if (progress <= 0) return;

    // Anneau de remplissage : s'Ã©paissit avec la constance du jour
    // (5px Ã  vide â†’ 8px Ã  pleine journÃ©e).
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2, // dÃ©part en haut, comme un cadran
      2 * math.pi * progress,
      false,
      Paint()
        ..color = fill
        ..style = PaintingStyle.stroke
        ..strokeWidth = 5 + 3 * progress
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_BarkRingPainter old) =>
      old.progress != progress || old.fill != fill;
}