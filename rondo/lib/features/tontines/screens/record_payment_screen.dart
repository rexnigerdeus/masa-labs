import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';

class RecordPaymentScreen extends ConsumerStatefulWidget {
  final String tourId;
  final String tontineId;

  const RecordPaymentScreen({
    super.key,
    required this.tourId,
    required this.tontineId,
  });

  @override
  ConsumerState<RecordPaymentScreen> createState() => _RecordPaymentScreenState();
}

class _RecordPaymentScreenState extends ConsumerState<RecordPaymentScreen> {
  List<Map<String, dynamic>>? _membres;
  String? _selectedMembreId;
  int _montant = 0;
  String _mode = 'especes';
  final _noteController = TextEditingController();
  bool _isLoading = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadStatut();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadStatut() async {
    try {
      final service = ref.read(tontineServiceProvider);
      final statut = await service.getStatutTour(widget.tourId);
      if (mounted) setState(() => _membres = statut);
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

  Future<void> _savePaiement() async {
    if (_selectedMembreId == null) {
      _showError('Veuillez sélectionner un membre');
      return;
    }
    if (_montant <= 0) {
      _showError('Veuillez saisir un montant');
      return;
    }

    setState(() => _isSaving = true);

    try {
      final service = ref.read(tontineServiceProvider);
      await service.enregistrerPaiement(
        tourId: widget.tourId,
        membreId: _selectedMembreId!,
        montant: _montant,
        mode: _mode,
        note: _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Paiement enregistré !'),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) _showError('Erreur : ${e.toString()}');
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.error,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
        title: const Text('Enregistrer paiement'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.rondo))
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 16),

                    Text(
                      'Sélectionner le membre',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.text,
                      ),
                    ).animate().fadeIn(duration: 400.ms),
                    const SizedBox(height: 8),

                    // Liste des membres (ceux qui n'ont pas encore payé)
                    Container(
                      decoration: BoxDecoration(
                        color: AppTheme.card,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.text.withValues(alpha: 0.08)),
                      ),
                      child: Column(
                        children: (_membres ?? []).map((m) {
                          final membreId = m['membre_id'] as String;
                          final name = m['full_name'] as String? ?? 'Membre';
                          final paye = m['paye'] as bool? ?? false;

                          return RadioListTile<String>(
                            value: membreId,
                            groupValue: _selectedMembreId,
                            onChanged: paye ? null : (v) => setState(() => _selectedMembreId = v),
                            title: Text(
                              name,
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: paye ? AppTheme.muted2 : AppTheme.text,
                              ),
                            ),
                            subtitle: paye
                                ? Text(
                                    'Déjà payé',
                                    style: GoogleFonts.inter(fontSize: 12, color: AppTheme.success),
                                  )
                                : null,
                            activeColor: AppTheme.rondo,
                          );
                        }).toList(),
                      ),
                    ).animate().fadeIn(delay: 80.ms, duration: 400.ms),

                    const SizedBox(height: 24),

                    // Montant
                    Text(
                      'Montant (FCFA)',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.text,
                      ),
                    ).animate().fadeIn(delay: 120.ms, duration: 400.ms),
                    const SizedBox(height: 8),
                    TextField(
                      keyboardType: TextInputType.number,
                      onChanged: (v) => _montant = int.tryParse(v) ?? 0,
                      decoration: const InputDecoration(
                        hintText: '10000',
                        prefixIcon: Icon(Icons.payments_outlined),
                      ),
                    ).animate().fadeIn(delay: 160.ms, duration: 400.ms),

                    const SizedBox(height: 20),

                    // Mode de paiement
                    Text(
                      'Mode de paiement',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.text,
                      ),
                    ).animate().fadeIn(delay: 200.ms, duration: 400.ms),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        _ModeChip(
                          label: 'Espèces',
                          value: 'especes',
                          selected: _mode,
                          onSelected: (v) => setState(() => _mode = v),
                        ),
                        _ModeChip(
                          label: 'Wave',
                          value: 'wave',
                          selected: _mode,
                          onSelected: (v) => setState(() => _mode = v),
                        ),
                        _ModeChip(
                          label: 'Orange Money',
                          value: 'orange_money',
                          selected: _mode,
                          onSelected: (v) => setState(() => _mode = v),
                        ),
                        _ModeChip(
                          label: 'MTN Money',
                          value: 'mtn_money',
                          selected: _mode,
                          onSelected: (v) => setState(() => _mode = v),
                        ),
                      ],
                    ).animate().fadeIn(delay: 240.ms, duration: 400.ms),

                    const SizedBox(height: 20),

                    // Note
                    Text(
                      'Note (optionnel)',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.text,
                      ),
                    ).animate().fadeIn(delay: 280.ms, duration: 400.ms),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _noteController,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        hintText: 'Commentaire...',
                      ),
                    ).animate().fadeIn(delay: 320.ms, duration: 400.ms),

                    const SizedBox(height: 32),

                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _isSaving ? null : _savePaiement,
                        child: _isSaving
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppTheme.dark,
                                ),
                              )
                            : const Text('Confirmer le paiement'),
                      ),
                    ).animate().fadeIn(delay: 360.ms, duration: 400.ms),

                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
    );
  }
}

class _ModeChip extends StatelessWidget {
  final String label;
  final String value;
  final String selected;
  final ValueChanged<String> onSelected;

  const _ModeChip({
    required this.label,
    required this.value,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final isSelected = selected == value;
    return GestureDetector(
      onTap: () => onSelected(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.rondo : AppTheme.card,
          borderRadius: BorderRadius.circular(50),
          border: Border.all(
            color: isSelected ? AppTheme.rondo : AppTheme.text.withValues(alpha: 0.16),
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isSelected ? Colors.white : AppTheme.muted,
          ),
        ),
      ),
    );
  }
}