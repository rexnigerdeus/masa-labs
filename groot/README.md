# Groot Habits — L'app d'habitudes qui grandit avec toi

> **The Everyday Co.** — Application Flutter pour suivre des habitudes illimitées et faire grandir une créature qui vit avec ta constance.

## Concept

Chaque petite habitude est une graine. Groot grandit avec toi, jamais contre toi :
- **Illimité et sans friction** : aucune limite sur le nombre d'habitudes, jamais de paywall bloquant.
- **Une créature vivante, pas une checklist** : Groot pousse selon ta constance réelle (graine → pousse → jeune arbre → arbre ancien).
- **Trois familles** : construire / arrêter / créer — dans la même forêt.
- **Jamais culpabilisant** : un jour manqué n'est jamais un échec enregistré. Groot perd juste une feuille, et t'attend.

## Stack technique

- **Frontend :** Flutter 3.47 (iOS + Android), Riverpod 3.x, go_router
- **Backend :** Supabase (même projet que Rondo/Vitae/Hive — tables préfixées `groot_`)
- **Offline-first :** sqflite = source de vérité locale, sync Supabase en tâche de fond
- **Rappels :** flutter_local_notifications (notifications locales quotidiennes)
- **Typographie :** Baloo 2 (titres) + Public Sans (corps) via google_fonts
- **Langue :** Français uniquement en v1

## Architecture

```
lib/
├── main.dart                       # Init Supabase + MaterialApp clair/sombre
├── core/
│   ├── config/supabase_config.dart # Projet fhaulxauhaoofimkyrqb (partagé)
│   ├── providers.dart              # Providers Riverpod (profil, habitudes, badges)
│   ├── router/app_router.dart      # go_router + coquille 4 onglets
│   ├── theme/groot_theme.dart      # Palette végétale (design system §1)
│   ├── models/habit_models.dart    # Habit, HabitEntry, familles, zones, stades
│   ├── logic/streak_engine.dart   # Moteur de streak (testé unitairement)
│   ├── data/groot_db.dart         # Base sqflite locale (client_id, dirty flags)
│   ├── data/sync_service.dart     # Pull/push Supabase, last-write-wins
│   └── services/                  # auth (pseudo-email), habitudes, rappels
└── features/
    ├── auth/                      # splash, bienvenue, connexion, inscription
    ├── onboarding/                # quiz identité → familles → 1re graine → contrat → rappels
    ├── today/                     # écran Aujourd'hui, HabitCard, Growth Ring, AddHabitSheet
    ├── habit_detail/              # historique 8 semaines, notes, gel, stats
    ├── jardin/                    # Groot, décorations, badges, toutes les graines
    ├── stats/                     # constance par famille, meilleurs jours
    ├── settings/                  # compte, mode Sous-bois, à propos
    └── shared/widgets/groot_mascot.dart  # Mascotte CustomPainter (5 états)
```

## Modèle de données (Supabase)

Migration : `../supabase/migrations/20260913100000_groot_lot1.sql`

| Table | Rôle |
|---|---|
| `groot_profiles` | Identités (quiz), familles, stade mascotte, décorations |
| `groot_zones` | Zones de vie (Matin, Corps, Esprit, Créativité, Soir…) |
| `groot_habits` | Une graine : famille, intention "je veux X à Y à Z", fréquence, streaks |
| `groot_habit_entries` | Un jour validé (+ note de journal) — jamais de "raté" enregistré |
| `groot_badges` | Paliers 7/21/60/100/365 j, chacun offre un décor |
| `groot_user_badges` | Badges débloqués |

**Sync offline-first :** chaque ligne porte un `client_id` immuable généré côté Flutter + flags `dirty`/`synced_at`. Les écritures hors-ligne se rejouent dans l'ordre au retour du réseau (upsert idempotent par client_id).

## Lancer le projet

```bash
cd groot
flutter pub get
flutter run             # sur un appareil/émulateur connecté
flutter test            # 14 tests (moteur de streak)
flutter analyze         # zéro issue
```

**Prérequis mobile :** SDK Android (via Android Studio) pour l'émulateur/device Android. Le label, l'applicationId (`co.everyday.groot`) et les permissions de notifications sont déjà configurés.

## Ce qui est exclu de la v1 (décisions)

- **Aucune mention premium** — tout est gratuit, le paywall Groot+ viendra en v2.
- **Pas de FCM** — les rappels sont locaux (suffisant : pas de messages serveur→client).
- **Mascotte 100 % vectorielle** (CustomPainter) — zéro asset à produire, versions statique/animée de chaque état.

## Prochaines étapes suggérées

1. Icône app + splash screen natifs (le logo vectoriel existe déjà en code).
2. Décorations saisonnières + plus de badges.
3. Widgets d'écran d'accueil (brief §1 : la grille "chaîne à ne pas casser").
4. Groot+ (v2) : personnalisation avancée, stats avancées, sync multi-appareils.

