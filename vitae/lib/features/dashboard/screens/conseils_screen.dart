import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';

/// Écran Conseils — section éditoriale
class ConseilsScreen extends StatelessWidget {
  const ConseilsScreen({super.key});

  List<Map<String, dynamic>> get _conseils => const [
    {
      'icon': LucideIcons.fileText,
      'title': 'Comment rédiger un bon résumé',
      'excerpt': 'Le résumé est la première chose que lit le recruteur. Soyez concis, concret et professionnel.',
      'content': "Un bon résumé professionnel contient 3 à 5 lignes maximum. Il doit répondre à trois questions : Qui êtes-vous ? Quelles sont vos compétences clés ? Qu'apportez-vous à l'entreprise ? Évitez les phrases vagues comme \"je suis dynamique et motivé\". Préférez des éléments concrets : \"Diplômé en comptabilité avec 3 ans d'expérience en cabinet, maîtrise de Sage et Excel.\"",
    },
    {
      'icon': LucideIcons.alertTriangle,
      'title': 'Les erreurs de CV à éviter au marché ivoirien',
      'excerpt': "Photos non professionnelles, fautes d'orthographe, informations inutiles... Voici les pièges à éviter.",
      'content': "1. La photo : si vous en mettez une, choisissez une photo professionnelle (fond neutre, tenue correcte). 2. Les fautes : faites relire votre CV par quelqu'un. Une seule faute peut disqualifier. 3. Trop d'informations : ne dépassez pas 2 pages. 4. Les adresses email non professionnelles : évitez les pseudos comme \"coolboy2000\". 5. Les références : ne les mettez que si elles sont demandées.",
    },
    {
      'icon': LucideIcons.target,
      'title': "Adapter son CV à une offre d'emploi",
      'excerpt': "Un CV efficace est un CV ciblé. Voici comment l'adapter à chaque candidature.",
      'content': "Lisez attentivement l'offre d'emploi et identifiez les mots-clés. Repérez les compétences demandées et placez-les en haut de votre liste de compétences. Adaptez votre titre professionnel au poste visé. Si l'offre demande \"Comptable junior\" et que votre titre dit \"Assistant comptable\", changez-le. Utilisez la fonction \"Dupliquer\" de Vitae pour créer une version adaptée sans perdre l'originale.",
    },
    {
      'icon': LucideIcons.briefcase,
      'title': 'Mettre en valeur ses expériences',
      'excerpt': "Comment décrire vos missions pour qu'elles impressionnent le recruteur.",
      'content': "Utilisez des verbes d'action : \"Géré\", \"Organisé\", \"Analysé\", \"Optimisé\". Quantifiez vos résultats quand c'est possible : \"Géré un portefeuille de 50 clients\" est plus impactant que \"Gestion de clients\". Classez vos expériences de la plus récente à la plus ancienne. Si vous n'avez pas d'expérience professionnelle, mettez en avant vos stages, projets académiques ou bénévolat.",
    },
    {
      'icon': LucideIcons.graduationCap,
      'title': 'Valoriser sa formation',
      'excerpt': 'Votre parcours académique est un atout. Voici comment le présenter efficacement.',
      'content': "Indiquez le diplôme exact, l'institution et l'année. Si vous avez eu une mention, ajoutez-la. Pour les jeunes diplômés sans expérience, placez la section Formation avant les Expériences. Mentionnez les certifications professionnelles (comptabilité, informatique, langues) même si elles ne sont pas universitaires.",
    },
    {
      'icon': LucideIcons.languages,
      'title': 'Indiquer son niveau de langue correctement',
      'excerpt': 'Notions, Intermédiaire, Courant... Que signifient ces niveaux vraiment ?',
      'content': "Notions : vous comprenez quelques mots et phrases simples. Intermédiaire : vous pouvez converser sur des sujets familiers. Courant : vous communiquez avec aisance dans la plupart des situations. Bilingue : vous maîtrisez la langue comme votre langue maternelle. Natif : c'est votre langue maternelle. Soyez honnête : le recruteur le vérifiera en entretien.",
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.go('/dashboard'),
        ),
        title: Text('Conseils', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600)),
      ),
      body: SafeArea(
        child: ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: _conseils.length,
          itemBuilder: (context, index) {
            final conseil = _conseils[index];
            return _buildConseilCard(context, conseil);
          },
        ),
      ),
    );
  }

  Widget _buildConseilCard(BuildContext context, Map<String, dynamic> conseil) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: () => _showConseilDetail(context, conseil),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.bg2),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.vitaeSoft,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(conseil['icon'] as IconData, color: AppTheme.vitae, size: 22),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        conseil['title'] as String,
                        style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: AppTheme.text),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        conseil['excerpt'] as String,
                        style: GoogleFonts.inter(fontSize: 13, color: AppTheme.muted),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const Icon(LucideIcons.chevronRight, color: AppTheme.muted2, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showConseilDetail(BuildContext context, Map<String, dynamic> conseil) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        expand: false,
        builder: (context, scrollController) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppTheme.bg2,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppTheme.vitaeSoft,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(conseil['icon'] as IconData, color: AppTheme.vitae, size: 24),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      conseil['title'] as String,
                      style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.text),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: Text(
                    conseil['content'] as String,
                    style: GoogleFonts.inter(fontSize: 15, color: AppTheme.text, height: 1.6),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}