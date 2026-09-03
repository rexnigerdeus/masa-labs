import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/theme/app_theme.dart';
import '../../cv/models/cv_model.dart';

/// Widget de rendu visuel d'un CV — utilisé dans l'aperçu et l'export PDF
/// Supporte les 6 templates avec des layouts différents
class CvPreview extends StatelessWidget {
  final Cv cv;
  final bool showWatermark;

  const CvPreview({
    super.key,
    required this.cv,
    this.showWatermark = false,
  });

  Color get _accentColor {
    try {
      return Color(int.parse(cv.couleurPrincipale.replaceFirst('#', '0xFF')));
    } catch (_) {
      return AppTheme.vitae;
    }
  }

  Map<String, dynamic> get _perso {
    return cv.getSection(SectionType.perso)?.donnees ?? {};
  }

  List<Map<String, dynamic>> get _experiences {
    final section = cv.getSection(SectionType.experience);
    return List<Map<String, dynamic>>.from(
      (section?.donnees['items'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [],
    );
  }

  List<Map<String, dynamic>> get _formations {
    final section = cv.getSection(SectionType.formation);
    return List<Map<String, dynamic>>.from(
      (section?.donnees['items'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [],
    );
  }

  List<String> get _competences {
    final section = cv.getSection(SectionType.competence);
    return List<String>.from(
      (section?.donnees['items'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }

  List<Map<String, dynamic>> get _langues {
    final section = cv.getSection(SectionType.langue);
    return List<Map<String, dynamic>>.from(
      (section?.donnees['items'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [],
    );
  }

  List<String> get _interets {
    final section = cv.getSection(SectionType.interet);
    return List<String>.from(
      (section?.donnees['items'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        _buildTemplate(context),
        if (showWatermark)
          Positioned(
            bottom: 20,
            right: 20,
            child: Transform.rotate(
              angle: -0.3,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  border: Border.all(color: AppTheme.muted2.withValues(alpha: 0.3)),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Créé avec Vitae',
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    color: AppTheme.muted2.withValues(alpha: 0.4),
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildTemplate(BuildContext context) {
    switch (cv.templateId) {
      case 1:
        return _buildClassique(context);
      case 2:
        return _buildModerne(context);
      case 3:
        return _buildElegant(context);
      case 4:
        return _buildMinimal(context);
      case 5:
        return _buildAcademique(context);
      case 6:
        return _buildStage(context);
      default:
        return _buildClassique(context);
    }
  }

  // Template 1 : Classique — 1 colonne, sobre
  Widget _buildClassique(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildNameHeader(),
          const SizedBox(height: 16),
          _buildContactLine(),
          const Divider(height: 32, thickness: 1),
          if (_perso['titre'] != null && (_perso['titre'] as String).isNotEmpty) ...[
            _sectionTitle('PROFIL'),
            const SizedBox(height: 8),
            Text(_perso['titre'] as String, style: GoogleFonts.inter(fontSize: 14, color: AppTheme.text)),
            const SizedBox(height: 16),
          ],
          if (_perso['resume'] != null && (_perso['resume'] as String).isNotEmpty) ...[
            _sectionTitle('RÉSUMÉ'),
            const SizedBox(height: 8),
            Text(_perso['resume'] as String, style: GoogleFonts.inter(fontSize: 12, color: AppTheme.muted, height: 1.5)),
            const SizedBox(height: 16),
          ],
          if (_experiences.isNotEmpty) ...[
            _sectionTitle('EXPÉRIENCES PROFESSIONNELLES'),
            const SizedBox(height: 8),
            ..._experiences.map((e) => _buildExperienceItem(e)),
            const SizedBox(height: 16),
          ],
          if (_formations.isNotEmpty) ...[
            _sectionTitle('FORMATION'),
            const SizedBox(height: 8),
            ..._formations.map((f) => _buildFormationItem(f)),
            const SizedBox(height: 16),
          ],
          if (_competences.isNotEmpty) ...[
            _sectionTitle('COMPÉTENCES'),
            const SizedBox(height: 8),
            _buildCompetenceList(),
            const SizedBox(height: 16),
          ],
          if (_langues.isNotEmpty) ...[
            _sectionTitle('LANGUES'),
            const SizedBox(height: 8),
            _buildLangueList(),
            const SizedBox(height: 16),
          ],
          if (_interets.isNotEmpty) ...[
            _sectionTitle("CENTRES D'INTÉRÊT"),
            const SizedBox(height: 8),
            Text(_interets.join(' • '), style: GoogleFonts.inter(fontSize: 12, color: AppTheme.muted)),
          ],
        ],
      ),
    );
  }

  // Template 2 : Moderne — 2 colonnes
  Widget _buildModerne(BuildContext context) {
    return Container(
      color: Colors.white,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Colonne gauche — sidebar
          Container(
            width: 140,
            color: _accentColor,
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${_perso['prenom'] ?? ''} ${_perso['nom'] ?? ''}',
                  style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white),
                ),
                if (_perso['titre'] != null && (_perso['titre'] as String).isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(_perso['titre'] as String, style: GoogleFonts.inter(fontSize: 12, color: Colors.white70)),
                ],
                const SizedBox(height: 20),
                _sidebarSection('CONTACT', [
                  if (_perso['phone'] != null) _perso['phone'] as String,
                  if (_perso['email'] != null) _perso['email'] as String,
                  if (_perso['ville'] != null) _perso['ville'] as String,
                ]),
                if (_competences.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  _sidebarSection('COMPÉTENCES', _competences),
                ],
                if (_langues.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  _sidebarSection('LANGUES', _langues.map((l) => '${l['langue']} (${l['niveau']})').toList()),
                ],
                if (_interets.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  _sidebarSection('INTÉRÊTS', _interets),
                ],
              ],
            ),
          ),
          // Colonne droite — contenu principal
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_perso['resume'] != null && (_perso['resume'] as String).isNotEmpty) ...[
                    _sectionTitle('RÉSUMÉ'),
                    const SizedBox(height: 8),
                    Text(_perso['resume'] as String, style: GoogleFonts.inter(fontSize: 12, color: AppTheme.muted, height: 1.5)),
                    const SizedBox(height: 16),
                  ],
                  if (_experiences.isNotEmpty) ...[
                    _sectionTitle('EXPÉRIENCES'),
                    const SizedBox(height: 8),
                    ..._experiences.map((e) => _buildExperienceItem(e)),
                    const SizedBox(height: 16),
                  ],
                  if (_formations.isNotEmpty) ...[
                    _sectionTitle('FORMATION'),
                    const SizedBox(height: 8),
                    ..._formations.map((f) => _buildFormationItem(f)),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Template 3 : Élégant — en-tête avec photo
  Widget _buildElegant(BuildContext context) {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          // En-tête
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(32),
            color: _accentColor,
            child: Row(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                  ),
                  child: Icon(Icons.person, size: 40, color: _accentColor),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${_perso['prenom'] ?? ''} ${_perso['nom'] ?? ''}',
                        style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                      if (_perso['titre'] != null && (_perso['titre'] as String).isNotEmpty)
                        Text(_perso['titre'] as String, style: GoogleFonts.inter(fontSize: 14, color: Colors.white70)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Corps
          Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildContactLine(),
                const SizedBox(height: 16),
                if (_perso['resume'] != null && (_perso['resume'] as String).isNotEmpty) ...[
                  _sectionTitle('RÉSUMÉ'),
                  const SizedBox(height: 8),
                  Text(_perso['resume'] as String, style: GoogleFonts.inter(fontSize: 12, color: AppTheme.muted, height: 1.5)),
                  const SizedBox(height: 16),
                ],
                if (_experiences.isNotEmpty) ...[
                  _sectionTitle('EXPÉRIENCES'),
                  const SizedBox(height: 8),
                  ..._experiences.map((e) => _buildExperienceItem(e)),
                  const SizedBox(height: 16),
                ],
                if (_formations.isNotEmpty) ...[
                  _sectionTitle('FORMATION'),
                  const SizedBox(height: 8),
                  ..._formations.map((f) => _buildFormationItem(f)),
                  const SizedBox(height: 16),
                ],
                if (_competences.isNotEmpty) ...[
                  _sectionTitle('COMPÉTENCES'),
                  const SizedBox(height: 8),
                  _buildCompetenceList(),
                  const SizedBox(height: 16),
                ],
                if (_langues.isNotEmpty) ...[
                  _sectionTitle('LANGUES'),
                  const SizedBox(height: 8),
                  _buildLangueList(),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Template 4 : Minimal — très épuré
  Widget _buildMinimal(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${_perso['prenom'] ?? ''} ${_perso['nom'] ?? ''}',
            style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w300, color: AppTheme.text, letterSpacing: 1),
          ),
          if (_perso['titre'] != null && (_perso['titre'] as String).isNotEmpty)
            Text(_perso['titre'] as String, style: GoogleFonts.inter(fontSize: 14, color: _accentColor, fontWeight: FontWeight.w400)),
          const SizedBox(height: 8),
          _buildContactLine(),
          const SizedBox(height: 32),
          if (_perso['resume'] != null && (_perso['resume'] as String).isNotEmpty) ...[
            Text(_perso['resume'] as String, style: GoogleFonts.inter(fontSize: 13, color: AppTheme.muted, height: 1.8)),
            const SizedBox(height: 24),
          ],
          if (_experiences.isNotEmpty) ...[
            _minimalSectionTitle('EXPÉRIENCES'),
            ..._experiences.map((e) => _buildMinimalItem(e['poste'] as String? ?? '', e['entreprise'] as String? ?? '', e['duree'] as String? ?? '', e['description'] as String? ?? '')),
            const SizedBox(height: 20),
          ],
          if (_formations.isNotEmpty) ...[
            _minimalSectionTitle('FORMATION'),
            ..._formations.map((f) => _buildMinimalItem(f['intitule'] as String? ?? '', f['institution'] as String? ?? '', f['annee'] as String? ?? '', f['mention'] as String? ?? '')),
            const SizedBox(height: 20),
          ],
          if (_competences.isNotEmpty) ...[
            _minimalSectionTitle('COMPÉTENCES'),
            const SizedBox(height: 4),
            Text(_competences.join('  ·  '), style: GoogleFonts.inter(fontSize: 13, color: AppTheme.muted, height: 1.6)),
            const SizedBox(height: 20),
          ],
          if (_langues.isNotEmpty) ...[
            _minimalSectionTitle('LANGUES'),
            const SizedBox(height: 4),
            Text(_langues.map((l) => '${l['langue']} — ${l['niveau']}').join('  ·  '), style: GoogleFonts.inter(fontSize: 13, color: AppTheme.muted)),
          ],
        ],
      ),
    );
  }

  // Template 5 : Académique — détaillé, sections numérotées, layout dense
  // Inspiré des CV académiques français (enseignement/recherche) :
  // en-tête centré avec affiliation institutionnelle, sections numérotées
  // en chiffres romains, barre de séparation fine, format dense.
  Widget _buildAcademique(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // En-tête centré — style académique français
          Center(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text(
                  '${_perso['prenom'] ?? ''} ${_perso['nom'] ?? ''}'.toUpperCase(),
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.text,
                    letterSpacing: 2,
                  ),
                  textAlign: TextAlign.center,
                ),
                if (_perso['titre'] != null && (_perso['titre'] as String).isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    _perso['titre'] as String,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: _accentColor,
                      fontWeight: FontWeight.w600,
                      fontStyle: FontStyle.italic,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
                if (_perso['ville'] != null && (_perso['ville'] as String).isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    _perso['ville'] as String,
                    style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted),
                    textAlign: TextAlign.center,
                  ),
                ],
              ],
            ),
          ),
          // Coordonnées en ligne centrée
          if (_buildContactLine() is! SizedBox) ...[
            const SizedBox(height: 8),
            Center(child: _buildContactLine()),
          ],
          // Fine barre de séparation
          Container(
            margin: const EdgeInsets.symmetric(vertical: 14),
            height: 1,
            color: AppTheme.bg2,
          ),

          // Section I — RÉSUMÉ / PROPOSITION DE RECHERCHE
          if (_perso['resume'] != null && (_perso['resume'] as String).isNotEmpty) ...[
            _academicSectionTitle('I', 'PROPOSITION DE RECHERCHE'),
            const SizedBox(height: 6),
            Text(
              _perso['resume'] as String,
              style: GoogleFonts.inter(fontSize: 11, color: AppTheme.text, height: 1.5),
              textAlign: TextAlign.justify,
            ),
            const SizedBox(height: 14),
          ],

          // Section II — EXPÉRIENCES PROFESSIONNELLES
          if (_experiences.isNotEmpty) ...[
            _academicSectionTitle('II', 'EXPÉRIENCES PROFESSIONNELLES'),
            const SizedBox(height: 6),
            ..._experiences.map((e) => _buildAcademicExperienceItem(e)),
            const SizedBox(height: 14),
          ],

          // Section III — FORMATION
          if (_formations.isNotEmpty) ...[
            _academicSectionTitle('III', 'FORMATION ACADÉMIQUE'),
            const SizedBox(height: 6),
            ..._formations.map((f) => _buildAcademicFormationItem(f)),
            const SizedBox(height: 14),
          ],

          // Section IV — COMPÉTENCES
          if (_competences.isNotEmpty) ...[
            _academicSectionTitle('IV', 'COMPÉTENCES & OUTILS'),
            const SizedBox(height: 6),
            _buildAcademicCompetenceList(),
            const SizedBox(height: 14),
          ],

          // Section V — LANGUES
          if (_langues.isNotEmpty) ...[
            _academicSectionTitle('V', 'LANGUES'),
            const SizedBox(height: 6),
            _buildAcademicLangueList(),
            const SizedBox(height: 14),
          ],

          // Section VI — CENTRES D'INTÉRÊT
          if (_interets.isNotEmpty) ...[
            _academicSectionTitle('VI', "CENTRES D'INTÉRÊT"),
            const SizedBox(height: 6),
            Text(
              _interets.join(' · '),
              style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted),
            ),
          ],
        ],
      ),
    );
  }

  Widget _academicSectionTitle(String roman, String title) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        SizedBox(
          width: 28,
          child: Text(
            roman,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: _accentColor,
            ),
          ),
        ),
        Expanded(
          child: Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppTheme.text,
              letterSpacing: 1,
            ),
          ),
        ),
        Container(
          height: 1,
          width: 40,
          color: _accentColor,
        ),
      ],
    );
  }

  Widget _buildAcademicExperienceItem(Map<String, dynamic> e) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10, left: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  '${e['poste'] ?? ''} — ${e['entreprise'] ?? ''}',
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.text),
                ),
              ),
              Text(
                e['duree'] as String? ?? '',
                style: GoogleFonts.inter(fontSize: 10, color: _accentColor, fontWeight: FontWeight.w500),
              ),
            ],
          ),
          if (e['description'] != null && (e['description'] as String).isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                e['description'] as String,
                style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted, height: 1.4),
                textAlign: TextAlign.justify,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAcademicFormationItem(Map<String, dynamic> f) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 28),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              '${f['intitule'] ?? ''} — ${f['institution'] ?? ''}',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.text),
            ),
          ),
          Text(
            f['annee'] as String? ?? '',
            style: GoogleFonts.inter(fontSize: 10, color: _accentColor, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildAcademicCompetenceList() {
    return Padding(
      padding: const EdgeInsets.only(left: 28),
      child: Text(
        _competences.join(' · '),
        style: GoogleFonts.inter(fontSize: 11, color: AppTheme.text, height: 1.6),
      ),
    );
  }

  Widget _buildAcademicLangueList() {
    return Padding(
      padding: const EdgeInsets.only(left: 28),
      child: Text(
        _langues.map((l) => '${l['langue']} (${l['niveau']})').join(' · '),
        style: GoogleFonts.inter(fontSize: 11, color: AppTheme.text),
      ),
    );
  }

  // Template 6 : Stage — 1 page forcée
  Widget _buildStage(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // En-tête compact
          Container(
            padding: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: _accentColor, width: 2)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${_perso['prenom'] ?? ''} ${_perso['nom'] ?? ''}',
                        style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.text),
                      ),
                      if (_perso['titre'] != null && (_perso['titre'] as String).isNotEmpty)
                        Text(_perso['titre'] as String, style: GoogleFonts.inter(fontSize: 13, color: _accentColor, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    if (_perso['phone'] != null) Text(_perso['phone'] as String, style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted)),
                    if (_perso['email'] != null) Text(_perso['email'] as String, style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted)),
                    if (_perso['ville'] != null) Text(_perso['ville'] as String, style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (_perso['resume'] != null && (_perso['resume'] as String).isNotEmpty) ...[
            Text(_perso['resume'] as String, style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted, height: 1.4)),
            const SizedBox(height: 12),
          ],
          if (_formations.isNotEmpty) ...[
            _sectionTitle('FORMATION'),
            const SizedBox(height: 4),
            ..._formations.map((f) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(child: Text('${f['intitule']} — ${f['institution']}', style: GoogleFonts.inter(fontSize: 11, color: AppTheme.text))),
                  Text(f['annee'] as String? ?? '', style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted)),
                ],
              ),
            )),
            const SizedBox(height: 12),
          ],
          if (_experiences.isNotEmpty) ...[
            _sectionTitle('EXPÉRIENCES'),
            const SizedBox(height: 4),
            ..._experiences.map((e) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${e['poste']} | ${e['entreprise']} (${e['duree']})', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.text)),
                  if (e['description'] != null && (e['description'] as String).isNotEmpty)
                    Text(e['description'] as String, style: GoogleFonts.inter(fontSize: 10, color: AppTheme.muted)),
                ],
              ),
            )),
            const SizedBox(height: 12),
          ],
          if (_competences.isNotEmpty) ...[
            _sectionTitle('COMPÉTENCES'),
            const SizedBox(height: 4),
            Text(_competences.join(' · '), style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted)),
            const SizedBox(height: 8),
          ],
          if (_langues.isNotEmpty) ...[
            _sectionTitle('LANGUES'),
            const SizedBox(height: 4),
            Text(_langues.map((l) => '${l['langue']} (${l['niveau']})').join(' · '), style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted)),
          ],
        ],
      ),
    );
  }

  // Widgets communs
  Widget _buildNameHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${_perso['prenom'] ?? ''} ${_perso['nom'] ?? ''}',
          style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w700, color: AppTheme.text),
        ),
        if (_perso['titre'] != null && (_perso['titre'] as String).isNotEmpty)
          Text(_perso['titre'] as String, style: GoogleFonts.inter(fontSize: 14, color: _accentColor, fontWeight: FontWeight.w600)),
      ],
    );
  }

  Widget _buildContactLine() {
    final contacts = <String>[];
    if (_perso['phone'] != null && (_perso['phone'] as String).isNotEmpty) contacts.add(_perso['phone'] as String);
    if (_perso['email'] != null && (_perso['email'] as String).isNotEmpty) contacts.add(_perso['email'] as String);
    if (_perso['ville'] != null && (_perso['ville'] as String).isNotEmpty) contacts.add(_perso['ville'] as String);
    if (_perso['linkedin'] != null && (_perso['linkedin'] as String).isNotEmpty) contacts.add(_perso['linkedin'] as String);

    if (contacts.isEmpty) return const SizedBox();
    return Text(
      contacts.join('  |  '),
      style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted),
    );
  }

  Widget _sectionTitle(String title) {
    return Text(
      title,
      style: GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        color: _accentColor,
        letterSpacing: 1,
      ),
    );
  }

  Widget _minimalSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: AppTheme.muted2,
          letterSpacing: 2,
        ),
      ),
    );
  }

  Widget _buildExperienceItem(Map<String, dynamic> e) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  '${e['poste'] ?? ''} — ${e['entreprise'] ?? ''}',
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.text),
                ),
              ),
              Text(e['duree'] as String? ?? '', style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted)),
            ],
          ),
          if (e['description'] != null && (e['description'] as String).isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(e['description'] as String, style: GoogleFonts.inter(fontSize: 12, color: AppTheme.muted, height: 1.4)),
            ),
        ],
      ),
    );
  }

  Widget _buildFormationItem(Map<String, dynamic> f) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              '${f['intitule'] ?? ''} — ${f['institution'] ?? ''}',
              style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.text),
            ),
          ),
          Text(f['annee'] as String? ?? '', style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted)),
        ],
      ),
    );
  }

  Widget _buildMinimalItem(String title, String subtitle, String right, String desc) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(child: Text('$title — $subtitle', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.text))),
              Text(right, style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted)),
            ],
          ),
          if (desc.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(desc, style: GoogleFonts.inter(fontSize: 12, color: AppTheme.muted, height: 1.4)),
            ),
        ],
      ),
    );
  }

  Widget _buildCompetenceList() {
    return Wrap(
      spacing: 6,
      runSpacing: 4,
      children: _competences.map((c) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: _accentColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(c, style: GoogleFonts.inter(fontSize: 11, color: _accentColor, fontWeight: FontWeight.w500)),
        );
      }).toList(),
    );
  }

  Widget _buildLangueList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: _langues.map((l) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Row(
            children: [
              Text(l['langue'] as String? ?? '', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.text)),
              const SizedBox(width: 8),
              Text(l['niveau'] as String? ?? '', style: GoogleFonts.inter(fontSize: 11, color: AppTheme.muted)),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _sidebarSection(String title, List<String> items) {
    if (items.isEmpty) return const SizedBox();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: 1),
        ),
        const SizedBox(height: 4),
        ...items.map((item) => Padding(
          padding: const EdgeInsets.only(bottom: 2),
          child: Text(item, style: GoogleFonts.inter(fontSize: 11, color: Colors.white70)),
        )),
      ],
    );
  }
}