import 'package:supabase_flutter/supabase_flutter.dart';

/// Service d'auth pour The Everyday Co. — Groot Habits.
/// Pseudo-email : numéro de téléphone transformé en email (même pattern
/// que vitae/rondo/hive). Aucun email n'est envoyé.
class AuthService {
  final SupabaseClient _client = Supabase.instance.client;

  /// Normalise un numéro de téléphone en pseudo-email
  /// Ex: "07 00 00 00 00" → "0700000000@everyday.co"
  static String phoneToEmail(String phone) {
    final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
    return '$digits@everyday.co';
  }

  /// Inscription avec numéro de téléphone + mot de passe
  Future<AuthResponse> signUp({
    required String phone,
    required String password,
    required String fullName,
  }) async {
    return await _client.auth.signUp(
      email: phoneToEmail(phone),
      password: password,
      data: {
        'full_name': fullName,
        'phone': phone,
      },
    );
  }

  /// Connexion avec numéro de téléphone + mot de passe
  Future<AuthResponse> signIn({
    required String phone,
    required String password,
  }) async {
    return await _client.auth.signInWithPassword(
      email: phoneToEmail(phone),
      password: password,
    );
  }

  Future<void> signOut() => _client.auth.signOut();

  User? get currentUser => _client.auth.currentUser;
  Session? get currentSession => _client.auth.currentSession;
  Stream<AuthState> get authStateStream => _client.auth.onAuthStateChange;
}