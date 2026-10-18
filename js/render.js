// HTML builders shared by the Node build (static pages) and the browser (re-render on filter).
// Pure string functions: no DOM access here.
(function (root) {
  const S = typeof module !== 'undefined' && module.exports ? require('./store.js') : root.EYM_STORE;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lb = (n) => (Number.isInteger(n) ? n : n.toFixed(n < 1 ? 2 : 1).replace(/0$/, '')) + ' lb';
  const img = (root, name) => `${root}assets/img/${name}.webp`;

  const weightText = (item, cfg) => (item.unit === 'lb' ? '~' + lb(S.weightOf(item, cfg)) : item.size);
  const perUnit = (item) => (item.unit === 'lb' ? `${S.sign(item.price)}/lb` : `${S.sign(item.price)} each`);
  const spokenPrice = (item) => `${S.sign(item.price)} ${item.unit === 'lb' ? 'a pound' : 'each'}`;
  // shortcut: prices are whole or half dollars; a quarter would print as a half
  const chalkPrice = (item) => `${Math.floor(item.price)}${item.price % 1 ? '½' : ''}${item.unit === 'each' ? ' ea' : ''}`;
  function stockText(item, reserved = 0) {
    if (!item.stock) return { text: `Sold out ${item.soldText || ''}`.trim(), cls: 'is-out' };
    const left = item.stock - reserved;
    if (left <= 0) return { text: 'All on your ticket', cls: 'is-low' };
    return { text: left === 1 ? 'Last one' : `${left} left`, cls: left <= 2 ? 'is-low' : '' };
  }
  const GOOD = { steak: ['grill', 'skillet'], pork: ['skillet', 'oven'], lamb: ['oven', 'grill'], low: ['braise', 'smoke'], ground: ['skillet', 'grill'], poultry: ['oven'], breast: ['skillet', 'oven'], thigh: ['skillet', 'oven'], wings: ['oven', 'grill'] };
  const goodFor = (item) => item.good || GOOD[item.cook] || (item.id === 'bacon' ? ['skillet'] : []);
  const notFresh = (item) => item.kept || (item.frozen ? 'Frozen' : null); // fresh is the default, so only the exceptions are shown
  const facts = (item) => [item.bone, notFresh(item), item.feeds].filter(Boolean).join(' · ');

  // ---------------- the shop's week, anchored to now ----------------
  // Sample data has no real clock, so its times are placed in the current week: the board is never stale.
  const hm = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
  // fixed: the build writes dates ("Mon 10/12, 12:15 PM") that stay true without JS; the browser makes them relative
  function stampTimes(D, date = new Date(), fixed = false) {
    const turn = Math.max(hm(D.shop.boardUp), ...D.items.filter((i) => i.soldOut).map((i) => hm(i.soldOut)));
    const c = S.weekClock(date, turn);
    const at = (e) => `${S.dateText(e.day)}, ${S.clockText(e.min)}`;
    const upd = S.lastUpdate(c, hm(D.shop.rechalk), turn), up = c.at(0, hm(D.shop.boardUp));
    D.clock = { updated: fixed ? at(upd) : S.agoText(c, upd), signed: fixed ? at(up) : S.whenText(c, up), cut: S.dateText(c.monday) };
    for (const it of D.items.filter((i) => i.soldOut)) {
      const e = c.at(0, hm(it.soldOut)), d = c.now.day - e.day, short = S.clockText(e.min).replace(/ [AP]M$/, '');
      it.soldText = fixed ? at(e) : S.whenText(c, e);
      it.soldStamp = fixed || (d > 0 && d < 7) ? `Mon ${short}` : d === 0 ? `Today ${short}` : 'Last Mon';
    }
    return D.clock;
  }

  // ---------------- the chalkboard (the board's face) ----------------
  const RING = '<svg class="cl__ring" viewBox="0 0 108 40" preserveAspectRatio="none" aria-hidden="true"><path d="M8 22c2-12 40-17 70-15s30 14 18 22-60 9-80 3S2 18 22 10"/></svg>';
  const ARROW = '<svg class="cl__arrow" viewBox="0 0 44 22" aria-hidden="true"><path d="M42 12C30 4 16 6 4 12m0 0 8-7m-8 7 9 5"/></svg>';
  function chalkLine(it, root, reserved) {
    const gone = !it.stock, left = it.stock - reserved(it.id);
    const note = gone ? `gone ${it.soldStamp.replace(/^(Today|Last)/, (m) => m.toLowerCase())}` : left <= 0 ? 'on your ticket' : it.ring && left === 1 ? 'last one' : '';
    return `<li class="cl${gone ? ' is-gone' : ''}"><a href="${root}cuts/${it.id}.html"><span class="cl__n"><span class="cl__t">${it.ring ? RING : ''}${esc(it.chalk)}</span>${note ? `<span class="cl__note">${esc(note)}</span>` : ''}${it.arrow && !gone ? `<span class="cl__tip">${ARROW}${esc(it.arrow)}</span>` : ''}</span><span class="cl__d" aria-hidden="true"></span><span class="cl__p" aria-hidden="true">${chalkPrice(it)}</span><span class="sr-only">, ${spokenPrice(it)}${gone ? ', sold out' : ''}</span></a></li>`;
  }
  function chalkHTML(D, root, reserved = () => 0) {
    const sub = D.speciesOrder.map((sp) => D.animals[sp].chalk).filter(Boolean).join(' · ');
    const cols = D.chalkCols.map((sps) => `<div>${sps.map((sp) => `<h3 class="chalk__h">${esc(D.chalkLabel[sp])}${D.chalkNote[sp] ? ` <small>${esc(D.chalkNote[sp])}</small>` : ''}</h3>
      <ul class="chalk__list">${D.items.filter((i) => i.species === sp && i.chalk).map((it) => chalkLine(it, root, reserved)).join('')}</ul>`).join('')}</div>`).join('');
    const pins = D.items.filter((i) => i.pin).map((it) => `<li class="pin" style="--tilt:${tilt(it.id)}deg"><a href="${root}cuts/${it.id}.html"><img src="${root}assets/draw/${it.id}.svg" alt="" width="400" height="300" loading="lazy"><span class="pin__name">${esc(it.chalk || it.short)}</span><span class="pin__price" aria-hidden="true">${chalkPrice(it)}${it.unit === 'lb' ? '/lb' : ''}</span><span class="sr-only">, ${spokenPrice(it)}</span></a>${it.stock && reserved(it.id) < it.stock ? `<button class="add" data-add="${it.id}" aria-label="Add ${esc(it.name)} to your ticket">Add</button>` : ''}</li>`).join('');
    return `<div class="chalk">
      <div class="chalk__head"><div><h2 class="chalk__title" id="board-title">On the block</h2><p class="chalk__sub">${esc(sub)}</p></div><p class="chalk__upd">updated ${esc(D.clock.updated)}</p></div>
      <ul class="pins">${pins}<li class="pin pin--all"><button type="button" data-view="labels">Every cut, with pictures<b>${D.items.length} →</b></button></li></ul>
      <div class="chalk__cols">${cols}</div>
      <p class="chalk__foot"><a class="chalk__more" href="#full-list" data-view="labels"><span>+ ${D.items.filter((i) => !i.chalk).length} more, with pictures</span></a><span aria-hidden="true">— ${esc(D.shop.butcher[0])}.</span></p>
    </div>`;
  }

  // ---------------- the full list ----------------
  function boardRows(D, items, root, reserved) {
    return items.map((it) => {
      const cfg = S.defaultCfg(it), st = stockText(it, reserved(it.id)), optText = S.optionLabel(it, cfg);
      const opt = optText && (it.options || []).some((o) => o.choices.length > 1) ? `<span class="row__opt">${esc(optText)}</span>` : '';
      const add = it.stock && reserved(it.id) < it.stock
        ? `<button class="add" data-add="${it.id}" aria-label="Add ${esc(it.name)}${opt ? ', ' + esc(optText) : ''} to your ticket">Add</button>` : '';
      return `<tr class="${it.stock ? '' : 'is-soldout'}" data-row="${it.id}">
        <th scope="row"><a href="${root}cuts/${it.id}.html">${esc(it.name)}</a>${opt}<span class="row__facts">${esc(facts(it))}</span></th>
        <td class="num num--w">${esc(weightText(it, cfg))}</td>
        <td class="num">${esc(perUnit(it))}</td>
        <td class="num num--est">${it.unit === 'lb' ? '≈ ' : ''}${S.money(S.unitPrice(it, cfg))}</td>
        <td class="num stock ${st.cls}">${esc(st.text)}</td>
        <td class="act">${add}</td></tr>`;
    }).join('');
  }
  function sortItems(items, sort) {
    const each = (x) => Number(x.unit === 'each');
    if (sort === 'price-asc') return [...items].sort((a, b) => each(a) - each(b) || a.price - b.price);
    if (sort === 'price-desc') return [...items].sort((a, b) => each(a) - each(b) || b.price - a.price);
    return items;
  }
  // one set of column widths for every species table, so the list lines up as you scroll
  const COLS = '<colgroup><col class="c-cut"><col class="c-w"><col class="c-p"><col class="c-e"><col class="c-s"><col class="c-a"></colgroup>';
  function boardHTML(D, root, f = {}, reserved = () => 0) {
    const groups = D.speciesOrder.filter((sp) => !f.species || f.species === sp).map((sp) => {
      let items = D.items.filter((i) => i.species === sp && (!f.primal || i.primal === f.primal));
      if (!items.length) return '';
      items = sortItems(items, f.sort);
      const a = D.animals[sp], farm = a.farm ? D.farms[a.farm] : null;
      const sub = farm ? `${esc(a.label)} · ${esc(farm.name)}, ${esc(farm.place)} · ${esc(a.detail)}` : esc(a.detail[0].toUpperCase() + a.detail.slice(1));
      return `<table class="board__table">
        <caption><span class="board__species">${esc(D.speciesLabel[sp])}</span><span class="board__animal">${sub}</span></caption>${COLS}
        <thead><tr><th scope="col">Cut</th><th scope="col" class="num">Weight</th><th scope="col" class="num">Price</th><th scope="col" class="num">Estimate</th><th scope="col" class="num">Stock</th><th scope="col"><span class="sr-only">Add to your ticket</span></th></tr></thead>
        <tbody>${boardRows(D, items, root, reserved)}</tbody></table>`;
    }).join('');
    return groups || `<p class="board__empty">Nothing left from that part of the animal this week. <button class="link" data-clear>Show everything</button></p>`;
  }

  // ---------------- how it leaves the shop: wrapped, with a printed label ----------------
  let uid = 0;
  // how it's wrapped: a slab, a tray of pieces, a bird, a roll, a tub or a jar
  const shapeOf = (it) => it.pack || (it.id === 'whole-chicken' ? 'bird' : it.species === 'chicken' ? 'tray' : ['bacon', 'pork-belly', 'brisket', 'spare-ribs', 'lamb-breast', 'flank', 'skirt'].includes(it.id) ? 'slab' : it.cook === 'ground' || it.id === 'salami' ? 'chub' : it.cook === 'low' ? 'roast' : 'flat');
  // a few degrees either way, the same every time for a given cut
  const tilt = (id) => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997; return ((h % 9) - 4) * 0.7; };
  function miniWhere(it) {
    const sh = SHAPES[it.species], r = sh && it.primal && (sh.regions[it.primal] || sh.extra[it.primal]);
    if (!r) return '';
    const id = `w${++uid}`;
    return `<svg class="tag__where" viewBox="0 0 640 340"><defs><clipPath id="${id}"><path d="${sh.outline}"/></clipPath></defs><path class="on" d="${Array.isArray(r) ? r[0] : r}" ${Array.isArray(r) ? `clip-path="url(#${id})"` : ''}/><path class="out" d="${sh.outline}"/></svg>`;
  }
  function tagHTML(D, it, { root = '', heading = 'h3', link = true, priced = true } = {}) {
    const cfg = S.defaultCfg(it), a = D.animals[it.species], farm = a.farm ? D.farms[a.farm] : null;
    const name = link ? `<a href="${root}cuts/${it.id}.html">${esc(it.name)}</a>` : esc(it.name);
    return `<div class="tag">
      <p class="tag__shop" aria-hidden="true">Eat Your Meat · Kent Ave</p>
      <${heading} class="tag__cut">${name}</${heading}>
      ${priced ? `<p class="tag__src">${farm ? `${esc(a.label)} · ${esc(farm.name.split(' ').slice(0, 2).join(' '))}` : 'Made in the back'}</p>` : ''}
      <p class="tag__src">${it.made ? esc(it.made) : `Cut <span data-when="cut">${esc(D.clock.cut)}</span>${it.species === 'beef' ? ' · hung 21 days' : ''}`}</p>
      ${priced ? `<p class="tag__row"><span>${it.unit === 'lb' ? `Net ~${lb(S.weightOf(it, cfg))}` : esc(it.size)}</span><span>${S.money(it.price)}${it.unit === 'lb' ? '/lb' : ' ea'}</span></p>
      <p class="tag__row tag__big"><span>${it.unit === 'lb' ? 'Est' : 'Price'}</span><span>${S.money(S.unitPrice(it, cfg))}</span></p>` : ''}
      <span class="tag__foot" aria-hidden="true"><span class="tag__bars"></span>${miniWhere(it)}<span class="tag__mv tag__mv--${esc(a.by.toLowerCase())}" title="${esc(D.shop.crew[a.by] || '')}">${esc(a.by)}</span></span>
    </div>`;
  }
  // inside: the label and the stamp, laid on the paper
  const drawnHTML = (it, root, big, inside, onSheet = '') => `<div class="drawn${big ? ' drawn--big' : ''}"><div class="drawn__sheet"><img src="${it.img ? img(root, it.img) : `${root}assets/draw/${it.id}.svg`}" alt="${it.img ? '' : 'A drawing of '}${esc(it.name.toLowerCase())}" width="400" height="300"${big ? '' : ' loading="lazy"'}>${onSheet}</div>${inside}</div>`;
  const stampHTML = (it) => `<p class="stamp">Sold out<small data-when="stamp" data-id="${it.id}">${esc(it.soldStamp || '')}</small></p>`;
  function labelCard(D, it, root, reserved = () => 0) {
    const st = stockText(it, reserved(it.id));
    return `<li class="pc${it.stock ? '' : ' is-soldout'}" style="--tilt:${tilt(it.id)}deg">
      ${drawnHTML(it, root, false, tagHTML(D, it, { root }) + (it.stock ? '' : stampHTML(it)))}
      ${it.stock ? `<p class="pc__foot"><span class="stock ${st.cls}">${esc(st.text)}</span>${reserved(it.id) < it.stock ? `<button class="add" data-add="${it.id}" aria-label="Add ${esc(it.name)} to your ticket">Add</button>` : ''}</p>` : ''}</li>`;
  }
  const cardsHTML = (D, root, f = {}, reserved) => {
    const items = sortItems(D.items.filter((i) => (!f.species || i.species === f.species) && (!f.primal || i.primal === f.primal) && (!f.good || goodFor(i).includes(f.good))), f.sort);
    return items.length ? `<ul class="pcs">${items.map((i) => labelCard(D, i, root, reserved)).join('')}</ul>` : `<p class="board__empty">Nothing on the board matches that. <button class="link" data-clear>Show every cut</button></p>`;
  };

  // ---------------- primal diagrams ----------------
  // Side views facing left on a 640×340 grid. Regions are clipped to the outline.
  const SHAPES = {
    beef: {
      outline: 'M42 166 C38 158 38 148 44 140 L58 118 C64 108 72 100 84 96 L74 90 L66 82 L80 80 L96 88 C102 82 108 76 112 66 C116 72 116 80 114 86 L128 92 C150 100 168 98 186 94 C194 90 202 86 214 86 C232 90 260 94 300 96 L400 98 L498 100 C520 102 536 108 546 118 C548 136 546 158 540 182 C532 210 520 234 506 250 C500 262 496 276 494 292 L492 320 L466 318 L466 292 C462 274 458 256 452 242 L428 252 C390 264 346 268 300 266 C250 262 214 256 184 252 C180 262 178 278 176 296 L176 320 L150 318 L150 296 C152 280 152 262 150 244 L142 234 C136 228 130 220 124 210 C118 204 112 196 104 188 C94 192 82 192 70 188 C58 184 48 178 42 166 Z',
      extra: { tail: 'M544 114 C552 150 556 194 558 236 L572 256 L552 258 L550 236 C548 194 544 152 536 120 Z' },
      regions: {
        head: ['M0 0 L122 0 L114 188 L0 188 Z', [76, 146]], chuck: ['M122 0 L222 0 L222 196 L114 188 Z', [172, 140]],
        brisket: ['M114 188 L222 196 L222 272 L140 272 Z', [182, 234]], shank: ['M120 272 L222 272 L222 340 L120 340 Z M440 276 L520 276 L520 340 L440 340 Z', [164, 306]],
        rib: ['M222 0 L304 0 L304 178 L222 188 Z', [263, 136]], plate: ['M222 188 L304 178 L304 272 L222 272 Z', [263, 228]],
        loin: ['M304 0 L420 0 L420 170 L304 178 Z', [362, 132]], flank: ['M304 178 L420 170 L448 272 L304 272 Z', [372, 222]],
        round: ['M420 0 L640 0 L640 276 L440 276 L448 272 L420 170 Z', [488, 168]],
      },
      extraLabel: { tail: [596, 214] },
      legLabel: [84, 300, 'M108 296 L150 290'],
    },
    pork: {
      outline: 'M30 148 L30 176 C40 186 54 192 70 198 C88 206 104 212 118 218 C126 228 132 240 136 252 L138 300 L134 318 L160 318 L162 290 L164 264 C200 268 250 274 300 274 C350 274 404 270 448 258 C454 270 460 284 462 300 L458 318 L486 318 L490 296 C498 280 510 262 520 244 C530 220 536 192 536 164 C536 148 532 136 526 126 C510 110 470 100 420 98 L300 94 C250 94 220 96 196 100 C176 102 158 106 146 104 L134 74 L114 96 C100 104 86 112 72 120 C56 128 42 136 30 148 Z',
      extra: {},
      deco: 'M528 124 C540 112 552 120 546 130 C540 140 554 146 560 136',
      legLabel: [74, 300, 'M100 296 L134 292'],
      regions: {
        head: ['M0 0 L116 0 L116 284 L0 284 Z', [72, 166]], shoulder: ['M116 0 L214 0 L214 270 L116 220 Z', [164, 168]],
        loin: ['M214 0 L424 0 L424 180 L214 184 Z', [318, 140]], belly: ['M214 184 L424 180 L440 284 L214 284 Z', [320, 232]],
        leg: ['M424 0 L640 0 L640 280 L440 284 L424 180 Z', [482, 176]], hock: ['M120 284 L196 284 L196 340 L120 340 Z M440 284 L500 284 L500 340 L440 340 Z', [149, 306]],
      },
    },
    lamb: {
      outline: 'M40 152 C40 160 44 168 54 172 C66 178 78 180 90 182 C104 190 114 200 124 210 C134 220 142 230 148 240 L152 300 L150 320 L172 320 L174 290 L176 262 C210 256 250 256 300 258 C350 260 400 254 432 244 C438 260 442 280 444 300 L440 320 L464 320 L468 292 C470 276 474 262 480 248 C490 230 500 206 504 180 C508 160 510 146 512 136 L520 130 L512 122 C500 114 470 106 420 104 L300 100 C250 100 210 102 184 106 C168 108 152 108 138 102 L118 94 L92 82 L98 100 C88 106 76 112 66 120 C54 130 44 140 40 152 Z',
      extra: {},
      regions: {
        head: ['M0 0 L100 0 L100 192 L0 192 Z', [76, 148]],
        neck: ['M100 0 L156 0 L156 216 L100 192 Z', [128, 152]], shoulder: ['M156 0 L230 0 L230 192 L156 216 Z', [194, 150]],
        rack: ['M230 0 L304 0 L304 176 L230 192 Z', [267, 140]], loin: ['M304 0 L392 0 L392 170 L304 176 Z', [348, 138]],
        leg: ['M392 0 L640 0 L640 340 L452 340 L452 264 L432 172 L392 170 Z', [458, 170]],
        breast: ['M156 216 L230 192 L304 176 L392 170 L432 172 L452 264 L156 264 Z', [304, 226]],
        shank: ['M140 264 L200 264 L200 340 L140 340 Z M432 264 L480 264 L480 340 L432 340 Z', [168, 300]],
      },
      legLabel: [86, 300, 'M112 296 L150 290'],
    },
  };
  // still: a static picture for product pages (no links), with `active` highlighted
  function diagramSVG(D, species, active, still) {
    const sh = SHAPES[species], names = D.primals[species];
    const id = `clip-${species}${still ? '-' + active : ''}`;
    const regionKeys = Object.keys(sh.regions).concat(Object.keys(sh.extra));
    const body = regionKeys.map((k) => {
      const isExtra = !sh.regions[k];
      const shank = k === 'shank' || k === 'hock'; // legs are too narrow to label inside; the leader label names them
      const path = isExtra ? sh.extra[k] : sh.regions[k][0];
      const [lx, ly] = isExtra ? sh.extraLabel[k] : sh.regions[k][1];
      const items = D.items.filter((i) => i.species === species && i.primal === k);
      const open = items.filter((i) => i.stock);
      const label = names[k] || 'Head';
      const state = !items.length ? 'none' : open.length ? '' : 'out';
      const title = !items.length ? `${label}: not sold` : open.length ? `${label}: ${open.length} cut${open.length > 1 ? 's' : ''} in stock` : `${label}: sold out this week`;
      const shape = `<path d="${path}" ${isExtra ? '' : `clip-path="url(#${id})"`}/>`;
      const left = still || !items.length ? '' : `<text class="cuts__left" x="${shank ? sh.legLabel[0] : lx}" y="${(shank ? sh.legLabel[1] : ly) + 17}">${items.map((i, n) => `<tspan x="${shank ? sh.legLabel[0] : lx}" dy="${n ? 12 : 0}"${i.stock ? '' : ' class="cuts__gone"'}>${esc(i.short.toLowerCase())}${i.stock === 1 ? ' (last)' : ''}</tspan>`).join('')}</text>`;
      const text = (shank ? '' : `<text x="${lx}" y="${ly}">${esc(label)}</text>`) + left;
      const cls = `region ${state ? 'region--' + state : ''} ${active === k ? 'is-active' : ''}`;
      return items.length && !still
        ? `<a href="#board" class="${cls}" data-primal="${k}" data-species="${species}" aria-label="${esc(title)}"><title>${esc(title)}</title>${shape}${text}</a>`
        : `<g class="${cls}"><title>${esc(still ? label : title)}</title>${shape}${text}</g>`;
    }).join('');
    const legName = names.shank || names.hock;
    return `<svg class="cuts" viewBox="0 0 640 340" ${still ? `role="img" aria-label="${esc(D.speciesLabel[species])} diagram, ${esc(names[active])} highlighted"` : `role="group" aria-label="${esc(D.speciesLabel[species])} cuts by part of the animal"`}>
      <defs><clipPath id="${id}"><path d="${sh.outline}"/></clipPath></defs>
      ${body}<path class="cuts__outline" d="${sh.outline}"/>${sh.deco ? `<path class="cuts__deco" d="${sh.deco}"/>` : ''}<text class="cuts__leg${active === 'shank' || active === 'hock' ? ' is-active' : ''}" x="${sh.legLabel[0]}" y="${sh.legLabel[1]}">${esc(legName)}</text><path class="cuts__lead" d="${sh.legLabel[2]}"/></svg>`;
  }

  // ---------------- product page ----------------
  function similar(D, it) {
    if (it.species === 'house') return [];
    return D.items.filter((x) => x.id !== it.id && x.species === it.species && (x.cook === it.cook || it.species === 'chicken'))
      .sort((a, b) => (!a.stock - !b.stock) || Math.abs(a.price - it.price) - Math.abs(b.price - it.price)).slice(0, 3);
  }
  const noteHTML = (n) => `<span class="drawn__note${n.by === 'DO' ? ' drawn__note--do' : ''}" style="left:${n.left}%;top:${n.top}%;width:${n.width}%">${esc(n.text)}</span>`;
  const hasRegion = (it) => SHAPES[it.species] && it.primal && (SHAPES[it.species].regions[it.primal] || SHAPES[it.species].extra[it.primal]);
  function pdpHTML(D, it, root, notes = []) {
    const cfg = S.defaultCfg(it), a = D.animals[it.species], farm = a.farm ? D.farms[a.farm] : null, st = stockText(it);
    const first = D.shop.butcher.split(' ')[0];
    const opts = (it.options || []).map((o, oi) => o.choices.length < 2 ? '' : `<fieldset class="opt"><legend>${esc(o.label)}</legend><div class="opt__row">${o.choices.map((c, ci) =>
      `<label><input type="radio" name="opt${oi}" value="${ci}" ${ci === cfg.opts[oi] ? 'checked' : ''}><span>${esc(c.label)}${c.lb && it.unit === 'lb' ? `<small>≈ ${S.money(S.round(it.price * c.lb))}</small>` : ''}</span></label>`).join('')}</div></fieldset>`).join('');
    // temperatures only where a thermometer helps; a braise is done when it's tender
    const temps = ['steak', 'pork', 'lamb', 'poultry', 'breast', 'thigh', 'wings', 'ground'].includes(it.cook) ? `<section class="pdp__sec"><h2>Take it off at</h2><ul class="temps">${D.cook[it.cook].map(([l, t]) => `<li><b>${t}°F</b><span>${esc(l)}</span></li>`).join('')}</ul>${['steak', 'pork', 'lamb'].includes(it.cook) ? `<p class="fine">Chef’s temperatures. The <a href="${root}food-safety.html">USDA’s</a> are higher.</p>` : ''}</section>` : '';
    const sim = similar(D, it);
    const store = it.storage || (it.frozen ? 'Thaw it in the fridge overnight.' : it.unit === 'each' ? 'Keep it in the fridge once opened.' : `Fridge, ${it.cook === 'ground' || it.species === 'chicken' ? '1 to 2 days' : '3 to 5 days'}. Freezer, vacuum-sealed, up to 6 months.`);
    const specs = [it.bone && ['Bone', it.bone], notFresh(it) && ['Kept', notFresh(it)], it.feeds && ['Feeds', it.feeds.replace('Feeds ', '')]].filter(Boolean); // the cut or made date is on the label
    const src = farm ? `${esc(a.label)} · ${esc(farm.name)}, ${esc(farm.place)}` : esc(D.speciesLabel[it.species]);
    const html = `<nav class="crumbs" aria-label="Breadcrumb"><a href="${root}index.html#board">The board</a> <span aria-hidden="true">/</span> <a href="${root}index.html?species=${it.species}#board">${esc(D.speciesLabel[it.species])}</a> <span aria-hidden="true">/</span> <span aria-current="page">${esc(it.name)}</span></nav>
    <div class="pdp">
      <div class="pdp__media counter" style="--tilt:${tilt(it.id)}deg">${drawnHTML(it, root, true, tagHTML(D, it, { heading: 'p', link: false, priced: false }) + (it.stock ? '' : stampHTML(it)), notes.map(noteHTML).join(''))}</div>
      <div class="pdp__col"><form class="pdp__label" data-pdp="${it.id}">
        <p class="pdp__src">${src}</p>
        <h1 class="pdp__name">${esc(it.name)}</h1>
        ${it.says ? `<blockquote class="says"><p>“${esc(it.says)}”</p><footer>${esc(first)}</footer></blockquote>` : ''}
        <p class="pdp__price"><b>${esc(perUnit(it))}</b> <span>${it.unit === 'lb' ? `about <span data-pdp-weight>${lb(S.weightOf(it, cfg))}</span>, so about <span data-pdp-est>${S.money(S.unitPrice(it, cfg))}</span>, never more than <span data-pdp-max>${S.money(S.round(S.unitPrice(it, cfg) * (1 + S.VARIANCE)))}</span>` : esc(it.size)}</span></p>
        ${it.stock ? `${opts}
        <details class="note"><summary>Add a note for the counter</summary><label><span class="sr-only">Note for the counter</span><textarea name="note" maxlength="200" rows="2" placeholder="e.g. Trim the fat to a quarter inch"></textarea></label></details>
        <div class="pdp__buy"><label class="qty"><span class="sr-only">Quantity</span><select name="qty" data-pdp-qty>${Array.from({ length: Math.min(it.stock, 10) }, (_, i) => `<option>${i + 1}</option>`).join('')}</select></label><button class="btn btn--red" type="submit">Add to ticket</button></div>
        <p class="stock ${st.cls}" data-pdp-stock>${esc(st.text)}</p>
        <p class="fine">${it.unit === 'lb' ? `Final price by weight. ` : ''}Spoiled, warm or the wrong cut? We replace it or refund it. <a href="${root}refunds.html">Refunds</a></p>`
        : `<p class="pdp__soldout"><span class="stock is-out">Sold out <span data-when="sold" data-id="${it.id}">${esc(it.soldText || '')}</span>.</span> Next ${esc({ beef: 'steer', pork: 'pigs', lamb: 'lambs', chicken: 'chickens' }[it.species] || 'batch')} Monday.</p>`}
        <dl class="pdp__specs">${specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      </form>
      ${it.stock ? '' : `<form class="notify" data-notify="${it.id}" novalidate><label class="field">Tell me when it’s back<input type="email" name="email" autocomplete="email" required placeholder="you@example.com"></label><button class="btn btn--ink" type="submit">Tell me</button><p class="fine" data-notify-msg aria-live="polite"></p></form>`}</div>
    </div>`;
    const good = goodFor(it), region = hasRegion(it);
    const where = region ? `<section class="pdp__sec pdp__where"><h2>Where it comes from</h2><div class="pdp__where__row">${diagramSVG(D, it.species, it.primal, true)}<p>From the ${esc(D.primals[it.species][it.primal].toLowerCase())}.${good.length ? ` <b>Good for:</b> ${esc(good.join(', '))}.` : ''}</p></div></section>` : good.length ? `<p class="pdp__good"><b>Good for:</b> ${esc(good.join(', '))}.</p>` : '';
    return html + `<div class="pdp__more">
      <p class="pdp__desc">${esc(it.desc)}</p>
      ${where}
      ${temps}
      <p class="pdp__store"><b>Keeping it.</b> ${esc(store)} <a href="${root}food-safety.html">Storage and safety</a></p>
      ${sim.length ? `<section class="pdp__sec"><h2>Similar cuts</h2><ul class="pairs">${sim.map((p) => `<li><a href="${root}cuts/${p.id}.html">${esc(p.name)}</a><span>${esc(perUnit(p))}${p.stock ? '' : ' · sold out'}</span></li>`).join('')}</ul></section>` : ''}
    </div>`;
  }

  const api = { goodFor, shapeOf, esc, lb, weightText, perUnit, chalkPrice, stockText, facts, stampTimes, chalkHTML, boardHTML, cardsHTML, labelCard, tagHTML, diagramSVG, pdpHTML, similar, SHAPES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EYM_RENDER = api;
})(this);
