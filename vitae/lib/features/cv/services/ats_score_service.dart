import '../../cv/models/cv_model.dart';

/// Résultat du calcul du score ATS pour un CV.
class AtsResult {
  /// Score total /100
  final int score;

  /// Seuil d'export autorisé (80 par défaut)
  static const int exportThreshold = 80;

  /// Liste des recommandations actionnables (vides si score >= threshold).
  /// Chaque reco a un label court et le nombre de points gagnés si appliquée.
  final List<AtsRecommendation> recommendations;

  /// Détail des points par critère (pour debug / affichage optionnel)
  final Map<String, int> breakdown;

  const AtsResult({
    required this.score,
    required this.recommendations,
    required this.breakdown,
  });

  /// true si le CV peut être exporté (score >= 80)
  bool get canExport => score >= exportThreshold;

  /// Nombre de points manquants pour atteindre le seuil d'export
  int get missingPoints =>
      score >= exportThreshold ? 0 : exportThreshold - score;
}

class AtsRecommendation {
  final String label;
  final int points;

  const AtsRecommendation({required this.label, required this.points});
}

/// Service de calcul du score ATS d'un CV Vitae.
///
/// Score ATS /100 — règles locales déterministes (sans ML) :
/// - Parsabilité PDF (texte réel, 1 colonne, polices embedded) → +25 (garanti par construction)
/// - Présence de toutes les sections clés → +25
/// - ≥ 3 compétences techniques + ≥ 1 langue avec niveau → +15
/// - Titre professionnel renseigné → +10
/// - Dates lisibles (MM/AAAA ou AAAA) sur expériences et formations → +10
/// - ≤ 2 pages (1 page pour template Stage) → +10
/// - Pas de photo → +5 (optionnel)
///
/// Un CV complet avec template Classique atteint 95-100/100.
/// Le seuil d'export est fixé à 80 (voir AtsResult.exportThreshold).
class AtsScoreService {
  /// Templates ATS-friendly (1 colonne, structure simple).
  /// Les templates 2 colonnes (Moderne=2, Élégant=3) sont "partiellement ATS".
  static const Set<int> atsOptimizedTemplates = {1, 4, 5, 6};
  static const Set<int> atsPartialTemplates = {2, 3};

  /// Calcule le score ATS d'un CV.
  AtsResult calculateScore(Cv cv) {
    int score = 0;
    final recos = <AtsRecommendation>[];
    final breakdown = <String, int>{};

    final perso = cv.getSection(SectionType.perso)?.donnees ?? {};
    final experiences = _getList(cv, SectionType.experience);
    final formations = _getList(cv, SectionType.formation);
    final competences = _getStringList(cv, SectionType.competence);
    final langues = _getList(cv, SectionType.langue);

    // 1. Parsabilité PDF — +25 (garanti par construction)
    // Le générateur PDF produit du vrai texte sélectionnable avec polices
    // Roboto embedded. Sur les templates 1 colonne (ATS optimized), c'est
    // parfait. Sur les templates 2 colonnes (Moderne, Élégant), on garde 25
    // car le PDF reste du texte réel, mais le template est marqué "partiel"
    // dans la UI (trade-off expliqué à l'utilisateur).
    score += 25;
    breakdown['parsabilite'] = 25;

    // 2. Présence de toutes les sections clés — +25
    // Réparti : perso (5) + (expérience OU formation) (10) + compétences (5) + langues (5)
    int sectionsPoints = 0;
    final persoOk = _persoOk(perso);
    if (persoOk) {
      sectionsPoints += 5;
    } else {
      recos.add(const AtsRecommendation(
        label: 'Complétez vos informations personnelles (nom, téléphone, email)',
        points: 5,
      ));
    }

    final hasExpOrFormation = experiences.isNotEmpty || formations.isNotEmpty;
    if (hasExpOrFormation) {
      sectionsPoints += 10;
    } else {
      recos.add(const AtsRecommendation(
        label: 'Ajoutez au moins une expérience ou une formation',
        points: 10,
      ));
    }

    if (competences.isNotEmpty) {
      sectionsPoints += 5;
    } else {
      recos.add(const AtsRecommendation(
        label: 'Ajoutez au moins une compétence technique',
        points: 5,
      ));
    }

    if (langues.isNotEmpty) {
      sectionsPoints += 5;
    } else {
      recos.add(const AtsRecommendation(
        label: 'Renseignez au moins une langue avec son niveau',
        points: 5,
      ));
    }

    score += sectionsPoints;
    breakdown['sections'] = sectionsPoints;

    // 3. ≥ 3 compétences + ≥ 1 langue avec niveau — +15
    // Réparti : ≥ 3 compétences (10) + ≥ 1 langue avec niveau (5)
    int skillsPoints = 0;
    if (competences.length >= 3) {
      skillsPoints += 10;
    } else {
      final missing = 3 - competences.length;
      recos.add(AtsRecommendation(
        label: 'Ajoutez $missing compétence(s) technique(s) — minimum 3 recommandé',
        points: 10,
      ));
    }

    final hasLangueWithNiveau = langues.any((l) =>
        (l['niveau'] as String?)?.isNotEmpty == true &&
        (l['langue'] as String?)?.isNotEmpty == true);
    if (hasLangueWithNiveau) {
      skillsPoints += 5;
    } else if (langues.isEmpty) {
      // déjà couvert par la reco "langues" ci-dessus
    } else {
      recos.add(const AtsRecommendation(
        label: 'Renseignez le niveau de votre langue (Notions, Intermédiaire, Courant, etc.)',
        points: 5,
      ));
    }

    score += skillsPoints;
    breakdown['skills'] = skillsPoints;

    // 4. Titre professionnel renseigné — +10
    final titreOk = (perso['titre'] as String?)?.isNotEmpty == true ||
        cv.titre.isNotEmpty && cv.titre != 'Mon CV';
    if (titreOk) {
      score += 10;
      breakdown['titre'] = 10;
    } else {
      recos.add(const AtsRecommendation(
        label: 'Renseignez un titre professionnel (ex : "Comptable Junior")',
        points: 10,
      ));
    }

    // 5. Dates lisibles (MM/AAAA ou AAAA) — +10
    final datesOk = _datesLisibles(experiences, formations);
    if (datesOk) {
      score += 10;
      breakdown['dates'] = 10;
    } else {
      recos.add(const AtsRecommendation(
        label: 'Renseignez les dates au format MM/AAAA ou AAAA sur vos expériences et formations',
        points: 10,
      ));
    }

    // 6. ≤ 2 pages (1 page pour Stage) — +10
    final pagesOk = _pagesEstimeesOk(cv, experiences, formations);
    if (pagesOk) {
      score += 10;
      breakdown['pages'] = 10;
    } else {
      recos.add(const AtsRecommendation(
        label: 'Réduisez le contenu pour tenir en 2 pages maximum (1 page pour le template Stage)',
        points: 10,
      ));
    }

    // 7. Pas de photo — +5 (optionnel)
    final hasPhoto = (perso['photo_url'] as String?)?.isNotEmpty == true;
    if (!hasPhoto) {
      score += 5;
      breakdown['noPhoto'] = 5;
    } else {
      // Pas de reco ici : la photo est un choix utilisateur légitime.
      // On n'incite pas à la retirer, on note juste que c'est 5 points optionnels.
      breakdown['noPhoto'] = 0;
    }

    // Clamp 0-100
    if (score > 100) score = 100;
    if (score < 0) score = 0;

    // Trier les recos par points décroissants (priorité actionnable)
    recos.sort((a, b) => b.points.compareTo(a.points));

    return AtsResult(
      score: score,
      recommendations: recos,
      breakdown: breakdown,
    );
  }

  bool _persoOk(Map<String, dynamic> perso) {
    final nom = (perso['nom'] as String?)?.isNotEmpty == true;
    final prenom = (perso['prenom'] as String?)?.isNotEmpty == true;
    final phone = (perso['phone'] as String?)?.isNotEmpty == true;
    final email = (perso['email'] as String?)?.isNotEmpty == true;
    // Au minimum nom + (phone OU email) pour qu'un ATS puisse contacter
    return (nom || prenom) && (phone || email);
  }

  /// Vérifie que les dates sont au format lisible MM/AAAA ou AAAA.
  /// Accepte aussi "AAAA - AAAA", "AAAA-présent", etc.
  bool _datesLisibles(
    List<Map<String, dynamic>> experiences,
    List<Map<String, dynamic>> formations,
  ) {
    // Si pas d'expériences ni formations, on ne pénalise pas
    // (couvert par la règle "sections").
    if (experiences.isEmpty && formations.isEmpty) return true;

    final dateRegex = RegExp(r'^\d{2}/\d{4}$|^\d{4}$|^\d{4}\s*[-–]\s*\d{4}$|^\d{4}\s*[-–]\s*présent$|^\d{2}/\d{4}\s*[-–]\s*\d{2}/\d{4}$|^\d{2}/\d{4}\s*[-–]\s*présent$', caseSensitive: false);

    for (final e in experiences) {
      final debut = (e['date_debut'] as String?)?.trim() ?? '';
      final fin = (e['date_fin'] as String?)?.trim() ?? '';
      // Au moins une date présente et lisible
      if (debut.isEmpty && fin.isEmpty) return false;
      if (debut.isNotEmpty && !dateRegex.hasMatch(debut) && !dateRegex.hasMatch(fin)) {
        // accepte si l'un des deux matche
        if (fin.isEmpty || !dateRegex.hasMatch(fin)) return false;
      }
    }

    for (final f in formations) {
      final annee = (f['annee'] as String?)?.trim() ?? '';
      if (annee.isEmpty) return false;
      if (!dateRegex.hasMatch(annee)) return false;
    }

    return true;
  }

  /// Estime si le CV tient en ≤ 2 pages (1 page pour Stage).
  /// Heuristique basée sur le volume de contenu (sans générer le PDF).
  bool _pagesEstimeesOk(
    Cv cv,
    List<Map<String, dynamic>> experiences,
    List<Map<String, dynamic>> formations,
  ) {
    // Template Stage force 1 page → toujours OK (le template gère la contrainte)
    if (cv.templateId == 6) return true;

    final competences = _getStringList(cv, SectionType.competence);
    final langues = _getList(cv, SectionType.langue);
    final perso = cv.getSection(SectionType.perso)?.donnees ?? {};
    final resume = (perso['resume'] as String?) ?? '';

    // Estimation grossière du nombre de "blocs" de contenu
    int blocs = experiences.length + formations.length;
    // Compétences/langues ne prennent pas beaucoup de place
    // Résumé long ajoute une demi-page
    if (resume.length > 400) blocs += 1;
    // Descriptions d'expériences longues
    for (final e in experiences) {
      final desc = (e['description'] as String?) ?? '';
      if (desc.length > 200) blocs += 1;
    }

    // Heuristique : au-delà de ~10 blocs → risque > 2 pages
    // Template Académique (id=5) tolère plus (section publications détaillée)
    final limite = cv.templateId == 5 ? 14 : 10;
    return blocs <= limite;
  }

  List<Map<String, dynamic>> _getList(Cv cv, SectionType type) {
    final section = cv.getSection(type);
    return List<Map<String, dynamic>>.from(
      (section?.donnees['items'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [],
    );
  }

  List<String> _getStringList(Cv cv, SectionType type) {
    final section = cv.getSection(type);
    return List<String>.from(
      (section?.donnees['items'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }
}