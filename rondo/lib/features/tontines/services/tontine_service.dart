import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Service pour les opérations sur les tontines (Rondo)
class TontineService {
  final SupabaseClient _client = Supabase.instance.client;

  /// Récupère le dashboard admin (mes tontines gérées)
  Future<List<Map<String, dynamic>>> getHomeAdmin() async {
    try {
      final userId = _client.auth.currentUser?.id ?? 'null';
      debugPrint('[Rondo] getHomeAdmin userId=$userId');
      final response = await _client.rpc('rondo_home_admin');
      debugPrint('[Rondo] getHomeAdmin OK: ${response.length} tontines');
      return response.cast<Map<String, dynamic>>();
    } catch (e) {
      debugPrint('[Rondo] getHomeAdmin ERREUR: $e');
      rethrow;
    }
  }

  /// Récupère le dashboard membre (mes tontines rejointes)
  Future<List<Map<String, dynamic>>> getHomeMembre() async {
    try {
      final response = await _client.rpc('rondo_home_membre');
      debugPrint('[Rondo] getHomeMembre OK: ${response.length} tontines');
      return response.cast<Map<String, dynamic>>();
    } catch (e) {
      debugPrint('[Rondo] getHomeMembre ERREUR: $e');
      rethrow;
    }
  }

  /// Crée une nouvelle tontine
  Future<Map<String, dynamic>> createTontine({
    required String name,
    required int mise,
    required String frequence, // 'hebdomadaire' ou 'mensuelle'
    required int nbMembres,
    required DateTime dateDebut,
  }) async {
    final userId = _client.auth.currentUser!.id;

    // 1. Créer la tontine
    final response = await _client.from('rondo_tontines').insert({
      'name': name,
      'admin_id': userId,
      'mise': mise,
      'frequence': frequence,
      'nb_membres': nbMembres,
      'date_debut': dateDebut.toIso8601String().split('T')[0],
      'statut': 'en_attente',
    }).select().single();

    final tontineId = response['id'] as String;

    // 2. Ajouter l'admin comme premier membre (ordre 1)
    await _client.from('rondo_membres').insert({
      'tontine_id': tontineId,
      'user_id': userId,
      'ordre_tour': 1,
      'statut': 'actif',
    });

    return response;
  }

  /// Récupère les détails d'une tontine
  Future<Map<String, dynamic>> getTontineDetails(String tontineId) async {
    return await _client
        .from('rondo_tontines')
        .select()
        .eq('id', tontineId)
        .single();
  }

  /// Met à jour une tontine (admin uniquement)
  Future<Map<String, dynamic>> updateTontine({
    required String tontineId,
    String? name,
    int? mise,
    String? frequence,
    int? nbMembres,
    DateTime? dateDebut,
  }) async {
    final updates = <String, dynamic>{};
    if (name != null) updates['name'] = name;
    if (mise != null) updates['mise'] = mise;
    if (frequence != null) updates['frequence'] = frequence;
    if (nbMembres != null) updates['nb_membres'] = nbMembres;
    if (dateDebut != null) {
      updates['date_debut'] = dateDebut.toIso8601String().split('T')[0];
    }

    return await _client
        .from('rondo_tontines')
        .update(updates)
        .eq('id', tontineId)
        .select()
        .single();
  }

  /// Supprime une tontine (admin uniquement, et seulement si aucun tour n'a commencé)
  Future<void> deleteTontine(String tontineId) async {
    await _client.from('rondo_tontines').delete().eq('id', tontineId);
  }

  /// Récupère les membres d'une tontine (avec leurs profils)
  Future<List<Map<String, dynamic>>> getMembres(String tontineId) async {
    // 1. Récupérer les membres
    final membres = await _client
        .from('rondo_membres')
        .select()
        .eq('tontine_id', tontineId)
        .order('ordre_tour', ascending: true);

    final membresList = (membres as List).cast<Map<String, dynamic>>();

    if (membresList.isEmpty) return [];

    // 2. Récupérer les profils correspondants
    final userIds = membresList.map((m) => m['user_id'] as String).toList();
    final profiles = await _client
        .from('profiles')
        .select('id, full_name, phone, avatar_url')
        .inFilter('id', userIds);

    final profilesList = (profiles as List).cast<Map<String, dynamic>>();
    final profilesById = {
      for (final p in profilesList) p['id'] as String: p,
    };

    // 3. Joindre les deux
    return membresList.map((m) {
      final profile = profilesById[m['user_id']];
      return {
        ...m,
        'full_name': profile?['full_name'] as String?,
        'phone': profile?['phone'] as String?,
        'avatar_url': profile?['avatar_url'] as String?,
      };
    }).toList();
  }

  /// Met à jour l'ordre des tours des membres
  Future<void> updateMembreOrdre(String membreId, int ordre) async {
    await _client
        .from('rondo_membres')
        .update({'ordre_tour': ordre})
        .eq('id', membreId);
  }

  /// Exclure un membre
  Future<void> exclureMembre(String membreId) async {
    await _client
        .from('rondo_membres')
        .update({'statut': 'exclu'})
        .eq('id', membreId);
  }

  /// Génère les tours automatiquement
  Future<void> genererTours(String tontineId) async {
    await _client.rpc('rondo_generer_tours', params: {
      'p_tontine_id': tontineId,
    });
  }

  /// Récupère les tours d'une tontine (avec bénéficiaire)
  Future<List<Map<String, dynamic>>> getTours(String tontineId) async {
    // 1. Récupérer les tours
    final tours = await _client
        .from('rondo_tours')
        .select()
        .eq('tontine_id', tontineId)
        .order('numero', ascending: true);

    final toursList = (tours as List).cast<Map<String, dynamic>>();

    if (toursList.isEmpty) return [];

    // 2. Récupérer les bénéficiaires (membres + profils)
    final beneficiaireIds = toursList
        .map((t) => t['beneficiaire_id'] as String?)
        .whereType<String>()
        .toSet()
        .toList();

    Map<String, Map<String, dynamic>> beneficiairesById = {};
    if (beneficiaireIds.isNotEmpty) {
      final membres = await _client
          .from('rondo_membres')
          .select('id, user_id, ordre_tour')
          .inFilter('id', beneficiaireIds);

      final membresList = (membres as List).cast<Map<String, dynamic>>();
      final userIds = membresList.map((m) => m['user_id'] as String).toList();

      if (userIds.isNotEmpty) {
        final profiles = await _client
            .from('profiles')
            .select('id, full_name, phone, avatar_url')
            .inFilter('id', userIds);

        final profilesList = (profiles as List).cast<Map<String, dynamic>>();
        final profilesById = {
          for (final p in profilesList) p['id'] as String: p,
        };

        for (final m in membresList) {
          final profile = profilesById[m['user_id']];
          beneficiairesById[m['id'] as String] = {
            ...m,
            'full_name': profile?['full_name'] as String?,
            'phone': profile?['phone'] as String?,
            'avatar_url': profile?['avatar_url'] as String?,
          };
        }
      }
    }

    // 3. Joindre
    return toursList.map((t) {
      final beneficiaireId = t['beneficiaire_id'] as String?;
      final beneficiaire = beneficiaireId != null
          ? beneficiairesById[beneficiaireId]
          : null;
      return {
        ...t,
        'beneficiaire': beneficiaire,
      };
    }).toList();
  }

  /// Statut des cotisations d'un tour
  Future<List<Map<String, dynamic>>> getStatutTour(String tourId) async {
    final response = await _client.rpc('rondo_statut_tour', params: {
      'p_tour_id': tourId,
    });
    return (response as List).cast<Map<String, dynamic>>();
  }

  /// Cagnotte d'un tour
  Future<int> getCagnotteTour(String tourId) async {
    final response = await _client.rpc('rondo_cagnotte_tour', params: {
      'p_tour_id': tourId,
    });
    return response as int;
  }

  /// Enregistrer un paiement
  Future<void> enregistrerPaiement({
    required String tourId,
    required String membreId,
    required int montant,
    required String mode, // 'especes', 'wave', 'orange_money', 'mtn_money'
    String? note,
  }) async {
    await _client.from('rondo_paiements').insert({
      'tour_id': tourId,
      'membre_id': membreId,
      'montant': montant,
      'mode': mode,
      'note': note,
      'confirmed_by': _client.auth.currentUser!.id,
    });
  }

  /// Historique des paiements d'une tontine
  Future<List<Map<String, dynamic>>> getHistoriquePaiements(
    String tontineId,
  ) async {
    final response = await _client
        .from('rondo_paiements')
        .select('''
          id,
          montant,
          mode,
          note,
          confirmed_at,
          membre_id,
          tour_id,
          rondo_membres!rondo_paiements_membre_id_fkey(
            user_id,
            profiles!rondo_membres_user_id_fkey(full_name)
          )
        ''')
        .inFilter('tour_id',
            (await _client.from('rondo_tours').select('id').eq('tontine_id', tontineId))
                .map((t) => t['id'] as String).toList())
        .order('confirmed_at', ascending: false);

    return (response as List).cast<Map<String, dynamic>>();
  }

  /// Rejoindre une tontine avec un code d'invitation
  Future<String> rejoindreTontine(String code) async {
    final response = await _client.rpc('rondo_rejoindre_tontine', params: {
      'p_code': code,
    });
    return response as String;
  }

  /// Récupère les notifications de l'utilisateur
  Future<List<Map<String, dynamic>>> getNotifications() async {
    final response = await _client
        .from('rondo_notifications')
        .select()
        .eq('user_id', _client.auth.currentUser!.id)
        .order('created_at', ascending: false);

    return (response as List).cast<Map<String, dynamic>>();
  }

  /// Marquer une notification comme lue
  Future<void> marquerNotifLue(String notifId) async {
    await _client
        .from('rondo_notifications')
        .update({'lu': true})
        .eq('id', notifId);
  }

  /// Récupère le profil de l'utilisateur connecté
  Future<Map<String, dynamic>> getMyProfile() async {
    return await _client
        .from('profiles')
        .select()
        .eq('id', _client.auth.currentUser!.id)
        .single();
  }

  /// Met à jour le profil
  Future<void> updateProfile({String? fullName, String? avatarUrl}) async {
    final updates = <String, dynamic>{};
    if (fullName != null) updates['full_name'] = fullName;
    if (avatarUrl != null) updates['avatar_url'] = avatarUrl;

    await _client
        .from('profiles')
        .update(updates)
        .eq('id', _client.auth.currentUser!.id);
  }
}