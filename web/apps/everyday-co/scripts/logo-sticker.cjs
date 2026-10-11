// Générateur du logo sticker The Everyday Co. — texte Inter 900 vectorisé.
// Usage : node scripts/logo-sticker.cjs <Inter-Black.ttf> public
// Écrit public/logo.svg (empilé) et public/logo-ligne.svg (navigation).
// La police est l'instance statique wght=900 d'Inter (OFL), tirée de la
// version variable avec fontTools : instancer.instantiateVariableFont(f, {'wght': 900}).
const fontkit = require('fontkit');
const fs = require('fs');
const OUT = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });
const base = fontkit.openSync(process.argv[2]);

const INK = '#171411', YELLOW = '#fdf150', WHITE = '#ffffff';

// Texte -> chemin SVG (y vers le bas), taille en px, tracking en em.
function textPath(text, { size, x = 0, y = 0, wght = 900, tracking = -0.04 }) {
  const font = base;
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
    // Contours séparés, avec leur aire signée : les contre-formes tournent
    // dans l'autre sens que les contours extérieurs.
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
  return { d, outer, width: (pen - tracking * font.unitsPerEm) * s, minX, maxX, minY, maxY };
}

// Assemble un sticker : bordure blanche (trait épais arrondi), ombre décalée,
// filet sombre optionnel, puis le remplissage des lettres.
function sticker({ lines, border, keyline = 0, fill = INK, rotate = 0, shadow = true, title }) {
  const d = lines.map((l) => l.d).join('');
  const o = lines.map((l) => l.outer).join('');
  const bb = lines.reduce((b, l) => ({ minX: Math.min(b.minX, l.minX), maxX: Math.max(b.maxX, l.maxX), minY: Math.min(b.minY, l.minY), maxY: Math.max(b.maxY, l.maxY) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
  const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;
  const pad = border / 2 + keyline + 2;
  const sh = shadow ? Math.round(border * 0.28) : 0;
  // Boîte après rotation, par les coins de la boîte élargie.
  const r = (rotate * Math.PI) / 180;
  const corners = [[bb.minX - pad, bb.minY - pad], [bb.maxX + pad, bb.minY - pad], [bb.minX - pad, bb.maxY + pad], [bb.maxX + pad, bb.maxY + pad]]
    .map(([px, py]) => [cx + (px - cx) * Math.cos(r) - (py - cy) * Math.sin(r), cy + (px - cx) * Math.sin(r) + (py - cy) * Math.cos(r)]);
  const vx = Math.floor(Math.min(...corners.map((c) => c[0])));
  const vy = Math.floor(Math.min(...corners.map((c) => c[1])));
  const vw = Math.ceil(Math.max(...corners.map((c) => c[0])) - vx + sh);
  const vh = Math.ceil(Math.max(...corners.map((c) => c[1])) - vy + sh);
  const tr = rotate ? ` transform="rotate(${rotate} ${cx.toFixed(1)} ${cy.toFixed(1)})"` : '';
  const layers = [];
  if (shadow) layers.push(`<path d="${o}" fill="${INK}" stroke="${INK}" stroke-width="${border}" stroke-linejoin="round" opacity=".22" transform="translate(${sh * 0.35} ${sh})"/>`);
  layers.push(`<path d="${o}" fill="${WHITE}" stroke="${WHITE}" stroke-width="${border}" stroke-linejoin="round"/>`);
  if (keyline) layers.push(`<path d="${d}" fill="${INK}" stroke="${INK}" stroke-width="${keyline * 2}" stroke-linejoin="round"/>`);
  layers.push(`<path d="${d}" fill="${fill}"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${vw}" height="${vh}" role="img" aria-label="${title}">
  <title>${title}</title>
  <g${tr}>
    ${layers.join('\n    ')}
  </g>
</svg>
`;
}

const T = 'The Everyday Co.';

// Logo principal : empilé, lettres jaunes cernées d'encre pour rester
// lisibles sur la découpe blanche, incliné comme un autocollant posé.
const big = 120;
const stacked = [
  textPath('The', { size: big * 0.62, y: 0 }),
  textPath('Everyday', { size: big, y: big * 0.92 }),
  textPath('Co.', { size: big, y: big * 1.84 }),
];
// Aligné à gauche, interlignage serré : la bordure soude les trois lignes.
fs.writeFileSync(OUT + '/logo.svg', sticker({ lines: stacked, border: 44, keyline: 7, fill: YELLOW, rotate: -4, title: T }));

// Déclinaison sur une ligne, droite, pour la barre de navigation.
const line = textPath(T, { size: 120 });
fs.writeFileSync(OUT + '/logo-ligne.svg', sticker({ lines: [line], border: 40, keyline: 6, fill: YELLOW, title: T }));
console.log('ok');
