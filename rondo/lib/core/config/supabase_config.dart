/// Configuration Supabase pour The Everyday Co. — Rondo
class SupabaseConfig {
  // TODO: Remplacer par les vraies clés après création du projet Supabase
  static const String supabaseUrl = 'https://VOTRE_PROJET.supabase.co';
  static const String supabaseAnonKey = 'VOTRE_ANON_KEY';

  // Edge Functions
  static const String functionSendOtp = 'send-whatsapp-otp';
  static const String functionVerifyOtp = 'verify-whatsapp-otp';
}