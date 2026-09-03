import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:printing/printing.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../models/cv_model.dart';
import '../screens/edit_cv_screen.dart';
import '../services/cv_pdf_generator.dart';
import '../widgets/ats_score_badge.dart';

/// Écran d'export PDF + partage WhatsApp
class ExportScreen extends ConsumerStatefulWidget {
  final String cvId;

  const ExportScreen({super.key, required this.cvId});

  @override
  ConsumerState<ExportScreen> createState() => _ExportScreenState();
}

class _ExportScreenState extends ConsumerState<ExportScreen> {
  bool _isGenerating = false;

  @override
  Widget build(BuildContext context) {
    final cvAsync = ref.watch(fullCvProvider(widget.cvId));
    final plan = ref.watch(currentPlanProvider).value ?? 'gratuit';

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.go('/cv/${widget.cvId}'),
        ),
        title: Text('Exporter', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600)),
      ),
      body: SafeArea(
        child: cvAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.vitae)),
          error: (e, _) => Center(child: Text('Erreur: $e')),
          data: (cv) => _buildBody(cv, plan),
        ),
      ),
    );
  }

  Widget _buildBody(Cv cv, String plan) {
    final showWatermark = !ref.read(planServiceProvider).exportWithoutWatermark(plan);

    // Score ATS — bloque l'export si < 80
    final atsResult = ref.watch(atsScoreProvider((cv: cv, cvKey: atsCvKey(cv))));
    final canExport = atsResult.canExport;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          Text(
            'Exporter votre CV',
            style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w700, color: AppTheme.text),
          ),
          const SizedBox(height: 8),
          Text(
            'Format A4 — optimisé pour impression et envoi email',
            style: GoogleFonts.inter(fontSize: 14, color: AppTheme.muted),
          ),
          const SizedBox(height: 16),

          // Badge ATS — bloque l'export si score < 80
          AtsScoreBadge(result: atsResult),
          const SizedBox(height: 20),

          if (showWatermark) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.warning.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.info, color: AppTheme.warning, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Le watermark "Créé avec Vitae" sera visible.\nPassez Premium pour le retirer.',
                      style: GoogleFonts.inter(fontSize: 13, color: AppTheme.warning),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Si score ATS < 80 : encadré rouge + boutons désactivés
          if (!canExport)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.error.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.error.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.lock, color: AppTheme.error, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Export bloqué — atteignez 80/100 au score ATS pour exporter.',
                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.error),
                    ),
                  ),
                ],
              ),
            )
          else
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.success.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.success.withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.shieldCheck, color: AppTheme.success, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'CV compatible ATS — vous pouvez postuler en ligne sereinement.',
                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.success),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 20),

          // Bouton aperçu impression
          _buildActionCard(
            icon: LucideIcons.printer,
            title: 'Aperçu & Impression',
            subtitle: canExport ? 'Visualiser le PDF et imprimer directement' : 'Atteignez 80/100 au score ATS',
            onTap: (canExport && !_isGenerating) ? () => _printPdf(cv, showWatermark) : null,
          ),
          const SizedBox(height: 12),

          // Bouton télécharger PDF
          _buildActionCard(
            icon: LucideIcons.download,
            title: 'Télécharger le PDF',
            subtitle: canExport ? 'Sauvegarder le fichier sur votre appareil' : 'Atteignez 80/100 au score ATS',
            onTap: (canExport && !_isGenerating) ? () => _downloadPdf(cv, showWatermark) : null,
          ),
          const SizedBox(height: 12),

          // Bouton partager WhatsApp
          _buildActionCard(
            icon: LucideIcons.share2,
            title: 'Partager sur WhatsApp',
            subtitle: canExport ? 'Envoyer le PDF directement sur WhatsApp' : 'Atteignez 80/100 au score ATS',
            onTap: (canExport && !_isGenerating) ? () => _shareWhatsApp(cv, showWatermark) : null,
            highlight: true,
          ),
          const SizedBox(height: 12),

          // Bouton envoyer par email
          _buildActionCard(
            icon: LucideIcons.mail,
            title: 'Envoyer par email',
            subtitle: canExport ? 'Joindre le PDF à un email' : 'Atteignez 80/100 au score ATS',
            onTap: (canExport && !_isGenerating) ? () => _shareEmail(cv, showWatermark) : null,
          ),

          if (_isGenerating) ...[
            const SizedBox(height: 24),
            const Center(child: CircularProgressIndicator(color: AppTheme.vitae)),
          ],

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback? onTap,
    bool highlight = false,
  }) {
    return Material(
      color: highlight ? AppTheme.vitaeSoft : AppTheme.card,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: highlight ? AppTheme.vitae : AppTheme.bg2,
              width: highlight ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: highlight ? AppTheme.vitae : AppTheme.bg2,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: highlight ? Colors.white : AppTheme.muted, size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.text)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: GoogleFonts.inter(fontSize: 13, color: AppTheme.muted)),
                  ],
                ),
              ),
              const Icon(LucideIcons.chevronRight, color: AppTheme.muted2, size: 20),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _printPdf(Cv cv, bool showWatermark) async {
    setState(() => _isGenerating = true);
    try {
      final pdfDoc = await CvPdfGenerator.generateAsync(cv, showWatermark: showWatermark);
      // Printing.layoutPdf fonctionne sur mobile ET web (ouvre le dialogue
      // d'impression du navigateur sur web → l'utilisateur peut "Enregistrer au format PDF").
      await Printing.layoutPdf(onLayout: (format) async => pdfDoc.save());
      await _logExport('pdf');
    } catch (e) {
      if (mounted) _showError('Erreur: $e');
    } finally {
      if (mounted) setState(() => _isGenerating = false);
    }
  }

  Future<void> _downloadPdf(Cv cv, bool showWatermark) async {
    setState(() => _isGenerating = true);
    try {
      final pdfDoc = await CvPdfGenerator.generateAsync(cv, showWatermark: showWatermark);

      if (kIsWeb) {
        // Sur web : path_provider.getTemporaryDirectory() n'existe pas.
        // On utilise Printing.layoutPdf qui ouvre le dialogue d'impression du
        // navigateur → l'utilisateur choisit "Enregistrer au format PDF".
        // C'est le chemin standard supporté par le package printing sur web.
        await Printing.layoutPdf(onLayout: (format) async => pdfDoc.save());
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Utilisez "Enregistrer au format PDF" dans la fenêtre d\'impression pour télécharger.'),
              backgroundColor: AppTheme.success,
            ),
          );
        }
      } else {
        // Mobile : sauvegarde un vrai fichier sur l'appareil.
        final output = await getTemporaryDirectory();
        final file = File('${output.path}/CV_${cv.titre.replaceAll(' ', '_')}.pdf');
        await file.writeAsBytes(await pdfDoc.save());

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('PDF sauvegardé: ${file.path}'),
              backgroundColor: AppTheme.success,
            ),
          );
        }
      }
      await _logExport('pdf');
    } catch (e) {
      if (mounted) _showError('Erreur: $e');
    } finally {
      if (mounted) setState(() => _isGenerating = false);
    }
  }

  Future<void> _shareWhatsApp(Cv cv, bool showWatermark) async {
    setState(() => _isGenerating = true);
    try {
      final pdfDoc = await CvPdfGenerator.generateAsync(cv, showWatermark: showWatermark);
      final text = 'Voici mon CV — ${cv.titre}';

      if (kIsWeb) {
        // Sur web : pas de filesystem local partageable. On ouvre wa.me dans
        // un nouvel onglet avec un message pré-rempli, et on déclenche le
        // téléchargement du PDF via le dialogue d'impression du navigateur.
        await Printing.layoutPdf(onLayout: (format) async => pdfDoc.save());
        if (!mounted) return;
        await launchUrl(
          Uri.parse('https://wa.me/?text=${Uri.encodeComponent('$text\n\n(Téléchargez le CV via la fenêtre d\'impression qui s\'ouvre.)')}'),
        );
      } else {
        // Mobile : sauvegarde le fichier puis partage via share_plus.
        final output = await getTemporaryDirectory();
        final file = File('${output.path}/CV_${cv.titre.replaceAll(' ', '_')}.pdf');
        await file.writeAsBytes(await pdfDoc.save());

        try {
          await Share.shareXFiles(
            [XFile(file.path, mimeType: 'application/pdf', name: 'CV.pdf')],
            text: text,
          );
        } catch (e) {
          // Fallback mobile : ouvrir wa.me si share_plus échoue
          if (!mounted) return;
          await launchUrl(
            Uri.parse('https://wa.me/?text=${Uri.encodeComponent('$text\n\nTéléchargez le CV depuis l\'app Vitae.')}'),
          );
        }
      }
      await _logExport('partage');
    } catch (e) {
      if (mounted) _showError('Erreur partage WhatsApp: $e');
    } finally {
      if (mounted) setState(() => _isGenerating = false);
    }
  }

  Future<void> _shareEmail(Cv cv, bool showWatermark) async {
    setState(() => _isGenerating = true);
    try {
      final pdfDoc = await CvPdfGenerator.generateAsync(cv, showWatermark: showWatermark);

      if (kIsWeb) {
        // Sur web : déclenche le téléchargement du PDF (dialogue impression)
        // puis ouvre un mailto: pour que l'utilisateur joigne le fichier manuellement.
        await Printing.layoutPdf(onLayout: (format) async => pdfDoc.save());
        if (!mounted) return;
        final subject = Uri.encodeComponent('CV — ${cv.titre}');
        final body = Uri.encodeComponent('Veuillez trouver ci-joint mon CV.\n\n(Téléchargez le CV via la fenêtre d\'impression qui s\'ouvre, puis joignez-le à cet email.)');
        await launchUrl(Uri.parse('mailto:?subject=$subject&body=$body'));
      } else {
        // Mobile : sauvegarde le fichier puis partage via share_plus.
        final output = await getTemporaryDirectory();
        final file = File('${output.path}/CV_${cv.titre.replaceAll(' ', '_')}.pdf');
        await file.writeAsBytes(await pdfDoc.save());

        await Share.shareXFiles(
          [XFile(file.path, mimeType: 'application/pdf', name: 'CV.pdf')],
          subject: 'CV — ${cv.titre}',
          text: 'Veuillez trouver ci-joint mon CV.',
        );
      }
      await _logExport('partage');
    } catch (e) {
      if (mounted) _showError('Erreur: $e');
    } finally {
      if (mounted) setState(() => _isGenerating = false);
    }
  }

  Future<void> _logExport(String type) async {
    try {
      final cvService = ref.read(cvServiceProvider);
      await cvService.logExport(cvId: widget.cvId, type: type);
    } catch (_) {}
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: AppTheme.error),
    );
  }
}