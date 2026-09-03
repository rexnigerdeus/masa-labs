# In-App Purchase — Configuration Guide (Rondo)

Apple rejected v1.0 (3) under **Guideline 3.1.1** because the paywall offered
external payment (Wave / Orange Money) instead of In-App Purchase. This guide
explains the fix and the App Store Connect setup.

## Résumé du fix

1. **Paywall refactoré** : `lib/features/tontines/screens/paywall_screen.dart`
   ne propose plus de paiement externe. Les deux plans payants (Standard & Pro)
   sont achetés via **StoreKit** (iOS) / Google Play Billing (Android).
2. **Service IAP** : `lib/features/tontines/services/iap_service.dart`
   - Initialise `InAppPurchase`
   - Écoute `purchaseStream` (purchased / restored / error / canceled)
   - Lance l'achat via `buyNonConsumable` (abonnement auto-renouvelable)
   - Active le plan en base Supabase (`rondo_subscriptions`) après succès
3. **Provider** : `iapServiceProvider` dans `core/providers.dart`
4. **Dépendance** : `in_app_purchase: ^3.2.3` dans `pubspec.yaml`

## Product IDs

| Plan       | Product ID                          | Type      |
|------------|-------------------------------------|-----------|
| Standard   | co.everyday.rondo.standard.monthly   | Auto-renewable subscription |
| Pro        | co.everyday.rondo.pro.monthly        | Auto-renewable subscription |

## Setup App Store Connect

1. App Store Connect → Mon app (Daily : Rondo)
2. Onglet **Monétisation → Abonnements**
3. Créer un **Groupe d'abonnement** nommé « Rondo Plans »
4. Ajouter 2 produits :

   ### Standard mensuel
   - Référence : `co.everyday.rondo.standard.monthly`
   - Durée : 1 mois
   - Niveau de prix : tier correspondant à ~1 500 FCFA (XOF)
     → Apple convertit automatiquement vers la devise du store
   - Description : « Tontines illimitées, jusqu'à 30 membres »
   - Screenhots de la paywall à joindre

   ### Pro mensuel
   - Référence : `co.everyday.rondo.pro.monthly`
   - Durée : 1 mois
   - Niveau de prix : tier correspondant à ~3 500 FCFA (XOF)
   - Description : « Tontines illimitées, membres illimités, rappels auto »
   - Screenhots de la paywall à joindre

5. **Texte de partage familial** : non autorisé (off par défaut)
6. **Politique de remboursement** : indiquer que les remboursements se gèrent
   via Apple (lien vers https://apple.com/legal/internet-services/itunes/dev/stdeula)
7. Mettre le statut des produits à « Prêt à soumettre »
8. Dans la soumission de l'app, sélectionner les 2 IAP à inclure au build

## Test local (StoreKit Configuration)

1. Xcode → File → New → File → StoreKit Configuration File
   - Nommer `RondoProducts.storekit`
   - Ajouter 2 auto-renewable subscriptions avec les IDs ci-dessus
   - Cocher "StoreKit Configuration" dans le Scheme → Run → Options
2. Lancer l'app en debug → le paywall charge les produits depuis le fichier
   local et les achats sont simulés gratuitement.

## Test avec Sandbox (App Store Connect)

1. App Store Connect → Utilisateurs et accès → Testeurs Sandbox
2. Créer un compte sandbox avec un email Apple sandbox
3. Sur l'iPhone/iPad de test, Settings → App Store → compte Sandbox
4. Lancer l'app → payer → valider que le plan s'active et que la
   restauration fonctionne.

## Notes

- Les `ProductDetails.price` du store remplacent le prix FCFA hardcodé
  dans `PlanService.getPlanFeatures` quand le store est disponible.
- Un bouton **« Restaurer mes achats »** est affiché (exigé par Apple).
- Le lien vers les conditions d'abonnement (EULA Apple) est inclus en bas
  de paywall.
- Les notifications serveur App Store (`/s2s`) sont laissées en TODO v2
  pour la validation serveur du reçu (le code client active déjà le plan
  au retour du `purchaseStream`, suffisant pour le MVP).

## Ce qui n'a PAS changé

- Les modes « Wave » et « Orange Money » dans l'enregistrement d'un
  paiement de tontine (`record_payment_screen.dart`) restent : ce sont
  des paiements **physiques** effectués en dehors de l'app, enregistrés
  manuellement par l'admin. Apple Guideline 3.1.1 ne s'applique pas :
  le contenu numérique de Rondo lui-même n'est pas payé par Wave/OM,
  ce sont les cotisations des membres (transactions peer-to-peer, pas
  vendues par l'app).