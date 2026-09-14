import '../models/habit_models.dart';

/// Moteur de constance — le cœur métier de Groot.
///
/// Règles issues du brief :
///   - un jour sans validation n'est JAMAIS un échec enregistré (§7) ;
///   - le streak ne casse pas sur un jour non prévu par la fréquence :
///     une habitude "lundi-mercredi-vendredi" garde son streak intact
///     le mardi (principe Streaks/HabitNow, brief §1) ;
///   - le streak casse seulement quand un jour PRÉVU est passé sans
///     validation. Et même là, Groot ne meurt jamais : il perd juste
///     une feuille (§3) — le streak repart à 0, le total cumulé reste.
class StreakEngine {
  /// Calcule le streak courant d'une habitude à partir de ses entrées
  /// validées (dates sans heure), en tenant compte de la fréquence.
  ///
  /// `today` est injectable pour les tests.
  static int currentStreak({
    required Habit habit,
    required Set<String> entryDates,
    DateTime? today,
  }) {
    if (habit.frozen) return habit.currentStreak;
    final now = today ?? DateTime.now();
    final todayDate = DateTime(now.year, now.month, now.day);

    // Aujourd'hui prévu et validé, ou non prévu → on remonte le temps.
    // Aujourd'hui prévu mais pas encore validé → on part d'hier (le
    // jour n'est pas fini, rien n'est cassé).
    var cursor = todayDate;
    if (habit.isDueOn(todayDate) && !entryDates.contains(_key(todayDate))) {
      cursor = todayDate.subtract(const Duration(days: 1));
    }

    int streak = 0;
    // On remonte au plus 400 jours — au-delà, les streaks "annuels"
    // sont gérés par les badges (365 j).
    for (var i = 0; i < 400; i++) {
      if (cursor.isBefore(DateTime(2020))) break;
      final due = habit.isDueOn(cursor);
      if (due && entryDates.contains(_key(cursor))) {
        streak++;
      } else if (due && !entryDates.contains(_key(cursor))) {
        // Jour prévu, non validé, passé → le streak s'arrête ici.
        break;
      }
      // Jour non prévu → on continue de remonter sans rien compter.
      cursor = cursor.subtract(const Duration(days: 1));
    }
    return streak;
  }

  /// Recalcule les streaks d'une habitude après ajout/retrait d'entrées.
  /// Retourne le couple (courant, meilleur) mis à jour.
  static ({int current, int best}) recomputeStreaks({
    required Habit habit,
    required Set<String> entryDates,
    required int previousBest,
    DateTime? today,
  }) {
    final current = currentStreak(
      habit: habit,
      entryDates: entryDates,
      today: today,
    );
    final best = current > previousBest ? current : previousBest;
    return (current: current, best: best);
  }

  /// Streak global de l'utilisateur → stade de la mascotte (§3).
  /// On prend le meilleur streak global (toutes habitudes confondues),
  /// façon "constance réelle" : la créature grandit avec la personne.
  static MascotStage mascotStageFor(List<Habit> habits) {
    var best = 0;
    for (final h in habits) {
      if (h.archived) continue;
      if (h.bestStreak > best) best = h.bestStreak;
    }
    return MascotStage.fromStreak(best);
  }

  /// Taux de constance d'une habitude sur les N derniers jours prévus
  /// (§6.C stats) — nb de jours prévus validés / nb de jours prévus.
  static double consistencyRate({
    required Habit habit,
    required Set<String> entryDates,
    int windowDays = 30,
    DateTime? today,
  }) {
    final now = today ?? DateTime.now();
    var due = 0;
    var done = 0;
    for (var i = 0; i < windowDays; i++) {
      final d = DateTime(now.year, now.month, now.day)
          .subtract(Duration(days: i));
      if (!habit.isDueOn(d)) continue;
      due++;
      if (entryDates.contains(_key(d))) done++;
    }
    return due == 0 ? 0 : done / due;
  }

  /// Jours de la semaine où l'utilisateur est le plus régulier (stats
  /// §6.C "meilleurs jours"). Retourne une map jour → taux.
  static Map<int, double> bestWeekdays({
    required List<Habit> habits,
    required Map<String, Set<String>> entriesByHabit,
    int windowDays = 60,
    DateTime? today,
  }) {
    final now = today ?? DateTime.now();
    final due = List<int>.filled(7, 0);
    final done = List<int>.filled(7, 0);
    for (var i = 0; i < windowDays; i++) {
      final d = DateTime(now.year, now.month, now.day)
          .subtract(Duration(days: i));
      final weekday = d.weekday - 1; // 0 = lundi
      for (final h in habits) {
        if (h.archived || h.frozen) continue;
        if (!h.isDueOn(d)) continue;
        due[weekday]++;
        if (entriesByHabit[h.clientId]?.contains(_key(d)) ?? false) {
          done[weekday]++;
        }
      }
    }
    return {
      for (var i = 0; i < 7; i++)
        i: due[i] == 0 ? 0 : done[i] / due[i],
    };
  }

  static String _key(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}