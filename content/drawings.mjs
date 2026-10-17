// Build-time drawings of every cut: drawCut(id) returns a standalone SVG (400x300, transparent).
// Hand-drawn look = wobble filter over flat fills; every random choice comes from a PRNG seeded by the id,
// so a rebuild writes byte-identical files.

const { sin, cos, PI, abs, sqrt, hypot, atan2, max, min } = Math;
const TAU = PI * 2, D = PI / 180;
const INK = '#4E3A2A';

// materials: radial gradient [centre, edge]
const M = {
  L: ['#BC454C', '#8C2C34'], // beef lean
  Ld: ['#A6383F', '#74242C'], // beef, outside surface
  F: ['#F3E7C5', '#DBC594'], // beef fat, grass-yellow
  B: ['#F8F3E7', '#DFD2B7'], // bone
  Bd: ['#EDE3CE', '#C9B998'], // bone, shaded side
  W: ['#EAC3B1', '#C58E7E'], // marrow
  P: ['#EEB7AC', '#D58F86'], // pork lean
  Pd: ['#E3A197', '#BF7C73'],
  PF: ['#FBF6EC', '#EADDC6'], // pork fat
  S: ['#F0D4B2', '#D6AE84'], // pork skin
  Sd: ['#E2BE96', '#BF9468'],
  A: ['#B74E57', '#87323F'], // lamb lean
  Ad: ['#9D3F49', '#6E2834'],
  AF: ['#F8F0DE', '#E3D1AE'], // lamb fat
  AFd: ['#EADCBC', '#C9B289'],
  C: ['#F7E2BC', '#E2BC86'], // chicken skin
  CM: ['#F3D3C5', '#DAA796'], // chicken breast meat
  CT: ['#E9AF9E', '#C98877'], // chicken thigh meat
  CK: ['#F7E1B8', '#E2AF8E'], // thigh skin, pinker where it thins over the meat
  T: ['#D8ACAA', '#A98189'], // tongue
  SA: ['#97333C', '#5E1D26'], // salami
  BL: ['#F5F1EA', '#D3CABA'], // salami bloom
  ST: ['#C9873A', '#874C1C'], // frozen stock
  TW: ['#FDF8EB', '#E8DCBF'], // tallow
  MT: ['#E4E0D8', '#97918A'], // metal
  G: ['#F2F5F3', '#CFD7D4'], // glass / clear plastic
  K: ['#E3B5A3', '#C88A77'], // sausage casing
};
const FAT = '#F4E8C6', PORKFAT = '#FAF3E6', LAMBFAT = '#F6EDDA';

// ---------- numbers and paths
const f = (v) => { const r = Math.round(v * 10) / 10; return r === 0 ? '0' : String(r).replace(/^(-?)0\./, '$1.'); };
const j = (...v) => v.map(f).join(' ').replace(/ -/g, '-').replace(/(\.\d+) (?=\.)/g, '$1');
const r1 = (v) => Math.round(v * 10) / 10;

function prng(str) { // FNV-1a hash → mulberry32
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Catmull-Rom through the points → cubic Bézier path
function curve(pts, closed = true) {
  const n = pts.length, at = (i) => pts[closed ? (i + n) % n : max(0, min(n - 1, i))];
  let x = r1(pts[0][0]), y = r1(pts[0][1]), d = `M${j(x, y)}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) { // relative segments measured from the rounded pen position, so no drift
    const [a, b, e, g] = [at(i - 1), at(i), at(i + 1), at(i + 2)], ex = r1(e[0] - x), ey = r1(e[1] - y);
    d += `c${j(b[0] + (e[0] - a[0]) / 6 - x, b[1] + (e[1] - a[1]) / 6 - y, e[0] - (g[0] - b[0]) / 6 - x, e[1] - (g[1] - b[1]) / 6 - y, ex, ey)}`;
    x = r1(x + ex); y = r1(y + ey);
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
const jit = (c, pts, a) => pts.map(([x, y]) => [x + (c.rnd() - 0.5) * 2 * a, y + (c.rnd() - 0.5) * 2 * a]);
const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
const place = (pts, x, y, rot = 0, sx = 1, sy = sx) => pts.map(([u, v]) => [x + u * sx * cos(rot * D) - v * sy * sin(rot * D), y + u * sx * sin(rot * D) + v * sy * cos(rot * D)]);

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
function side(pts, h, k = 1) { // k > 1 bulges the bottom edge outwards
  const ch = chain(pts), mx = (ch[0][0] + ch[ch.length - 1][0]) / 2, low = ch.map(([x, y]) => [mx + (x - mx) * k, y + h]).reverse();
  return `${line(ch)}L${j(...low[0].map(r1))}${line(low).replace(/^M[^a-z]*/, '')}Z`;
}

// ---------- details (callers clip them to the shape they belong to)
const stroke = (d, col, w, op = 1, extra = '') => `<path d="${d}" stroke="${col}" stroke-width="${f(w)}"${op < 1 ? ` opacity="${op}"` : ''}${extra}/>`;

// sparse marbling: short bent flecks inside an ellipse, a few bigger than the rest
function marble(c, cx, cy, rx, ry, n, { col = FAT, w = 1.1, len = 5, op = 0.85, ang } = {}) {
  let sm = '', bg = '';
  for (let i = 0; i < n; i++) {
    const r = sqrt(c.rnd()), t = c.rnd() * TAU, x = cx + cos(t) * rx * r, y = cy + sin(t) * ry * r;
    const big = c.rnd() < 0.2, l = len * (big ? 1.3 + c.rnd() : 0.45 + c.rnd() * 0.7);
    const a = (ang === undefined ? c.rnd() * 180 : ang + (c.rnd() - 0.5) * 50) * D, dx = cos(a) * l, dy = sin(a) * l, b = (c.rnd() - 0.5) * 0.6;
    const s = `M${fi(x)} ${fi(y)}q${j(dx / 2 - dy * b, dy / 2 + dx * b, dx, dy)}`;
    if (big) bg += s; else sm += s;
  }
  return stroke(sm, col, w, op) + (bg ? stroke(bg, col, w * 1.7, op) : '');
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

// tubes: a coloured stroke over a slightly wider ink stroke (bones, seams, twine); inks first so joints merge
function tubes(list, col, e = 1.8) {
  const by = new Map();
  for (const [d, w] of list) by.set(w, (by.get(w) || '') + d);
  let ink = '', fill = '';
  for (const [w, d] of by) { ink += `<path d="${d}" stroke-width="${f(w + 2 * e)}"/>`; fill += stroke(d, col, w); }
  return ink + fill;
}
const tube = (d, w, col, e) => tubes([[d, w]], col, e);
const seam = (pts, w = 4, col = FAT) => tube(line(pts), w, col, 0.8);
const seams = (list, w = 4, col = FAT) => tubes(list.map((p) => [line(p), w]), col, 0.8);
const twine = (d) => `<path d="${d}" stroke-width="4.6"/>${stroke(d, '#F2E9D3', 2.6)}${stroke(d, '#C2AC83', 2.6, 1, ' stroke-dasharray="1.4 2.6"')}`;
const knot = (x, y) => twine(line([[x - 9, y - 4], [x, y + 2], [x - 2, y + 16]])) + twine(line([[x + 9, y - 3], [x + 1, y + 2], [x + 6, y + 15]])) + `<circle cx="${f(x)}" cy="${f(y + 1)}" r="3.2" fill="#F2E9D3" stroke-width="1.4"/>`;

// long bone between two points, knuckled ends where k[i] is set
function bone(x1, y1, x2, y2, w, k = [1, 1]) {
  const L = hypot(x2 - x1, y2 - y1), h = w / 2;
  const right = k[1] ? [[L - 1.3 * h, -1.05 * h], [L + 0.1 * h, -1.4 * h], [L + h, -0.8 * h], [L + 0.6 * h, 0], [L + h, 0.8 * h], [L + 0.1 * h, 1.4 * h], [L - 1.3 * h, 1.05 * h]] : [[L - 0.4 * h, -h], [L + 0.7 * h, 0], [L - 0.4 * h, h]];
  const left = k[0] ? [[1.3 * h, 1.05 * h], [-0.1 * h, 1.4 * h], [-h, 0.8 * h], [-0.6 * h, 0], [-h, -0.8 * h], [-0.1 * h, -1.4 * h], [1.3 * h, -1.05 * h]] : [[0.4 * h, h], [-0.7 * h, 0], [0.4 * h, -h]];
  return place([...right, [L / 2, 0.72 * h], ...left, [L / 2, -0.72 * h]], x1, y1, atan2(y2 - y1, x2 - x1) / D);
}

// ---------- drawing context: gradients, shared shapes and clips, all with ids prefixed by the cut id
function ctx(id) {
  const rnd = prng(id), defs = [], mats = new Set(); let n = 0;
  const c = {
    id, rnd, defs,
    m(k) {
      if (!M[k]) return k;
      if (!mats.has(k)) { mats.add(k); defs.push(`<radialGradient id="${id}-${k}" cx=".42" cy=".36" r=".74"><stop stop-color="${M[k][0]}"/><stop offset="1" stop-color="${M[k][1]}"/></radialGradient>`); }
      return `url(#${id}-${k})`;
    },
    def(d) { const s = `${id}-${++n}`; defs.push(`<path id="${s}" d="${d}"/>`); return s; },
    clip(...ss) { const s = `${id}-${++n}`; defs.push(`<clipPath id="${s}">${ss.map((x) => `<use href="#${x}"/>`).join('')}</clipPath>`); return s; },
    // a filled shape; inner detail is clipped to it and the ink outline drawn last so edges stay clean
    piece(shape, fill, inner = '', attrs = '') {
      const d = typeof shape === 'string' ? shape : curve(shape);
      if (!inner) return `<path d="${d}" fill="${c.m(fill)}"${attrs}/>`;
      const s = c.def(d);
      return `<use href="#${s}" fill="${c.m(fill)}" stroke="none"/><g clip-path="url(#${c.clip(s)})">${inner}</g><use href="#${s}"${attrs}/>`;
    },
    // shapes merged into one silhouette: doubled outlines first (the inner half is covered), fills on top
    union(shapes, fill, inner = '') { // point lists only; same winding so overlaps stay filled
      const s = c.def(shapes.map((p) => curve(area(p) < 0 ? p.slice().reverse() : p)).join(''));
      return `<use href="#${s}" stroke-width="4"/><use href="#${s}" fill="${c.m(fill)}" stroke="none"/>` + (inner ? `<g clip-path="url(#${c.clip(s)})">${inner}</g>` : '');
    },
    // pattern content does not inherit the drawing group's style, so it gets its own
    pattern(w, h, body, tr = '') { const s = `${id}-${++n}`; defs.push(`<pattern id="${s}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"${tr ? ` patternTransform="${tr}"` : ''}><g fill="none" stroke-linecap="round">${body}</g></pattern>`); return `url(#${s})`; },
  };
  return c;
}
const g = (tr, s) => `<g transform="${tr}">${s}</g>`;
const SW = (w) => ` stroke-width="${w}"`;

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

// round cross-section: fat rim, meat with radial seams, a bone in the middle (oxtail, neck)
function roundSlice(c, cx, cy, R, { lean, fatM, fatC, vert, rot = 0, n = 4 }) {
  const fat = oval(c, cx, cy, R, R * 0.93, { n: 10, j: 0.07 });
  const meat = oval(c, cx + R * 0.03, cy + R * 0.02, R * 0.84, R * 0.78, { n: 10, j: 0.08 });

  const sm = [];
  for (let i = 0; i < n; i++) {
    const a = (rot + i * (360 / n) + (c.rnd() - 0.5) * 30) * D;
    sm.push([[cx + cos(a) * R * 0.32, cy + sin(a) * R * 0.32], [cx + cos(a + 0.12) * R * 0.6, cy + sin(a + 0.12) * R * 0.6], [cx + cos(a) * R * 0.95, cy + sin(a) * R * 0.95]]);
  }
  return c.piece(fat, fatM) + c.piece(meat, lean, seams(sm, 3, fatC) + marble(c, cx, cy, R * 0.7, R * 0.7, 4, { col: fatC })) + vert;
}

// a 3/4 cylinder of bone, cut across, marrow on top
function boneRing(c, cx, cy, rx, ry, h) {
  const top = oval(c, cx, cy, rx, ry, { n: 12, j: 0.05, shape: (t) => 1 + 0.07 * cos(3 * t + 1) });
  const mar = oval(c, cx + rx * 0.06, cy + ry * 0.06, rx * 0.5, ry * 0.5, { n: 10, j: 0.08 });
  const bits = blobs(c, [0, 1].map(() => oval(c, cx + (c.rnd() - 0.5) * rx * 1.3, cy + ry * 0.8 + h * (0.25 + c.rnd() * 0.5), 10 + c.rnd() * 8, 3 + c.rnd() * 2, { n: 7, j: 0.3, rot: (c.rnd() - 0.5) * 30 })), '#C98A7E', ' stroke="none" opacity=".55"');
  return c.piece(side(top, h), 'Bd', grain(c, cx, cy + ry + h / 2, h * 1.6, rx * 2, 90, 17, { col: '#B8A582', op: 0.45, w: 1 }) + bits)
    + c.piece(top, 'B')
    + c.piece(mar, 'W', stroke(line([[cx - rx * 0.2, cy - ry * 0.12], [cx + rx * 0.1, cy - ry * 0.25]]), '#F8E6DC', 3, 0.7));
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

  'flat-iron': (c) => { // two matching steaks side by side (the centre gristle cut out): long, even, tapered ends, fine cross-hatched marbling
    const steak = (cy, s) => oval(c, 200, cy, 166, 44, { n: 26, p: 6, j: 0.02, r: 0.006 }).map(([x, y]) => {
      const u = (x - 200) / 166, v = (y - cy) * ((y - cy) * s > 0 ? 0.85 : 1); // the cut inner edge runs straighter
      return [x, cy + v * (1 - 0.3 * u ** 6) + 3 * u * s];
    });
    const ids = [c.def(curve(steak(108, 1))), c.def(curve(steak(192, -1)))];
    const hatch = grain(c, 200, 150, 420, 310, 32, 9, { col: FAT, w: 0.9, op: 0.5, wave: 1, dash: '1.8 6 3 5' }) + grain(c, 200, 150, 420, 310, -32, 10, { col: FAT, w: 0.85, op: 0.42, wave: 1, dash: '2.4 7 1.4 5' }) + marble(c, 200, 150, 160, 80, 24, { len: 3, w: 0.9, op: 0.7 });
    const silver = stroke(line([[40, 143], [200, 145], [360, 143]]) + line([[40, 157], [200, 155], [360, 157]]), '#EAD8D8', 3, 0.5);
    return g('rotate(-4 200 150)', ids.map((s) => `<use href="#${s}" fill="${c.m('L')}" stroke="none"/>`).join('') + `<g clip-path="url(#${c.clip(...ids)})">${hatch}${silver}</g>` + ids.map((s) => `<use href="#${s}"/>`).join(''));
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

  'marrow-bones': (c) => boneRing(c, 128, 96, 64, 40, 50) + boneRing(c, 280, 92, 58, 36, 46) + boneRing(c, 204, 176, 70, 43, 52),

  oxtail: (c) => [[120, 98, 70], [276, 100, 62], [128, 222, 54], [272, 214, 46]].map(([x, y, R]) => {
    const rot = c.rnd() * 90, vb = oval(c, x, y, R * 0.36, R * 0.34, { n: 16, j: 0.03, rot, shape: (t) => 0.74 + 0.36 * abs(cos(2 * t)) ** 3 });
    return roundSlice(c, x, y, R, { lean: 'L', fatM: 'F', fatC: FAT, rot: rot + 45, vert: c.piece(vb, 'B', '', SW(1.6)) + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R * 0.1)}" fill="${M.W[0]}" stroke-width="1.2"/>` });
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

  'spare-ribs': (c) => {
    const tp = (x) => 66 + ((x - 170) / 200) ** 2 * 26, bt = (x) => 242 - (x - 20) * 0.15;
    const pts = [];
    for (let x = 30; x <= 360; x += 55) pts.push([x, tp(x) + (c.rnd() - 0.5) * 5]);
    pts.push([376, 140]);
    for (let x = 360; x >= 30; x -= 55) pts.push([x, bt(x) + (c.rnd() - 0.5) * 5]);
    pts.push([18, 160]);
    const bones = [];
    for (let i = 0; i < 12; i++) { const x = 44 + i * 28 + (c.rnd() - 0.5) * 4; bones.push([line([[x + 6, tp(x) + 24], [x - 2, (tp(x) + bt(x)) / 2], [x - 6, bt(x) + 10]]), 10]); }
    return c.piece(pts, 'P', marble(c, 200, 150, 180, 90, 22, { col: PORKFAT, len: 9, ang: 4, w: 1.6 })) + tubes(bones, M.B[0]);
  },

  'pork-shoulder': (c) => {
    const top = oval(c, 200, 104, 162, 70, { n: 18, j: 0.05, p: 2.6 });
    const sm = seams([[[60, 92], [130, 112], [168, 160]], [[196, 40], [214, 90], [290, 116], [350, 112]], [[214, 90], [196, 130]]].map((p) => jit(c, p, 3)), 4, PORKFAT);
    const blade = tubes([[line([[106, 76], [180, 88], [266, 78]]), 10], [line([[182, 88], [190, 56]]), 7]], M.B[0], 1.8);
    const cap = (() => { const t = [], b = []; for (let x = 20; x <= 390; x += 46) { t.push([x, 150]); b.push([x, 196 + (c.rnd() - 0.5) * 20]); } return c.piece([...t, ...b.reverse()], 'PF', '', SW(1.4)); })();
    return c.piece(side(top, 100), 'Pd', cap + grain(c, 200, 240, 120, 340, 88, 14, { col: '#A86760', op: 0.25 })) + c.piece(top, 'P', sm + blade + marble(c, 200, 104, 150, 60, 12, { col: PORKFAT }));
  },

  'fresh-ham': (c) => {
    const body = jit(c, [[96, 56], [180, 64], [262, 96], [318, 128], [332, 150], [318, 172], [262, 202], [180, 236], [96, 246]], 2);
    const face = oval(c, 96, 151, 54, 95, { n: 16, j: 0.03 });
    const fat = oval(c, 98, 151, 47, 87, { n: 14, j: 0.04 });
    const meat = oval(c, 100, 152, 37, 74, { n: 14, j: 0.06 });
    return c.piece(bone(304, 148, 372, 136, 26, [0, 1]), 'B') + c.piece(body, 'S', stroke(line([[150, 82], [240, 104], [300, 136]]), '#FBEBD6', 5, 0.55) + grain(c, 300, 150, 60, 80, 80, 12, { col: '#B98D62', op: 0.3 }))
      + c.piece(face, 'S') + c.piece(fat, 'PF') + c.piece(meat, 'P', seams([[[80, 96], [104, 130], [96, 186], [118, 214]], [[104, 130], [128, 118]]], 3, PORKFAT))
      + c.piece(oval(c, 106, 146, 13, 17, { n: 9 }), 'B', '', SW(1.6)) + `<circle cx="107" cy="147" r="5" fill="${M.W[0]}" stroke-width="1"/>`;
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
      + c.piece(oval(c, x - rx * 0.06, y + 2, rx * 0.25, ry * 0.3, { n: 10 }), 'B', '', SW(1.6)) + `<ellipse cx="${f(x - rx * 0.06)}" cy="${f(y + 2)}" rx="${f(rx * 0.11)}" ry="${f(ry * 0.12)}" fill="${M.W[0]}" stroke-width="1"/>`
      + `<ellipse cx="${f(x + rx * 0.34)}" cy="${f(y - ry * 0.3)}" rx="${f(rx * 0.08)}" ry="${f(ry * 0.1)}" fill="${M.B[0]}" stroke-width="1.4"/>`;
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

  'lamb-loin-chops': (c) => [[120, 132, -6, 1], [284, 146, 8, -1]].map(([x, y, r, m]) => {
    const P = (pts) => place(pts.map(([u, v]) => [u * m, v]), x, y, r);
    const top = P(jit(c, [[-62, -48], [-10, -58], [44, -54], [74, -32], [88, 0], [98, 26], [82, 48], [40, 54], [0, 52], [-40, 54], [-66, 40], [-74, 0]], 2));
    const eye = P(oval(c, 10, -16, 46, 28, { n: 12, j: 0.05 })), ten = P(oval(c, 4, 32, 32, 15, { n: 10, j: 0.06 }));
    const tb = tubes([[line(P([[-54, -44], [-56, 0], [-52, 42]])), 13], [line(P([[-54, 10], [0, 12], [46, 8]])), 6]], M.B[0], 1.5);
    return c.piece(side(top, 24), 'AFd', stroke(line(shift(chain(top), 0, 16)), M.Ad[0], 9, 0.8)) + c.piece(top, 'AF', c.piece(eye, 'A', marble(c, ...P([[10, -16]])[0], 36, 20, 7, { col: LAMBFAT })) + c.piece(ten, 'A', '', SW(1.6)) + tb);
  }).join(''),

  'lamb-shoulder-chops': (c) => [[134, 148, -10, 1], [278, 152, 14, 0.94]].map(([x, y, r, s]) => {
    const sm = seams([[[-70, -20], [-30, -8], [-14, -40], [10, -62]], [[-30, -8], [-6, 30], [-20, 60]], [[-6, 30], [40, 20], [74, 30]], [[10, -30], [50, -20]]].map((p) => jit(c, p, 3)), 3.5, LAMBFAT);
    return g(`translate(${x} ${y}) rotate(${r}) scale(${s})`, c.piece(oval(c, 0, 0, 88, 70, { n: 14, j: 0.07 }), 'AF') + c.piece(oval(c, 3, 4, 78, 60, { n: 14, j: 0.08 }), 'A', sm + marble(c, 0, 0, 70, 54, 10, { col: LAMBFAT }))
      + c.piece(oval(c, -22, 8, 14, 13, { n: 9 }), 'B', '', SW(1.6)) + `<circle cx="-22" cy="8" r="5.5" fill="${M.W[0]}" stroke-width="1"/>`);
  }).join(''),

  'lamb-leg': (c) => {
    const body = jit(c, [[44, 154], [60, 100], [118, 70], [200, 74], [266, 102], [304, 130], [312, 154], [282, 176], [214, 206], [126, 230], [64, 214]], 2.5);
    const cover = jit(c, [[30, 150], [56, 90], [118, 62], [200, 66], [270, 96], [306, 126], [272, 146], [214, 154], [150, 172], [96, 190], [50, 186]], 2);
    const meat = oval(c, 52, 152, 22, 54, { n: 12, j: 0.06 });
    return c.piece(bone(318, 142, 378, 126, 24, [0, 1]), 'B') + c.piece(capsule(c, 280, 152, 330, 140, 19), 'A', stroke(line([[290, 141], [322, 134]]), '#EFE6EC', 2.4, 0.5))
      + c.piece(body, 'A', c.piece(cover, 'AF', grain(c, 170, 120, 320, 150, 18, 13, { col: '#D8C29A', op: 0.55, w: 1, wave: 4 })) + marble(c, 180, 200, 110, 18, 8, { col: LAMBFAT, len: 12, ang: -15 }) + stroke(line([[120, 214], [200, 196], [270, 170]]), '#EFE6EC', 2.4, 0.4))
      + c.piece(oval(c, 50, 152, 30, 64, { n: 12, j: 0.04 }), 'AF') + c.piece(meat, 'A', seams([[[40, 120], [56, 150], [44, 190]]], 3, LAMBFAT)) + `<ellipse cx="58" cy="146" rx="7" ry="9" fill="${M.B[0]}" stroke-width="1.4"/>`;
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

  'lamb-shank': (c) => {
    const bulb = jit(c, [[62, 222], [70, 164], [108, 124], [170, 100], [232, 92], [276, 98], [290, 116], [270, 140], [230, 176], [180, 228], [122, 262], [78, 254]], 2);
    const silver = [[[96, 200], [170, 140], [250, 106]], [[110, 236], [190, 180], [262, 128]], [[86, 170], [140, 130]]].map(line).join('');
    return c.piece(bone(258, 112, 364, 50, 24, [0, 1]), 'B') + c.piece(bulb, 'A', stroke(silver, '#EFE6EC', 2.4, 0.5) + seam([[120, 120], [150, 170], [140, 250]], 3, LAMBFAT) + marble(c, 150, 190, 60, 50, 6, { col: LAMBFAT }));
  },

  'lamb-neck': (c) => [[110, 158, 72, -20], [222, 128, 66, 25], [316, 176, 58, 70]].map(([x, y, R, r]) => {
    const vb = place(jit(c, [[0, -30], [8, -14], [28, -10], [30, 2], [14, 8], [12, 22], [0, 26], [-12, 22], [-14, 8], [-30, 2], [-28, -10], [-8, -14]], 1.5), x, y, r, R / 70);
    const [kx, ky] = place([[0, -3]], x, y, r, R / 70)[0];
    const vert = c.piece(vb, 'B', '', SW(1.6)) + `<ellipse cx="${f(kx)}" cy="${f(ky)}" rx="${f(5 * R / 70)}" ry="${f(4.5 * R / 70)}" fill="${M.W[0]}" stroke-width="1"/>`;
    return roundSlice(c, x, y, R, { lean: 'A', fatM: 'AF', fatC: LAMBFAT, vert, rot: r, n: 3 });
  }).join(''),

  'ground-lamb': (c) => mound(c, 200, 186, 150, 112, 'Ad', '#5E1A26', '#B9505B', '#F4EAD4'),

  // ----- chicken
  'whole-chicken': (c) => {
    const club = (x1, y1, x2, y2, w0) => ribbon((t) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t], (t) => w0 * (1 - t) ** 0.9 + 8, 10, 0.6);
    const far = club(264, 142, 316, 80, 20), near = club(250, 168, 338, 92, 27);
    const body = oval(c, 182, 168, 146, 88, { n: 18, j: 0.03 }).map(([x, y]) => [x, y > 168 ? 168 + (y - 168) * 0.72 : y]);
    const thigh = oval(c, 256, 178, 64, 48, { n: 12, rot: -28, j: 0.05 });
    const wing = [oval(c, 112, 190, 60, 24, { n: 12, rot: 8, j: 0.06 }), oval(c, 70, 204, 26, 10, { n: 10, rot: 20, shape: (t) => 1 - 0.3 * cos(t + PI) })];
    const knuckle = (rb) => `<ellipse cx="${f(rb.at(1, 0)[0])}" cy="${f(rb.at(1, 0)[1])}" rx="10" ry="9" fill="#F7EFE0" stroke-width="1.6"/>`;
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
      c.defs.push(`<g id="${c.id}-t${k}">${c.piece(oval(c, -80, 6, 13, 10, { n: 8 }), 'B', '', SW(1.6))}<ellipse cx="-90" cy="6" rx="4.5" ry="6.5" fill="#F7EFE0" stroke-width="1.2"/>`
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

  'chicken-wings': (c) => {
    // a whole wing in three outlined parts so the joints read: a meaty club drumette, the broad flat with its two bones as a ridge, the pointed tip.
    // Two wings are drawn once each and laid out twice, which keeps the file small.
    const wing = (k) => {
      const tip = ribbon((t) => [54 + 36 * t, -10 - 36 * t], (t) => 13 * (1 - t) + 1.5, 3, 0.5);
      const flat = oval(c, 16, -2, 40, 23, { n: 12, p: 3.4, j: 0.04 });
      const drum = ribbon((t) => [-70 + 54 * t, 64 - 62 * t], (t) => 10 + 15 * (1 - t) ** 0.6 * (0.8 + 0.2 * sin(TAU * t)), 6, 0.8);
      const ids = [tip.pts, flat, drum.pts].map((p) => c.def(curve(jit(c, p, 0.8))));
      const ridges = stroke(line([[-6, -10], [20, -12], [48, -11]]) + line([[-6, 7], [20, 7], [48, 5]]), '#FFF7E8', 3.5, 0.5) + stroke(line([[-6, -2], [20, -3], [48, -3]]), '#B07A48', 1.1, 0.45);
      const creases = line([[-24, -14], [-17, 2], [-23, 18]]) + line([[50, -22], [57, -9], [53, 5]]);
      c.defs.push(`<g id="${c.id}-w${k}">${ids.map((s) => `<use href="#${s}" fill="${c.m('C')}"/>`).join('')}<g clip-path="url(#${c.clip(...ids)})">${skinRect(c, -100, -60, 200, 150)}${ridges}${stroke(line([[-76, 50], [-56, 26], [-36, 14]]), '#FFF7E8', 6, 0.5)}</g>${stroke(creases, INK, 1.3, 0.55)}</g>`);
    };
    wing('a'); wing('b');
    return [[104, 72, -10, 'a'], [292, 70, 12, 'b'], [100, 196, 6, 'b'], [296, 200, -14, 'a']].map(([x, y, r, k]) => `<use href="#${c.id}-w${k}" transform="translate(${x} ${y}) rotate(${r}) scale(.9)"/>`).join('');

  },



  // ----- made in the shop
  salami: (c) => {
    const chub = capsule(c, 46, 120, 300, 84, 42, { p: 2.4 });
    const mott = []; for (let i = 0; i < 8; i++) mott.push(oval(c, 70 + i * 30 + c.rnd() * 10, 100 + (c.rnd() - 0.5) * 40 - i * 4, 9 + c.rnd() * 9, 5 + c.rnd() * 4, { n: 7, j: 0.25 }));
    const rings = [0.2, 0.4, 0.6, 0.8].map((t) => { const x = 46 + 254 * t, y = 120 - 36 * t; return line([[x - 6, y - 42], [x + 4, y - 4], [x + 8, y + 41]]); }).join('');
    const sl = [[110, 222, -12], [178, 230, 4], [246, 228, 14], [314, 216, 24]].map(([x, y, r]) => {
      const s = c.def(`M${x - 34} ${y}a34 30 ${r} 1 0 68 0a34 30 ${r} 1 0-68 0Z`);
      return `<ellipse cx="${x}" cy="${y}" rx="38" ry="34" transform="rotate(${r} ${x} ${y})" fill="${c.m('BL')}"/><use href="#${s}" fill="${c.m('SA')}" stroke="none"/><g clip-path="url(#${c.clip(s)})">${dots(c, x, y, 34, 30, 14, 3.4, '#F8EEE6', 0.95)}${dots(c, x, y, 34, 30, 12, 2, '#F8EEE6', 0.9)}${dots(c, x, y, 32, 28, 5, 1.6, '#2D1A16', 0.8)}</g><use href="#${s}" stroke-width="1"/>`;
    }).join('');
    return c.piece(chub, 'BL', blobs(c, mott, '#8E4A45', ' stroke="none" opacity=".3"')

 + stroke(line([[80, 92], [180, 76], [270, 66]]), '#FFFFFF', 6, 0.5)) + twine(rings + line([[300, 84], [316, 80], [330, 66], [322, 54], [310, 62], [316, 80]])) + sl;
  },

  'beef-stock': (c) => {
    const body = `M110 78L128 258C140 278 260 278 272 258L290 78Z`;
    const lvl = 102, ice = `M${j(113, lvl)}C150 ${lvl + 14} 250 ${lvl + 14} ${j(287, lvl)}L272 258C260 278 140 278 128 258Z`;
    const inner = c.piece(ice, 'ST', stroke(line([[116, lvl + 4], [200, lvl + 16], [284, lvl + 4]]), M.F[0], 8, 0.9) + dots(c, 200, 180, 70, 70, 26, 2.2, '#F7EFE2', 0.5) + dots(c, 200, 170, 60, 60, 10, 4, '#DDA25C', 0.5), SW(1.4))
      + stroke(line([[134, 96], [144, 250]]), '#FFFFFF', 9, 0.45) + stroke(line([[152, 100], [160, 252]]), '#FFFFFF', 3, 0.5) + stroke(line([[262, 98], [254, 250]]), '#FFFFFF', 4, 0.35);
    return c.piece(body, '#F2EEE6', inner) + stroke(line([[128, 250], [200, 262], [272, 250]]), INK, 1.4, 0.5)
      + `<path d="M98 70V84C98 102 302 102 302 84V70Z" fill="${c.m('G')}"/><ellipse cx="200" cy="70" rx="102" ry="20" fill="${c.m('G')}"/><ellipse cx="200" cy="70" rx="84" ry="14" stroke-width="1.2" opacity=".6"/>`
      + stroke(line([[120, 64], [200, 58], [270, 62]]), '#FFFFFF', 4, 0.6);
  },

  'beef-tallow': (c) => {
    const jar = `M132 102C120 112 112 124 112 140V246C112 266 124 272 140 272H260C276 272 288 266 288 246V140C288 124 280 112 268 102Z`;
    const fill = `M118 136C150 126 250 126 282 136V244C282 262 272 266 258 266H142C128 266 118 262 118 244Z`;
    const glass = c.piece(fill, 'TW', dots(c, 200, 200, 70, 60, 14, 2.4, '#E8D9B4', 0.5) + stroke(line([[130, 150], [200, 142], [270, 150]]), '#FFFFFF', 6, 0.5), SW(1.4))
      + stroke(line([[132, 120], [128, 180], [130, 250]]), '#FFFFFF', 8, 0.65) + stroke(line([[148, 130], [146, 240]]), '#FFFFFF', 3, 0.6) + stroke(line([[270, 128], [272, 250]]), '#FFFFFF', 4, 0.4);
    let ridges = ''; for (let x = 140; x <= 260; x += 8) ridges += `M${x} ${f(70 + abs(x - 200) * 0.03)}v${f(28 - abs(x - 200) * 0.06)}`;
    return c.piece(jar, '#EEF2F0', glass, ' stroke-width="2.2"') + `<path d="M130 70V96C130 108 270 108 270 96V70Z" fill="${c.m('MT')}"/>` + stroke(ridges, '#7F7A72', 1.2, 0.5)
      + `<ellipse cx="200" cy="70" rx="70" ry="14" fill="${c.m('MT')}"/><ellipse cx="200" cy="70" rx="56" ry="9" stroke-width="1" opacity=".5"/>`;
  },
};

export const DRAWN_IDS = Object.keys(CUTS);

export function drawCut(id) {
  const fn = CUTS[id];
  if (!fn) throw new Error(`drawCut: no drawing for "${id}"`);
  const c = ctx(id), body = fn(c), seed = 1 + Math.floor(c.rnd() * 999);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><filter id="${id}-w" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">`
    + `<feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="${seed}" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="4.5" xChannelSelector="R" yChannelSelector="G"/></filter>${c.defs.join('')}</defs>`
    + `<g filter="url(#${id}-w)" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;
}
