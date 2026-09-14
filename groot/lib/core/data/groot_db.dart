import 'dart:async';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

import '../models/habit_models.dart';

/// Base locale sqflite — la source de vérité du quotidien (offline-first).
///
/// Chaque ligne porte un `client_id` immuable et des horodatages de sync
/// (`synced_at`, `deleted_at`, `dirty`) : les écritures hors-ligne se
/// rejouent dans l'ordre au retour du réseau, vers Supabase.
class GrootDb {
  static const String _dbName = 'groot.db';
  static const int _dbVersion = 1;

  Database? _db;
  final StreamController<void> _changes =
      StreamController<void>.broadcast();

  /// Stream notifiant chaque écriture — les providers Riverpod
  /// s'y abonnent pour rafraîchir les écrans automatiquement.
  Stream<void> get changes => _changes.stream;

  Future<Database> get database async {
    _db ??= await _open();
    return _db!;
  }

  Future<Database> _open() async {
    final String path;
    if (kIsWeb) {
      // Backend WASM : la base vit dans l'indexeddb du navigateur — un
      // simple nom, pas un chemin de fichiers (qui n'existe pas en web).
      path = _dbName;
    } else {
      final dir = await getApplicationDocumentsDirectory();
      path = p.join(dir.path, _dbName);
    }
    return openDatabase(
      path,
      version: _dbVersion,
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      create table habits (
        client_id text primary key,
        server_id text,
        name text not null,
        family text not null,
        zone_id text not null default 'libre',
        habit_text text not null default '',
        time_of_day text,
        place text,
        days_of_week text not null default '0,1,2,3,4,5,6',
        reminder_time text,
        frozen integer not null default 0,
        archived integer not null default 0,
        current_streak integer not null default 0,
        best_streak integer not null default 0,
        created_at text,
        updated_at text,
        synced_at text,
        deleted_at text,
        dirty integer not null default 1
      )
    ''');
    await db.execute('''
      create table entries (
        client_habit_id text not null,
        entry_date text not null,
        note text not null default '',
        checked_at text not null,
        synced_at text not null,
        server_id text,
        dirty integer not null default 1,
        primary key (client_habit_id, entry_date)
      )
    ''');
    await db.execute(
      'create index idx_entries_date on entries(entry_date desc)',
    );
    await db.execute('''
      create table badges (
        badge_id text not null,
        unlocked_at text not null,
        dirty integer not null default 1,
        primary key (badge_id)
      )
    ''');
  }

  // ==================== HABITUDES ====================

  Future<void> insertHabit(Habit habit) async {
    final db = await database;
    await db.insert('habits', _habitToRow(habit),
        conflictAlgorithm: ConflictAlgorithm.replace);
    _changes.add(null);
  }

  Future<void> updateHabit(Habit habit) async {
    final db = await database;
    habit.dirty = true;
    habit.updatedAt = DateTime.now();
    await db.update(
      'habits',
      _habitToRow(habit),
      where: 'client_id = ?',
      whereArgs: [habit.clientId],
    );
    _changes.add(null);
  }

  /// Suppression douce : marquée `deleted_at`, propagée à la sync puis
  /// purgée localement. L'historique reste consultable jusqu'à la purge.
  Future<void> softDeleteHabit(String clientId) async {
    final db = await database;
    final now = _iso(DateTime.now());
    await db.update(
      'habits',
      {'deleted_at': now, 'dirty': 1, 'updated_at': now},
      where: 'client_id = ?',
      whereArgs: [clientId],
    );
    _changes.add(null);
  }

  Future<List<Habit>> activeHabits() async {
    final db = await database;
    final rows = await db.query(
      'habits',
      where: 'deleted_at is null and archived = 0',
    );
    return rows.map(_habitFromRow).toList();
  }

  Future<Habit?> habitByClientId(String clientId) async {
    final db = await database;
    final rows = await db.query(
      'habits',
      where: 'client_id = ?',
      whereArgs: [clientId],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return _habitFromRow(rows.first);
  }

  Future<List<Habit>> dirtyHabits() async {
    final db = await database;
    final rows = await db.query('habits', where: 'dirty = 1');
    return rows.map(_habitFromRow).toList();
  }

  /// Marque une habitude synchronisée (server_id attribué, propre).
  Future<void> markHabitSynced(
    String clientId,
    String serverId,
    DateTime syncedAt,
  ) async {
    final db = await database;
    await db.update(
      'habits',
      {
        'server_id': serverId,
        'synced_at': _iso(syncedAt),
        'dirty': 0,
      },
      where: 'client_id = ?',
      whereArgs: [clientId],
    );
  }

  /// Remplace/upsert une habitude reçue du serveur (pull) — ne marque
  /// jamais dirty, la ligne est propre par définition.
  Future<void> upsertHabitFromServer(Habit habit) async {
    final db = await database;
    habit.dirty = false;
    await db.insert('habits', _habitToRow(habit),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  /// Purge définitive locale après confirmation que la suppression est
  /// propagée côté serveur.
  Future<void> purgeDeletedHabit(String clientId) async {
    final db = await database;
    await db.delete('habits', where: 'client_id = ?', whereArgs: [clientId]);
    await db.delete(
      'entries',
      where: 'client_habit_id = ?',
      whereArgs: [clientId],
    );
    _changes.add(null);
  }

  // ==================== ENTRÉES ====================

  Future<void> insertEntry(HabitEntry entry) async {
    final db = await database;
    await db.insert(
      'entries',
      _entryToRow(entry),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    _changes.add(null);
  }

  Future<void> deleteEntry(String clientHabitId, DateTime date) async {
    final db = await database;
    await db.delete(
      'entries',
      where: 'client_habit_id = ? and entry_date = ?',
      whereArgs: [clientHabitId, _dayKey(date)],
    );
    _changes.add(null);
  }

  Future<List<HabitEntry>> entriesForHabit(String clientHabitId) async {
    final db = await database;
    final rows = await db.query(
      'entries',
      where: 'client_habit_id = ?',
      whereArgs: [clientHabitId],
      orderBy: 'entry_date desc',
    );
    return rows.map(_entryFromRow).toList();
  }

  /// Toutes les entrées, groupées par habitude — pour les stats globales.
  Future<Map<String, Set<String>>> allEntryDateSets() async {
    final db = await database;
    final rows = await db.query('entries', columns: [
      'client_habit_id',
      'entry_date',
    ]);
    final map = <String, Set<String>>{};
    for (final r in rows) {
      (map[r['client_habit_id'] as String] ??= {})
          .add(r['entry_date'] as String);
    }
    return map;
  }

  Future<List<HabitEntry>> dirtyEntries() async {
    final db = await database;
    final rows = await db.query('entries', where: 'dirty = 1');
    return rows.map(_entryFromRow).toList();
  }

  Future<void> markEntrySynced(
    String clientHabitId,
    String dateKey,
    String serverId,
  ) async {
    final db = await database;
    await db.update(
      'entries',
      {'server_id': serverId, 'dirty': 0, 'synced_at': _iso(DateTime.now())},
      where: 'client_habit_id = ? and entry_date = ?',
      whereArgs: [clientHabitId, dateKey],
    );
  }

  Future<void> upsertEntryFromServer(HabitEntry entry) async {
    final db = await database;
    final row = _entryToRow(entry);
    row['dirty'] = 0;
    await db.insert('entries', row,
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  // ==================== BADGES ====================

  Future<void> unlockBadge(String badgeId) async {
    final db = await database;
    await db.insert(
      'badges',
      {
        'badge_id': badgeId,
        'unlocked_at': _iso(DateTime.now()),
        'dirty': 1,
      },
      conflictAlgorithm: ConflictAlgorithm.ignore,
    );
    _changes.add(null);
  }

  Future<Map<String, DateTime>> unlockedBadges() async {
    final db = await database;
    final rows = await db.query('badges');
    return {
      for (final r in rows)
        r['badge_id'] as String: DateTime.parse(r['unlocked_at'] as String),
    };
  }

  Future<List<String>> dirtyBadges() async {
    final db = await database;
    final rows = await db.query('badges', where: 'dirty = 1');
    return [for (final r in rows) r['badge_id'] as String];
  }

  Future<void> markBadgeSynced(String badgeId) async {
    final db = await database;
    await db.update(
      'badges',
      {'dirty': 0},
      where: 'badge_id = ?',
      whereArgs: [badgeId],
    );
  }

  // ==================== Divers ====================

  /// Notifie les abonnés sans écrire — utilisé quand un service veut
  /// forcer le rafraîchissement des écrans après une opération composite.
  void notify() => _changes.add(null);

  /// Ferme la base — utile pour les tests.
  Future<void> close() async {
    await _db?.close();
    _db = null;
  }

  // ==================== Sérialisation ====================

  Map<String, Object?> _habitToRow(Habit h) => {
        'client_id': h.clientId,
        'server_id': h.serverId,
        'name': h.name,
        'family': h.family.id,
        'zone_id': h.zoneId,
        'habit_text': h.habitText,
        'time_of_day': h.timeOfDay,
        'place': h.place,
        'days_of_week': h.daysOfWeek.join(','),
        'reminder_time': h.reminderTime,
        'frozen': h.frozen ? 1 : 0,
        'archived': h.archived ? 1 : 0,
        'current_streak': h.currentStreak,
        'best_streak': h.bestStreak,
        'created_at': h.createdAt != null ? _iso(h.createdAt!) : null,
        'updated_at': h.updatedAt != null ? _iso(h.updatedAt!) : null,
        'synced_at': h.syncedAt != null ? _iso(h.syncedAt!) : null,
        'deleted_at': h.deletedAt != null ? _iso(h.deletedAt!) : null,
        'dirty': h.dirty ? 1 : 0,
      };

  Habit _habitFromRow(Map<String, Object?> r) => Habit(
        clientId: r['client_id'] as String,
        serverId: r['server_id'] as String?,
        name: r['name'] as String,
        family: HabitFamily.fromId(r['family'] as String),
        zoneId: (r['zone_id'] as String?) ?? 'libre',
        habitText: (r['habit_text'] as String?) ?? '',
        timeOfDay: r['time_of_day'] as String?,
        place: r['place'] as String?,
        daysOfWeek: ((r['days_of_week'] as String?) ?? '0,1,2,3,4,5,6')
            .split(',')
            .map(int.parse)
            .toList(),
        reminderTime: r['reminder_time'] as String?,
        frozen: (r['frozen'] as int? ?? 0) == 1,
        archived: (r['archived'] as int? ?? 0) == 1,
        currentStreak: r['current_streak'] as int? ?? 0,
        bestStreak: r['best_streak'] as int? ?? 0,
        createdAt: _parse(r['created_at'] as String?),
        updatedAt: _parse(r['updated_at'] as String?),
        syncedAt: _parse(r['synced_at'] as String?),
        deletedAt: _parse(r['deleted_at'] as String?),
        dirty: (r['dirty'] as int? ?? 0) == 1,
      );

  Map<String, Object?> _entryToRow(HabitEntry e) => {
        'client_habit_id': e.clientHabitId,
        'entry_date': e.dateKey,
        'note': e.note,
        'checked_at': _iso(e.checkedAt),
        'synced_at': _iso(e.syncedAt),
        'server_id': e.serverId,
        'dirty': e.dirty ? 1 : 0,
      };

  HabitEntry _entryFromRow(Map<String, Object?> r) => HabitEntry(
        clientHabitId: r['client_habit_id'] as String,
        date: DateTime.parse(r['entry_date'] as String),
        note: (r['note'] as String?) ?? '',
        checkedAt: DateTime.parse(r['checked_at'] as String),
        syncedAt: DateTime.parse(r['synced_at'] as String),
        serverId: r['server_id'] as String?,
        dirty: (r['dirty'] as int? ?? 0) == 1,
      );

  static String _iso(DateTime d) => d.toIso8601String();
  static DateTime? _parse(String? s) =>
      s == null || s.isEmpty ? null : DateTime.parse(s);
  static String _dayKey(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}