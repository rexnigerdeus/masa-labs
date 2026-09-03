import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';

/// Écran "Quel est votre objectif ?"
/// Personnalise l'expérience selon le choix de l'utilisateur
class ObjectifScreen extends ConsumerStatefulWidget {
  const ObjectifScreen({super.key});

  @override
  ConsumerState<ObjectifScreen> createState() => _ObjectifScreenState();
}

class _ObjectifScreenState extends ConsumerState<ObjectifScreen> {
  String? _selectedObjectif;

  final _objectifs = [
    {
      'id': 'emploi',
      'icon': LucideIcons.briefcase,
      'title': 'Trouver un emploi',
      'subtitle': 'CV optimisé pour décrocher des entretiens',
    },
    {
      'id': 'stage',
      'icon': LucideIcons.graduationCap,
      'title': 'Trouver un stage',
      'subtitle': 'Template "Stage" 1 page, sections adaptées',
    },
    {
      'id': 'mise_a_jour',
      'icon': LucideIcons.refreshCw,
      'title': 'Mettre à jour mon CV',
      'subtitle': 'Rafraîchir un CV existant avec un nouveau look',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.go('/welcome'),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Quel est votre objectif ?',
                style: GoogleFonts.inter(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.text,
                ),
              ).animate().fadeIn(duration: 400.ms),
              const SizedBox(height: 8),
              Text(
                'Cela personnalise votre expérience',
                style: GoogleFonts.inter(
                  fontSize: 15,
                  color: AppTheme.muted,
                ),
              ).animate().fadeIn(delay: 100.ms, duration: 400.ms),
              const SizedBox(height: 32),

              Expanded(
                child: ListView.builder(
                  itemCount: _objectifs.length,
                  itemBuilder: (context, index) {
                    final obj = _objectifs[index];
                    final isSelected = _selectedObjectif == obj['id'];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _buildObjectifCard(
                        icon: obj['icon'] as IconData,
                        title: obj['title'] as String,
                        subtitle: obj['subtitle'] as String,
                        isSelected: isSelected,
                        onTap: () => setState(() => _selectedObjectif = obj['id'] as String),
                      ),
                    ).animate().fadeIn(
                          delay: Duration(milliseconds: 200 + index * 100),
                          duration: 400.ms,
                        ).slideY(begin: 0.1);
                  },
                ),
              ),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _selectedObjectif == null
                      ? null
                      : () => context.go('/dashboard'),
                  child: const Text('Continuer'),
                ),
              ).animate().fadeIn(delay: 600.ms, duration: 400.ms),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildObjectifCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Material(
      color: isSelected ? AppTheme.vitaeSoft : AppTheme.card,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSelected ? AppTheme.vitae : Colors.transparent,
              width: 2,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: isSelected ? AppTheme.vitae : AppTheme.bg2,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: isSelected ? Colors.white : AppTheme.muted,
                  size: 24,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.inter(
                        fontSize: 16,
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
              if (isSelected)
                const Icon(LucideIcons.check, color: AppTheme.vitae, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}