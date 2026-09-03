import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Service de gestion du plan d'abonnement Vitae.
/// Plans :
/// - gratuit  : 1 CV actif, 2 templates (Classique + Stage), export avec watermark
/// - premium  : CVs illimités, 6 templates, sans watermark, export illimité
/// - etudiant : Premium avec justificatif étudiant
class PlanService {
  static const String planGratuit = 'gratuit';
  static const String planPremium = 'premium';
  static const String planEtudiant = 'etudiant';

  // Limites (réactivées en v1.1 avec l'IAP Apple StoreKit)
  static const int maxCvsGratuit = 1;
  static const List<int> templatesGratuit = [1, 6]; // Classique + Stage
  static const int prixPremiumCv = 500; // FCFA par CV
  static const int prixPremiumMois = 2000; // FCFA / mois
  static const int prixEtudiant6mois = 1000; // FCFA / 6 mois

  final SupabaseClient _client = Supabase.instance.client;

  /// Récupère le plan actuel de l'utilisateur connecté.
  ///
  /// ⚠️ MVP v1.0 — Toutes les fonctionnalités sont gratuites pour valider
  /// le marché. Tout utilisateur est traité comme plan Premium (illimité) :
  /// CVs illimités, 6 templates, export sans watermark.
  /// La monétisation IAP (Apple StoreKit) sera réactivée en v1.1 une fois
  /// le Paid Applications Agreement signé. Le service iap_service.dart
  /// (à créer) intégrera `in_app_purchase` et mettra à jour la table
  /// `vitae_subscriptions` après validation du reçu côté serveur.
  Future<String> getCurrentPlan() async {
    return planPremium;
  }

  /// Vérifie si l'utilisateur peut créer un nouveau CV.
  ///
  /// ⚠️ MVP v1.0 — Aucune limite (tout est gratuit). Retourne toujours true.
  /// La limite de 1 CV sur le plan gratuit sera réactivée en v1.1.
  Future<bool> canCreateCv() async {
    return true;
  }

  /// Vérifie si un template est accessible selon le plan.
  ///
  /// ⚠️ MVP v1.0 — Aucune limite (tout est gratuit). Retourne toujours true.
  /// Les 2 templates gratuits (Classique + Stage) seront réactivés en v1.1.
  bool canUseTemplate(String plan, int templateId) {
    return true;
  }

  /// Vérifie si l'export PDF est sans watermark.
  ///
  /// ⚠️ MVP v1.0 — Aucun watermark (tout est gratuit). Retourne toujours true.
  /// Le watermark "Créé avec Vitae" sur le plan gratuit sera réactivé en v1.1.
  bool exportWithoutWatermark(String plan) {
    return true;
  }

  /// Met à jour le plan d'un user (utilisé après paiement IAP en v1.1).
  Future<void> setPlan(String userId, String plan, {Duration? duration}) async {
    final expiresAt = duration != null
        ? DateTime.now().add(duration).toIso8601String()
        : null;

    await _client.from('vitae_subscriptions').upsert({
      'user_id': userId,
      'plan': plan,
      'started_at': DateTime.now().toIso8601String(),
      'expires_at': expiresAt,
      'updated_at': DateTime.now().toIso8601String(),
    });
  }
}