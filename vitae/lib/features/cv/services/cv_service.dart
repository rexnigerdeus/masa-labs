import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/cv_model.dart';

/// Service pour les opérations sur les CVs (Vitae)
class CvService {
  final SupabaseClient _client = Supabase.instance.client;

  /// Récupère tous les CVs de l'utilisateur connecté
  Future<List<Cv>> getMyCvs() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return [];

    final response = await _client
        .from('vitae_cvs')
        .select()
        .eq('user_id', userId)
        .order('updated_at', ascending: false);

    return (response as List).map((e) => Cv.fromJson(e)).toList();
  }

  /// Récupère un CV complet avec ses sections
  Future<Cv> getFullCv(String cvId) async {
    final response = await _client.rpc('vitae_get_full_cv', params: {'p_cv_id': cvId});
    final data = response as Map<String, dynamic>;
    final userId = _client.auth.currentUser!.id;
    return Cv(
      id: data['id'] as String?,
      userId: userId,
      titre: data['titre'] as String? ?? 'Mon CV',
      templateId: data['template_id'] as int? ?? 1,
      couleurPrincipale: data['couleur_principale'] as String? ?? '#3F6E91',
      objectif: data['objectif'] as String?,
      statut: data['statut'] as String? ?? 'brouillon',
      sections: (data['sections'] as List<dynamic>? ?? [])
          .map((s) => CvSection.fromJson(s as Map<String, dynamic>))
          .toList(),
    );
  }

  /// Crée un nouveau CV
  Future<String> createCv({
    required String titre,
    int templateId = 1,
    String couleurPrincipale = '#3F6E91',
    String? objectif,
  }) async {
    final userId = _client.auth.currentUser!.id;

    final response = await _client.from('vitae_cvs').insert({
      'user_id': userId,
      'titre': titre,
      'template_id': templateId,
      'couleur_principale': couleurPrincipale,
      'objectif': objectif,
      'statut': 'brouillon',
    }).select().single();

    final cvId = response['id'] as String;

    // Créer les sections par défaut (vides)
    final defaultSections = [
      {'type': 'perso', 'ordre': 0, 'donnees': {}},
      {'type': 'experience', 'ordre': 1, 'donnees': {'items': []}},
      {'type': 'formation', 'ordre': 2, 'donnees': {'items': []}},
      {'type': 'competence', 'ordre': 3, 'donnees': {'items': []}},
      {'type': 'langue', 'ordre': 4, 'donnees': {'items': []}},
      {'type': 'interet', 'ordre': 5, 'donnees': {'items': []}},
    ];

    for (final section in defaultSections) {
      await _client.from('vitae_sections').insert({
        'cv_id': cvId,
        'type': section['type'],
        'ordre': section['ordre'],
        'donnees': section['donnees'],
      });
    }

    return cvId;
  }

  /// Met à jour le titre, template, couleur ou statut d'un CV
  Future<void> updateCv({
    required String cvId,
    String? titre,
    int? templateId,
    String? couleurPrincipale,
    String? statut,
  }) async {
    final updates = <String, dynamic>{};
    if (titre != null) updates['titre'] = titre;
    if (templateId != null) updates['template_id'] = templateId;
    if (couleurPrincipale != null) updates['couleur_principale'] = couleurPrincipale;
    if (statut != null) updates['statut'] = statut;

    if (updates.isEmpty) return;

    await _client.from('vitae_cvs').update(updates).eq('id', cvId);
  }

  /// Sauvegarde une section de CV (crée ou met à jour)
  Future<void> saveSection({
    required String cvId,
    required SectionType type,
    required Map<String, dynamic> donnees,
  }) async {
    // Chercher si la section existe déjà
    final existing = await _client
        .from('vitae_sections')
        .select('id')
        .eq('cv_id', cvId)
        .eq('type', type.name)
        .maybeSingle();

    if (existing != null) {
      // Mettre à jour
      await _client
          .from('vitae_sections')
          .update({'donnees': donnees})
          .eq('id', existing['id']);
    } else {
      // Créer
      await _client.from('vitae_sections').insert({
        'cv_id': cvId,
        'type': type.name,
        'ordre': type.index,
        'donnees': donnees,
      });
    }
  }

  /// Duplique un CV existant
  Future<String> duplicateCv(String cvId) async {
    final newId = await _client.rpc('vitae_duplicate_cv', params: {'p_cv_id': cvId});
    return newId as String;
  }

  /// Supprime un CV
  Future<void> deleteCv(String cvId) async {
    await _client.from('vitae_cvs').delete().eq('id', cvId);
  }

  /// Enregistre un export dans l'historique
  Future<void> logExport({
    required String cvId,
    required String type, // 'pdf' ou 'partage'
  }) async {
    final userId = _client.auth.currentUser!.id;
    await _client.from('vitae_exports').insert({
      'cv_id': cvId,
      'user_id': userId,
      'type': type,
    });
  }

  /// Récupère les templates disponibles
  Future<List<CvTemplate>> getTemplates() async {
    try {
      final response = await _client.from('vitae_templates').select().order('id');
      return (response as List).map((e) => CvTemplate.fromJson(e)).toList();
    } catch (e) {
      debugPrint('[Vitae] getTemplates fallback: $e');
      return fallbackTemplates;
    }
  }
}