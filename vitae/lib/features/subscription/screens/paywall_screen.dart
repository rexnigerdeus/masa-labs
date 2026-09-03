import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/providers.dart';
import '../services/plan_service.dart';

/// Écran Paywall — plans d'abonnement Vitae
class PaywallScreen extends ConsumerWidget {
  const PaywallScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentPlan = ref.watch(currentPlanProvider).value ?? 'gratuit';

    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.x),
          onPressed: () => context.go('/dashboard'),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              Center(
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppTheme.vitaeSoft,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(LucideIcons.sparkles, color: AppTheme.vitae, size: 32),
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: Text(
                  'Passez Premium',
                  style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w700, color: AppTheme.text),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  'Débloquez tout le potentiel de Vitae',
                  style: GoogleFonts.inter(fontSize: 15, color: AppTheme.muted),
                ),
              ),
              const SizedBox(height: 32),

              // Features
              _buildFeature('CVs illimités'),
              _buildFeature('6 templates professionnels'),
              _buildFeature('Export sans watermark'),
              _buildFeature('Toutes les couleurs'),
              _buildFeature('Export PDF illimité'),
              _buildFeature('Partage WhatsApp direct'),
              const SizedBox(height: 32),

              // Plan Premium
              _buildPlanCard(
                title: 'Premium',
                price: '2 000 FCFA',
                period: '/ mois',
                description: 'Tout illimité',
                isCurrent: currentPlan == PlanService.planPremium,
                isRecommended: true,
                onTap: () => _showPaymentComingSoon(context),
              ),
              const SizedBox(height: 12),

              // Plan par CV
              _buildPlanCard(
                title: 'Premium à l\'acte',
                price: '500 FCFA',
                period: '/ CV',
                description: 'Idéal pour un CV ponctuel',
                isCurrent: false,
                onTap: () => _showPaymentComingSoon(context),
              ),
              const SizedBox(height: 12),

              // Plan Étudiant
              _buildPlanCard(
                title: 'Étudiant',
                price: '1 000 FCFA',
                period: '/ 6 mois',
                description: 'Premium avec justificatif étudiant',
                isCurrent: currentPlan == PlanService.planEtudiant,
                onTap: () => _showPaymentComingSoon(context),
              ),
              const SizedBox(height: 32),

              Text(
                'Paiements via Wave et Orange Money (bientôt disponible)',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(fontSize: 12, color: AppTheme.muted2),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeature(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: const BoxDecoration(
              color: AppTheme.vitae,
              shape: BoxShape.circle,
            ),
            child: const Icon(LucideIcons.check, color: Colors.white, size: 14),
          ),
          const SizedBox(width: 12),
          Text(text, style: GoogleFonts.inter(fontSize: 15, color: AppTheme.text)),
        ],
      ),
    );
  }

  Widget _buildPlanCard({
    required String title,
    required String price,
    required String period,
    required String description,
    required bool isCurrent,
    required VoidCallback onTap,
    bool isRecommended = false,
  }) {
    return Material(
      color: isRecommended ? AppTheme.vitaeSoft : AppTheme.card,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: isCurrent ? null : onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isRecommended ? AppTheme.vitae : AppTheme.bg2,
              width: isRecommended ? 2 : 1,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(title, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.text)),
                        if (isRecommended) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.vitae,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text('Recommandé', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white)),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(description, style: GoogleFonts.inter(fontSize: 13, color: AppTheme.muted)),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(price, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.vitae)),
                  Text(period, style: GoogleFonts.inter(fontSize: 12, color: AppTheme.muted)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showPaymentComingSoon(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Bientôt disponible', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
        content: Text(
          'Le paiement via Wave et Orange Money sera disponible très prochainement. En attendant, contactez-nous pour activer votre plan Premium.',
          style: GoogleFonts.inter(color: AppTheme.muted),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK')),
        ],
      ),
    );
  }
}