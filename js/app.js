// Eat Your Meat — browser app. Vanilla, no build step at runtime.
(() => {
  'use strict';
  const D = window.EYM_DATA, S = window.EYM_STORE, R = window.EYM_RENDER;
  const root = document.body.dataset.root || '';
  const page = document.body.dataset.page;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = R.esc;
  const byId = Object.fromEntries(D.items.map((i) => [i.id, i]));
  const has = (id) => typeof id === 'string' && Object.hasOwn(byId, id);
  R.stampTimes(D, new Date());
  // static pages carry the build's times; bring them up to now
  const fillTimes = () => $$('[data-when]').forEach((el) => { const it = byId[el.dataset.id]; el.textContent = it ? it[el.dataset.when === 'sold' ? 'soldText' : 'soldStamp'] : D.clock[el.dataset.when]; });

  // ---------- storage (localStorage is untrusted: validate and re-price on load) ----------
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } };
  const validOpts = (it, opts) => Array.isArray(opts) && opts.length === (it.options || []).length && opts.every((o, i) => Number.isInteger(o) && it.options[i].choices[o]);
  const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  function validLine(l) {
    if (!l || typeof l !== 'object' || !Number.isInteger(l.qty) || l.qty < 1 || l.qty > 99) return false;
    if (l.id === 'box') return Array.isArray(l.picks) && [6, 10, 14].includes(l.size) && l.picks.length === l.size && l.picks.every((id) => has(id) && byId[id].box) && Object.hasOwn(D.box.freqs, l.freq);
    if (l.id === 'gift') return D.giftCards.includes(l.amount) && isEmail(l.to) && typeof (l.note ?? '') === 'string' && typeof (l.from ?? '') === 'string';
    return has(l.id) && byId[l.id].stock > 0 && validOpts(byId[l.id], l.opts) && typeof (l.note ?? '') === 'string';
  }
  // rebuild every stored line from an allowlist: flags and prices in storage are never trusted
  function reprice(l) {
    if (l.id === 'box') return { id: 'box', box: String(l.box || 'b'), picks: [...l.picks], size: l.size, freq: Number(l.freq), qty: 1, weighed: true, price: S.boxQuote(l.picks.map((id) => byId[id]), l.freq).price };
    if (l.id === 'gift') return { id: 'gift', box: String(l.box || 'g'), amount: l.amount, to: l.to, from: String(l.from || '').slice(0, 60), note: String(l.note || '').slice(0, 200), qty: 1, digital: true, price: l.amount };
    const it = byId[l.id];
    return { id: l.id, opts: [...l.opts], qty: l.qty, note: String(l.note || '').slice(0, 200), units: S.unitsOf(it, { opts: l.opts }), weighed: it.unit === 'lb', price: S.unitPrice(it, { opts: l.opts }) };
  }
  const boxReserved = (cart, id) => cart.filter((l) => l.id === 'box').reduce((s, l) => s + l.picks.filter((p) => p === id).length * l.qty, 0);
  const boxFits = (cart, picks) => picks.every((id) => byId[id].stock - S.inCart(cart, id) - boxReserved(cart, id) >= picks.filter((p) => p === id).length);
  const loadCart = () => {
    const raw = load('eym.cart', []);
    // re-add line by line so stock caps hold even for tampered data
    return (Array.isArray(raw) ? raw.filter(validLine).map(reprice) : []).reduce((cart, l) => (l.id === 'gift' ? [...cart, l] : l.id === 'box' ? (boxFits(cart, l.picks) ? [...cart, l] : cart) : S.addLine(cart, l, byId[l.id].stock - boxReserved(cart, l.id))), []);
  };
  const loadZip = () => { const z = load('eym.zip', ''); return S.classifyZip(z).kind === 'invalid' ? '' : z; };
  const loadTicket = () => { const n = load('eym.ticket', 0); return Number.isInteger(n) && n >= 10 && n <= 99 ? n : 10 + (Date.now() % 80); };
  const state = { cart: loadCart(), zip: loadZip(), method: load('eym.method', ''), ticket: loadTicket(), f: { species: '', primal: '', sort: '', view: 'chalk' }, box: { size: 6, freq: 4, mode: 'pick', own: [] } };
  save('eym.ticket', state.ticket); // the number you pulled stays the same on every page
  const persist = () => { save('eym.cart', state.cart); save('eym.zip', state.zip); save('eym.method', state.method); save('eym.ticket', state.ticket); };
  const reserved = (id) => S.inCart(state.cart, id) + boxReserved(state.cart, id);
  const available = (id) => Math.max(0, byId[id].stock - reserved(id));

  // ---------- time (all shop rules are Eastern) ----------
  const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = () => S.etParts(new Date());
  const dayLabel = (t, d) => (d === 0 ? 'today' : d === 1 ? 'tomorrow' : WEEK[(t.wd + d) % 7]);
  const clock = S.clockText;
  function courierText(t = now()) {
    const d = S.nextCourier(t);
    if (d === 0) return 'Order by 2 PM for delivery tonight, 5–⁠9 PM.';
    if (!S.isCourierDay(t.wd)) return `No courier on ${WEEK[t.wd]}s. Next: ${dayLabel(t, d)}, 5–⁠9 PM.`;
    return `Today’s 2 PM cutoff has passed. Next courier: ${dayLabel(t, d)}, 5–⁠9 PM.`;
  }
  function shipText(t = now()) {
    const { ship, arrive } = S.nextShip(t);
    return ship === 0 ? 'Order by noon and it ships today, arriving tomorrow.' : `Orders placed now ship ${dayLabel(t, ship)} and arrive ${dayLabel(t, arrive)}.`;
  }
  function pickupText(t = now()) {
    const p = S.nextPickup(t);
    return `Ready ${dayLabel(t, p.day)} from ${clock(p.minutes)}.`;
  }
  const etDate = (days) => S.etDateLabel(new Date(), days);
  const scheduleFor = (method) => ({ courier: courierText, overnight: shipText, pickup: pickupText }[method] || (() => ''))();

  // ---------- toast ----------
  let toastTimer;
  function toast(msg, action) {
    const el = $('[data-toast]');
    el.innerHTML = `<span>${msg}</span>${action ? `<button type="button" data-toast-action>${esc(action.label)}</button>` : ''}`;
    if (action) $('[data-toast-action]', el).addEventListener('click', () => { el.classList.remove('is-on'); action.run(); });
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 4500);
  }

  // ---------- dialogs ----------
  const dlg = (name) => $(`[data-dialog="${name}"]`);
  function openDialog(name) {
    const d = dlg(name);
    if (!d || d.open) return d;
    $$('dialog[open]').forEach((o) => o.close());
    d.showModal();
    return d;
  }
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) { d.close(); return; }
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
    });
  });
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (!o) return;
    e.preventDefault();
    if (o.dataset.open === 'search') openSearch();
    else if (o.dataset.open === 'cart') { renderCart(); openDialog('cart'); }
    else openDialog(o.dataset.open);
  });

  // ---------- header ----------
  const showTicketNo = () => $$('[data-ticket-no]').forEach((el) => (el.textContent = state.ticket));
  showTicketNo();
  // the door sign and the header status follow the shop's hours in Eastern time
  function hoursText(t = now()) {
    const o = S.openSign(t);
    return o.open ? { open: true, text: `till ${clock(o.until)}` } : { open: false, text: `back ${dayLabel(t, o.day)} ${clock(o.at)}` };
  }
  function paintSign() {
    const h = hoursText();
    $$('[data-status]').forEach((el) => (el.innerHTML = `<b class="${h.open ? 'is-open' : 'is-closed'}">${h.open ? 'Open' : 'Closed'}</b> ${esc(h.text)}<span class="logo__where"> · ${esc(D.shop.street)}</span>`));
    $$('[data-sign]').forEach((el) => { el.classList.toggle('is-closed', !h.open); el.innerHTML = `<b>${h.open ? 'Open' : 'Closed'}</b><small>${esc(h.text)}</small>`; });
  }
  paintSign();
  // a tab left open keeps the right time: the sign, "updated …" and the cutoffs
  setInterval(() => {
    R.stampTimes(D, new Date());
    paintSign(); fillTimes();
    const upd = $('.chalk__upd');
    if (upd) upd.textContent = `updated ${D.clock.updated}`;
    if (page === 'home') {
      paintHomeTimes();
      const sig = JSON.stringify(D.items.filter((i) => i.soldOut).map((i) => i.soldText));
      if (sig !== boardSig && !$('[data-board]').contains(document.activeElement)) renderBoard();
    }
  }, 60000);
  $$('[data-sample-ok]').forEach((b) => b.addEventListener('click', () => { save('eym.sample', 1); document.documentElement.classList.add('sample-ok'); }));
  const slip = $('.sample'), slipHeight = () => slip && document.documentElement.style.setProperty('--slip-h', `${slip.offsetHeight}px`);
  slipHeight(); addEventListener('resize', slipHeight);
  fillTimes();
  function updateBadge(bump) {
    const n = state.cart.reduce((s, l) => s + l.qty, 0);
    $$('[data-cart-count]').forEach((b) => {
      b.textContent = n;
      b.classList.toggle('has-items', n > 0);
      const u = b.parentElement.querySelector('[data-cart-unit]');
      if (u) u.textContent = n === 1 ? ' item' : ' items';
      if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } // reflow restarts the animation
    });
  }

  // ---------- cart ----------
  function addItem(id, opts, qty = 1, note = '') {
    const it = byId[id];
    const before = S.inCart(state.cart, id);
    const line = { id, opts, qty, note: note.slice(0, 200), units: S.unitsOf(it, { opts }), weighed: it.unit === 'lb', price: S.unitPrice(it, { opts }) };
    state.cart = S.addLine(state.cart, line, it.stock - boxReserved(state.cart, id));
    const added = (S.inCart(state.cart, id) - before) / S.unitsOf(it, { opts });
    afterCartChange(true);
    if (!added) { toast(`That’s all the ${esc(it.short.toLowerCase())} we have this week, and it’s on your ticket.`, { label: 'View ticket', run: showCart }); return 0; }
    const ot = S.optionLabel(it, { opts });
    const opt = ot && (it.options || []).some((o) => o.choices.length > 1) ? `, ${esc(ot)}` : '';
    lastAdded = S.lineKey(line);
    toast(`<b>${added > 1 ? added + ' × ' : ''}${esc(it.name)}</b>${opt}<br>${R.weightText(it, { opts })} · ${S.money(S.round(line.price * added))}${added < qty ? ` (only ${added} left)` : ''}`, { label: 'View ticket', run: showCart });
    return added;
  }
  let lastAdded = '';
  function showCart() { renderCart(); openDialog('cart'); }
  function afterCartChange(bump) {
    persist(); updateBadge(bump);
    if (page === 'home') { renderBoard(); renderBox(); renderCutmapCounts(); renderTicketCard(); }
    if (page === 'product') hydratePdpStock();
  }
  const physical = () => state.cart.some((l) => !l.digital);
  function methodsFor(zip) {
    const k = S.classifyZip(zip).kind;
    return k === 'courier' ? ['courier', 'pickup'] : k === 'overnight' ? ['overnight', 'pickup'] : ['pickup'];
  }
  function currentMethod() {
    if (!physical()) return 'email';
    const ok = methodsFor(state.zip);
    if (!ok.includes(state.method)) state.method = ok[0];
    return state.method;
  }
  const own = (map, k) => (Object.hasOwn(map, k) ? map[k] : '');
  const METHOD_LABEL = { courier: 'Same-evening courier', overnight: 'Overnight shipping', pickup: 'Pickup at the shop', email: 'Email' };
  function lineView(l) {
    if (l.id === 'box') return { name: `Butcher’s Box, ${l.size} cuts`, meta: `${D.box.freqs[l.freq]} · ${l.picks.map((p) => byId[p].short).join(', ')}`, thumb: null, short: 'Box' };
    if (l.id === 'gift') return { name: `Gift card, ${S.sign(l.amount)}`, meta: `From ${l.from} to ${l.to}`, thumb: null, short: 'Gift card' };
    const it = byId[l.id];
    const ot = S.optionLabel(it, { opts: l.opts });
    const opt = ot && (it.options || []).some((o) => o.choices.length > 1) ? ot + ' · ' : '';
    return { name: it.name, meta: `${opt}${R.weightText(it, { opts: l.opts })} @ ${R.perUnit(it)}${l.note ? ' · Note: ' + l.note : ''}`, short: it.short };
  }
  function renderCart() {
    const body = $('[data-cart-body]'), foot = $('[data-cart-foot]');
    if (!state.cart.length) {
      body.innerHTML = `<div class="cart-empty"><p class="rcpt__no">Ticket ${state.ticket}</p><h3>Nothing on it yet.</h3><p>Everything on the board is from this week’s animals, priced by the pound.</p><a class="btn btn--ink" href="${root}index.html#board" data-close>See the board</a></div>`;
      foot.innerHTML = '';
      return;
    }
    const t0 = now();
    body.innerHTML = `<p class="rcpt__head">Eat Your Meat<br>${esc(D.shop.street)}<br>Ticket ${state.ticket} · ${WEEK[t0.wd].slice(0, 3)} ${esc(S.dateText(S.etWall(new Date()).day).split(' ')[1])}<br>Counter: ${esc(D.shop.counter.name)}</p>` + state.cart.map((l) => {
      const v = lineView(l), key = esc(S.lineKey(l));
      const max = l.id === 'box' || l.id === 'gift' ? 1 : l.qty + Math.floor(available(l.id) / (l.units || 1));
      const stepper = max > 1 || l.qty > 1
        ? `<div class="stepper"><button type="button" data-qty="${key}" data-d="-1" aria-label="One fewer ${esc(v.name)}" ${l.qty <= 1 ? 'disabled' : ''}>−</button><output aria-live="polite">${l.qty}</output><button type="button" data-qty="${key}" data-d="1" aria-label="One more ${esc(v.name)}" ${l.qty >= max ? 'disabled' : ''}>+</button></div>`
        : '<span></span>';
      return `<div class="cline${S.lineKey(l) === lastAdded ? ' is-new' : ''}">
        <div><p class="cline__top"><span>${l.qty > 1 ? l.qty + ' × ' : ''}${esc(v.name)}</span><span>${l.weighed ? '≈ ' : ''}${S.money(S.round(l.price * l.qty))}</span></p>
        <p class="cline__meta">${esc(v.meta)}</p>
        <div class="cline__row">${stepper}<button type="button" class="cline__remove" data-remove="${key}">Remove</button></div></div></div>`;
    }).join('');
    const method = currentMethod(), t = S.totals(state.cart, method);
    const zc = S.classifyZip(state.zip);
    const zipMsg = !state.zip ? 'Add your ZIP code to see delivery options. You can also pick up at the shop.'
      : zc.kind === 'courier' ? `${esc(zc.area)}: same-evening courier or pickup.`
        : zc.kind === 'overnight' ? (zc.nyc ? `We don’t courier to ${esc(zc.area)} yet. Pick it up at Kent Ave, or we ship it overnight.` : 'Overnight shipping or pickup.')
          : zc.kind === 'no' ? `We can’t deliver to ${esc(zc.area)}.` : /^\d{5}$/.test(state.zip) ? 'We don’t recognize that ZIP code.' : 'Enter a 5-digit US ZIP code.';
    const methods = physical() ? `<details class="method" ${!state.zip || state.methodOpen ? 'open' : ''}><summary>Delivery: ${METHOD_LABEL[method]}${state.zip ? ` · ${esc(state.zip)}` : ''}</summary>
        <form class="method__zip" data-cart-zip novalidate><label class="field">ZIP code<input name="zip" inputmode="numeric" maxlength="5" autocomplete="postal-code" value="${esc(state.zip)}"></label><button class="btn btn--line" type="submit">Update</button></form>
        <p class="method__msg ${zc.kind === 'no' || (state.zip && zc.kind === 'invalid') ? 'is-no' : ''}" aria-live="polite">${zipMsg}</p>
        <fieldset class="opt"><legend>Delivery</legend><div class="opt__row opt__row--2">${methodsFor(state.zip).map((m) => {
          const f = S.FEES[m];
          return `<label><input type="radio" name="method" value="${m}" ${m === method ? 'checked' : ''}><span>${METHOD_LABEL[m]}<small>${esc(scheduleFor(m))} ${f.fee ? `${S.sign(f.fee)}, free on ${S.sign(f.freeAt)} of meat or more.` : 'Free.'}</small></span></label>`;
        }).join('')}</div></fieldset></details>` : `<p class="fine">Gift cards are sent by email.</p>`;
    const subs = state.cart.some(S.isSubscription);
    foot.innerHTML = `${methods}
      <dl class="sum"><div><dt>Subtotal (estimate)</dt><dd>${S.money(t.subtotal)}</dd></div>
      <div><dt>${METHOD_LABEL[method]}</dt><dd>${t.fee ? S.money(t.fee) : 'Free'}</dd></div>
      <div class="is-total"><dt>Estimated total</dt><dd>${S.money(t.total)}</dd></div>
      ${state.cart.some((l) => l.weighed) ? `<div><dt>At most, once it’s weighed</dt><dd>${S.money(t.max)}</dd></div>` : ''}</dl>
      ${t.fee && t.goods ? `<p class="fine">Add ${S.money(t.toFree)} of meat for free delivery. Gift cards don’t count.</p>` : ''}
      ${subs ? `<p class="fine">Includes a Butcher’s Box subscription. You’ll see the renewal terms and agree to them at checkout.</p>` : ''}
      <button class="btn btn--red" type="button" data-checkout>Check out</button>`;
  }
  function rerenderCart(focus) {
    const box = dlg('cart'), hadFocus = box.contains(document.activeElement);
    renderCart();
    if (!hadFocus) return;
    const el = focus.qty ? $$('[data-qty]', box).find((b) => b.dataset.qty === focus.qty && b.dataset.d === focus.d && !b.disabled) || $$('[data-qty]', box).find((b) => b.dataset.qty === focus.qty && !b.disabled)
      : focus.method ? $('.method > summary', box) : focus.zip ? ($('.method', box)?.open ? $('[data-cart-zip] input', box) : $('.method > summary', box)) : null;
    (el || $('[data-remove], [data-checkout], .cart-empty a, [data-close]', box)).focus();
  }
  const cartDlg = dlg('cart');
  cartDlg.addEventListener('click', (e) => {
    const q = e.target.closest('[data-qty]'), r = e.target.closest('[data-remove]');
    if (q) {
      const line = state.cart.find((l) => S.lineKey(l) === q.dataset.qty);
      if (line) state.cart = S.setQty(state.cart, q.dataset.qty, line.qty + Number(q.dataset.d), line.id === 'box' || line.id === 'gift' ? 1 : byId[line.id].stock - boxReserved(state.cart, line.id));
    }
    if (r) state.cart = state.cart.filter((l) => S.lineKey(l) !== r.dataset.remove);
    if (q || r) { afterCartChange(false); rerenderCart(q ? { qty: q.dataset.qty, d: q.dataset.d } : {}); }
    if (e.target.closest('[data-checkout]')) openCheckout();
  });
  cartDlg.addEventListener('change', (e) => { if (e.target.name === 'method') { state.method = e.target.value; state.methodOpen = false; persist(); rerenderCart({ method: e.target.value }); } });
  cartDlg.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-cart-zip]')) return;
    e.preventDefault();
    state.zip = String(new FormData(e.target).get('zip')).trim().slice(0, 5);
    state.method = ''; state.methodOpen = ((z) => z.nyc || !['courier', 'overnight'].includes(z.kind))(S.classifyZip(state.zip)); // a deliverable ZIP picks the method, so fold the panel
    persist(); rerenderCart({ zip: true });
  });

  // ---------- checkout ----------
  const STATES = ['AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
  function openCheckout() {
    if (!state.cart.length) return;
    const method = currentMethod(), t = S.totals(state.cart, method), ships = method === 'courier' || method === 'overnight', needsPhone = physical();
    let credit = { code: '', amount: 0 };
    const subs = state.cart.filter(S.isSubscription);
    const consent = subs.map((l, i) => {
      const q = S.boxQuote(l.picks.map((p) => byId[p]), l.freq);
      return `<label class="consent"><input type="checkbox" name="consent${i}" required><span>I agree that my Butcher’s Box (${l.size} cuts) renews <b>${D.box.freqs[l.freq].toLowerCase()}</b> until I cancel. Each box is cut on a Wednesday and charged then at actual weight: about ${S.money(q.price)}, at most ${S.money(S.round(q.price * 1.1))}. I can skip or cancel before Sunday 11:59 PM Eastern in my account, by email or by phone, with no fee.</span></label>`;
    }).join('');
    $('[data-checkout-body]').innerHTML = `<div class="co">
      <button class="iconbtn co__close" type="button" data-close aria-label="Close checkout"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      <form class="co__form" data-co novalidate>
        <h2 id="co-title">Ticket ${state.ticket}</h2>
        <p class="co__sub">Your details go on the back of the ticket.</p>
        <p class="fine">This is a sample shop. Nothing is charged, cut or sent.</p>
        <h3>Contact</h3>
        <label class="field">Email<input type="email" name="email" autocomplete="email" required></label>
        ${needsPhone ? `<label class="field"><span>Mobile phone</span><small>We text you when your order is ready or on its way</small><input type="tel" name="phone" autocomplete="tel" required inputmode="tel" maxlength="20"></label>` : ''}
        <label class="field">Full name<input name="name" autocomplete="name" required></label>
        ${ships ? `<h3>Deliver to</h3>
        <label class="field">Street address<input name="street" autocomplete="address-line1" required></label>
        <label class="field"><span>Apartment, floor, buzzer <small>(optional)</small></span><input name="apt" autocomplete="address-line2"></label>
        <div class="co__row co__row--3"><label class="field">City<input name="city" autocomplete="address-level2" required></label>
        <label class="field">State<select name="state" autocomplete="address-level1" required><option value="">Choose</option>${STATES.map((s) => `<option ${method === 'courier' && s === 'NY' ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label class="field">ZIP<input name="zip" inputmode="numeric" maxlength="5" autocomplete="postal-code" required value="${esc(state.zip)}"></label></div>
        <p class="err" data-zip-err aria-live="polite"></p>
        <p><b>${METHOD_LABEL[method]}.</b> ${esc(scheduleFor(method))}</p>` : method === 'pickup' ? `<h3>Pickup</h3><p>${esc(pickupText())} Kent Ave &amp; N 4th St. Give us your ticket number at the counter.</p>` : ''}
        <h3>Payment</h3>
        <div class="redeem"><label class="field"><span>Gift card code <small>(optional)</small></span><input name="gift" autocomplete="off" maxlength="14" placeholder="EYM-XXXX-XXXX"></label><button class="btn btn--line" type="button" data-redeem>Apply</button></div>
        <p class="fine" data-redeem-msg aria-live="polite"></p>
        <label class="field">Card number<input name="card" inputmode="numeric" autocomplete="cc-number" required pattern="[0-9 ]{12,23}"></label>
        <div class="co__row"><label class="field">Expiry (MM/YY)<input name="exp" autocomplete="cc-exp" required pattern="(0[1-9]|1[0-2])\\s?/\\s?[0-9]{2}" placeholder="MM/YY"></label>
        <label class="field">Security code<input name="cvc" inputmode="numeric" autocomplete="cc-csc" required pattern="[0-9]{3,4}"></label></div>
        ${consent}
        <p class="err" data-co-err aria-live="polite"></p>
        <button class="btn btn--red" type="submit" data-place>Place order · estimate ${S.money(t.total)}</button>
        <p class="fine">${state.cart.some((l) => l.weighed) ? `You pay the actual weight after cutting, at most ${S.money(t.max)}. ` : ''}<a href="${root}terms.html" target="_blank" rel="noopener">Terms of sale</a></p>
      </form>
      <aside class="co__side" aria-label="Order summary"><h3>Eat Your Meat · Kent Ave</h3><ul class="co__lines">${state.cart.map((l) => `<li><span>${l.qty > 1 ? l.qty + ' × ' : ''}${esc(lineView(l).name)}</span><span>${l.weighed ? '≈ ' : ''}${S.money(S.round(l.price * l.qty))}</span></li>`).join('')}</ul>
        <dl class="sum"><div><dt>Subtotal (estimate)</dt><dd>${S.money(t.subtotal)}</dd></div><div><dt>${METHOD_LABEL[method]}</dt><dd>${t.fee ? S.money(t.fee) : 'Free'}</dd></div><div data-credit-row hidden><dt>Gift card</dt><dd data-credit></dd></div><div class="is-total"><dt>Estimated total</dt><dd data-due>${S.money(t.total)}</dd></div></dl></aside>
    </div>`;
    const form = $('[data-co]');
    const due = () => S.round(Math.max(0, t.total - credit.amount));
    $('[data-redeem]', form).addEventListener('click', () => {
      const code = form.elements.gift.value.trim().toUpperCase(), msg = $('[data-redeem-msg]', form);
      const gifts = load('eym.gifts', []), found = Array.isArray(gifts) ? gifts.find((x) => x && x.code === code) : null, g = found && found.balance > 0 ? found : null;
      credit = g ? { code, amount: Math.min(g.balance, t.total) } : { code: '', amount: 0 };
      msg.textContent = g ? `${S.money(credit.amount)} applied. ${S.money(S.round(g.balance - credit.amount))} left on the card.` : found ? 'That gift card has no balance left.' : 'We can’t find a gift card with that code.';
      $('[data-credit-row]').hidden = !g;
      $('[data-credit]').textContent = '−' + S.money(credit.amount);
      $('[data-due]').textContent = S.money(due());
      $('[data-place]', form).textContent = `Place order · estimate ${S.money(due())}`;
      // a card is still needed if anything is weighed: the actual weight can come in up to 10% over
      for (const n of ['card', 'exp', 'cvc']) form.elements[n].required = due() > 0 || state.cart.some((l) => l.weighed);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const phone = form.elements.phone;
      if (phone) { const digits = phone.value.replace(/\D/g, ''); phone.setCustomValidity(digits.length === 10 || (digits.length === 11 && digits[0] === '1') ? '' : 'Enter a US mobile number with area code, like (917) 555-0100.'); }
      const zipIn = form.elements.zip, stateIn = form.elements.state;
      if (zipIn && stateIn) {
        const zs = S.zipState(zipIn.value.trim());
        stateIn.setCustomValidity(zs && stateIn.value && zs !== stateIn.value ? `That ZIP code is in ${zs}, not ${stateIn.value}.` : '');
      }
      if (zipIn) {
        const k = S.classifyZip(zipIn.value).kind;
        const msg = k === 'invalid' ? (/^\d{5}$/.test(zipIn.value.trim()) ? 'We don’t recognize that ZIP code.' : 'Enter a 5-digit US ZIP code.') : method === 'courier' && k !== 'courier' ? 'That ZIP is outside our courier zone. Change the delivery option on your ticket.' : method === 'overnight' && k !== 'overnight' ? (k === 'courier' ? 'That ZIP gets our same-evening courier. Change the delivery option on your ticket.' : 'We can’t ship to that ZIP.') : '';
        zipIn.setCustomValidity(msg);
        $('[data-zip-err]').textContent = msg || stateIn.validationMessage;
      }
      if (!form.checkValidity()) {
        $('[data-co-err]').textContent = 'Some fields need attention.';
        form.reportValidity();
        return;
      }
      if (!state.cart.length || S.totals(state.cart, method).total !== t.total) { dlg('checkout').close(); $('.tool--cart').focus(); toast('Your ticket changed. Check out again to see the new total.', { label: 'View ticket', run: showCart }); return; }
      placeOrder(form, method, t, credit);
    });
    openDialog('checkout');
    form.elements.email.focus();
  }
  function placeOrder(form, method, t, credit) {
    const prev = load('eym.orders', []);
    const list = Array.isArray(prev) ? prev : [];
    const no = state.ticket;
    const phone = String(form.elements.phone?.value || '').replace(/\D/g, '');
    const tt = now();
    let next = '';
    const loose = state.cart.some((l) => l.id !== 'box' && !l.digital);
    if (loose && method === 'courier') { const d = S.nextCourier(tt); next = d === 0 ? `We’ll cut it this afternoon and text the number ending ${phone.slice(-4)} when the courier leaves, between 5 and 9 PM tonight.` : `We’ll cut it ${dayLabel(tt, d)} morning and text the number ending ${phone.slice(-4)} when the courier leaves, between 5 and 9 PM.`; }
    if (loose && method === 'overnight') { const s = S.nextShip(tt); next = `We’ll cut and pack it ${dayLabel(tt, s.ship)} morning. It arrives ${dayLabel(tt, s.arrive)}, by end of day. We’ll text the tracking number to the number ending ${phone.slice(-4)}.`; }
    if (loose && method === 'pickup') next = `${pickupText(tt)} Come to the counter at Kent Ave & N 4th St and we’ll call your number.`;
    if (state.cart.some((l) => l.id === 'box')) {
      const day = etDate(S.firstBoxCut(tt));
      const boxLine = method === 'courier' ? `Your Butcher’s Box is cut ${day} and delivered that evening, 5–⁠9 PM.` : method === 'overnight' ? `Your Butcher’s Box is cut and shipped ${day}, and arrives the next day.` : `Your Butcher’s Box is cut ${day} and ready at the counter from 11 AM.`;
      next = next ? `${next} ${boxLine}` : boxLine;
    }
    // gift cards: issue codes; redeemed credit comes off the card's balance
    const gifts = load('eym.gifts', []), giftList = Array.isArray(gifts) ? gifts.filter((g) => g && typeof g.code === 'string') : [];
    if (credit.amount) { const g = giftList.find((x) => x.code === credit.code); if (g) g.balance = S.round(g.balance - credit.amount); }
    const issued = state.cart.filter((l) => l.id === 'gift').map((l) => ({ code: 'EYM-' + Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('').replace(/^(.{4})/, '$1-'), balance: l.amount, to: l.to, from: l.from }));
    save('eym.gifts', [...giftList, ...issued]);
    const order = { no, at: new Date().toISOString(), method, total: S.round(t.total - credit.amount), max: t.max, lines: state.cart.map((l) => ({ name: lineView(l).name, qty: l.qty, price: l.price })), next };
    save('eym.orders', [...list, order]);
    const subs = load('eym.subs', []);
    save('eym.subs', [...(Array.isArray(subs) ? subs : []), ...state.cart.filter(S.isSubscription).map((l) => ({ order: no, size: l.size, freq: l.freq, picks: l.picks, status: 'active', skip: false }))]);
    const hadSub = state.cart.some(S.isSubscription);
    const weighedOrder = state.cart.some((l) => l.weighed);
    state.cart = [];
    state.ticket = state.ticket >= 99 ? 10 : state.ticket + 1; // the next visit pulls the next number; the roll runs 10 to 99
    afterCartChange(false);
    showTicketNo();
    $('[data-checkout-body]').innerHTML = `<div class="ticket" role="status">
      <p class="ticket__k">Your ticket</p><p class="ticket__no" id="co-title">${no}</p>
      ${next ? `<p>${esc(next)}</p>` : ''}
      ${issued.map((g) => `<p>Gift card for ${esc(g.to)}: <b>${esc(g.code)}</b>, ${S.money(g.balance)}.</p>`).join('')}
      ${credit.amount ? `<p>${S.money(credit.amount)} paid by gift card.</p>` : ''}
      ${hadSub ? `<p>Your Butcher’s Box renews on the schedule you chose. Skip or cancel it in <a href="${root}account.html">your account</a>.</p>` : ''}
      <p class="fine">Nothing was charged. Estimated total ${S.money(S.round(t.total - credit.amount))}${weighedOrder ? `; with actual weights it would be at most ${S.money(S.round(t.max - credit.amount))}` : ''}.</p>
      <a class="btn btn--ink" href="${root}index.html#board" data-close>Back to the board</a></div>`;
  }

  // ---------- search (combobox + listbox) ----------
  const PAGES = [...D.pages, { href: 'shipping.html', label: 'Shipping policy' }, { href: 'refunds.html', label: 'Refunds' }, { href: 'food-safety.html', label: 'Food safety and storage' }, { href: 'privacy.html', label: 'Privacy' }, { href: 'terms.html', label: 'Terms of sale' }, { href: 'accessibility.html', label: 'Accessibility' }, { href: 'index.html#box', label: 'Butcher’s Box' }];
  let results = [], sel = -1;
  const input = $('[data-search-input]'), list = $('[data-search-list]');
  const hl = (text, q) => { const i = q ? text.toLowerCase().indexOf(q) : -1; return i < 0 ? esc(text) : esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length)); };
  function search(raw) {
    const q = raw.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    const hay = (i) => `${i.name} ${D.speciesLabel[i.species]} ${i.primal || ''} ${i.desc}`.toLowerCase();
    const cuts = q ? D.items.filter((i) => terms.every((t) => hay(i).includes(t))) : D.items.filter((i) => i.stock && i.chalk).slice(0, 6);
    const special = q ? D.specialOrders.filter((o) => o.name.toLowerCase().includes(q)) : [];
    const not = q ? D.notSold.filter((o) => o.name.toLowerCase().includes(q)) : [];
    const pages = q ? PAGES.filter((p) => p.label.toLowerCase().includes(q)) : [];
    results = [
      ...cuts.slice(0, 8).map((i) => ({ group: q ? 'Cuts' : 'On the board', html: `<span>${hl(i.name, q)}</span><small>${esc(R.perUnit(i))} · ${esc(R.stockText(i, reserved(i.id)).text)}</small>`, go: `${root}cuts/${i.id}.html` })),
      ...special.map((o) => ({ group: 'Special order', html: `<span>${hl(o.name, q)}</span><small>Usually ${esc(o.lead)}. Ask us</small>`, go: `${root}contact.html` })),
      ...not.map((o) => ({ group: 'We don’t sell', html: `<span>${hl(o.name, q)}</span><small>${esc(o.why)}</small>`, go: `${root}faq.html` })),
      ...pages.map((p) => ({ group: 'Pages', html: `<span>${hl(p.label, q)}</span>`, go: root + p.href })),
    ];
    sel = results.length ? 0 : -1;
    let g = '';
    list.innerHTML = results.length ? results.map((r, i) => `${r.group !== g ? `<li class="grp" role="presentation">${esc((g = r.group))}</li>` : ''}<li role="option" id="opt-${i}" data-i="${i}" aria-selected="${i === sel}">${r.html}</li>`).join('')
      : `<li class="palette__hint" role="presentation"><b>We don’t sell “${esc(raw.trim())}”.</b> We can order in ${esc(D.specialOrders.slice(0, -1).map((o) => (o.short || o.name).toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' or $1'))} within a week, or a whole suckling pig with 10 days’ notice. <a href="${root}contact.html">Ask us</a>.</li>`;
    input.setAttribute('aria-expanded', String(results.length > 0));
    if (sel >= 0) input.setAttribute('aria-activedescendant', 'opt-0'); else input.removeAttribute('aria-activedescendant');
  }
  function openSearch() { input.value = ''; search(''); openDialog('search'); input.focus(); }
  input.addEventListener('input', () => search(input.value));
  input.addEventListener('keydown', (e) => {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && results.length) {
      e.preventDefault();
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      $$('[role="option"]', list).forEach((li) => li.setAttribute('aria-selected', String(Number(li.dataset.i) === sel)));
      $(`#opt-${sel}`).scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', `opt-${sel}`);
    }
    if (e.key === 'Enter' && sel >= 0) { e.preventDefault(); location.href = results[sel].go; }
  });
  list.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) location.href = results[Number(li.dataset.i)].go; });
  document.addEventListener('keydown', (e) => {
    const typing = /input|textarea|select/i.test(document.activeElement?.tagName || '');
    if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing && !$('dialog[open]'))) { e.preventDefault(); openSearch(); }
  });

  // ---------- footer newsletter (concept: nothing is stored) ----------
  const nl = $('[data-newsletter]');
  nl?.addEventListener('submit', (e) => {
    e.preventDefault();
    $('[data-nl-msg]').textContent = nl.elements.email.checkValidity() ? 'Thanks. Sign-ups open when the shop does, so nothing was saved yet.' : 'Enter an email address, like you@example.com.';
  });

  // ================= home =================
  let boardSig = '';
  function renderBoard() {
    const el = $('[data-board]');
    if (!el) return;
    boardSig = JSON.stringify(D.items.filter((i) => i.soldOut).map((i) => i.soldText));
    const v = state.f.view;
    $('[data-board-wrap]').dataset.mode = v;
    el.innerHTML = v === 'chalk' ? R.chalkHTML(D, root, reserved) : v === 'labels' ? R.cardsHTML(D, root, state.f, reserved) : R.boardHTML(D, root, state.f, reserved);
    $$('[data-board-wrap] .seg [data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    const { species, primal } = state.f;
    const note = $('[data-filter-note]');
    if (primal) {
      const n = D.items.filter((i) => i.species === species && i.primal === primal).length;
      note.innerHTML = `Showing ${esc(D.speciesLabel[species])}, ${esc(D.primals[species][primal])}: ${n} cut${n > 1 ? 's' : ''}. <button class="link" type="button" data-clear>Show the whole board</button>`;
    } else note.textContent = '';
    $$('[data-board-wrap] .seg [data-species]').forEach((b) => b.setAttribute('aria-pressed', String(!primal && b.dataset.species === species)));
    $$('.cutmap [data-primal]').forEach((b) => {
      const on = b.dataset.primal === primal && b.dataset.species === species;
      if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(on)); else b.classList.toggle('is-active', on);
    });
  }
  function renderCutmapCounts() {
    $$('.cutmap__list [data-primal]').forEach((b) => {
      const open = D.items.filter((i) => i.species === b.dataset.species && i.primal === b.dataset.primal && i.stock);
      const left = open.filter((i) => available(i.id) > 0).length;
      $('span', b).textContent = !open.length ? 'sold out' : left ? `${left} cut${left > 1 ? 's' : ''}` : 'on your ticket';
    });
  }
  // the chalk wipes when the board changes
  function setFilter(f) {
    Object.assign(state.f, f);
    renderBoard();
    const el = $('[data-board]');
    el.classList.remove('is-wiped'); void el.offsetWidth; el.classList.add('is-wiped');
  }
  function paintHomeTimes() {
    const t = now();
    $$('[data-next="courier"]').forEach((el) => (el.textContent = courierText(t)));
    $$('[data-next="ship"]').forEach((el) => (el.textContent = shipText(t)));
    $$('[data-next="pickup"]').forEach((el) => (el.textContent = pickupText(t)));
    // the short version, under the note
    const c = S.nextCourier(t), sh = S.nextShip(t), pu = S.nextPickup(t);
    const way = { courier: c === 0 ? 'Courier tonight in Brooklyn and Manhattan' : `Next courier ${dayLabel(t, c)} evening`, ship: sh.ship === 0 ? 'Ships today, arrives tomorrow' : `Ships ${dayLabel(t, sh.ship)}`, pickup: `Pickup ${dayLabel(t, pu.day)} from ${clock(pu.minutes)}` };
    $$('[data-way]').forEach((el) => (el.textContent = way[el.dataset.way]));
    $$('.week [data-wd]').forEach((li) => (Number(li.dataset.wd) === t.wd ? li.setAttribute('aria-current', 'date') : li.removeAttribute('aria-current')));
  }
  // re-render the board without dropping keyboard focus that's inside it
  function refreshBoard() {
    const a = document.activeElement, inside = $('[data-board]').contains(a);
    const key = inside && (a.dataset.add ? `[data-add="${a.dataset.add}"]` : a.getAttribute('href') ? `[href="${a.getAttribute('href')}"]` : '');
    renderBoard();
    if (key) ($(`[data-board] ${key}`) || $('.board__switch .seg [aria-pressed="true"]')).focus();
  }
  function renderTicketCard() {
    const el = $('[data-ticket-card]');
    if (!el) return;
    const t = S.totals(state.cart, currentMethod()), n = t.count;
    el.innerHTML = n ? `<p>${n} thing${n > 1 ? 's' : ''} on it, about ${S.money(t.subtotal)}.</p><button class="btn btn--paper" type="button" data-open="cart">View ticket</button>` : '<p>Nothing on it yet. Pick something off the board.</p>';
  }
  function initHome() {
    const params = new URLSearchParams(location.search);
    if (D.speciesOrder.includes(params.get('species'))) Object.assign(state.f, { species: params.get('species'), view: 'list' });
    paintHomeTimes();
    renderTicketCard();

    $('[data-board-wrap]').addEventListener('click', (e) => {
      const sp = e.target.closest('.seg [data-species]');
      if (sp) setFilter({ species: sp.dataset.species, primal: '', view: state.f.view === 'chalk' ? 'list' : state.f.view });
      const v = e.target.closest('[data-view]');
      if (v) { e.preventDefault(); setFilter({ view: v.dataset.view }); if (!v.closest('.board__switch .seg')) $('.board__switch .seg [aria-pressed="true"]').focus(); }
      if (e.target.closest('[data-clear]')) setFilter({ species: '', primal: '' });
    });
    $('[data-sort]').addEventListener('change', (e) => setFilter({ sort: e.target.value }));
    $('#board').addEventListener('click', (e) => {
      const p = e.target.closest('.cutmap [data-primal]');
      if (p) {
        e.preventDefault();
        const same = state.f.primal === p.dataset.primal && state.f.species === p.dataset.species;
        setFilter(same ? { species: '', primal: '' } : { species: p.dataset.species, primal: p.dataset.primal });
        if (!same && !matchMedia('(max-width: 900px)').matches) $('[data-board]').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }
      const tab = e.target.closest('[data-cutmap-tab]');
      if (tab) {
        $$('[data-cutmap-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b === tab)));
        $$('[data-cutmap]').forEach((v) => (v.hidden = v.dataset.cutmap !== tab.dataset.cutmapTab));
        $$('[data-cutlist]').forEach((v) => (v.hidden = v.dataset.cutlist !== tab.dataset.cutmapTab));
      }
    });
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-add]');
      if (!a) return;
      const id = a.dataset.add, focused = document.activeElement === a;
      addItem(id, S.defaultCfg(byId[id]).opts);
      if (focused && !a.isConnected) ($(`[data-board] [data-add="${id}"]`) || $(`[data-board] a[href$="cuts/${id}.html"]`))?.focus();
    });

    const zf = $('[data-zip]');
    if (state.zip) zf.elements.zip.value = state.zip;
    zf.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = String(zf.elements.zip.value).trim();
      const c = S.classifyZip(v), out = $('[data-zip-out]');
      out.className = 'zip__out ' + (c.kind === 'courier' || c.kind === 'overnight' ? 'is-ok' : c.kind === 'no' ? 'is-no' : 'is-bad');
      out.innerHTML = c.kind === 'courier' ? `<b>Yes, same evening.</b> ${esc(c.area)} is in our courier zone. ${esc(courierText())}`
        : c.kind === 'overnight' ? (c.nyc ? `<b>Not in our courier zone yet.</b> We don’t courier to ${esc(c.area)}, but pickup at Kent Ave &amp; N 4th St is close, or we can ship it overnight. ${esc(shipText())}` : `<b>Yes, by overnight shipping.</b> ${esc(shipText())}`)
          : c.kind === 'no' ? `<b>Sorry, we can’t deliver there.</b> We don’t ship to ${esc(c.area)}: next-day arrival isn’t reliable and the box is packed for 48 hours.`
            : /^\d{5}$/.test(v) ? `<b>We don’t recognize that ZIP code.</b> Check it and try again.` : `<b>That doesn’t look like a US ZIP code.</b> Enter 5 digits, like 11211.`;
      if (c.kind !== 'invalid') { state.zip = v; state.method = ''; persist(); }
    });

    initBox();
    renderBoard();
    renderCutmapCounts();
  }

  // ---------- butcher's box ----------
  const boxItems = D.items.filter((i) => i.box);
  const picks = () => (state.box.mode === 'pick' ? D.box.picks[state.box.size].ids : state.box.own);
  const pickShortfall = () => {
    const need = {};
    picks().forEach((id) => (need[id] = (need[id] || 0) + 1));
    return Object.entries(need).filter(([id, n]) => available(id) < n).map(([id]) => byId[id].short);
  };
  let lastSlots = [];
  function renderBox() {
    const sum = $('[data-box-summary]');
    if (!sum) return;
    const { size, freq, mode } = state.box, list = picks(), full = list.length === size;
    $('.box').dataset.mode = mode;
    const q = S.boxQuote(list.map((id) => byId[id]), freq), short = pickShortfall();
    $('[data-box-pick]').hidden = mode !== 'pick';
    $('[data-box-picker]').hidden = mode !== 'own';
    if (mode === 'pick') {
      const p = D.box.picks[size];
      $('[data-box-pick]').innerHTML = `<p class="pick__note">“${esc(p.note)}”</p><p class="pick__by">${esc(D.shop.butcher)}, head butcher</p>
        <ul class="pick__list">${p.ids.map((id) => `<li><span><a href="${root}cuts/${id}.html">${esc(byId[id].name)}</a> · ${esc(R.weightText(byId[id], S.defaultCfg(byId[id])))}</span><span>${S.money(S.unitPrice(byId[id], S.defaultCfg(byId[id])))}</span></li>`).join('')}</ul>
        ${short.length ? `<p class="err">Not enough left this week: ${esc(short.join(', '))}. Choose “I’ll choose” to swap.</p>` : ''}`;
    } else {
      const counts = {};
      list.forEach((id) => (counts[id] = (counts[id] || 0) + 1));
      $('[data-box-picker]').innerHTML = boxItems.map((it) => {
        const n = counts[it.id] || 0, left = available(it.id) - n;
        return `<li class="pk ${n ? 'is-in' : ''}"><p class="pk__name">${esc(it.name)}</p><p class="pk__meta">${esc(R.weightText(it, S.defaultCfg(it)))} · ${S.money(S.unitPrice(it, S.defaultCfg(it)))}${left <= 0 && !n ? ' · none left' : ''}</p>
          <div class="stepper"><button type="button" data-pick="${it.id}" data-d="-1" aria-label="One fewer ${esc(it.name)}" ${n ? '' : 'disabled'}>−</button><output aria-live="polite">${n}</output><button type="button" data-pick="${it.id}" data-d="1" aria-label="One more ${esc(it.name)}" ${full || left <= 0 ? 'disabled' : ''}>+</button></div></li>`;
      }).join('');
    }
    const slots = Array.from({ length: size }, (_, i) => list[i] || '');
    const crate = `<div class="crate crate--${size}" aria-hidden="true">${slots.map((id, i) => `<span class="crate__slot ${id ? `is-full crate__slot--${R.shapeOf(byId[id])}` : ''} ${id && lastSlots[i] !== id ? 'is-new' : ''}">${id ? esc(byId[id].short) : i + 1}</span>`).join('')}</div>`;
    lastSlots = slots;
    const first = `${Number(freq) > 0 ? 'First box' : 'Box'} cut ${etDate(S.firstBoxCut(now()))}.`;
    const terms = Number(freq) > 0
      ? `${first} Renews ${D.box.freqs[freq].toLowerCase()} until you cancel. We cut it on a Wednesday and charge the actual weight then, at most ${S.money(S.round(q.price * 1.1))}. Skip or cancel before Sunday 11:59 PM Eastern in your account, by email or by phone. No fee.`
      : `${first} One box, charged then at actual weight. No subscription.`;
    const ready = full && !short.length;
    sum.innerHTML = `${crate}
      <p class="sr-only" aria-live="polite">${list.length} of ${size} cuts chosen</p>
      <div class="receipt"><dl>
        <div><dt>${list.length} of ${size} cuts</dt><dd>${S.money(q.list)}</dd></div>
        ${list.length && q.discount ? `<div><dt>Subscriber discount, 10%</dt><dd>−${S.money(q.saved)}</dd></div>` : ''}
        <div class="is-total"><dt>Estimate per box</dt><dd>${S.money(q.price)}</dd></div></dl></div>
      ${list.length ? `<p class="terms">${esc(terms)}</p>` : ''}
      <button class="btn btn--red" type="button" data-box-add ${ready ? '' : 'disabled'}>${ready ? `Put the box on my ticket · ${S.money(q.price)}` : short.length ? 'Not enough left for this box' : `Choose ${size - list.length} more cut${size - list.length === 1 ? '' : 's'}`}</button>`;
    $('[data-box-bar]').innerHTML = `<span>${list.length} of ${size} cuts · ${S.money(q.price)}</span><button class="btn btn--red" type="button" data-box-jump>Review box</button>`;
  }
  function initBox() {
    const sec = $('#box');
    sec.addEventListener('change', (e) => {
      if (e.target.name === 'bsize') { state.box.size = Number(e.target.value); state.box.own = state.box.own.slice(0, state.box.size); }
      if (e.target.name === 'bfreq') state.box.freq = Number(e.target.value);
      if (e.target.name === 'bmode') state.box.mode = e.target.value;
      renderBox();
    });
    sec.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick]');
      if (b) {
        const own = state.box.own;
        if (b.dataset.d === '1' && own.length < state.box.size) own.push(b.dataset.pick);
        if (b.dataset.d === '-1') { const i = own.lastIndexOf(b.dataset.pick); if (i > -1) own.splice(i, 1); }
        renderBox();
        const again = $(`[data-pick="${b.dataset.pick}"][data-d="${b.dataset.d}"]`);
        (again && !again.disabled ? again : $(`[data-pick="${b.dataset.pick}"]:not(:disabled)`) || $('[data-box-add]')).focus();
      }
      if (e.target.closest('[data-box-add]')) {
        const { size, freq } = state.box, chosen = [...picks()];
        state.cart = [...state.cart, { id: 'box', box: 'b' + Date.now(), picks: chosen, size, freq, qty: 1, weighed: true, price: S.boxQuote(chosen.map((id) => byId[id]), freq).price }];
        state.box.own = [];
        afterCartChange(true);
        toast(`<b>Butcher’s Box, ${size} cuts</b><br>about ${S.money(S.boxQuote(chosen.map((id) => byId[id]), freq).price)} a box`, { label: 'View ticket', run: showCart });
      }
      if (e.target.closest('[data-box-jump]')) $('[data-box-summary]').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    // mobile: a summary bar while choosing, hidden once the real summary is on screen
    const bar = $('[data-box-bar]');
    let inBox = false, summaryVisible = false;
    const sync = () => { bar.hidden = !(inBox && !summaryVisible && matchMedia('(max-width: 900px)').matches); };
    new IntersectionObserver(([en]) => { inBox = en.isIntersecting; sync(); }).observe($('.box__config'));
    new IntersectionObserver(([en]) => { summaryVisible = en.isIntersecting; sync(); }).observe($('[data-box-summary]'));
    renderBox();
  }

  // ================= product page =================
  function hydratePdpStock() {
    const form = $('[data-pdp]');
    if (!form) return;
    const it = byId[form.dataset.pdp], u = S.unitsOf(it, { opts: (it.options || []).map((o, i) => (o.choices.length < 2 ? 0 : Number(new FormData(form).get(`opt${i}`)))) });
    const left = Math.floor(available(it.id) / u);
    const st = R.stockText(it, reserved(it.id));
    const stockEl = $('[data-pdp-stock]', form);
    if (stockEl) { stockEl.textContent = st.text; stockEl.className = `stock ${st.cls}`; }
    const qty = $('[data-pdp-qty]', form);
    if (qty) {
      qty.innerHTML = Array.from({ length: Math.max(1, Math.min(left, 10)) }, (_, i) => `<option>${i + 1}</option>`).join('');
      qty.disabled = left <= 0;
      $('button[type="submit"]', form).disabled = left <= 0;
    }
  }
  function initPdp() {
    const form = $('[data-pdp]');
    if (!form) return;
    const it = byId[form.dataset.pdp];
    const opts = () => (it.options || []).map((o, i) => (o.choices.length < 2 ? 0 : Number(new FormData(form).get(`opt${i}`))));
    form.addEventListener('change', () => {
      const est = $('[data-pdp-est]', form);
      if (est) est.textContent = S.money(S.unitPrice(it, { opts: opts() }));
      const w = $('[data-pdp-weight]', form);
      if (w) w.textContent = R.lb(S.weightOf(it, { opts: opts() }));
      hydratePdpStock();
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      if (addItem(it.id, opts(), Number(fd.get('qty') || 1), String(fd.get('note') || '').trim()) && form.elements.note) form.elements.note.value = '';
    });
    hydratePdpStock();
  }

  // ================= account =================
  const ticketHTML = (o) => `<div class="sub"><p class="sub__head"><span>Ticket ${Number(o.no)}</span><span>${esc(isNaN(new Date(o.at)) ? '' : new Date(o.at).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' }))}</span></p>
    <p>${esc((Array.isArray(o.lines) ? o.lines : []).filter((l) => l && typeof l.name === 'string').map((l) => `${l.qty > 1 ? l.qty + ' × ' : ''}${l.name}`).join(', '))}</p>
    <p class="fine">${esc(own(METHOD_LABEL, o.method))} · Estimated ${S.money(Number(o.total) || 0)}. ${esc(o.next || '')}</p></div>`;
  function initAccount() {
    const subsEl = $('[data-subs]'), ordersEl = $('[data-orders]');
    const render = () => {
      const ok = (x) => x && typeof x === 'object';
      const rawSubs = load('eym.subs', []), subs = Array.isArray(rawSubs) ? rawSubs.map((x, i) => [x, i]).filter(([x]) => ok(x)) : [], orders = (load('eym.orders', []) || []).filter?.((o) => ok(o) && Number.isInteger(o.no)) || [];
      subsEl.innerHTML = subs.length ? subs.map(([s, i]) => `<div class="sub ${s.status === 'cancelled' ? 'is-cancelled' : ''}">
          <p class="sub__head"><span>Butcher’s Box, ${Number(s.size) || ''} cuts · ${esc(own(D.box.freqs, s.freq))}</span><span>${s.status === 'cancelled' ? 'Canceled' : s.skip ? 'Next box skipped' : 'Active'}</span></p>
          <p class="fine">From ticket ${Number(s.order) || '?'}. Cut on Wednesdays. Changes must be in by Sunday 11:59 PM Eastern.</p>
          ${s.status === 'cancelled' ? '' : `<div class="sub__actions"><button class="btn btn--line" type="button" data-sub-skip="${i}">${s.skip ? 'Undo skip' : 'Skip the next box'}</button><button class="btn btn--line" type="button" data-sub-cancel="${i}">Cancel subscription</button></div>`}</div>`).join('')
        : '<p class="empty">No subscriptions in this browser.</p>';
      ordersEl.innerHTML = Array.isArray(orders) && orders.length ? `<div class="ticket-list">${[...orders].reverse().map(ticketHTML).join('')}</div>` : '<p class="empty">No orders in this browser yet.</p>';
    };
    subsEl.addEventListener('click', (e) => {
      const subs = load('eym.subs', []);
      if (!Array.isArray(subs)) return;
      const sk = e.target.closest('[data-sub-skip]'), ca = e.target.closest('[data-sub-cancel]');
      const rec = subs[(sk || ca)?.dataset[sk ? 'subSkip' : 'subCancel']];
      if (!rec || typeof rec !== 'object') return; // only confirm a change that actually happened
      if (sk) rec.skip = !rec.skip; else rec.status = 'cancelled';
      save('eym.subs', subs); render(); toast(ca ? 'Subscription canceled. No more boxes will be cut or charged.' : 'Saved.');
    });
    $('[data-lookup]').addEventListener('submit', (e) => {
      e.preventDefault();
      const n = Number(new FormData(e.target).get('n'));
      const orders = load('eym.orders', []);
      const o = Array.isArray(orders) ? orders.findLast((x) => x && x.no === n) : null; // numbers wrap at 99, so the latest wins
      $('[data-lookup-out]').innerHTML = o ? ticketHTML(o) : `<p class="empty">No ticket ${esc(String(n || ''))} in this browser.</p>`;
    });
    render();
  }

  // ================= gift cards =================
  function initGift() {
    const form = $('[data-gift]');
    // a custom error blocks the browser's own submit, so clear it as soon as the email changes
    form.elements.to.addEventListener('input', () => { form.elements.to.setCustomValidity(''); $('[data-gift-err]', form).textContent = ''; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form), amount = Number(fd.get('amount')), to = String(fd.get('to')).trim();
      const err = $('[data-gift-err]', form);
      form.elements.to.setCustomValidity(isEmail(to) ? '' : 'Enter a full email address, like name@example.com.');
      err.textContent = form.elements.to.validationMessage;
      if (!form.reportValidity()) return;
      state.cart = [...state.cart, { id: 'gift', amount, to, from: String(fd.get('from')).trim().slice(0, 60), note: String(fd.get('note') || '').slice(0, 200), qty: 1, digital: true, price: amount, box: 'g' + Date.now() }];
      afterCartChange(true);
      form.reset();
      toast(`<b>${S.sign(amount)} gift card</b><br>for ${esc(to)}`, { label: 'View ticket', run: showCart });
    });
  }

  addEventListener('storage', (e) => {
    if (!['eym.cart', 'eym.ticket', 'eym.zip', 'eym.method'].includes(e.key)) return;
    Object.assign(state, { cart: loadCart(), ticket: loadTicket(), zip: loadZip(), method: load('eym.method', '') });
    updateBadge(false); showTicketNo();
    if (page === 'home') { refreshBoard(); renderBox(); renderCutmapCounts(); renderTicketCard(); }
    if (page === 'product') hydratePdpStock();
    if (dlg('cart').open) renderCart();
    if ($('[data-co]') && dlg('checkout').open) { dlg('checkout').close(); $('.tool--cart').focus(); toast('Your ticket changed in another tab. Check out again to see the new total.', { label: 'View ticket', run: showCart }); }
  });

  // ---------- boot ----------
  updateBadge(false);
  if (page === 'home') initHome();
  if (page === 'product') initPdp();
  if (page === 'account') initAccount();
  if (page === 'gift') initGift();
})();
