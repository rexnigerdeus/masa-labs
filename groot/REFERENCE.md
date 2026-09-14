# Groot Habits — Fichier de référence

> Document vivant : mettre à jour à chaque changement structurant (nouvel écran,
> changement de schéma Supabase, décision produit). C'est la source de vérité
> pour reprendre le projet sans relire tout l'historique.

Dernière revue complète : **2026-09-14**.

---

## 1. C'est quoi

Application Flutter (iOS/Android/Web) de suivi d'habitudes, 4e produit de
**The Everyday Co.** après Rondo, Vitae et Hive. Spécification complète dans
`Groot_Brief_UX_Design.md` (positionnement, parcours, ton) et
`Groot_Habits_Design_System.md` (tokens, composants) à la racine du dossier
partagé — ce fichier ne les répète pas, il documente l'écart entre le papier
et le code réel.

Trois piliers non négociables (brief §2) : habitudes **illimitées et
gratuites** dès le départ, une **mascotte vivante** (pas une checklist),
**jamais culpabilisant** (aucun "raté" n'est enregistré en base).

## 2. État du projet — 2026-09-14

| Aspect | État |
|---|---|
| `flutter analyze` | ✅ 0 issue |
| `flutter test` | ✅ 15/15 tests (moteur de streak, `intentionPhrase`, `isDueOn`) |
| Build web release | ✅ compile et tourne (`flutter build web --release`) |
| Auth (inscription/connexion) | ✅ **corrigée le 2026-09-14** — voir §4 |
| Conformité design system | ✅ élevée — voir §5 |
| Écrans du brief §6 | ✅ tous présents (voir §3) |

## 3. Architecture & écrans

```
lib/
├── main.dart                        # Init Supabase, sqflite (ffi web sur kIsWeb)
├── core/
│   ├── config/supabase_config.dart  # URL + anon key du projet partagé
│   ├── providers.dart               # Riverpod : profil, habitudes, sync, auth
│   ├── router/app_router.dart       # go_router, redirection selon session/onboarding
│   ├── theme/groot_theme.dart       # Tokens couleur/type/radius du design system
│   ├── models/habit_models.dart     # Habit, HabitEntry, GrootBadge, GrootProfile…
│   ├── logic/streak_engine.dart     # Calcul streak/record/stade mascotte — testé
│   ├── data/groot_db.dart           # sqflite local, source de vérité offline
│   ├── data/sync_service.dart       # Pull/push Supabase, last-write-wins
│   └── services/                    # auth_service, habit_service, reminder_service
└── features/
    ├── auth/screens/                # splash, welcome (bienvenue), login, register
    ├── onboarding/screens/          # 5 étapes : identités → familles → 1ère graine
    │                                 → contrat tactile (hold-to-commit) → rappels
    ├── today/                       # écran "Aujourd'hui" + HabitCard + GrowthRing
    │                                 + AddHabitSheet
    ├── habit_detail/                # historique, notes, gel (mode vacances)
    ├── jardin/                      # mascotte, décorations, badges
    ├── stats/                       # constance par famille, tendances
    ├── settings/                    # thème clair/sombre, compte
    └── shared/widgets/groot_mascot.dart  # CustomPainter, 5 états (§5 design system)
```

Routes (`app_router.dart`) : `/splash`, `/bienvenue`, `/connexion`,
`/inscription`, `/onboarding`, puis coquille à 4 onglets
(`/aujourdhui`, `/jardin`, `/stats`, `/reglages`) + `/habitude/:clientId`
hors coquille.

**Modèle de données Supabase** : `masa-labs/supabase/migrations/20260913100000_groot_lot1.sql`.
Tables `groot_profiles`, `groot_zones`, `groot_habits`, `groot_habit_entries`,
`groot_badges`, `groot_user_badges` — toutes en RLS, `user_id` référence
`public.profiles(id)` (partagé avec Rondo/Vitae/Hive). Offline-first : chaque
ligne porte un `client_id` immuable + `dirty`/`synced_at` pour rejouer les
écritures locales dans l'ordre au retour du réseau.

## 4. Bug corrigé — inscription impossible (2026-09-14)

**Symptôme rapporté** : impossible de créer un compte depuis le navigateur.

**Root cause** : `lib/core/config/supabase_config.dart` contenait une clé
anon Supabase **corrompue d'un seul caractère** par rapport à celle utilisée
par Rondo et Vitae (même projet Supabase `fhaulxauhaoofimkyrqb`) :

```
Groot (cassée)      : ...RG18Qk41iixn8JgC98
Rondo/Vitae (bonne) : ...RG18Ck41iixn8JgC98
                              ^ un seul caractère différent (Q → C)
```

Conséquence : **tout** appel Supabase (signup, signin, sync) échouait avec
`401 Invalid API key`. Le formulaire d'inscription ne montrait aucune erreur
utile — `signUp()` levait une exception généreusement interceptée par le
`catch` du `RegisterScreen`, qui affiche un message générique
("Inscription impossible pour le moment").

**Fix appliqué** : clé anon corrigée pour correspondre à celle de
Rondo/Vitae/Hive (même projet, même rôle `anon`).

**Vérification faite** : build web release + script Playwright pilotant
l'app réelle (welcome → inscription → soumission). Avant fix : `POST
/auth/v1/signup` → 401. Après fix : `POST /auth/v1/signup` → 200, session
valide reçue, redirection automatique vers l'onboarding (`Étape 1 sur 5 —
Qui veux-tu devenir ?`) confirmée par capture d'écran.

**Point de vigilance pour la suite** : cette clé est dupliquée en dur dans
4 codebases (`rondo`, `vitae`, `groot`, et probablement `hive` sous
`web/apps/hive`). Un futur renouvellement de clé côté Supabase Dashboard
devra être répercuté partout à la main — aucune source unique aujourd'hui.

## 5. Conformité au design system

Comparaison `groot_theme.dart` vs `Groot_Habits_Design_System.md` :

- **Couleurs** : tokens exacts (`green900 #28402F`, `green600 #5E8B5A`,
  `amber500 #E3A857`, `bark600 #7A5C3E`, `clay500 #C1694F`,
  `paper100 #F3EEDF`…) — conformes à la version *design system* (qui
  affine légèrement le brief initial, ex. paper.100 `#F5EFE1` dans le brief
  vs `#F3EEDF` dans le design system ; le code suit le design system, à
  juste titre car c'est le document le plus récent/détaillé).
- **Dark mode "Sous-bois"** : implémenté dès le lancement (§9 non négociable),
  tokens `bgDark`, `surfaceDark`, `greenDarkAccent`… conformes.
- **Typographie** : Baloo 2 (titres) + Public Sans (corps) via
  `google_fonts`, échelle 32/26/20/16/14/12 respectée.
- **Rayons asymétriques** (§3.2) : `cardLeaf` (20px haut-gauche / 8px
  ailleurs) appliqué aux cartes, champs de texte ET listTiles ; `button`
  16px uniforme ; `sheetTop` 28px haut seul ; `chip` cercle plein — les
  quatre signatures du §3.2 sont bien différenciées, pas de radius
  générique unique comme le principe directeur §0 l'interdit.
- **Ombre chaude** (§3.3) : `warmShadow` dérive bien de `green900` à 12%
  d'opacité, jamais de noir pur.
- **Jamais de rouge** : aucune occurrence de `Colors.red` ou équivalent
  dans tout `lib/` ; `clay500` fait office d'alerte maximale partout,
  y compris la couleur d'icône des notifications locales.
- **Accessibilité** (§9) : `semanticLabel()` sur `MascotStage` produit
  bien "Groot, jeune arbre, 34 jours de constance" ; état sélectionné
  toujours doublé d'un changement de forme (`check_circle` vs
  `circle_outlined`), jamais de la couleur seule.
- **Zéro mention premium** : vérifié par grep sur tout `lib/` — conforme
  à la décision v1 du brief §8/README ("aucune mention premium").

**Écart mineur observé (cosmétique, web uniquement)** : les emoji utilisés
comme icônes du quiz d'identité (`GrootIdentity`, ex. 🧘 🎨 💪) et dans le
ton de voix ne s'affichent pas dans le build **web** — CanvasKit ne trouve
pas de police emoji couleur ("Could not find a set of Noto fonts…" en
console). Sans impact sur iOS/Android (police système). À corriger avant
une démo web publique : soit bundler une police d'emoji, soit remplacer
les emoji de `GrootIdentity`/badges par des `Icon()` Material comme le
reste de l'app (cohérent avec le principe "icône outline/rempli" du §4 du
design system).

## 6. Comment tester

```bash
cd groot
export PATH="$PATH:/c/Users/<user>/flutter/bin"   # si flutter pas dans le PATH
flutter pub get
flutter analyze && flutter test
flutter run -d chrome        # test interactif au clavier/souris
# ou, pour un test automatisé reproductible :
flutter build web --release
python -m http.server 8765 --directory build/web
# puis piloter avec Playwright (CanvasKit → pas de DOM, cliquer par
# coordonnées ou utiliser les logs réseau pour vérifier les appels Supabase)
```

**Comptes de test** : n'importe quel numéro à 10 chiffres fonctionne
(pseudo-email `<numéro>@everyday.co`, "Confirm email" doit rester **désactivé**
côté Supabase Dashboard > Authentication > Settings — sinon le compte se
crée mais reste sans session tant que le pseudo-email n'est jamais confirmé).

## 7. Dépôt & déploiement

Le dossier `groot/` vit dans le monorepo **masa-labs**
(`https://github.com/rexnigerdeus/masa-labs`, branche `main`), aux côtés de
`rondo/`, `vitae/`, et du site `web/`. Pas de dépôt séparé — c'est voulu,
les 4 apps partagent un seul projet Supabase et un historique commun.

Convention de push (mémoire utilisateur) : commit + push à chaque jalon,
sans attendre de validation explicite.

## 8. Prochaines étapes suggérées

1. Centraliser la clé anon Supabase (variable d'environnement ou fichier
   de config partagé lu par les 4 apps) pour éviter qu'une future rotation
   de clé ne se resynchronise à la main dans 4 endroits — c'est exactement
   ce qui a cassé l'inscription cette fois-ci.
2. Résoudre le rendu emoji manquant en web (§5) avant toute démo publique.
3. Icône app + splash natif (mascotte vectorielle déjà en `CustomPainter`).
4. Widgets d'écran d'accueil (grille "chaîne à ne pas casser", brief §1).
5. Groot+ v2 (personnalisation avancée, stats avancées, multi-appareils) —
   explicitement hors scope v1, ne pas anticiper dans le code actuel.
