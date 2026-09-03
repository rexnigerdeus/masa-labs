/// Service de gestion du plan Rondo.
///
/// v1.0 — L'app est entièrement gratuite. Aucun plan payant, aucun IAP.
/// Les limites freemium et l'IAP (Apple StoreKit) seront introduits en v1.1
class PlanService {
  static const String planGratuit = 'gratuit';

  /// Récupère le plan actuel de l'utilisateur connecté.
  /// v1.0 — Tout est gratuit, tout le monde est sur le plan gratuit illimité.
  Future<String> getCurrentPlan() async {
    return planGratuit;
  }

  /// Vérifie si l'user peut créer une nouvelle tontine.
  /// v1.0 — Aucune limite. Retourne toujours null.
  Future<String?> canCreateTontine(int currentTontinesCount) async {
    return null;
  }

  /// Vérifie si l'user peut créer une tontine avec ce nombre de membres.
  /// v1.0 — Aucune limite. Retourne toujours null.
  Future<String?> canCreateTontineWithMembers(int nbMembres) async {
    return null;
  }

  /// Description des features du plan (affichée dans les paramètres si besoin).
  static Map<String, dynamic> getPlanFeatures(String plan) {
    return {
      'name': 'Rondo',
      'price': 'Gratuit',
      'features': [
        'Tontines illimitées',
        'Membres illimités',
        'Rappels de cotisation',
        'Reçus PDF',
      ],
    };
  }
}
