import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sqflite/sqflite.dart';
import 'package:sqflite_common_ffi_web/sqflite_ffi_web.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/config/supabase_config.dart';
import 'core/providers.dart';
import 'core/router/app_router.dart';
import 'core/theme/groot_theme.dart';
import 'features/settings/screens/settings_screen.dart'
    show themeModeNotifier;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Web : sqflite n'a pas d'implémentation native — on bascule sur le
  // backend officiel WASM (persistance via indexeddb, cross-tab safe).
  if (kIsWeb) {
    databaseFactory = databaseFactoryFfiWeb;
  }

  await Supabase.initialize(
    url: SupabaseConfig.supabaseUrl,
    publishableKey: SupabaseConfig.supabaseAnonKey,
  );

  runApp(const ProviderScope(child: GrootApp()));
}

class GrootApp extends ConsumerWidget {
  const GrootApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(goRouterProvider);

    // Active la sync offline-first dès l'ouverture.
    ref.watch(autoSyncProvider);

    return ValueListenableBuilder<ThemeMode>(
      // Mode sombre "Sous-bois" disponible dès le lancement (§9).
      valueListenable: themeModeNotifier,
      builder: (context, mode, _) => MaterialApp.router(
        title: 'Groot Habits',
        debugShowCheckedModeBanner: false,
        theme: GrootTheme.lightTheme,
        darkTheme: GrootTheme.darkTheme,
        themeMode: mode,
        routerConfig: router,
      ),
    );
  }
}
