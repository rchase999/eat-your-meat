// Pure commerce logic (no DOM): pricing by weight, cart, delivery rules in Eastern time, box.
// Loaded in the browser as window.EYM_STORE and in Node for tests and the build.
(function (root) {
  const FEES = { courier: { fee: 8, freeAt: 100 }, overnight: { fee: 19, freeAt: 200 }, pickup: { fee: 0, freeAt: 0 }, email: { fee: 0, freeAt: 0 } };
  const VARIANCE = 0.1; // we charge actual weight, capped at estimate + 10%
  const BOX_OFF = 0.1;
  const COURIER_CUTOFF = 14 * 60; // 2 PM ET, Tue–Sun
  const SHIP_CUTOFF = 12 * 60; // noon ET, Mon–Wed
  const COURIER_DAYS = [0, 2, 3, 4, 5, 6];
  const SHIP_DAYS = [1, 2, 3];
  const HOURS = { 0: [10, 17], 1: null, 2: [9, 19], 3: [9, 19], 4: [9, 19], 5: [9, 19], 6: [9, 19] };

  const round = (n) => Math.round(n * 100) / 100;
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
  const money = (n) => fmt.format(n);
  const sign = (n) => (Number.isInteger(n) ? '$' + n.toLocaleString('en-US') : money(n)); // shop-sign style: $34/lb, $8

  // ---- pricing ----
  const defaultCfg = (item) => ({ opts: (item.options || []).map((o) => Math.max(0, o.choices.findIndex((c) => c.default))) });
  function choices(item, cfg) {
    return (item.options || []).map((o, i) => {
      const c = o.choices[(cfg.opts || [])[i] ?? defaultCfg(item).opts[i]];
      if (!c) throw new Error(`bad option for ${item.id}`);
      return c;
    });
  }
  function weightOf(item, cfg) {
    if (item.unit !== 'lb') return null;
    const picked = choices(item, cfg).find((c) => c.lb);
    return picked ? picked.lb : item.lb;
  }
  const unitPrice = (item, cfg) => (item.unit === 'lb' ? round(item.price * weightOf(item, cfg)) : item.price);
  // drop a default label that only repeats the name ("Whole chicken, Whole")
  const optionLabel = (item, cfg) => choices(item, cfg).filter((c) => !(c.default && item.name.toLowerCase().includes(c.label.toLowerCase()))).map((c) => c.label).join(' · ');
  // stock is counted in the default size; a whole shoulder uses two halves
  const unitsOf = (item, cfg) => (item.options ? choices(item, cfg).reduce((n, c) => n * (c.units || 1), 1) : 1);

  // ---- cart ----
  const lineKey = (l) => [l.id, (l.opts || []).join(','), l.note || '', l.box || '', l.amount || ''].join('|');
  const clamp = (q, max) => Math.max(0, Math.min(max ?? 99, 99, q));
  // max is in stock units; a line uses qty × units of them
  const usedBy = (cart, id, skip) => cart.filter((l) => l.id === id && l !== skip).reduce((s, l) => s + l.qty * (l.units || 1), 0);
  function addLine(cart, line, max) {
    const key = lineKey(line), u = line.units || 1;
    const hit = cart.find((l) => lineKey(l) === key);
    const room = max === undefined ? 99 : Math.floor(Math.max(0, max - usedBy(cart, line.id, hit)) / u);
    if (hit) return cart.map((l) => (l === hit ? { ...l, qty: clamp(l.qty + line.qty, room) } : l));
    const qty = clamp(line.qty || 1, room);
    return qty ? [...cart, { ...line, qty }] : cart;
  }
  function setQty(cart, key, qty, max) {
    const line = cart.find((l) => lineKey(l) === key);
    if (!line) return cart;
    const q = clamp(qty, max === undefined ? 99 : Math.floor((max - usedBy(cart, line.id, line)) / (line.units || 1)));
    return q ? cart.map((l) => (l === line ? { ...l, qty: q } : l)) : cart.filter((l) => l !== line);
  }
  const inCart = (cart, id) => usedBy(cart, id, null);

  function totals(cart, method) {
    const subtotal = round(cart.reduce((s, l) => s + l.price * l.qty, 0));
    const weighed = round(cart.filter((l) => l.weighed).reduce((s, l) => s + l.price * l.qty, 0));
    const goods = round(cart.filter((l) => !l.digital).reduce((s, l) => s + l.price * l.qty, 0)); // gift cards don't count toward free delivery
    const count = cart.reduce((s, l) => s + l.qty, 0);
    const f = FEES[method] || FEES.courier;
    const fee = goods === 0 || goods >= f.freeAt ? 0 : f.fee;
    return { subtotal, goods, count, fee, total: round(subtotal + fee), max: round(subtotal + weighed * VARIANCE + fee), freeAt: f.freeAt, toFree: round(Math.max(0, f.freeAt - goods)) };
  }

  // ---- box ----
  function boxQuote(items, freq) {
    const list = round(items.reduce((s, it) => s + unitPrice(it, defaultCfg(it)), 0));
    const discount = Number(freq) > 0 ? BOX_OFF : 0;
    const price = round(list * (1 - discount));
    return { list, discount, price, saved: round(list - price) };
  }
  const isSubscription = (l) => l.id === 'box' && Number(l.freq) > 0;

  // ---- delivery ----
  // 3-digit ZIP prefixes by state (USPS). Prefixes not listed, or in UNUSED, are not valid delivery ZIPs.
  const ZIP_STATES = [[5, 5, 'NY'], [10, 27, 'MA'], [28, 29, 'RI'], [30, 38, 'NH'], [39, 49, 'ME'], [50, 54, 'VT'], [55, 55, 'MA'], [56, 59, 'VT'],
    [60, 69, 'CT'], [70, 89, 'NJ'], [100, 149, 'NY'], [150, 196, 'PA'], [197, 199, 'DE'], [200, 200, 'DC'], [201, 201, 'VA'], [202, 205, 'DC'],
    [206, 219, 'MD'], [220, 246, 'VA'], [247, 268, 'WV'], [270, 289, 'NC'], [290, 299, 'SC'], [300, 319, 'GA'], [320, 349, 'FL'],
    [350, 369, 'AL'], [370, 385, 'TN'], [386, 397, 'MS'], [398, 399, 'GA'], [400, 427, 'KY'], [430, 459, 'OH'], [460, 479, 'IN'],
    [480, 499, 'MI'], [500, 528, 'IA'], [530, 549, 'WI'], [550, 567, 'MN'], [569, 569, 'DC'], [570, 577, 'SD'], [580, 588, 'ND'],
    [590, 599, 'MT'], [600, 629, 'IL'], [630, 658, 'MO'], [660, 679, 'KS'], [680, 693, 'NE'], [700, 714, 'LA'], [716, 729, 'AR'],
    [730, 732, 'OK'], [733, 733, 'TX'], [734, 749, 'OK'], [750, 799, 'TX'], [800, 816, 'CO'], [820, 831, 'WY'], [832, 838, 'ID'],
    [840, 847, 'UT'], [850, 865, 'AZ'], [870, 884, 'NM'], [885, 885, 'TX'], [889, 898, 'NV'], [900, 961, 'CA'], [970, 979, 'OR'], [980, 994, 'WA']];
  const UNUSED = new Set([213, 269, 343, 345, 348, 353, 419, 428, 429, 517, 518, 519, 529, 533, 536, 552, 568, 578, 579, 589, 621, 632, 642, 643, 659, 663, 682, 694, 695, 696, 697, 698, 699, 715, 742, 771, 817, 818, 819, 839, 848, 849, 854, 858, 861, 862, 866, 867, 868, 869, 876, 886, 887, 888, 892, 896, 899, 909, 929, 987]);
  const zipState = (zip) => { const p3 = Math.floor(Number(zip) / 100); return UNUSED.has(p3) ? null : (ZIP_STATES.find(([a, b]) => p3 >= a && p3 <= b) || [])[2] || null; };
  function classifyZip(raw) {
    const zip = String(raw || '').trim();
    if (!/^\d{5}$/.test(zip)) return { kind: 'invalid' };
    const n = Number(zip), p3 = Math.floor(n / 100);
    if (n === 96799) return { kind: 'no', area: 'American Samoa' };
    if (p3 >= 995) return { kind: 'no', area: 'Alaska' };
    if (p3 === 967 || p3 === 968) return { kind: 'no', area: 'Hawaii' };
    if (p3 >= 6 && p3 <= 9) return { kind: 'no', area: 'Puerto Rico and the US Virgin Islands' };
    if (p3 === 969) return { kind: 'no', area: 'Guam and the Northern Mariana Islands' };
    if ((p3 >= 90 && p3 <= 98) || p3 === 340 || (p3 >= 962 && p3 <= 966)) return { kind: 'no', area: 'military addresses' };
    if (p3 === 112) return n >= 11201 && n <= 11256 ? { kind: 'courier', area: 'Brooklyn', state: 'NY' } : { kind: 'invalid' };
    if (p3 >= 100 && p3 <= 102) return n >= 10001 && n <= 10286 ? { kind: 'courier', area: 'Manhattan', state: 'NY' } : { kind: 'invalid' };
    // Queens is 11004–11005 and 111, 113, 114, 116; the rest of 110 and all of 115 are Nassau County
    const nyc = p3 === 103 ? 'Staten Island' : p3 === 104 ? 'the Bronx' : n === 11004 || n === 11005 || [111, 113, 114, 116].includes(p3) ? 'Queens' : null;
    const state = zipState(zip);
    if (!state) return { kind: 'invalid' };
    return nyc ? { kind: 'overnight', area: nyc, nyc: true, state } : { kind: 'overnight', state };
  }

  const dayIdx = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const etFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
  function etParts(date) {
    const p = Object.fromEntries(etFmt.formatToParts(date).map((x) => [x.type, x.value]));
    return { wd: dayIdx[p.weekday], h: Number(p.hour), m: Number(p.minute) };
  }
  const mins = (t) => t.h * 60 + t.m;
  function nextCourier(t) {
    for (let d = 0; d < 8; d++) if (COURIER_DAYS.includes((t.wd + d) % 7) && (d > 0 || mins(t) < COURIER_CUTOFF)) return d;
    return -1;
  }
  function nextShip(t) {
    for (let d = 0; d < 8; d++) if (SHIP_DAYS.includes((t.wd + d) % 7) && (d > 0 || mins(t) < SHIP_CUTOFF)) return { ship: d, arrive: d + 1 };
    return null;
  }
  function nextPickup(t) {
    for (let d = 0; d < 8; d++) {
      const h = HOURS[(t.wd + d) % 7];
      if (!h) continue;
      const start = d === 0 ? Math.max(mins(t), h[0] * 60) : h[0] * 60;
      const ready = Math.ceil((start + 120) / 15) * 15;
      if (ready < h[1] * 60) return { day: d, minutes: ready }; // must be ready before closing
    }
    return null;
  }

  // Calendar arithmetic on the Eastern date, so DST changes can't shift the weekday
  const etYMD = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric' });
  function etDateLabel(date, days) {
    const p = Object.fromEntries(etYMD.formatToParts(date).map((x) => [x.type, x.value]));
    return new Date(Date.UTC(+p.year, +p.month - 1, +p.day + days, 12)).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
  }
  const isCourierDay = (wd) => COURIER_DAYS.includes(wd);
  const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const clockText = (min) => { const h = Math.floor(min / 60) % 24, m = min % 60; return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`; };

  // ---- the shop's week ----
  // Eastern wall clock as a day number plus minutes. "How long ago" uses wall-clock minutes, so it can be
  // an hour off across a DST change; nothing here bills or schedules by it.
  function etWall(date) {
    const p = Object.fromEntries(etYMD.formatToParts(date).map((x) => [x.type, x.value]));
    const t = etParts(date);
    return { day: Date.UTC(+p.year, +p.month - 1, +p.day) / 864e5, wd: t.wd, min: mins(t) };
  }
  const wdOf = (day) => (((day + 4) % 7) + 7) % 7; // day 0, 1 Jan 1970, was a Thursday
  // Animals are cut on Monday. The week's board is final once Monday's last change (`turn`) is done;
  // before that, the board still shows the week before.
  function weekClock(date, turn) {
    const now = etWall(date);
    let monday = now.day - ((now.wd + 6) % 7);
    if (now.wd === 1 && now.min < turn) monday -= 7;
    return { now, monday, at: (dayOff, min) => ({ day: monday + dayOff, min }), ago: (e) => (now.day - e.day) * 1440 + now.min - e.min };
  }
  // "today, 12:15 PM", "yesterday, 2:10 PM", "Mon 5:30 PM", "last Mon 5:30 PM"
  function whenText(c, e) {
    const d = c.now.day - e.day;
    return `${d === 0 ? 'today,' : d === 1 ? 'yesterday,' : (d < 7 ? '' : 'last ') + SHORT[wdOf(e.day)]} ${clockText(e.min)}`;
  }
  const agoText = (c, e) => { const m = c.ago(e); return m < 2 ? 'just now' : m < 60 ? `${m} min ago` : m < 180 ? `${Math.floor(m / 60)} hr ago` : whenText(c, e); };
  // the board is rewritten before opening on every open day; on Monday the last change is `turn`
  function lastUpdate(c, rechalk, turn) {
    for (let d = c.now.day; d > c.monday; d--) if (HOURS[wdOf(d)] && (d < c.now.day || c.now.min >= rechalk)) return { day: d, min: rechalk };
    return { day: c.monday, min: turn };
  }
  const dateText = (day) => { const x = new Date(day * 864e5); return `${SHORT[wdOf(day)]} ${x.getUTCMonth() + 1}/${x.getUTCDate()}`; };
  // the sign on the door
  function openSign(t) {
    const h = HOURS[t.wd], m = mins(t);
    if (h && m >= h[0] * 60 && m < h[1] * 60) return { open: true, until: h[1] * 60 };
    for (let d = 0; d < 8; d++) { const x = HOURS[(t.wd + d) % 7]; if (x && (d > 0 || m < x[0] * 60)) return { open: false, day: d, at: x[0] * 60 }; }
    return null;
  }
  // Boxes are cut on Wednesdays; orders and changes close Sunday 11:59 PM ET for that week's box.
  const firstBoxCut = (t) => (t.wd >= 1 && t.wd <= 3 ? 10 - t.wd : (3 - t.wd + 7) % 7);

  const api = { clockText, etWall, weekClock, whenText, agoText, lastUpdate, dateText, openSign, sign, unitsOf, zipState, etDateLabel, isCourierDay, firstBoxCut, FEES, VARIANCE, BOX_OFF, HOURS, round, money, defaultCfg, weightOf, unitPrice, optionLabel, lineKey, addLine, setQty, inCart, totals, boxQuote, isSubscription, classifyZip, etParts, nextCourier, nextShip, nextPickup };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EYM_STORE = api;
})(this);
