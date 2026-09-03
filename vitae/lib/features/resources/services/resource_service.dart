import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/resource_model.dart';

/// Service pour les articles édifiants (Vitae)
class ResourceService {
  final SupabaseClient _client = Supabase.instance.client;

  /// Récupère tous les articles, optionnellement filtrés par catégorie
  Future<List<Resource>> getResources({ResourceCategory? category}) async {
    try {
      var query = _client
          .from('vitae_articles')
          .select()
          .order('published_at', ascending: false);

      final result = await query;

      var resources = (result as List)
          .map((e) => Resource.fromJson(e as Map<String, dynamic>))
          .toList();

      if (category != null) {
        resources = resources.where((r) => r.category == category).toList();
      }

      // Si Supabase ne renvoie rien, on utilise le fallback local
      if (resources.isEmpty) {
        return _fallbackResources(category: category);
      }

      return resources;
    } catch (_) {
      // En cas d'erreur réseau, fallback local
      return _fallbackResources(category: category);
    }
  }

  /// Récupère un article par ID
  Future<Resource?> getResource(String id) async {
    try {
      final result = await _client
          .from('vitae_articles')
          .select()
          .eq('id', id)
          .maybeSingle();

      if (result == null) {
        return _fallbackResources().firstWhere(
          (r) => r.id == id,
          orElse: () => _fallbackResources().first,
        );
      }
      return Resource.fromJson(result);
    } catch (_) {
      return _fallbackResources().firstWhere(
        (r) => r.id == id,
        orElse: () => _fallbackResources().first,
      );
    }
  }

  /// Articles de fallback (contenu local, toujours disponible)
  /// Sert aussi de contenu initial si la table Supabase est vide.
  List<Resource> _fallbackResources({ResourceCategory? category}) {
    final all = fallbackResources;
    if (category != null) {
      return all.where((r) => r.category == category).toList();
    }
    return all;
  }
}

/// Contenu éditorial de fallback — articles complets toujours disponibles
/// même hors-ligne ou si la table Supabase est vide.
final List<Resource> fallbackResources = [
  Resource(
    id: 'res-search-01',
    category: ResourceCategory.rechercheEmploi,
    title: 'Les 7 étapes d\'une recherche d\'emploi réussie en Côte d\'Ivoire (2026)',
    excerpt:
        'Une méthode structurée pour ne pas postuler au hasard : définissez votre cible, optimisez vos outils, activez votre réseau et suivez vos candidatures.',
    content: '''Une recherche d'emploi efficace n'est pas une question de chance, mais de méthode. Voici les 7 étapes qui maximisent vos chances sur le marché ivoirien en 2026.

**1. Définissez votre cible avec précision**
Ne dites pas "je cherche un boulot". Dites "je cherche un poste de comptable junior dans une PME à Abidjan, idéalement dans le secteur de la distribution". Plus vous êtes précis, plus vous pouvez adapter votre CV et cibler les bonnes entreprises. Notez par écrit : le poste visé, le secteur, la zone géographique et le salaire minimum acceptable. Cette cible devient votre filtre pour toutes vos actions.

**2. Préparez vos outils de candidature**
Votre CV doit être professionnel, clair et compatible ATS (score ≥ 80/100) pour ne pas être écarté par les logiciels de tri. Rédigez aussi un profil LinkedIn complet : photo professionnelle, titre clair, résumé, expériences détaillées. En 2026, la majorité des recruteurs à Abidjan consultent LinkedIn avant même de vous appeler. Préparez également une lettre de motivation courte et personnalisable.

**3. Activez votre réseau en priorité**
70% des opportunités ne sont jamais publiées en ligne. Dites à votre famille, vos amis, vos anciens camarades de promo et vos anciens collègues de stage que vous cherchez. Le bouche-à-oreille reste le canal le plus efficace en Côte d'Ivoire. Rejoignez les groupes WhatsApp et Facebook de votre filière et de votre école.

**4. Surveillez les bonnes plateformes**
Au-delà d'Emploi.ci et de YoungProfessional, consultez régulièrement : les pages LinkedIn des cabinets de recrutement (Michael Page, Manpower CI, Talent2Africa), les sites carrières des grandes entreprises (Orange CI, MTN, Société Générale, BICIC, Nestlé CI, Ecobank), et les plateformes spécialisées comme JobIvoire. Configurez des alertes pour ne manquer aucune offre correspondant à votre cible.

**5. Postulez avec méthode et suivez vos candidatures**
Ne postulez pas à 50 offres en envoyant le même CV. Postulez à 10 offres avec un CV adapté à chacune : reprenez les mots-clés de l'offre dans votre CV et votre lettre. Qualité > quantité. Tenez un tableau de suivi (simple, sur Excel ou un carnet) : offre, entreprise, date de postulation, relance, statut. Cela vous évite de perdre le fil et montre votre sérieux.

**6. Préparez l'entretien en profondeur**
Renseignez-vous sur l'entreprise avant l'entretien : son activité, ses produits, ses actualités récentes. Préparez 3 questions à poser. Entraînez-vous à répondre aux questions classiques (voir notre article dédié). Arrivez 10 minutes en avance. Habillez-vous de façon professionnelle et adaptée au secteur.

**7. Relancez sans harceler**
Après une postulation, une relance 7 jours après montre votre motivation. Après un entretien, un message de remerciement le lendemain laisse une excellente impression. Si vous n'avez pas de réponse après 2 relances, passez à autre chose sans brûler de ponts : le marché est petit et vous pourriez recroiser ces recruteurs.''',
    author: 'Vitae',
    readTimeMinutes: 6,
  ),
  Resource(
    id: 'res-search-02',
    category: ResourceCategory.rechercheEmploi,
    title: 'Comment répondre aux questions d\'entretien les plus fréquentes',
    excerpt:
        '"Présentez-vous", "Pourquoi notre entreprise ?", "Quelles sont vos prétentions salariales ?" — nos conseils pour répondre avec assurance.',
    content: '''Les entretiens d'embauche en Côte d'Ivoire suivent des codes bien précis. Voici comment préparer des réponses claires et convaincantes aux questions incontournables.

**"Présentez-vous"**
Ne récitez pas votre CV : le recruteur l'a déjà lu. Racontez plutôt votre parcours en 2 minutes : qui vous êtes, ce que vous avez étudié, ce que vous savez faire, et pourquoi vous êtes là aujourd'hui. Structurez en 3 temps : formation, expérience clé, objectif. Exemple : "Je m'appelle Aya Koné, diplômée en gestion de l'UFHB. J'ai fait un stage de 6 mois chez Société Générale CI où j'ai participé au rapprochement bancaire. Aujourd'hui je cherche un poste de comptable junior pour mettre en pratique mes compétences."

**"Pourquoi notre entreprise ?"**
Montrez que vous vous êtes renseigné. Citez un fait précis : "J'ai vu que votre entreprise se développe dans la région du nord, et mon expérience en gestion de stock pourrait contribuer à cette expansion." Évitez les réponses génériques comme "parce que c'est une grande entreprise" ou "parce que vous payez bien".

**"Quelles sont vos prétentions salariales ?"**
Renseignez-vous sur les salaires du marché avant l'entretien. Pour un premier emploi à Abidjan, un comptable junior gagne entre 150 000 et 300 000 FCFA ; un commercial peut aller de 200 000 FCFA plus commissions. Donnez une fourchette, pas un chiffre exact : "Entre 250 000 et 350 000 FCFA selon les responsabilités." Si vous ne savez pas, retournez la question : "Quelle est la fourchette prévue pour ce poste ?"

**"Quel est votre plus grand défaut ?"**
Choisissez un vrai défaut, mais qui n'est pas rédhibitoire pour le poste, et montrez comment vous le gérez. "Je peux être trop perfectionniste, ce qui me prend parfois plus de temps. J'ai appris à mieux gérer mes priorités pour équilibrer qualité et délais."

**"Où vous voyez-vous dans 5 ans ?"**
Montrez de l'ambition réaliste et de la loyauté : "J'aimerais maîtriser parfaitement ce poste dans les 2 premières années, puis évoluer vers des responsabilités de supervision au sein de votre entreprise."

**"Avez-vous des questions ?"**
Posez-en toujours au moins une. "Quelles seraient mes missions concrètes les 3 premiers mois ?" ou "Comment se passe l'intégration des nouveaux dans votre équipe ?" Montrez votre intérêt et votre sérieux. Évitez les questions sur les congés ou le salaire à ce stade, sauf si on vous y invite.''',
    author: 'Vitae',
    readTimeMinutes: 6,
  ),
  Resource(
    id: 'res-network-01',
    category: ResourceCategory.reseauage,
    title: 'Le réseautage en Côte d\'Ivoire : votre plus grand atout',
    excerpt:
        'Le réseau, ce n\'est pas seulement LinkedIn. C\'est votre famille, votre quartier, votre église, votre mosquée, vos anciens camarades.',
    content: '''En Côte d'Ivoire, le réseau personnel est souvent plus important que le CV. Voici comment le cultiver intelligemment et durablement.

**Le réseau commence près de chez vous**
Votre oncle qui travaille à la mairie, la voisine qui tient une boutique, votre cousin chauffeur de taxi — chacun connaît quelqu'un qui cherche un profil. Ne sous-estimez jamais le pouvoir d'une conversation ordinaire. Annoncez clairement et simplement votre recherche à votre entourage : "Je cherche un poste de comptable, si vous entendez parler d'une opportunité, pensez à moi."

**Entretenez vos relations**
Le réseautage ne consiste pas à demander des faveurs. C'est entretenir des relations régulières. Appelez votre ancien tuteur de stage pour prendre de ses nouvelles. Partagez une information utile à un camarade. Félicitez un contact pour une réussite. Le réseau se nourrit de réciprocité : donnez avant de recevoir.

**Les événements professionnels**
Salons de l'emploi, conférences à l'université, meetups tech à Abidjan, forums entrepreneuriaux — chaque événement est une occasion de rencontrer des recruteurs et des professionnels. Préparez une carte de visite ou un profil LinkedIn à partager. Après l'événement, connectez-vous sur LinkedIn avec les personnes rencontrées et envoyez un message de rappel dans les 48h.

**LinkedIn : votre vitrine numérique**
Complétez votre profil, ajoutez une photo professionnelle, décrivez vos expériences avec des résultats concrets. Connectez-vous avec les personnes que vous rencontrez en événement. Publiez occasionnellement sur votre secteur pour montrer votre expertise : partagez un article, commentez une actualité, racontez une réussite. En 2026, un profil LinkedIn actif est un vrai avantage concurrentiel.

**Le réseau des anciens**
Les amicales d'anciens élèves de votre école sont des mines d'or. L'INPHB, l'UFHB, l'ESCG, l'ISM, l'UVCI — toutes ont des réseaux d'anciens actifs. Rejoignez les groupes WhatsApp et Facebook. Les anciens sont souvent plus disposés à aider un camarade de la même école.

**Sachez demander**
Quand vous sollicitez votre réseau, soyez clair et précis : "Je cherche un stage en comptabilité pour juillet, connaissez-vous quelqu'un qui recrute dans ce domaine ?" Pas de message vague. Et remerciez toujours, même si la réponse est non. Un simple "merci d'avoir pris le temps" laisse une bonne impression et garde la porte ouverte.''',
    author: 'Vitae',
    readTimeMinutes: 6,
  ),
  Resource(
    id: 'res-relations-01',
    category: ResourceCategory.relationsPro,
    title: 'Bien démarrer un nouveau travail : les 90 premiers jours',
    excerpt:
        'Les 3 premiers mois déterminent souvent la suite. Attitude, écoute, fiabilité — voici les bons réflexes.',
    content: '''Vos 90 premiers jours dans une entreprise sont cruciaux : ils déterminent souvent la perception que vos collègues et votre manager auront de vous. Voici les réflexes qui feront la différence.

**Jour 1 : soyez présent et curieux**
Arrivez à l'heure. Habillez-vous en cohérence avec le code vestimentaire de l'entreprise. Présentez-vous à vos collègues et mémorisez les prénoms. Demandez comment fonctionne la machine à café, où est la cantine, qui fait quoi. Montrez de l'enthousiasme : c'est votre première impression.

**Semaines 1-2 : observez avant d'agir**
Ne cherchez pas à tout révolutionner immédiatement. Comprenez d'abord comment les choses fonctionnent : les processus, les outils, la culture d'entreprise. Posez des questions, prenez des notes. Montrez que vous apprenez vite. Un junior qui écoute et observe inspire confiance.

**Mois 1 : devenez fiable**
Soyez ponctuel. Tenez vos délais. Si vous ne savez pas faire quelque chose, dites-le et proposez une solution plutôt que de rester bloqué. La fiabilité est la qualité la plus recherchée chez un junior : on doit pouvoir compter sur vous.

**Mois 2 : prenez des initiatives**
Identifiez un petit problème que vous pouvez résoudre. Proposez une amélioration concrète. Montrez que vous n'attendez pas qu'on vous dise quoi faire, tout en respectant la hiérarchie. Une initiative bienvenue, c'est une proposition claire, pas une décision prise seul.

**Mois 3 : demandez du feedback**
Sollicitez un point avec votre manager : "Comment jugez-vous mon intégration ? Qu'est-ce que je peux améliorer ?" Montrez votre volonté de progresser. Notez les retours et mettez-les en pratique. Un collaborateur qui demande du feedback est perçu comme sérieux et coachable.

**En continu : soyez professionnel**
Évitez les ragots. Respectez la hiérarchie. Ne critiquez pas sur WhatsApp. Respectez la confidentialité de l'entreprise. Votre réputation se construit sur la durée, et le marché ivoirien est petit : une bonne réputation vous suit, une mauvaise aussi.''',
    author: 'Vitae',
    readTimeMinutes: 5,
  ),
  Resource(
    id: 'res-relations-02',
    category: ResourceCategory.relationsPro,
    title: 'La communication professionnelle par écrit en entreprise',
    excerpt:
        'Emails, WhatsApp professionnel, notes de service — comment écrire clair, court et respectueux.',
    content: '''Bien écrire en milieu professionnel est une compétence sous-estimée, mais très valorisée. Voici les règles essentielles pour une communication écrite efficace.

**L'email professionnel**
Objet clair et court : "Demande de congé — Aya Koné — Juillet 2026". Pas de "Bonjour" dans l'objet. Dans le corps : salutation, contexte, demande, formule de politesse. Maximum 5-6 lignes pour une demande simple. Terminez par une formule adaptée : "Cordialement" pour un collègue, "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées" pour un supérieur ou un client.

**Le WhatsApp professionnel**
De plus en plus utilisé en entreprise en CI. Mais attention : n'envoyez pas de messages professionnels après 19h ou le week-end, sauf urgence. Utilisez la ponctuation. Évitez les abréviations (slt, cv, bi1). Préférez "Bonjour, je vous envoie le rapport demandé. Bonne journée." Un message professionnel reste un message professionnel, même sur WhatsApp.

**La note de service**
Structure : qui, quoi, quand, où, pourquoi. Soyez factuel. Évitez les jugements. "À compter du 1er septembre, les pointages se feront via l'application mobile" est mieux que "Il faut absolument moderniser nos pointages qui sont archaïques". Une note claire évite les malentendus et les conflits.

**Le rapport ou le compte-rendu**
Structurez en sections avec des titres. Commencez par la conclusion ou le point clé, puis les détails. Utilisez des listes à puces pour les points multiples. Relisez pour corriger les fautes : un document sans fautes inspire confiance et sérieux.

**Les règles d'or**
1. Relisez avant d'envoyer (et vérifiez l'orthographe)
2. Pas de majuscules = pas de crier
3. Un message = un sujet
4. Répondez dans les 24h, même pour dire "je reviens vers vous"
5. Ne mettez en copie que les personnes concernées
6. Évitez les emojis dans les communications formelles''',
    author: 'Vitae',
    readTimeMinutes: 5,
  ),
  Resource(
    id: 'res-market-01',
    category: ResourceCategory.marcheTravail,
    title: 'Les secteurs qui recrutent en Côte d\'Ivoire en 2026',
    excerpt:
        'Numérique, finance, agriculture, énergie, distribution — où sont les opportunités et quels profils sont recherchés ?',
    content: '''Le marché du travail ivoirien évolue rapidement, porté par une croissance économique soutenue et de grands projets d'infrastructure. Voici les secteurs porteurs en 2026 et les profils recherchés.

**Le numérique et les télécoms**
Orange CI, MTN, les startups de la Cité des Arts et de Zone 4, les fintech (Orange Money, Wave, MTN Money) recrutent activement. Profils : développeurs, data analysts, community managers, chefs de projet digital, support client, cybersécurité. Le secteur a besoin de profils techniques mais aussi commerciaux et marketing. Les compétences en intelligence artificielle et en automatisation sont de plus en plus demandées.

**La finance et la banque**
Société Générale CI, BICIC, Ecobank, Coris Bank, NSIA Banque, Bridge Bank — le secteur bancaire se développe avec l'inclusion financière et la digitalisation. Profils : comptables, analystes de crédit, conseillers clientèle, auditeurs, risk managers, spécialistes de la conformité (KYC/AML).

**L'agro-industrie**
Nestlé CI, Cémoi, SIFCA, PalmCI, la filière cacao et l'exportation de produits agricoles — l'agro-industrie est un pilier de l'économie. Profils : ingénieurs agronomes, techniciens, gestionnaires de production, contrôleurs qualité, logisticiens, commerciaux export.

**L'énergie et les infrastructures**
CI-Énergies, les projets solaires et hydrauliques, le métro d'Abidjan, les BTP (Bouygues, Colas CI, Sogea-Satom) — les grands projets créent des emplois. Profils : ingénieurs, techniciens, conducteurs de travaux, chefs de chantier, géomètres, HSE (hygiène, sécurité, environnement).

**La distribution et le commerce**
Les centres commerciaux (Playce Mall, Cosmos Yopougon), les chaînes (Jumbo, Super U, Casino), le e-commerce (Jumia, Glovo, Kiro'o) — la distribution se professionnalise. Profils : commerciaux, gestionnaires de rayon, logisticiens, livreurs, responsables de point de vente.

**La santé**
Les cliniques privées (Polyclinique Sainte-Anne-Marie, Clinique Les Rosiers, Clinique Farah), les laboratoires, les mutuelles de santé — le secteur de la santé recrute. Profils : infirmiers, techniciens de laboratoire, gestionnaires administratifs, spécialistes de la santé numérique.

**L'éducation et la formation**
Les écoles privées, les centres de formation professionnelle, les universités privées, les plateformes d'e-learning — l'éducation se développe. Profils : enseignants, formateurs, conseillers pédagogiques, gestionnaires, concepteurs de contenus pédagogiques.

**Le tourisme et l'hôtellerie**
Avec la croissance des vols directs et des investissements hôteliers (Azalaï, Noom, Sofitel), le tourisme d'affaires et de loisirs se développe. Profils : gestionnaires hôteliers, commerciaux, agents d'accueil, guides, spécialistes de l'événementiel.

**Conseil :** quel que soit votre secteur, les compétences transverses (bureautique, Excel, communication, gestion de projet) restent très valorisées et augmentent votre employabilité.''',
    author: 'Vitae',
    readTimeMinutes: 8,
  ),
  Resource(
    id: 'res-market-02',
    category: ResourceCategory.marcheTravail,
    title: 'Emploi formel vs informel : comprendre le marché ivoirien',
    excerpt:
        '89% des actifs travaillent dans l\'informel. Faut-il viser le formel ? Quels sont les avantages et limites de chaque voie ?',
    content: '''Le marché du travail ivoirien est dominé par l'informel, mais le secteur formel offre des protections. Comprendre les deux pour faire les bons choix selon votre situation.

**Le secteur formel**
Contrat de travail déclaré, salaire fixe, cotisations sociales (CNPS), congés payés, protection du Code du travail. Les entreprises : banques, grandes entreprises, administrations publiques, ONG, multinationales.

Avantages : sécurité, avantages sociaux, évolution de carrière, formation, accès au crédit bancaire.
Inconvénients : plus difficile d'accès, procédures de recrutement longues, salaires parfois moins élevés que l'informel qualifié.

**Le secteur informel**
Commerce, artisanat, services de proximité, agriculture familiale, transport. Pas de contrat formel, pas de cotisations, revenus variables.

Avantages : flexibilité, revenus potentiellement élevés pour les entrepreneurs, accès rapide, indépendance.
Inconvénients : pas de protection sociale, pas de congés payés, pas de retraite, vulnérabilité économique, difficulté à obtenir un crédit.

**L'entrepreneuriat : la voie du milieu**
De plus en plus de jeunes Ivoiriens créent leur propre activité. Le Startup Act 2023 facilite la création d'entreprises innovantes avec des exonérations fiscales. L'APEX-CI, la CEPICI et les incubateurs (InnovaHub, Orange Digital Center) accompagnent les créateurs. L'entrepreneuriat peut être une voie vers le formel : une activité déclarée devient une entreprise formelle.

**Le secteur semi-formel : une option croissante**
De nombreuses plateformes (livraison, VTC, freelance) offrent des revenus réguliers sans contrat classique. C'est une porte d'entrée pour acquérir de l'expérience et un réseau, tout en gardant de la flexibilité. Attention toutefois à l'absence de protection sociale.

**Conseil pratique**
Visez d'abord le secteur formel pour la sécurité et l'apprentissage. Une expérience de 2-3 ans en entreprise formelle vous donne des compétences, un réseau et un salaire qui vous permettront ensuite de vous lancer en entrepreneuriat si vous le souhaitez. Si vous démarrez dans l'informel, formalisez progressivement : tenez une comptabilité simple, ouvrez un compte bancaire professionnel, déclarez votre activité dès que possible.''',
    author: 'Vitae',
    readTimeMinutes: 7,
  ),
  Resource(
    id: 'res-law-01',
    category: ResourceCategory.droitTravail,
    title: 'Le Code du travail ivoirien : ce que tout employé doit connaître',
    excerpt:
        'Durée légale du travail, congés payés, préavis, indemnités de licenciement — vos droits de base en Côte d\'Ivoire.',
    content: '''Le Code du travail ivoirien (Loi n° 2015-519 du 20 juillet 2015) régit les relations entre employeurs et employés du secteur formel. Voici les points essentiels que tout travailleur doit connaître pour défendre ses droits.

**La durée légale du travail**
40 heures par semaine, soit 8 heures par jour avec un jour de repos hebdomadaire (généralement le dimanche). Les heures supplémentaires sont majorées : +25% pour les 8 premières heures, +50% au-delà, +75% la nuit et le dimanche. Ces majorations sont un droit, pas une faveur.

**Le contrat de travail**
Il peut être à durée indéterminée (CDI), à durée déterminée (CDD) ou pour un travail saisonnier. Le CDD ne peut excéder 2 ans renouvellement compris. Passé ce délai, il doit être transformé en CDI. Exigez toujours un contrat écrit : c'est votre protection principale.

**La période d'essai**
Pour les ouvriers et employés : 8 jours renouvelables une fois.
Pour les agents de maîtrise et techniciens : 1 mois renouvelable une fois.
Pour les cadres : 3 mois renouvelables une fois.
La période d'essai doit être prévue dans le contrat ; elle ne se présume pas.

**Les congés payés**
2,5 jours ouvrables par mois de travail effectif, soit 30 jours (5 semaines) par an. L'indemnité de congé est égale au salaire que vous auriez perçu si vous aviez travaillé. Les congés non pris ne se perdent pas automatiquement : ils peuvent être reportés ou indemnisés selon les règles de l'entreprise.

**Le préavis**
En cas de rupture du contrat, un préavis doit être respecté :
- Ouvriers/employés : 1 mois
- Agents de maîtrise/techniciens : 2 mois
- Cadres : 3 mois
En cas de licenciement, l'employeur peut dispenser le salarié d'effectuer le préavis en lui versant l'indemnité compensatrice.

**L'indemnité de licenciement**
Après 2 ans d'ancienneté, le salarié a droit à une indemnité de licenciement calculée par année d'ancienneté. Le taux augmente par tranches (voir le Code du travail pour le barème précis). Cette indemnité s'ajoute à l'indemnité de préavis et aux congés payés restants.

**Le SMIG (Salaire Minimum Interprofessionnel Garanti)**
En Côte d'Ivoire, le SMIG est de 75 000 FCFA par mois. Aucun employeur ne peut payer moins. Vérifiez que votre salaire respecte au minimum ce seuil.

**La CNPS (Caisse Nationale de Prévoyance Sociale)**
Votre employeur doit vous déclarer à la CNPS. Vous cotisez (5% de votre salaire brut) et votre employeur cotise aussi. Cela vous donne droit aux prestations : retraite, accidents du travail, prestations familiales. Vérifiez sur vos bulletins de paie que les cotisations sont bien versées.

**Que faire en cas de litige ?**
L'Inspection du Travail peut être saisie gratuitement. En cas de non-résolution, le Tribunal du Travail est compétent. Les syndicats peuvent aussi accompagner les travailleurs. Ne restez jamais seul face à un litige : documentez tout (contrat, bulletins, emails) et demandez conseil.

⚠️ **Important :** Ce résumé est fourni à titre informatif et ne remplace pas le Code du travail officiel. Pour un cas précis, consultez un juriste ou l'Inspection du Travail la plus proche.''',
    author: 'Vitae',
    readTimeMinutes: 9,
  ),
  Resource(
    id: 'res-law-02',
    category: ResourceCategory.droitTravail,
    title: 'Contrat CDD vs CDI : que choisir et quels sont vos droits ?',
    excerpt:
        'Le CDD est courant en CI, mais il a des limites. Comprendre la différence pour négocier intelligemment.',
    content: '''Le choix entre CDD et CDI a un impact direct sur votre sécurité et votre carrière. Voici ce qu'il faut savoir pour négocier intelligemment.

**Le CDD (Contrat à Durée Déterminée)**
Durée maximale : 2 ans renouvellement compris. Il doit être écrit et préciser la date de fin. À l'expiration, l'employeur doit soit transformer en CDI, soit verser une indemnité de précarité (7% du salaire brut total si pas de transformation en CDI).

Quand le CDD est légitime :
- Remplacement d'un salarié absent
- Surcroît temporaire d'activité
- Emploi saisonnier
- Projet défini à l'avance

Attention : un CDD utilisé pour pourvoir un poste permanent est illégal. Si vous occupez un poste régulier et permanent en CDD, vous pouvez demander la requalification en CDI devant le Tribunal du Travail.

**Le CDI (Contrat à Durée Indéterminée)**
C'est le contrat de référence. Il n'a pas de date de fin. Il peut être rompu par :
- Démission (avec préavis)
- Licenciement (motif réel et sérieux + procédure)
- Rupture conventionnelle (accord des deux parties)

Le CDI offre plus de sécurité : indemnité de licenciement après 2 ans, droit au chômage (si vous avez cotisé), stabilité pour demander un crédit bancaire.

**Négocier au moment de l'embauche**
Si on vous propose un CDD pour un poste qui semble permanent, demandez :
- "Quelle est la perspective à long terme pour ce poste ?"
- "Sous quelles conditions le CDD peut-il être transformé en CDI ?"
- "Y a-t-il un objectif de performance à atteindre pour la transformation ?"

Mettez ces éléments par écrit si possible (email de confirmation après l'entretien). Une promesse orale n'a aucune valeur juridique.

**L'indemnité de fin de CDD**
À la fin d'un CDD (si pas transformé en CDI), vous recevez une indemnité de précarité égale à 7% de la rémunération totale brute versée pendant toute la durée du contrat. C'est un droit, ne l'oubliez pas. Elle s'ajoute à vos congés payés restants.

**Le stage : un cas particulier**
Le stage n'est pas un contrat de travail classique. Il peut être conventionné (avec une gratification) ou non. Vérifiez que votre stage est bien encadré par une convention et que vos missions correspondent à votre formation. Un stage bien fait est une porte d'entrée vers un CDI.

⚠️ **Note :** Les informations ci-dessus sont indicatives. Consultez le Code du travail ou un juriste pour votre situation précise.''',
    author: 'Vitae',
    readTimeMinutes: 7,
  ),
  Resource(
    id: 'res-law-03',
    category: ResourceCategory.droitTravail,
    title: 'Sécurité sociale et retraite en Côte d\'Ivoire : comment ça marche ?',
    excerpt:
        'CNPS, points de retraite, pension, accidents du travail — comprendre vos cotisations et vos droits.',
    content: '''La CNPS (Caisse Nationale de Prévoyance Sociale) protège les travailleurs du secteur formel. Voici comment elle fonctionne et comment protéger vos droits.

**Vos cotisations**
Sur votre salaire brut :
- Travailleur : 5% (retraite) + cotisations prestations familiales
- Employeur : cotisation patronale (environ 12-16% selon les branches)

L'employeur retient votre part sur votre salaire et verse l'ensemble à la CNPS. Vérifiez sur vos bulletins de paie que les cotisations sont bien versées : c'est votre retraite future qui en dépend.

**La retraite**
Le système est par répartition : vos cotisations financent les pensions des retraités actuels, et les cotisations des actifs financeront la vôtre. Vous accumulez des trimestres validés au fil de vos cotisations. L'âge légal de départ est 60 ans (âge d'ouverture des droits). Le nombre minimum de trimestres pour une pension pleine est de 160 (40 ans de cotisation).

Montant de la pension : pourcentage du salaire moyen des meilleures années, fonction du nombre de trimestres validés. Si vous n'avez pas assez de trimestres, vous pouvez obtenir une allocation viagère (montant réduit).

**Les prestations familiales**
Allocations familiales versées pour les enfants à charge (jusqu'à 14 ans, ou 21 ans si études). Le montant est modeste mais c'est un droit. Renseignez-vous auprès de la CNPS sur les conditions et les pièces à fournir.

**Les accidents du travail**
Si vous êtes victime d'un accident du travail ou d'une maladie professionnelle, la CNPS prend en charge les soins et verse une indemnité en cas d'incapacité. L'employeur doit déclarer l'accident dans les 48h. En cas de décès, les ayants droit peuvent percevoir une pension de survivant.

**Vérifiez votre compte CNPS**
Vous pouvez consulter votre compte CNPS en ligne ou en agence. Vérifiez régulièrement que vos cotisations sont bien versées. Si votre employeur ne déclare pas, vous perdez des trimestres de retraite. En cas de changement d'employeur, votre compte vous suit : conservez votre numéro d'immatriculation.

**Ce que vous devez retenir**
1. Exigez votre bulletin de paie chaque mois
2. Vérifiez que les cotisations CNPS apparaissent
3. Consultez votre compte CNPS au moins une fois par an
4. Gardez tous vos documents (contrats, bulletins, certificats)
5. En cas de problème, la CNPS a des guichets d'information
6. Ne négligez pas votre retraite : chaque trimestre compte

⚠️ **Important :** Les règles CNPS évoluent. Vérifiez les montants et conditions actuels sur le site officiel de la CNPS Côte d'Ivoire ou en agence.''',
    author: 'Vitae',
    readTimeMinutes: 8,
  ),
];