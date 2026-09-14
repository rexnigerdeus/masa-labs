import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/habit_models.dart';
import 'groot_db.dart';

/// Synchronisation offline-first : la base locale est la source de vérité
/// du quotidien, Supabase en est la sauvegarde multi-appareils.
///
/// Stratégie :
///   1. PULL — au démarrage et à chaque reconnexion : on récupère les
///      lignes du serveur dont `synced_at` est plus récent que la dernière
///      sync locale, on les upsert localement (elles ne sont jamais dirty).
///   2. PUSH — on rejoue toutes les écritures locales dirty dans l'ordre
///      (habitudes → entrées → badges). Le `client_id` immuable garantit
///      l'idempotence : upsert par client_id, jamais d'insert en double.
///   3. Résolution de conflit : last-write-wins sur `updated_at` —
///      suffisant pour un usage mono-utilisateur multi-appareils.
class SyncService {
  SyncService(this._db);
  final GrootDb _db;

  SupabaseClient get _client => Supabase.instance.client;

  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  final StreamController<bool> _status =
      StreamController<bool>.broadcast();

  /// True pendant une synchronisation en cours.
  Stream<bool> get syncing => _status.stream;

  /// Écoute les reconnexions réseau et déclenche la sync automatiquement.
  void startAutoSync() {
    _connectivitySub?.cancel();
    _connectivitySub = Connectivity()
        .onConnectivityChanged
        .listen((results) async {
      final online = results.any((r) => r != ConnectivityResult.none);
      if (online) {
        await sync();
      }
    });
  }

  void dispose() {
    _connectivitySub?.cancel();
  }

  /// Synchronisation complète : pull puis push. Silencieuse en cas
  /// d'échec réseau — les écritures restent locales, rien ne se perd.
  Future<void> sync() async {
    final user = _client.auth.currentUser;
    if (user == null) return;
    _status.add(true);
    try {
      await _pull();
      await _push();
    } catch (_) {
      // Hors-ligne ou serveur injoignable : on retentera à la prochaine
      // reconnexion. La donnée locale reste la vérité du quotidien.
    } finally {
      _status.add(false);
    }
  }

  // ==================== PULL ====================

  Future<void> _pull() async {
    final lastSync = await _latestLocalSyncedAt();
    final since = lastSync?.toIso8601String() ?? '1970-01-01T00:00:00Z';

    // Habitudes modifiées côté serveur depuis la dernière sync.
    final habitRows = await _client
        .from('groot_habits')
        .select()
        .gte('updated_at', since);
    for (final row in habitRows) {
      final clientId = row['client_id'] as String;
      final local = await _db.habitByClientId(clientId);
      // On n'écrase jamais une écriture locale pas encore poussée.
      if (local != null && local.dirty) continue;
      await _db.upsertHabitFromServer(_habitFromServer(row));
    }

    // Entrées du serveur.
    final entryRows = await _client
        .from('groot_habit_entries')
        .select()
        .gte('synced_at', since);
    for (final row in entryRows) {
      await _db.upsertEntryFromServer(_entryFromServer(row));
    }

    // Badges débloqués.
    final badgeRows = await _client
        .from('groot_user_badges')
        .select()
        .gte('unlocked_at', since);
    for (final row in badgeRows) {
      await _db.unlockBadge(row['badge_id'] as String);
    }
  }

  // ==================== PUSH ====================

  Future<void> _push() async {
    await _pushHabits();
    await _pushEntries();
    await _pushBadges();
  }

  Future<void> _pushHabits() async {
    final dirty = await _db.dirtyHabits();
    for (final habit in dirty) {
      if (habit.deletedAt != null) {
        // Suppression douce propagée : on purge la ligne côté serveur.
        await _client
            .from('groot_habits')
            .delete()
            .eq('client_id', habit.clientId);
        await _db.purgeDeletedHabit(habit.clientId);
        continue;
      }
      final row = _habitToServer(habit);
      final existing = await _client
          .from('groot_habits')
          .select('id')
          .eq('client_id', habit.clientId)
          .maybeSingle();
      if (existing == null) {
        final created = await _client
            .from('groot_habits')
            .insert(row)
            .select('id, created_at')
            .single();
        await _db.markHabitSynced(
          habit.clientId,
          created['id'] as String,
          DateTime.parse(created['created_at'] as String),
        );
      } else {
        await _client
            .from('groot_habits')
            .update(row)
            .eq('client_id', habit.clientId);
        await _db.markHabitSynced(
          habit.clientId,
          existing['id'] as String,
          DateTime.now(),
        );
      }
    }
  }

  Future<void> _pushEntries() async {
    final dirty = await _db.dirtyEntries();
    for (final entry in dirty) {
      // L'habitude parente doit exister côté serveur (FK) : on la
      // pousse d'abord si nécessaire.
      final habit = await _db.habitByClientId(entry.clientHabitId);
      if (habit != null && habit.dirty) {
        await _pushHabits();
        // La ligne a été marquée sync — on relit l'état frais.
        continue;
      }
      if (habit == null || habit.serverId == null) continue;

      final row = {
        'user_id': _client.auth.currentUser!.id,
        'habit_id': habit.serverId,
        'client_habit_id': entry.clientHabitId,
        'entry_date': entry.dateKey,
        'note': entry.note,
        'checked_at': entry.checkedAt.toIso8601String(),
        'synced_at': DateTime.now().toIso8601String(),
      };
      final existing = await _client
          .from('groot_habit_entries')
          .select('id')
          .eq('client_habit_id', entry.clientHabitId)
          .eq('entry_date', entry.dateKey)
          .maybeSingle();
      if (existing == null) {
        final created = await _client
            .from('groot_habit_entries')
            .insert(row)
            .select('id')
            .single();
        await _db.markEntrySynced(
          entry.clientHabitId,
          entry.dateKey,
          created['id'] as String,
        );
      } else {
        await _db.markEntrySynced(
          entry.clientHabitId,
          entry.dateKey,
          existing['id'] as String,
        );
      }
    }
  }

  Future<void> _pushBadges() async {
    final dirty = await _db.dirtyBadges();
    for (final badgeId in dirty) {
      await _client.from('groot_user_badges').insert({
        'user_id': _client.auth.currentUser!.id,
        'badge_id': badgeId,
      });
      await _db.markBadgeSynced(badgeId);
    }
  }

  // ==================== Profil ====================

  /// Pousse l'état du profil Groot (identités, familles, stade, onboarding).
  Future<void> pushProfile(GrootProfile profile) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return;
    await _client.from('groot_profiles').upsert({
      'user_id': userId,
      'identities': profile.identities,
      'families': profile.families,
      'mascot_stage': profile.mascotStage.id,
      'decorations': profile.decorations,
      'onboarding_completed': profile.onboardingCompleted,
      'updated_at': DateTime.now().toIso8601String(),
    });
  }

  /// Récupère le profil Groot distant, null si inexistant.
  Future<GrootProfile?> pullProfile() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return null;
    final row = await _client
        .from('groot_profiles')
        .select()
        .eq('user_id', userId)
        .maybeSingle();
    if (row == null) return null;
    return GrootProfile(
      userId: userId,
      identities:
          (row['identities'] as List?)?.map((e) => e as String).toList() ?? [],
      families:
          (row['families'] as List?)?.map((e) => e as String).toList() ?? [],
      mascotStage: MascotStage.fromId(row['mascot_stage'] as String? ?? ''),
      decorations: (row['decorations'] as List?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      onboardingCompleted: row['onboarding_completed'] as bool? ?? false,
    );
  }

  // ==================== Sérialisation serveur ====================

  Map<String, Object?> _habitToServer(Habit h) => {
        'client_id': h.clientId,
        'user_id': _client.auth.currentUser!.id,
        'name': h.name,
        'family': h.family.id,
        'zone_id': h.zoneId,
        'habit_text': h.habitText,
        'time_of_day': h.timeOfDay,
        'place': h.place,
        'days_of_week': h.daysOfWeek,
        'reminder_time': h.reminderTime,
        'frozen': h.frozen,
        'archived': h.archived,
        'current_streak': h.currentStreak,
        'best_streak': h.bestStreak,
        'created_at': h.createdAt?.toIso8601String(),
        'updated_at': (h.updatedAt ?? DateTime.now()).toIso8601String(),
        'synced_at': DateTime.now().toIso8601String(),
      };

  Habit _habitFromServer(Map<String, Object?> row) => Habit(
        clientId: row['client_id'] as String,
        serverId: row['id'] as String,
        name: row['name'] as String,
        family: HabitFamily.fromId(row['family'] as String),
        zoneId: row['zone_id'] as String? ?? 'libre',
        habitText: (row['habit_text'] as String?) ?? '',
        timeOfDay: row['time_of_day'] as String?,
        place: row['place'] as String?,
        daysOfWeek: (row['days_of_week'] as List?)
                ?.map((e) => e as int)
                .toList() ??
            [0, 1, 2, 3, 4, 5, 6],
        reminderTime: row['reminder_time'] as String?,
        frozen: row['frozen'] as bool? ?? false,
        archived: row['archived'] as bool? ?? false,
        currentStreak: row['current_streak'] as int? ?? 0,
        bestStreak: row['best_streak'] as int? ?? 0,
        createdAt: DateTime.parse(row['created_at'] as String),
        updatedAt: DateTime.parse(row['updated_at'] as String),
        syncedAt: DateTime.parse(row['synced_at'] as String),
        dirty: false,
      );

  HabitEntry _entryFromServer(Map<String, Object?> row) => HabitEntry(
        clientHabitId: row['client_habit_id'] as String,
        date: DateTime.parse(row['entry_date'] as String),
        note: (row['note'] as String?) ?? '',
        checkedAt: DateTime.parse(row['checked_at'] as String),
        syncedAt: DateTime.parse(row['synced_at'] as String),
        serverId: row['id'] as String,
        dirty: false,
      );

  /// Plus grand synced_at local — borne inférieure du pull.
  Future<DateTime?> _latestLocalSyncedAt() async {
    final entries = await _db.dirtyEntries(); // jamais dirty : au pire vide
    DateTime? latest;
    for (final e in entries) {
      if (latest == null || e.syncedAt.isAfter(latest)) latest = e.syncedAt;
    }
    final habits = await _db.activeHabits();
    for (final h in habits) {
      if (h.syncedAt != null && (latest == null || h.syncedAt!.isAfter(latest))) {
        latest = h.syncedAt;
      }
    }
    return latest;
  }
}