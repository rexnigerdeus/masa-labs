import 'package:supabase_flutter/supabase_flutter.dart';

/// Service pour les opérations sur les tontines (Rondo)
class TontineService {
  final SupabaseClient _client = Supabase.instance.client;

  /// Récupère le dashboard admin (mes tontines gérées)
  Future<List<Map<String, dynamic>>> getHomeAdmin() async {
    final response = await _client.rpc('rondo_home_admin');
    return (response as List).cast<Map<String, dynamic>>();
  }

  /// Récupère le dashboard membre (mes tontines rejointes)
  Future<List<Map<String, dynamic>>> getHomeMembre() async {
    final response = await _client.rpc('rondo_home_membre');
    return (response as List).cast<Map<String, dynamic>>();
  }

  /// Crée une nouvelle tontine
  Future<Map<String, dynamic>> createTontine({
    required String name,
    required int mise,
    required String frequence, // 'hebdomadaire' ou 'mensuelle'
    required int nbMembres,
    required DateTime dateDebut,
  }) async {
    final response = await _client.from('rondo_tontines').insert({
      'name': name,
      'admin_id': _client.auth.currentUser!.id,
      'mise': mise,
      'frequence': frequence,
      'nb_membres': nbMembres,
      'date_debut': dateDebut.toIso8601String().split('T')[0],
      'statut': 'en_attente',
    }).select().single();

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

  /// Récupère les membres d'une tontine
  Future<List<Map<String, dynamic>>> getMembres(String tontineId) async {
    final response = await _client
        .from('rondo_membres')
        .select('''
          id,
          ordre_tour,
          statut,
          joined_at,
          user_id,
          profiles!rondo_membres_user_id_fkey(full_name, phone, avatar_url)
        ''')
        .eq('tontine_id', tontineId)
        .order('ordre_tour', ascending: true);

    return (response as List).cast<Map<String, dynamic>>();
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

  /// Récupère les tours d'une tontine
  Future<List<Map<String, dynamic>>> getTours(String tontineId) async {
    final response = await _client
        .from('rondo_tours')
        .select()
        .eq('tontine_id', tontineId)
        .order('numero', ascending: true);

    return (response as List).cast<Map<String, dynamic>>();
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