import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  ACCENT_PRESETS, accentSurface, inkAccent, normalizeAccent, onAccent, tint,
} from '../src/colors.ts';
import { emptyResume, normalizeResume } from '../src/resume.ts';
import { TEMPLATES } from '../src/templates.ts';
import { SAMPLE_RESUME } from '../src/samples.ts';

/**
 * Remise en forme d'un CV et dérivation des couleurs.
 *
 * Les deux sujets sont testés ensemble parce qu'ils protègent la même chose :
 * ce qui entre dans les renderers. Un CV mal remonté ou une couleur illisible
 * ne se voit pas au typage — seulement sur le PDF téléchargé.
 */

/** Luminance relative WCAG, pour vérifier un contraste sans dupliquer le code testé. */
function contrast(a: string, b: string): number {
  const lum = (hex: string): number => {
    const channels = [1, 3, 5].map((i) => {
      const s = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

test('un brouillon de la version 1 remonte sans perdre son contenu', () => {
  const v1 = {
    schemaVersion: 1,
    templateId: 'sobre',
    personal: {
      fullName: 'Aya Koffi', location: 'Abidjan', phone: '07', email: 'a@b.ci', links: [],
    },
    headline: 'Comptable',
    summary: 'Un résumé.',
    experiences: [],
    education: [],
    skills: ['Excel'],
    languages: [],
    certifications: [],
    projects: [],
  };

  const migrated = normalizeResume(v1);

  assert.ok(migrated !== null);
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.personal.fullName, 'Aya Koffi');
  assert.deepEqual(migrated.skills, ['Excel']);
  // Un CV d'avant la couleur primaire hérite de celle de son modèle.
  assert.equal(migrated.accentColor, TEMPLATES.sobre.defaultAccent);
  assert.equal(migrated.personal.photo, null);
  assert.equal(migrated.personal.showPhoto, true);
});

test('ce qui n’est pas un CV est refusé', () => {
  assert.equal(normalizeResume(null), null);
  assert.equal(normalizeResume('un CV'), null);
  assert.equal(normalizeResume({ schemaVersion: 99 }), null);
  assert.equal(normalizeResume({ schemaVersion: 2, personal: {} }), null);
});

test('une photo qui n’est pas une image est écartée', () => {
  const withJunk = normalizeResume({
    ...SAMPLE_RESUME,
    personal: { ...SAMPLE_RESUME.personal, photo: 'javascript:alert(1)' },
  });
  assert.ok(withJunk !== null);
  assert.equal(withJunk.personal.photo, null);

  const withImage = normalizeResume({
    ...SAMPLE_RESUME,
    personal: { ...SAMPLE_RESUME.personal, photo: 'data:image/png;base64,AAAA' },
  });
  assert.ok(withImage !== null);
  assert.equal(withImage.personal.photo, 'data:image/png;base64,AAAA');
});

test('une couleur illisible est remplacée, pas propagée', () => {
  const resume = normalizeResume({ ...SAMPLE_RESUME, accentColor: 'rouge' });
  assert.ok(resume !== null);
  assert.equal(resume.accentColor, TEMPLATES.classique.defaultAccent);
  assert.equal(normalizeAccent('#ABCDEF'), '#abcdef');
});

test('un modèle inconnu retombe sur Classique', () => {
  const resume = normalizeResume({ ...SAMPLE_RESUME, templateId: 'canva' });
  assert.ok(resume !== null);
  assert.equal(resume.templateId, 'classique');
});

test('un CV vierge part avec la couleur de son modèle', () => {
  for (const spec of Object.values(TEMPLATES)) {
    assert.equal(emptyResume(spec.id).accentColor, spec.defaultAccent);
  }
});

test('le texte posé sur la couleur primaire reste lisible', () => {
  // Y compris pour une primaire choisie à la pipette, jaune fluo compris :
  // c'est le bandeau du modèle Compact qui en dépend.
  for (const accent of [...ACCENT_PRESETS.map((p) => p.value), '#ffee00', '#000000', '#ffffff']) {
    assert.ok(
      contrast(onAccent(accent), accent) >= 4.5,
      `contraste insuffisant sur un aplat ${accent}`,
    );
    assert.ok(
      contrast(inkAccent(accent), '#ffffff') >= 4.5,
      `titre de section illisible sur blanc pour ${accent}`,
    );
  }
});

test('la teinte claire reste un fond, jamais une couleur de texte', () => {
  for (const preset of ACCENT_PRESETS) {
    const soft = tint(preset.value, 0.12);
    assert.ok(
      contrast('#111111', soft) >= 7,
      `le fond teinté de ${preset.label} n’accueille pas de texte encre`,
    );
  }
});

test('un aplat porte toujours son texte, quelle que soit la couleur choisie', () => {
  // Balayage de tout l'espace RVB par pas de 0x33 : la pipette du système ne
  // propose aucune garantie, et il existe une bande de verts et de bleus
  // moyens où ni le blanc ni l'encre n'atteignent 4,5:1. C'est le bandeau du
  // modèle « Compact » qui en dépend, ligne de coordonnées comprise.
  const steps = [0x00, 0x33, 0x66, 0x99, 0xcc, 0xff];
  for (const r of steps) {
    for (const g of steps) {
      for (const b of steps) {
        const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
        const { background, text } = accentSurface(hex);
        assert.ok(
          contrast(background, text) >= 4.5,
          `aplat illisible pour ${hex} (rendu ${background} / ${text})`,
        );
      }
    }
  }
});
