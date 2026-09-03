import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';

/// Écran Paramètres
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _deleting = false;

  @override
  Widget build(BuildContext context) {
    final authService = ref.read(authServiceProvider);
    final user = authService.currentUser;

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.go('/dashboard'),
        ),
        title: Text('Paramètres', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              // Profil
              _buildSection('Profil'),
              _buildCard(
                icon: LucideIcons.user,
                title: 'Nom',
                value: user?.userMetadata?['full_name'] as String? ?? 'Utilisateur',
              ),
              _buildCard(
                icon: LucideIcons.phone,
                title: 'Téléphone',
                value: user?.userMetadata?['phone'] as String? ?? '—',
              ),
              const SizedBox(height: 24),

              // ⚠️ MVP v1.0 — Section "Abonnement" retirée (tout est gratuit).
              // La section "Plan actuel" + accès /paywall sera réactivée en v1.1
              // avec l'IAP Apple StoreKit (in_app_purchase).

              // Application
              _buildSection('Application'),
              _buildCard(
                icon: LucideIcons.bookOpen,
                title: 'Conseils CV',
                value: 'Guides et bonnes pratiques',
                onTap: () => context.go('/conseils'),
              ),
              _buildCard(
                icon: LucideIcons.info,
                title: 'À propos',
                value: 'Vitae v1.0.0\nThe Everyday Co.',
              ),
              const SizedBox(height: 24),

              // Déconnexion
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    await authService.signOut();
                    if (mounted) context.go('/welcome');
                  },
                  icon: const Icon(LucideIcons.logOut, size: 18, color: AppTheme.error),
                  label: Text('Se déconnecter', style: GoogleFonts.inter(color: AppTheme.error)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppTheme.error),
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Suppression de compte (petit lien rouge)
              if (_deleting)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.only(bottom: 8),
                    child: SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
              Center(
                child: TextButton(
                  onPressed: _deleting ? null : _confirmDeleteAccount,
                  style: TextButton.styleFrom(
                    foregroundColor: AppTheme.error,
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    'Supprimer mon compte',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppTheme.error.withValues(alpha: 0.7),
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  /// Confirmation de suppression de compte (dialog), puis appel RPC
  /// `delete_user` côté Supabase — supprime le profil, les CV et le
  /// user auth. Action irréversible.
  Future<void> _confirmDeleteAccount() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Supprimer mon compte',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700),
        ),
        content: Text(
          'Cette action est irréversible. Toutes vos données (profil, CV, exports) seront supprimées.\n\nConfirmez la suppression définitive.',
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
            child: const Text('Supprimer définitivement'),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    setState(() => _deleting = true);
    try {
      // Appeler la RPC de suppression (même projet Supabase que Rondo).
      // Supprime le profil, les vitae_cvs (cascade) et le user auth.
      await Supabase.instance.client.rpc('delete_user');
    } catch (e) {
      if (mounted) {
        setState(() => _deleting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur : ${e.toString()}'),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return;
    }

    // Le user auth est supprimé : la session n'est plus valide côté serveur.
    // On nettoie l'état local — ignorer une éventuelle erreur de révocation
    // distante (le compte est déjà supprimé à ce stade).
    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {}

    if (mounted) {
      context.go('/welcome');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Compte supprimé'),
          backgroundColor: AppTheme.success,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  // ⚠️ MVP v1.0 — _planLabel retiré (section Abonnement retirée, tout est gratuit).
  // Sera réactivé en v1.1 avec l'IAP Apple StoreKit.

  Widget _buildSection(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.muted2, letterSpacing: 1),
      ),
    );
  }

  Widget _buildCard({
    required IconData icon,
    required String title,
    required String value,
    VoidCallback? onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.bg2),
            ),
            child: Row(
              children: [
                Icon(icon, color: AppTheme.muted, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.text)),
                      const SizedBox(height: 2),
                      Text(value, style: GoogleFonts.inter(fontSize: 13, color: AppTheme.muted)),
                    ],
                  ),
                ),
                if (onTap != null)
                  const Icon(LucideIcons.chevronRight, color: AppTheme.muted2, size: 18),
              ],
            ),
          ),
        ),
      ),
    );
  }
}