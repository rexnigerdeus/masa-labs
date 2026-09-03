import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import 'home_screen.dart' show myTontinesProvider;

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
  Map<String, int> _cagnottesParTour = {};
  String? _currentUserId;
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
      final userId = ref.read(authStateProvider).value?.session?.user.id;

      // Charger la cagnotte pour chaque tour
      final cagnottes = <String, int>{};
      for (final t in tours) {
        try {
          final c = await service.getCagnotteTour(t['id'] as String);
          cagnottes[t['id'] as String] = c;
        } catch (_) {
          cagnottes[t['id'] as String] = 0;
        }
      }

      if (mounted) {
        setState(() {
          _tontine = tontine;
          _membres = membres;
          _tours = tours;
          _cagnottesParTour = cagnottes;
          _currentUserId = userId;
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
          // Menu admin : modifier / supprimer
          if (_tontine != null && _tontine!['admin_id'] == _currentUserId)
            PopupMenuButton<String>(
              icon: const Icon(LucideIcons.moreVertical, size: 20),
              color: AppTheme.card,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              onSelected: (value) async {
                if (value == 'edit') {
                  await _editTontine();
                } else if (value == 'delete') {
                  await _confirmDelete();
                }
              },
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: 'edit',
                  child: Row(
                    children: [
                      const Icon(LucideIcons.pencil, size: 16, color: AppTheme.text),
                      const SizedBox(width: 12),
                      Text('Modifier', style: GoogleFonts.inter(color: AppTheme.text)),
                    ],
                  ),
                ),
                PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      const Icon(LucideIcons.trash2, size: 16, color: AppTheme.error),
                      const SizedBox(width: 12),
                      Text('Supprimer', style: GoogleFonts.inter(color: AppTheme.error)),
                    ],
                  ),
                ),
              ],
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
                              // Bouton "Gérer" visible uniquement pour l'admin
                              if (_tontine != null && _tontine!['admin_id'] == _currentUserId)
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
                              return _MembreTile(
                                name: m['full_name'] as String? ?? 'Membre',
                                phone: m['phone'] as String? ?? '',
                                ordre: m['ordre_tour'] as int?,
                                statut: m['statut'] as String? ?? 'actif',
                                isAdmin: _tontine!['admin_id'] == m['user_id'],
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
                                final beneficiaire = t['beneficiaire'] as Map<String, dynamic>?;
                                final cagnotte = _cagnottesParTour[t['id']];
                                final isAdmin = _tontine!['admin_id'] == _currentUserId;
                                return _TourTile(
                                  numero: t['numero'],
                                  dateDebut: t['date_debut'] ?? '',
                                  dateFin: t['date_fin'] ?? '',
                                  statut: t['statut'] ?? 'a_venir',
                                  beneficiaireName: beneficiaire?['full_name'] as String?,
                                  cagnotte: cagnotte,
                                  // Admin : peut enregistrer des paiements
                                  // Membre : peut consulter le statut du tour
                                  onTap: isAdmin
                                      ? () => context.push('/tontine/${widget.tontineId}/tour/${t['id']}')
                                      : () => _showTourReadOnly(t, beneficiaire, cagnotte),
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

                      // Bouton définir/réorganiser l'ordre des bénéficiaires (admin uniquement)
                      if (_tontine!['admin_id'] == _currentUserId) ...[
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
                            child: OutlinedButton.icon(
                              onPressed: _reorganiserBeneficiaires,
                              icon: const Icon(LucideIcons.shuffle, size: 18),
                              label: Text(
                                _tontine!['statut'] == 'en_attente'
                                    ? 'Définir l\'ordre des bénéficiaires'
                                    : 'Réorganiser l\'ordre des bénéficiaires',
                              ),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppTheme.rondo,
                                side: BorderSide(color: AppTheme.rondo),
                                minimumSize: const Size(double.infinity, 48),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                        ),
                      ],

                      // Bouton démarrer / régénérer les tours (admin uniquement)
                      if (_tontine!['admin_id'] == _currentUserId) ...[
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: ElevatedButton.icon(
                              onPressed: _genererTours,
                              icon: Icon(
                                _tontine!['statut'] == 'en_attente'
                                    ? Icons.play_arrow
                                    : Icons.refresh,
                              ),
                              label: Text(
                                _tontine!['statut'] == 'en_attente'
                                    ? 'Démarrer la tontine'
                                    : 'Régénérer les tours selon le nouvel ordre',
                              ),
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

  void _reorganiserBeneficiaires() {
    context.push('/tontine/${widget.tontineId}/reorder').then((_) => _loadData());
  }

  /// Affiche les détails d'un tour en lecture seule (pour les membres non-admin)
  void _showTourReadOnly(
    Map<String, dynamic> tour,
    Map<String, dynamic>? beneficiaire,
    int? cagnotte,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppTheme.rondoSoft,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Center(
                      child: Text(
                        '${tour['numero']}',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.rondo,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Tour ${tour['numero']}',
                    style: GoogleFonts.inter(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.text,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _InfoRow(
                label: 'Bénéficiaire',
                value: beneficiaire?['full_name'] as String? ?? 'Non défini',
              ),
              const SizedBox(height: 8),
              _InfoRow(
                label: 'Période',
                value: '${tour['date_debut']} → ${tour['date_fin']}',
              ),
              const SizedBox(height: 8),
              _InfoRow(
                label: 'Statut',
                value: _statutLabel(tour['statut'] as String? ?? 'a_venir'),
              ),
              if (cagnotte != null) ...[
                const SizedBox(height: 8),
                _InfoRow(
                  label: 'Cagnotte',
                  value: '$cagnotte FCFA',
                  highlight: true,
                ),
              ],
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.bg2,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.info, size: 16, color: AppTheme.muted),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Seul l\'administrateur peut enregistrer les paiements.',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: AppTheme.muted,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Fermer'),
                ),
              ),
            ],
          ),
        );
      },
    );
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
    final isActive = _tontine!['statut'] != 'en_attente';

    // Confirmation si la tontine est déjà active (suppression des tours existants)
    if (isActive) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppTheme.card,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(
            'Régénérer les tours',
            style: GoogleFonts.inter(fontWeight: FontWeight.w700),
          ),
          content: Text(
            'Les tours actuels seront supprimés et recréés selon le nouvel ordre. Les paiements déjà enregistrés pour les tours en cours ou terminés seront perdus.\n\nContinuer ?',
            style: GoogleFonts.inter(color: AppTheme.muted),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Annuler'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: TextButton.styleFrom(foregroundColor: AppTheme.error),
              child: const Text('Régénérer'),
            ),
          ],
        ),
      );
      if (confirm != true || !mounted) return;
    }

    setState(() => _isLoading = true);
    try {
      final service = ref.read(tontineServiceProvider);
      await service.genererTours(widget.tontineId);
      ref.invalidate(myTontinesProvider);
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isActive ? 'Tours régénérés' : 'Tontine démarrée'),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
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
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _editTontine() async {
    final name = _tontine?['name'] as String? ?? '';
    final mise = _tontine?['mise'] as int? ?? 0;
    final nbMembres = _tontine?['nb_membres'] as int? ?? 2;
    final frequence = _tontine?['frequence'] as String? ?? 'hebdomadaire';

    final nameController = TextEditingController(text: name);
    final miseController = TextEditingController(text: mise.toString());
    final nbMembresController = TextEditingController(text: nbMembres.toString());
    String selectedFrequence = frequence;

    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Modifier la tontine',
                    style: GoogleFonts.inter(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.text,
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: 'Nom',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: miseController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Mise (FCFA)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: nbMembresController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Nombre de membres',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Fréquence',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.text,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _FrequenceChip(
                        label: 'Semaine',
                        selected: selectedFrequence == 'hebdomadaire',
                        onTap: () => setModalState(
                            () => selectedFrequence = 'hebdomadaire'),
                      ),
                      const SizedBox(width: 8),
                      _FrequenceChip(
                        label: 'Mois',
                        selected: selectedFrequence == 'mensuelle',
                        onTap: () =>
                            setModalState(() => selectedFrequence = 'mensuelle'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(context, false),
                          child: const Text('Annuler'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () => Navigator.pop(context, true),
                          child: const Text('Enregistrer'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );

    if (result != true || !mounted) return;

    final newName = nameController.text.trim();
    final newMise = int.tryParse(miseController.text);
    final newNbMembres = int.tryParse(nbMembresController.text);

    if (newName.isEmpty || newMise == null || newNbMembres == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Veuillez remplir tous les champs')),
        );
      }
      return;
    }

    setState(() => _isLoading = true);
    try {
      final service = ref.read(tontineServiceProvider);
      await service.updateTontine(
        tontineId: widget.tontineId,
        name: newName,
        mise: newMise,
        frequence: selectedFrequence,
        nbMembres: newNbMembres,
      );
      ref.invalidate(myTontinesProvider);
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Tontine modifiée'),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
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
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _confirmDelete() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Supprimer la tontine', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Text(
          'Cette action est irréversible. Tous les membres, tours et paiements seront supprimés.',
          style: GoogleFonts.inter(color: AppTheme.muted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppTheme.error),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    setState(() => _isLoading = true);
    try {
      final service = ref.read(tontineServiceProvider);
      await service.deleteTontine(widget.tontineId);
      ref.invalidate(myTontinesProvider);
      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Tontine supprimée'),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
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
      if (mounted) setState(() => _isLoading = false);
    }
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final bool highlight;

  const _InfoRow({
    required this.label,
    required this.value,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 13,
            color: AppTheme.muted,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: highlight ? AppTheme.success : AppTheme.text,
          ),
        ),
      ],
    );
  }
}

class _FrequenceChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FrequenceChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(50),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? AppTheme.rondo : AppTheme.bg2,
          borderRadius: BorderRadius.circular(50),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : AppTheme.text,
          ),
        ),
      ),
    );
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
  final bool isAdmin;

  const _MembreTile({
    required this.name,
    required this.phone,
    required this.ordre,
    required this.statut,
    this.isAdmin = false,
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
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          name,
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.text,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (isAdmin) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.rondo,
                            borderRadius: BorderRadius.circular(50),
                          ),
                          child: Text(
                            'Admin',
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (phone.isNotEmpty)
                    Text(
                      phone,
                      style: GoogleFonts.inter(fontSize: 12, color: AppTheme.muted2),
                    ),
                ],
              ),
            ),
            if (statut == 'exclu')
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.error.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(50),
                ),
                child: Text(
                  'Exclu',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.error,
                  ),
                ),
              )
            else if (statut == 'actif')
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
  final String? beneficiaireName;
  final int? cagnotte;
  final VoidCallback onTap;

  const _TourTile({
    required this.numero,
    required this.dateDebut,
    required this.dateFin,
    required this.statut,
    this.beneficiaireName,
    this.cagnotte,
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
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            'Tour $numero',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.text,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (statut == 'en_cours') ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.rondo,
                              borderRadius: BorderRadius.circular(50),
                            ),
                            child: Text(
                              'En cours',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (beneficiaireName != null && beneficiaireName!.isNotEmpty)
                      Text(
                        'Bénéficiaire : $beneficiaireName',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: statut == 'en_cours' ? AppTheme.rondo : AppTheme.text,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    Text(
                      '$dateDebut → $dateFin',
                      style: GoogleFonts.inter(fontSize: 12, color: AppTheme.muted2),
                    ),
                    if (cagnotte != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Cagnotte : $cagnotte FCFA',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: cagnotte! > 0 ? AppTheme.success : AppTheme.muted2,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const Icon(LucideIcons.chevronRight, size: 16, color: AppTheme.muted2),
            ],
          ),
        ),
      ),
    );
  }
}