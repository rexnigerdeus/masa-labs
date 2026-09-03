# Vitae — Notes pour l'équipe de revue App Review

VITAE v1.0.0 — Bundle ID : co.everyday.vitae

COMPTE DE TEST
Téléphone : +225 07 00 00 00 01
Mot de passe : AppleReview2026!
(Pas de vérification SMS/email — inscription immédiate.)

COMMENT TESTER (3 min)
1. Lancez l'app → écran de bienvenue.
2. Connectez-vous avec le compte ci-dessus (ou créez un compte : numéro ivoirien +225 XX XX XX XX XX + mot de passe).
3. Dashboard → « Créer un CV ».
4. Remplissez les étapes : infos perso (Prénom, Nom, Ville « Abidjan »), titre « Comptable junior », résumé, 1 expérience, 1 formation, 3 compétences, 2 langues.
5. Template : « Classique » (ATS ✓).
6. Aperçu : le badge Score ATS s'affiche. Si ≥ 80, « Exporter » est actif.
7. Export PDF → partage (WhatsApp, Email).
8. « Conseils » depuis le dashboard : conseils de rédaction.
9. Paramètres : profil, déconnexion.

PARTICULARITÉS TECHNIQUES
• Auth par pseudo-email « {tel}@everyday.co » (Supabase). Aucun email envoyé — le téléphone est l'identité.
• Hors-ligne : rédaction et export PDF sans connexion. Sync cloud si connecté.
• PDF généré côté client (package Flutter pdf + printing). Aucun serveur.
• Score ATS calculé localement (règles déterministes, sans ML).
• Langue : français uniquement.

PAIEMENT
Entièrement gratuit en v1.0. Aucun IAP, aucun abonnement. L'écran « Premium » affiche les futurs plans mais aucun achat n'est possible (boutons désactivés).

PERMISSIONS
Aucune permission système demandée (pas de caméra, micro, contacts, localisation, photos). Le partage du PDF utilise la system share sheet.

DONNÉES
Aucune donnée bancaire. Le champ « Photo » du CV est optionnel (URL d'une photo en ligne, rien n'est stocké sur l'appareil). Données du CV stockées localement (drift/sqflite) + sync Supabase si connecté.

LIENS
Marketing : https://dailyco.influencemood.com/vitae/
Support : https://dailyco.influencemood.com/vitae/support.html
Confidentialité : https://dailyco.influencemood.com/privacy.html

CONTACT
The Everyday Co. — hello@everyday.co