// Générateur du logo sticker de Vitae — la grammaire du logo The Everyday Co.
// (apps/everyday-co/scripts/logo-sticker.cjs) appliquée au vert de Vitae.
//
// Mêmes règles que la maison mère : Inter Black vectorisé, lettres cernées
// d'un filet d'encre, découpe blanche épaisse, ombre nette décalée. Seules
// changent les couleurs : le remplissage est le vert de Vitae (#6fae2e) et
// l'encre est le vert sombre de son en-tête (#17210c) plutôt que le brun de
// The Everyday Co. — on reconnaît la famille, on ne confond pas les deux.
//
// Usage : node scripts/logo-sticker.cjs <Inter-Black.ttf> public
// Écrit :
//   public/logo-ligne.svg   mot « Vitae », droit, pour l'en-tête
//   public/logo-v.svg       le V seul, incliné comme un autocollant posé
//   public/icon.svg         le V sur le carré sombre de l'app (source des PNG)
//   public/icon-maskable.svg  la même, V réduit dans la zone sûre d'Android
// puis les PNG de l'app (icon-192, icon-512, icon-maskable-512,
// apple-touch-icon) et les favicons via packages/pwa/favicon.mjs.
//
// La police est l'instance statique wght=900 d'Inter (OFL), tirée de la
// version variable avec fontTools : instancer.instantiateVariableFont(f, {'wght': 900}).
// Elle n'est pas versionnée.
const fontkit = require('fontkit');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });
const font = fontkit.openSync(process.argv[2]);

const INK = '#17210c', GREEN = '#6fae2e', WHITE = '#ffffff', BG = '#17210c';

// Texte -> chemin SVG (y vers le bas), taille en px, tracking en em.
// Repris tel quel du générateur The Everyday Co.
function textPath(text, { size, x = 0, y = 0, tracking = -0.04 }) {
  const s = size / font.unitsPerEm;
  const run = font.layout(text);
  let pen = 0, d = '', outer = '', minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const f = (n) => Math.round(n * 100) / 100;
  run.glyphs.forEach((g, i) => {
    const pos = run.positions[i];
    const ox = x + (pen + pos.xOffset) * s, oy = y - pos.yOffset * s;
    const P = (px, py) => {
      const X = ox + px * s, Y = oy - py * s;
      minX = Math.min(minX, X); maxX = Math.max(maxX, X); minY = Math.min(minY, Y); maxY = Math.max(maxY, Y);
      return f(X) + ' ' + f(Y);
    };
    const contours = []; let cur = null;
    for (const c of g.path.commands) {
      const a = c.args;
      if (c.command === 'moveTo') { cur = { d: 'M' + P(a[0], a[1]), pts: [[a[0], a[1]]] }; contours.push(cur); }
      else if (c.command === 'lineTo') { cur.d += 'L' + P(a[0], a[1]); cur.pts.push([a[0], a[1]]); }
      else if (c.command === 'quadraticCurveTo') { cur.d += 'Q' + P(a[0], a[1]) + ' ' + P(a[2], a[3]); cur.pts.push([a[2], a[3]]); }
      else if (c.command === 'bezierCurveTo') { cur.d += 'C' + P(a[0], a[1]) + ' ' + P(a[2], a[3]) + ' ' + P(a[4], a[5]); cur.pts.push([a[4], a[5]]); }
      else if (c.command === 'closePath') cur.d += 'Z';
    }
    for (const k of contours) { let A = 0; for (let j = 0; j < k.pts.length; j++) { const [x1, y1] = k.pts[j], [x2, y2] = k.pts[(j + 1) % k.pts.length]; A += x1 * y2 - x2 * y1; } k.area = A / 2; }
    const ref = contours.reduce((m, k) => (Math.abs(k.area) > Math.abs(m.area) ? k : m), { area: 0 });
    for (const k of contours) { d += k.d; if (Math.sign(k.area) === Math.sign(ref.area)) outer += k.d; }
    pen += pos.xAdvance + tracking * font.unitsPerEm;
  });
  return { d, outer, minX, maxX, minY, maxY };
}

// Les couches du sticker, dans l'ordre : ombre, découpe blanche, filet
// d'encre, remplissage vert.
function layers({ line, border, keyline, shadow }) {
  const sh = shadow ? Math.round(border * 0.28) : 0;
  const out = [];
  if (shadow) out.push(`<path d="${line.outer}" fill="${INK}" stroke="${INK}" stroke-width="${border}" stroke-linejoin="round" opacity=".22" transform="translate(${sh * 0.35} ${sh})"/>`);
  out.push(`<path d="${line.outer}" fill="${WHITE}" stroke="${WHITE}" stroke-width="${border}" stroke-linejoin="round"/>`);
  out.push(`<path d="${line.d}" fill="${INK}" stroke="${INK}" stroke-width="${keyline * 2}" stroke-linejoin="round"/>`);
  out.push(`<path d="${line.d}" fill="${GREEN}"/>`);
  return { svg: out.join('\n    '), sh };
}

// Sticker autonome, boîte ajustée (rotation comprise).
function sticker({ line, border, keyline, rotate = 0, title }) {
  const { svg, sh } = layers({ line, border, keyline, shadow: true });
  const cx = (line.minX + line.maxX) / 2, cy = (line.minY + line.maxY) / 2;
  const pad = border / 2 + keyline + 2;
  const r = (rotate * Math.PI) / 180;
  const corners = [[line.minX - pad, line.minY - pad], [line.maxX + pad, line.minY - pad], [line.minX - pad, line.maxY + pad], [line.maxX + pad, line.maxY + pad]]
    .map(([px, py]) => [cx + (px - cx) * Math.cos(r) - (py - cy) * Math.sin(r), cy + (px - cx) * Math.sin(r) + (py - cy) * Math.cos(r)]);
  const vx = Math.floor(Math.min(...corners.map((c) => c[0])));
  const vy = Math.floor(Math.min(...corners.map((c) => c[1])));
  const vw = Math.ceil(Math.max(...corners.map((c) => c[0])) - vx + sh);
  const vh = Math.ceil(Math.max(...corners.map((c) => c[1])) - vy + sh);
  const tr = rotate ? ` transform="rotate(${rotate} ${cx.toFixed(1)} ${cy.toFixed(1)})"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${vw}" height="${vh}" role="img" aria-label="${title}">
  <title>${title}</title>
  <g${tr}>
    ${svg}
  </g>
</svg>
`;
}

// Icône d'app : le V sticker centré sur le carré sombre de Vitae.
// Découpe et filet gardent les proportions du logo (40 et 6 pour une
// lettre de 120 px). `scale` = part du côté occupée par le sticker entier ;
// la version maskable le réduit pour rester dans la zone sûre d'Android
// (le cercle de 80 % du côté).
function icon({ scale, rounded }) {
  const S = 512;
  const v = textPath('V', { size: 120 });
  const border = 40, keyline = 6;
  const w = v.maxX - v.minX + border, h = v.maxY - v.minY + border;
  const k = (S * scale) / Math.max(w, h);
  const cx = (v.minX + v.maxX) / 2, cy = (v.minY + v.maxY) / 2;
  const { svg } = layers({ line: v, border, keyline, shadow: true });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="Vitae">
  <title>Vitae</title>
  <rect width="${S}" height="${S}"${rounded ? ' rx="112"' : ''} fill="${BG}"/>
  <g transform="translate(${S / 2} ${S / 2}) scale(${k.toFixed(4)}) rotate(-4) translate(${(-cx).toFixed(2)} ${(-cy).toFixed(2)})">
    ${svg}
  </g>
</svg>
`;
}

(async () => {
  // En-tête : le mot, droit, comme la ligne de The Everyday Co.
  fs.writeFileSync(path.join(OUT, 'logo-ligne.svg'),
    sticker({ line: textPath('Vitae', { size: 120 }), border: 40, keyline: 6, title: 'Vitae' }));

  // Monogramme : le V seul, incliné de -4°, comme le logo empilé de la maison.
  fs.writeFileSync(path.join(OUT, 'logo-v.svg'),
    sticker({ line: textPath('V', { size: 120 }), border: 40, keyline: 6, rotate: -4, title: 'Vitae' }));

  const any = icon({ scale: 0.7, rounded: true });
  const maskable = icon({ scale: 0.56, rounded: false });
  const full = icon({ scale: 0.66, rounded: false });
  fs.writeFileSync(path.join(OUT, 'icon.svg'), any);
  fs.writeFileSync(path.join(OUT, 'icon-maskable.svg'), maskable);

  const png = (svg, size, file) => sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(OUT, file));
  await png(any, 512, 'icon-512.png');
  await png(any, 192, 'icon-192.png');
  await png(maskable, 512, 'icon-maskable-512.png');
  // iOS arrondit lui-même et met du noir dans les coins transparents :
  // l'icône Apple part du carré plein.
  await png(full, 180, 'apple-touch-icon.png');

  const { writeFavicons } = await import('../../../packages/pwa/favicon.mjs');
  await writeFavicons(path.join(OUT, 'icon-512.png'), OUT);
  console.log('ok');
})();
