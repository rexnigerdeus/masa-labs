# Vitae — Générateur de CV professionnel

> **The Everyday Co.** — Application Flutter pour créer des CV professionnels adaptés au marché ivoirien et ouest-africain.

## Concept

Vitae permet à n'importe quel diplômé de créer un CV professionnel en 3 minutes, adapté aux codes du marché local, sans compétence en design.

## Stack technique

- **Frontend :** Flutter (iOS + Android + Web)
- **Backend :** Supabase (PostgreSQL + Auth + Storage)
- **State :** Riverpod 3.x
- **Navigation :** go_router
- **PDF :** pdf + printing
- **Partage :** share_plus (WhatsApp, email)

## Architecture

```
lib/
├── main.dart                      # Point d'entrée
├── core/
│   ├── config/supabase_config.dart # Configuration Supabase
│   ├── providers.dart             # Providers globaux (auth, cv, plan)
│   ├── router/app_router.dart     # Routes go_router
│   └── theme/app_theme.dart       # Thème Vitae (steel blue #3F6E91)
├── features/
│   ├── auth/
│   │   ├── screens/               # splash, welcome, login, register, objectif
│   │   ├── services/auth_service  # Auth Supabase (pseudo-email)
│   │   └── utils/phone_formatter  # Validation téléphone
│   ├── cv/
│   │   ├── models/cv_model.dart   # Cv, CvSection, CvTemplate
│   │   ├── screens/
│   │   │   ├── create_cv_screen   # Étape 1 : titre + template
│   │   │   ├── edit_cv_screen     # Édition multi-étapes (stepper)
│   │   │   ├── cv_detail_screen   # Détail + actions (éditer, dupliquer, supprimer)
│   │   │   └── export_screen      # Export PDF + partage WhatsApp
│   │   ├── services/
│   │   │   ├── cv_service.dart    # CRUD Supabase
│   │   │   └── cv_pdf_generator   # Génération PDF A4
│   │   └── widgets/
│   │       ├── cv_preview.dart    # Rendu visuel (6 templates)
│   │       ├── perso_step.dart    # Infos personnelles
│   │       ├── titre_step.dart    # Titre professionnel
│   │       ├── resume_step.dart   # Résumé professionnel
│   │       ├── experience_step    # Expériences
│   │       ├── formation_step     # Formation
│   │       ├── competence_step    # Compétences (tags)
│   │       ├── langue_step.dart   # Langues + niveaux
│   │       ├── interet_step.dart  # Centres d'intérêt
│   │       ├── template_step     # Choix template + couleur
│   │       └── apercu_step.dart   # Aperçu temps réel
│   ├── dashboard/
│   │   └── screens/
│   │       ├── dashboard_screen   # Liste des CVs
│   │       └── conseils_screen    # Section éditoriale (guides)
│   ├── settings/
│   │   └── screens/settings_screen # Profil, abonnement, déconnexion
│   └── subscription/
│       ├── services/plan_service  # Plans gratuit/premium/étudiant
│       └── screens/paywall_screen  # Page d'upgrade
```

## Les 6 templates

| # | Nom | Style | Idéal pour | Gratuit ? |
|---|---|---|---|---|
| 1 | Classique | 1 colonne, sobre | Banque, Droit, Admin | ✅ |
| 2 | Moderne | 2 colonnes, accent couleur | Marketing, Communication | ❌ |
| 3 | Élégant | En-tête photo, premium | Direction, Management | ❌ |
| 4 | Minimal | Très épuré | Design, Tech | ❌ |
| 5 | Académique | Détaillé, publications | Enseignement, Recherche | ❌ |
| 6 | Stage | 1 page forcée | Étudiants, Stagiaires | ✅ |

## Monétisation

| Plan | Limite | Prix |
|---|---|---|
| Gratuit | 1 CV, 2 templates, watermark | 0 FCFA |
| Premium | CVs illimités, 6 templates, sans watermark | 2 000 FCFA/mois ou 500 FCFA/CV |
| Étudiant | Premium avec justificatif | 1 000 FCFA/6 mois |

## Base de données (Supabase)

Tables préfixées `vitae_` :
- `vitae_cvs` — CVs de l'utilisateur
- `vitae_sections` — Sections JSONB (perso, experience, formation, etc.)
- `vitae_templates` — Catalogue des 6 templates
- `vitae_exports` — Historique des exports
- `vitae_subscriptions` — Plans d'abonnement

RPCs :
- `vitae_get_full_cv(p_cv_id)` — Récupère un CV complet avec sections
- `vitae_duplicate_cv(p_cv_id)` — Duplique un CV

## Démarrage

```bash
cd vitae
flutter pub get
flutter run
```

## Auth

Pseudo-email : `${cleanPhone}@everyday.co` — le téléphone est l'identité réelle, le pseudo-email est un identifiant technique pour Supabase Auth. Aucun email n'est envoyé.

---

*The Everyday Co. — Daniel | Juillet 2026*

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
