# Vitae — Checklist de pré-publication App Store

> Checklist complète pour valider que tout est prêt avant la soumission App Store Connect.

---

## ✅ Étape 1 — Icône & Assets (FAIT)

- [x] Icône source `assets/images/icon.png` (1254×1254) fournie
- [x] Script `tools/propagate_brand_assets.py` créé
- [x] 14 icônes iOS générées dans `AppIcon.appiconset/`
- [x] 5 icônes Android `mipmap-*/ic_launcher.png` générées
- [x] 5 foregrounds Android `ic_launcher_foreground.png` générés
- [x] `Contents.json` iOS déjà configuré (référence les bons fichiers)

**Pour rejouer :** `python tools/propagate_brand_assets.py`

---

## ✅ Étape 2 — Contenu App Store Connect (FAIT)

- [x] `appstore/SUBMISSION.md` — Tous les éléments textuels
- [x] `appstore/app-store-connect.md` — Version copier-coller
- [x] `appstore/NOTES.md` — Notes pour l'équipe App Review
- [x] `appstore/SCREENSHOTS.md` — Spécifications des screenshots

| Élément | Valeur | Fichier |
|---|---|---|
| App Name | Vitae — CV professionnel | SUBMISSION.md |
| Subtitle | Créez votre CV en 3 minutes | SUBMISSION.md |
| Promotional Text | 101/170 car. | SUBMISSION.md |
| Description | ~3 200/4 000 car. | SUBMISSION.md |
| Keywords | 85/100 car. | SUBMISSION.md |
| Support URL | dailyco.influencemood.com/vitae/support.html | SUBMISSION.md |
| Marketing URL | dailyco.influencemood.com/vitae/ | SUBMISSION.md |
| Privacy URL | dailyco.influencemood.com/privacy.html | SUBMISSION.md |
| Copyright | 2026 The Everyday Co. | SUBMISSION.md |
| Primary Category | Business | SUBMISSION.md |
| Secondary Category | Productivity | SUBMISSION.md |
| Age Rating | 4+ | SUBMISSION.md |
| IAP | Aucun | SUBMISSION.md |

---

## ⬜ Étape 3 — Pages web (À vérifier)

- [ ] `site/index.html` — Page marketing (existe, vérifier le déploiement)
- [ ] `site/support.html` — Page support (existe, URL = `/vitae/support.html`)
- [ ] `site/privacy.html` — Politique de confidentialité (existe)
  - ⚠ Vérifier que le canonical de privacy.html pointe vers `/privacy.html` ou `/vitae/privacy.html` (cohérence)
- [ ] `site/sitemap.xml` — Sitemap (existe)
- [ ] `site/robots.txt` — Robots (existe)
- [ ] Déployer les pages sur `dailyco.influencemood.com/vitae/`

---

## ⬜ Étape 4 — Screenshots (À produire)

Voir `appstore/SCREENSHOTS.md` pour le détail.

- [ ] Créer un CV de démonstration complet (Awa Koné, Comptable junior)
- [ ] Capturer 6 screenshots minimum (1290×2796 px, iPhone 6.7")
- [ ] Ajouter les overlays texte
- [ ] (Optionnel) Capturer 3 screenshots iPad (2048×2732 px)

**Commande simulateur :**
```bash
open -a Simulator
flutter run -d "iPhone 15 Pro Max"
# Cmd+S dans le simulateur pour chaque capture
```

---

## ⬜ Étape 5 — Build & Archive iOS

```bash
cd /Users/MacBook/davinci-code/masa-labs/vitae
flutter clean
flutter pub get
flutter build ipa --release
```

Puis dans Xcode :
1. `open ios/Runner.xcworkspace`
2. Sélectionner le device « Any iOS Device (arm64) »
3. Product → Archive
4. Window → Organizer → Distribute App → App Store Connect

**Vérifications avant archive :**
- [ ] `flutter analyze` sans erreur
- [ ] Bundle ID = `co.everyday.vitae`
- [ ] Version = `1.0.0` (build `1`)
- [ ] Team de signing sélectionnée (The Everyday Co. / compte Apple Developer)
- [ ] Icônes présentes dans `AppIcon.appiconset` (14 fichiers)
- [ ] `Info.plist` — `CFBundleDisplayName` = `Vitae`

---

## ⬜ Étape 6 — App Store Connect

1. **Créer une nouvelle app** dans App Store Connect
   - Plateforme : iOS
   - Nom : `Vitae — CV professionnel`
   - Langue principale : Français
   - Bundle ID : `co.everyday.vitae` (depuis le compte developer)
   - SKU : `vitae_v1`

2. **Remplir les informations** (depuis `appstore/app-store-connect.md`)
   - [ ] App Name, Subtitle, Promotional Text
   - [ ] Description, Keywords
   - [ ] Support URL, Marketing URL, Privacy Policy URL
   - [ ] Copyright
   - [ ] Categories (Business / Productivity)
   - [ ] Age Rating (4+ — répondre Non à toutes les questions)
   - [ ] Content Rights (Does not contain third-party content)

3. **Uploader le build**
   - [ ] Depuis Xcode Organizer → Distribute App → App Store Connect
   - [ ] Attendre le traitement (10-30 min, vérifier dans l'onglet « Build »)

4. **Ajouter les screenshots**
   - [ ] 6 screenshots iPhone 6.7" (1290×2796)
   - [ ] (Optionnel) 3 screenshots iPad 12.9" (2048×2732)

5. **App Review Information**
   - [ ] Coller le contenu de `appstore/NOTES.md`
   - [ ] Compte de test : `+225 07 00 00 00 01` / `AppleReview2026!`

6. **Soumettre pour revue**
   - [ ] Vérifier tous les champs
   - [ ] « Add for Review » → « Submit for Review »

---

## ⬜ Étape 7 — Après approbation

- [ ] Vérifier la disponibilité sur l'App Store
- [ ] Tester le lien marketing
- [ ] Partager l'annonce (réseaux, site)

---

## Récapitulatif des fichiers créés

```
vitae/
├── appstore/
│   ├── SUBMISSION.md          ← Tous les éléments textuels
│   ├── app-store-connect.md   ← Version copier-coller
│   ├── NOTES.md               ← Notes pour App Review + compte de test
│   └── SCREENSHOTS.md         ← Spécifications des screenshots
└── tools/
    └── propagate_brand_assets.py  ← Script de génération d'icônes
```