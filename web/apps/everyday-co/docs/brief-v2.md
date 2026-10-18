# Brief vibecoding — Site The Everyday Co (v2)

17 octobre 2026 · Daniel

**Objectif** : faire passer le site de deux apps à une seule (Vitae), corriger les chiffres et les promesses, et le préparer pour les écoles et partenaires. À livrer avant le 9 novembre 2026.

## Contexte

Le site : https://the-everyday-co.vercel.app, une page unique (Next.js, Vercel) qui présente le studio d'apps The Everyday Co. Son public n'est plus les jeunes utilisateurs (ils vont directement sur Vitae) mais les écoles, partenaires, journalistes et investisseurs.

### Décidé le 17 octobre 2026

- Vitae est la seule app active. Hive est archivé et disparaît du site.
- L'équipe est présentée comme « une petite équipe à Abidjan, menée par sa fondatrice ». Aucun nom autre que celui de la fondatrice n'apparaît.
- Le premier CV Vitae est gratuit pour toujours ; des options payantes viendront (CV ciblé à 500 F, Pass Candidature 30 jours à 2 000 F).
- Chaque chiffre affiché cite sa source.

### Règles pour l'agent

1. Conserver le design, la typographie, les couleurs et la structure des composants existants. On change le contenu, on retire Hive, on ajoute peu.
2. Reprendre les textes de la section « Nouveaux textes » mot pour mot. Si un texte ne tient pas dans un composant, signaler plutôt que réécrire.
3. Ne créer aucun faux contenu : pas de témoignage, logo partenaire, compteur d'utilisateurs ou statistique sans source.
4. Pages légères : chargement correct en 3G sur Android d'entrée de gamme ; images en formats modernes et dimensionnées.
5. Livrer en petites étapes vérifiables, dans l'ordre des priorités.

## Changements par priorité

Les P0 avant le 9 novembre ; les P1 dans la foulée, avant la première rencontre avec une école.

| # | Priorité | Changement | Où |
|---|---|---|---|
| 1 | P0 | Retirer Hive partout : menu, visuel du héros, carte « Nos applications », appel à l'action de bas de page, pied de page, métadonnées | Toute la page |
| 2 | P0 | Remplacer les statistiques non sourcées par quatre chiffres sourcés, un lien par chiffre | « Pourquoi maintenant » |
| 3 | P0 | Remplacer « gratuit, téléchargement compris » par « premier CV gratuit pour toujours » | Héros, carte Vitae, « Comment ça se finance » |
| 4 | P0 | Reformuler l'affirmation sur les logiciels de tri (ATS) | Problème 01, carte Vitae |
| 5 | P0 | Passer de « Une fondatrice » à « L'équipe » | Section fondatrice, menu |
| 6 | P0 | Un seul problème actif (le CV) ; caisse et tontine passent en « Ce qu'on étudie », la caméra disparaît | « Le problème » |
| 7 | P1 | Domaine propre et adresse e-mail sur ce domaine | Vercel, contact |
| 8 | P1 | Bouton « Suivre sur WhatsApp » vers la chaîne Vitae | « Et après ? », pied de page |
| 9 | P1 | Bloc « Écoles et partenaires » avec contact | Nouvelle section avant l'équipe |
| 10 | P1 | Pages « Mentions légales » et « Confidentialité » | Nouvelles pages, liens en pied de page |
| 11 | P1 | Mesure d'audience sans cookie publicitaire | Vercel |

## Nouveaux textes

L'ordre de la page reste le même, avec « Écoles et partenaires » ajoutée avant l'équipe. Les textes non cités restent inchangés.

### Menu
- Liens : Le problème · Vitae · Vision · Et après ? · Écoles · L'équipe
- Bouton : Ouvrir Vitae

### Héros (une seule image : celle de Vitae)
- Surtitre : Abidjan, Côte d'Ivoire · Emploi
- Titre : Les bons outils. Enfin faits pour ici.
- Sous-titre : Notre première app, Vitae, aide les jeunes à créer un CV pro depuis leur téléphone. Le premier CV est gratuit, pour toujours.
- Bouton principal : Créer mon CV avec Vitae
- Bouton secondaire : Le problème

### Le problème
- Titre : inchangé
- 01 — titre : Le CV qui ne passe pas
- 01 — texte : Un diplômé envoie trente candidatures et n'obtient aucune réponse. Souvent, ce n'est pas son parcours qui bloque : c'est un fichier mal construit, illisible pour le logiciel de tri ou pour le recruteur pressé.
- Intertitre : Ce qu'on étudie ensuite
- 02 et 03 (caisse, tontine) : inchangés
- À retirer : le bloc 04 « La caméra qui dort »

### Notre application
- Titre : Une app en ligne. Les suivantes quand elles seront prêtes.
- Chapô : Chaque application règle un seul problème, complètement. La première s'attaque à l'emploi.
- Carte — étiquettes : En ligne · Emploi
- Carte — titre : Vitae
- Carte — accroche : Le CV qui passe les filtres.
- Carte — texte : Dans les grandes entreprises, un logiciel lit souvent votre CV avant un humain. Vitae guide la rédaction section par section, note le CV en direct et produit un PDF propre que le logiciel comme le recruteur savent lire.
- Puces : Premier CV gratuit pour toujours, modifiable à volonté · 8 modèles relus automatiquement avant d'être proposés · Score et conseils de correction en direct · Offres de stage et de premier emploi en Côte d'Ivoire, mises à jour chaque jour
- Lien : Ouvrir Vitae

### Vision et mission
Inchangées.

### Et après ?
- Étape 1 : Aujourd'hui · fait — **Vitae en ligne.** Le CV et les offres d'emploi, depuis le téléphone.
- Étape 2 : Prochains mois — **Faire la preuve de l'usage.** Mesurer ce qui compte : combien de CV sont menés jusqu'au téléchargement, et combien aident à décrocher un entretien.
- Étape 3 : Ensuite — **Le deuxième problème.** Le même travail sur un autre problème du quotidien, annoncé quand il est prêt.
- Bouton : Suivre sur WhatsApp
- Texte sous le bouton : Une annonce quand une nouvelle app sort. Rien d'autre.

### Pourquoi maintenant
Titre inchangé. Quatre chiffres :

| Chiffre | Légende | Source |
|---|---|---|
| 13,4 M | internautes en Côte d'Ivoire (octobre 2025) | DataReportal — https://datareportal.com/reports/digital-2026-cote-divoire |
| 8,4 M | utilisateurs actifs des réseaux sociaux | DataReportal — même lien |
| 142 863 | candidats aux concours de la fonction publique en 2025 | Afrique-sur7 — https://www.afrique-sur7.fr/fonction-publique-48-353-admis-en-cote-divoire-en-2025 |
| 64 081 | étudiants inscrits à l'Université Félix Houphouët-Boigny | AIP via Abidjan.net — https://news.abidjan.net/articles/467032/pres-de-90-561-etudiants-inscrits-dans-les-universites-publiques |

### Comment ça se finance
Le premier CV est gratuit, pour toujours. Plus tard, deux options payantes, à prix affiché et sans abonnement caché : des versions supplémentaires du CV, ciblées sur une offre, et un pass de candidature de 30 jours. Les écoles pourront aussi équiper leurs promotions.

### Écoles et partenaires (nouvelle section)
- Surtitre : Écoles et partenaires
- Titre : Des promotions dont les CV sont prêts le jour du forum.
- Texte : Nous animons des ateliers CV dans les écoles d'Abidjan : en deux heures, chaque étudiant repart avec un CV propre, fait sur son téléphone. Votre école, votre association ou votre programme d'insertion veut en organiser un ?
- Bouton : Organiser un atelier — ouvre un e-mail vers l'adresse de contact, objet « Atelier CV Vitae »

### L'équipe (remplace « Fondatrice »)
- Surtitre : Qui construit
- Titre : Une petite équipe à Abidjan, menée par sa fondatrice.
- Carte : photo actuelle · Bimata Débora Aurélie Bambara · Fondatrice · Abidjan, Côte d'Ivoire
- Liens : Profil LinkedIn · Nous écrire (adresse sur le domaine)

### Bas de page
- Appel à l'action : seulement le bloc Vitae — « Votre prochain emploi commence par un CV qu'on peut lire. Vitae est en ligne, et le premier CV est gratuit. Ouvrir Vitae → »
- Liens : Vitae · Vision · Écoles · WhatsApp · LinkedIn · Contact · Mentions légales · Confidentialité
- Ligne finale : © 2026 The Everyday Co. · Abidjan, Côte d'Ivoire · Bâtisseurs de solutions du quotidien

## Technique

**Domaine et e-mail.** Choisir et acheter le domaine (theeverydayco.ci ou theeverydayco.com), le relier au projet Vercel, rediriger the-everyday-co.vercel.app vers lui en redirection permanente. Créer contact@[domaine] et remplacer partout l'adresse Gmail.

**Métadonnées**

| Balise | Contenu |
|---|---|
| title | The Everyday Co. — Des apps pour l'Afrique qui avance |
| meta description | The Everyday Co. construit des applications simples pour les jeunes et les petites activités d'Afrique de l'Ouest. Première app : Vitae, le CV pro depuis le téléphone, premier CV gratuit. |
| og:description / twitter:description | Des apps pour l'Afrique qui avance. Un problème. Une app. Réglé. (inchangé) |
| canonical | https://[domaine] |

Ajouter sitemap.xml et robots.txt pointant vers le nouveau domaine.

**Mesure.** Vercel Web Analytics (sans cookie publicitaire). Trois clics comme événements : `open_vitae`, `whatsapp_follow`, `school_contact`. Les liens vers Vitae portent `?ref=everydayco`.

**Pages légales.**
- `/mentions-legales` : raison sociale, forme, capital, RCCM, siège, directrice de publication, hébergeur (Vercel). Champs entre crochets tant que la société n'est pas immatriculée.
- `/confidentialite` : le site ne collecte que des statistiques de visite anonymes ; renvoyer vers la politique de Vitae pour les données des CV.

**Performance.** Images du héros et de la carte Vitae en WebP ou AVIF, largeur maximale servie 1 600 px, chargement différé sous la ligne de flottaison. Supprimer les images de Hive du dépôt public.

## Archivage de Hive

On garde le code et la base ; on remplace ce que voit le public par une page d'attente honnête.

1. Supprimer ou masquer toutes les annonces fictives (ou statut `archived`). Aucune annonce visible.
2. Remplacer toutes les routes publiques (`/`, `/annonces`, `/publier`, `/messages`, `/compte`) par une page unique :
   - Titre : Hive fait une pause.
   - Texte : On a construit Hive pour que le matériel audiovisuel qui dort trouve preneur à Abidjan. On le reprendra quand on pourra le faire bien : loueurs vérifiés, cautions, contrats.
   - Champ : Ton numéro WhatsApp (pour être prévenu au retour)
   - Case à cocher, décochée par défaut : J'accepte d'être contacté une seule fois, au retour de Hive.
   - Bouton : Me prévenir
   - Lien : En attendant, découvre Vitae →
3. Stocker les inscriptions dans une table `waitlist` (numéro, date, consentement, produit = `hive`), sans autre usage.
4. Bloquer les inscriptions et la publication d'annonces côté serveur.
5. Métadonnées : title « Hive — en pause », `noindex`.
6. Noter dans le README ce qui a été appris et les conditions de réouverture.

## Critères de recette

Vérifiés sur un Android d'entrée de gamme et sur un ordinateur.

- [ ] Une recherche du mot « Hive » dans le code de la page ne renvoie rien (hors historique Git)
- [ ] Aucun chiffre sans lien vers sa source
- [ ] Aucune adresse Gmail visible ; contact@[domaine] fonctionne et reçoit un e-mail test
- [ ] « Organiser un atelier » ouvre un e-mail avec l'objet « Atelier CV Vitae »
- [ ] « Suivre sur WhatsApp » ouvre la chaîne Vitae
- [ ] Tous les liens vers Vitae portent ?ref=everydayco
- [ ] Les trois événements de mesure remontent dans Vercel Analytics
- [ ] L'ancienne adresse vercel.app redirige vers le nouveau domaine
- [ ] Mentions légales et Confidentialité existent et sont liées en bas de page
- [ ] Pas de défilement horizontal à 360 px de large
- [ ] Hive : aucune annonce visible, la page d'attente enregistre un numéro avec consentement, la publication est refusée côté serveur
