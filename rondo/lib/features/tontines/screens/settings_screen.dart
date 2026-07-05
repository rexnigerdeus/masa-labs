import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  Map<String, dynamic>? _profile;
  bool _isLoading = true;
  bool _isEditing = false;
  final _nameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    try {
      final service = ref.read(tontineServiceProvider);
      final profile = await service.getMyProfile();
      if (mounted) {
        setState(() {
          _profile = profile;
          _nameController.text = profile['full_name'] as String? ?? '';
        });
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

  Future<void> _saveName() async {
    final newName = _nameController.text.trim();
    if (newName.isEmpty) return;

    try {
      final service = ref.read(tontineServiceProvider);
      await service.updateProfile(fullName: newName);
      if (mounted) {
        setState(() {
          _profile!['full_name'] = newName;
          _isEditing = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Profil mis à jour'),
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
    }
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Déconnexion'),
        content: const Text('Voulez-vous vraiment vous déconnecter ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Déconnexion', style: TextStyle(color: AppTheme.error)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final authService = ref.read(authServiceProvider);
      await authService.signOut();
      if (mounted) context.go('/login');
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
        title: const Text('Paramètres'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.rondo))
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 24),

                    // Profile section
                    Text(
                      'Profil',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.text,
                      ),
                    ).animate().fadeIn(duration: 400.ms),
                    const SizedBox(height: 16),

                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppTheme.card,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.text.withValues(alpha: 0.08)),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  color: AppTheme.rondoSoft,
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: const Icon(Icons.person, color: AppTheme.rondo, size: 28),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (_isEditing)
                                      TextField(
                                        controller: _nameController,
                                        style: GoogleFonts.inter(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                        ),
                                        decoration: const InputDecoration(
                                          isDense: true,
                                          contentPadding: EdgeInsets.zero,
                                        ),
                                        autofocus: true,
                                      )
                                    else
                                      Text(
                                        _profile?['full_name'] as String? ?? 'Utilisateur',
                                        style: GoogleFonts.inter(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                          color: AppTheme.text,
                                        ),
                                      ),
                                    const SizedBox(height: 4),
                                    Text(
                                      _profile?['phone'] as String? ?? '',
                                      style: GoogleFonts.inter(
                                        fontSize: 13,
                                        color: AppTheme.muted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                icon: Icon(
                                  _isEditing ? Icons.check : Icons.edit_outlined,
                                  color: AppTheme.rondo,
                                ),
                                onPressed: _isEditing ? _saveName : () => setState(() => _isEditing = true),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ).animate().fadeIn(delay: 80.ms, duration: 400.ms),

                    const SizedBox(height: 32),

                    // Notifications
                    Text(
                      'Préférences',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.text,
                      ),
                    ).animate().fadeIn(delay: 120.ms, duration: 400.ms),
                    const SizedBox(height: 16),

                    _SettingsTile(
                      icon: Icons.notifications_outlined,
                      title: 'Notifications',
                      subtitle: 'Rappels de cotisation et messages',
                      onTap: () => context.push('/notifications'),
                    ).animate().fadeIn(delay: 160.ms, duration: 400.ms),

                    const SizedBox(height: 32),

                    // Compte
                    Text(
                      'Compte',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.text,
                      ),
                    ).animate().fadeIn(delay: 200.ms, duration: 400.ms),
                    const SizedBox(height: 16),

                    _SettingsTile(
                      icon: Icons.logout,
                      title: 'Déconnexion',
                      subtitle: 'Se déconnecter de Rondo',
                      onTap: _logout,
                      isDestructive: true,
                    ).animate().fadeIn(delay: 240.ms, duration: 400.ms),

                    const SizedBox(height: 40),

                    // Version
                    Center(
                      child: Text(
                        'Rondo v1.0.0\nThe Everyday Co.',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: AppTheme.muted2,
                          height: 1.5,
                        ),
                      ),
                    ).animate().fadeIn(delay: 280.ms, duration: 400.ms),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool isDestructive;

  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
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
                color: isDestructive
                    ? AppTheme.error.withValues(alpha: 0.1)
                    : AppTheme.rondoSoft,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: isDestructive ? AppTheme.error : AppTheme.rondo,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isDestructive ? AppTheme.error : AppTheme.text,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.inter(fontSize: 12, color: AppTheme.muted2),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: AppTheme.muted2,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}