import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../utils/phone_formatter.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _acceptTerms = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (_nameController.text.trim().isEmpty) {
      _showError('Veuillez saisir votre nom');
      return;
    }
    if (_phoneController.text.trim().isEmpty) {
      _showError('Veuillez saisir votre numéro de téléphone');
      return;
    }
    if (!isValidPhone(_phoneController.text)) {
      _showError('Numéro de téléphone invalide');
      return;
    }
    if (_passwordController.text.length < 6) {
      _showError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (!_acceptTerms) {
      _showError('Veuillez accepter les conditions d\'utilisation');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authService = ref.read(authServiceProvider);
      await authService.signUp(
        phone: _phoneController.text.trim(),
        password: _passwordController.text,
        fullName: _nameController.text.trim(),
      );

      if (mounted) {
        // Inscription réussie → directement connecté (email confirm désactivé)
        context.go('/home');
      }
    } catch (e) {
      if (mounted) {
        _showError('Erreur lors de l\'inscription : ${e.toString()}');
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
          onPressed: () => context.go('/login'),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),

              Text(
                'Créer un compte',
                style: GoogleFonts.inter(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.text,
                  letterSpacing: -0.5,
                ),
              ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.1),

              const SizedBox(height: 8),

              Text(
                'Rejoignez vos cercles d\'épargne en quelques secondes',
                style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w400,
                  color: AppTheme.muted,
                ),
              ).animate().fadeIn(delay: 80.ms, duration: 400.ms),

              const SizedBox(height: 36),

              // Name
              _buildLabel('Nom complet', delay: 120.ms),
              const SizedBox(height: 8),
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  hintText: 'Awa Koné',
                  prefixIcon: Icon(Icons.person_outline),
                ),
              ).animate().fadeIn(delay: 160.ms, duration: 400.ms),

              const SizedBox(height: 20),

              // Phone
              _buildLabel('Numéro de téléphone', delay: 200.ms),
              const SizedBox(height: 8),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.number,
                inputFormatters: [PhoneInputFormatter()],
                decoration: const InputDecoration(
                  hintText: '0700000000',
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
              ).animate().fadeIn(delay: 240.ms, duration: 400.ms),

              const SizedBox(height: 20),

              // Password
              _buildLabel('Mot de passe', delay: 280.ms),
              const SizedBox(height: 8),
              TextField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                decoration: InputDecoration(
                  hintText: 'Minimum 6 caractères',
                  prefixIcon: const Icon(LucideIcons.lock, size: 20),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword
                          ? LucideIcons.eyeOff
                          : LucideIcons.eye,
                      size: 20,
                    ),
                    onPressed: () {
                      setState(() => _obscurePassword = !_obscurePassword);
                    },
                  ),
                ),
              ).animate().fadeIn(delay: 320.ms, duration: 400.ms),

              const SizedBox(height: 20),

              // Terms
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Checkbox(
                    value: _acceptTerms,
                    onChanged: (v) => setState(() => _acceptTerms = v ?? false),
                    activeColor: AppTheme.rondo,
                  ),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(
                        'J\'accepte les conditions d\'utilisation et la politique de confidentialité',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: AppTheme.muted,
                        ),
                      ),
                    ),
                  ),
                ],
              ).animate().fadeIn(delay: 360.ms, duration: 400.ms),

              const SizedBox(height: 16),

              // Register button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _register,
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppTheme.dark,
                          ),
                        )
                      : const Text('Créer mon compte'),
                ),
              ).animate().fadeIn(delay: 400.ms, duration: 400.ms),

              const SizedBox(height: 24),

              // Info sécurité
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.rondoSoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(LucideIcons.shieldCheck, color: AppTheme.rondo, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Vos données sont sécurisées. Aucune information n\'est partagée avec des tiers.',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: AppTheme.muted,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 440.ms, duration: 400.ms),

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text, {Duration delay = Duration.zero}) {
    return Text(
      text,
      style: GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: AppTheme.text,
      ),
    ).animate().fadeIn(delay: delay, duration: 400.ms);
  }
}