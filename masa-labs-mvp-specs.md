# The Everyday Co. — MVP Complet des 4 Applications
> Spécifications fonctionnelles, écrans, flux utilisateurs et stack technique

---

## PRINCIPES COMMUNS À TOUS LES MVP

**Stack technique unifiée**
- Frontend : Flutter → iOS + Android + Web depuis une seule base de code
- Backend : Supabase (PostgreSQL + Auth + Realtime + Storage) → zéro serveur à gérer
- Paiements : Wave CI API + Orange Money API (intégration progressive)
- Notifications : Firebase Cloud Messaging + Twilio SMS
- Déploiement : Flutter build → App Store + Play Store

**Règles de conception communes**
- Langue : Français uniquement en v1
- Onboarding : max 3 écrans, inscription par numéro de téléphone (pas d'email)
- Connexion : OTP SMS (pas de mot de passe à mémoriser)
- Hors-ligne : les données critiques sont accessibles sans connexion
- Monétisation v1 : Freemium simple — une limite claire, un upgrade évident

---

---

# 🟠 APP 1 — RONDO
### Gestion de tontines et cercles d'épargne collectifs

---

## Concept en une phrase
Rondo permet à n'importe quel groupe de créer, gérer et suivre une tontine en quelques minutes, avec une transparence totale pour tous les membres.

---

## Utilisateurs cibles
- Groupes de femmes commerçantes
- Collègues de bureau / fonctionnaires
- Familles élargies
- Groupes d'étudiants / jeunes professionnels
- Associations de quartier

**Rôles dans l'app :**
- **Administrateur** : crée et gère la tontine (1 seul par groupe)
- **Membre** : consulte, cotise et reçoit les notifications

---

## Écrans MVP (18 écrans)

### Onboarding
1. **Splash** — Logo Rondo animé, 2 secondes
2. **Accueil** — "Créer une tontine" / "Rejoindre une tontine"
3. **Inscription** — Saisie numéro de téléphone → OTP SMS
4. **Profil** — Prénom, nom, photo optionnelle

### Tableau de bord (Admin)
5. **Home Admin** — Liste des tontines gérées + bouton "Nouvelle tontine"
6. **Créer une tontine** — Formulaire : nom, montant de la mise, fréquence (hebdo/mensuel), nombre de membres, date de démarrage
7. **Détail tontine** — Vue globale : tour actuel, cagnotte du mois, statut de chaque membre, bouton "Enregistrer paiement"
8. **Gestion membres** — Liste membres, ajouter via lien d'invitation ou numéro, exclure un membre
9. **Enregistrer un paiement** — Sélectionner membre, montant, mode (espèces / Wave / Orange Money), note optionnelle
10. **Historique** — Journal complet de tous les paiements, par membre et par tour
11. **Planning des tours** — Calendrier visuel : qui reçoit quoi et quand sur toute la durée

### Tableau de bord (Membre)
12. **Home Membre** — Mes tontines rejointes, prochain paiement dû, mon tour prévu
13. **Détail tontine (vue membre)** — Cagnotte, statut des autres membres (payé / en attente), date de mon tour
14. **Mon historique** — Mes paiements effectués, reçus générés

### Commun
15. **Notifications** — Centre de notifications : rappels, confirmations, messages admin
16. **Rejoindre une tontine** — Saisir le code d'invitation (6 chiffres)
17. **Paramètres** — Profil, préférences de notification, déconnexion
18. **Écran de succès / erreur** — Feedback visuel après chaque action clé

---

## Flux utilisateur principal

**Création d'une tontine (Admin) :**
```
Inscription OTP
  → Créer tontine (nom, mise 10 000 FCFA, mensuelle, 8 membres)
  → Copier lien d'invitation → Partager sur WhatsApp
  → Membres rejoignent avec le code
  → Admin voit les membres arriver en temps réel
  → Admin définit l'ordre des tours (glisser-déposer)
  → Tontine active → Début du 1er mois
```

**Enregistrement d'un paiement (Admin) :**
```
Home → Tontine "Famille Koné"
  → Enregistrer paiement
  → Sélectionner "Awa Koné"
  → Montant : 10 000 FCFA
  → Mode : Espèces
  → Confirmer → Awa reçoit une notification "Paiement confirmé"
  → Statut d'Awa passe à ✓ Payé
```

**Rappel automatique :**
```
3 jours avant la date de cotisation
  → Notification push + SMS optionnel
  → "Rappel : votre cotisation de 10 000 FCFA est due dans 3 jours"
  → Membre tape → Voir le détail de la tontine
```

---

## Modèle de données

```
users           id, phone, name, avatar_url, created_at
tontines        id, name, admin_id, mise, frequence, nb_membres, date_debut, statut
membres         id, tontine_id, user_id, ordre_tour, statut, joined_at
tours           id, tontine_id, numero, date_debut, date_fin, beneficiaire_id
paiements       id, tour_id, membre_id, montant, mode, note, confirmed_at
notifications   id, user_id, type, titre, corps, lu, created_at
```

---

## Règles métier critiques

- Un seul admin par tontine
- Le montant de la mise est fixe pour toute la durée
- L'ordre des tours est défini avant le démarrage (modifiable par l'admin uniquement)
- Un paiement ne peut être enregistré que par l'admin
- Chaque paiement génère automatiquement un reçu PDF téléchargeable
- La cagnotte d'un tour = (mise × nb_membres) — affiché clairement
- Alerte si un membre n'a pas payé 2 jours après la date prévue

---

## Monétisation MVP

| Plan | Limite | Prix |
|---|---|---|
| Gratuit | 1 tontine, max 10 membres | 0 FCFA |
| Standard | Tontines illimitées, max 30 membres | 1 500 FCFA/mois |
| Pro | Illimité + SMS de rappel automatique | 3 500 FCFA/mois |

---

## Ce qui est EXCLU du MVP v1
- Paiement Mobile Money intégré (v2)
- Chat entre membres (v2)
- Tontines à mise variable (v2)
- Export comptable (v2)
- Multi-admin (v2)

---

---

# 🟢 APP 2 — KASSA
### Caisse journalière et gestion financière pour commerces informels

---

## Concept en une phrase
Kassa remplace le cahier de caisse par un tableau de bord mobile simple qui dit au commerçant exactement ce qu'il a gagné, dépensé et gardé chaque jour.

---

## Utilisateurs cibles
- Tailleurs / couturiers
- Épiciers et boutiquiers
- Vendeuses de marché
- Coiffeurs / salons
- Restauratrices / traiteurs
- Artisans (menuisiers, mécaniciens, électriciens)

**Un seul rôle en v1 :** le commerçant (propriétaire)

---

## Écrans MVP (16 écrans)

### Onboarding
1. **Splash** — Logo Kassa
2. **Bienvenue** — "Gérez votre caisse en 30 secondes" + 3 bullets simples
3. **Inscription** — Numéro de téléphone → OTP
4. **Mon commerce** — Nom du commerce, secteur (liste déroulante), devise (FCFA par défaut)

### Tableau de bord principal
5. **Home** — Aujourd'hui : Bénéfice net (grand, centré), Ventes totales, Dépenses totales. Boutons flottants : "+ Vente" / "- Dépense"
6. **Ajouter une vente** — Montant (pavé numérique), Description (libre ou parmi suggestions), Mode de paiement (Espèces / Wave / Orange Money), Confirmer
7. **Ajouter une dépense** — Montant, Catégorie (Stock / Loyer / Transport / Autre), Description, Confirmer
8. **Journal du jour** — Liste chronologique de toutes les transactions du jour, avec filtre Ventes/Dépenses, option suppression
9. **Récapitulatif semaine** — Graphique barres (bénéfice par jour), Total semaine, Meilleur jour
10. **Récapitulatif mois** — Graphique courbe (évolution), Total mois, Comparaison mois précédent

### Gestion avancée
11. **Produits / Services** — Catalogue personnel : créer des articles récurrents (ex : "Robe sur commande 25 000 FCFA") pour saisie rapide
12. **Catégories de dépenses** — Personnaliser les catégories (ajouter, renommer)
13. **Rapport PDF** — Générer un rapport mensuel PDF (récapitulatif ventes/dépenses/bénéfice) → partager sur WhatsApp
14. **Comparaison** — Vue mois N vs mois N-1 côte à côte

### Commun
15. **Paramètres** — Nom commerce, devise, sauvegarde, déconnexion
16. **Onboarding contextuel** — Tooltip au premier lancement sur chaque section clé

---

## Flux utilisateur principal

**Enregistrer une vente (usage quotidien) :**
```
Home → Bouton "+ Vente"
  → Pavé numérique → Taper "25000"
  → Description : sélectionner "Robe sur commande" (depuis catalogue)
  → Paiement : Wave
  → Confirmer → Bénéfice mis à jour instantanément sur la Home
  → Journal mis à jour
```

**Consulter la semaine :**
```
Home → Glisser vers "Cette semaine"
  → Voir barres : Lun 12k / Mar 8k / Mer 31k...
  → Identifier le meilleur jour → Analyser pourquoi
```

**Générer un rapport mensuel :**
```
Rapports → Mois de Juin
  → Aperçu : Ventes 847 000 / Dépenses 312 000 / Bénéfice 535 000
  → "Générer PDF" → PDF créé → "Partager" → WhatsApp
```

---

## Modèle de données

```
users           id, phone, commerce_name, secteur, devise, created_at
transactions    id, user_id, type (vente/depense), montant, description,
                categorie, mode_paiement, date, created_at
produits        id, user_id, nom, prix_defaut, categorie
categories      id, user_id, nom, type (vente/depense), couleur
```

---

## Règles métier critiques

- Toutes les transactions sont locales d'abord (drift / sqflite) puis synchronisées
- Pas de modification possible après 24h (évite les manipulations)
- Le bénéfice = somme des ventes − somme des dépenses sur la période
- Aucune donnée bancaire collectée
- Rapport PDF généré côté client (pdf package + printing)
- Sauvegarde automatique sur Supabase toutes les heures si connecté

---

## Monétisation MVP

| Plan | Limite | Prix |
|---|---|---|
| Gratuit | 30 transactions/mois, pas de rapport PDF | 0 FCFA |
| Solo | Illimité + rapports PDF | 1 000 FCFA/mois |
| Business | Solo + catalogue produits + comparaison mensuelle | 2 500 FCFA/mois |

---

## Ce qui est EXCLU du MVP v1
- Gestion de stock (v2)
- Facturation client (v2)
- Multi-utilisateur / employés (v2)
- Connexion comptable externe (v2)
- Graphiques par produit (v2)

---

---

# 🟣 APP 3 — KRÉDI
### Gestionnaire de créances et dettes pour commerçants

---

## Concept en une phrase
Krédi permet à tout commerçant de savoir exactement qui lui doit quoi, d'envoyer des rappels sans gêne et d'encaisser plus vite — sans cahier, sans prise de tête.

---

## Utilisateurs cibles
- Commerçants vendant à crédit (épiciers, bouchers, boulangeries)
- Tailleurs, couturiers (acomptes et soldes)
- Prestataires de services (plombiers, électriciens)
- Grossistes livrant à des détaillants
- Tout professionnel ayant des clients qui "payent plus tard"

**Deux rôles :**
- **Créancier** : le commerçant qui suit ce qu'on lui doit
- **Débiteur (optionnel)** : le client qui peut consulter sa propre dette si invité

---

## Écrans MVP (17 écrans)

### Onboarding
1. **Splash** — Logo Krédi
2. **Bienvenue** — "Sachez exactement ce qu'on vous doit" + illustration simple
3. **Inscription** — Téléphone → OTP
4. **Mon profil** — Prénom, nom de commerce

### Tableau de bord créancier
5. **Home** — Total dû (grand, rouge si > 0), nombre de débiteurs actifs, liste des créances récentes triées par date d'échéance la plus proche
6. **Nouvelle créance** — Sélectionner ou créer un client, montant total, acompte reçu (optionnel), date d'échéance, description (ex : "Robe bleue"), note
7. **Détail créance** — Montant total / Payé / Reste dû, historique des remboursements partiels, boutons : "Enregistrer paiement" / "Envoyer rappel" / "Clôturer"
8. **Enregistrer un remboursement** — Montant partiel ou total, mode de paiement, date, note
9. **Envoyer un rappel** — Sélectionner le canal : WhatsApp (message pré-rédigé) ou SMS. Aperçu du message avant envoi.
10. **Fiche client** — Profil d'un client : total dû toutes créances confondues, historique complet, fiabilité (payé à temps / en retard / jamais)
11. **Liste clients** — Annuaire de tous les clients avec leur solde actuel, filtre : "Tout" / "En attente" / "En retard" / "Soldé"

### Tableau de bord débiteur (optionnel)
12. **Home débiteur** — Ce que je dois et à qui, dates d'échéance, statut (à jour / en retard)
13. **Détail ma dette** — Montant initial, payé, reste, historique

### Analyses
14. **Récapitulatif** — Créances en cours / soldées / en retard, taux de recouvrement, graphique par mois
15. **Historique** — Toutes les transactions classées par date

### Commun
16. **Paramètres** — Profil, notifications, langue
17. **Notifications** — Centre de rappels : créances qui arrivent à échéance dans 3 jours / dépassées

---

## Flux utilisateur principal

**Créer une créance :**
```
Home → "+ Nouvelle créance"
  → Sélectionner client "Mamadou Bah" (ou créer)
  → Montant : 45 000 FCFA
  → Acompte reçu : 15 000 FCFA
  → Reste dû calculé automatiquement : 30 000 FCFA
  → Échéance : 15 juillet
  → Description : "Costume complet"
  → Confirmer → Créance créée, client notifié si inscrit
```

**Envoyer un rappel WhatsApp :**
```
Détail créance "Mamadou Bah"
  → Bouton "Envoyer rappel"
  → Choisir WhatsApp
  → Aperçu du message :
    "Bonjour Mamadou, je vous rappelle que vous avez un solde
    de 30 000 FCFA dû pour votre Costume complet.
    Échéance : 15 juillet. Merci. — [Nom du commerce]"
  → Envoyer → WhatsApp ouvre avec le message pré-rempli
```

**Encaisser un remboursement partiel :**
```
Détail créance → "Enregistrer paiement"
  → Montant : 15 000 FCFA
  → Mode : Wave
  → Reste dû mis à jour : 15 000 FCFA
  → Historique mis à jour
  → Notification de confirmation envoyée au client
```

---

## Modèle de données

```
users           id, phone, name, commerce_name, created_at
clients         id, user_id, name, phone, note, fiabilite_score
creances        id, user_id, client_id, montant_total, montant_paye,
                montant_restant, description, echeance, statut
                (active/soldee/en_retard), created_at
paiements       id, creance_id, montant, mode, note, date
rappels         id, creance_id, canal (whatsapp/sms), envoye_at
```

---

## Règles métier critiques

- Le montant restant = montant total − somme des paiements (calculé automatiquement)
- Statut "En retard" : si date d'échéance dépassée et montant restant > 0
- Score de fiabilité client : calculé sur les 6 derniers mois (ratio paiements à temps / total)
- Rappel automatique push J-3 avant l'échéance
- Message WhatsApp généré en français local, ton neutre et respectueux
- Maximum 3 créances actives par client simultanément (limite freemium)

---

## Monétisation MVP

| Plan | Limite | Prix |
|---|---|---|
| Gratuit | 10 créances actives, rappels manuels | 0 FCFA |
| Pro | Créances illimitées + rappels auto + score fiabilité | 2 000 FCFA/mois |
| Business | Pro + tableau de bord multi-commerce | 4 500 FCFA/mois |

---

## Ce qui est EXCLU du MVP v1
- SMS automatiques payants (v2)
- Intégration Wave pour confirmation de paiement (v2)
- Contrat de vente numérique signé (v2)
- Mode débiteur web (sans app) (v2)
- Export comptable (v2)

---

---

# 🔵 APP 4 — VITAE
### Générateur de CV professionnel adapté au marché ivoirien et ouest-africain

---

## Concept en une phrase
Vitae permet à n'importe quel diplômé de créer un CV professionnel en 3 minutes, adapté aux codes du marché local, sans compétence en design.

---

## Utilisateurs cibles
- Étudiants en fin de cursus
- Demandeurs d'emploi actifs
- Personnes en reconversion
- Jeunes cherchant un stage
- Profils souhaitant mettre à jour un CV existant

**Un seul rôle :** le candidat (auteur de son CV)

---

## Écrans MVP (20 écrans)

### Onboarding
1. **Splash** — Logo Vitae
2. **Bienvenue** — "Votre CV professionnel en 3 minutes" + exemples de CV générés
3. **Inscription** — Téléphone → OTP (ou email optionnel)
4. **Quel est votre objectif ?** — Trouver un emploi / Trouver un stage / Mettre à jour mon CV (personnalise l'expérience)

### Création du CV (formulaire guidé étape par étape)
5. **Informations personnelles** — Prénom, Nom, Photo (optionnel), Téléphone, Email, Ville/Pays, LinkedIn (optionnel)
6. **Titre professionnel** — Titre visé (texte libre + suggestions : "Comptable junior", "Chargé de communication", etc.)
7. **Résumé professionnel** — Texte libre 3-5 lignes (avec exemples par secteur pour inspiration)
8. **Expériences** — Ajouter expériences : Poste, Entreprise, Durée, Description des tâches (champ libre + suggestions par secteur)
9. **Formation** — Diplômes : Intitulé, Institution, Année d'obtention, Mention (optionnel)
10. **Compétences** — Tags à cocher + champ libre : compétences techniques, logiciels, langues
11. **Langues** — Ajouter langues + niveau (Notions / Intermédiaire / Courant / Bilingue / Natif)
12. **Centres d'intérêt** — Tags optionnels
13. **Choisir un template** — 6 templates disponibles en v1 (voir détail ci-dessous)

### Prévisualisation et export
14. **Aperçu du CV** — Rendu temps réel du CV, scroll pour voir toutes les pages
15. **Ajuster les couleurs** — Sélecteur de couleur principale (6 choix par template)
16. **Exporter PDF** — Télécharger le PDF / Partager sur WhatsApp / Envoyer par email

### Gestion
17. **Mes CVs** — Liste de tous les CVs créés (plusieurs CVs pour plusieurs candidatures)
18. **Dupliquer un CV** — Copier un CV existant pour l'adapter à une autre offre
19. **Conseils** — Section éditoriale : "Comment rédiger un bon résumé", "Les erreurs de CV à éviter au Marché ivoirien", etc.
20. **Paramètres** — Profil, abonnement, déconnexion

---

## Les 6 templates v1

| # | Nom | Style | Idéal pour |
|---|---|---|---|
| 1 | **Classique** | 1 colonne, sobre, noir/blanc | Banque, Droit, Administration publique |
| 2 | **Moderne** | 2 colonnes, accent couleur | Marketing, Communication, Commercial |
| 3 | **Élégant** | En-tête photo, mise en page premium | Direction, Management, Finance |
| 4 | **Minimal** | Très épuré, beaucoup d'espace | Design, Tech, Créatif |
| 5 | **Académique** | Détaillé, section publications | Enseignement, Recherche |
| 6 | **Stage** | Court (1 page forcée), sections adaptées | Étudiants, Stagiaires |

---

## Flux utilisateur principal

**Créer son premier CV :**
```
Inscription OTP
  → Objectif : "Trouver un emploi"
  → Infos personnelles : Koné Aya, Abidjan
  → Titre : "Comptable Junior"
  → Résumé : texte libre + exemple préchargé à modifier
  → Expériences : 2 expériences ajoutées
  → Formation : Licence Comptabilité UFHB 2023
  → Compétences : Excel, Sage, Analyse financière
  → Template : "Classique" avec accent bordeaux
  → Aperçu → Tout est bien
  → Exporter PDF → Partager sur WhatsApp
```

**Créer un second CV pour une candidature différente :**
```
Mes CVs → Dupliquer "CV Koné Aya - Comptable"
  → Renommer "CV Koné Aya - Auditrice"
  → Modifier le titre et le résumé
  → Changer template → "Élégant"
  → Exporter et envoyer
```

---

## Modèle de données

```
users           id, phone, email, name, objectif, created_at
cvs             id, user_id, titre, template_id, couleur_principale,
                statut (brouillon/finalisé), created_at, updated_at
sections_cv     id, cv_id, type (perso/experience/formation/competence/langue/interet)
                ordre, données JSONB
templates       id, nom, style, aperçu_url, disponible_free (bool)
exports         id, cv_id, type (pdf/partage), created_at
```

---

## Règles métier critiques

- Un CV = une page par défaut, 2 pages maximum (les recruteurs ne lisent pas plus)
- Template "Stage" : force 1 page quelle que soit la quantité de données
- Pas de photo obligatoire (choix de l'utilisateur, certains recruteurs locaux la demandent)
- Toutes les données sont sauvegardées automatiquement à chaque champ rempli
- Le PDF est généré en A4 210×297mm, optimisé impression et envoi email
- Langue du CV : uniquement français en v1 (anglais en v2)
- Aucune donnée de CV n'est partagée avec des tiers

---

## Monétisation MVP

| Plan | Limite | Prix |
|---|---|---|
| Gratuit | 1 CV actif, 2 templates (Classique + Stage), export avec watermark discret | 0 FCFA |
| Premium | CVs illimités, 6 templates, sans watermark, export illimité | 500 FCFA/CV ou 2 000 FCFA/mois |
| Étudiant | Premium avec justificatif étudiant | 1 000 FCFA/6 mois |

---

## Ce qui est EXCLU du MVP v1
- Suggestions IA pour améliorer le résumé (v2)
- Analyse du CV vs une offre d'emploi (v2)
- Portfolio en ligne (URL publique) (v2)
- Lettre de motivation (v2)
- CV en anglais (v2)
- Partage direct avec des recruteurs partenaires (v2)

---

---

## TABLEAU COMPARATIF DES 4 MVP

| Critère | Rondo | Kassa | Krédi | Vitae |
|---|---|---|---|---|
| **Écrans v1** | 18 | 16 | 17 | 20 |
| **Complexité** | Moyenne | Faible | Faible | Moyenne |
| **Temps de build estimé** | 8-10 semaines | 5-6 semaines | 6-7 semaines | 7-9 semaines |
| **Dépendances externes** | SMS/notifs | Aucune | WhatsApp lien | PDF engine |
| **Plan gratuit** | 1 tontine/10 membres | 30 transactions | 10 créances | 1 CV + watermark |
| **Prix plan de base** | 1 500 FCFA/mois | 1 000 FCFA/mois | 2 000 FCFA/mois | 500 FCFA/CV |
| **Utilisateurs solo ?** | Non (groupe) | Oui | Oui | Oui |
| **Hors-ligne ?** | Partiel | Oui | Oui | Oui (saisie) |
| **MVP en 1er ?** | 3ème | 1er | 2ème | 4ème |

---

## ORDRE DE DÉVELOPPEMENT RECOMMANDÉ

```
Phase 1 (Mois 1-2)   → KASSA
                         Moins de complexité, besoin quotidien, validation rapide
                         du marché, zéro dépendance externe

Phase 2 (Mois 2-4)   → KRÉDI
                         Complément naturel de Kassa, mêmes utilisateurs,
                         partagent déjà l'app → upsell naturel

Phase 3 (Mois 3-5)   → VITAE
                         Marché différent (jeunes diplômés), monétisation
                         immédiate à l'acte, viralité naturelle

Phase 4 (Mois 5-8)   → RONDO
                         Plus complexe (multi-utilisateurs, temps réel),
                         mais marché le plus large et potentiel le plus fort
```

---

## STACK TECHNIQUE DÉTAILLÉE (commune)

```
Frontend
  Flutter (stable channel)
  go_router (navigation)
  Riverpod (state management)
  drift / sqflite (stockage local offline-first)
  supabase_flutter (client Supabase)
  pdf + printing (génération PDF — Vitae, Kassa)
  Lottie (animations onboarding)

Backend
  Supabase
    ├── PostgreSQL (base de données)
    ├── Auth (OTP SMS via Twilio)
    ├── Realtime (Rondo — mises à jour live)
    ├── Storage (photos profil, PDFs)
    └── Edge Functions (logique métier complexe)

Notifications
  Firebase Cloud Messaging (in-app)
  Twilio SMS (rappels critiques)

Paiements (v2)
  Wave CI API
  Orange Money CI API

Déploiement
  Flutter build (builds iOS + Android + Web)
  App Store Connect + Google Play Console
  Vercel (landing pages, webhooks)

Analytics
  PostHog (events, funnels, rétention)
```

---

*Document produit pour The Everyday Co. — Daniel | Juillet 2026*
