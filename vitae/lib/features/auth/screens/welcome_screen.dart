import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';

class WelcomeScreen extends ConsumerWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isLoggedIn = ref.watch(isLoggedInProvider);

    return Scaffold(
      backgroundColor: AppTheme.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const Spacer(),
              // Illustration
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: AppTheme.vitaeSoft,
                  borderRadius: BorderRadius.circular(30),
                ),
                child: const Icon(
                  Icons.description_outlined,
                  color: AppTheme.vitae,
                  size: 60,
                ),
              )
                  .animate()
                  .fadeIn(duration: 600.ms)
                  .slide(begin: const Offset(0, 0.3)),

              const SizedBox(height: 32),

              Text(
                'Votre CV professionnel\nen 3 minutes',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  height: 1.2,
                  color: AppTheme.text,
                ),
              ).animate().fadeIn(delay: 200.ms, duration: 500.ms),

              const SizedBox(height: 16),

              Text(
                'Adapté aux codes du marché\nivoirien et ouest-africain',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 16,
                  color: AppTheme.muted,
                  height: 1.5,
                ),
              ).animate().fadeIn(delay: 400.ms, duration: 500.ms),

              const SizedBox(height: 40),

              // 3 bullets
              _buildBullet(
                icon: LucideIcons.fileText,
                title: '6 templates professionnels',
                subtitle: 'Classique, Moderne, Élégant, Minimal, Académique, Stage',
              ).animate().fadeIn(delay: 600.ms, duration: 400.ms).slideX(begin: -0.1),

              const SizedBox(height: 16),

              _buildBullet(
                icon: LucideIcons.palette,
                title: 'Personnalisation facile',
                subtitle: 'Couleurs, sections, ordre — tout est modifiable',
              ).animate().fadeIn(delay: 700.ms, duration: 400.ms).slideX(begin: -0.1),

              const SizedBox(height: 16),

              _buildBullet(
                icon: LucideIcons.share2,
                title: 'Export PDF & partage',
                subtitle: 'Téléchargez ou partagez sur WhatsApp en un tap',
              ).animate().fadeIn(delay: 800.ms, duration: 400.ms).slideX(begin: -0.1),

              const Spacer(),

              // Boutons
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (isLoggedIn) {
                      context.go('/dashboard');
                    } else {
                      context.go('/register');
                    }
                  },
                  child: Text(isLoggedIn ? 'Mes CVs' : 'Commencer'),
                ),
              ).animate().fadeIn(delay: 1000.ms, duration: 400.ms),

              const SizedBox(height: 12),

              if (!isLoggedIn)
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: () => context.go('/login'),
                    child: Text(
                      'J\'ai déjà un compte',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.muted,
                      ),
                    ),
                  ),
                ).animate().fadeIn(delay: 1100.ms, duration: 400.ms),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBullet({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Row(
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppTheme.vitaeSoft,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: AppTheme.vitae, size: 22),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.text,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: AppTheme.muted,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}