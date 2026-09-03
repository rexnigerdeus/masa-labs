/// Modèle pour les offres d'emploi et de stage (Vitae)
library;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Type d'offre
enum JobType {
  emploi,
  stage;

  String get label => this == JobType.emploi ? 'Emploi' : 'Stage';

  static JobType fromString(String? value) {
    return value == 'stage' ? JobType.stage : JobType.emploi;
  }
}

/// Catégories d'offres
enum JobCategory {
  financeComptabilite,
  marketingCommunication,
  informatiqueTech,
  commercialVente,
  administratifRh,
  juridique,
  ingenierieBtp,
  sante,
  educationFormation,
  logistiqueTransport,
  hotellerieRestauration,
  autre;

  String get label {
    switch (this) {
      case JobCategory.financeComptabilite:
        return 'Finance & Comptabilité';
      case JobCategory.marketingCommunication:
        return 'Marketing & Communication';
      case JobCategory.informatiqueTech:
        return 'Informatique & Tech';
      case JobCategory.commercialVente:
        return 'Commercial & Vente';
      case JobCategory.administratifRh:
        return 'Administratif & RH';
      case JobCategory.juridique:
        return 'Juridique';
      case JobCategory.ingenierieBtp:
        return 'Ingénierie & BTP';
      case JobCategory.sante:
        return 'Santé';
      case JobCategory.educationFormation:
        return 'Éducation & Formation';
      case JobCategory.logistiqueTransport:
        return 'Logistique & Transport';
      case JobCategory.hotellerieRestauration:
        return 'Hôtellerie & Restauration';
      case JobCategory.autre:
        return 'Autre';
    }
  }

  /// Icône Lucide correspondante — constante, compatible tree-shaking web.
  IconData get icon {
    switch (this) {
      case JobCategory.financeComptabilite:
        return LucideIcons.calculator;
      case JobCategory.marketingCommunication:
        return LucideIcons.megaphone;
      case JobCategory.informatiqueTech:
        return LucideIcons.code;
      case JobCategory.commercialVente:
        return LucideIcons.shoppingBag;
      case JobCategory.administratifRh:
        return LucideIcons.users;
      case JobCategory.juridique:
        return LucideIcons.scale;
      case JobCategory.ingenierieBtp:
        return LucideIcons.hardHat;
      case JobCategory.sante:
        return LucideIcons.stethoscope;
      case JobCategory.educationFormation:
        return LucideIcons.graduationCap;
      case JobCategory.logistiqueTransport:
        return LucideIcons.truck;
      case JobCategory.hotellerieRestauration:
        return LucideIcons.utensilsCrossed;
      case JobCategory.autre:
        return LucideIcons.briefcase;
    }
  }

  static JobCategory fromString(String? value) {
    return JobCategory.values.firstWhere(
      (e) => e.name == value,
      orElse: () => JobCategory.autre,
    );
  }
}

/// Une offre d'emploi ou de stage
class JobOffer {
  final String? id;
  final JobType type;
  final JobCategory category;
  final String title;
  final String company;
  final String? location;
  final String? description;
  final String? requirements;
  final String? contractType; // CDI, CDD, Alternance, Stage...
  final String? salaryRange;
  final DateTime? postedAt;
  final DateTime? deadline;
  final String applyUrl;
  final String? contactEmail;
  final bool isRemote;

  JobOffer({
    this.id,
    required this.type,
    required this.category,
    required this.title,
    required this.company,
    this.location,
    this.description,
    this.requirements,
    this.contractType,
    this.salaryRange,
    this.postedAt,
    this.deadline,
    required this.applyUrl,
    this.contactEmail,
    this.isRemote = false,
  });

  factory JobOffer.fromJson(Map<String, dynamic> json) {
    return JobOffer(
      id: json['id'] as String?,
      type: JobType.fromString(json['type'] as String?),
      category: JobCategory.fromString(json['category'] as String?),
      title: json['title'] as String? ?? '',
      company: json['company'] as String? ?? '',
      location: json['location'] as String?,
      description: json['description'] as String?,
      requirements: json['requirements'] as String?,
      contractType: json['contract_type'] as String?,
      salaryRange: json['salary_range'] as String?,
      postedAt: json['posted_at'] != null
          ? DateTime.parse(json['posted_at'] as String)
          : null,
      deadline: json['deadline'] != null
          ? DateTime.parse(json['deadline'] as String)
          : null,
      applyUrl: json['apply_url'] as String? ?? '',
      contactEmail: json['contact_email'] as String?,
      isRemote: json['is_remote'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        'type': type.name,
        'category': category.name,
        'title': title,
        'company': company,
        if (location != null) 'location': location,
        if (description != null) 'description': description,
        if (requirements != null) 'requirements': requirements,
        if (contractType != null) 'contract_type': contractType,
        if (salaryRange != null) 'salary_range': salaryRange,
        if (postedAt != null) 'posted_at': postedAt!.toIso8601String(),
        if (deadline != null) 'deadline': deadline!.toIso8601String(),
        'apply_url': applyUrl,
        if (contactEmail != null) 'contact_email': contactEmail,
        'is_remote': isRemote,
      };

  /// Date relative lisible ("Il y a 2 jours", "Aujourd'hui")
  String get postedAgo {
    if (postedAt == null) return '';
    final diff = DateTime.now().difference(postedAt!);
    if (diff.inHours < 24) return 'Aujourd\'hui';
    if (diff.inDays == 1) return 'Hier';
    if (diff.inDays < 30) return 'Il y a ${diff.inDays} jours';
    if (diff.inDays < 60) return 'Il y a 1 mois';
    return 'Il y a ${(diff.inDays / 30).floor()} mois';
  }

  /// L'offre est-elle encore ouverte (deadline non dépassée) ?
  bool get isOpen {
    if (deadline == null) return true;
    return deadline!.isAfter(DateTime.now());
  }
}