import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/phone_formatter.dart';

/// Service d'auth pour The Everyday Co.
/// Utilise le pseudo-email : numéro de téléphone transformé en email
/// Ex: "07 00 00 00 00" → "0700000000@everyday.co"
/// Aucun email n'est envoyé — c'est juste un identifiant pour Supabase Auth.
class AuthService {
  final SupabaseClient _client = Supabase.instance.client;

  /// Normalise un numéro de téléphone en pseudo-email
  static String phoneToEmail(String phone) {
    final cleanPhoneStr = cleanPhone(phone);
    return '$cleanPhoneStr@everyday.co';
  }

  /// Inscription avec numéro de téléphone + mot de passe
  Future<AuthResponse> signUp({
    required String phone,
    required String password,
    required String fullName,
  }) async {
    final email = phoneToEmail(phone);

    return await _client.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': fullName, 'phone': phone},
    );
  }

  /// Connexion avec numéro de téléphone + mot de passe
  Future<AuthResponse> signIn({
    required String phone,
    required String password,
  }) async {
    final email = phoneToEmail(phone);

    return await _client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  /// Déconnexion
  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  /// Utilisateur actuel
  User? get currentUser => _client.auth.currentUser;

  /// Session actuelle
  Session? get currentSession => _client.auth.currentSession;

  /// Stream d'état d'auth
  Stream<AuthState> get authStateStream => _client.auth.onAuthStateChange;
}