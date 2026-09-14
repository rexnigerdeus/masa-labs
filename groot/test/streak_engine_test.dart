import 'package:flutter_test/flutter_test.dart';

import 'package:groot/core/logic/streak_engine.dart';
import 'package:groot/core/models/habit_models.dart';

void main() {
  // Fabrique une habitude quotidienne (tous les jours par défaut).
  Habit dailyHabit({
    List<int> days = const [0, 1, 2, 3, 4, 5, 6],
    bool frozen = false,
  }) =>
      Habit(
        clientId: 'test-habit',
        name: 'lire 5 minutes',
        family: HabitFamily.construire,
        zoneId: 'matin',
        daysOfWeek: days,
        frozen: frozen,
      );

  /// Clé de jour locale 'yyyy-MM-dd', comme en base.
  String key(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  group('StreakEngine.currentStreak', () {
    test('zéro sans aucune validation', () {
      final habit = dailyHabit();
      final streak = StreakEngine.currentStreak(
        habit: habit,
        entryDates: {},
        today: DateTime(2026, 9, 14),
      );
      expect(streak, 0);
    });

    test('compte les jours consécutifs validés, jour courant inclus', () {
      final habit = dailyHabit();
      final today = DateTime(2026, 9, 14);
      final entries = {
        for (var i = 0; i < 5; i++)
          key(DateTime(today.year, today.month, today.day - i)): null,
      }.keys.toSet();
      final streak = StreakEngine.currentStreak(
        habit: habit,
        entryDates: entries,
        today: today,
      );
      expect(streak, 5);
    });

    test("aujourd'hui prévu mais non validé ne casse rien — le jour continue",
        () {
      // Le streak s'appuie sur hier : tant que le jour n'est pas fini,
      // rien n'est cassé (brief §7 : jamais de pénalité en cours de journée).
      final habit = dailyHabit();
      final today = DateTime(2026, 9, 14);
      final entries = {
        for (var i = 1; i <= 3; i++)
          key(DateTime(today.year, today.month, today.day - i)): null,
      }.keys.toSet();
      final streak = StreakEngine.currentStreak(
        habit: habit,
        entryDates: entries,
        today: today,
      );
      expect(streak, 3);
    });

    test('un jour prévu manqué hier casse le streak', () {
      final habit = dailyHabit();
      final today = DateTime(2026, 9, 14);
      final entries = {
        key(DateTime(today.year, today.month, today.day - 3)),
        key(DateTime(today.year, today.month, today.day - 4)),
      };
      // -2 et -1 manqués, jour courant non validé (non cassant).
      final streak = StreakEngine.currentStreak(
        habit: habit,
        entryDates: entries,
        today: today,
      );
      expect(streak, 0);
    });

    test('un jour NON prévu ne casse pas le streak (fréquence)', () {
      // Habitude lundi-mercredi-vendredi (0, 2, 4 en ISO 0-6).
      final habit = dailyHabit(days: [0, 2, 4]);
      final today = DateTime(2026, 9, 14); // un lundi
      // Validé les vendredi 11 et mercredi 9 ; jeudi/samedi/dimanche
      // non prévus → le streak vaut 2, pas 0.
      final entries = {
        key(DateTime(2026, 9, 11)), // vendredi
        key(DateTime(2026, 9, 9)), // mercredi
      };
      final streak = StreakEngine.currentStreak(
        habit: habit,
        entryDates: entries,
        today: today,
      );
      expect(streak, 2);
    });

    test('habitude gelée : le streak retourné reste celui stocké', () {
      final habit = dailyHabit(frozen: true);
      habit.currentStreak = 12;
      final streak = StreakEngine.currentStreak(
        habit: habit,
        entryDates: {},
        today: DateTime(2026, 9, 14),
      );
      // Gelée = mode vacances (§6.C) : protégée, jamais recalculée à la
      // baisse.
      expect(streak, 12);
    });
  });

  group('StreakEngine.recomputeStreaks', () {
    test('le record ne redescend jamais', () {
      final habit = dailyHabit();
      habit.bestStreak = 30;
      final result = StreakEngine.recomputeStreaks(
        habit: habit,
        entryDates: {},
        previousBest: 30,
        today: DateTime(2026, 9, 14),
      );
      expect(result.current, 0);
      expect(result.best, 30);
    });

    test('le record monte quand le courant le dépasse', () {
      final habit = dailyHabit();
      final today = DateTime(2026, 9, 14);
      final entries = {
        for (var i = 0; i < 8; i++)
          key(DateTime(today.year, today.month, today.day - i)): null,
      }.keys.toSet();
      final result = StreakEngine.recomputeStreaks(
        habit: habit,
        entryDates: entries,
        previousBest: 5,
        today: today,
      );
      expect(result.current, 8);
      expect(result.best, 8);
    });
  });

  group('StreakEngine.mascotStageFor', () {
    test('les stades suivent le meilleur streak (brief §3)', () {
      Habit withBest(int best) {
        final h = dailyHabit();
        h.bestStreak = best;
        return h;
      }

      expect(StreakEngine.mascotStageFor([]), MascotStage.graine);
      expect(
        StreakEngine.mascotStageFor([withBest(3)]),
        MascotStage.graine,
      );
      expect(
        StreakEngine.mascotStageFor([withBest(7)]),
        MascotStage.pousse,
      );
      expect(
        StreakEngine.mascotStageFor([withBest(21)]),
        MascotStage.jeuneArbre,
      );
      expect(
        StreakEngine.mascotStageFor([withBest(60), withBest(30)]),
        MascotStage.arbreAncien,
      );
    });

    test('les habitudes archivées ne comptent plus', () {
      final h = dailyHabit();
      h.bestStreak = 100;
      h.archived = true;
      expect(StreakEngine.mascotStageFor([h]), MascotStage.graine);
    });
  });

  group('StreakEngine.consistencyRate', () {
    test('taux de constance sur les jours prévus uniquement', () {
      final habit = dailyHabit(days: [0, 2, 4]); // lun, mer, ven
      final today = DateTime(2026, 9, 14); // lundi
      final entries = {
        key(DateTime(2026, 9, 11)), // vendredi validé
      };
      final rate = StreakEngine.consistencyRate(
        habit: habit,
        entryDates: entries,
        windowDays: 7,
        today: today,
      );
      // Sur 7 jours : 3 jours prévus (ven 11, mer 9... en remontant :
      // ven 11, jeu—non, mer 9, mar—non, lun 8) → 1/3.
      expect(rate, closeTo(1 / 3, 0.001));
    });

    test('zéro quand aucun jour prévu dans la fenêtre', () {
      final habit = dailyHabit(days: []);
      final rate = StreakEngine.consistencyRate(
        habit: habit,
        entryDates: {},
        windowDays: 30,
        today: DateTime(2026, 9, 14),
      );
      expect(rate, 0);
    });
  });

  group('Habit', () {
    test("intentionPhrase reconstitue « Je veux X à Y à Z » (§6.A.5)", () {
      final habit = Habit(
        clientId: 'x',
        name: 'lire 5 minutes',
        family: HabitFamily.construire,
        zoneId: 'matin',
        habitText: 'lire 5 minutes',
        timeOfDay: 'le matin au réveil',
        place: 'dans mon lit',
      );
      expect(
        habit.intentionPhrase,
        'lire 5 minutes le matin au réveil dans mon lit',
      );
    });

    test('isDueOn respecte la fréquence et le gel', () {
      final habit = dailyHabit(days: [0]); // lundi seulement
      final monday = DateTime(2026, 9, 14);
      final tuesday = DateTime(2026, 9, 15);
      expect(habit.isDueOn(monday), isTrue);
      expect(habit.isDueOn(tuesday), isFalse);

      habit.frozen = true;
      expect(habit.isDueOn(monday), isFalse); // gelée → jamais due
    });
  });
}