import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';

class JoinTontineScreen extends ConsumerStatefulWidget {
  const JoinTontineScreen({super.key});

  @override
  ConsumerState<JoinTontineScreen> createState() => _JoinTontineScreenState();
}

class _JoinTontineScreenState extends ConsumerState<JoinTontineScreen> {
  final _codeController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _joinTontine() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) {
      _showError('Veuillez saisir le code d\'invitation');
      return;
    }
    if (code.length != 6) {
      _showError('Le code doit contenir 6 caractères');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final service = ref.read(tontineServiceProvider);
      await service.rejoindreTontine(code);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Vous avez rejoint la tontine !'),
            backgroundColor: AppTheme.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        context.go('/home');
      }
    } catch (e) {
      if (mounted) _showError('Code invalide ou tontine complète');
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
        title: const Text('Rejoindre'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),

              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: AppTheme.rondoSoft,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(Icons.group_add_outlined, color: AppTheme.rondo, size: 28),
              ).animate().fadeIn(duration: 400.ms).scale(begin: const Offset(0.8, 0.8)),

              const SizedBox(height: 24),

              Text(
                'Rejoindre une tontine',
                style: GoogleFonts.inter(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.text,
                  letterSpacing: -0.5,
                ),
              ).animate().fadeIn(delay: 80.ms, duration: 400.ms),

              const SizedBox(height: 8),

              Text(
                'Saisissez le code à 6 caractères fourni par l\'administrateur',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: AppTheme.muted,
                ),
              ).animate().fadeIn(delay: 120.ms, duration: 400.ms),

              const SizedBox(height: 32),

              TextField(
                controller: _codeController,
                textCapitalization: TextCapitalization.characters,
                maxLength: 6,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 8,
                  color: AppTheme.text,
                ),
                decoration: InputDecoration(
                  counterText: '',
                  hintText: 'ABC123',
                  hintStyle: GoogleFonts.inter(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 8,
                    color: AppTheme.muted2,
                  ),
                  filled: true,
                  fillColor: AppTheme.card,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide(color: AppTheme.text.withValues(alpha: 0.16)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: AppTheme.rondo, width: 2),
                  ),
                  contentPadding: const EdgeInsets.symmetric(vertical: 20),
                ),
              ).animate().fadeIn(delay: 160.ms, duration: 400.ms).slideY(begin: 0.1),

              const SizedBox(height: 32),

              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _joinTontine,
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppTheme.dark,
                          ),
                        )
                      : const Text('Rejoindre'),
                ),
              ).animate().fadeIn(delay: 200.ms, duration: 400.ms),
            ],
          ),
        ),
      ),
    );
  }
}