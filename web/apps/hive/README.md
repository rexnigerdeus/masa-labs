# Hive — en pause

Hive (location et vente de matériel audiovisuel, son et lumière à Abidjan)
est en pause depuis le **17 octobre 2026**. Vitae est désormais la seule app
active de The Everyday Co. On garde le code et la base ; le public ne voit
plus qu'une page d'attente.

## Ce que voit le public

Une page unique, `/` : « Hive fait une pause. », un champ pour laisser son
numéro WhatsApp avec une case de consentement décochée par défaut, et un lien
vers Vitae. Toute autre route (`/annonces`, `/publier`, `/messages`,
`/compte`, `/connexion`, `/api/…`) y est renvoyée en 307 par
[middleware.ts](middleware.ts). Le titre est « Hive — en pause » et tout est
en `noindex` (balise et en-tête `X-Robots-Tag`), sans plan du site.

## Les verrous

1. **Routes** : le middleware redirige tout vers `/`.
2. **Actions serveur** : chaque action d'écriture commence par
   `refuseWhilePaused()` ([lib/pause.ts](lib/pause.ts)). Une action reste
   appelable par son identifiant même quand plus aucune page ne l'affiche.
3. **Base** : [supabase/en-attente/20261018100000_hive_pause.sql](../../../supabase/en-attente/20261018100000_hive_pause.sql)
   masque toutes les annonces (`suspendu`), crée la table `waitlist` et pose
   des politiques RLS restrictives sur les insertions (annonces, profils,
   commandes, conversations, messages, photos) et sur la mise à jour des
   annonces. **À appliquer après accord de Daniel.**

Les inscriptions Supabase Auth restent ouvertes, parce que l'authentification
est partagée avec Vitae et Sowly : un compte Hive n'existe que par sa ligne
`hive_profiles`, et c'est elle qui est fermée.

La liste d'attente (`waitlist`, produit `hive`) ne se lit qu'au SQL Editor.
Elle ne sert qu'à une chose : prévenir une seule fois chaque inscrit au retour
de Hive.

## Ce qu'on a appris

_À compléter par Daniel à partir du dossier stratégique._ Ce que le code
permet d'affirmer :

- Le produit était complet côté technique : annonces avec photos, recherche
  par commune et catégorie, demandes de réservation avec dates, messagerie,
  signalements, total recalculé côté serveur.
- Ce qui manquait relevait de la confiance, pas du logiciel : rien ne
  vérifiait les loueurs, rien ne protégeait le matériel prêté (pas de
  caution), rien ne fixait les engagements des deux parties (pas de contrat).
- Le catalogue de lancement reposait sur trente annonces de démonstration,
  masquées par la migration de pause.

## Conditions de réouverture

Celles annoncées publiquement sur la page d'attente :

- **loueurs vérifiés** ;
- **cautions** ;
- **contrats**.

_Les autres conditions (volume, équipe, financement) sont à reprendre du
dossier stratégique._

## Rouvrir, techniquement

1. Passer `HIVE_PAUSED` à `false` dans [lib/pause.ts](lib/pause.ts) et retirer
   les appels à `refuseWhilePaused()`.
2. Restaurer `middleware.ts`, `app/page.tsx`, `app/layout.tsx`,
   `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`,
   `app/opengraph-image.tsx`, `next.config.ts` et `public/sw.js` depuis le
   commit qui précède la pause (`git log -- web/apps/hive`).
3. Supprimer les politiques restrictives (bloc « Réouverture » en fin de
   migration) et réactiver les annonces une à une, après vérification des
   loueurs.
4. Prévenir les inscrits de `waitlist` (produit `hive`), une seule fois, puis
   supprimer leurs lignes.
