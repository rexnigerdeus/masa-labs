import 'package:flutter_test/flutter_test.dart';

import 'package:vitae/features/cv/models/cv_model.dart';

void main() {
  test('CvModel — parsing from JSON', () {
    final cv = Cv.fromJson({
      'id': 'test-id',
      'user_id': 'user-1',
      'titre': 'Mon CV Test',
      'template_id': 1,
      'couleur_principale': '#3F6E91',
      'statut': 'brouillon',
      'sections': [],
    });

    expect(cv.id, 'test-id');
    expect(cv.titre, 'Mon CV Test');
    expect(cv.templateId, 1);
    expect(cv.couleurPrincipale, '#3F6E91');
    expect(cv.statut, 'brouillon');
    expect(cv.sections, isEmpty);
  });

  test('CvSection — type labels', () {
    expect(SectionType.perso.label, 'Informations personnelles');
    expect(SectionType.experience.label, 'Expériences');
    expect(SectionType.formation.label, 'Formation');
    expect(SectionType.competence.label, 'Compétences');
    expect(SectionType.langue.label, 'Langues');
    expect(SectionType.interet.label, "Centres d'intérêt");
  });

  test('CvTemplate — fallback templates', () {
    expect(fallbackTemplates.length, 6);
    expect(fallbackTemplates[0].nom, 'Classique');
    expect(fallbackTemplates[0].disponibleFree, isTrue);
    expect(fallbackTemplates[5].nom, 'Stage');
    expect(fallbackTemplates[5].disponibleFree, isTrue);
    expect(fallbackTemplates[1].disponibleFree, isFalse);
  });

  test('Cv — getSection by type', () {
    final cv = Cv(
      id: 'test',
      userId: 'user',
      titre: 'Test',
      sections: [
        CvSection(cvId: 'test', type: SectionType.perso, ordre: 0, donnees: {'prenom': 'Aya'}),
      ],
    );

    final section = cv.getSection(SectionType.perso);
    expect(section, isNotNull);
    expect(section!.donnees['prenom'], 'Aya');

    final missing = cv.getSection(SectionType.experience);
    expect(missing, isNull);
  });
}