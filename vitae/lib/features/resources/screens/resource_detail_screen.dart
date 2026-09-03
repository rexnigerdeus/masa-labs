import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../../resources/models/resource_model.dart';

/// Écran détail d'un article
class ResourceDetailScreen extends ConsumerWidget {
  final String resourceId;

  const ResourceDetailScreen({super.key, required this.resourceId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final resourceAsync = ref.watch(resourceProvider(resourceId));

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.go('/resources'),
        ),
        title: Text(
          'Article',
          style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600),
        ),
      ),
      body: SafeArea(
        child: resourceAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppTheme.vitae),
          ),
          error: (e, _) => Center(
            child: Text(
              'Impossible de charger l\'article',
              style: GoogleFonts.inter(fontSize: 15, color: AppTheme.muted),
            ),
          ),
          data: (resource) {
            if (resource == null) {
              return Center(
                child: Text(
                  'Article introuvable',
                  style: GoogleFonts.inter(fontSize: 15, color: AppTheme.muted),
                ),
              );
            }
            return _buildContent(context, resource);
          },
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, Resource resource) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tag catégorie — même modèle que jobs_screen _buildTag
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: AppTheme.vitaeSoft,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              resource.category.label,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w500,
                color: AppTheme.vitaeDark,
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Titre
          Text(
            resource.title,
            style: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: AppTheme.text,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 12),

          // Meta : auteur + temps de lecture
          Row(
            children: [
              if (resource.author != null) ...[
                const Icon(LucideIcons.user, size: 14, color: AppTheme.muted2),
                const SizedBox(width: 4),
                Text(
                  resource.author!,
                  style: GoogleFonts.inter(
                      fontSize: 13, color: AppTheme.muted2),
                ),
                const SizedBox(width: 16),
              ],
              if (resource.readTimeMinutes != null) ...[
                const Icon(LucideIcons.clock, size: 14, color: AppTheme.muted2),
                const SizedBox(width: 4),
                Text(
                  '${resource.readTimeMinutes} min de lecture',
                  style: GoogleFonts.inter(
                      fontSize: 13, color: AppTheme.muted2),
                ),
              ],
            ],
          ),
          const SizedBox(height: 24),

          // Contenu — on parse le markdown simple (gras avec **)
          ..._buildRichContent(resource.content),

          // Source externe si présente
          if (resource.sourceUrl != null) ...[
            const SizedBox(height: 24),
            const Divider(color: AppTheme.bg2, height: 1),
            const SizedBox(height: 16),
            GestureDetector(
              onTap: () => _launchUrl(resource.sourceUrl!),
              child: Row(
                children: [
                  const Icon(LucideIcons.externalLink,
                      size: 16, color: AppTheme.vitae),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Source originale',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.vitae,
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 40),
        ],
      ),
    );
  }

  /// Parse le contenu avec **gras** en paragraphe
  List<Widget> _buildRichContent(String content) {
    final paragraphs = content.split('\n\n');
    return paragraphs.map((para) {
      para = para.trim();
      if (para.isEmpty) return const SizedBox.shrink();

      // Titre avec ** au début d'une ligne seule
      if (para.startsWith('**') && para.endsWith('**') && !para.contains('\n')) {
        final title = para.replaceAll('**', '');
        return Padding(
          padding: const EdgeInsets.only(top: 20, bottom: 8),
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

      // Paragraphe normal avec gras inline
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: _buildRichText(para),
      );
    }).toList();
  }

  Widget _buildRichText(String text) {
    final parts = <TextSpan>[];
    final regex = RegExp(r'\*\*(.+?)\*\*');
    int lastEnd = 0;

    for (final match in regex.allMatches(text)) {
      if (match.start > lastEnd) {
        parts.add(TextSpan(
          text: text.substring(lastEnd, match.start),
          style: GoogleFonts.inter(
              fontSize: 15, color: AppTheme.text, height: 1.6),
        ));
      }
      parts.add(TextSpan(
        text: match.group(1),
        style: GoogleFonts.inter(
            fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.text, height: 1.6),
      ));
      lastEnd = match.end;
    }
    if (lastEnd < text.length) {
      parts.add(TextSpan(
        text: text.substring(lastEnd),
        style: GoogleFonts.inter(
            fontSize: 15, color: AppTheme.text, height: 1.6),
      ));
    }

    return RichText(
      text: TextSpan(children: parts),
    );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}