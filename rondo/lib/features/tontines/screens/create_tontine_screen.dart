import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import 'home_screen.dart';

class CreateTontineScreen extends ConsumerStatefulWidget {
  const CreateTontineScreen({super.key});

  @override
  ConsumerState<CreateTontineScreen> createState() => _CreateTontineScreenState();
}

class _CreateTontineScreenState extends ConsumerState<CreateTontineScreen> {
  final _nameController = TextEditingController();
  final _miseController = TextEditingController();
  final _nbMembresController = TextEditingController();
  String _frequence = 'mensuelle';
  DateTime _dateDebut = DateTime.now().add(const Duration(days: 7));
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _miseController.dispose();
    _nbMembresController.dispose();
    super.dispose();
  }

  Future<void> _createTontine() async {
    if (_nameController.text.trim().isEmpty) {
      _showError('Veuillez saisir le nom de la tontine');
      return;
    }
    final mise = int.tryParse(_miseController.text);
    if (mise == null || mise <= 0) {
      _showError('Veuillez saisir un montant valide');
      return;
    }
    final nbMembres = int.tryParse(_nbMembresController.text);
    if (nbMembres == null || nbMembres < 2 || nbMembres > 50) {
      _showError('Le nombre de membres doit être entre 2 et 50');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final service = ref.read(tontineServiceProvider);
      await service.createTontine(
        name: _nameController.text.trim(),
        mise: mise,
        frequence: _frequence,
        nbMembres: nbMembres,
        dateDebut: _dateDebut,
      );

      if (mounted) {
        // Invalider le provider pour forcer le re-fetch des tontines
        ref.invalidate(myTontinesProvider);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Tontine créée ! Partagez le code d\'invitation.'),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        context.go('/home');
      }
    } catch (e) {
      if (mounted) {
        final errorMsg = e.toString();
        if (errorMsg.contains('duplicate key') || errorMsg.contains('unique')) {
          _showError('Vous avez déjà une tontine avec ce nom');
        } else {
          _showError('Erreur : ${errorMsg.length > 100 ? '${errorMsg.substring(0, 100)}...' : errorMsg}');
        }
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
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
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Nouvelle tontine'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),

              Text(
                'Créer une tontine',
                style: GoogleFonts.inter(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.text,
                  letterSpacing: -0.5,
                ),
              ).animate().fadeIn(duration: 400.ms),
              const SizedBox(height: 8),
              Text(
                'Définissez les paramètres de votre cercle d\'épargne',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: AppTheme.muted,
                ),
              ).animate().fadeIn(delay: 80.ms, duration: 400.ms),

              const SizedBox(height: 32),

              // Nom
              _buildLabel('Nom de la tontine'),
              const SizedBox(height: 8),
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  hintText: 'Famille Koné',
                  prefixIcon: Icon(Icons.group_outlined),
                ),
              ).animate().fadeIn(delay: 120.ms, duration: 400.ms),

              const SizedBox(height: 20),

              // Mise
              _buildLabel('Mise (FCFA)'),
              const SizedBox(height: 8),
              TextField(
                controller: _miseController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  hintText: '10000',
                  prefixIcon: Icon(Icons.savings_outlined),
                ),
              ).animate().fadeIn(delay: 160.ms, duration: 400.ms),

              const SizedBox(height: 20),

              // Fréquence
              _buildLabel('Fréquence'),
              const SizedBox(height: 8),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(
                    value: 'hebdomadaire',
                    label: Text('Semaine'),
                    icon: Icon(Icons.calendar_view_week),
                  ),
                  ButtonSegment(
                    value: 'mensuelle',
                    label: Text('Mois'),
                    icon: Icon(Icons.calendar_month),
                  ),
                ],
                selected: {_frequence},
                onSelectionChanged: (set) => setState(() => _frequence = set.first),
              ).animate().fadeIn(delay: 200.ms, duration: 400.ms),

              const SizedBox(height: 20),

              // Nombre de membres
              _buildLabel('Nombre de membres'),
              const SizedBox(height: 8),
              TextField(
                controller: _nbMembresController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  hintText: '8',
                  prefixIcon: Icon(Icons.people_outline),
                ),
              ).animate().fadeIn(delay: 240.ms, duration: 400.ms),

              const SizedBox(height: 20),

              // Date de début
              _buildLabel('Date de démarrage'),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: _dateDebut,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (date != null) setState(() => _dateDebut = date);
                },
                child: AbsorbPointer(
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: '${_dateDebut.day}/${_dateDebut.month}/${_dateDebut.year}',
                      prefixIcon: const Icon(LucideIcons.calendar, size: 20),
                      suffixIcon: const Icon(LucideIcons.chevronDown, size: 20),
                    ),
                  ),
                ),
              ).animate().fadeIn(delay: 280.ms, duration: 400.ms),

              const SizedBox(height: 32),

              // Info
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.rondoSoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(LucideIcons.info, color: AppTheme.rondo, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Après la création, vous pourrez inviter des membres avec le code d\'invitation et définir l\'ordre des tours.',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: AppTheme.muted,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 320.ms, duration: 400.ms),

              const SizedBox(height: 24),

              // Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _createTontine,
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppTheme.dark,
                          ),
                        )
                      : const Text('Créer la tontine'),
                ),
              ).animate().fadeIn(delay: 360.ms, duration: 400.ms),

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: AppTheme.text,
      ),
    );
  }
}