import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'data/groot_db.dart';
import 'data/sync_service.dart';
import 'logic/streak_engine.dart';
import 'models/habit_models.dart';
import 'services/auth_service.dart';
import 'services/habit_service.dart';
import 'services/reminder_service.dart';

// ==================== Singletons ====================

final dbProvider = Provider<GrootDb>((ref) {
  final db = GrootDb();
  ref.onDispose(db.close);
  return db;
});

final authServiceProvider = Provider<AuthService>((ref) => AuthService());

final habitServiceProvider = Provider<HabitService>(
  (ref) => HabitService(ref.watch(dbProvider)),
);

final syncServiceProvider = Provider<SyncService>(
  (ref) => SyncService(ref.watch(dbProvider)),
);

final reminderServiceProvider = Provider<ReminderService>(
  (ref) => ReminderService(),
);

// ==================== Auth ====================

/// État d'authentification réactif — redirige le router.
final authStateProvider = StreamProvider<AuthState>(
  (ref) => ref.watch(authServiceProvider).authStateStream,
);

/// Utilisateur courant, null si déconnecté.
final currentUserProvider = Provider<User?>(
  (ref) => ref.watch(authStateProvider).value?.session?.user ??
      Supabase.instance.client.auth.currentUser,
);

// ==================== Profil Groot ====================

/// Profil Groot de l'utilisateur, persisté en SharedPreferences pour
/// un accès instantané hors-ligne, poussé vers Supabase à chaque save.
///
/// Riverpod 3.x : `Notifier` moderne — plus de StateNotifier legacy.
class GrootProfileNotifier extends Notifier<GrootProfile?> {
  static const _prefsKey = 'groot_profile_v1';
  static const _onboardedKey = 'groot_onboarded_v1';

  @override
  GrootProfile? build() {
    _load();
    return null;
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final userId = ref.read(currentUserProvider)?.id;
    if (userId == null) {
      final onboarded = prefs.getBool(_onboardedKey) ?? false;
      if (onboarded) {
        // Hors-ligne après onboarding : on garde une copie locale.
        final raw = prefs.getString(_prefsKey);
        if (raw != null) state = _deserialize(raw, 'local');
      }
      return;
    }
    // D'abord la copie locale (affichage instantané), puis le distant.
    final raw = prefs.getString(_prefsKey);
    if (raw != null) state = _deserialize(raw, userId);
    try {
      final remote = await ref.read(syncServiceProvider).pullProfile();
      if (remote != null) {
        state = remote;
        await _persistLocal(remote);
      }
    } catch (_) {
      // Hors-ligne : la copie locale suffit (offline-first).
    }
  }

  Future<void> completeOnboarding({
    required List<String> identities,
    required List<String> families,
  }) async {
    final userId = ref.read(currentUserProvider)?.id ?? 'local';
    state = GrootProfile(
      userId: userId,
      identities: identities,
      families: families,
      onboardingCompleted: true,
    );
    await _save();
  }

  Future<void> addDecoration(String decoration) async {
    if (state == null) return;
    if (state!.decorations.contains(decoration)) return;
    state = GrootProfile(
      userId: state!.userId,
      identities: state!.identities,
      families: state!.families,
      mascotStage: state!.mascotStage,
      decorations: [...state!.decorations, decoration],
      onboardingCompleted: true,
    );
    await _save();
  }

  Future<void> setMascotStage(MascotStage stage) async {
    if (state == null || state!.mascotStage == stage) return;
    state = GrootProfile(
      userId: state!.userId,
      identities: state!.identities,
      families: state!.families,
      mascotStage: stage,
      decorations: state!.decorations,
      onboardingCompleted: true,
    );
    await _save();
  }

  Future<void> _save() async {
    if (state == null) return;
    await _persistLocal(state!);
    try {
      await ref.read(syncServiceProvider).pushProfile(state!);
    } catch (_) {
      // Hors-ligne : la sync poussera le profil au prochain passage.
    }
  }

  Future<void> _persistLocal(GrootProfile profile) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, _serialize(profile));
    await prefs.setBool(_onboardedKey, true);
  }

  Future<void> reset() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_prefsKey);
    await prefs.remove(_onboardedKey);
    state = null;
  }

  String _serialize(GrootProfile p) => [
        p.identities.join(','),
        p.families.join(','),
        p.mascotStage.id,
        p.decorations.join(','),
      ].join('|');

  GrootProfile _deserialize(String raw, String userId) {
    final parts = raw.split('|');
    return GrootProfile(
      userId: userId,
      identities: parts.isNotEmpty && parts[0].isNotEmpty
          ? parts[0].split(',')
          : [],
      families: parts.length > 1 && parts[1].isNotEmpty
          ? parts[1].split(',')
          : [],
      mascotStage: parts.length > 2
          ? MascotStage.fromId(parts[2])
          : MascotStage.graine,
      decorations: parts.length > 3 && parts[3].isNotEmpty
          ? parts[3].split(',')
          : [],
      onboardingCompleted: true,
    );
  }
}

final grootProfileProvider =
    NotifierProvider<GrootProfileNotifier, GrootProfile?>(
  GrootProfileNotifier.new,
);

// ==================== Habitudes ====================

/// Toutes les habitudes actives, rafraîchies à chaque écriture locale.
/// La base locale est la source de vérité du quotidien (offline-first).
class HabitsNotifier extends StreamNotifier<List<Habit>> {
  @override
  Stream<List<Habit>> build() {
    final service = ref.watch(habitServiceProvider);
    return service.changes.asyncMap((_) => service.activeHabits());
  }
}

final habitsProvider =
    StreamNotifierProvider<HabitsNotifier, List<Habit>>(
  HabitsNotifier.new,
);

/// Habitudes du jour groupées par zone (§6.B.1).
final todayByZoneProvider = StreamProvider<Map<String, List<Habit>>>(
  (ref) => ref
      .watch(habitServiceProvider)
      .changes
      .asyncMap((_) => ref.read(habitServiceProvider).todayByZone()),
);

/// Dates d'entrées validées par habitude (pour les cartes du jour).
final entryDatesProvider = StreamProvider<Map<String, Set<String>>>(
  (ref) => ref
      .watch(habitServiceProvider)
      .changes
      .asyncMap((_) => ref.read(habitServiceProvider).entryDateSets()),
);

/// Badges enrichis de l'état débloqué.
final badgesProvider = StreamProvider<List<GrootBadge>>(
  (ref) => ref
      .watch(habitServiceProvider)
      .changes
      .asyncMap((_) => ref.read(habitServiceProvider).badgesWithState()),
);

/// Stade de la mascotte déduit de la constance réelle (§3).
final mascotStageProvider = Provider<MascotStage>((ref) {
  final habits = ref.watch(habitsProvider).value ?? [];
  return StreakEngine.mascotStageFor(habits);
});

// ==================== Sync ====================

/// Sync au démarrage + à chaque reconnexion.
final autoSyncProvider = Provider<SyncService>((ref) {
  final sync = ref.watch(syncServiceProvider);
  ref.onDispose(sync.dispose);
  sync.startAutoSync();
  return sync;
});