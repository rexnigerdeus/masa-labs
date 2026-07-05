import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';

class TontineDetailScreen extends ConsumerStatefulWidget {
  final String tontineId;

  const TontineDetailScreen({super.key, required this.tontineId});

  @override
  ConsumerState<TontineDetailScreen> createState() => _TontineDetailScreenState();
}

class _TontineDetailScreenState extends ConsumerState<TontineDetailScreen> {
  Map<String, dynamic>? _tontine;
  List<Map<String, dynamic>>? _membres;
  List<Map<String, dynamic>>? _tours;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final service = ref.read(tontineServiceProvider);
      final tontine = await service.getTontineDetails(widget.tontineId);
      final membres = await service.getMembres(widget.tontineId);
      final tours = await service.getTours(widget.tontineId);

      if (mounted) {
        setState(() {
          _tontine = tontine;
          _membres = membres;
          _tours = tours;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
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
        title: Text(_tontine?['name'] ?? 'Tontine'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.share2, size: 20),
            onPressed: _tontine != null ? () => _shareCode(_tontine!['invitation_code']) : null,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.rondo))
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: AppTheme.error),
                      const SizedBox(height: 16),
                      Text(_error!, style: GoogleFonts.inter(color: AppTheme.muted)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadData,
                        child: const Text('Réessayer'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  color: AppTheme.rondo,
                  onRefresh: _loadData,
                  child: CustomScrollView(
                    slivers: [
                      // En-tête : infos générales
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Code d'invitation
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppTheme.rondoSoft,
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(LucideIcons.link, color: AppTheme.rondo),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Code d\'invitation',
                                            style: GoogleFonts.inter(
                                              fontSize: 12,
                                              color: AppTheme.muted,
                                            ),
                                          ),
                                          Text(
                                            _tontine!['invitation_code'] ?? '',
                                            style: GoogleFonts.inter(
                                              fontSize: 20,
                                              fontWeight: FontWeight.w700,
                                              color: AppTheme.rondo,
                                              letterSpacing: 2,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(LucideIcons.copy, color: AppTheme.rondo, size: 20),
                                      onPressed: () => _shareCode(_tontine!['invitation_code']),
                                    ),
                                  ],
                                ),
                              ).animate().fadeIn(duration: 400.ms),

                              const SizedBox(height: 20),

                              // Stats grid
                              Row(
                                children: [
                                  Expanded(
                                    child: _DetailStat(
                                      label: 'Mise',
                                      value: '${_tontine!['mise']} FCFA',
                                      icon: Icons.savings_outlined,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: _DetailStat(
                                      label: 'Fréquence',
                                      value: _tontine!['frequence'] == 'hebdomadaire'
                                          ? 'Semaine'
                                          : 'Mois',
                                      icon: Icons.calendar_today_outlined,
                                    ),
                                  ),
                                ],
                              ).animate().fadeIn(delay: 80.ms, duration: 400.ms),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: _DetailStat(
                                      label: 'Membres',
                                      value: '${_membres?.length ?? 0}/${_tontine!['nb_membres']}',
                                      icon: Icons.people_outline,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: _DetailStat(
                                      label: 'Statut',
                                      value: _statutLabel(_tontine!['statut']),
                                      icon: Icons.circle_outlined,
                                    ),
                                  ),
                                ],
                              ).animate().fadeIn(delay: 120.ms, duration: 400.ms),
                            ],
                          ),
                        ),
                      ),

                      // Section membres
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Membres',
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.text,
                                ),
                              ),
                              TextButton(
                                onPressed: () => context.push('/tontine/${widget.tontineId}/members'),
                                child: Text(
                                  'Gérer',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.rondo,
                                  ),
                                ),
                              ),
                            ],
                          ).animate().fadeIn(duration: 400.ms),
                        ),
                      ),
                      SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final membres = _membres ?? [];
                            if (index < membres.length) {
                              final m = membres[index];
                              final profile = m['profiles'] as Map<String, dynamic>?;
                              return _MembreTile(
                                name: profile?['full_name'] ?? 'Membre',
                                phone: profile?['phone'] ?? '',
                                ordre: m['ordre_tour'],
                                statut: m['statut'],
                              ).animate().fadeIn(
                                delay: Duration(milliseconds: 100 * index),
                                duration: 400.ms,
                              );
                            }
                            return null;
                          },
                          childCount: _membres?.length ?? 0,
                        ),
                      ),

                      // Section tours
                      if (_tours != null && _tours!.isNotEmpty) ...[
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
                            child: Text(
                              'Tours',
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.text,
                              ),
                            ).animate().fadeIn(duration: 400.ms),
                          ),
                        ),
                        SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final tours = _tours!;
                              if (index < tours.length) {
                                final t = tours[index];
                                return _TourTile(
                                  numero: t['numero'],
                                  dateDebut: t['date_debut'],
                                  dateFin: t['date_fin'],
                                  statut: t['statut'],
                                  onTap: () => context.push('/tontine/${widget.tontineId}/tour/${t['id']}'),
                                ).animate().fadeIn(
                                  delay: Duration(milliseconds: 100 * index),
                                  duration: 400.ms,
                                );
                              }
                              return null;
                            },
                            childCount: _tours!.length,
                          ),
                        ),
                      ],

                      // Bouton générer tours (si en attente)
                      if (_tontine!['statut'] == 'en_attente') ...[
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: ElevatedButton.icon(
                              onPressed: _genererTours,
                              icon: const Icon(Icons.play_arrow),
                              label: const Text('Démarrer la tontine'),
                            ).animate().fadeIn(delay: 200.ms, duration: 400.ms),
                          ),
                        ),
                      ],

                      const SliverToBoxAdapter(child: SizedBox(height: 40)),
                    ],
                  ),
                ),
    );
  }

  String _statutLabel(String statut) {
    switch (statut) {
      case 'en_attente':
        return 'En attente';
      case 'active':
        return 'Active';
      case 'terminee':
        return 'Terminée';
      case 'annulee':
        return 'Annulée';
      default:
        return statut;
    }
  }

  void _shareCode(String? code) {
    if (code == null) return;
    // TODO: Utiliser share_plus pour partager le code
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Code : $code'),
        backgroundColor: AppTheme.dark,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _genererTours() async {
    setState(() => _isLoading = true);
    try {
      final service = ref.read(tontineServiceProvider);
      await service.genererTours(widget.tontineId);
      await _loadData();
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
}

class _DetailStat extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _DetailStat({required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.text.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppTheme.muted2),
          const SizedBox(height: 8),
          Text(
            label,
            style: GoogleFonts.inter(fontSize: 12, color: AppTheme.muted2),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppTheme.text,
            ),
          ),
        ],
      ),
    );
  }
}

class _MembreTile extends StatelessWidget {
  final String name;
  final String phone;
  final int? ordre;
  final String statut;

  const _MembreTile({
    required this.name,
    required this.phone,
    required this.ordre,
    required this.statut,
  });

  @override
  Widget build(BuildContext context) {
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
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppTheme.rondoSoft,
                borderRadius: BorderRadius.circular(10),
              ),
              child: ordre != null
                  ? Center(
                      child: Text(
                        '$ordre',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.rondo,
                        ),
                      ),
                    )
                  : const Icon(Icons.person, color: AppTheme.rondo, size: 20),
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
                      style: GoogleFonts.inter(fontSize: 12, color: AppTheme.muted2),
                    ),
                ],
              ),
            ),
            if (statut == 'actif')
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.success.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(50),
                ),
                child: Text(
                  'Actif',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.success,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _TourTile extends StatelessWidget {
  final int numero;
  final String dateDebut;
  final String dateFin;
  final String statut;
  final VoidCallback onTap;

  const _TourTile({
    required this.numero,
    required this.dateDebut,
    required this.dateFin,
    required this.statut,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = statut == 'en_cours'
        ? AppTheme.rondo
        : statut == 'termine'
            ? AppTheme.muted2
            : AppTheme.muted;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: statut == 'en_cours'
                  ? AppTheme.rondo.withValues(alpha: 0.3)
                  : AppTheme.text.withValues(alpha: 0.08),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(
                    '$numero',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: color,
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
                      'Tour $numero',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.text,
                      ),
                    ),
                    Text(
                      '$dateDebut → $dateFin',
                      style: GoogleFonts.inter(fontSize: 12, color: AppTheme.muted2),
                    ),
                  ],
                ),
              ),
              if (statut == 'en_cours')
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppTheme.rondo.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(50),
                  ),
                  child: Text(
                    'En cours',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.rondo,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}