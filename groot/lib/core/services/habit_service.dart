import 'dart:async';

import '../models/habit_models.dart';
import '../data/groot_db.dart';
import '../logic/streak_engine.dart';

/// Service central des habitudes : valider, geler, recenser, débloquer.
///
/// Toute écriture passe par la base locale (offline-first) — la sync
/// Supabase rejoue ensuite les lignes dirty. Les badges se débloquent
/// ici, au moment exact de la validation, avec le décor offert.
class HabitService {
  HabitService(this._db);
  final GrootDb _db;

  /// Stream de rafraîchissement — les écrans s'y abonnent.
  Stream<void> get changes => _db.changes;

  // ==================== Catalogue badges ====================
  // Aligné sur la table groot_badges de la migration lot 1.
  static const List<GrootBadge> badgeCatalog = [
    GrootBadge(
      id: 'premiere-graine',
      label: 'Première graine',
      description: 'Ta première habitude validée. La forêt commence.',
      requiredStreak: 1,
      unlocksDecoration: 'pot-terracotta',
      position: 1,
    ),
    GrootBadge(
      id: 'sept-feuilles',
      label: 'Sept feuilles',
      description: 'Une semaine complète. Groot passe au stade pousse.',
      requiredStreak: 7,
      unlocksDecoration: 'echarpe',
      position: 2,
    ),
    GrootBadge(
      id: 'vingt-un-jours',
      label: 'Trois semaines',
      description: '21 jours de constance — le réflexe est en place.',
      requiredStreak: 21,
      unlocksDecoration: 'pot-ceramique',
      position: 3,
    ),
    GrootBadge(
      id: 'soixante-jours',
      label: 'Deux mois',
      description: '60 jours. Groot devient un jeune arbre.',
      requiredStreak: 60,
      unlocksDecoration: 'lanterne',
      position: 4,
    ),
    GrootBadge(
      id: 'cent-jours',
      label: 'Cent jours',
      description: '100 jours de constance. Une branche est apparue.',
      requiredStreak: 100,
      unlocksDecoration: 'lucioles',
      position: 5,
    ),
    GrootBadge(
      id: 'un-an',
      label: 'Une saison entière',
      description: '365 jours. Groot est un arbre ancien, au feuillage doré.',
      requiredStreak: 365,
      unlocksDecoration: 'feuillage-dore',
      position: 6,
    ),
  ];

  // ==================== Lecture ====================

  Future<List<Habit>> activeHabits() => _db.activeHabits();

  Future<Habit?> habit(String clientId) => _db.habitByClientId(clientId);

  Future<Map<String, Set<String>>> entryDateSets() => _db.allEntryDateSets();

  Future<Set<String>> entryDates(String clientHabitId) async {
    final all = await _db.allEntryDateSets();
    return all[clientHabitId] ?? {};
  }

  /// Entrées complètes d'une habitude (notes incluses) — journal
  /// attaché à l'habitude (§6.B.3, écran de détail).
  Future<List<HabitEntry>> entriesForHabit(String clientHabitId) =>
      _db.entriesForHabit(clientHabitId);

  /// Habitudes du jour, groupées par zone (§6.B.1 : Matin, Sport,
  /// Créativité, Soir…), dans l'ordre des zones du design system.
  Future<Map<String, List<Habit>>> todayByZone() async {
    final habits = await activeHabits();
    final now = DateTime.now();
    final byZone = <String, List<Habit>>{};
    for (final h in habits) {
      if (!h.isDueOn(DateTime(now.year, now.month, now.day))) continue;
      (byZone[h.zoneId] ??= []).add(h);
    }
    return byZone;
  }

  /// Badges enrichis de leur état débloqué local.
  Future<List<GrootBadge>> badgesWithState() async {
    final unlocked = await _db.unlockedBadges();
    return badgeCatalog.map((b) {
      final at = unlocked[b.id];
      return at == null ? b : _copyBadge(b, unlockedAt: at);
    }).toList()
      ..sort((a, b) => a.position.compareTo(b.position));
  }

  GrootBadge _copyBadge(GrootBadge b, {DateTime? unlockedAt}) => GrootBadge(
        id: b.id,
        label: b.label,
        description: b.description,
        requiredStreak: b.requiredStreak,
        unlocksDecoration: b.unlocksDecoration,
        unlockedAt: unlockedAt,
        position: b.position,
      );

  // ==================== Écriture ====================

  /// Valide (ou dévalide) une habitude pour aujourd'hui — swipe/tap de
  /// la boucle quotidienne (§6.B.2). Retourne la liste des badges
  /// nouvellement débloqués pour l'écran de célébration (§7).
  Future<List<GrootBadge>> toggleToday(Habit habit) async {
    final today = DateTime.now();
    final todayDate = DateTime(today.year, today.month, today.day);
    final dates = await entryDates(habit.clientId);
    final key = _dayKey(todayDate);

    if (dates.contains(key)) {
      // Dévalidation (tap sur une carte déjà validée) : on retire
      // l'entrée — jamais de "raté" enregistré, juste l'absence.
      await _db.deleteEntry(habit.clientId, todayDate);
    } else {
      await _db.insertEntry(
        HabitEntry(clientHabitId: habit.clientId, date: todayDate),
      );
    }

    // Recalcul du streak après l'écriture.
    final freshDates = await entryDates(habit.clientId);
    final streaks = StreakEngine.recomputeStreaks(
      habit: habit,
      entryDates: freshDates,
      previousBest: habit.bestStreak,
    );
    habit.currentStreak = streaks.current;
    habit.bestStreak = streaks.best;
    await _db.updateHabit(habit);

    // Déblocage des badges atteints — retourne les nouveaux pour la
    // célébration (§7 : "Une branche est apparue").
    return _unlockReachedBadges(habit.bestStreak);
  }

  Future<List<GrootBadge>> _unlockReachedBadges(int bestStreak) async {
    final unlocked = await _db.unlockedBadges();
    final newly = <GrootBadge>[];
    for (final b in badgeCatalog) {
      if (bestStreak >= b.requiredStreak && !unlocked.containsKey(b.id)) {
        await _db.unlockBadge(b.id);
        newly.add(b);
      }
    }
    return newly;
  }

  /// Crée une habitude — le bouton "Planter" (design system §8 :
  /// "Planter" → confirmation "Graine plantée 🌱", verbes cohérents).
  Future<Habit> plantHabit({
    required String name,
    required HabitFamily family,
    required String zoneId,
    String habitText = '',
    String? timeOfDay,
    String? place,
    List<int> daysOfWeek = const [0, 1, 2, 3, 4, 5, 6],
    String? reminderTime,
  }) async {
    final habit = Habit(
      clientId: _newClientId(),
      name: name,
      family: family,
      zoneId: zoneId,
      habitText: habitText,
      timeOfDay: timeOfDay,
      place: place,
      daysOfWeek: daysOfWeek,
      reminderTime: reminderTime,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      dirty: true,
    );
    await _db.insertHabit(habit);
    return habit;
  }

  String _newClientId() {
    // Identifiant client immuable : timestamp + compteur aléatoire.
    final ts = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
    final rnd = DateTime.now().hashCode.toRadixString(36);
    return 'g_$ts$rnd';
  }

  /// Gèle/dégèle une habitude (mode pause façon vacances, §6.C).
  Future<void> toggleFreeze(Habit habit) async {
    habit.frozen = !habit.frozen;
    await _db.updateHabit(habit);
  }

  /// Archive douce — l'historique reste consultable (jamais de
  /// suppression brutale demandée à l'utilisateur).
  Future<void> archiveHabit(Habit habit) async {
    habit.archived = true;
    await _db.updateHabit(habit);
  }

  Future<void> softDeleteHabit(String clientId) =>
      _db.softDeleteHabit(clientId);

  /// Attache/retire une note de journal au jour validé (§6.B.3).
  Future<void> saveNote({
    required Habit habit,
    required DateTime date,
    required String note,
  }) async {
    final dates = await entryDates(habit.clientId);
    final exists = dates.contains(_dayKey(date));
    final entry = HabitEntry(
      clientHabitId: habit.clientId,
      date: date,
      note: note,
      checkedAt: DateTime.now(),
    );
    entry.dirty = true;
    if (exists) {
      await _db.insertEntry(entry); // replace sur la clé (habit, date)
    } else {
      // Une note sans validation crée l'entrée du jour — façon journal
      // attaché à l'habitude (Habitify, brief §1).
      await _db.insertEntry(entry);
    }
    _db.notify();
  }

  static String _dayKey(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}