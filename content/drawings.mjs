// Build-time drawings of every cut: drawCut(id) returns a standalone SVG (400x300, transparent).
// Drawn the way Marisol draws on the paper roll: a marker line with a faint second pass, lean in red pencil hatch,
// fat in faint yellow, skin in tan, bone left as paper. The hand's wobble is baked into the points (a long stroke
// shakes more than a short one), so there are no SVG filters. Every random choice comes from a PRNG seeded by the id,
// so a rebuild writes byte-identical files. NOTES holds the handwritten notes the page sets beside each drawing.

const { sin, cos, PI, abs, sqrt, hypot, atan2, max, min, floor } = Math;
const TAU = PI * 2, D = PI / 180;
const INK = '#221C17', PAPER = '#FBF6EC';

// pencils: [paper tint, pencil, line width, opacity, spacing, cross-hatched, angle offset]; one entry = a flat fill
const M = {
  L: ['#E7B1A8', '#9B2530', 2.6, 0.85, 5, 1, 0], // beef lean: red pencil, cross-hatched
  Ld: ['#DD9F96', '#83202B', 2.8, 0.9, 5, 1, 0], // beef, outside surface
  SA: ['#D2918B', '#661822', 2.8, 0.9, 4.6, 1, 0], // salami
  A: ['#EFC7C0', '#962A35', 2.5, 0.85, 5, 0, 0], // lamb lean, darker than pork
  Ad: ['#E7B5AD', '#7C2230', 2.7, 0.9, 5, 0, 0],
  P: ['#F8E5DE', '#BE4249', 2.2, 0.78, 5, 0, 0], // pork lean
  Pd: ['#F2D7CF', '#AC3C42', 2.4, 0.82, 5, 0, 0],
  CM: ['#FBEDE6', '#CF7A70', 2, 0.72, 5, 0, 0], // chicken breast
  CT: ['#F6DDD5', '#BE5A55', 2.2, 0.78, 5, 0, 0], // thigh meat
  T: ['#F1DCDB', '#9A6470', 2, 0.72, 5, 0, 0], // tongue
  W: ['#F0CDBD', '#B4675A', 1.7, 0.75, 4.5, 0, 0], // marrow
  K: ['#F5DCD2', '#B9625A', 1.9, 0.75, 5.5, 0, 0], // sausage casing
  F: ['#FBF3DD', '#E2BE62', 1.4, 0.75, 7, 0, -62], // beef fat, grass-yellow
  AF: ['#FBF5E5', '#D9C083', 1.3, 0.72, 7, 0, -62], // lamb fat
  AFd: ['#F5E9CF', '#C9AB68', 1.5, 0.8, 6, 0, -62],
  PF: ['#FDFAF2', '#E2D2AC', 1.1, 0.6, 8, 0, -62], // pork fat, nearly white
  C: ['#FBF1DF', '#D9A967', 1.5, 0.75, 6, 0, -8], // chicken skin
  CK: ['#FBEEDF', '#D69E70', 1.5, 0.75, 6, 0, -8],
  S: ['#FCF1EC', '#DFA99B', 1.4, 0.72, 6, 0, -8], // raw pork skin, pale pink
  Sd: ['#F8E5DD', '#D09685', 1.5, 0.78, 6, 0, -8],
  B: ['#FFFDF8'], // bone: paper
  BS: ['#FBF3E3', '#CDB894', 0.9, 0.55, 5, 0, -62], // sawn face of a bone: ivory
  Bd: ['#F8F0E0', '#A69273', 1, 0.62, 4.5, 0, 52], // bone, shaded side: graphite
  BL: ['#FBF8F1', '#C9C0B0', 1, 0.6, 6, 0, -8], // salami bloom
  ST: ['#F1D3A6', '#AD6724', 2, 0.75, 5, 0, 0], // frozen stock
  TW: ['#FDF8EC', '#E3D2A6', 1.1, 0.62, 7, 0, -62], // tallow
  MT: ['#EEECE7', '#8A8680', 1.2, 0.7, 4.5, 0, 52], // metal lid
  G: ['#F8FAF9', '#C2CDCA', 1, 0.5, 8, 0, 52], // glass, clear plastic
};
const FAT = '#FBF3DD', PORKFAT = '#FDFAF2', LAMBFAT = '#FBF5E5';

// ---------- numbers and paths
const f = (v) => { const r = Math.round(v * 10) / 10; return r === 0 ? '0' : String(r).replace(/^(-?)0\./, '$1.'); };
const j = (...v) => v.map(f).join(' ').replace(/ -/g, '-').replace(/(\.\d+) (?=\.)/g, '$1');
const r1 = (v) => Math.round(v * 10) / 10, r0 = (v) => Math.round(v) || 0;
const ji = (...v) => v.map((x) => String(Math.round(x) || 0)).join(' ').replace(/ -/g, '-');

function prng(str) { // FNV-1a hash → mulberry32
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Catmull-Rom through the points → cubic Bézier path. A point with a third value set is a corner.
function curve(pts, closed = true, q = r1) { // q rounds the pen position: tenths, or whole units for hand-drawn outlines
  const n = pts.length, at = (i) => pts[closed ? (i + n) % n : max(0, min(n - 1, i))], J = q === r1 ? j : ji;
  let x = q(pts[0][0]), y = q(pts[0][1]), d = `M${J(x, y)}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) { // relative segments measured from the rounded pen position, so no drift
    let [a, b, e, g] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    if (b[2]) a = b;
    if (e[2]) g = e;
    const ex = q(e[0] - x), ey = q(e[1] - y);
    d += `c${J(b[0] + (e[0] - a[0]) / 6 - x, b[1] + (e[1] - a[1]) / 6 - y, e[0] - (g[0] - b[0]) / 6 - x, e[1] - (g[1] - b[1]) / 6 - y, ex, ey)}`;
    x = q(x + ex); y = q(y + ey);
  }
  return closed ? d + 'Z' : d;
}
// open line: straight for 2 points, a quadratic through the middle one for 3, Catmull-Rom beyond
function line(pts) {
  if (pts.length > 3) return curve(pts, false);
  const [a, b, e] = pts, x = r1(a[0]), y = r1(a[1]);
  if (!e) return `M${j(x, y)}l${j(b[0] - x, b[1] - y)}`;
  return `M${j(x, y)}q${j(2 * b[0] - (a[0] + e[0]) / 2 - x, 2 * b[1] - (a[1] + e[1]) / 2 - y, e[0] - x, e[1] - y)}`;
}
const fi = (v) => String(Math.round(v)); // whole units for scattered texture, where a tenth is invisible
const area = (pts) => pts.reduce((s, [x, y], i) => { const [u, v] = pts[(i + 1) % pts.length]; return s + x * v - u * y; }, 0);
const plen = (pts, closed) => { let s = 0; for (let i = closed ? 0 : 1; i < pts.length; i++) { const p = pts[(i - 1 + pts.length) % pts.length]; s += hypot(pts[i][0] - p[0], pts[i][1] - p[1]); } return s; };

// The hand. Resamples a stroke along its own curve and pushes the points sideways by a slow drift plus a quicker
// tremor. The amplitude grows with the stroke's length, and every stroke gets its own amplitude, spacing and rhythm.
let HAND = null; // the drawing's PRNG, set in drawCut
function hand(pts, closed = true, k = 1) {
  const R = HAND, n = pts.length, at = (i) => pts[closed ? (i + n) % n : max(0, min(n - 1, i))], seg = closed ? n : n - 1;
  const L = plen(pts, closed), A = min(2.6, 0.3 + L / 430) * (0.5 + R()) * k;
  const sp = 30 + R() * 44, l1 = 60 + R() * 170, l2 = 14 + R() * 24, p1 = R() * TAU, p2 = R() * TAU, mix = 0.2 + R() * 0.4;
  const out = [];
  let s = 0;
  for (let i = 0; i < seg; i++) {
    let [a, b, e, g] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    if (b[2]) a = b;
    if (e[2]) g = e;
    const len = hypot(e[0] - b[0], e[1] - b[1]), m = floor(len / sp);
    out.push([b[0], b[1], b[2], s]);
    for (let q = 1; q <= m; q++) {
      const t = q / (m + 1), t2 = t * t, t3 = t2 * t, cr = (u) => 0.5 * (2 * b[u] + (e[u] - a[u]) * t + (2 * a[u] - 5 * b[u] + 4 * e[u] - g[u]) * t2 + (3 * b[u] - a[u] - 3 * e[u] + g[u]) * t3);
      out.push([cr(0), cr(1), 0, s + len * t]);
    }
    s += len;
  }
  if (!closed) out.push([at(n - 1)[0], at(n - 1)[1], at(n - 1)[2], s]);
  const N = out.length;
  return out.map((p, i) => {
    const u = out[closed ? (i - 1 + N) % N : max(0, i - 1)], v = out[closed ? (i + 1) % N : min(N - 1, i + 1)];
    const tl = hypot(v[0] - u[0], v[1] - u[1]) || 1, o = (A * ((1 - mix) * sin(p[3] / l1 * TAU + p1) + mix * sin(p[3] / l2 * TAU + p2)) + (R() - 0.5) * A * 0.35) * (p[2] ? 0.4 : 1);
    return [p[0] - (v[1] - u[1]) / tl * o, p[1] + (v[0] - u[0]) / tl * o, p[2]];
  });
}
const hline = (pts, k) => line(hand(pts, false, k)); // a hand-drawn open line
const turn = (pts, k) => pts.slice(k).concat(pts.slice(0, k)); // start a closed stroke somewhere else

// organic outline: ellipse (p = 2) or squircle (p > 2) with a smooth low-frequency wobble j and point noise r
function oval(c, cx, cy, rx, ry, { n = 14, j: wob = 0.04, r = 0.02, rot = 0, p = 2, shape } = {}) {
  const ph = [c.rnd() * TAU, c.rnd() * TAU, c.rnd() * TAU], cr = cos(rot * D), sr = sin(rot * D), pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU, ct = cos(t), st = sin(t);
    const k = (1 + wob * (sin(2 * t + ph[0]) * 0.5 + sin(3 * t + ph[1]) * 0.35 + sin(5 * t + ph[2]) * 0.15) + (c.rnd() - 0.5) * 2 * r) * (shape ? shape(t) : 1);
    const x = rx * k * Math.sign(ct) * abs(ct) ** (2 / p), y = ry * k * Math.sign(st) * abs(st) ** (2 / p);
    pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
  }
  return pts;
}
const pt = (x, y, k) => (k ? [x, y, k] : [x, y]); // a point keeps its corner flag
const jit = (c, pts, a) => pts.map(([x, y, k]) => pt(x + (c.rnd() - 0.5) * 2 * a, y + (c.rnd() - 0.5) * 2 * a, k));
const shift = (pts, dx, dy) => pts.map(([x, y, k]) => pt(x + dx, y + dy, k));
const place = (pts, x, y, rot = 0, sx = 1, sy = sx) => pts.map(([u, v, k]) => pt(x + u * sx * cos(rot * D) - v * sy * sin(rot * D), y + u * sx * sin(rot * D) + v * sy * cos(rot * D), k));

// crescent along an elliptic arc a0→a1 (deg), thickest in the middle
function crescent(cx, cy, rx, ry, a0, a1, th, n = 12) {
  const out = [], inn = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, t = (a0 + (a1 - a0) * u) * D, k = th * (0.14 + 0.86 * sin(PI * u) ** 0.8);
    out.push([cx + rx * cos(t), cy + ry * sin(t)]);
    inn.push([cx + (rx - k) * cos(t), cy + (ry - k) * sin(t)]);
  }
  return [...out, ...inn.reverse()];
}

// strip along spine S(t), t in 0..1, half-width w(t); at(t, v) gives a point across it (v -1..1)
function ribbon(S, w, n = 16, cap = 0.6) {
  const T = (t) => { const a = S(t - 0.005), b = S(t + 0.005), l = hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  const at = (t, v) => { const p = S(t), [tx, ty] = T(t), h = w(max(0, min(1, t))) * v; return [p[0] - ty * h, p[1] + tx * h]; };
  const tip = (t, s) => { const p = S(t), [tx, ty] = T(t), h = w(t) * cap * s; return [p[0] + tx * h, p[1] + ty * h]; };
  const top = [], bot = [];
  for (let i = 0; i <= n; i++) { top.push(at(i / n, -1)); bot.push(at(i / n, 1)); }
  return { pts: [tip(0, -1), ...top, tip(1, 1), ...bot.reverse()], at };
}

// 3/4 solids: the front edge of a top face (left → right through its lowest point), and the side band under it
function chain(pts) {
  const n = pts.length; let iL = 0, iR = 0, iB = 0;
  pts.forEach(([x, y], i) => { if (x < pts[iL][0]) iL = i; if (x > pts[iR][0]) iR = i; if (y > pts[iB][1]) iB = i; });
  const walk = (s) => { const o = []; for (let i = iL; ; i = (i + s + n) % n) { o.push(pts[i]); if (i === iR) return o; } };
  const a = walk(1);
  return a.includes(pts[iB]) ? a : walk(-1);
}
function side(pts, h, k = 1) { // k > 1 bulges the bottom edge outwards; a point list with four corners
  const ch = chain(pts).map(([x, y]) => [x, y]), mx = (ch[0][0] + ch[ch.length - 1][0]) / 2, low = ch.map(([x, y]) => [mx + (x - mx) * k, y + h]).reverse();
  ch[0][2] = ch[ch.length - 1][2] = low[0][2] = low[low.length - 1][2] = 1;
  return [...ch, ...low];
}

// ---------- details (callers clip them to the shape they belong to)
// light colours become gaps left in the pencil (paper); dark ones stay pencil lines
const lum = (h) => { const v = parseInt(h.slice(1), 16); return (0.3 * (v >> 16) + 0.59 * ((v >> 8) & 255) + 0.11 * (v & 255)) / 255; };
function stroke(d, col, w, op = 1, extra = '') {
  if (/^#[0-9A-F]{6}$/i.test(col) && lum(col) > 0.6) { col = PAPER; op = min(1, op * 1.6); }
  return `<path d="${d}" stroke="${col}" stroke-width="${f(w)}"${op < 1 ? ` opacity="${f(op * 10) / 10}"` : ''}${extra}/>`;
}

// fat in lean: a sparse web of thin connected strands that wander in from the edge and branch (ang: streaks instead)
function marble(c, cx, cy, rx, ry, n, { col = FAT, w = 1.1, len = 5, op = 0.85, ang } = {}) {
  let thin = '', thick = '';
  if (ang !== undefined) {
    for (let i = 0; i < n; i++) {
      const r = sqrt(c.rnd()), t = c.rnd() * TAU, x = cx + cos(t) * rx * r, y = cy + sin(t) * ry * r, l = len * (0.8 + c.rnd() * 1.4), a = (ang + (c.rnd() - 0.5) * 30) * D;
      thin += `M${fi(x)} ${fi(y)}q${j(cos(a) * l / 2 + (c.rnd() - 0.5) * 3, sin(a) * l / 2 + (c.rnd() - 0.5) * 3, cos(a) * l, sin(a) * l)}`;
    }
    return stroke(thin, col, w, op);
  }
  const strands = max(1, Math.round(n / 7)), R = (rx + ry) / 2;
  for (let s = 0; s < strands; s++) {
    const t = c.rnd() * TAU;
    let x = cx + cos(t) * rx * 1.04, y = cy + sin(t) * ry * 1.04, h = atan2(cy - y, cx - x) + (c.rnd() - 0.5) * 1.3;
    const pts = [[x, y]], steps = 3 + floor(c.rnd() * 3);
    for (let k = 0; k < steps; k++) {
      h += (c.rnd() - 0.5) * 1.2;
      const st = R * (0.13 + c.rnd() * 0.13);
      x += cos(h) * st; y += sin(h) * st; pts.push([x, y]);
      if (c.rnd() < 0.45) { const b = h + (c.rnd() < 0.5 ? 1 : -1) * (0.7 + c.rnd() * 0.7), bl = st * (0.6 + c.rnd()); thin += line([[x, y], [x + cos(b) * bl / 2 + (c.rnd() - 0.5) * 4, y + sin(b) * bl / 2 + (c.rnd() - 0.5) * 4], [x + cos(b) * bl, y + sin(b) * bl]]); }
    }
    if (s % 2) thin += line(pts); else thick += line(pts);
  }
  return stroke(thin, col, w * 0.9, op) + stroke(thick, col, w * 1.6, op);
}

// round specks in an ellipse (zero-length round-capped strokes)
function dots(c, cx, cy, rx, ry, n, size, col, op = 1) {
  let d = '';
  for (let i = 0; i < n; i++) { const r = sqrt(c.rnd()), t = c.rnd() * TAU; d += `M${fi(cx + cos(t) * rx * r)} ${fi(cy + sin(t) * ry * r)}h0`; }
  return stroke(d, col, size, op);
}

// parallel grain lines at angle ang (deg) through a box centred on cx,cy
function grain(c, cx, cy, len, span, ang, gap, { col = '#6A1C24', w = 1.1, op = 0.4, wave = 3, bow = 0, dash } = {}) {
  const ca = cos(ang * D), sa = sin(ang * D); let d = '';
  for (let s = -span / 2 + c.rnd() * gap; s < span / 2; s += gap * (0.75 + c.rnd() * 0.5)) {
    const ox = cx - sa * s, oy = cy + ca * s, m = (c.rnd() - 0.5) * 2 * wave + bow * s / span;
    d += `M${j(ox - ca * len / 2, oy - sa * len / 2)}q${j(ca * len / 2 - sa * m, sa * len / 2 + ca * m, ca * len, sa * len)}`;
  }
  return stroke(d, col, w, op, dash ? ` stroke-dasharray="${dash}"` : '');
}

// grain across a ribbon, optionally skewed into diagonals
function ribGrain(c, rb, len, gap, { skew = 0, col = '#6A1C24', w = 1.2, op = 0.45 } = {}) {
  let d = '';
  for (let t = c.rnd() * gap / len; t < 1; t += (gap / len) * (0.8 + c.rnd() * 0.4)) {
    const a = rb.at(t - skew, -1.3), m = rb.at(t + (c.rnd() - 0.5) * 3 / len, 0), b = rb.at(t + skew, 1.3);
    d += `M${j(...a)}Q${j(...m, ...b)}`;
  }
  return stroke(d, col, w, op);
}

// tubes: a paper stroke over a slightly wider ink stroke (bones, twine); inks first so joints merge
function tubes(list, col, e = 1.8) {
  const by = new Map();
  for (const [d, w] of list) by.set(w, (by.get(w) || '') + d);
  let ink = '', fill = '';
  for (const [w, d] of by) { ink += `<path d="${d}" stroke-width="${f(w + 2.6 * e)}"/>`; fill += `<path d="${d}" stroke="${col}" stroke-width="${f(w)}"/>`; }
  return ink + fill;
}
// a seam of fat: a gap left in the pencil
const seam = (pts, w = 4, col = FAT) => stroke(line(pts), col, w * 1.15);
const seams = (list, w = 4, col = FAT) => stroke(list.map(line).join(''), col, w * 1.15);
const twine = (d) => `<path d="${d}" stroke-width="5"/>${stroke(d, PAPER, 2.6)}<path d="${d}" stroke="#B49A6E" stroke-width="2.4" stroke-dasharray="1.4 2.8"/>`;
const knot = (x, y) => twine(hline([[x - 9, y - 4], [x, y + 2], [x - 2, y + 16]])) + twine(hline([[x + 9, y - 3], [x + 1, y + 2], [x + 6, y + 15]])) + `<circle cx="${f(x)}" cy="${f(y + 1)}" r="3.2" fill="${PAPER}" stroke-width="1.6"/>`;

// ---------- drawing context: pencil patterns, shared shapes and clips, all with ids prefixed by the cut id
function ctx(id) {
  const rnd = prng(id), defs = [], mats = new Set(); let n = 0;
  const ang = 30 + rnd() * 18, la = (200 + rnd() * 100) * D, light = [cos(la), sin(la)]; // this sheet's hatch angle and light
  const hatch = (pid, [bg, col, w, op, t, x, ao], a, lines) => { // three strokes a tile, unevenly spaced, some broken
    const T = f(3 * t); let s = '', h = '';
    for (let i = 0; i < 3; i++) { s += `M${f((i + 0.5) * t + (rnd() - 0.5) * t * 0.4)} 0V${T}`; h += `M0 ${f((i + 0.5) * t)}H${T}`; }
    s = `<path d="${s}" stroke-width="${f(w * (lines ? 0.8 : 0.85 + rnd() * 0.3))}"/>` + (x && !lines ? `<path d="${h}" stroke-width="${f(w * 0.42)}" opacity=".65"/>` : '');
    return `<pattern id="${pid}" width="${T}" height="${T}" patternUnits="userSpaceOnUse" patternTransform="rotate(${f(a + ao)})">${lines ? '' : `<rect width="${T}" height="${T}" fill="${bg}"/>`}<g stroke="${col}" stroke-opacity="${f(op * (lines ? 0.9 : 1) * 100) / 100}">${s}</g></pattern>`;
  };
  const c = {
    id, rnd, defs, light,
    m(k) {
      const p = M[k];
      if (!p) return k;
      if (p.length === 1) return p[0];
      if (!mats.has(k)) { mats.add(k); defs.push(hatch(`${id}-${k}`, p, ang)); }
      return `url(#${id}-${k})`;
    },
    shadeOf(k) { // the same pencil without the tint, crossing the first hatch: shading on the side away from the light
      const p = M[k];
      if (!p || p.length === 1 || p[6] < -30) return ''; // fat goes unshaded: it's the light part of the drawing
      if (!mats.has(k + 'h')) { mats.add(k + 'h'); defs.push(hatch(`${id}-${k}h`, p, ang + 74, 1)); }
      return `url(#${id}-${k}h)`;
    },
    def(d, len) { const s = `${id}-${++n}`; defs.push(`<path id="${s}" d="${d}"${len ? ' pathLength="100"' : ''}/>`); return s; },
    clip(...ss) { const s = `${id}-${++n}`; defs.push(`<clipPath id="${s}">${ss.map((x) => `<use href="#${x}"/>`).join('')}</clipPath>`); return s; },
    // a filled shape drawn by hand: pencil fill (a little off the line), shading and inner detail clipped to it,
    // a faint second pass of the marker, then the line itself, which now and then lifts or runs on past its start
    piece(shape, fill, inner = '', attrs = '') {
      let pts = typeof shape === 'string' ? null : shape, d = shape, big = 0;
      if (pts) {
        pts = hand(turn(pts, floor(rnd() * pts.length)), true);
        const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
        big = min(max(...xs) - min(...xs), max(...ys) - min(...ys));
        d = curve(pts, true, r0);
      }
      const lift = big > 36 && rnd() < 0.3, over = !lift && big > 36 && rnd() < 0.35;
      const s = c.def(d, lift), sh = big > 56 ? c.shadeOf(fill) : '';
      let out = `<use href="#${s}" fill="${c.m(fill)}" stroke="none"${big > 48 ? ` transform="translate(${j((rnd() - 0.5) * 2.4, (rnd() - 0.5) * 2.4)})"` : ''}/>`;
      if (inner || sh) {
        const sw = min(36, max(10, big * 0.3)), o = sw * 0.45;
        out += `<g clip-path="url(#${c.clip(s)})">${sh ? `<use href="#${s}" stroke="${sh}" stroke-width="${f(sw)}" transform="translate(${j(light[0] * o, light[1] * o)})"/>` : ''}${inner}</g>`;
      }
      const w = attrs ? "" : SW(2 * (0.82 + rnd() * 0.36));
      if (big > 48) out += `<use href="#${s}" stroke-width="1.4" stroke-opacity=".35" transform="translate(${j(1 + rnd(), 0.6 + rnd() * 0.9)})"/>`;
      const gap = lift ? (4 + rnd() * 7) / plen(pts, true) * 100 : 0;
      out += `<use href="#${s}"${attrs}${w}${lift ? ` stroke-dasharray="${f(100 - gap)} ${f(gap)}" stroke-dashoffset="${f(rnd() * 100)}"` : ''}/>`;
      if (over) { // the pen runs on past where it started
        const p = pts[0], q = pts[pts.length - 1], tl = hypot(p[0] - q[0], p[1] - q[1]) || 1, l = 5 + rnd() * 7, b = (rnd() - 0.5) * 0.5;
        const ux = (p[0] - q[0]) / tl, uy = (p[1] - q[1]) / tl;
        out += `<path d="M${j(p[0], p[1])}l${j((ux * cos(b) - uy * sin(b)) * l, (ux * sin(b) + uy * cos(b)) * l)}"${attrs}${w}/>`;
      }
      return out;
    },
    // shapes merged into one silhouette: doubled outlines first (the inner half is covered), fills on top
    union(shapes, fill, inner = '') { // point lists only; same winding so overlaps stay filled
      const s = c.def(shapes.map((p) => curve(hand(area(p) < 0 ? p.slice().reverse() : p, true), true, r0)).join(''));
      return `<use href="#${s}" stroke-width="5.2"/><use href="#${s}" fill="${c.m(fill)}" stroke="none"/>` + (inner ? `<g clip-path="url(#${c.clip(s)})">${inner}</g>` : '');
    },
    // pattern content does not inherit the drawing group's style, so it gets its own
    pattern(w, h, body, tr = '') { const s = `${id}-${++n}`; defs.push(`<pattern id="${s}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"${tr ? ` patternTransform="${tr}"` : ''}><g fill="none" stroke-linecap="round">${body}</g></pattern>`); return `url(#${s})`; },
  };
  return c;
}
const g = (tr, s) => `<g transform="${tr}">${s}</g>`;
const SW = (w) => ` stroke-width="${f(w * 1.3)}"`; // inner shapes take a thinner line than the outline
const dot = (c, x, y, rx, ry, fill, w = 1.2) => c.piece(oval(c, x, y, rx, ry, { n: 8, j: 0.06 }), fill, '', SW(w));

// a long bone between two points, sawn flat where k[i] is set (the sawn face drawn), rounded where it isn't
function bone(c, x1, y1, x2, y2, w, k = [0, 1]) {
  const L = hypot(x2 - x1, y2 - y1), h = w / 2, a = atan2(y2 - y1, x2 - x1) / D;
  const right = k[1] ? [[L, -h, 1], [L, h, 1]] : [[L - 0.4 * h, -h], [L + 0.7 * h, 0], [L - 0.4 * h, h]];
  const left = k[0] ? [[0, h, 1], [0, -h, 1]] : [[0.4 * h, h], [-0.7 * h, 0], [0.4 * h, -h]];
  const shaft = place([...right, [L * 0.66, 0.84 * h], [L / 3, 0.9 * h], ...left, [L / 3, -0.86 * h], [L * 0.66, -0.88 * h]], x1, y1, a);
  const face = (u) => { const [x, y] = place([[u, 0]], x1, y1, a)[0]; return c.piece(oval(c, x, y, h * 0.4, h * 1.04, { n: 10, j: 0.05, rot: a }), 'B', '', SW(1.6)) + dot(c, x + 0.5, y, h * 0.18, h * 0.46, 'W', 0.9); };
  return c.piece(shaft, 'Bd') + (k[1] ? face(L) : '') + (k[0] ? face(0) : '');
}

// ---------- shared compositions
const blobs = (c, list, fill, attrs = '') => `<path d="${list.map((p) => curve(p)).join('')}" fill="${c.m(fill)}"${attrs}/>`;
const yAt = (ch, x) => { for (let i = 1; i < ch.length; i++) if (ch[i][0] >= x) { const [x0, y0] = ch[i - 1], [x1, y1] = ch[i]; return y0 + (y1 - y0) * (x - x0) / ((x1 - x0) || 1); } return ch[ch.length - 1][1]; };
const lowest = (pts) => pts.reduce((a, p) => (p[1] > a[1] ? p : a));

// ribeye cross-section: fat rim, spinalis cap, eye, complexus; extra shapes merge into the fat rim
function ribeyeSteak(c, extra = [], p = 2) {
  const rim = oval(c, 0, 0, 172, 126, { n: 18, j: 0.03, p });
  const cap = jit(c, crescent(-2, 4, 158, 112, 158, 352, 44), 1.2);
  const cx = oval(c, 108, 70, 19, 14, { n: 9, j: 0.08, rot: 32 });
  const eye = oval(c, -8, 26, 122, 80, { n: 14, j: 0.045, rot: -3 });
  return (extra.length ? c.union([rim, ...extra], 'F') : c.piece(rim, 'F')) + c.piece(cap, 'L', marble(c, -2, -66, 150, 46, 7)) + c.piece(cx, 'L', '', SW(1.6)) + c.piece(eye, 'L', marble(c, -8, 26, 110, 72, 30));
}

// a mound of ground meat: lumpy outline filled with curled strands (two pattern tiles + loose strands)
function mound(c, cx, cy, rx, ry, lean, dark, light, fat) {
  const pts = oval(c, cx, cy, rx, ry, { n: 30, j: 0.05, r: 0.035 }).map(([x, y]) => [x, y > cy ? cy + (y - cy) * 0.42 : y]);
  const curls = (k, w, h, cols) => {
    const out = cols.map(() => '');
    for (let i = 0; i < k; i++) {
      const x = 4 + c.rnd() * (w - 8), y = 4 + c.rnd() * (h - 8), a = c.rnd() * TAU, l = 4 + c.rnd() * 4, b = (c.rnd() - 0.5) * 6;
      out[i % cols.length] += `M${j(x, y)}q${j(cos(a) * l / 2 - sin(a) * b, sin(a) * l / 2 + cos(a) * b, cos(a) * l, sin(a) * l)}`;
    }
    return out.map((d, i) => stroke(d, cols[i][0], cols[i][1], cols[i][2])).join('');
  };
  const p1 = c.pattern(30, 30, curls(26, 30, 30, [[dark, 2.6, 0.75], [light, 2.4, 0.8], [fat, 2, 0.8], [dark, 2.2, 0.6]]), 'rotate(17)');
  const p2 = c.pattern(38, 38, curls(22, 38, 38, [[light, 2.6, 0.7], [dark, 2.8, 0.7], [fat, 1.8, 0.8]]), 'rotate(-31) scale(1.1)');
  const s = c.def(curve(pts));
  let loose = '';
  for (let i = 0; i < 40; i++) {
    const t = c.rnd() * TAU, x = cx + cos(t) * rx * 0.95, y = cy + sin(t) * ry * (sin(t) > 0 ? 0.4 : 0.95), a = c.rnd() * TAU;
    loose += `M${j(x, y)}q${j(cos(a) * 4 + 3, sin(a) * 4 - 2, cos(a) * 8, sin(a) * 8)}`;
  }
  return `<use href="#${s}" fill="${c.m(lean)}" stroke="none"/><use href="#${s}" fill="${p1}" stroke="none"/><use href="#${s}" fill="${p2}" stroke="none"/>`
    + `<g clip-path="url(#${c.clip(s)})">${stroke(loose, dark, 2.8, 0.7)}</g><use href="#${s}"/>`;
}

// a sausage-like or log-like capsule between two points
const capsule = (c, x1, y1, x2, y2, r, o = {}) => { const L = hypot(x2 - x1, y2 - y1); return place(oval(c, L / 2, 0, L / 2 + r * 0.2, r, { n: 14, p: 2.7, j: 0.03, ...o }), x1, y1, atan2(y2 - y1, x2 - x1) / D); };

// chicken skin: follicle dots
const skinTex = (c, cx, cy, rx, ry, n = 24) => dots(c, cx, cy, rx, ry, n, 1.7, '#C4935A', 0.45);
// puckered skin as one shared tile (follicles and little creases), laid over a piece with a clipped rect
function skinRect(c, x, y, w, h) {
  if (!c.skin) {
    let d = '', k = '';
    for (let i = 0; i < 6; i++) d += `M${fi(2 + c.rnd() * 20)} ${fi(2 + c.rnd() * 20)}h0`;
    for (let i = 0; i < 3; i++) k += `M${fi(2 + c.rnd() * 16)} ${fi(4 + c.rnd() * 16)}q3-3 6 0`;
    c.skin = c.pattern(24, 24, stroke(d, '#BE8B52', 1.9, 0.55) + stroke(k, '#BE8B52', 1.1, 0.5), 'rotate(14)');
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c.skin}" stroke="none"/>`;
}

// ---------- the cuts
const CUTS = {
  // ----- beef
  ribeye: (c) => g('translate(200 150)', ribeyeSteak(c)),

  'ribeye-bone-in': (c) => {
    const S = (t) => [-170 - 5 * sin(PI * t), -88 + 200 * t];
    const rb = ribbon(S, (t) => 15 + 2 * sin(PI * t), 8, 0.9);
    const collar = []; // fat and intercostal meat between the rib and the steak: wide on the steak side, thin outside
    for (let i = 0; i <= 6; i++) { const [x, y] = S(i / 6); collar.push([x + 46, y]); }
    for (let i = 6; i >= 0; i--) { const [x, y] = S(i / 6); collar.push([x - 22, y + (i === 0 ? -6 : i === 6 ? 6 : 0)]); }
    const core = stroke(line([rb.at(0.06, 0.1), rb.at(0.5, 0.15), rb.at(0.94, 0.1)]), '#E2C5B2', 8, 0.7) + dots(c, -175, 12, 5, 92, 16, 2.2, '#C9A08E', 0.6);
    return g('translate(226 148) scale(.86)', ribeyeSteak(c, [collar], 2.6) + c.piece(rb.pts, 'B', core));
  },

  strip: (c) => {
    const fat = jit(c, [[-192, -44], [-120, -78], [-10, -92], [100, -92], [162, -76], [188, -38], [150, -30], [0, -40], [-150, -26]], 2);
    const lean = jit(c, [[-184, -34], [-120, -62], [-10, -74], [100, -74], [154, -58], [174, -18], [166, 30], [128, 70], [60, 94], [-30, 92], [-110, 66], [-160, 20]], 2.5);
    return g('translate(200 154) rotate(-4)', c.piece(fat, 'F') + c.piece(lean, 'L', marble(c, -4, 10, 150, 72, 26) + seam([[96, -66], [118, -6], [104, 52], [70, 92]], 3.5)));
  },

  tenderloin: (c) => {
    const top = oval(c, 200, 112, 124, 54, { n: 14, j: 0.08, r: 0.03, shape: (t) => 1 - 0.05 * cos(3 * t) });
    const sideIn = marble(c, 200, 196, 120, 34, 40, { col: '#5E1820', len: 9, w: 1.3, op: 0.35, ang: 90 }) + marble(c, 230, 200, 50, 14, 3, { len: 10, w: 1.6, op: 0.6, ang: 0 });
    return c.piece(side(top, 82, 1.04), 'Ld', sideIn) + c.piece(top, 'L', marble(c, 200, 112, 100, 42, 6, { len: 4 }) + dots(c, 200, 112, 112, 48, 60, 1.6, '#8E2C34', 0.3) + stroke(line([[130, 92], [200, 80], [270, 88]]), '#E59A9E', 10, 0.25));
  },

  hanger: (c) => {
    const len = 320, w = (t) => 31 * (0.42 + 0.58 * sin(PI * (0.1 + 0.85 * t)) ** 0.7);
    const a = ribbon((t) => [40 + 322 * t, 104 - 20 * sin(PI * t) + 10 * t], w, 16, 0.85);
    const b = ribbon((t) => [44 + 318 * t, 200 + 16 * sin(PI * t) - 6 * t], (t) => w(1 - t) * 0.95, 16, 0.85);
    const gr = (r) => ribGrain(c, r, len, 10, { skew: 0.05, w: 1.6, op: 0.5 }) + ribGrain(c, r, len, 12, { skew: 0.05, col: '#E8A3A0', w: 1, op: 0.35 });
    return c.piece(a.pts, 'L', gr(a)) + c.piece(b.pts, 'L', gr(b));
  },

  skirt: (c) => {
    const rb = ribbon((t) => [22 + 356 * t, 150 + 40 * sin(TAU * 1.1 * t + 0.6)], (t) => (32 + 6 * sin(TAU * 3 * t + 1)) * (0.7 + 0.3 * sin(PI * t)), 22, 0.5);
    const fatBits = blobs(c, [0.18, 0.45, 0.7, 0.88].map((t, i) => { const [x, y] = rb.at(t, i % 2 ? 0.95 : -0.95); return oval(c, x, y, 16, 7, { n: 8, j: 0.2, rot: c.rnd() * 40 - 20 }); }), FAT, ' stroke="none"');
    return c.piece(rb.pts, 'L', ribGrain(c, rb, 380, 7, { w: 1.7, op: 0.55 }) + ribGrain(c, rb, 380, 9, { col: '#EBA6A2', w: 1, op: 0.35 }) + fatBits);
  },

  flank: (c) => { // wide, flat and lean: long grain runs the whole length and follows the uneven taper; one sliver of fat
    const rb = ribbon((t) => [30 + 340 * t, 158 - 20 * sin(PI * t) + 8 * t], (t) => (14 + 22 * (1 - t) + 48 * sin(PI * t) ** 0.6) * (1 + 0.05 * sin(TAU * 2.3 * t + 1)), 16, 0.55);
    let dk = '', lt = '';
    for (let i = 0; i < 23; i++) {
      const v = -0.94 + i * 0.085, l = (o) => line([0.02, 0.28, 0.55, 0.8, 0.98].map((t) => jit(c, [rb.at(t, v + o)], 1.1)[0]));
      dk += l(0);
      if (i % 2 === 0) lt += l(0.042);
    }
    return c.piece(jit(c, rb.pts, 2), 'L', stroke(dk, '#681B23', 1.6, 0.5) + stroke(lt, '#EFA9A6', 1.3, 0.45));
  },

  'short-rib': (c) => { // the cut face of a 3-bone plate: a dome of meat with a fat cap and a seam, three flat ribs along the base
    const dome = jit(c, [[34, 232], [28, 182], [48, 132], [98, 96], [168, 80], [240, 82], [302, 96], [352, 130], [374, 182], [368, 232], [300, 244], [200, 246], [100, 244]], 2);
    const lean = jit(c, [[46, 214], [46, 172], [68, 134], [112, 110], [174, 98], [240, 100], [294, 114], [338, 142], [356, 182], [354, 214], [200, 222]], 3);
    const inner = c.piece(lean, 'L', marble(c, 200, 160, 150, 56, 30) + seams([jit(c, [[30, 176], [110, 160], [200, 172], [290, 152], [380, 164]], 4)], 7), SW(1.5));
    const bones = [104, 200, 296].map((x) => c.piece(oval(c, x, 226, 45, 14, { n: 12, j: 0.05, p: 2.4 }), 'B', '', SW(1.8)) + stroke(line([[x - 26, 226], [x, 228], [x + 26, 226]]), M.W[1], 5, 0.55)).join('');
    return c.piece(dome, 'F', inner) + bones;
  },

  brisket: (c) => {
    const T = jit(c, [[22, 172], [80, 162], [150, 158], [212, 150], [254, 128], [294, 106], [340, 100], [376, 114]], 2);
    const body = [...T, [388, 154], [372, 200], [300, 212], [200, 214], [110, 212], [40, 206], [16, 190]];
    const topS = [...shift(T, 8, -22), ...T.slice().reverse()];
    const sideIn = grain(c, 200, 180, 320, 400, 64, 8, { op: 0.35 }) + stroke(line(shift(T, 0, 5)), FAT, 11) + seams([[[190, 180], [250, 166], [320, 172], [392, 168]]], 9);
    return c.piece(body, 'Ld', sideIn) + c.piece(topS, 'F', marble(c, 220, 128, 170, 30, 8, { col: '#C9878A', w: 3, len: 16, ang: -10, op: 0.4 }));
  },

  'chuck-eye': (c) => {
    const rim = oval(c, 0, 0, 158, 116, { n: 16, j: 0.06 });
    const cap = jit(c, crescent(-6, 2, 144, 102, 200, 312, 22, 8), 1);
    const side2 = oval(c, 92, 30, 38, 42, { n: 10, j: 0.08, rot: 25 });
    const eye = oval(c, -24, 12, 100, 74, { n: 14, j: 0.06, rot: -8 });
    return g('translate(200 150) rotate(6)', c.piece(rim, 'F') + c.piece(cap, 'L', '', SW(1.6)) + c.piece(side2, 'L', marble(c, 92, 30, 32, 34, 8))
      + c.piece(eye, 'L', marble(c, -24, 12, 90, 66, 32) + seam([[-110, -30], [-50, -4], [-12, 34], [6, 94]], 5)));
  },

  'flat-iron': (c) => { // two steaks from one top blade, the gristle cut out: long, flat and well marbled, cut square at one end and on the slant at the other
    const st = (x, y, r, s, m) => {
      const top = place(jit(c, [[-150, -30, 1], [-146, 30, 1], [-60, 36], [40, 34], [120, 24], [154, 14, 1], [160, -12, 1], [100, -26], [0, -34], [-80, -34]], 2).map(([u, v, k]) => pt(u * m, v, k)), x, y, r, s);
      return c.piece(side(top, 10), 'L', grain(c, x, y + 40 * s, 330, 80, 90, 7, { op: 0.35 }))
        + c.piece(top, 'L', marble(c, x, y, 140 * s, 30 * s, 40, { w: 0.9 }) + grain(c, x, y, 380, 110, r + 72, 11, { op: 0.28, w: 1, wave: 2 }) + stroke(hline([[x - 140 * s, y - 25 * s], [x, y - 31 * s], [x + 110 * s, y - 22 * s]]), '#F2DADA', 3, 0.55));
    };
    return st(204, 98, -5, 0.9, -1) + st(196, 198, 3, 1, 1);
  },

  'chuck-roast': (c) => {
    const top = oval(c, 200, 100, 146, 60, { n: 18, j: 0.07, r: 0.02, p: 2.6 });
    const ch = chain(top), lo = lowest(ch), mx = (ch[0][0] + ch[ch.length - 1][0]) / 2, h = 96;
    const ring = (dy) => line(ch.map(([x, y]) => [mx + (x - mx) * (1 + 0.03 * dy / h), y + dy]));
    const sm = seams([[[120, 44], [148, 88], [126, 156]], [[148, 88], [232, 104], [306, 62]], [[232, 104], [252, 156]], [[54, 110], [134, 120]], [[306, 62], [330, 108], [350, 124]]].map((p) => jit(c, p, 3)), 6);
    const sideIn = seams([[[96, 150], [112, 200], [92, 262]], [[262, 166], [274, 214], [250, 262]], [[300, 200], [364, 206]]].map((p) => jit(c, p, 4)), 5);
    return c.piece(side(top, h, 1.03), 'Ld', sideIn) + twine(ring(30) + ring(68)) + knot(lo[0] + 10, lo[1] + 30) + c.piece(top, 'L', sm + marble(c, 200, 100, 140, 54, 24));
  },

  'eye-of-round': (c) => {
    const body = jit(c, [[318, 82], [210, 78], [118, 84], [56, 102], [30, 150], [52, 198], [116, 216], [210, 224], [318, 220]], 2);
    const face = oval(c, 318, 151, 44, 70, { n: 14, j: 0.03 });
    const sheen = [104, 122, 186].map((y) => line(jit(c, [[60, y], [150, y - 8], [250, y - 6], [300, y]], 3))).join('');
    return c.piece(body, 'Ld', stroke(sheen, '#E9D9DA', 2, 0.35) + grain(c, 170, 150, 320, 160, 2, 12, { op: 0.2 }))
      + c.piece(face, 'L', dots(c, 318, 151, 40, 66, 110, 1.5, '#7A2229', 0.35) + dots(c, 318, 151, 38, 62, 26, 1.6, FAT, 0.55));
  },

  'top-round': (c) => g('translate(200 152) rotate(-6)', c.piece(oval(c, -8, -9, 178, 116, { n: 16, j: 0.04 }), 'F')
    + c.piece(oval(c, 4, 2, 168, 108, { n: 16, j: 0.04 }), 'L', marble(c, 0, 0, 150, 96, 14) + seam([[94, -100], [74, -30], [96, 50], [140, 92]], 3.5))),

  'ground-beef': (c) => mound(c, 200, 182, 168, 122, 'L', '#7A2028', '#D2666B', '#F2E3BF'),

  'marrow-bones': (c) => { // cross-cut leg bone, two standing and one on its side: a wall of bone round the marrow, scraps of meat and membrane on the outside
    const scraps = (x, y, rx, ry, k) => Array.from({ length: k }, () => c.piece(oval(c, x + (c.rnd() - 0.5) * rx, y + (c.rnd() - 0.5) * ry, 8 + c.rnd() * 10, 4 + c.rnd() * 4, { n: 8, j: 0.3, rot: (c.rnd() - 0.5) * 50 }), 'L', '', SW(1))).join('');
    const face = (cx, cy, rx, ry, rot) => c.piece(oval(c, cx, cy, rx, ry, { n: 14, j: 0.05, rot, shape: (t) => 1 + 0.13 * cos(t + 0.6) + 0.06 * cos(3 * t + 1) }), 'BS')
      + c.piece(oval(c, cx + rx * 0.06, cy + ry * 0.03, rx * 0.72, ry * 0.68, { n: 11, j: 0.1, rot, shape: (t) => 1 + 0.1 * cos(t + 0.6) }), 'W', dots(c, cx, cy, rx * 0.45, ry * 0.4, 7, 2.6, '#E9C99A', 0.8));
    const stand = (cx, cy, rx, ry, h, rot) => {
      const top = oval(c, cx, cy, rx, ry, { n: 14, j: 0.05, rot, shape: (t) => 1 + 0.13 * cos(t + 0.6) + 0.06 * cos(3 * t + 1) });
      return c.piece(side(top, h), 'Bd', grain(c, cx, cy + ry + h / 2, h * 1.6, rx * 2, 90, 11, { col: '#9C8B70', op: 0.45, w: 0.9, wave: 2 }) + scraps(cx, cy + ry + h * 0.6, rx * 1.5, h * 0.5, 2)) + face(cx, cy, rx, ry, rot);
    };
    const lie = (x, y, ry, len) => { // the sawn face toward us, the shaft running back to the right
      const rx = ry * 0.56, body = jit(c, [[x, y - ry, 1], [x + len * 0.5, y - ry * 1.06], [x + len, y - ry * 0.94], [x + len + rx * 0.7, y - ry * 0.1], [x + len, y + ry * 0.9], [x + len * 0.5, y + ry * 1.02], [x, y + ry, 1]], 1.5);
      return c.piece(body, 'Bd', grain(c, x + len / 2, y, len * 1.3, ry * 2, 2, 12, { col: '#9C8B70', op: 0.45, w: 0.9, wave: 2 }) + scraps(x + len * 0.6, y + ry * 0.2, len * 0.7, ry * 1.2, 3)) + face(x, y, rx, ry, 0);
    };
    return stand(118, 92, 66, 40, 54, -8) + stand(286, 84, 50, 31, 44, 10) + lie(172, 216, 44, 104);
  },

  oxtail: (c) => [[90, 124, 64], [200, 140, 51], [288, 156, 40], [352, 170, 29]].map(([x, y, R]) => {
    // one tail in thick sections, big end to tip: fat round the rim, meat in lobes round the vertebra and its two long side wings
    const ry = R * 0.62, rot = (c.rnd() - 0.5) * 16;
    const top = oval(c, x, y, R, ry, { n: 11, j: 0.07, rot, shape: (t) => 1 + 0.05 * cos(4 * t) });
    const meat = oval(c, x + 1, y + 1, R * 0.82, ry * 0.78, { n: 10, j: 0.1, rot, shape: (t) => 1 + 0.07 * cos(4 * t) });
    const vb = place([[-0.74, 0], [-0.24, -0.12], [-0.16, -0.36], [0.16, -0.36], [0.24, -0.12], [0.76, 0.02], [0.22, 0.14], [0.14, 0.34], [-0.16, 0.34], [-0.22, 0.14]].map(([u, v]) => [u * R, v * ry]), x, y, rot);
    const lobes = seams([[[x - R * 0.1, y - ry * 0.3], [x - R * 0.3, y - ry * 0.6], [x - R * 0.2, y - ry]], [[x + R * 0.12, y + ry * 0.3], [x + R * 0.34, y + ry * 0.6], [x + R * 0.26, y + ry]]].map((p) => jit(c, p, 2)), max(2, R / 22));
    return c.piece(side(top, R * 0.6, 1.02), 'Ld', stroke(line(shift(chain(top), 0, R * 0.14)), FAT, R / 4.5))
      + c.piece(top, 'F') + c.piece(meat, 'L', (R > 35 ? lobes : '') + (R > 45 ? marble(c, x, y, R * 0.7, ry * 0.7, 7) : '')) + c.piece(vb, 'B', '', SW(1.3)) + dot(c, x, y, R * 0.1, R * 0.08, 'W', 0.8);
  }).join(''),

  tongue: (c) => {
    const pts = jit(c, [[60, 92], [130, 78], [210, 88], [286, 104], [338, 118], [368, 136], [370, 158], [348, 176], [290, 190], [210, 206], [130, 220], [62, 210], [36, 176], [40, 120]], 2);
    const root = c.piece(oval(c, 48, 150, 22, 56, { n: 10, j: 0.12 }), 'L', marble(c, 48, 150, 20, 50, 8, { w: 2.2 }), SW(1.4));
    return c.piece(pts, 'T', root + dots(c, 200, 150, 170, 62, 90, 2, '#EBCFCB', 0.7) + dots(c, 200, 150, 170, 62, 60, 1.6, '#93636D', 0.35)
      + stroke(line([[180, 150], [260, 148], [334, 150]]), '#8F6670', 2, 0.45) + dots(c, 110, 150, 40, 48, 14, 4, '#E6C3C0', 0.8));
  },

  // ----- pork
  'pork-chops': (c) => [[278, 108, 8, -1], [130, 148, -8, 1]].map(([x, y, r, m]) => {
    // thick boneless loin chops in 3/4: pale eye, white fat cap on the outer edge (white down the band too), a seam off the tenderloin-side corner, a straight chine end
    const P = (pts) => place(pts.map(([u, v]) => [u * m, v]), x, y, r);
    const loc = jit(c, [[-88, -26], [-66, -50], [-14, -60], [40, -56], [80, -36], [96, -2], [88, 32], [58, 52], [6, 58], [-46, 54], [-80, 36], [-90, 6]], 1.5);
    const top = P(loc), cap = P([[20, -70], [60, -60], [96, -36], [112, -2], [100, 40], [64, 66], [40, 48], [62, 22], [70, -4], [60, -32], [30, -50]]); // fat cap on the outer edge only, clipped to the chop
    const fx = x + 50 * m, band = `<path d="M${j(fx, y - 100)}q${j(10 * m, 120, -6 * m, 220)}h${200 * m}v-220Z" fill="${PORKFAT}" stroke="none"/>`;
    const faceIn = c.piece(jit(c, cap, 1.5), 'PF', '', SW(1.6)) + marble(c, ...P([[-14, 0]])[0], 56, 36, 6, { col: PORKFAT }) + seam(P([[-92, 14], [-54, 12], [-36, 30], [-32, 62]]), 3, PORKFAT) + stroke(line(P([[-56, -32], [-10, -42], [30, -36]])), '#FBE3DC', 8, 0.45);
    return c.piece(side(top, 30), 'Pd', grain(c, x, y + 62, 220, 34, r, 6, { col: '#A86760', op: 0.3, wave: 1 }) + band) + c.piece(top, 'P', faceIn);
  }).join(''),

  'pork-tenderloin': (c) => {
    const rb = ribbon((t) => [36 + 330 * t, 176 - 70 * t + 22 * sin(PI * t * 1.4)], (t) => 13 + 30 * (1 - t) ** 0.7, 16, 0.7);
    const sheen = [-0.55, -0.3, 0.05].map((v) => line([rb.at(0.12, v), rb.at(0.35, v + 0.08), rb.at(0.6, v), rb.at(0.8, v + 0.1)])).join('');
    const [hx, hy] = rb.at(0.06, 0.7);
    return c.piece(oval(c, hx + 6, hy + 2, 30, 20, { n: 10, rot: -20 }), 'Pd') + c.piece(rb.pts, 'Pd', stroke(sheen, '#F6F1F4', 2.2, 0.55) + grain(c, 200, 140, 400, 160, -14, 9, { col: '#B06A62', op: 0.25 }));
  },

  'pork-belly': (c) => {
    const top = oval(c, 200, 88, 168, 36, { n: 26, j: 0.02, p: 4 });
    const ch = chain(top);
    const band = (y0, y1) => { const t = [], b = []; for (let x = 10; x <= 390; x += 38) { t.push([x, y0 + (c.rnd() - 0.5) * 9]); b.push([x, y1 + (c.rnd() - 0.5) * 9]); } return c.piece([...t, ...b.reverse()], 'P', '', SW(1.4)); };
    const sideIn = band(148, 170) + band(184, 206) + band(218, 260) + stroke(line(shift(ch, 0, 3)), '#E0BC93', 9);
    return c.piece(side(top, 126), 'PF', sideIn) + c.piece(top, 'S', dots(c, 200, 88, 160, 32, 50, 1.6, '#B98D62', 0.35));
  },

  'spare-ribs': (c) => { // a full rack, meat side up, in 3/4: the ribs show as ridges under the meat and as sawn ends along the cut edge, cartilage at the tips end
    const back = (x) => 70 + (x - 30) * 0.16 + ((x - 200) / 170) ** 2 * 10, front = (x) => 188 + (x - 30) * 0.04 - ((x - 200) / 170) ** 2 * 6;
    const tp = [], fp = [];
    for (let x = 30; x <= 370; x += 42.5) { tp.push([x, back(x)]); fp.push([x, front(x)]); }
    const face = jit(c, [...tp, [384, (back(370) + front(370)) / 2], ...fp.reverse(), [18, 128]], 3);
    const xs = [];
    for (let x = 98; x < 360; x += 22 + c.rnd() * 9) xs.push(x);
    let lo = '', hi = '';
    for (const x of xs) {
      const y0 = front(x) - 2, y1 = back(x + 18) + 10 + c.rnd() * 10, b = (c.rnd() - 0.5) * 8, p = (o) => [[x + o, y0], [x + 9 + o + b, (y0 + y1) / 2], [x + 18 + o, y1]];
      lo += line(p(5)); hi += line(p(-1));
    }
    const tips = [0, 1, 2].map((i) => dot(c, 46 + i * 17 + c.rnd() * 6, front(46 + i * 17) + 13, 5, 7, 'B', 0.9)).join('');
    const ends = xs.map((x) => dot(c, x + 1, front(x) + 14, 7, 8, 'B', 1)).join('');
    return c.piece(side(face, 28), 'Pd', stroke(line(shift(chain(face), 0, 5)), PORKFAT, 5) + ends + tips)
      + c.piece(face, 'P', stroke(hi, '#F6E6E0', 4.5, 0.42) + stroke(lo, '#9E3138', 2.6, 0.55) + marble(c, 200, 120, 150, 40, 14, { col: PORKFAT, w: 1.4 }));
  },

  'pork-shoulder': (c) => {
    const top = oval(c, 200, 104, 162, 70, { n: 18, j: 0.05, p: 2.6 });
    const sm = seams([[[60, 92], [130, 112], [168, 160]], [[196, 40], [214, 90], [290, 116], [350, 112]], [[214, 90], [196, 130]]].map((p) => jit(c, p, 3)), 4, PORKFAT);
    const blade = tubes([[line([[106, 76], [180, 88], [266, 78]]), 10], [line([[182, 88], [190, 56]]), 7]], M.B[0], 1.8);
    const cap = (() => { const t = [], b = []; for (let x = 20; x <= 390; x += 46) { t.push([x, 150]); b.push([x, 196 + (c.rnd() - 0.5) * 20]); } return c.piece([...t, ...b.reverse()], 'PF', '', SW(1.4)); })();
    return c.piece(side(top, 100), 'Pd', cap + grain(c, 200, 240, 120, 340, 88, 14, { col: '#A86760', op: 0.25 })) + c.piece(top, 'P', sm + blade + marble(c, 200, 104, 150, 60, 12, { col: PORKFAT }));
  },

  'fresh-ham': (c) => { // the raw back leg, skin on: pale skin, the big cut face showing skin, fat, meat and bone; the shank bone sawn off at the hock
    const body = jit(c, [[96, 56], [180, 64], [262, 96], [318, 128], [332, 150], [318, 172], [262, 202], [180, 236], [96, 246]], 2);
    const face = oval(c, 96, 151, 54, 95, { n: 16, j: 0.03 });
    const fat = oval(c, 98, 151, 47, 87, { n: 14, j: 0.04 });
    const meat = oval(c, 100, 152, 37, 74, { n: 14, j: 0.06 });
    return bone(c, 306, 149, 364, 138, 26) + c.piece(body, 'S', grain(c, 240, 150, 160, 200, 84, 15, { col: '#C9958A', op: 0.3 }) + stroke(hline([[170, 216], [250, 186], [306, 160]]), '#D3998A', 1.4, 0.6))
      + c.piece(face, 'S') + c.piece(fat, 'PF') + c.piece(meat, 'P', seams([[[80, 96], [104, 130], [96, 186], [118, 214]], [[104, 130], [128, 118]]], 3, PORKFAT))
      + c.piece(oval(c, 106, 146, 13, 17, { n: 9 }), 'B', '', SW(1.6)) + dot(c, 107, 147, 5, 6, 'W', 0.9);
  },

  'pork-jowl': (c) => {
    const top = jit(c, [[30, 128], [96, 80], [230, 50], [344, 58], [366, 100], [318, 160], [214, 210], [104, 212], [42, 180]], 3); // a wedge, wide at the cheek
    const streaks = [[[20, 150], [130, 112], [250, 82], [380, 64]], [[40, 186], [150, 156], [270, 128], [390, 106]], [[110, 214], [220, 182], [330, 150]], [[90, 118], [150, 100]]].map((p, i) => stroke(line(jit(c, p, 5)), M.P[1], [9, 13, 8, 6][i], 0.9)).join('');
    const ch = chain(top);
    return c.piece(side(top, 26), 'PF', stroke(line(shift(ch, 0, 21)), M.S[1], 12) + stroke(line(shift(ch, 0, 10)), M.P[1], 4, 0.6)) + c.piece(top, 'PF', streaks + dots(c, 200, 130, 150, 70, 20, 3, M.P[0], 0.7));
  },

  'pork-hock': (c) => [[136, 120, 82, 54, 40], [276, 152, 74, 48, 36]].map(([x, y, rx, ry, h]) => {
    const top = oval(c, x, y, rx, ry, { n: 14, j: 0.05 }), sm = [];
    for (let i = 0; i < 3; i++) { const a = (c.rnd() * 60 + i * 120) * D; sm.push([[x + cos(a) * rx * 0.3, y + sin(a) * ry * 0.3], [x + cos(a) * rx * 0.8, y + sin(a) * ry * 0.8]]); }
    return c.piece(side(top, h), 'Sd', grain(c, x, y + ry + h / 2, h * 2, rx * 2, 90, 12, { col: '#9E7650', op: 0.3 })) + c.piece(top, 'S')
      + c.piece(oval(c, x, y, rx * 0.9, ry * 0.86, { n: 12, j: 0.05 }), 'PF') + c.piece(oval(c, x, y, rx * 0.76, ry * 0.72, { n: 12, j: 0.07 }), 'P', seams(sm, 3, PORKFAT))
      + c.piece(oval(c, x - rx * 0.06, y + 2, rx * 0.25, ry * 0.3, { n: 10 }), 'B', '', SW(1.6)) + dot(c, x - rx * 0.06, y + 2, rx * 0.11, ry * 0.12, 'W', 0.8) + dot(c, x + rx * 0.34, y - ry * 0.3, rx * 0.08, ry * 0.1, 'B', 1.1);
  }).join(''),

  'pork-sausage': (c) => {
    const S = (t) => [46 + 308 * t, 150 + 66 * sin(TAU * 1.15 * t + 0.35)];
    const N = 300, cum = [0];
    for (let i = 1; i <= N; i++) { const a = S((i - 1) / N), b = S(i / N); cum.push(cum[i - 1] + hypot(b[0] - a[0], b[1] - a[1])); }
    const at = (u) => S(max(0, cum.findIndex((v) => v >= cum[N] * u)) / N); // point at a fraction of the length
    const ids = [], twist = [];
    let fl = '', fen = '', hi = '';
    for (let i = 0; i < 5; i++) {
      const [x1, y1] = at(i / 5 + 0.016), [x2, y2] = at((i + 1) / 5 - 0.016), L = hypot(x2 - x1, y2 - y1), a = atan2(y2 - y1, x2 - x1) / D;
      ids.push(c.def(curve(capsule(c, x1, y1, x2, y2, 22))));
      const P = (u, v) => place([[u, v]], x1, y1, a)[0];
      for (let k = 0; k < 9; k++) fl += `M${j(...P(L * (0.08 + c.rnd() * 0.84), (c.rnd() - 0.5) * 32))}h0`;
      for (let k = 0; k < 7; k++) { const b = c.rnd() * TAU; fen += `M${j(...P(L * (0.08 + c.rnd() * 0.84), (c.rnd() - 0.5) * 32))}l${j(cos(b) * 3.4, sin(b) * 3.4)}`; }
      hi += `M${j(...P(L * 0.16, -11))}Q${j(...P(L * 0.5, -14), ...P(L * 0.84, -11))}`;
    }
    for (let i = 0; i <= 5; i++) {
      const [x, y] = at(i / 5), [x2, y2] = at(min(1, i / 5 + 0.01)), [x0, y0] = at(max(0, i / 5 - 0.01)), a = atan2(y2 - y0, x2 - x0) / D;
      const tail = i === 0 ? 'M-4 0l-11 3' : i === 5 ? 'M4 0l11-3' : '';
      twist.push(g(`translate(${j(x, y)}) rotate(${f(a)})`, `<ellipse rx="7" ry="8" fill="${M.K[1]}"/><path d="M-5-7C-2-3 2 3 5 7M-5 7C-2 3 2-3 5-7${tail}" stroke-width="1.4"/>`));
    }
    return twist.join('') + ids.map((s) => `<use href="#${s}" fill="${c.m('K')}"/>`).join('')
      + `<g clip-path="url(#${c.clip(...ids)})">${stroke(fl, PORKFAT, 3.2, 0.9)}${stroke(fen, '#6E6A3C', 1.8, 0.85)}${stroke(hi, '#FFF8F0', 4, 0.45)}</g>`;
  },

  bacon: (c) => [70, 116, 162, 208].map((y0) => {
    const ph = c.rnd() * TAU, rb = ribbon((t) => [26 + 348 * t, y0 + 14 - 26 * t + 5 * sin(TAU * 3.2 * t + ph)], (t) => 25 + 2 * sin(TAU * 4 * t + ph), 12, 0.25);
    const b = (v, w, col, op = 1) => stroke(line([0, 0.25, 0.5, 0.75, 1].map((t) => rb.at(t, v + (c.rnd() - 0.5) * 0.12))), col, w, op);
    return c.piece(rb.pts, '#F3E3C8', b(-0.62, 9, '#C45F59') + b(0.02, 13, '#B4494A') + b(0.62, 8, '#CC6E66') + b(0.98, 4, '#B97C4E', 0.8) + b(-0.3, 2.5, '#E39A90', 0.7));
  }).join(''),

  // ----- lamb
  'lamb-rack': (c) => {
    const bones = [];
    for (let i = 0; i < 8; i++) { const x = 104 + i * 31, tx = x - 30 + (c.rnd() - 0.5) * 6, ty = 40 + abs(i - 3.5) * 5 + c.rnd() * 6; bones.push([line([[x, 180], [x - 6, 110], [tx, ty]]), 12.5]); }
    const body = jit(c, [[66, 168], [150, 154], [250, 150], [350, 162], [374, 200], [352, 242], [250, 254], [150, 256], [66, 248], [46, 210]], 2);
    const cap = jit(c, [[64, 172], [150, 158], [250, 154], [352, 166], [372, 198], [300, 210], [200, 214], [104, 214], [56, 200]], 2);
    const score = grain(c, 210, 184, 60, 300, 115, 22, { col: '#CDB78E', op: 0.7, w: 1.2, wave: 1 });
    return tubes(bones, M.B[0]) + c.piece(body, 'A', marble(c, 210, 236, 150, 16, 8, { col: LAMBFAT })) + c.piece(cap, 'AF', score)
      + c.piece(oval(c, 68, 210, 34, 44, { n: 12 }), 'AF') + c.piece(oval(c, 72, 220, 24, 27, { n: 10, j: 0.06 }), 'A', marble(c, 72, 220, 20, 22, 4, { col: LAMBFAT }), SW(1.6));
  },

  'lamb-loin-chops': (c) => [[274, 122, 22, -1, 0.9], [134, 164, -12, 1, 1]].map(([x, y, r, m, s]) => {
    // little T-bones, cut thick: a big loin eye and a small tenderloin either side of the bone, a thin rim of fat, a tail of belly meat
    const P = (pts) => place(pts.map(([u, v, k]) => pt(u * m, v, k)), x, y, r, s);
    const top = P(jit(c, [[-70, -36], [-40, -52], [0, -52], [30, -50], [54, -38], [62, -14], [56, 8], [36, 18], [20, 36], [-10, 50], [-50, 50], [-74, 32], [-80, 0]], 2));
    const eye = P(oval(c, -22, -8, 44, 30, { n: 12, j: 0.08, rot: -10, shape: (t) => 1 - 0.1 * sin(t) ** 8 })), ten = P(oval(c, 41, -18, 13, 17, { n: 9, j: 0.08 }));
    const tail = P(jit(c, [[-62, 34], [-24, 40], [12, 30], [-6, 46], [-46, 48]], 1));
    const tb = tubes([[line(P([[-8, -47], [24, -48], [56, -42]])), 9], [line(P([[26, -46], [25, -16], [22, 16]])), 6]], M.B[0], 1.1) + dot(c, ...P([[25, -46]])[0], 8 * s, 7 * s, 'B', 1.1);
    return c.piece(side(top, 30), 'AFd', stroke(line(shift(chain(top), 0, 16)), M.A[1], 9, 0.55))
      + c.piece(top, 'AF', c.piece(eye, 'A', marble(c, ...P([[-24, -6]])[0], 36, 28, 9, { col: LAMBFAT })) + c.piece(ten, 'A', '', SW(1.3)) + c.piece(tail, 'A', '', SW(1)) + tb);
  }).join(''),

  'lamb-shoulder-chops': (c) => [[134, 148, -10, 1], [278, 152, 14, 0.94]].map(([x, y, r, s]) => {
    const sm = seams([[[-70, -20], [-30, -8], [-14, -40], [10, -62]], [[-30, -8], [-6, 30], [-20, 60]], [[-6, 30], [40, 20], [74, 30]], [[10, -30], [50, -20]]].map((p) => jit(c, p, 3)), 3.5, LAMBFAT);
    return g(`translate(${x} ${y}) rotate(${r}) scale(${s})`, c.piece(oval(c, 0, 0, 88, 70, { n: 14, j: 0.07 }), 'AF') + c.piece(oval(c, 3, 4, 78, 60, { n: 14, j: 0.08 }), 'A', sm + marble(c, 0, 0, 70, 54, 10, { col: LAMBFAT }))
      + c.piece(oval(c, -22, 8, 14, 13, { n: 9 }), 'B', '', SW(1.6)) + dot(c, -22, 8, 5.5, 5.5, 'W', 0.8));
  }).join(''),

  'lamb-leg': (c) => { // half leg, shank end: fat cover, the cut face at the wide end, the shank bone sawn off at the narrow end
    const body = jit(c, [[44, 154], [60, 100], [118, 70], [200, 74], [266, 102], [304, 130], [312, 154], [282, 176], [214, 206], [126, 230], [64, 214]], 2.5);
    const cover = jit(c, [[30, 150], [56, 90], [118, 62], [200, 66], [270, 96], [306, 126], [272, 146], [214, 154], [150, 172], [96, 190], [50, 186]], 2);
    const meat = oval(c, 52, 152, 22, 54, { n: 12, j: 0.06 });
    return bone(c, 296, 146, 364, 128, 24) + c.piece(capsule(c, 276, 152, 322, 141, 19), 'A', stroke(line([[286, 141], [316, 135]]), '#EFE6EC', 2.4, 0.5))
      + c.piece(body, 'A', c.piece(cover, 'AF', grain(c, 170, 120, 320, 150, 18, 13, { col: '#CDB27A', op: 0.45, w: 1, wave: 4 })) + marble(c, 180, 200, 110, 18, 8, { col: LAMBFAT, len: 12, ang: -15 }) + stroke(line([[120, 214], [200, 196], [270, 170]]), '#EFE6EC', 2.4, 0.4))
      + c.piece(oval(c, 50, 152, 30, 64, { n: 12, j: 0.04 }), 'AF') + c.piece(meat, 'A', seams([[[40, 120], [56, 150], [44, 190]]], 3, LAMBFAT)) + dot(c, 58, 146, 7, 9, 'B', 1.1);
  },

  'lamb-breast': (c) => {
    // meat side up: an uneven flat slab, ribs as soft ridges under thin meat and fat; the cut edge is layered, a few rib ends showing
    const top = oval(c, 200, 112, 172, 62, { n: 18, p: 2.6, j: 0.09, r: 0.02, shape: (t) => 1 + 0.07 * cos(t) });
    const ch = chain(top), xs = [66, 108, 150, 192, 234, 276, 318];
    const layer = (d0, d1) => [...ch.map(([x, y]) => [x, y + d0 + (c.rnd() - 0.5) * 3]), ...ch.map(([x, y]) => [x, y + d1 + (c.rnd() - 0.5) * 3]).reverse()];
    const ridge = (o) => xs.map((x) => line([[x + 8 + o, 60], [x + o, 112], [x - 8 + o, 164]])).join('');
    const fat = blobs(c, [0, 1, 2, 3].map((i) => oval(c, 80 + i * 80 + c.rnd() * 20, 90 + c.rnd() * 44, 50 + c.rnd() * 20, 16 + c.rnd() * 8, { n: 9, j: 0.2, rot: (c.rnd() - 0.5) * 16 })), LAMBFAT, ' stroke="none" opacity=".2"');
    const ribEnds = [1, 2, 4].map((i) => { const x = xs[i] - 8 + (c.rnd() - 0.5) * 6, y = yAt(ch, x) + 16; return c.piece(oval(c, x, y, 14, 6, { n: 9, j: 0.14, r: 0.05, rot: (c.rnd() - 0.5) * 16 }), '#EFE4D0', stroke(line([[x - 8, y], [x + 8, y + 1]]), M.W[1], 3, 0.75), SW(1.4)); }).join('');
    return c.piece(side(top, 30), 'AF', c.piece(layer(6, 11), 'A', '', SW(1)) + c.piece(layer(21, 36), 'A', '', SW(1)) + ribEnds)

      + c.piece(top, 'A', stroke(ridge(21), '#6E2632', 5, 0.2) + stroke(ridge(0), '#D98C94', 6, 0.28) + fat + marble(c, 200, 112, 160, 56, 12, { col: LAMBFAT }));
  },

  'lamb-shank': (c) => { // one shank: the meat gathered at the heel and tapering up the bone, the bone sawn flat where it came off the leg
    const body = jit(c, [[54, 238], [50, 200], [70, 160], [110, 128], [166, 104], [224, 86], [262, 76], [278, 92], [264, 114], [224, 142], [178, 186], [132, 232], [88, 256]], 2);
    const silver = [[[92, 214], [160, 150], [242, 98]], [[122, 238], [190, 178], [258, 108]]].map(line).join('');
    return bone(c, 252, 94, 334, 54, 26) + c.piece(body, 'A', stroke(silver, '#EFE6EC', 2.4, 0.5) + seam([[112, 128], [142, 180], [128, 246]], 3, LAMBFAT) + marble(c, 140, 196, 60, 50, 6, { col: LAMBFAT }) + c.piece(oval(c, 66, 222, 16, 26, { n: 9, rot: 24 }), 'AF', '', SW(1.1)));
  },

  'lamb-neck': (c) => [[96, 150, 60, -14], [210, 132, 56, 18], [314, 166, 50, 62]].map(([x, y, R, r]) => {
    // thick rounds of neck: fat round the rim, meat in lobes round the vertebra (its body, the canal, the spine and two side wings)
    const ry = R * 0.66, top = oval(c, x, y, R, ry, { n: 11, j: 0.08 }), meat = oval(c, x + 1, y + 1, R * 0.84, ry * 0.8, { n: 10, j: 0.1 });
    const vb = place([[-0.44, -0.02], [-0.16, -0.1], [-0.07, -0.46], [0.07, -0.46], [0.16, -0.1], [0.44, -0.02], [0.16, 0.08], [0.15, 0.26], [-0.15, 0.26], [-0.16, 0.08]].map(([u, v]) => [u * R, v * R]), x, y, r, 1, 0.66);
    const [kx, ky] = place([[0, -0.04 * R]], x, y, r, 1, 0.66)[0];
    const lobes = seams([[[x - R * 0.12, y - ry * 0.3], [x - R * 0.4, y - ry * 0.5], [x - R * 0.5, y - ry]], [[x + R * 0.16, y + ry * 0.24], [x + R * 0.36, y + ry * 0.6], [x + R * 0.2, y + ry]]].map((p) => jit(c, p, 2)), 2.6, LAMBFAT);
    return c.piece(side(top, R * 0.5, 1.02), 'Ad', stroke(line(shift(chain(top), 0, R * 0.12)), LAMBFAT, R / 5))
      + c.piece(top, 'AF') + c.piece(meat, 'A', lobes) + c.piece(vb, 'B', '', SW(1.3)) + dot(c, kx, ky, R * 0.08, R * 0.06, 'W', 0.8);
  }).join(''),

  'ground-lamb': (c) => mound(c, 200, 186, 150, 112, 'Ad', '#5E1A26', '#B9505B', '#F4EAD4'),

  // ----- chicken
  'whole-chicken': (c) => {
    const club = (x1, y1, x2, y2, w0) => ribbon((t) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t], (t) => w0 * (1 - t) ** 0.9 + 8, 10, 0.6);
    const far = club(264, 142, 316, 80, 20), near = club(250, 168, 338, 92, 27);
    const body = oval(c, 182, 168, 146, 88, { n: 18, j: 0.03 }).map(([x, y]) => [x, y > 168 ? 168 + (y - 168) * 0.72 : y]);
    const thigh = oval(c, 256, 178, 64, 48, { n: 12, rot: -28, j: 0.05 });
    const wing = [oval(c, 112, 190, 60, 24, { n: 12, rot: 8, j: 0.06 }), oval(c, 70, 204, 26, 10, { n: 10, rot: 20, shape: (t) => 1 - 0.3 * cos(t + PI) })];
    const knuckle = (rb) => dot(c, ...rb.at(1, 0), 10, 9, 'B', 1.3);
    return c.piece(far.pts, 'C') + knuckle(far) + c.piece(body, 'C', skinTex(c, 170, 160, 130, 70, 50) + stroke(line([[70, 120], [150, 94], [240, 104]]), '#FFF7E8', 8, 0.5))
      + c.piece(oval(c, 42, 158, 11, 15, { n: 8, j: 0.15 }), 'C', '', SW(1.6)) + c.union(wing, 'C', skinTex(c, 100, 194, 60, 20, 12))
      + c.union([thigh, near.pts], 'C', skinTex(c, 270, 150, 60, 50, 22) + stroke(line([[220, 160], [262, 140], [300, 116]]), '#FFF7E8', 5, 0.45)) + knuckle(near)
      + twine(curve([[318, 74], [342, 80], [350, 98], [334, 104], [316, 92]])) + knot(338, 104);
  },

  'chicken-thighs': (c) => {
    // skin side up: a rounded-rectangle thigh, puckered skin, pink meat along the cut edges, the femur end on one side.
    // Two thighs are drawn once each and laid out twice, turned, which keeps the file small.
    const thigh = (k, ph) => {
      const skin = oval(c, 0, -3, 68, 45, { n: 18, p: 2.5, j: 0.09, r: 0.02, rot: (c.rnd() - 0.5) * 8, shape: (t) => 1 + 0.05 * sin(7 * t + ph) + 0.06 * cos(t) });
      const folds = line([[-58, -20], [-50, -2], [-56, 16]]) + line([[-20, 30], [12, 24], [40, 32]]);
      c.defs.push(`<g id="${c.id}-t${k}">${c.piece(oval(c, -80, 6, 13, 10, { n: 8 }), 'B', '', SW(1.6))}${dot(c, -90, 6, 4.5, 6.5, 'B', 1)}`
        + c.piece(oval(c, 6, 9, 70, 46, { n: 10, p: 2.4, j: 0.08 }), 'CT', stroke(line([[-40, 52], [10, 50], [60, 44]]), '#B86E60', 3, 0.5), SW(1.6))
        + c.piece(skin, 'CK', skinRect(c, -80, -56, 160, 112) + stroke(folds, '#B07A48', 1.4, 0.55) + stroke(line([[-40, -26], [-4, -35], [32, -30]]), '#FFF7E8', 7, 0.5)) + '</g>');
    };
    thigh('a', 0); thigh('b', 2);
    return [[132, 104, -5, 'a', 1], [272, 100, 7, 'b', 1], [126, 198, 5, 'b', -1], [266, 202, -7, 'a', -1]].map(([x, y, r, k, m]) => `<use href="#${c.id}-t${k}" transform="translate(${x} ${y}) rotate(${r}) scale(${m} 1)"/>`).join('');
  },


  'chicken-breasts': (c) => [[122, 152, 12, 1], [282, 148, -12, -1]].map(([x, y, r, m]) => {
    const br = jit(c, [[-104, 6], [-78, -22], [-32, -46], [24, -56], [70, -44], [98, -14], [96, 18], [64, 42], [10, 52], [-44, 40], [-84, 22]], 2);
    return g(`translate(${x} ${y}) rotate(${r}) scale(${m} 1)`, c.piece(br, 'CM', grain(c, 0, 0, 240, 140, 35, 14, { col: '#C4877A', op: 0.22, wave: 5 }) + stroke(line([[-56, -30], [4, -46], [56, -34]]), '#FBEDE6', 6, 0.55))
      + c.piece(oval(c, -6, 38, 64, 14, { n: 10, rot: -6, j: 0.06, shape: (t) => 1 - 0.25 * cos(t + PI) }), 'CM', '', SW(1.5)));
  }).join(''),

  'chicken-wings': (c) => { // whole wings, skin side up: the drumette like a small drumstick, the elbow, the broad flat with straight sides, the pointed tip
    const W = [[-108, 22], [-102, -2], [-82, -10], [-58, -16], [-42, -26], [-36, -36], [-22, -40], [-12, -34], [20, -38], [56, -36], [66, -32], [80, -22], [100, -4], [116, 16, 1], [96, 14], [78, 14], [64, 16], [30, 16], [0, 14], [-18, 12], [-34, 18], [-48, 40], [-70, 56], [-96, 50]];
    return [[112, 82, -10, 1, 0.8], [294, 78, 12, 1, 0.76], [108, 212, 8, -1, 0.76], [294, 214, -14, 1, 0.8]].map(([x, y, r, m, s]) => {
      const P = (pts) => place(pts.map(([u, v, k]) => pt(u * m, v, k)), x, y, r, s);
      const creases = hline(P([[-30, -36], [-24, -12], [-22, 12]])) + hline(P([[64, -32], [70, -8], [66, 16]]));
      return c.piece(P(jit(c, W, 1.4)), 'C', stroke(hline(P([[-88, 14], [-60, 0], [-20, -18], [50, -20]])), '#FFF8EC', 7, 0.5) + stroke(creases, INK, 1.7, 0.85) + stroke(hline(P([[-8, -4], [30, -6], [56, -4]])), '#C0915A', 1.2, 0.5))
        + c.piece(P(oval(c, -100, 20, 7, 14, { n: 8, rot: 18 })), 'CT', '', SW(1)) + c.piece(P(oval(c, -100, 19, 3.5, 7, { n: 7, rot: 18 })), 'B', '', SW(0.8));
    }).join('');
  },

  salami: (c) => {
    const chub = capsule(c, 46, 120, 300, 84, 42, { p: 2.4 });
    const mott = []; for (let i = 0; i < 8; i++) mott.push(oval(c, 70 + i * 30 + c.rnd() * 10, 100 + (c.rnd() - 0.5) * 40 - i * 4, 9 + c.rnd() * 9, 5 + c.rnd() * 4, { n: 7, j: 0.25 }));
    const rings = [0.2, 0.4, 0.6, 0.8].map((t) => { const x = 46 + 254 * t, y = 120 - 36 * t; return line([[x - 6, y - 42], [x + 4, y - 4], [x + 8, y + 41]]); }).join('');
    const sl = [[110, 222, -12], [178, 230, 4], [246, 228, 14], [314, 216, 24]].map(([x, y, r]) => c.piece(oval(c, x, y, 38, 34, { n: 10, j: 0.04, rot: r }), 'BL', '', SW(1.2))
      + c.piece(oval(c, x, y, 33, 29, { n: 10, j: 0.04, rot: r }), 'SA', dots(c, x, y, 32, 28, 14, 3.4, '#F8EEE6', 0.95) + dots(c, x, y, 32, 28, 12, 2, '#F8EEE6', 0.9) + dots(c, x, y, 30, 26, 5, 1.6, '#2D1A16', 0.8), SW(0.8))).join('');
    return c.piece(chub, 'BL', blobs(c, mott, '#8E4A45', ' stroke="none" opacity=".3"')
      + stroke(line([[80, 92], [180, 76], [270, 66]]), '#FFFFFF', 6, 0.5)) + twine(rings + line([[300, 84], [316, 80], [330, 66], [322, 54], [310, 62], [316, 80]])) + sl;
  },

  'beef-stock': (c) => { // a quart deli tub of frozen stock, the fat set in a pale layer on top
    const lvl = 102, body = [[110, 78, 1], [119, 170], [128, 258], [150, 272], [200, 276], [250, 272], [272, 258], [281, 170], [290, 78, 1]];
    const ice = [[113, lvl, 1], [160, lvl + 10], [240, lvl + 10], [287, lvl, 1], [280, 180], [272, 258], [250, 271], [200, 274], [150, 271], [128, 258], [120, 180]];
    const inner = c.piece(ice, 'ST', stroke(line([[116, lvl + 4], [200, lvl + 16], [284, lvl + 4]]), FAT, 8, 0.9) + dots(c, 200, 180, 70, 70, 22, 2.2, '#F7EFE2', 0.5) + dots(c, 200, 170, 60, 60, 8, 4, '#C98A44', 0.5), SW(1.4))
      + stroke(hline([[134, 96], [140, 170], [144, 250]]), '#FFFFFF', 8, 0.4) + stroke(hline([[262, 98], [258, 170], [254, 250]]), '#FFFFFF', 4, 0.35);
    return c.piece(body, 'G', inner) + c.piece([[98, 70, 1], [98, 86], [130, 97], [200, 101], [270, 97], [302, 86], [302, 70, 1]], 'G')
      + c.piece(oval(c, 200, 70, 102, 20, { n: 14, j: 0.01 }), 'G', stroke(hline([[120, 64], [200, 58], [270, 62]]), '#FFFFFF', 4, 0.6)) + `<path d="${hline([[120, 76], [200, 83], [282, 74]])}" stroke-width="1.2" opacity=".5"/>`;
  },

  'beef-tallow': (c) => { // an 8 oz jar of tallow, set white, under a ridged lid
    const jar = [[132, 102], [114, 128], [112, 160], [112, 246], [122, 268], [146, 272], [254, 272], [278, 268], [288, 246], [288, 160], [286, 128], [268, 102]];
    const fill = [[118, 136, 1], [200, 128], [282, 136, 1], [282, 244], [270, 265], [200, 267], [130, 265], [118, 244]];
    const glass = c.piece(fill, 'TW', dots(c, 200, 200, 70, 60, 12, 2.4, '#DCC896', 0.5) + stroke(hline([[130, 150], [200, 142], [270, 150]]), '#FFFFFF', 6, 0.5), SW(1.4))
      + stroke(hline([[132, 120], [128, 180], [130, 250]]), '#FFFFFF', 8, 0.65) + stroke(hline([[270, 128], [272, 190], [272, 250]]), '#FFFFFF', 4, 0.4);
    let ridges = ''; for (let x = 140; x <= 260; x += 7 + c.rnd() * 3) ridges += `M${fi(x)} ${fi(72 + abs(x - 200) * 0.03 + c.rnd() * 2)}v${fi(24 - abs(x - 200) * 0.06)}`;
    return c.piece(jar, 'G', glass) + c.piece([[130, 70, 1], [130, 96], [160, 106], [240, 106], [270, 96], [270, 70, 1]], 'MT', stroke(ridges, '#6F6A63', 1.2, 0.5))
      + c.piece(oval(c, 200, 70, 70, 14, { n: 12, j: 0.01 }), 'MT', `<path d="${hline([[150, 73], [200, 78], [252, 72]])}" stroke-width="1" opacity=".5"/>`);
  },
};


// ---------- the notes on the paper beside each drawing, in the hand of whoever cut it: Marisol (beef, lamb) or Dani (pork,
// chicken and what we make in the back). The page sets them as text in the handwriting font. Positions are percentages of
// a 4:3 frame whose left ~71% holds the drawing: notes down the right-hand side, the last one along the bottom.
const NOTE_TEXT = {
  ribeye: ['← the cap. best bite on him', "fat's yellow: grass", "not much marbling, and that's right for a grass steer — M."],
  'ribeye-bone-in': ['ribs 6 to 12', 'the bone keeps the meat next to it juicy', 'rest it as long as you cooked it — M.'],
  strip: ['← fat down one side only', 'render that edge first, then cook it in the fat', 'leaner and firmer than a ribeye — M.'],
  tenderloin: ['filet', 'hardly any fat, so medium-rare or under', 'the most tender cut, and the mildest — M.'],
  hanger: ['one per steer', "seam's out, so you get two", 'hot pan, then slice it across the grain — M.'],
  skirt: ['loose grain: it drinks a marinade', '2 min a side, high heat', 'slice it across the grain, not along — M.'],
  flank: ['lean, same thickness end to end', 'grill it whole', 'slice it thin for tacos — M.'],
  'short-rib': ['three bones, one piece', 'braise 3 hrs or smoke 8', 'done when a fork goes in without a push — M.'],
  brisket: ['point on top, flat underneath', '¼ inch of fat left on', "two per steer, and one's gone — M."],
  'chuck-eye': ['the ribeye muscle, running into the shoulder', 'two per steer', 'marbled like a ribeye, a bit chewier — M.'],
  'flat-iron': ['top blade, gristle cut out', 'two per steer', 'both went in an hour. come early — M.'],
  'chuck-roast': ['tied so it holds together', 'the seams melt into the sauce', 'low heat and a lot of time — M.'],
  'eye-of-round': ['lean, tight grain', 'roast it rare, chill it overnight', 'slice it paper-thin for sandwiches — M.'],
  'top-round': ['London broil', 'marinate it overnight', 'cook it hot, slice it thin across the grain — M.'],
  'ground-beef': ['ground twice', '80 lean, 20 fat', 'all trim from this one steer — M.'],
  'marrow-bones': ['leg bone, 2 inch rounds', '450°F, 15 to 20 min', 'spread it on toast, with salt — M.'],
  oxtail: ['one tail, big end to tip', 'braise it 4 hrs', 'the sauce sets like jelly when it cools — M.'],
  tongue: ['simmer it 3 hrs', "peel it while it's warm", 'then slice it and sear it — M.'],
  'pork-chops': ['fat on the outside edge', 'salt an hour ahead, off at 140°F', 'outdoor pigs: darker, fattier meat — D.'],
  'pork-tenderloin': ['thin end cooks first', 'six this week, gone the first day', 'the loin chops are the closest thing — D.'],
  'pork-belly': ['skin on top: score it', 'salt it overnight for crackling', 'roast it low, then hot at the end — D.'],
  'spare-ribs': ['full rack, belly side', '225°F, 6 hrs', 'no smoker? foil, in the oven — D.'],
  'pork-shoulder': ['Boston butt', "the blade bone slides out when it's done", 'about 200°F inside for pulled pork — D.'],
  'fresh-ham': ['raw. not cured, not smoked', 'back leg, skin on', 'score the skin, roast it low 5 hrs — D.'],
  'pork-jowl': ['the cheek', 'fattier than belly', 'slice it and crisp it, or cure it — D.'],
  'pork-hock': ['two fresh hocks', 'skin, bone and a lot of collagen', 'for a pot of beans or greens — D.'],
  'pork-sausage': ['five links to a pound', 'fennel, garlic, white wine', "this week's shoulder trim, natural casings — D."],
  bacon: ['sliced thick', 'start it in a cold pan', 'cured 7 days, hickory smoked — D.'],
  'lamb-rack': ['eight ribs, bones cleaned', 'sear the fat side, 425°F', 'pull it at 130°F, cut it at the table — M.'],
  'lamb-loin-chops': ['little T-bones', '3 min a side, hot pan', 'two to a pack. they go first — M.'],
  'lamb-shoulder-chops': ['a few seams of fat', 'cook them to medium', 'cheaper than the loin chops — M.'],
  'lamb-leg': ['half leg, shank end', 'stud it with garlic, 350°F', 'pull it at 135°F. a whole one feeds ten — M.'],
  'lamb-breast': ["lamb's spare ribs", 'cumin, then low for 3 hrs', 'crisp it under the broiler at the end — M.'],
  'lamb-shank': ['braise 2½ hrs, till it lets go of the bone', 'one shank — M.'],
  'lamb-neck': ['one per lamb', '2½ hrs in a covered pot', 'it falls apart on its own — M.'],
  'ground-lamb': ['shoulder and leg trim', 'about 80 lean', 'kofta, or burgers with a lot of mint — M.'],
  'whole-chicken': ['air-chilled', 'salt it, leave it uncovered overnight', 'the skin dries, so it crisps — D.'],
  'chicken-thighs': ['four to a pack', 'skin down in a cold pan, 15 min', 'flip, finish in the oven — D.'],
  'chicken-breasts': ['two to a pack, skinless', 'brine 30 min in salted water', "and they won't dry out — D."],
  'chicken-wings': ['drum, flat, tip', 'ten to a pack', '425°F on a rack, 45 min — D.'],
  salami: ['60 days in the back', 'garlic and black pepper', 'slice it thin, eat it at room temp — D.'],
  'beef-stock': ['a quart, frozen', 'no salt in it', 'bones roasted first, simmered 12 hrs — D.'],
  'beef-tallow': ['8 oz', 'strained steer fat', 'sear steaks in it, roast potatoes in it — D.'],
};
export const NOTES = Object.fromEntries(Object.entries(NOTE_TEXT).map(([id, texts]) => {
  const r = prng(id + ':notes'), n = (a, b) => Math.round(a + r() * (b - a));
  const slots = texts.length === 3 ? [[72, 7, 26], [73, 44, 25], [6, 83, 63]] : [[72, 9, 26], [72, 70, 26]];
  return [id, texts.map((text, i) => {
    const [l, t, w] = slots[i], note = { left: l + n(0, 2), top: t + n(0, i === 2 ? 2 : 5), width: w - n(0, 2), text };
    if (/D\.$/.test(texts[texts.length - 1])) note.by = 'DO';
    return note;
  })];
}));

export const DRAWN_IDS = Object.keys(CUTS);

export function drawCut(id) {
  const fn = CUTS[id];
  if (!fn) throw new Error(`drawCut: no drawing for "${id}"`);
  const c = ctx(id);
  HAND = prng(id + ':hand');
  const body = fn(c);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs>${c.defs.join('')}</defs>`
    + `<g fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;
}
