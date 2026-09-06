# Hive — Brief Projet
## Plateforme de mise en relation et location d'équipements audiovisuels, sonorisation & musique

---

## 1. Contexte & Vision

Hive est une PWA (Progressive Web App) qui met en relation particuliers et professionnels de l'audiovisuel, de la sonorisation et de la musique à Abidjan, pour la **location**, la **vente** (neuf/occasion) et la **mise en relation avec des prestataires de services**.

Positionnement : un "Vinted" du matériel audiovisuel, doublé d'une place de marché de services (techniciens son, DJ, cadreurs, photographes, monteurs, etc.).

**Objectif de lancement** : mise en ligne rapide, adoption locale à Abidjan, priorité à un MVP fonctionnel plutôt qu'à l'exhaustivité.

---

## 2. Cibles

- **Particuliers** possédant du matériel (caméras, enceintes, éclairages, instruments) qu'ils veulent louer ou vendre.
- **Prestataires professionnels** (studios, techniciens, DJ, photographes/vidéastes) qui veulent un profil pro pour être visibles et répondre à des besoins.
- **Clients organisateurs** (particuliers ou entreprises : mariages, événements, tournages, soirées) cherchant du matériel ou un prestataire.

---

## 3. Fonctionnalités MVP (priorisées pour un lancement rapide)

### 3.1 Comptes & profils
- Inscription/connexion (email + téléphone, OTP via Supabase Auth)
- Profil utilisateur standard (particulier)
- Profil professionnel optionnel (activable depuis le compte) : présentation, catégories de services, portfolio photos, zone d'intervention

### 3.2 Annonces matériel
- Créer une annonce : photos, titre, catégorie, état (neuf/occasion), mode (location et/ou vente), prix (jour/semaine pour location, prix fixe pour vente), disponibilité, localisation (commune)
- Recherche & filtres (catégorie, commune, prix, mode location/vente, disponibilité)
- Fiche annonce détaillée + contact/réservation

### 3.3 Réservations & commandes
- Demande de réservation avec dates (location) ou demande d'achat (vente)
- Statuts de commande simples : demandée → confirmée → en cours → terminée
- Espace "Mes commandes" (en tant que client) et "Mes annonces / commandes reçues" (en tant que loueur/vendeur)

### 3.4 Demandes de besoin ("appels d'offres" clients)
- Un client publie un besoin (ex: "sonorisation pour mariage 150 invités, budget X, date Y, commune Z")
- Les profils pros/loueurs pertinents peuvent répondre avec une offre
- Le client compare les réponses et échange via messagerie

### 3.5 Messagerie
- Chat simple entre client et loueur/prestataire, lié à une annonce ou une demande

### 3.6 Annuaire des professionnels
- Liste/recherche des profils pros par catégorie et commune
- Contact direct depuis le profil

### 3.7 Paiement
- **Les deux modes dès le lancement** : paiement en ligne (Mobile Money — Orange Money/MTN/Wave — et carte) ET paiement en main propre à la remise du matériel.
- Le loueur/vendeur choisit, par annonce ou par défaut sur son profil, les modes de paiement qu'il accepte.
- Le client choisit son mode de paiement au moment de la demande de réservation/achat.
- Intégration recommandée : agrégateur de paiement local compatible Mobile Money (ex. CinetPay, PayDunya ou équivalent) via webhook vers Supabase pour mettre à jour le statut de la commande.

### 3.8 Modération
- **Publication immédiate** des annonces et profils pros — pas de validation manuelle bloquante au lancement (pour ne pas freiner l'adoption).
- Contrôle a posteriori : signalement par les utilisateurs + tableau de modération simple (admin) pour retirer une annonce/profil en cas d'abus.

### 3.9 Non prioritaire pour le lancement (V2)
- Système d'avis/notation
- Application mobile Flutter
- Assurance/caution en ligne, contrats automatisés

---

## 4. Stack technique

| Composant | Choix |
|---|---|
| Frontend | Next.js (PWA — manifest, service worker, installable) |
| Hébergement/déploiement | Vercel |
| Backend/BDD | Supabase (Postgres, Auth, Storage pour photos, Row Level Security) |
| Auth | Supabase Auth (email/téléphone + OTP) |
| Stockage médias | Supabase Storage |
| Messagerie | Supabase Realtime (chat) |
| Langue | Français (seule langue au lancement) |

### Modèle de données (esquisse)
- `users` (profil de base + rôle particulier/pro)
- `pro_profiles` (catégories, zone, portfolio, modes de paiement acceptés)
- `listings` (annonces matériel : `mode` = location / vente / les deux, prix location + prix vente si les deux, état, photos, commune, statut = publié directement)
- `service_requests` (demandes de besoin client)
- `offers` (réponses des pros aux demandes)
- `orders` (réservations/commandes ; `payment_method` = en_ligne / main_propre ; `payment_status` ; statuts de commande)
- `payments` (transactions en ligne : référence agrégateur, montant, statut webhook)
- `messages` (chat lié à listing/request/order)
- `categories` (matériel audiovisuel, son, éclairage, instruments, services)
- `reports` (signalements pour modération a posteriori)

---

## 5. Palette de couleurs — tons rouges agréables

Palette chaude, énergique mais douce, adaptée à une identité visuelle premium sans agressivité.

| Rôle | Nom | Hex | Usage |
|---|---|---|---|
| Primaire | Rouge Bordeaux | `#9A2B32` | Boutons principaux, header, éléments de marque |
| Primaire clair | Rouge Brique | `#C1443D` | Hover, accents secondaires |
| Accent chaud | Corail doux | `#E4735E` | Badges, highlights, call-to-action secondaires |
| Neutre chaud | Sable rosé | `#F4E4DE` | Fonds de section, cartes |
| Fond clair | Blanc cassé | `#FDF8F6` | Fond principal de l'app |
| Texte principal | Anthracite chaud | `#2E2321` | Texte, titres |
| Texte secondaire | Brun grisé | `#6B5A56` | Texte secondaire, légendes |
| Succès/confirmation | Vert olive doux | `#7A8B5C` | États validés (contraste volontaire avec le rouge) |

Cette palette reste dans un registre chaleureux (bordeaux/brique/corail) qui évoque l'énergie de l'événementiel et de la musique, sans tomber dans un rouge criard.

---

## 6. Plan de lancement immédiat — adoption Abidjan

1. **Pré-lancement (semaine 1-2)** : recruter 20-30 premiers loueurs/pros (studios photo-vidéo, DJ, sonorisateurs connus) en direct pour peupler la plateforme avant l'ouverture publique.
2. **Canaux d'acquisition locaux** : groupes WhatsApp événementiel/photographes/DJ à Abidjan, pages Facebook/Instagram spécialisées, bouche-à-oreille dans les communes à forte activité événementielle (Cocody, Marcory, Yopougon).
3. **Incitation au lancement** : mise en avant gratuite des premières annonces, absence de commission pendant une période de lancement.
4. **PWA "installable"** : mettre en avant l'installation sur écran d'accueil (pas de téléchargement store, adapté à la faible bande passante).
5. **Support client rapide** : ligne WhatsApp Business pour lever les frictions à l'usage pendant les premières semaines.

---

## 7. Décisions actées

- **Location + vente dès le lancement** : une annonce peut être en location, en vente, ou les deux ; le formulaire de création d'annonce doit permettre de cocher un ou les deux modes.
- **Paiement double** : en ligne (Mobile Money/CB via agrégateur) et main propre, au choix du loueur/vendeur et du client. Le MVP doit inclure l'intégration d'un agrégateur de paiement local dès le départ (pas une V2).
- **Publication immédiate sans modération bloquante** : priorité à la fluidité d'adoption ; prévoir un bouton "signaler" sur chaque annonce/profil et une vue admin basique pour traiter les signalements.

Le brief est prêt pour un développement en vibe coding (Next.js PWA + Supabase + Vercel), avec le modèle de données, la palette et les priorités MVP ci-dessus comme base de prompt.
