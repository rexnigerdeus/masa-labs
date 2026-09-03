/// Modèle de données pour un CV Vitae
library;

import 'dart:convert';

/// Types de sections d'un CV
enum SectionType {
  perso,
  experience,
  formation,
  competence,
  langue,
  interet;

  String get label {
    switch (this) {
      case SectionType.perso:
        return 'Informations personnelles';
      case SectionType.experience:
        return 'Expériences';
      case SectionType.formation:
        return 'Formation';
      case SectionType.competence:
        return 'Compétences';
      case SectionType.langue:
        return 'Langues';
      case SectionType.interet:
        return "Centres d'intérêt";
    }
  }
}

/// Une section de CV (perso, experience, formation, etc.)
class CvSection {
  final String? id;
  final String cvId;
  final SectionType type;
  final int ordre;
  final Map<String, dynamic> donnees;

  CvSection({
    this.id,
    required this.cvId,
    required this.type,
    required this.ordre,
    required this.donnees,
  });

  factory CvSection.fromJson(Map<String, dynamic> json) {
    return CvSection(
      id: json['id'] as String?,
      cvId: json['cv_id'] as String? ?? '',
      type: SectionType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => SectionType.perso,
      ),
      ordre: json['ordre'] as int? ?? 0,
      donnees: json['donnees'] is String
          ? jsonDecode(json['donnees'] as String) as Map<String, dynamic>
          : (json['donnees'] as Map<String, dynamic>?) ?? {},
    );
  }

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        'cv_id': cvId,
        'type': type.name,
        'ordre': ordre,
        'donnees': donnees,
      };

  CvSection copyWith({
    String? id,
    String? cvId,
    SectionType? type,
    int? ordre,
    Map<String, dynamic>? donnees,
  }) {
    return CvSection(
      id: id ?? this.id,
      cvId: cvId ?? this.cvId,
      type: type ?? this.type,
      ordre: ordre ?? this.ordre,
      donnees: donnees ?? this.donnees,
    );
  }
}

/// Un CV complet
class Cv {
  final String? id;
  final String userId;
  final String titre;
  final int templateId;
  final String couleurPrincipale;
  final String? objectif;
  final String statut;
  final List<CvSection> sections;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Cv({
    this.id,
    required this.userId,
    required this.titre,
    this.templateId = 1,
    this.couleurPrincipale = '#3F6E91',
    this.objectif,
    this.statut = 'brouillon',
    this.sections = const [],
    this.createdAt,
    this.updatedAt,
  });

  factory Cv.fromJson(Map<String, dynamic> json) {
    final sectionsList = json['sections'] as List<dynamic>? ?? [];
    return Cv(
      id: json['id'] as String?,
      userId: json['user_id'] as String? ?? '',
      titre: json['titre'] as String? ?? 'Mon CV',
      templateId: json['template_id'] as int? ?? 1,
      couleurPrincipale: json['couleur_principale'] as String? ?? '#3F6E91',
      objectif: json['objectif'] as String?,
      statut: json['statut'] as String? ?? 'brouillon',
      sections: sectionsList
          .map((s) => CvSection.fromJson(s as Map<String, dynamic>))
          .toList(),
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        'user_id': userId,
        'titre': titre,
        'template_id': templateId,
        'couleur_principale': couleurPrincipale,
        'objectif': objectif,
        'statut': statut,
      };

  Cv copyWith({
    String? id,
    String? userId,
    String? titre,
    int? templateId,
    String? couleurPrincipale,
    String? objectif,
    String? statut,
    List<CvSection>? sections,
  }) {
    return Cv(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      titre: titre ?? this.titre,
      templateId: templateId ?? this.templateId,
      couleurPrincipale: couleurPrincipale ?? this.couleurPrincipale,
      objectif: objectif ?? this.objectif,
      statut: statut ?? this.statut,
      sections: sections ?? this.sections,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  /// Récupère une section par type
  CvSection? getSection(SectionType type) {
    for (final s in sections) {
      if (s.type == type) return s;
    }
    return null;
  }
}

/// Template de CV
class CvTemplate {
  final int id;
  final String nom;
  final String style;
  final String idealPour;
  final bool disponibleFree;

  const CvTemplate({
    required this.id,
    required this.nom,
    required this.style,
    required this.idealPour,
    required this.disponibleFree,
  });

  factory CvTemplate.fromJson(Map<String, dynamic> json) {
    return CvTemplate(
      id: json['id'] as int,
      nom: json['nom'] as String,
      style: json['style'] as String,
      idealPour: json['ideal_pour'] as String,
      disponibleFree: json['disponible_free'] as bool? ?? false,
    );
  }
}

/// Les 6 templates v1 (en dur pour fallback si Supabase indisponible)
const List<CvTemplate> fallbackTemplates = [
  CvTemplate(
    id: 1,
    nom: 'Classique',
    style: '1 colonne, sobre, noir/blanc',
    idealPour: 'Banque, Droit, Administration publique',
    disponibleFree: true,
  ),
  CvTemplate(
    id: 2,
    nom: 'Moderne',
    style: '2 colonnes, accent couleur',
    idealPour: 'Marketing, Communication, Commercial',
    disponibleFree: false,
  ),
  CvTemplate(
    id: 3,
    nom: 'Élégant',
    style: 'En-tête photo, mise en page premium',
    idealPour: 'Direction, Management, Finance',
    disponibleFree: false,
  ),
  CvTemplate(
    id: 4,
    nom: 'Minimal',
    style: 'Très épuré, beaucoup d\'espace',
    idealPour: 'Design, Tech, Créatif',
    disponibleFree: false,
  ),
  CvTemplate(
    id: 5,
    nom: 'Académique',
    style: 'Détaillé, section publications',
    idealPour: 'Enseignement, Recherche',
    disponibleFree: false,
  ),
  CvTemplate(
    id: 6,
    nom: 'Stage',
    style: 'Court (1 page forcée)',
    idealPour: 'Étudiants, Stagiaires',
    disponibleFree: true,
  ),
];