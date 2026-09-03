import 'package:flutter/services.dart' show rootBundle;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../models/cv_model.dart';

/// Générateur PDF pour les CV Vitae
/// Utilise le package pdf pour créer un document A4 (210×297mm)
/// Charge une police Unicode (Roboto) pour supporter le français
class CvPdfGenerator {
  /// Police par défaut Unicode (chargée depuis les assets Flutter)
  static pw.Font? _regularFont;
  static pw.Font? _boldFont;
  static pw.Font? _italicFont;
  static bool _fontsLoading = false;
  static Future<void>? _fontsFuture;

  /// Charge les polices Unicode une seule fois
  static Future<void> _ensureFontsLoaded() {
    if (_fontsLoading) return _fontsFuture!;
    _fontsLoading = true;
    _fontsFuture = _loadFonts();
    return _fontsFuture!;
  }

  static Future<void> _loadFonts() async {
    try {
      _regularFont = pw.Font.ttf(await rootBundle.load('assets/fonts/Roboto-Regular.ttf'));
      _boldFont = pw.Font.ttf(await rootBundle.load('assets/fonts/Roboto-Bold.ttf'));
      _italicFont = pw.Font.ttf(await rootBundle.load('assets/fonts/Roboto-Italic.ttf'));
    } catch (e) {
      // Fallback aux polices par défaut si le chargement échoue
      _regularFont = null;
      _boldFont = null;
      _italicFont = null;
    }
  }

  /// Helper pour appliquer la police Unicode si chargée
  static pw.TextStyle _style({
    required double fontSize,
    pw.FontWeight? fontWeight,
    PdfColor? color,
    pw.FontStyle? fontStyle,
    double? letterSpacing,
    double? lineSpacing,
  }) {
    pw.Font? font;
    if (fontWeight == pw.FontWeight.bold) {
      font = _boldFont ?? _regularFont;
    } else if (fontStyle == pw.FontStyle.italic) {
      font = _italicFont ?? _regularFont;
    } else {
      font = _regularFont;
    }
    return pw.TextStyle(
      font: font,
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      fontStyle: fontStyle,
      letterSpacing: letterSpacing,
      lineSpacing: lineSpacing,
    );
  }

  /// Génère un document PDF à partir d'un CV
  /// Retourne le document ET déclenche le chargement des polices.
  /// Appeler `await CvPdfGenerator.generate(...)` pour s'assurer que
  /// les polices Unicode sont prêtes.
  static Future<pw.Document> generateAsync(Cv cv, {bool showWatermark = false}) async {
    await _ensureFontsLoaded();
    return _build(cv, showWatermark: showWatermark);
  }

  /// Version synchrone (utilise les polices déjà chargées ou le fallback)
  static pw.Document generate(Cv cv, {bool showWatermark = false}) {
    // Déclenche le chargement si pas encore fait
    if (!_fontsLoading) {
      _ensureFontsLoaded();
    }
    return _build(cv, showWatermark: showWatermark);
  }

  static pw.Document _build(Cv cv, {bool showWatermark = false}) {
    final accentColor = _parseColor(cv.couleurPrincipale);
    final perso = cv.getSection(SectionType.perso)?.donnees ?? {};
    final experiences = _getList(cv, SectionType.experience);
    final formations = _getList(cv, SectionType.formation);
    final competences = _getStringList(cv, SectionType.competence);
    final langues = _getList(cv, SectionType.langue);
    final interets = _getStringList(cv, SectionType.interet);

    // Métadonnées PDF — importantes pour la compatibilité ATS.
    // Le titre est « Prénom Nom — Titre professionnel » : c'est ce que les ATS
    // affichent comme nom de document et indexent comme premier champ.
    final prenom = (perso['prenom'] as String?)?.trim() ?? '';
    final nom = (perso['nom'] as String?)?.trim() ?? '';
    final titrePerso = (perso['titre'] as String?)?.trim() ?? '';
    final fullName = [prenom, nom].where((s) => s.isNotEmpty).join(' ').trim();
    final pdfTitle = fullName.isEmpty
        ? (cv.titre.isNotEmpty && cv.titre != 'Mon CV' ? cv.titre : 'CV — Vitae')
        : titrePerso.isNotEmpty
            ? '$fullName — $titrePerso'
            : (cv.titre.isNotEmpty && cv.titre != 'Mon CV' ? '$fullName — ${cv.titre}' : fullName);
    final pdfAuthor = fullName.isEmpty ? 'Vitae' : fullName;

    final pdf = pw.Document(
      title: pdfTitle,
      author: pdfAuthor,
      subject: 'CV — $pdfTitle',
      keywords: 'CV, ${cv.titre}, ${titrePerso.isNotEmpty ? titrePerso : cv.titre}',
      creator: 'Vitae — The Everyday Co.',
      theme: pw.ThemeData.withFont(
        base: _regularFont,
        bold: _boldFont,
        italic: _italicFont,
      ),
    );

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        header: (context) => _buildHeader(perso, accentColor, cv.templateId),
        build: (context) => _buildBodyForTemplate(
          cv.templateId,
          perso,
          experiences,
          formations,
          competences,
          langues,
          interets,
          accentColor,
          showWatermark,
        ),
      ),
    );

    return pdf;
  }

  static PdfColor _parseColor(String hex) {
    try {
      final value = int.parse(hex.replaceFirst('#', '0xFF'));
      return PdfColor(
        ((value >> 16) & 0xFF) / 255,
        ((value >> 8) & 0xFF) / 255,
        (value & 0xFF) / 255,
      );
    } catch (_) {
      return PdfColor.fromInt(0xFF3F6E91);
    }
  }

  static List<Map<String, dynamic>> _getList(Cv cv, SectionType type) {
    final section = cv.getSection(type);
    return List<Map<String, dynamic>>.from(
      (section?.donnees['items'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [],
    );
  }

  static List<String> _getStringList(Cv cv, SectionType type) {
    final section = cv.getSection(type);
    return List<String>.from(
      (section?.donnees['items'] as List<dynamic>?)?.cast<String>() ?? [],
    );
  }

  static pw.Widget _buildHeader(
    Map<String, dynamic> perso,
    PdfColor accentColor, [
    int templateId = 1,
  ]) {
    // Template 3 (Élégant) : en-tête pleine largeur coloré avec photo placeholder
    if (templateId == 3) {
      return pw.Container(
        padding: const pw.EdgeInsets.all(16),
        color: accentColor,
        child: pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.center,
          children: [
            pw.Container(
              width: 60,
              height: 60,
              decoration: pw.BoxDecoration(
                color: PdfColors.white,
                shape: pw.BoxShape.circle,
                border: pw.Border.all(color: PdfColors.white, width: 2),
              ),
              alignment: pw.Alignment.center,
              child: pw.Text(
                _initials(perso),
                style: _style(fontSize: 20, fontWeight: pw.FontWeight.bold, color: accentColor),
              ),
            ),
            pw.SizedBox(width: 16),
            pw.Expanded(
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(
                    '${perso['prenom'] ?? ''} ${perso['nom'] ?? ''}',
                    style: _style(fontSize: 22, fontWeight: pw.FontWeight.bold, color: PdfColors.white),
                  ),
                  if (perso['titre'] != null && (perso['titre'] as String).isNotEmpty)
                    pw.Text(
                      perso['titre'] as String,
                      style: _style(fontSize: 13, color: PdfColors.white, fontStyle: pw.FontStyle.italic),
                    ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // Template 5 (Académique) : en-tête centré, nom en MAJUSCULES, affiliation
    if (templateId == 5) {
      return pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.center,
        children: [
          pw.Center(
            child: pw.Text(
              '${perso['prenom'] ?? ''} ${perso['nom'] ?? ''}'.toUpperCase(),
              style: _style(fontSize: 20, fontWeight: pw.FontWeight.bold, letterSpacing: 2),
              textAlign: pw.TextAlign.center,
            ),
          ),
          if (perso['titre'] != null && (perso['titre'] as String).isNotEmpty) ...[
            pw.SizedBox(height: 4),
            pw.Center(
              child: pw.Text(
                perso['titre'] as String,
                style: _style(fontSize: 13, color: accentColor, fontWeight: pw.FontWeight.bold, fontStyle: pw.FontStyle.italic),
                textAlign: pw.TextAlign.center,
              ),
            ),
          ],
          if (perso['ville'] != null && (perso['ville'] as String).isNotEmpty) ...[
            pw.SizedBox(height: 2),
            pw.Center(
              child: pw.Text(
                perso['ville'] as String,
                style: _style(fontSize: 10, color: PdfColorGrey(0.5)),
                textAlign: pw.TextAlign.center,
              ),
            ),
          ],
          pw.SizedBox(height: 8),
          _buildContactLine(perso),
          pw.Divider(thickness: 0.5),
          pw.SizedBox(height: 12),
        ],
      );
    }

    // Template 6 (Stage) : en-tête compact avec bordure inférieure colorée
    if (templateId == 6) {
      return pw.Column(
        children: [
          pw.Container(
            padding: const pw.EdgeInsets.only(bottom: 8),
            decoration: pw.BoxDecoration(
              border: pw.Border(bottom: pw.BorderSide(color: accentColor, width: 2)),
            ),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        '${perso['prenom'] ?? ''} ${perso['nom'] ?? ''}',
                        style: _style(fontSize: 18, fontWeight: pw.FontWeight.bold),
                      ),
                      if (perso['titre'] != null && (perso['titre'] as String).isNotEmpty)
                        pw.Text(
                          perso['titre'] as String,
                          style: _style(fontSize: 12, color: accentColor, fontWeight: pw.FontWeight.bold),
                        ),
                    ],
                  ),
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.end,
                  children: [
                    if (perso['phone'] != null) pw.Text(perso['phone'] as String, style: _style(fontSize: 9, color: PdfColorGrey(0.5))),
                    if (perso['email'] != null) pw.Text(perso['email'] as String, style: _style(fontSize: 9, color: PdfColorGrey(0.5))),
                    if (perso['ville'] != null) pw.Text(perso['ville'] as String, style: _style(fontSize: 9, color: PdfColorGrey(0.5))),
                  ],
                ),
              ],
            ),
          ),
          pw.SizedBox(height: 12),
        ],
      );
    }

    // Templates 1 (Classique), 2 (Moderne), 4 (Minimal) : en-tête standard aligné à gauche
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          '${perso['prenom'] ?? ''} ${perso['nom'] ?? ''}',
          style: _style(fontSize: 24, fontWeight: pw.FontWeight.bold),
        ),
        if (perso['titre'] != null && (perso['titre'] as String).isNotEmpty)
          pw.Text(
            perso['titre'] as String,
            style: _style(fontSize: 14, color: accentColor, fontWeight: pw.FontWeight.bold),
          ),
        pw.SizedBox(height: 4),
        _buildContactLine(perso),
        pw.Divider(thickness: 1),
        pw.SizedBox(height: 12),
      ],
    );
  }

  static pw.Widget _buildContactLine(Map<String, dynamic> perso) {
    final contacts = <String>[];
    if (perso['phone'] != null && (perso['phone'] as String).isNotEmpty) contacts.add(perso['phone'] as String);
    if (perso['email'] != null && (perso['email'] as String).isNotEmpty) contacts.add(perso['email'] as String);
    if (perso['ville'] != null && (perso['ville'] as String).isNotEmpty) contacts.add(perso['ville'] as String);
    if (perso['linkedin'] != null && (perso['linkedin'] as String).isNotEmpty) contacts.add(perso['linkedin'] as String);

    if (contacts.isEmpty) return pw.SizedBox();
    return pw.Text(
      contacts.join('  |  '),
      style: _style(fontSize: 10, color: PdfColorGrey(0.5)),
    );
  }

  /// Initiales pour le placeholder photo du template Élégant.
  static String _initials(Map<String, dynamic> perso) {
    final prenom = (perso['prenom'] as String?)?.trim() ?? '';
    final nom = (perso['nom'] as String?)?.trim() ?? '';
    final i = prenom.isNotEmpty ? prenom[0] : '';
    final j = nom.isNotEmpty ? nom[0] : '';
    return '$i$j'.toUpperCase();
  }

  /// Sélectionne le builder de corps selon le template.
  /// Les templates 1 (Classique) et 4 (Minimal) partagent un layout 1 colonne
  /// (Minimal est juste plus épuré). Le template 2 (Moderne) est 2 colonnes avec
  /// sidebar colorée. Le 3 (Élégant) a un en-tête pleine largeur. Le 5 (Académique)
  /// a des sections numérotées en chiffres romains. Le 6 (Stage) est compact 1 page.
  static List<pw.Widget> _buildBodyForTemplate(
    int templateId,
    Map<String, dynamic> perso,
    List<Map<String, dynamic>> experiences,
    List<Map<String, dynamic>> formations,
    List<String> competences,
    List<Map<String, dynamic>> langues,
    List<String> interets,
    PdfColor accentColor,
    bool showWatermark,
  ) {
    switch (templateId) {
      case 2:
        return _buildBodyModerne(perso, experiences, formations, competences, langues, interets, accentColor, showWatermark);
      case 5:
        return _buildBodyAcademique(perso, experiences, formations, competences, langues, interets, accentColor, showWatermark);
      case 6:
        return _buildBodyStage(perso, experiences, formations, competences, langues, interets, accentColor, showWatermark);
      case 4:
        // Minimal : layout 1 colonne très épuré (réutilise Classique avec titres minimalistes)
        return _buildBodyMinimal(perso, experiences, formations, competences, langues, interets, accentColor, showWatermark);
      case 1:
      default:
        return _buildBody(perso, experiences, formations, competences, langues, interets, accentColor, showWatermark);
    }
  }

  /// Template 2 : Moderne — 2 colonnes avec sidebar colorée à gauche.
  /// Le header standard est déjà rendu par _buildHeader ; ici on retourne
  /// un Row avec sidebar + contenu. Comme MultiPage attend une liste de widgets,
  /// on wrap dans un seul pw.Row qui occupera la largeur de la page.
  static List<pw.Widget> _buildBodyModerne(
    Map<String, dynamic> perso,
    List<Map<String, dynamic>> experiences,
    List<Map<String, dynamic>> formations,
    List<String> competences,
    List<Map<String, dynamic>> langues,
    List<String> interets,
    PdfColor accentColor,
    bool showWatermark,
  ) {
    // Sidebar gauche — contact, compétences, langues, intérêts
    final sidebar = pw.Container(
      width: 160,
      padding: const pw.EdgeInsets.all(16),
      color: accentColor,
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          _sidebarTitle('CONTACT', accentColor),
          pw.SizedBox(height: 4),
          if (perso['phone'] != null) pw.Text(perso['phone'] as String, style: _style(fontSize: 9, color: PdfColors.white)),
          if (perso['email'] != null) pw.Text(perso['email'] as String, style: _style(fontSize: 9, color: PdfColors.white)),
          if (perso['ville'] != null) pw.Text(perso['ville'] as String, style: _style(fontSize: 9, color: PdfColors.white)),
          if (perso['linkedin'] != null) pw.Text(perso['linkedin'] as String, style: _style(fontSize: 9, color: PdfColors.white)),
          if (competences.isNotEmpty) ...[
            pw.SizedBox(height: 14),
            _sidebarTitle('COMPÉTENCES', accentColor),
            pw.SizedBox(height: 4),
            ...competences.map((c) => pw.Padding(
                  padding: const pw.EdgeInsets.only(bottom: 2),
                  child: pw.Text('• $c', style: _style(fontSize: 9, color: PdfColors.white)),
                )),
          ],
          if (langues.isNotEmpty) ...[
            pw.SizedBox(height: 14),
            _sidebarTitle('LANGUES', accentColor),
            pw.SizedBox(height: 4),
            ...langues.map((l) => pw.Padding(
                  padding: const pw.EdgeInsets.only(bottom: 2),
                  child: pw.Text(
                    '${l['langue'] ?? ''} (${l['niveau'] ?? ''})',
                    style: _style(fontSize: 9, color: PdfColors.white),
                  ),
                )),
          ],
          if (interets.isNotEmpty) ...[
            pw.SizedBox(height: 14),
            _sidebarTitle('INTÉRÊTS', accentColor),
            pw.SizedBox(height: 4),
            ...interets.map((i) => pw.Padding(
                  padding: const pw.EdgeInsets.only(bottom: 2),
                  child: pw.Text('• $i', style: _style(fontSize: 9, color: PdfColors.white)),
                )),
          ],
        ],
      ),
    );

    // Contenu droit — résumé, expériences, formation
    final content = pw.Expanded(
      child: pw.Container(
        padding: const pw.EdgeInsets.all(16),
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            if (perso['resume'] != null && (perso['resume'] as String).isNotEmpty) ...[
              _sectionTitle('RÉSUMÉ', accentColor),
              pw.SizedBox(height: 6),
              pw.Text(perso['resume'] as String, style: _style(fontSize: 10, color: PdfColorGrey(0.4), lineSpacing: 1.5)),
              pw.SizedBox(height: 14),
            ],
            if (experiences.isNotEmpty) ...[
              _sectionTitle('EXPÉRIENCES', accentColor),
              pw.SizedBox(height: 6),
              ...experiences.map((e) => _buildExperienceItem(e)),
              pw.SizedBox(height: 12),
            ],
            if (formations.isNotEmpty) ...[
              _sectionTitle('FORMATION', accentColor),
              pw.SizedBox(height: 6),
              ...formations.map((f) => _buildFormationItem(f)),
            ],
          ],
        ),
      ),
    );

    return [
      pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [sidebar, content],
      ),
      if (showWatermark) _buildWatermark(),
    ];
  }

  static pw.Widget _sidebarTitle(String title, PdfColor accentColor) {
    return pw.Text(
      title,
      style: _style(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.white, letterSpacing: 1),
    );
  }

  /// Template 5 : Académique — sections numérotées en chiffres romains, format dense.
  static List<pw.Widget> _buildBodyAcademique(
    Map<String, dynamic> perso,
    List<Map<String, dynamic>> experiences,
    List<Map<String, dynamic>> formations,
    List<String> competences,
    List<Map<String, dynamic>> langues,
    List<String> interets,
    PdfColor accentColor,
    bool showWatermark,
  ) {
    final widgets = <pw.Widget>[];

    if (perso['resume'] != null && (perso['resume'] as String).isNotEmpty) {
      widgets.add(_academicTitle('I', 'PROPOSITION DE RECHERCHE', accentColor));
      widgets.add(pw.SizedBox(height: 6));
      widgets.add(pw.Text(
        perso['resume'] as String,
        style: _style(fontSize: 10, color: PdfColorGrey(0.3), lineSpacing: 1.5),
        textAlign: pw.TextAlign.justify,
      ));
      widgets.add(pw.SizedBox(height: 14));
    }
    if (experiences.isNotEmpty) {
      widgets.add(_academicTitle('II', 'EXPÉRIENCES PROFESSIONNELLES', accentColor));
      widgets.add(pw.SizedBox(height: 6));
      for (final e in experiences) {
        widgets.add(_buildAcademicExperienceItem(e, accentColor));
        widgets.add(pw.SizedBox(height: 8));
      }
      widgets.add(pw.SizedBox(height: 6));
    }
    if (formations.isNotEmpty) {
      widgets.add(_academicTitle('III', 'FORMATION ACADÉMIQUE', accentColor));
      widgets.add(pw.SizedBox(height: 6));
      for (final f in formations) {
        widgets.add(_buildAcademicFormationItem(f, accentColor));
        widgets.add(pw.SizedBox(height: 4));
      }
      widgets.add(pw.SizedBox(height: 10));
    }
    if (competences.isNotEmpty) {
      widgets.add(_academicTitle('IV', 'COMPÉTENCES & OUTILS', accentColor));
      widgets.add(pw.SizedBox(height: 6));
      widgets.add(pw.Text(
        competences.join(' · '),
        style: _style(fontSize: 10, color: PdfColorGrey(0.3), lineSpacing: 1.5),
      ));
      widgets.add(pw.SizedBox(height: 12));
    }
    if (langues.isNotEmpty) {
      widgets.add(_academicTitle('V', 'LANGUES', accentColor));
      widgets.add(pw.SizedBox(height: 6));
      widgets.add(pw.Text(
        langues.map((l) => '${l['langue']} (${l['niveau']})').join(' · '),
        style: _style(fontSize: 10, color: PdfColorGrey(0.3)),
      ));
      widgets.add(pw.SizedBox(height: 12));
    }
    if (interets.isNotEmpty) {
      widgets.add(_academicTitle('VI', "CENTRES D'INTÉRÊT", accentColor));
      widgets.add(pw.SizedBox(height: 6));
      widgets.add(pw.Text(
        interets.join(' · '),
        style: _style(fontSize: 10, color: PdfColorGrey(0.3)),
      ));
    }

    if (showWatermark) widgets.add(_buildWatermark());
    return widgets;
  }

  static pw.Widget _academicTitle(String roman, String title, PdfColor accentColor) {
    return pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.SizedBox(
          width: 28,
          child: pw.Text(roman, style: _style(fontSize: 12, fontWeight: pw.FontWeight.bold, color: accentColor)),
        ),
        pw.Expanded(
          child: pw.Text(
            title,
            style: _style(fontSize: 11, fontWeight: pw.FontWeight.bold, letterSpacing: 1),
          ),
        ),
        pw.Container(
          height: 1,
          width: 40,
          color: accentColor,
        ),
      ],
    );
  }

  static pw.Widget _buildAcademicExperienceItem(Map<String, dynamic> e, PdfColor accentColor) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(left: 28, bottom: 6),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Expanded(
                child: pw.Text(
                  '${e['poste'] ?? ''} — ${e['entreprise'] ?? ''}',
                  style: _style(fontSize: 11, fontWeight: pw.FontWeight.bold),
                ),
              ),
              pw.Text(
                e['duree'] as String? ?? '',
                style: _style(fontSize: 9, color: accentColor, fontWeight: pw.FontWeight.bold),
              ),
            ],
          ),
          if (e['description'] != null && (e['description'] as String).isNotEmpty)
            pw.Padding(
              padding: const pw.EdgeInsets.only(top: 2),
              child: pw.Text(
                e['description'] as String,
                style: _style(fontSize: 10, color: PdfColorGrey(0.4), lineSpacing: 1.4),
                textAlign: pw.TextAlign.justify,
              ),
            ),
        ],
      ),
    );
  }

  static pw.Widget _buildAcademicFormationItem(Map<String, dynamic> f, PdfColor accentColor) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(left: 28, bottom: 4),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Expanded(
            child: pw.Text(
              '${f['intitule'] ?? ''} — ${f['institution'] ?? ''}',
              style: _style(fontSize: 11, fontWeight: pw.FontWeight.bold),
            ),
          ),
          pw.Text(
            f['annee'] as String? ?? '',
            style: _style(fontSize: 9, color: accentColor, fontWeight: pw.FontWeight.bold),
          ),
        ],
      ),
    );
  }

  /// Template 6 : Stage — 1 page forcée, format compact.
  static List<pw.Widget> _buildBodyStage(
    Map<String, dynamic> perso,
    List<Map<String, dynamic>> experiences,
    List<Map<String, dynamic>> formations,
    List<String> competences,
    List<Map<String, dynamic>> langues,
    List<String> interets,
    PdfColor accentColor,
    bool showWatermark,
  ) {
    final widgets = <pw.Widget>[];

    if (perso['resume'] != null && (perso['resume'] as String).isNotEmpty) {
      widgets.add(pw.Text(
        perso['resume'] as String,
        style: _style(fontSize: 10, color: PdfColorGrey(0.4), lineSpacing: 1.4),
      ));
      widgets.add(pw.SizedBox(height: 10));
    }
    if (formations.isNotEmpty) {
      widgets.add(_sectionTitle('FORMATION', accentColor));
      widgets.add(pw.SizedBox(height: 4));
      for (final f in formations) {
        widgets.add(pw.Padding(
          padding: const pw.EdgeInsets.only(bottom: 3),
          child: pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Expanded(
                child: pw.Text(
                  '${f['intitule'] ?? ''} — ${f['institution'] ?? ''}',
                  style: _style(fontSize: 10, fontWeight: pw.FontWeight.bold),
                ),
              ),
              pw.Text(f['annee'] as String? ?? '', style: _style(fontSize: 9, color: PdfColorGrey(0.5))),
            ],
          ),
        ));
      }
      widgets.add(pw.SizedBox(height: 10));
    }
    if (experiences.isNotEmpty) {
      widgets.add(_sectionTitle('EXPÉRIENCES', accentColor));
      widgets.add(pw.SizedBox(height: 4));
      for (final e in experiences) {
        widgets.add(pw.Padding(
          padding: const pw.EdgeInsets.only(bottom: 5),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                '${e['poste'] ?? ''} | ${e['entreprise'] ?? ''} (${e['duree'] ?? ''})',
                style: _style(fontSize: 10, fontWeight: pw.FontWeight.bold),
              ),
              if (e['description'] != null && (e['description'] as String).isNotEmpty)
                pw.Text(
                  e['description'] as String,
                  style: _style(fontSize: 9, color: PdfColorGrey(0.4)),
                ),
            ],
          ),
        ));
      }
      widgets.add(pw.SizedBox(height: 10));
    }
    if (competences.isNotEmpty) {
      widgets.add(_sectionTitle('COMPÉTENCES', accentColor));
      widgets.add(pw.SizedBox(height: 4));
      widgets.add(pw.Text(competences.join(' · '), style: _style(fontSize: 10, color: PdfColorGrey(0.4))));
      widgets.add(pw.SizedBox(height: 8));
    }
    if (langues.isNotEmpty) {
      widgets.add(_sectionTitle('LANGUES', accentColor));
      widgets.add(pw.SizedBox(height: 4));
      widgets.add(pw.Text(
        langues.map((l) => '${l['langue']} (${l['niveau']})').join(' · '),
        style: _style(fontSize: 10, color: PdfColorGrey(0.4)),
      ));
    }

    if (showWatermark) widgets.add(_buildWatermark());
    return widgets;
  }

  /// Template 4 : Minimal — 1 colonne, très épuré, titres minimalistes.
  static List<pw.Widget> _buildBodyMinimal(
    Map<String, dynamic> perso,
    List<Map<String, dynamic>> experiences,
    List<Map<String, dynamic>> formations,
    List<String> competences,
    List<Map<String, dynamic>> langues,
    List<String> interets,
    PdfColor accentColor,
    bool showWatermark,
  ) {
    final widgets = <pw.Widget>[];

    if (perso['resume'] != null && (perso['resume'] as String).isNotEmpty) {
      widgets.add(pw.Text(
        perso['resume'] as String,
        style: _style(fontSize: 11, color: PdfColorGrey(0.4), lineSpacing: 1.8),
      ));
      widgets.add(pw.SizedBox(height: 20));
    }
    if (experiences.isNotEmpty) {
      widgets.add(_minimalTitle('EXPÉRIENCES'));
      widgets.add(pw.SizedBox(height: 6));
      for (final e in experiences) {
        widgets.add(_buildMinimalItem('${e['poste'] ?? ''}', '${e['entreprise'] ?? ''}', e['duree'] as String? ?? '', e['description'] as String? ?? ''));
      }
      widgets.add(pw.SizedBox(height: 16));
    }
    if (formations.isNotEmpty) {
      widgets.add(_minimalTitle('FORMATION'));
      widgets.add(pw.SizedBox(height: 6));
      for (final f in formations) {
        widgets.add(_buildMinimalItem('${f['intitule'] ?? ''}', '${f['institution'] ?? ''}', f['annee'] as String? ?? '', f['mention'] as String? ?? ''));
      }
      widgets.add(pw.SizedBox(height: 16));
    }
    if (competences.isNotEmpty) {
      widgets.add(_minimalTitle('COMPÉTENCES'));
      widgets.add(pw.SizedBox(height: 4));
      widgets.add(pw.Text(competences.join('  ·  '), style: _style(fontSize: 11, color: PdfColorGrey(0.4), lineSpacing: 1.6)));
      widgets.add(pw.SizedBox(height: 14));
    }
    if (langues.isNotEmpty) {
      widgets.add(_minimalTitle('LANGUES'));
      widgets.add(pw.SizedBox(height: 4));
      widgets.add(pw.Text(
        langues.map((l) => '${l['langue']} — ${l['niveau']}').join('  ·  '),
        style: _style(fontSize: 11, color: PdfColorGrey(0.4)),
      ));
    }

    if (showWatermark) widgets.add(_buildWatermark());
    return widgets;
  }

  static pw.Widget _minimalTitle(String title) {
    return pw.Text(
      title,
      style: _style(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColorGrey(0.6), letterSpacing: 2),
    );
  }

  static pw.Widget _buildMinimalItem(String title, String subtitle, String right, String desc) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 8),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Expanded(
                child: pw.Text('$title — $subtitle', style: _style(fontSize: 11, fontWeight: pw.FontWeight.bold)),
              ),
              pw.Text(right, style: _style(fontSize: 9, color: PdfColorGrey(0.5))),
            ],
          ),
          if (desc.isNotEmpty)
            pw.Padding(
              padding: const pw.EdgeInsets.only(top: 2),
              child: pw.Text(desc, style: _style(fontSize: 10, color: PdfColorGrey(0.4), lineSpacing: 1.4)),
            ),
        ],
      ),
    );
  }

  static pw.Widget _buildWatermark() {
    return pw.Align(
      alignment: pw.Alignment.bottomRight,
      child: pw.Padding(
        padding: const pw.EdgeInsets.only(top: 20),
        child: pw.Text(
          'Créé avec Vitae',
          style: _style(fontSize: 8, color: PdfColorGrey(0.7), fontStyle: pw.FontStyle.italic),
        ),
      ),
    );
  }

  static List<pw.Widget> _buildBody(
    Map<String, dynamic> perso,
    List<Map<String, dynamic>> experiences,
    List<Map<String, dynamic>> formations,
    List<String> competences,
    List<Map<String, dynamic>> langues,
    List<String> interets,
    PdfColor accentColor,
    bool showWatermark,
  ) {
    final widgets = <pw.Widget>[];

    // Résumé
    if (perso['resume'] != null && (perso['resume'] as String).isNotEmpty) {
      widgets.add(_sectionTitle('RÉSUMÉ', accentColor));
      widgets.add(pw.SizedBox(height: 6));
      widgets.add(pw.Text(
        perso['resume'] as String,
        style: _style(fontSize: 11, color: PdfColorGrey(0.4), lineSpacing: 1.5),
      ));
      widgets.add(pw.SizedBox(height: 16));
    }

    // Expériences
    if (experiences.isNotEmpty) {
      widgets.add(_sectionTitle('EXPÉRIENCES PROFESSIONNELLES', accentColor));
      widgets.add(pw.SizedBox(height: 6));
      for (final e in experiences) {
        widgets.add(_buildExperienceItem(e));
        widgets.add(pw.SizedBox(height: 8));
      }
      widgets.add(pw.SizedBox(height: 8));
    }

    // Formation
    if (formations.isNotEmpty) {
      widgets.add(_sectionTitle('FORMATION', accentColor));
      widgets.add(pw.SizedBox(height: 6));
      for (final f in formations) {
        widgets.add(_buildFormationItem(f));
        widgets.add(pw.SizedBox(height: 4));
      }
      widgets.add(pw.SizedBox(height: 12));
    }

    // Compétences
    if (competences.isNotEmpty) {
      widgets.add(_sectionTitle('COMPÉTENCES', accentColor));
      widgets.add(pw.SizedBox(height: 6));
      widgets.add(pw.Wrap(
        spacing: 6,
        runSpacing: 4,
        children: competences.map((c) => pw.Container(
          padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: pw.BoxDecoration(
            color: accentColor.shade(0.1),
            borderRadius: pw.BorderRadius.circular(4),
          ),
          child: pw.Text(c, style: _style(fontSize: 10, color: accentColor, fontWeight: pw.FontWeight.bold)),
        )).toList(),
      ));
      widgets.add(pw.SizedBox(height: 12));
    }

    // Langues
    if (langues.isNotEmpty) {
      widgets.add(_sectionTitle('LANGUES', accentColor));
      widgets.add(pw.SizedBox(height: 6));
      for (final l in langues) {
        widgets.add(pw.Row(
          children: [
            pw.Text(l['langue'] as String? ?? '', style: _style(fontSize: 11, fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(width: 8),
            pw.Text(l['niveau'] as String? ?? '', style: _style(fontSize: 10, color: PdfColorGrey(0.5))),
          ],
        ));
        widgets.add(pw.SizedBox(height: 2));
      }
      widgets.add(pw.SizedBox(height: 12));
    }

    // Intérêts
    if (interets.isNotEmpty) {
      widgets.add(_sectionTitle("CENTRES D'INTÉRÊT", accentColor));
      widgets.add(pw.SizedBox(height: 6));
      widgets.add(pw.Text(
        interets.join(' • '),
        style: _style(fontSize: 11, color: PdfColorGrey(0.4)),
      ));
    }

    // Watermark
    if (showWatermark) {
      widgets.add(pw.SizedBox(height: 24));
      widgets.add(pw.Center(
        child: pw.Text(
          'Créé avec Vitae — The Everyday Co.',
          style: _style(fontSize: 9, color: PdfColorGrey(0.6), fontStyle: pw.FontStyle.italic),
        ),
      ));
    }

    return widgets;
  }

  static pw.Widget _sectionTitle(String title, PdfColor accentColor) {
    return pw.Text(
      title,
      style: _style(
        fontSize: 12,
        fontWeight: pw.FontWeight.bold,
        color: accentColor,
        letterSpacing: 1,
      ),
    );
  }

  static pw.Widget _buildExperienceItem(Map<String, dynamic> e) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Expanded(
              child: pw.Text(
                '${e['poste'] ?? ''} — ${e['entreprise'] ?? ''}',
                style: _style(fontSize: 12, fontWeight: pw.FontWeight.bold),
              ),
            ),
            pw.Text(
              e['duree'] as String? ?? '',
              style: _style(fontSize: 10, color: PdfColorGrey(0.5)),
            ),
          ],
        ),
        if (e['description'] != null && (e['description'] as String).isNotEmpty)
          pw.Padding(
            padding: const pw.EdgeInsets.only(top: 2),
            child: pw.Text(
              e['description'] as String,
              style: _style(fontSize: 11, color: PdfColorGrey(0.4), lineSpacing: 1.4),
            ),
          ),
      ],
    );
  }

  static pw.Widget _buildFormationItem(Map<String, dynamic> f) {
    return pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
      children: [
        pw.Expanded(
          child: pw.Text(
            '${f['intitule'] ?? ''} — ${f['institution'] ?? ''}',
            style: _style(fontSize: 12, fontWeight: pw.FontWeight.bold),
          ),
        ),
        pw.Text(
          f['annee'] as String? ?? '',
          style: _style(fontSize: 10, color: PdfColorGrey(0.5)),
        ),
      ],
    );
  }
}