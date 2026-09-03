import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';

/// Écran d'historique des paiements (écrans MVP 10 et 14).
/// Affiche tous les paiements d'une tontine, ou tous les paiements
/// de l'user courant si [tontineId] est null.
class HistoryScreen extends ConsumerStatefulWidget {
  final String? tontineId;
  final String? tontineName;

  const HistoryScreen({super.key, this.tontineId, this.tontineName});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  List<Map<String, dynamic>>? _paiements;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final service = ref.read(tontineServiceProvider);
      if (widget.tontineId != null) {
        final data = await service.getHistoriquePaiements(widget.tontineId!);
        if (mounted) setState(() => _paiements = data);
      } else {
        // Historique global : paiements de toutes les tontines où l'user est admin ou membre
        final homeAdmin = await service.getHomeAdmin();
        final allPaiements = <Map<String, dynamic>>[];
        for (final t in homeAdmin) {
          final tId = t['tontine_id'] as String;
          final ps = await service.getHistoriquePaiements(tId);
          for (final p in ps) {
            p['__tontine_name'] = t['tontine_name'];
            allPaiements.add(p);
          }
        }
        allPaiements.sort((a, b) {
          final ad = DateTime.tryParse(a['confirmed_at'] as String? ?? '') ?? DateTime(2000);
          final bd = DateTime.tryParse(b['confirmed_at'] as String? ?? '') ?? DateTime(2000);
          return bd.compareTo(ad);
        });
        if (mounted) setState(() => _paiements = allPaiements);
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _modeLabel(String? mode) {
    switch (mode) {
      case 'especes':
        return 'Espèces';
      case 'wave':
        return 'Wave';
      case 'orange_money':
        return 'Orange Money';
      case 'mtn_money':
        return 'MTN Money';
      default:
        return mode ?? '—';
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
        title: Text(widget.tontineName != null
            ? 'Historique — ${widget.tontineName}'
            : 'Mon historique'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.rondo))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      'Erreur : $_error',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(color: AppTheme.error),
                    ),
                  ),
                )
              : _paiements == null || _paiements!.isEmpty
                  ? _EmptyHistory()
                  : RefreshIndicator(
                      color: AppTheme.rondo,
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _paiements!.length,
                        itemBuilder: (context, index) {
                          final p = _paiements![index];
                          return _PaymentTile(
                            paiement: p,
                            modeLabel: _modeLabel(p['mode'] as String?),
                            tontineName: p['__tontine_name'] as String?,
                          );
                        },
                      ),
                    ),
    );
  }
}

class _PaymentTile extends StatelessWidget {
  final Map<String, dynamic> paiement;
  final String modeLabel;
  final String? tontineName;

  const _PaymentTile({
    required this.paiement,
    required this.modeLabel,
    this.tontineName,
  });

  @override
  Widget build(BuildContext context) {
    final montant = paiement['montant'] as int? ?? 0;
    final confirmedAt = paiement['confirmed_at'] as String? ?? '';
    final note = paiement['note'] as String?;
    final membre = paiement['rondo_membres'] as Map<String, dynamic>?;
    final membreName = membre?['full_name'] as String?;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.text.withValues(alpha: 0.08)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppTheme.success.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              LucideIcons.checkCircle2,
              color: AppTheme.success,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      '$montant FCFA',
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.text,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.bg2,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        modeLabel,
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          color: AppTheme.muted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                if (membreName != null)
                  Text(
                    'Membre : $membreName',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppTheme.muted,
                    ),
                  ),
                if (tontineName != null)
                  Text(
                    'Tontine : $tontineName',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppTheme.muted,
                    ),
                  ),
                Text(
                  _formatDate(confirmedAt),
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    color: AppTheme.muted2,
                  ),
                ),
                if (note != null && note.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      '"$note"',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: AppTheme.muted2,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String iso) {
    if (iso.isEmpty) return '';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} à ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

class _EmptyHistory extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(LucideIcons.receipt, size: 48, color: AppTheme.muted2),
          const SizedBox(height: 16),
          Text(
            'Aucun paiement enregistré',
            style: GoogleFonts.inter(color: AppTheme.muted, fontSize: 15),
          ),
          const SizedBox(height: 4),
          Text(
            'Les paiements apparaîtront ici',
            style: GoogleFonts.inter(color: AppTheme.muted2, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
