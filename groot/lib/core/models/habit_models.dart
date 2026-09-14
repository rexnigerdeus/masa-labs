/// Familles d'habitudes (brief §2) : les trois cohabitent dans la même forêt.
enum HabitFamily {
  /// Habitude à construire : "je veux faire plus de…"
  construire('construire', 'Construire', 'Je veux faire quelque chose de plus'),

  /// Habitude à arrêter : "je veux réduire…"
  arreter('arreter', 'Arrêter', 'Je veux réduire quelque chose'),

  /// Habitude créative : "j'explore par curiosité"
  creer('creer', 'Créer', "J'explore, je crée par curiosité");

  const HabitFamily(this.id, this.label, this.description);
  final String id;
  final String label;
  final String description;

  static HabitFamily fromId(String id) => HabitFamily.values.firstWhere(
        (f) => f.id == id,
        orElse: () => HabitFamily.construire,
      );
}

/// Zones de vie (brief §6.B.1) : les habitudes du jour y sont groupées.
/// Alignées sur la table `groot_zones` de la migration lot 1.
class HabitZone {
  const HabitZone(this.id, this.label, this.icon);
  final String id;
  final String label;

  /// Nom de l'icône Lucide — résolue côté UI.
  final String icon;

  static const List<HabitZone> all = [
    HabitZone('matin', 'Matin', 'sun'),
    HabitZone('corps', 'Corps & sport', 'activity'),
    HabitZone('esprit', 'Esprit', 'brain'),
    HabitZone('creer', 'Créativité', 'palette'),
    HabitZone('travail', 'Travail', 'briefcase'),
    HabitZone('soir', 'Soir', 'moon'),
    HabitZone('libre', 'Autre', 'sprout'),
  ];

  static HabitZone byId(String id) =>
      all.firstWhere((z) => z.id == id, orElse: () => all.last);
}

/// Identités du quiz d'onboarding (brief §6.A.3) : "Qui veux-tu devenir ?"
/// Servent à suggérer des habitudes pertinentes ensuite.
class GrootIdentity {
  const GrootIdentity(this.id, this.label, this.emoji);
  final String id;
  final String label;
  final String emoji;

  static const List<GrootIdentity> all = [
    GrootIdentity('pose', 'Une personne posée', '🧘'),
    GrootIdentity('creatif', 'Une personne créative', '🎨'),
    GrootIdentity('en-forme', 'Une personne en forme', '💪'),
    GrootIdentity('organise', 'Une personne organisée', '🗂️'),
    GrootIdentity('soigne', 'Une personne soignée', '✨'),
    GrootIdentity('apaise', 'Une personne apaisée', '🌿'),
    GrootIdentity('curieux', 'Une personne curieuse', '🔭'),
  ];

  static GrootIdentity byId(String id) =>
      all.firstWhere((i) => i.id == id, orElse: () => all.first);
}

/// Stades de croissance de Groot (design system §5) — la constance réelle
/// fait grandir la créature, jamais un abonnement.
enum MascotStage {
  graine('graine', 0),
  pousse('pousse', 7),
  jeuneArbre('jeune-arbre', 21),
  arbreAncien('arbre-ancien', 60);

  const MascotStage(this.id, this.minStreak);
  final String id;

  /// Nombre de jours de constance (streak global) requis pour ce stade.
  final int minStreak;

  static MascotStage fromId(String id) => MascotStage.values.firstWhere(
        (s) => s.id == id,
        orElse: () => MascotStage.graine,
      );

  /// Déduit le stade du streak global — brief §3 : Graine (0-6 j) →
  /// Pousse (7-20) → Jeune Arbre (21-59) → Arbre Ancien (60+).
  static MascotStage fromStreak(int streak) {
    MascotStage stage = MascotStage.graine;
    for (final s in MascotStage.values) {
      if (streak >= s.minStreak) stage = s;
    }
    return stage;
  }

  /// Libellé d'accessibilité (design system §9) :
  /// "Groot, jeune arbre, 34 jours de constance".
  String semanticLabel(int streak) {
    switch (this) {
      case MascotStage.graine:
        return 'Groot, graine, $streak jour${streak > 1 ? 's' : ''}';
      case MascotStage.pousse:
        return 'Groot, pousse, $streak jours de constance';
      case MascotStage.jeuneArbre:
        return 'Groot, jeune arbre, $streak jours de constance';
      case MascotStage.arbreAncien:
        return 'Groot, arbre ancien, $streak jours de constance';
    }
  }
}

/// Une habitude = une graine (brief §2). Le format "Je veux [action] à
/// [moment] à [lieu]" (§6.A.5) est décomposé en champs queryables.
class Habit {
  Habit({
    required this.clientId,
    required this.name,
    required this.family,
    required this.zoneId,
    this.habitText = '',
    this.timeOfDay,
    this.place,
    this.daysOfWeek = const [0, 1, 2, 3, 4, 5, 6],
    this.reminderTime,
    this.frozen = false,
    this.archived = false,
    this.currentStreak = 0,
    this.bestStreak = 0,
    this.createdAt,
    this.updatedAt,
    this.syncedAt,
    this.deletedAt,
    this.serverId,
    this.dirty = false,
  });

  /// Identifiant immuable généré côté client — la clé offline-first qui
  /// fait le lien entre sqflite et Postgres (jamais `serverId`).
  final String clientId;
  String name;
  HabitFamily family;
  String zoneId;

  /// Intention d'implémentation, façon Atomic Habits (§6.A.5).
  String habitText;
  String? timeOfDay;
  String? place;

  /// Jours actifs de la semaine, 0 (lundi) à 6 (dimanche). Vide = jamais
  /// (une habitude gelée n'est pas du jour — mais on garde la valeur).
  List<int> daysOfWeek;
  String? reminderTime;

  /// Mode pause façon vacances (§6.C) : gelée = pas proposée du jour,
  /// pas comptée dans le streak. Jamais de suppression brutale.
  bool frozen;
  bool archived;
  int currentStreak;
  int bestStreak;
  DateTime? createdAt;
  DateTime? updatedAt;
  DateTime? syncedAt;
  DateTime? deletedAt;

  /// UUID côté Postgres, null tant que la première sync n'a pas eu lieu.
  String? serverId;

  /// True = écriture locale pas encore poussée vers Supabase.
  bool dirty;

  /// L'habitude est-elle prévue ce jour-là ? (gelée/archivée → non)
  bool isDueOn(DateTime date) {
    if (frozen || archived) return false;
    if (daysOfWeek.isEmpty) return false;
    // DateTime.weekday : 1 = lundi … 7 = dimanche → 0-6 ISO.
    return daysOfWeek.contains(date.weekday - 1);
  }

  /// L'habitude est-elle due aujourd'hui ?
  bool get isDueToday => isDueOn(DateTime.now());

  /// Phrase complète "Je veux [action] à [moment] à [lieu]" (§6.A.5),
  /// reconstituée pour l'affichage du détail. Le "à" de liaison ne
  /// s'ajoute que si le complément ne commence pas déjà par une
  /// préposition (le/au/à/en/dans...) — sinon la phrase dédoublerait.
  String get intentionPhrase {
    final buffer = StringBuffer(habitText.isNotEmpty ? habitText : name);
    if (timeOfDay != null && timeOfDay!.isNotEmpty) {
      buffer.write(
        _startsLikePreposition(timeOfDay!) ? ' $timeOfDay' : ' à $timeOfDay',
      );
    }
    if (place != null && place!.isNotEmpty) {
      buffer.write(
        _startsLikePreposition(place!) ? ' $place' : ' à $place',
      );
    }
    return buffer.toString();
  }

  static bool _startsLikePreposition(String s) => RegExp(
        '^(le |la |les |au |aux |à |en |dans |sur |chez |vers )',
        caseSensitive: false,
      ).hasMatch(s.trim());

  Habit copyWith({
    String? name,
    HabitFamily? family,
    String? zoneId,
    String? habitText,
    String? timeOfDay,
    String? place,
    List<int>? daysOfWeek,
    String? reminderTime,
    bool? frozen,
    bool? archived,
    int? currentStreak,
    int? bestStreak,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? syncedAt,
    DateTime? deletedAt,
    String? serverId,
    bool? dirty,
  }) =>
      Habit(
        clientId: clientId,
        name: name ?? this.name,
        family: family ?? this.family,
        zoneId: zoneId ?? this.zoneId,
        habitText: habitText ?? this.habitText,
        timeOfDay: timeOfDay ?? this.timeOfDay,
        place: place ?? this.place,
        daysOfWeek: daysOfWeek ?? this.daysOfWeek,
        reminderTime: reminderTime ?? this.reminderTime,
        frozen: frozen ?? this.frozen,
        archived: archived ?? this.archived,
        currentStreak: currentStreak ?? this.currentStreak,
        bestStreak: bestStreak ?? this.bestStreak,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        syncedAt: syncedAt ?? this.syncedAt,
        deletedAt: deletedAt ?? this.deletedAt,
        serverId: serverId ?? this.serverId,
        dirty: dirty ?? this.dirty,
      );
}

/// Une entrée = un jour validé pour une habitude (§6.B.2).
/// On n'enregistre jamais un "raté" — un jour sans entrée est un jour
/// sans entrée, point (jamais culpabilisant, brief §7).
class HabitEntry {
  HabitEntry({
    required this.clientHabitId,
    required this.date,
    this.note = '',
    DateTime? checkedAt,
    DateTime? syncedAt,
    this.serverId,
    this.dirty = false,
  })  : checkedAt = checkedAt ?? DateTime.now(),
        syncedAt = syncedAt ?? DateTime.now();

  final String clientHabitId;

  /// Date locale du jour validé (sans heure, sans fuseau).
  final DateTime date;
  String note;
  DateTime checkedAt;
  DateTime syncedAt;
  String? serverId;
  bool dirty;

  /// Clé de jour 'yyyy-MM-dd' — la même que celle stockée en base.
  String get dateKey =>
      '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
}

/// Badge de récompense (§6.C) — paliers 7j, 21j, 60j, 100j…
class GrootBadge {
  const GrootBadge({
    required this.id,
    required this.label,
    required this.description,
    required this.requiredStreak,
    this.unlocksDecoration,
    this.unlockedAt,
    this.position = 0,
  });

  final String id;
  final String label;
  final String description;
  final int requiredStreak;
  final String? unlocksDecoration;

  /// Date de déblocage, null si verrouillé.
  final DateTime? unlockedAt;
  final int position;

  bool get isUnlocked => unlockedAt != null;
}

/// Profil Groot de l'utilisateur : identités, familles, stade, décor.
class GrootProfile {
  GrootProfile({
    required this.userId,
    this.identities = const [],
    this.families = const [],
    this.mascotStage = MascotStage.graine,
    this.decorations = const [],
    this.onboardingCompleted = false,
  });

  final String userId;
  List<String> identities;
  List<String> families;
  MascotStage mascotStage;
  List<String> decorations;
  bool onboardingCompleted;

  /// Décorations disponibles — aucune n'est premium (décision v1 :
  /// zéro mention payante, tout offert).
  static const List<String> knownDecorations = [
    'pot-terracotta',
    'echarpe',
    'pot-ceramique',
    'lanterne',
    'lucioles',
    'feuillage-dore',
  ];
}