/**
 * Lexiques du moteur de scoring.
 *
 * Tout est en français et sans accent au moment de la comparaison : les entrées
 * sont normalisées par `normalize()` (src/scoring/text.ts), donc on les écrit
 * ici déjà dépouillées de leurs accents.
 */

/**
 * Verbes d'action à l'infinitif ET au participe passé, formes attendues en tête
 * de puce sur un CV français. Le participe est la forme la plus courante
 * (« Développé une API… »), l'infinitif reste fréquent chez les débutants.
 */
export const ACTION_VERBS: readonly string[] = [
  // conception / construction
  'developpe', 'developper', 'concu', 'concevoir', 'construit', 'construire',
  'cree', 'creer', 'mis', 'mettre', 'implemente', 'implementer', 'deploye',
  'deployer', 'automatise', 'automatiser', 'integre', 'integrer', 'refondu',
  'refondre', 'migre', 'migrer', 'parametre', 'parametrer',
  // pilotage
  'gere', 'gerer', 'pilote', 'piloter', 'coordonne', 'coordonner', 'dirige',
  'diriger', 'supervise', 'superviser', 'encadre', 'encadrer', 'anime',
  'animer', 'organise', 'organiser', 'planifie', 'planifier', 'suivi', 'suivre',
  // amélioration / résultat
  'optimise', 'optimiser', 'ameliore', 'ameliorer', 'augmente', 'augmenter',
  'reduit', 'reduire', 'accelere', 'accelerer', 'double', 'doubler',
  'rentabilise', 'rentabiliser', 'fidelise', 'fideliser',
  // commercial / relation
  'negocie', 'negocier', 'vendu', 'vendre', 'prospecte', 'prospecter',
  'conseille', 'conseiller', 'accompagne', 'accompagner', 'forme', 'former',
  'presente', 'presenter', 'represente', 'representer',
  // analyse / support
  'analyse', 'analyser', 'audite', 'auditer', 'evalue', 'evaluer', 'redige',
  'rediger', 'documente', 'documenter', 'teste', 'tester', 'controle',
  'controler', 'verifie', 'verifier', 'traite', 'traiter', 'collecte',
  'collecter', 'saisi', 'saisir', 'resolu', 'resoudre',
];

/**
 * Compétences comportementales valorisées par les recruteurs.
 * Détectées dans les compétences, le résumé et les puces d'expérience.
 */
export const SOFT_SKILLS: readonly string[] = [
  'travail en equipe', 'esprit d equipe', 'equipe pluridisciplinaire',
  'communication', 'communiquer', 'ecoute', 'pedagogie',
  'autonomie', 'autonome', 'initiative', 'proactif', 'proactivite',
  'rigueur', 'rigoureux', 'organisation', 'organise', 'methodique',
  'adaptabilite', 'adaptation', 'polyvalence', 'polyvalent', 'flexibilite',
  'leadership', 'management', 'encadrement', 'delegation',
  'resolution de probleme', 'esprit d analyse', 'esprit critique', 'analyse',
  'gestion du temps', 'gestion du stress', 'respect des delais',
  'sens du service', 'relation client', 'negociation', 'diplomatie',
  'creativite', 'curiosite', 'force de proposition',
];

/**
 * Verbes et tournures faibles : signalent une puce descriptive plutôt qu'une
 * réalisation. Leur présence en tête de puce coûte des points d'« Impact ».
 */
export const WEAK_OPENERS: readonly string[] = [
  'responsable de', 'charge de', 'en charge de', 'participation a',
  'participe a', 'aide a', 'aide au', 'assiste', 'j ai', 'mes missions',
  'missions', 'taches', 'travaux', 'divers', 'etait', 'etais', 'stagiaire',
];
