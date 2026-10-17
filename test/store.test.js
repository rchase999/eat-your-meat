// node test/store.test.js
const assert = require('node:assert/strict');
const S = require('../js/store.js');
const D = require('../js/data.js');
const item = (id) => D.items.find((i) => i.id === id);

// ---- money: always cents, thousands separators ----
assert.equal(S.money(119), '$119.00');
assert.equal(S.money(1204.5), '$1,204.50');

// ---- weight and price by the pound ----
const ribeye = item('ribeye');
assert.equal(S.weightOf(ribeye, S.defaultCfg(ribeye)), 1, 'default thickness 1¼″ ≈ 1 lb');
assert.equal(S.unitPrice(ribeye, S.defaultCfg(ribeye)), 38);
assert.equal(S.unitPrice(ribeye, { opts: [2] }), 45.6, '1½″ ≈ 1.2 lb × $38');
assert.equal(S.unitPrice(item('hanger'), S.defaultCfg(item('hanger'))), 22, 'fixed-weight item');
assert.equal(S.unitPrice(item('beef-stock'), {}), 12, 'priced per piece');
assert.equal(S.weightOf(item('beef-stock'), {}), null);
assert.equal(S.unitPrice(item('pork-belly'), { opts: [1] }), 23, 'non-weight option keeps the weight (2 lb × $11.50)');
assert.throws(() => S.unitPrice(ribeye, { opts: [9] }), /option/);
assert.equal(S.optionLabel(ribeye, { opts: [0] }), '1″');

// ---- cart lines: merge, stock cap, notes kept apart ----
const line = (id, opts, qty = 1, note = '') => ({ id, opts, qty, note, weighed: item(id).unit === 'lb', price: S.unitPrice(item(id), { opts }) });
let cart = S.addLine([], line('ribeye', [1]), 6);
cart = S.addLine(cart, line('ribeye', [1], 9), 6);
assert.equal(cart.length, 1); assert.equal(cart[0].qty, 6, 'capped at stock');
assert.equal(S.addLine(cart, line('ribeye', [1], 1, 'extra thick please'), 6).length, 1, 'no room left: stock is shared across lines');
cart = S.addLine(S.addLine([], line('ribeye', [1], 2), 6), line('ribeye', [1], 1, 'extra thick please'), 6);
assert.equal(cart.length, 2, 'a butcher note makes a separate line');
assert.equal(S.inCart(cart, 'ribeye'), 3);
cart = S.setQty(cart, S.lineKey(cart[0]), 9, 6);
assert.equal(cart[0].qty, 5, 'setQty respects stock minus other lines');
cart = S.setQty(cart, S.lineKey(cart[1]), 0);
assert.equal(cart.length, 1);

// ---- totals: fee thresholds, weight-variance cap ----
let t = S.totals([line('ribeye', [1], 2)], 'courier');
assert.deepEqual([t.subtotal, t.fee, t.total], [76, 8, 84]);
t = S.totals([line('ribeye', [1], 3)], 'courier');
assert.equal(t.fee, 0, 'free courier at $100+');
t = S.totals([line('ribeye', [1], 3)], 'overnight');
assert.equal(t.fee, 19);
assert.equal(S.totals([line('ribeye', [1], 6)], 'overnight').fee, 0, 'free overnight at $200+');
t = S.totals([line('ribeye', [1], 1), { id: 'beef-stock', opts: [], qty: 1, note: '', price: 12 }], 'pickup');
assert.equal(t.fee, 0);
assert.equal(t.max, 53.8, 'cap: +10% on weighed items only');
assert.equal(S.totals([], 'courier').total, 0);
t = S.totals([line('ribeye', [1], 1), { id: 'gift', qty: 1, digital: true, price: 100 }], 'courier');
assert.equal(t.fee, 8, 'a gift card does not unlock free delivery');
assert.equal(S.totals([{ id: 'gift', qty: 1, digital: true, price: 50 }], 'email').fee, 0);

// ---- box ----
const picks = D.box.picks[6].ids.map(item);
const once = S.boxQuote(picks, 0), sub = S.boxQuote(picks, 4);
assert.equal(once.discount, 0); assert.equal(sub.discount, 0.1);
assert.equal(sub.price, S.round(once.list * 0.9));
assert.equal(S.isSubscription({ id: 'box', freq: 4 }), true);
assert.equal(S.isSubscription({ id: 'box', freq: 0 }), false);

// ---- ZIP classification ----
assert.equal(S.classifyZip('11211').kind, 'courier');
assert.equal(S.classifyZip('10013').kind, 'courier');
assert.equal(S.classifyZip('10301').kind, 'overnight', 'Staten Island is not a courier zone');
assert.equal(S.classifyZip('94110').kind, 'overnight');
assert.equal(S.classifyZip('99501').kind, 'no', 'Alaska');
assert.equal(S.classifyZip('96813').kind, 'no', 'Hawaii');
assert.equal(S.classifyZip('00901').kind, 'no', 'Puerto Rico');
assert.equal(S.classifyZip('asdfgh').kind, 'invalid');
assert.equal(S.classifyZip('1121').kind, 'invalid');
assert.equal(S.classifyZip('00012').kind, 'invalid');

// ---- schedules, Eastern time ----
const at = (iso) => S.etParts(new Date(iso));
const fri10 = at('2026-10-16T14:00:00Z'); // Fri 10:00 AM EDT
assert.deepEqual([fri10.wd, fri10.h, fri10.m], [5, 10, 0]);
assert.equal(S.nextCourier(fri10), 0, 'courier tonight');
assert.equal(S.nextCourier(at('2026-10-16T19:30:00Z')), 1, 'Fri 3:30 PM → Saturday');
assert.equal(S.nextCourier(at('2026-10-18T19:00:00Z')), 2, 'Sun 3 PM → Tuesday (no Monday courier)');
assert.deepEqual(S.nextShip(at('2026-10-19T14:00:00Z')), { ship: 0, arrive: 1 }, 'Mon 10 AM ships today');
assert.deepEqual(S.nextShip(at('2026-10-21T17:00:00Z')), { ship: 5, arrive: 6 }, 'Wed 1 PM → next Monday');
assert.deepEqual(S.nextShip(fri10), { ship: 3, arrive: 4 }, 'Fri → Monday');
assert.deepEqual(S.nextPickup(fri10), { day: 0, minutes: 12 * 60 }, 'ready 2 hours later');
assert.deepEqual(S.nextPickup(at('2026-10-17T22:30:00Z')), { day: 1, minutes: 12 * 60 }, 'Sat 6:30 PM → Sun noon (opens 10, +2 h)');
assert.deepEqual(S.nextPickup(at('2026-10-19T14:00:00Z')), { day: 1, minutes: 11 * 60 }, 'Monday closed → Tue 11 AM');

assert.deepEqual(S.nextPickup(at('2026-10-18T19:00:00Z')), { day: 2, minutes: 11 * 60 }, 'Sun 3 PM: ready at 5 PM closing is too late → Tue 11 AM');
assert.equal(S.isCourierDay(1), false, 'no courier on Monday');
assert.equal(S.isCourierDay(2), true);
// first box: cut the Wednesday after the next Sunday 11:59 PM cutoff
assert.equal(S.firstBoxCut(fri10), 5, 'Fri → next Wednesday');
assert.equal(S.firstBoxCut(at('2026-10-18T19:00:00Z')), 3, 'Sun → this coming Wednesday');
assert.equal(S.firstBoxCut(at('2026-10-19T14:00:00Z')), 9, 'Mon → Wednesday of next week (cutoff passed)');
assert.equal(S.firstBoxCut(at('2026-10-21T14:00:00Z')), 7, 'Wed → next Wednesday');

// box dates use Eastern calendar days, not 24-hour blocks (DST weeks)
const thu = new Date('2026-10-29T04:30:00Z'); // Thu 29 Oct, 00:30 ET; clocks change Sun 1 Nov
assert.equal(S.etDateLabel(thu, S.firstBoxCut(S.etParts(thu))), 'Wednesday, November 4');
const wedNight = new Date('2027-03-11T04:30:00Z'); // Wed 10 Mar 2027, 23:30 ET; clocks change Sun 14 Mar
assert.equal(S.etDateLabel(wedNight, S.firstBoxCut(S.etParts(wedNight))), 'Wednesday, March 17');
assert.equal(S.etDateLabel(new Date('2026-10-16T14:00:00Z'), 0), 'Friday, October 16');

// ---- second audit ----
assert.equal(S.sign(34), '$34'); assert.equal(S.sign(6.5), '$6.50'); assert.equal(S.sign(1200), '$1,200');
const shoulder = { id: 'sh', name: 'Pork shoulder', unit: 'lb', price: 8, stock: 3, options: [{ label: 'Size', choices: [{ label: 'Half', lb: 4, default: true }, { label: 'Whole', lb: 8, units: 2 }] }] };
assert.equal(S.unitsOf(shoulder, { opts: [1] }), 2);
let c2 = S.addLine([], { id: 'sh', opts: [1], units: 2, qty: 3, price: 64 }, 3);
assert.equal(c2[0].qty, 1, 'only one whole shoulder fits in 3 halves');
c2 = S.addLine(c2, { id: 'sh', opts: [0], units: 1, qty: 5, price: 32 }, 3);
assert.equal(S.inCart(c2, 'sh'), 3, 'whole (2) + one half (1) = all 3 halves');
const chick = { name: 'Whole chicken', options: [{ choices: [{ label: 'Whole', default: true }, { label: 'Cut in 8' }] }] };
assert.equal(S.optionLabel(chick, { opts: [0] }), '');
assert.equal(S.optionLabel(chick, { opts: [1] }), 'Cut in 8');
assert.equal(S.classifyZip('96799').area, 'American Samoa');
assert.equal(S.classifyZip('10000').kind, 'invalid'); assert.equal(S.classifyZip('10287').kind, 'invalid'); assert.equal(S.classifyZip('10286').kind, 'courier', 'Manhattan runs to 10286');
assert.equal(S.classifyZip('11101').area, 'Queens'); assert.equal(S.classifyZip('11101').nyc, true);
assert.equal(S.classifyZip('10451').area, 'the Bronx');
assert.equal(S.classifyZip('94110').state, 'CA'); assert.equal(S.classifyZip('20001').state, 'DC'); assert.equal(S.classifyZip('07030').state, 'NJ');
assert.equal(S.classifyZip('21300').kind, 'invalid', 'unused prefix');
assert.equal(S.zipState('11211'), 'NY');
assert.equal(S.totals([{ id: 'r', qty: 1, price: 38, weighed: true }, { id: 'gift', qty: 1, digital: true, price: 100 }], 'courier').goods, 38);

assert.equal(S.classifyZip('11299').kind, 'invalid'); assert.equal(S.classifyZip('11200').kind, 'invalid'); assert.equal(S.classifyZip('11256').kind, 'courier');

// ---- fourth audit: Nassau County is not Queens ----
for (const z of ['11550', '11501', '11021', '11050']) { const c = S.classifyZip(z); assert.equal(c.kind, 'overnight', z); assert.equal(c.nyc, undefined, z + ' is Nassau'); assert.equal(c.state, 'NY'); }
for (const z of ['11004', '11101', '11368', '11432', '11691']) assert.equal(S.classifyZip(z).area, 'Queens', z);

// ---- third audit: the week is anchored to now ----
const TURN = 17 * 60 + 30; // Monday 5:30 PM
const sat = new Date('2026-10-17T19:00:00Z'); // Sat 17 Oct, 3 PM EDT
let wc = S.weekClock(sat, TURN);
assert.equal(S.dateText(wc.monday), 'Mon 10/12', 'the week started on Monday the 12th');
assert.equal(S.whenText(wc, wc.at(0, 12 * 60 + 15)), 'Mon 12:15 PM');
assert.deepEqual(S.lastUpdate(wc, 8 * 60 + 40, TURN), wc.at(5, 8 * 60 + 40), 'rewritten this morning');
assert.equal(S.agoText(wc, S.lastUpdate(wc, 8 * 60 + 40, TURN)), 'today, 8:40 AM');
assert.equal(S.agoText(S.weekClock(new Date('2026-10-17T13:20:00Z'), TURN), { day: wc.monday + 5, min: 8 * 60 + 40 }), '40 min ago');
const monAm = S.weekClock(new Date('2026-10-19T14:00:00Z'), TURN); // Mon 19 Oct, 10 AM: still last week's board
assert.equal(monAm.monday, wc.monday);
assert.equal(S.whenText(monAm, monAm.at(0, 12 * 60 + 15)), 'last Mon 12:15 PM');
assert.deepEqual(S.lastUpdate(monAm, 8 * 60 + 40, TURN), monAm.at(6, 8 * 60 + 40), 'closed Monday: last rewritten Sunday');
const monPm = S.weekClock(new Date('2026-10-19T22:00:00Z'), TURN); // Mon 6 PM: the new week
assert.equal(monPm.monday, wc.monday + 7);
assert.equal(S.whenText(monPm, monPm.at(0, 14 * 60 + 10)), 'today, 2:10 PM');
assert.equal(S.whenText(S.weekClock(new Date('2026-10-20T14:00:00Z'), TURN), { day: wc.monday + 7, min: 14 * 60 + 10 }), 'yesterday, 2:10 PM');
assert.deepEqual(S.openSign(S.etParts(sat)), { open: true, until: 19 * 60 });
assert.deepEqual(S.openSign(S.etParts(new Date('2026-10-18T00:00:00Z'))), { open: false, day: 1, at: 10 * 60 }, 'Sat 8 PM → Sun 10 AM');
assert.deepEqual(S.openSign(S.etParts(new Date('2026-10-19T16:00:00Z'))), { open: false, day: 1, at: 9 * 60 }, 'Mon noon → Tue 9 AM');
assert.deepEqual(S.openSign(S.etParts(new Date('2026-10-20T12:00:00Z'))), { open: false, day: 0, at: 9 * 60 }, 'Tue 8 AM → today 9 AM');
assert.equal(S.clockText(12 * 60 + 15), '12:15 PM'); assert.equal(S.clockText(9 * 60), '9 AM');

console.log('store.test.js: all assertions passed');
