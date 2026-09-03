import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../jobs/models/job_model.dart';

/// Écran détail d'une offre d'emploi / stage
class JobDetailScreen extends ConsumerWidget {
  final String jobId;

  const JobDetailScreen({super.key, required this.jobId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobAsync = ref.watch(jobProvider(jobId));

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.go('/jobs'),
        ),
        title: Text(
          'Détail de l\'offre',
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600),
        ),
      ),
      body: SafeArea(
        child: jobAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppTheme.vitae),
          ),
          error: (e, _) => Center(
            child: Text(
              'Impossible de charger l\'offre',
              style: GoogleFonts.inter(fontSize: 15, color: AppTheme.muted),
            ),
          ),
          data: (job) {
            if (job == null) {
              return Center(
                child: Text(
                  'Offre introuvable',
                  style: GoogleFonts.inter(fontSize: 15, color: AppTheme.muted),
                ),
              );
            }
            return _buildContent(context, job);
          },
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, JobOffer job) {
    final isClosed = !job.isOpen;

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Type badge (Emploi / Stage)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: job.type == JobType.emploi
                        ? AppTheme.vitaeSoft
                        : AppTheme.yellowSoft,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    job.type.label,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: job.type == JobType.emploi
                          ? AppTheme.vitaeDark
                          : AppTheme.dark,
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Titre
                Text(
                  job.title,
                  style: GoogleFonts.inter(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.text,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  job.company,
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    color: AppTheme.muted,
                  ),
                ),
                const SizedBox(height: 20),

                // Infos clés
                _buildInfoGrid(job),
                const SizedBox(height: 24),

                // Description
                if (job.description != null) ...[
                  _buildSectionTitle('Description du poste'),
                  Text(
                    job.description!,
                    style: GoogleFonts.inter(
                        fontSize: 15, color: AppTheme.text, height: 1.6),
                  ),
                  const SizedBox(height: 20),
                ],

                // Profil recherché
                if (job.requirements != null) ...[
                  _buildSectionTitle('Profil recherché'),
                  Text(
                    job.requirements!,
                    style: GoogleFonts.inter(
                        fontSize: 15, color: AppTheme.text, height: 1.6),
                  ),
                  const SizedBox(height: 20),
                ],

                // Deadline
                if (job.deadline != null) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isClosed
                          ? AppTheme.error.withValues(alpha: 0.08)
                          : AppTheme.warning.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          isClosed ? LucideIcons.xCircle : LucideIcons.calendarClock,
                          color: isClosed ? AppTheme.error : AppTheme.warning,
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            isClosed
                                ? 'Cette offre est expirée depuis le ${_formatDate(job.deadline!)}'
                                : 'Date limite : ${_formatDate(job.deadline!)}',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: isClosed ? AppTheme.error : AppTheme.warning,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
        // Bouton "Postuler" — fixé en bas
        if (job.applyUrl.isNotEmpty)
          _buildApplyButton(context, job, isClosed),
      ],
    );
  }

  Widget _buildInfoGrid(JobOffer job) {
    final infos = <_InfoItem>[
      if (job.location != null)
        _InfoItem(LucideIcons.mapPin, 'Localisation', job.location!),
      if (job.contractType != null)
        _InfoItem(LucideIcons.fileText, 'Contrat', job.contractType!),
      if (job.salaryRange != null)
        _InfoItem(LucideIcons.wallet, 'Rémunération', job.salaryRange!),
      if (job.postedAgo.isNotEmpty)
        _InfoItem(LucideIcons.clock, 'Publié', job.postedAgo),
      _InfoItem(
        job.category.icon,
        'Secteur',
        job.category.label,
      ),
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.bg2),
      ),
      child: Column(
        children: infos
            .map((info) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    children: [
                      Icon(info.icon, size: 18, color: AppTheme.vitae),
                      const SizedBox(width: 12),
                      Text(
                        '${info.label} :',
                        style: GoogleFonts.inter(
                            fontSize: 13, color: AppTheme.muted),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          info.value,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.text,
                          ),
                          textAlign: TextAlign.right,
                        ),
                      ),
                    ],
                  ),
                ))
            .toList(),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: GoogleFonts.inter(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: AppTheme.vitaeDark,
        ),
      ),
    );
  }

  Widget _buildApplyButton(
      BuildContext context, JobOffer job, bool isClosed) {
    // Nom lisible de la plateforme source (pour transparence)
    final sourceLabel = _sourceLabel(job.applyUrl);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: AppTheme.card,
        border: Border(top: BorderSide(color: AppTheme.bg2)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (sourceLabel != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  'Candidature via $sourceLabel',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: AppTheme.muted,
                  ),
                ),
              ),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: isClosed ? null : () => _apply(context, job),
                style: FilledButton.styleFrom(
                  backgroundColor: AppTheme.vitae,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: AppTheme.bg2,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                icon: const Icon(LucideIcons.externalLink, size: 18),
                label: Text(
                  isClosed ? 'Offre expirée' : 'Postuler maintenant',
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Nom de la plateforme d'où vient le lien de candidature
  /// (transparence pour l'utilisateur avant de quitter l'app)
  String? _sourceLabel(String url) {
    final uri = Uri.tryParse(url);
    final host = uri?.host.toLowerCase() ?? '';
    if (host.contains('linkedin.com')) return 'LinkedIn';
    if (host.contains('novojob.com')) return 'Novojob';
    if (url.startsWith('mailto:')) return 'email';
    if (host.isNotEmpty) return host.replaceAll('www.', '');
    return null;
  }

  Future<void> _apply(BuildContext context, JobOffer job) async {
    final uri = Uri.parse(job.applyUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Impossible d\'ouvrir le lien de candidature'),
          backgroundColor: AppTheme.error,
        ),
      );
    }
  }

  String _formatDate(DateTime date) {
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  }
}

class _InfoItem {
  final IconData icon;
  final String label;
  final String value;

  _InfoItem(this.icon, this.label, this.value);
}