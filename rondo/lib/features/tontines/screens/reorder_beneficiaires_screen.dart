import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';

/// Écran pour réorganiser l'ordre des bénéficiaires des tours.
/// L'admin peut glisser-déposer les membres pour définir qui reçoit
/// la cagnotte en premier, deuxième, etc.
class ReorderBeneficiairesScreen extends ConsumerStatefulWidget {
  final String tontineId;

  const ReorderBeneficiairesScreen({super.key, required this.tontineId});

  @override
  ConsumerState<ReorderBeneficiairesScreen> createState() =>
      _ReorderBeneficiairesScreenState();
}

class _ReorderBeneficiairesScreenState
    extends ConsumerState<ReorderBeneficiairesScreen> {
  List<Map<String, dynamic>>? _membres;
  bool _isLoading = true;
  bool _isSaving = false;

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
      // Trier par ordre_tour (null en dernier)
      membres.sort((a, b) {
        final oa = a['ordre_tour'];
        final ob = b['ordre_tour'];
        if (oa == null && ob == null) return 0;
        if (oa == null) return 1;
        if (ob == null) return -1;
        return (oa as int).compareTo(ob as int);
      });
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

  Future<void> _saveOrder() async {
    if (_membres == null) return;
    setState(() => _isSaving = true);
    try {
      final service = ref.read(tontineServiceProvider);
      for (int i = 0; i < _membres!.length; i++) {
        final m = _membres![i];
        final newOrdre = i + 1;
        if (m['ordre_tour'] != newOrdre) {
          await service.updateMembreOrdre(m['id'] as String, newOrdre);
        }
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Ordre enregistré'),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        context.pop();
      }
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
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        backgroundColor: AppTheme.bg,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Ordre des bénéficiaires'),
        actions: [
          if (!_isLoading && _membres != null && _membres!.isNotEmpty)
            TextButton(
              onPressed: _isSaving ? null : _saveOrder,
              child: _isSaving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(
                      'Enregistrer',
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w700,
                        color: AppTheme.rondo,
                      ),
                    ),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.rondo))
          : _membres == null || _membres!.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(LucideIcons.users, size: 48, color: AppTheme.muted2),
                      const SizedBox(height: 16),
                      Text(
                        'Aucun membre',
                        style: GoogleFonts.inter(color: AppTheme.muted),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.rondoSoft,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            const Icon(LucideIcons.info, size: 16, color: AppTheme.rondo),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Glissez-déposez les membres. Le 1er reçoit la 1ère cagnotte.',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: AppTheme.rondo,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Expanded(
                      child: ReorderableListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        itemCount: _membres!.length,
                        onReorder: (oldIndex, newIndex) {
                          setState(() {
                            if (newIndex > oldIndex) newIndex -= 1;
                            final item = _membres!.removeAt(oldIndex);
                            _membres!.insert(newIndex, item);
                          });
                        },
                        itemBuilder: (context, index) {
                          final m = _membres![index];
                          final name = m['full_name'] as String? ?? 'Membre';
                          return Padding(
                            key: ValueKey(m['id']),
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppTheme.card,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                    color: AppTheme.text.withValues(alpha: 0.08)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 32,
                                    height: 32,
                                    decoration: BoxDecoration(
                                      color: AppTheme.rondo,
                                      borderRadius: BorderRadius.circular(50),
                                    ),
                                    child: Center(
                                      child: Text(
                                        '${index + 1}',
                                        style: GoogleFonts.inter(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
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
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        if (m['phone'] != null &&
                                            (m['phone'] as String).isNotEmpty)
                                          Text(
                                            m['phone'] as String,
                                            style: GoogleFonts.inter(
                                              fontSize: 12,
                                              color: AppTheme.muted2,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  const Icon(
                                    LucideIcons.gripVertical,
                                    color: AppTheme.muted2,
                                    size: 20,
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
    );
  }
}
