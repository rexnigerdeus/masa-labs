/// Modèle pour les articles édifiants (Vitae)
library;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Catégories d'articles
enum ResourceCategory {
  rechercheEmploi,
  reseauage,
  relationsPro,
  marcheTravail,
  droitTravail;

  String get label {
    switch (this) {
      case ResourceCategory.rechercheEmploi:
        return 'Recherche d\'emploi';
      case ResourceCategory.reseauage:
        return 'Réseautage';
      case ResourceCategory.relationsPro:
        return 'Relations professionnelles';
      case ResourceCategory.marcheTravail:
        return 'Marché du travail';
      case ResourceCategory.droitTravail:
        return 'Droit du travail (CI)';
    }
  }

  /// Icône Lucide correspondante — constante, compatible tree-shaking web.
  IconData get icon {
    switch (this) {
      case ResourceCategory.rechercheEmploi:
        return LucideIcons.search;
      case ResourceCategory.reseauage:
        return LucideIcons.users;
      case ResourceCategory.relationsPro:
        return LucideIcons.handshake;
      case ResourceCategory.marcheTravail:
        return LucideIcons.briefcase;
      case ResourceCategory.droitTravail:
        return LucideIcons.scale;
    }
  }

  static ResourceCategory fromString(String? value) {
    return ResourceCategory.values.firstWhere(
      (e) => e.name == value,
      orElse: () => ResourceCategory.rechercheEmploi,
    );
  }
}

/// Un article édifiant
class Resource {
  final String? id;
  final ResourceCategory category;
  final String title;
  final String excerpt;
  final String content;
  final String? author;
  final int? readTimeMinutes;
  final DateTime? publishedAt;
  final String? sourceUrl;

  Resource({
    this.id,
    required this.category,
    required this.title,
    required this.excerpt,
    required this.content,
    this.author,
    this.readTimeMinutes,
    this.publishedAt,
    this.sourceUrl,
  });

  factory Resource.fromJson(Map<String, dynamic> json) {
    return Resource(
      id: json['id'] as String?,
      category: ResourceCategory.fromString(json['category'] as String?),
      title: json['title'] as String? ?? '',
      excerpt: json['excerpt'] as String? ?? '',
      content: json['content'] as String? ?? '',
      author: json['author'] as String?,
      readTimeMinutes: json['read_time_minutes'] as int?,
      publishedAt: json['published_at'] != null
          ? DateTime.parse(json['published_at'] as String)
          : null,
      sourceUrl: json['source_url'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        'category': category.name,
        'title': title,
        'excerpt': excerpt,
        'content': content,
        if (author != null) 'author': author,
        if (readTimeMinutes != null) 'read_time_minutes': readTimeMinutes,
        if (publishedAt != null) 'published_at': publishedAt!.toIso8601String(),
        if (sourceUrl != null) 'source_url': sourceUrl,
      };
}