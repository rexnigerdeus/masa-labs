import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';

class MembersScreen extends ConsumerStatefulWidget {
  final String tontineId;

  const MembersScreen({super.key, required this.tontineId});

  @override
  ConsumerState<MembersScreen> createState() => _MembersScreenState();
}

class _MembersScreenState extends ConsumerState<MembersScreen> {
  List<Map<String, dynamic>>? _membres;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMembres();
  }

  Future<void> _loadMembres() async {
    setState(() => _isLoading = true);
    try {
      final service = ref.read(tontineServiceProvider);
      final membres = await service.getMembres(widget.tontineId);
      if (mounted) setState(() => _membres = membres);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur : ${e.toString()}'),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _exclureMembre(String membreId, String name) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Exclure le membre'),
        content: Text('Voulez-vous vraiment exclure $name de cette tontine ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Exclure', style: TextStyle(color: AppTheme.error)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final service = ref.read(tontineServiceProvider);
      await service.exclureMembre(membreId);
      await _loadMembres();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur : ${e.toString()}'),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Membres'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.rondo))
          : _membres == null || _membres!.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.people_outline, size: 48, color: AppTheme.muted2),
                      const SizedBox(height: 16),
                      Text(
                        'Aucun membre pour l\'instant',
                        style: GoogleFonts.inter(color: AppTheme.muted),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Partagez le code d\'invitation',
                        style: GoogleFonts.inter(fontSize: 13, color: AppTheme.muted2),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  color: AppTheme.rondo,
                  onRefresh: _loadMembres,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    itemCount: _membres!.length,
                    itemBuilder: (context, index) {
                      final m = _membres![index];
                      final profile = m['profiles'] as Map<String, dynamic>?;
                      final name = profile?['full_name'] ?? 'Membre';
                      final phone = profile?['phone'] ?? '';
                      final ordre = m['ordre_tour'] as int?;
                      final statut = m['statut'] as String;

                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppTheme.card,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.text.withValues(alpha: 0.08)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: ordre != null
                                      ? AppTheme.rondoSoft
                                      : AppTheme.bg2,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: ordre != null
                                    ? Center(
                                        child: Text(
                                          '$ordre',
                                          style: GoogleFonts.inter(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w700,
                                            color: AppTheme.rondo,
                                          ),
                                        ),
                                      )
                                    : const Icon(Icons.person, color: AppTheme.muted2),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      name,
                                      style: GoogleFonts.inter(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.text,
                                      ),
                                    ),
                                    if (phone.isNotEmpty)
                                      Text(
                                        phone,
                                        style: GoogleFonts.inter(
                                          fontSize: 12,
                                          color: AppTheme.muted2,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              if (statut == 'actif')
                                IconButton(
                                  icon: const Icon(Icons.person_remove_outlined,
                                      color: AppTheme.error, size: 20),
                                  onPressed: () => _exclureMembre(m['id'], name),
                                ),
                            ],
                          ),
                        ),
                      ).animate().fadeIn(
                        delay: Duration(milliseconds: 80 * index),
                        duration: 400.ms,
                      ).slideY(begin: 0.05);
                    },
                  ),
                ),
    );
  }
}