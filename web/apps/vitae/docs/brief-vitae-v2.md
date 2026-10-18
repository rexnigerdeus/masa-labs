# Brief vibecoding — Vitae (v2)

17 octobre 2026 · @Daniel

Objectif : rendre Vitae prêt pour le lancement à l'INJS le 10 novembre 2026, puis
pour les premières ventes dès l'ouverture du compte marchand Wave.

> Transcription du PDF remis le 18/10/2026. Les textes entre guillemets et dans les
> tableaux sont repris **mot pour mot** dans l'interface (règle 2).

## Contexte et règles pour l'agent de code

**L'app** : https://vitae-lemon.vercel.app, une PWA (Next.js sur Vercel, base
Supabase) de création de CV compatibles avec les logiciels de tri, avec des offres
d'emploi et des conseils. Routes existantes : `/`, `/cv`, `/offres`, `/conseils`,
`/compte`. Aujourd'hui, on crée un CV sans compte et on télécharge le PDF
gratuitement.

**Public** : étudiants et jeunes diplômés d'Abidjan, sur Android d'entrée de gamme,
souvent en 3G, avec un forfait data compté. Premier terrain : l'INJS (Marcory),
dont les étudiants visent stages, missions d'animation, clubs, associations et
enseignement.

### Règles commerciales décidées

- Le premier CV est gratuit pour toujours : modifications, changements de modèle et
  téléchargements illimités.
- Une version supplémentaire du CV coûte 500 FCFA.
- Le Pass Candidature coûte 2 000 FCFA pour 30 jours, sans renouvellement
  automatique.
- Le Pass Accompagnement (3 000 FCFA) n'est pas construit maintenant.
- Pas de vente tant que la société n'a pas de compte marchand : d'ici là, des
  listes d'attente.

### Règles pour l'agent

1. Ne rien casser du parcours actuel : un visiteur doit toujours pouvoir créer et
   télécharger son premier CV sans compte.
2. Reprendre les textes de ce brief mot pour mot ; signaler ceux qui ne tiennent
   pas dans l'interface.
3. Toutes les tables Supabase ont la sécurité au niveau des lignes (RLS) activée ;
   aucun secret côté client.
4. Prix affiché avant tout paiement ; aucun compte à rebours, aucune case
   précochée, aucun renouvellement caché.
5. Budget de poids : pas de nouvelle dépendance lourde sans le signaler ; PDF
   généré sous 300 Ko sans photo, sous 600 Ko avec photo (objectif à confirmer sur
   les PDF actuels).
6. Livrer lot par lot, en vérifiant le build à chaque étape.

## Lots de travail et échéances

| Lot | Contenu | Sections du brief | Échéance |
| --- | --- | --- | --- |
| A — Lancement | Textes et promesses, offres pour débutants, mesure, liens ambassadeurs, listes d'attente, chaîne WhatsApp, page confidentialité, domaine | Textes, Offres, Mesure, Listes d'attente | 9 novembre 2026 |
| B — Premières ventes | Compte par numéro de téléphone au 2e CV, versions de CV, droits d'accès, Pass Candidature, lettre de motivation par offre, paiement Wave, page Tarifs | Compte et paiement, Modèle de données | Construit avant le 13 décembre ; activé dès le compte marchand Wave ouvert |
| C — Plus tard | Alertes WhatsApp personnalisées, suivi des candidatures, préparation d'entretien, relecture humaine, espace école Vitae Campus | — | Après le bilan du 31 janvier 2027 |

## Textes à remplacer

L'app garde le vouvoiement (contexte professionnel) ; le tutoiement reste réservé
aux réseaux sociaux.

### Page d'accueil (lot A)

| Endroit | Texte actuel | Nouveau texte |
| --- | --- | --- |
| Surtitre du héros | Créer · Gratuit | Créer · Premier CV gratuit |
| Paragraphe d'ouverture (#tri) | Avant d'arriver sur le bureau d'un recruteur, la plupart des candidatures passent par un logiciel… | Dans les grandes entreprises, beaucoup de candidatures passent par un logiciel qui lit le fichier avant un recruteur. Ce qu'il ne comprend pas, il l'écarte. |
| Titre de section | Ce n'est pas votre parcours qu'on a refusé. C'est votre fichier qu'on n'a pas su lire. | Parfois, ce n'est pas votre parcours qu'on a refusé. C'est votre fichier qu'on n'a pas su lire. |
| Modèles, 2e phrase | Chaque modèle est relu par un logiciel de tri avant d'être proposé… | Chaque modèle est vérifié automatiquement : on relit le texte de chaque PDF produit, et un modèle qui ne se relit pas n'est pas proposé. |
| Titre « Ce que ça vous coûte » | Rien, et sans contrepartie cachée. | Votre premier CV : rien. Et sans contrepartie cachée. |
| Chiffre « 0 F » | Pour créer, corriger et télécharger le PDF | Pour votre premier CV : créer, corriger, télécharger, autant de fois que vous voulez |
| Encadré « Pourquoi c'est gratuit » — titre | Pourquoi c'est gratuit | Ce qui est gratuit, ce qui sera payant |
| Encadré — texte | À ce stade, ce qui compte… | Votre premier CV est gratuit pour toujours, avec les offres et les conseils. Bientôt, deux options pour ceux qui postulent beaucoup : une version supplémentaire de votre CV, ciblée sur un poste ou une offre, à 500 F ; et le Pass Candidature, 2 000 F pour 30 jours. Prix affiché avant paiement, sans abonnement. |
| Encadré — bouton (nouveau) | — | Me prévenir quand c'est disponible |
| Appel à l'action « Créer » | …le PDF sort gratuit et sans filigrane. | Votre CV, en quelques minutes et sans compte. Le formulaire vous guide, le score vous corrige. Le premier CV est gratuit, sans filigrane. |
| Pied de page | Création et téléchargement gratuits. | Premier CV gratuit pour toujours. |

### Écran après téléchargement (lot A, nouveau)

| Élément | Texte |
| --- | --- |
| Titre | Votre CV est prêt. |
| Texte | Vous pouvez le modifier et le télécharger de nouveau quand vous voulez, gratuitement. |
| Bloc 1 — titre | Des offres pour débutants, chaque jour |
| Bloc 1 — bouton | Rejoindre la chaîne WhatsApp Vitae |
| Bloc 2 — titre | Postuler maintenant |
| Bloc 2 — bouton | Voir les offres de stage et de premier emploi |

### Deuxième CV (lot B, nouveau)

S'affiche quand une personne qui a déjà un CV clique sur « Créer un nouveau CV ».

| Élément | Texte |
| --- | --- |
| Titre | Vous avez déjà votre CV gratuit |
| Texte | Vous pouvez le modifier gratuitement, autant que vous voulez. Une deuxième version, ciblée sur un autre poste ou sur une offre, coûte 500 F. |
| Bouton 1 | Modifier mon CV (gratuit) |
| Bouton 2 | Créer une version — 500 F |
| Lien | Je postule beaucoup : voir le Pass Candidature (2 000 F, 30 jours) |
| Si Wave n'est pas encore actif | Les boutons payants deviennent « Bientôt disponible — me prévenir » |

### Page Tarifs `/tarifs` (lot B, nouvelle)

| Offre | Texte de la carte | Bouton |
| --- | --- | --- |
| Gratuit | Un CV complet, modifiable à volonté. 8 modèles, score en direct, offres et conseils. Pour toujours. | Créer mon CV |
| CV ciblé — 500 F | Une version supplémentaire de votre CV, adaptée à un autre poste ou à une offre précise. Paiement unique. | Créer une version |
| Pass Candidature — 2 000 F / 30 jours | Versions ciblées illimitées et une lettre de motivation par offre, pendant 30 jours. Pas de renouvellement automatique : vous rachetez un pass si vous le souhaitez. | Prendre le pass |

Mention sous les cartes : « Paiement par Wave. Si votre document ne se génère pas
après paiement, écrivez-nous : nous vous remboursons. »

### Rappel de fin de pass (lot B)

Message dans l'app (et par WhatsApp quand ce canal sera branché), 3 jours avant la
fin : « Votre Pass Candidature se termine le [date]. Vos CV et lettres restent
accessibles et téléchargeables. Pour continuer à créer des versions, vous pourrez
reprendre un pass. »

## Offres d'emploi : sources, filtres, nettoyage (lot A)

Les 269 offres actuelles sont réelles mais surtout seniors, souvent classées
« Autre », et en grande partie collectées sur LinkedIn. Objectif : des offres pour
débutants, bien classées, venant de sources autorisées.

**1. Niveau et filtre par défaut**

- Ajouter un champ `level` : `stage`, `debutant`, `confirme`, `senior`, `inconnu`.
- Le calculer à l'import : mots du titre (stage, stagiaire, intern, junior,
  assistant, débutant → stage ou débutant ; senior, manager, directeur, head, lead,
  confirmé → confirmé ou senior) et expérience demandée dans la description
  (« 0 à 2 ans » → débutant).
- Vue par défaut de `/offres` : stage + débutant + inconnu. Bouton « Voir toutes
  les offres » pour le reste.

**2. Secteurs**

- Ajouter deux secteurs : « Éducation, sport et animation » et « Associatif et
  ONG » (utiles aux étudiants de l'INJS).
- Classer par mots-clés du titre et de l'entreprise. Cible : moins de 20 %
  d'offres en « Autre ».

**3. Villes**

- Normaliser vers une liste fixe : les communes d'Abidjan (Abobo, Adjamé,
  Attécoubé, Cocody, Koumassi, Marcory, Plateau, Port-Bouët, Treichville,
  Yopougon, plus Anyama, Bingerville, Songon), les grandes villes (Bouaké, Daloa,
  Korhogo, San-Pédro, Yamoussoukro…) et « Côte d'Ivoire, lieu non précisé ».
- Fusionner les doublons (« Côte d'ivoire », « Côte d'Ivoire ») et ranger les lieux
  détaillés (« PALM CI Village V2 », « VITIB ») dans leur commune ou ville.

**4. Sources**

- Arrêter la collecte automatisée sur LinkedIn, que ses conditions d'utilisation
  interdisent.
- Sources à privilégier : pages carrières publiques des entreprises, sites d'emploi
  dont les conditions et le `robots.txt` autorisent la reprise (à vérifier site par
  site, y compris Novojob), offres envoyées par les recruteurs, écoles et
  associations.
- Table `job_sources` : nom, URL, méthode, date de vérification des conditions. Une
  source sans vérification n'est pas collectée.
- Chaque offre affiche « Source : [nom] » et garde son lien d'origine.

**5. Fraîcheur et doublons**

- Masquer les offres de plus de 45 jours ou dont la date limite est passée.
- Dédoublonner à l'import sur (titre, entreprise, ville) normalisés.

**6. Formulaire « Publier une offre gratuitement » (`/publier-une-offre`)**

- Champs : entreprise, intitulé, type (stage / emploi), niveau, ville, secteur,
  lien ou e-mail de candidature, date limite, contact de l'annonceur (non publié).
- Statut `pending` à la création ; publication après validation manuelle dans une
  page d'administration protégée.

**7. Fiche offre** : sous le bouton « Postuler », un lien « Votre CV est-il
prêt ? » vers `/cv`.

## Mesure et liens ambassadeurs (lot A)

Sans ces mesures, la revue du lundi et les seuils du plan sont impossibles à lire.
Tout est stocké dans Supabase, sans donnée personnelle dans les événements.

**Identifiants**

- `anon_id` : identifiant aléatoire créé à la première visite et gardé dans le
  stockage local du navigateur.
- `ref` : code ambassadeur ou canal lu dans l'URL (`?ref=INJS-AMINA`,
  `?ref=tiktok`, `?ref=everydayco`). On garde le premier `ref` reçu pendant 30 jours.
- `utm_source`, `utm_campaign` : conservés s'ils sont présents.

**Événements à enregistrer**

| Événement | Déclenché quand | Propriétés | Lot |
| --- | --- | --- | --- |
| `cv_started` | Premier champ du CV rempli | modèle | A |
| `cv_section_completed` | Une section passe à « complète » | section | A |
| `cv_score_80` | Le score atteint 80 pour la première fois | — | A |
| `cv_pdf_downloaded` | Un PDF est généré | modèle, score, premier téléchargement oui/non | A |
| `offer_clicked` | Clic sur « Postuler » | id de l'offre, niveau, source | A |
| `whatsapp_channel_clicked` | Clic vers la chaîne WhatsApp | emplacement | A |
| `waitlist_joined` | Inscription à une liste d'attente | produit | A |
| `account_created` | Compte créé | — | B |
| `paywall_viewed` | Écran « 2e CV » ou page Tarifs affichés | contexte | B |
| `checkout_started` | Clic sur un bouton payant | offre | B |
| `payment_succeeded` / `payment_failed` | Retour de Wave | offre, montant | B |

Chaque événement porte aussi `anon_id`, `user_id` (vide sans compte), `ref`,
`utm_*`, la date et la version de l'app.

**Tableaux de bord**

- Page `/admin/stats`, réservée aux comptes administrateurs : pour chaque semaine,
  le nombre de personnes ayant atteint chaque étape (CV commencé, score 80, PDF
  téléchargé, retour sous 30 jours, achat), filtrable par `ref`.
- Le « retour sous 30 jours » se calcule côté serveur : un `anon_id` ou `user_id`
  revu plus de 24 heures après son premier téléchargement, dans les 30 jours.
- Page `/ambassadeur/[code]?t=[jeton]` : l'ambassadeur voit seulement son nombre de
  CV téléchargés cette semaine et au total. Le jeton secret est remis à la main.

**Gestion des codes** : table `ambassadors` (code, prénom, école, actif, jeton)
remplie depuis l'administration. Un code inconnu est quand même enregistré tel quel
dans `ref`.

## Compte, offres payantes et paiement Wave (lot B)

Le compte n'apparaît qu'au moment où il sert : créer un 2e CV ou acheter. Le
premier CV reste sans compte. Tout le lot B est construit derrière un interrupteur
`PAYMENTS_ENABLED` (variable d'environnement, `false` par défaut) : tant qu'il est
éteint, les boutons payants mènent à la liste d'attente.

**Compte**

- Connexion par numéro de téléphone et code à usage unique (authentification
  téléphone de Supabase). Elle nécessite un fournisseur SMS payant : chiffrer le
  coût par code envoyé avant de choisir. Solution de repli : lien de connexion par
  e-mail.
- À la création du compte, le CV gardé dans le navigateur est rattaché au compte et
  devient le CV gratuit (`is_primary`).
- Un seul CV gratuit par compte. On n'essaie pas d'empêcher quelqu'un de
  recommencer avec un autre numéro.

**Droits d'accès**

| Droit | Obtenu par | Permet | Après expiration |
| --- | --- | --- | --- |
| Gratuit | Par défaut | 1 CV principal, modifications et téléchargements illimités | — |
| Crédit CV | Achat à 500 F | Créer 1 version supplémentaire ; ensuite modifiable et téléchargeable sans limite | Le crédit est consommé à la création |
| Pass Candidature | Achat à 2 000 F | Pendant 30 jours : versions illimitées et une lettre de motivation par offre | Plus de nouvelle version ni de nouvelle lettre ; tout ce qui existe reste modifiable et téléchargeable |

Le contrôle se fait côté serveur, dans une fonction Postgres
`can_create_cv_version(user_id)`, jamais seulement dans l'interface.

**CV ciblé (une version)** : copie du CV principal, avec un intitulé de poste visé
et, si la personne part d'une offre, le lien vers cette offre. L'éditeur affiche les
mots importants de l'offre (titre, compétences répétées) et coche ceux déjà présents
dans le CV. Version 1 par règles simples, sans intelligence artificielle.

**Lettre de motivation (Pass)** : formulaire guidé (offre visée, pourquoi cette
structure, deux ou trois atouts choisis dans le CV, disponibilité) qui assemble une
lettre modifiable, exportée en PDF dans le style du modèle de CV.

**Paiement Wave**

1. Le serveur crée une ligne `payments` (statut `pending`), puis une session de
   paiement Wave avec le montant et l'identifiant du paiement comme référence.
2. La personne est redirigée vers Wave pour payer.
3. Un point d'entrée webhook reçoit la confirmation de Wave, **vérifie sa
   signature**, passe le paiement à `succeeded` et accorde le droit. L'opération est
   idempotente : un même webhook reçu deux fois n'accorde qu'un droit.
4. La page de retour interroge le statut du paiement ; elle n'accorde jamais de
   droit à elle seule.
5. Échec ou abandon : message clair, rien n'est accordé, la personne peut
   réessayer.
6. Remboursement : manuel depuis l'espace marchand Wave, puis action « retirer le
   droit » dans l'administration.

L'agent suit la documentation officielle de l'API Wave Business pour les adresses,
les champs et la vérification de signature ; il n'invente aucun détail d'API. Les
clés restent dans les variables d'environnement serveur.

**Parcours du 2e CV — aucun droit n'est accordé sans paiement confirmé par Wave**

```
2e CV demandé → Compte ? ─non→ Connexion par code ─→ Choisir : 500 F ou Pass
                   │oui                                      │
                   ↓                                         ↓
               Droit actif ? ─non→ Choisir : 500 F ou Pass → Paiements activés ?
                   │oui                                      │non → Liste d'attente
                   ↓                                         │oui
               Version créée ← Droit accordé (webhook) ← confirmé ← Paiement sur Wave
```

Un nouveau compte n'a aucun droit et passe directement au choix d'offre ; tant que
`PAYMENTS_ENABLED` est éteint, le parcours s'arrête à la liste d'attente.

## Modèle de données Supabase

Tables à créer ou compléter. L'agent inspecte d'abord le schéma existant et adapte
les noms plutôt que de dupliquer. RLS activée partout : chaque personne ne lit que
ses lignes ; les tables d'administration ne sont accessibles qu'au rôle
administrateur.

| Table | Colonnes clés | Lot | Remarques |
| --- | --- | --- | --- |
| `events` | id, name, anon_id, user_id, ref, utm_source, utm_campaign, props (json), app_version, created_at | A | Insertion seule côté client ; lecture réservée à l'administration |
| `ambassadors` | code, first_name, school, active, token, created_at | A | Gérée depuis l'administration |
| `waitlist` | id, product (`cv_cible`, `pass`, `concours`, `hive`), phone, consent, consent_at, created_at | A | Consentement obligatoire, case décochée par défaut |
| `job_sources` | id, name, url, method, terms_checked_at, active | A | Une source non vérifiée n'est pas collectée |
| `job_offers` (existante) | + level, sector normalisé, city normalisée, source_id, deadline, status (`published`, `pending`, `expired`) | A | Ajouter les colonnes, migrer les données |
| `cvs` | id, user_id, anon_id, is_primary, parent_cv_id, target_title, target_offer_id, template, data (json), created_at, updated_at | B | Un seul `is_primary` par user_id (contrainte unique partielle) |
| `cover_letters` | id, user_id, cv_id, offer_id, data (json), created_at | B | Création possible seulement avec un pass actif |
| `entitlements` | id, user_id, type (`cv_credit`, `pass_candidature`), credits_left, starts_at, ends_at, payment_id, revoked_at | B | Accordé uniquement par le webhook ou l'administration |
| `payments` | id, user_id, offer, amount_xof, provider (`wave`), provider_ref, status, raw_webhook (json), created_at | B | Montants en FCFA entiers |

Fonctions serveur : `can_create_cv_version(user_id)`,
`can_create_cover_letter(user_id)`, `grant_entitlement(payment_id)` (idempotente).

## Listes d'attente, WhatsApp, confidentialité (lot A)

**Listes d'attente.** Un composant unique réutilisé partout : champ numéro WhatsApp,
case de consentement décochée (« J'accepte d'être contacté par WhatsApp quand ce
service sera disponible. »), bouton « Me prévenir », message de confirmation
« C'est noté. Un seul message, le jour où c'est prêt. » Emplacements : encadré
tarifs de l'accueil, écran « 2e CV », et une page `/concours`.

**Page `/concours`** (mesure de la demande pour une future app)

| Élément | Texte |
| --- | --- |
| Titre | Préparer les concours, depuis votre téléphone |
| Texte | Nous préparons un outil de révision pour les concours de la fonction publique et des grandes écoles : un QCM par jour, des annales, des examens blancs. Dites-nous si cela vous intéresse. |
| Question (choix multiple) | Quel concours préparez-vous ? Fonction publique · Grandes écoles · Police ou gendarmerie · Enseignement · Autre |
| Formulaire | Composant liste d'attente, produit = `concours` |

**Chaîne WhatsApp.** Lien de la chaîne « Vitae — Stages & premiers emplois » dans
une variable de configuration ; boutons sur l'écran après téléchargement, sur
`/offres` et dans le pied de page.

**Confidentialité (`/confidentialite`)**

- Ce qui est collecté : contenu du CV, photo si ajoutée, numéro de téléphone si
  compte ou liste d'attente, statistiques d'usage sans donnée personnelle.
- Pourquoi : produire le CV, gérer le compte et les achats, prévenir les personnes
  inscrites.
- Ce qui n'est jamais fait : vendre ou partager les CV ; envoyer des messages
  publicitaires sans consentement.
- Durée de conservation, droit d'accès et de suppression, contact :
  `contact@[domaine]`. Autorité de contrôle : l'ARTCI.
- Bouton « Supprimer mon compte et mes CV » dans `/compte`, effectif immédiatement.

**Domaine.** Relier Vitae à son domaine (`[vitae.ci]` ou sous-domaine du site, à
décider) et rediriger `vitae-lemon.vercel.app` en redirection permanente.

## Critères de recette

Chaque lot est validé sur un Android d'entrée de gamme en 3G, puis sur ordinateur.

### Lot A — avant le 9 novembre

- [ ] Un visiteur sans compte crée un CV et télécharge le PDF, puis le modifie et le retélécharge, sans jamais voir de paiement
- [ ] Tous les textes de la section « Textes à remplacer » (lot A) sont en place
- [ ] `/offres` montre par défaut stages et offres pour débutants ; le bouton « Voir toutes les offres » fonctionne
- [ ] Moins de 20 % des offres publiées sont en « Autre » ; aucune ville en doublon dans le filtre
- [ ] Plus aucune offre collectée automatiquement sur LinkedIn ; chaque offre affiche sa source
- [ ] Le formulaire « Publier une offre gratuitement » crée une offre en attente, publiée seulement après validation
- [ ] En visitant avec `?ref=TEST-01`, puis en téléchargeant un CV, l'événement `cv_pdf_downloaded` porte `ref = TEST-01`
- [ ] `/admin/stats` affiche l'entonnoir de la semaine et le filtre par `ref` ; inaccessible sans compte administrateur
- [ ] `/ambassadeur/TEST-01?t=[jeton]` affiche le bon total ; un mauvais jeton ne montre rien
- [ ] Les listes d'attente refusent l'envoi sans consentement coché
- [ ] `/concours`, `/confidentialite` et la suppression de compte fonctionnent
- [ ] Les pages principales s'affichent en moins de 5 secondes en 3G simulée (objectif à mesurer et ajuster)

### Lot B — avant le 13 décembre

- [ ] Avec `PAYMENTS_ENABLED=false`, aucun paiement n'est possible et les boutons mènent à la liste d'attente
- [ ] La création de compte rattache le CV existant comme CV gratuit
- [ ] Un compte sans droit ne peut pas créer de 2e version, même en appelant directement l'API
- [ ] En mode test Wave : un paiement réussi accorde exactement un droit, même si le webhook arrive deux fois
- [ ] Un paiement échoué ou abandonné n'accorde rien et affiche un message clair
- [ ] Un pass expiré bloque les nouvelles versions et lettres, mais pas la modification ni le téléchargement des documents existants
- [ ] La page `/tarifs` affiche les prix et l'absence de renouvellement automatique
- [ ] L'administrateur peut retirer un droit après un remboursement
