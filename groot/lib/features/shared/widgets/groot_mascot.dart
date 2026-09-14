import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/models/habit_models.dart';
import '../../../core/theme/groot_theme.dart';

/// Groot, la mascotte â€” entiÃ¨rement dessinÃ©e en CustomPainter (zÃ©ro asset,
/// dÃ©cision v1). Design system Â§5 : composant d'Ã©tat, pas illustration.
///
///   graine       : immobile, lÃ©gÃ¨re pulsation douce
///   pousse       : balancement lÃ©ger, 1 feuille
///   jeune-arbre  : feuillage plein, penche au tap
///   arbre-ancien : feuillage dorÃ©, lucioles ambiantes lentes
///   en-attente   : une feuille tombe une fois, posture neutre â€” jamais triste
///
/// Chaque Ã©tat existe en version statique (listes, notifications) et
/// animÃ©e (accueil, Jardin) : `animated: false` coupe tout ticker.
class GrootMascot extends StatefulWidget {
  const GrootMascot({
    super.key,
    required this.stage,
    this.size = 120,
    this.animated = true,
    this.waiting = false,
    this.decorations = const [],
    this.onTap,
  });

  final MascotStage stage;

  /// Taille du carrÃ© de dessin.
  final double size;

  /// Version animÃ©e (accueil, jardin) vs statique (listes, notifications).
  final bool animated;

  /// Ã‰tat "en-attente" (Â§5) : une feuille tombe une fois, doucement.
  final bool waiting;

  /// DÃ©corations dÃ©bloquÃ©es (Â§3) : Ã©charpe, lanterne, luciolesâ€¦
  final List<String> decorations;

  /// Le jeune arbre penche au tap (Â§5) â€” callback optionnel.
  final VoidCallback? onTap;

  @override
  State<GrootMascot> createState() => _GrootMascotState();
}

class _GrootMascotState extends State<GrootMascot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );
    if (widget.animated) {
      _controller.repeat();
    }
  }

  @override
  void didUpdateWidget(GrootMascot old) {
    super.didUpdateWidget(old);
    if (widget.animated && !_controller.isAnimating) {
      _controller.repeat();
    } else if (!widget.animated && _controller.isAnimating) {
      _controller.stop();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Semantics(
      // LibellÃ© VoiceOver/TalkBack (design system Â§9) : jamais un simple
      // "image" â€” l'Ã©tat et la constance se lisent.
      label: widget.stage.semanticLabel(0),
      child: RepaintBoundary(
        child: GestureDetector(
          onTap: widget.onTap,
          child: SizedBox(
            width: widget.size,
            height: widget.size,
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) => CustomPaint(
                painter: _GrootPainter(
                  stage: widget.stage,
                  t: widget.animated ? _controller.value : 0.5,
                  isDark: isDark,
                  waiting: widget.waiting,
                  decorations: widget.decorations,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _GrootPainter extends CustomPainter {
  _GrootPainter({
    required this.stage,
    required this.t,
    required this.isDark,
    this.waiting = false,
    this.decorations = const [],
  });

  final MascotStage stage;
  final double t; // 0..1 en boucle
  final bool isDark;
  final bool waiting;
  final List<String> decorations;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width; // carrÃ©
    final center = Offset(s / 2, s * 0.62);

    // ---- Fond : le pot, toujours prÃ©sent (Â§3 : personnalisation) ----
    _drawPot(canvas, s);

    switch (stage) {
      case MascotStage.graine:
        _drawSeed(canvas, s, center);
        break;
      case MascotStage.pousse:
        _drawSprout(canvas, s, center);
        break;
      case MascotStage.jeuneArbre:
        _drawYoungTree(canvas, s, center);
        break;
      case MascotStage.arbreAncien:
        _drawAncientTree(canvas, s, center);
        break;
    }

    // ---- DÃ©corations dÃ©bloquÃ©es (Â§3, Â§6.C) ----
    if (decorations.contains('echarpe')) _drawScarf(canvas, s, center);
    if (decorations.contains('lanterne')) _drawLantern(canvas, s);
    if (decorations.contains('lucioles') ||
        stage == MascotStage.arbreAncien) {
      _drawFireflies(canvas, s);
    }

    // ---- Ã‰tat en-attente (Â§5) : une feuille tombe une fois, doucement,
    // puis reste posÃ©e au pied â€” Groot garde son sourire (Â§7). ----
    if (waiting) {
      _drawFallingLeaf(canvas, s, center);
    }
  }

  void _drawFallingLeaf(Canvas canvas, double s, Offset center) {
    // La feuille descend sur un cycle lent puis se pose Ã  cÃ´tÃ© du pot :
    // "il attend ton retour" (brief Â§3), jamais de chute brutale.
    final progress = math.min(1.0, t * 1.4); // tombe puis se repose
    final startY = center.dy - s * 0.30;
    final endY = center.dy + s * 0.16;
    final y = startY + (endY - startY) * progress;
    final x = center.dx +
        s * 0.14 * math.sin(progress * math.pi); // arc doux en tombant
    _drawLeaf(
      canvas,
      Offset(x, y),
      s * 0.06,
      direction: progress < 0.5 ? 1 : -1,
    );
  }

  // ==================== POT ====================

  void _drawPot(Canvas canvas, double s) {
    final isCeramic = decorations.contains('pot-ceramique');
    final isTerracotta = decorations.contains('pot-terracotta');
    final potColor = isCeramic
        ? (isDark ? GrootTheme.greenDarkAccent : GrootTheme.green600)
        : isTerracotta
            ? GrootTheme.clay500
            : GrootTheme.bark600;

    final potPath = Path()
      ..moveTo(s * 0.30, s * 0.72)
      ..lineTo(s * 0.70, s * 0.72)
      ..lineTo(s * 0.64, s * 0.94)
      ..quadraticBezierTo(s * 0.5, s * 0.99, s * 0.36, s * 0.94)
      ..close();

    // Rebord du pot.
    final rimPath = Path()
      ..addRRect(RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(s * 0.5, s * 0.71),
          width: s * 0.46,
          height: s * 0.07,
        ),
        const Radius.circular(6),
      ));

    canvas.drawPath(potPath, Paint()..color = potColor);
    canvas.drawPath(
      rimPath,
      Paint()..color = potColor.withValues(alpha: 0.85),
    );
    // Terre.
    canvas.drawCircle(
      Offset(s * 0.5, s * 0.70),
      s * 0.19,
      Paint()..color = isDark ? const Color(0xFF2E2418) : const Color(0xFF5C4630),
    );
  }

  // ==================== Ã‰TAT 1 : GRAINE ====================

  void _drawSeed(Canvas canvas, double s, Offset center) {
    // Immobile, lÃ©gÃ¨re pulsation douce (Â§5) : Ã©chelle 0.96 â†’ 1.04.
    final pulse = 1.0 + 0.04 * math.sin(t * 2 * math.pi);
    final radius = s * 0.09 * pulse;

    final seedPath = Path()
      ..moveTo(center.dx, center.dy - radius * 1.6)
      ..quadraticBezierTo(
        center.dx + radius,
        center.dy - radius * 0.3,
        center.dx,
        center.dy + radius,
      )
      ..quadraticBezierTo(
        center.dx - radius,
        center.dy - radius * 0.3,
        center.dx,
        center.dy - radius * 1.6,
      )
      ..close();

    canvas.drawPath(
      seedPath,
      Paint()..color = isDark ? GrootTheme.amberDarkAccent : GrootTheme.amber500,
    );
    // Petit reflet.
    canvas.drawCircle(
      Offset(center.dx - radius * 0.3, center.dy - radius * 0.5),
      radius * 0.14,
      Paint()..color = Colors.white.withValues(alpha: 0.5),
    );
    // Yeux ronds expressifs, fermÃ©s-paisibles Ã  ce stade : deux points.
    _drawEyes(canvas, center.dx, center.dy - radius * 0.6, radius * 0.16, closed: true);
  }

  // ==================== Ã‰TAT 2 : POUSSE ====================

  void _drawSprout(Canvas canvas, double s, Offset center) {
    // Balancement lÃ©ger (Â§5) : Â±3Â° autour de la base.
    final sway = 0.05 * math.sin(t * 2 * math.pi);
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(sway);

    // Tige.
    final stem = Path()
      ..moveTo(0, 0)
      ..quadraticBezierTo(s * 0.02, -s * 0.12, 0, -s * 0.22);
    canvas.drawPath(
      stem,
      Paint()
        ..color = isDark ? GrootTheme.greenDarkAccent : GrootTheme.green600
        ..style = PaintingStyle.stroke
        ..strokeWidth = s * 0.025
        ..strokeCap = StrokeCap.round,
    );

    // 1 feuille (Â§5).
    _drawLeaf(
      canvas,
      Offset(s * 0.045, -s * 0.20),
      s * 0.10,
      direction: 1,
    );

    // Yeux ouverts.
    _drawEyes(canvas, 0, -s * 0.16, s * 0.02, closed: false);
    // Sourire discret.
    _drawSmile(canvas, 0, -s * 0.13, s * 0.045);

    canvas.restore();
  }

  // ==================== Ã‰TAT 3 : JEUNE ARBRE ====================

  void _drawYoungTree(Canvas canvas, double s, Offset center) {
    // Balancement plus ample que la pousse.
    final sway = 0.04 * math.sin(t * 2 * math.pi);
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(sway);

    // Tronc faÃ§on Ã©corce tendre.
    final trunk = Path()
      ..moveTo(-s * 0.035, 0)
      ..quadraticBezierTo(-s * 0.015, -s * 0.15, -s * 0.02, -s * 0.28)
      ..lineTo(s * 0.02, -s * 0.28)
      ..quadraticBezierTo(s * 0.015, -s * 0.15, s * 0.035, 0)
      ..close();
    canvas.drawPath(
      trunk,
      Paint()..color = isDark ? const Color(0xFF3E4A38) : GrootTheme.bark600,
    );

    // Feuillage : 3 blobs organiques asymÃ©triques (Â§0 : jamais uniforme).
    final leafColor =
        isDark ? GrootTheme.greenDarkAccent : GrootTheme.green600;
    final leafLight =
        isDark ? leafColor.withValues(alpha: 0.7) : GrootTheme.green300;
    _drawCanopyBlob(canvas, Offset(0, -s * 0.36), s * 0.15, leafColor);
    _drawCanopyBlob(canvas, Offset(-s * 0.10, -s * 0.28), s * 0.10, leafLight);
    _drawCanopyBlob(canvas, Offset(s * 0.10, -s * 0.30), s * 0.11, leafLight);

    // Yeux grands et ronds (faÃ§on Ghibli, pas Marvel â€” Â§3).
    _drawEyes(canvas, 0, -s * 0.335, s * 0.022, closed: false);
    _drawSmile(canvas, 0, -s * 0.29, s * 0.05);

    canvas.restore();
  }

  // ==================== Ã‰TAT 4 : ARBRE ANCIEN ====================

  void _drawAncientTree(Canvas canvas, double s, Offset center) {
    final sway = 0.03 * math.sin(t * 2 * math.pi);
    canvas.save();
    canvas.translate(center.dx, center.dy);
    canvas.rotate(sway);

    // Tronc plus large, racines qui Ã©pousent le pot.
    final trunk = Path()
      ..moveTo(-s * 0.06, 0)
      ..quadraticBezierTo(-s * 0.025, -s * 0.18, -s * 0.03, -s * 0.34)
      ..lineTo(s * 0.03, -s * 0.34)
      ..quadraticBezierTo(s * 0.025, -s * 0.18, s * 0.06, 0)
      ..close();
    canvas.drawPath(
      trunk,
      Paint()..color = isDark ? const Color(0xFF4A4030) : const Color(0xFF6B4E33),
    );

    // Feuillage dorÃ© (Â§3) â€” la rÃ©compense visuelle ultime, ambre rÃ©servÃ©
    // aux moments de rÃ©compense (design system Â§1.3 : jamais de l'UI).
    final gold = isDark ? GrootTheme.amberDarkAccent : GrootTheme.amber500;
    _drawCanopyBlob(canvas, Offset(0, -s * 0.44), s * 0.19, gold);
    _drawCanopyBlob(
      canvas,
      Offset(-s * 0.13, -s * 0.35),
      s * 0.12,
      gold.withValues(alpha: 0.8),
    );
    _drawCanopyBlob(
      canvas,
      Offset(s * 0.13, -s * 0.37),
      s * 0.13,
      gold.withValues(alpha: 0.85),
    );
    // Quelques feuilles vertes pour la profondeur.
    _drawCanopyBlob(
      canvas,
      Offset(0, -s * 0.38),
      s * 0.10,
      GrootTheme.green600.withValues(alpha: 0.9),
    );

    _drawEyes(canvas, 0, -s * 0.41, s * 0.024, closed: false);
    _drawSmile(canvas, 0, -s * 0.36, s * 0.055);

    canvas.restore();
  }

  // ==================== Ã‰LÃ‰MENTS ====================

  void _drawLeaf(Canvas canvas, Offset at, double size, {int direction = 1}) {
    final path = Path()
      ..moveTo(at.dx, at.dy)
      ..quadraticBezierTo(
        at.dx + direction * size * 0.7,
        at.dy - size * 0.45,
        at.dx + direction * size * 1.1,
        at.dy - size * 0.8,
      )
      ..quadraticBezierTo(
        at.dx + direction * size * 0.35,
        at.dy - size * 0.65,
        at.dx,
        at.dy,
      )
      ..close();
    canvas.drawPath(
      path,
      Paint()..color = isDark ? GrootTheme.greenDarkAccent : GrootTheme.green600,
    );
    // Nervure centrale.
    canvas.drawLine(
      at,
      at.translate(direction * size * 0.9, -size * 0.6),
      Paint()
        ..color = Colors.white.withValues(alpha: 0.25)
        ..strokeWidth = 1,
    );
  }

  void _drawCanopyBlob(Canvas canvas, Offset at, double r, Color color) {
    // Blob organique : cercle + ondulations â€” jamais un cercle pur (Â§0).
    final path = Path();
    final steps = 9;
    for (var i = 0; i <= steps; i++) {
      final angle = i / steps * 2 * math.pi;
      final wobble = 1.0 +
          0.12 *
              math.sin(angle * 3 + at.dx); // asymÃ©trie liÃ©e Ã  la position
      final point = Offset(
        at.dx + math.cos(angle) * r * wobble,
        at.dy + math.sin(angle) * r * wobble,
      );
      if (i == 0) {
        path.moveTo(point.dx, point.dy);
      } else {
        path.lineTo(point.dx, point.dy);
      }
    }
    path.close();
    canvas.drawPath(path, Paint()..color = color);
  }

  void _drawEyes(
    Canvas canvas,
    double cx,
    double cy,
    double r, {
    required bool closed,
  }) {
    final paint = Paint()
      ..color = isDark ? GrootTheme.textDarkPrimary : GrootTheme.ink900;
    if (closed) {
      // Paisible : deux traits horizontaux arrondis.
      for (final dx in [-r * 2.2, r * 2.2]) {
        canvas.drawLine(
          Offset(cx + dx - r, cy),
          Offset(cx + dx + r, cy),
          paint
            ..strokeWidth = r * 0.9
            ..strokeCap = StrokeCap.round,
        );
      }
    } else {
      for (final dx in [-r * 2.2, r * 2.2]) {
        canvas.drawCircle(Offset(cx + dx, cy), r, paint);
        // Reflet de vie.
        canvas.drawCircle(
          Offset(cx + dx - r * 0.3, cy - r * 0.35),
          r * 0.3,
          Paint()..color = Colors.white,
        );
      }
    }
  }

  void _drawSmile(Canvas canvas, double cx, double cy, double w) {
    final path = Path()
      ..moveTo(cx - w, cy)
      ..quadraticBezierTo(cx, cy + w * 0.7, cx + w, cy);
    canvas.drawPath(
      path,
      Paint()
        ..color = isDark ? GrootTheme.textDarkPrimary : GrootTheme.ink900
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.6
        ..strokeCap = StrokeCap.round,
    );
  }

  void _drawScarf(Canvas canvas, double s, Offset center) {
    // Ã‰charpe autour du tronc, offerte au badge "Sept feuilles".
    final y = stage == MascotStage.graine ? -s * 0.02 : -s * 0.12;
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(center.dx, center.dy + y),
          width: s * 0.16,
          height: s * 0.05,
        ),
        const Radius.circular(4),
      ),
      Paint()..color = GrootTheme.clay500,
    );
    // Bout pendant.
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(center.dx + s * 0.08, center.dy + y + s * 0.05),
          width: s * 0.04,
          height: s * 0.09,
        ),
        const Radius.circular(3),
      ),
      Paint()..color = GrootTheme.clay500,
    );
  }

  void _drawLantern(Canvas canvas, double s) {
    // Lanterne suspendue Ã  droite â€” badge "Deux mois".
    final sway = 0.05 * math.sin(t * 2 * math.pi + 1);
    canvas.save();
    canvas.translate(s * 0.86 + sway * s * 0.02, s * 0.30);
    canvas.drawCircle(
      Offset.zero,
      s * 0.045,
      Paint()..color = GrootTheme.amber500.withValues(alpha: 0.9),
    );
    canvas.drawCircle(
      Offset.zero,
      s * 0.028,
      Paint()..color = Colors.white.withValues(alpha: 0.5),
    );
    canvas.restore();
  }

  void _drawFireflies(Canvas canvas, double s) {
    // Lucioles dorÃ©es en boucle lente (Â§5 : arbre ancien + semaine
    // parfaite, Â§7 : "pluie de lucioles").
    final gold = isDark ? GrootTheme.amberDarkAccent : GrootTheme.amber500;
    for (var i = 0; i < 5; i++) {
      final phase = t * 2 * math.pi + i * 1.3;
      final x = s * (0.18 + 0.64 * (0.5 + 0.5 * math.sin(phase * 0.7 + i)));
      final y = s * (0.15 + 0.5 * (0.5 + 0.5 * math.cos(phase + i * 2)));
      final alpha = 0.35 + 0.45 * (0.5 + 0.5 * math.sin(phase * 1.5));
      canvas.drawCircle(
        Offset(x, y),
        s * 0.012,
        Paint()..color = gold.withValues(alpha: alpha),
      );
      // Halo doux.
      canvas.drawCircle(
        Offset(x, y),
        s * 0.03,
        Paint()..color = gold.withValues(alpha: alpha * 0.2),
      );
    }
  }

  // ==================== FEUILLE QUI TOMBE (en-attente) ====================

  // L'Ã©tat en-attente est rendu par `_drawFallingLeaf` appelÃ© depuis
  // `paint` quand `waiting` est vrai : une feuille tombe UNE fois puis
  // reste posÃ©e â€” Groot garde son sourire (Â§5, Â§7).

  @override
  bool shouldRepaint(_GrootPainter old) =>
      old.stage != stage ||
      old.t != t ||
      old.isDark != isDark ||
      old.waiting != waiting ||
      old.decorations.length != decorations.length;
}