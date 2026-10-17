// Static build: node build.mjs
// Writes index.html, cuts/<id>.html, info pages, account.html, gift-cards.html, sitemap.xml, robots.txt.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pages } from './content/pages.mjs';
import * as DR from './content/drawings.mjs';
const { drawCut } = DR, NOTES = DR.NOTES || {};

const require = createRequire(import.meta.url);
const D = require('./js/data.js');
const S = require('./js/store.js');
const R = require('./js/render.js');
const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const out = (p, html) => { fs.mkdirSync(path.dirname(path.join(ROOT, p)), { recursive: true }); fs.writeFileSync(path.join(ROOT, p), html); };
const { esc } = R;
const shop = D.shop;
R.stampTimes(D, new Date(), true);

// root-relative links in content ("/faq.html", "/#board") become relative so the site also works from disk
const relLinks = (html, root) => html.replace(/href="\/(#?)([^"]*)"/g, (_, hash, rest) => `href="${root}${hash ? 'index.html#' : ''}${rest || (hash ? '' : 'index.html')}"`);

const icon = {
  search: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
  menu: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
};

function header(root) {
  return `<header class="header">
  <button class="iconbtn header__menu" data-open="menu" aria-label="Open menu">${icon.menu}</button>
  <a class="logo" href="${root}index.html"><span class="logo__name">Eat Your Meat</span><span class="logo__tag" data-status>Kent Ave &amp; N 4th St<span class="logo__where">, Brooklyn</span></span></a>
  <nav class="nav" aria-label="Main">
    <a href="${root}index.html#board">The board</a><a href="${root}index.html#box">Butcher’s Box</a><a href="${root}delivery.html">Delivery</a><a href="${root}about.html">About</a>
  </nav>
  <div class="sample" role="note" aria-label="About this site"><p>Sample shop: nothing is charged or sent.</p><button type="button" class="link" data-sample-ok>Got it</button></div>
  <div class="header__tools">
    <button class="tool" data-open="search">${icon.search}<span class="tool__label">Search</span></button>
    <button class="tool tool--cart" data-open="cart"><span class="tool__t">Ticket</span> <span data-ticket-no></span><span class="tool__count" data-cart-count>0</span><span class="sr-only" data-cart-unit> items</span></button>
  </div>
</header>`;
}

function footer(root) {
  const link = (href, label) => `<li><a href="${root}${href}">${label}</a></li>`;
  return `<footer class="footer">
  <div class="footer__grid">
    <div>
      <h2 class="footer__h">Eat Your Meat</h2>
      <address>${esc(shop.street)}<br>${esc(shop.cityLine)}<br><a href="${shop.phoneHref}">${esc(shop.phone)}</a><br><a href="mailto:${shop.email}">${esc(shop.email)}</a><br><a href="${shop.mapUrl}" rel="noopener">Open in a map</a></address>
    </div>
    <div>
      <h2 class="footer__h">Hours</h2>
      <dl class="hours">${shop.hours.map(([d, h]) => `<div><dt>${d}</dt><dd>${h}</dd></div>`).join('')}</dl>
      <p class="footer__small">Same-evening courier Tue–Sun. Overnight shipping Mon–Wed.</p>
    </div>
    <nav aria-label="Shop and help"><h2 class="footer__h">Shop</h2><ul>${link('index.html#board', 'The board')}${link('index.html#box', 'Butcher’s Box')}${link('gift-cards.html', 'Gift cards')}${link('account.html', 'Your account')}</ul>
      <h2 class="footer__h">Help</h2><ul>${link('delivery.html', 'Delivery')}${link('faq.html', 'Common questions')}${link('contact.html', 'Contact')}${link('about.html', 'About us')}</ul></nav>
    <nav aria-label="Policies"><h2 class="footer__h">Policies</h2><ul>${link('shipping.html', 'Shipping')}${link('refunds.html', 'Refunds')}${link('privacy.html', 'Privacy')}${link('terms.html', 'Terms of sale')}${link('food-safety.html', 'Food safety')}${link('accessibility.html', 'Accessibility')}</ul></nav>
  </div>
  <form class="newsletter" data-newsletter novalidate>
    <label for="nl-email">A short email on Mondays, when the new board goes up.</label>
    <div class="newsletter__row"><input id="nl-email" name="email" type="email" autocomplete="email" required placeholder="you@example.com"><button class="btn btn--ink" type="submit">Sign up</button></div>
    <p class="newsletter__msg" data-nl-msg aria-live="polite"></p>
  </form>
  <p class="footer__base">© 2026 Eat Your Meat. A concept store with sample data. Photos: Unsplash contributors.</p>
</footer>`;
}

function dialogs() {
  return `<dialog class="drawer" data-dialog="cart" aria-labelledby="cart-title">
  <div class="drawer__head"><h2 id="cart-title">Your ticket</h2><button class="iconbtn" data-close aria-label="Close your ticket">${icon.close}</button></div>
  <div class="drawer__body" data-cart-body></div>
  <div class="drawer__foot" data-cart-foot></div>
</dialog>
<dialog class="palette" data-dialog="search" aria-label="Search">
  <div class="palette__bar">${icon.search}<input type="text" role="combobox" aria-expanded="false" aria-controls="search-list" aria-autocomplete="list" aria-label="Search cuts, animals and pages" placeholder="Search cuts, animals and pages" data-search-input autocomplete="off" spellcheck="false"><button class="iconbtn" data-close aria-label="Close search">${icon.close}</button></div>
  <ul class="palette__list" id="search-list" role="listbox" aria-label="Results" data-search-list></ul>
</dialog>
<dialog class="sheet" data-dialog="checkout" aria-labelledby="co-title"><div data-checkout-body></div></dialog>
<dialog class="drawer drawer--left" data-dialog="menu" aria-label="Menu">
  <div class="drawer__head"><span class="logo__name">Eat Your Meat</span><button class="iconbtn" data-close aria-label="Close menu">${icon.close}</button></div>
  <nav class="menu" aria-label="Menu"><a href="index.html#board" data-close>The board</a><a href="index.html#box" data-close>Butcher’s Box</a><a href="delivery.html">Delivery</a><a href="about.html">About us</a><a href="faq.html">Common questions</a><a href="contact.html">Contact</a><a href="account.html">Your account</a><a href="gift-cards.html">Gift cards</a></nav>
</dialog>
<div class="toast" role="status" aria-live="polite" data-toast></div>`;
}

function layout({ root, file, title, description, body, page, ogImage = 'shop/breakdown', jsonld = '', ogType = 'website', noindex = false }) {
  const url = `${D.site}/${file === 'index.html' ? '' : file}`;
  // mark links to this page as the current page (nav, footer, menu)
  const current = (html) => html.replaceAll(`<a href="${root}${file}"`, `<a href="${root}${file}" aria-current="page"`);
  return current(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">${noindex ? '\n<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="Eat Your Meat">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${D.site}/assets/img/${ogImage}.webp">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1C1915">
<link rel="icon" href="${root}assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="${root}assets/fonts/Rokkitt-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${root}assets/fonts/Public-Sans-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${root}assets/fonts/Shadows-Into-Light-Two-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${root}styles.css">
<script>document.documentElement.classList.add('js'); try { if (localStorage.getItem('eym.sample')) document.documentElement.classList.add('sample-ok'); } catch (e) {}</script>
${jsonld}
</head>
<body data-root="${root}" data-page="${page}">
<a class="skip" href="#main">Skip to content</a>
<svg class="fx" width="0" height="0" aria-hidden="true" focusable="false">
  <filter id="chalk" x="-2%" y="-5%" width="104%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="4" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.85" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="c"/><feDisplacementMap in="c" in2="t" scale="1.8" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="wobble"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="3" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="4"/></filter>
  <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><rect width="9" height="9" fill="#F4DCD6"/><rect width="3.2" height="9" fill="#A3241B" opacity=".85"/></pattern>
  <filter id="ink"><feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="1" seed="9" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 2.1" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>
</svg>
${header(root).replace(/\n/g, '\n')}
<main id="main">
${body}
</main>
${footer(root)}
${dialogs().replace(/href="(index|delivery|about|faq|contact|account|gift-cards)\.html/g, `href="${root}$1.html`)}
<script src="${root}js/data.js"></script>
<script src="${root}js/store.js"></script>
<script src="${root}js/render.js"></script>
<script src="${root}js/app.js"></script>
</body>
</html>
`);
}

const shopLd = `<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'ButcherShop', name: shop.name, url: D.site + '/', telephone: '+1-718-555-0142', email: shop.email,
  address: { '@type': 'PostalAddress', streetAddress: shop.street, addressLocality: 'Brooklyn', addressRegion: 'NY', postalCode: '11249', addressCountry: 'US' },
  openingHoursSpecification: [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '19:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Sunday', opens: '10:00', closes: '17:00' },
  ],
}).replace(/</g, '\\u003c')}</script>`;
// typographer's quotes in text (not in tags or attributes)
const curly = (t) => t.replace(/(\w)'/g, '$1’').replace(/'(\w)/g, '‘$1').replace(/"(?=\S)/g, '“').replace(/(?<=\S)"/g, '”');
const curlyHtml = (h) => h.replace(/>([^<]+)</g, (m, t) => '>' + curly(t) + '<');

// ---------- home ----------
const tpl = fs.readFileSync(path.join(ROOT, 'src/home.html'), 'utf8');
const farmsRows = Object.values(D.farms).map((f) => `<tr><th scope="row">${esc(f.name)}</th><td>${esc(f.place)}</td><td class="num">${f.miles}</td><td>${esc(f.raises)}</td></tr>`).join('');
const diagrams = ['beef', 'pork', 'lamb'].map((sp, i) => `<div class="cutmap__view" data-cutmap="${sp}" ${i ? 'hidden' : ''}>${R.diagramSVG(D, sp)}</div>`).join('');
const home = tpl
  .replace('{{note}}', esc(shop.note))
  .replace('{{signed}}', esc(D.clock.signed))
  .replace('{{counterText}}', esc(shop.counter.text)).replace('{{counterName}}', esc(shop.counter.name)).replace('{{counterWhere}}', esc(shop.counter.where))
  .replace('{{farmerText}}', esc(shop.farmer.text)).replace('{{farmerName}}', esc(shop.farmer.name)).replace('{{farmerWhere}}', esc(shop.farmer.where))
  .replaceAll('{{butcherFirst}}', esc(shop.butcher.split(' ')[0]))
  .replaceAll('{{butcher}}', esc(shop.butcher))
  .replace('{{diagrams}}', diagrams)
  .replace('{{board}}', `${R.chalkHTML(D, '')}<div id="full-list">${R.boardHTML(D, '')}</div>`)
  .replace('{{map}}', fs.readFileSync(path.join(ROOT, 'content/nyc-map.svg'), 'utf8'))
  .replace('{{farms}}', farmsRows)
  .replace('{{special}}', ((l) => l.slice(0, -1).join(', ') + ' and ' + l.at(-1))(D.specialOrders.slice(0, -1).map((o) => esc((o.short || o.name).toLowerCase()))));
out('index.html', layout({ root: '', file: 'index.html', page: 'home', jsonld: shopLd, title: 'Eat Your Meat · Whole-animal butchers in Brooklyn', description: 'Whole-animal butcher shop in Williamsburg, Brooklyn. Every cut from this week’s animals, priced by the pound. Same-evening delivery in Brooklyn and Manhattan, overnight to the lower 48.', body: home }));

// ---------- drawings of each cut, until there's a photo from the block ----------
fs.rmSync(path.join(ROOT, 'assets/draw'), { recursive: true, force: true });
for (const it of D.items) if (!it.img) out(`assets/draw/${it.id}.svg`, drawCut(it.id));

// ---------- product pages ----------
// remove pages for cuts that are no longer in the catalog
for (const f of fs.existsSync(path.join(ROOT, 'cuts')) ? fs.readdirSync(path.join(ROOT, 'cuts')) : []) if (!D.items.some((i) => `${i.id}.html` === f)) fs.rmSync(path.join(ROOT, 'cuts', f));
for (const it of D.items) {
  const cfg = S.defaultCfg(it);
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: it.name, description: it.desc, sku: it.id,
    image: it.img ? `${D.site}/assets/img/${it.img}.webp` : undefined,
    brand: { '@type': 'Brand', name: 'Eat Your Meat' },
    offers: {
      '@type': 'Offer', url: `${D.site}/cuts/${it.id}.html`, priceCurrency: 'USD', price: S.unitPrice(it, cfg).toFixed(2),
      availability: it.stock ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      ...(it.unit === 'lb' ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: it.price.toFixed(2), priceCurrency: 'USD', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'LBR' } } } : {}),
    },
  };
  out(`cuts/${it.id}.html`, layout({
    root: '../', file: `cuts/${it.id}.html`, page: 'product', ogType: 'product', ogImage: it.img || 'shop/breakdown',
    title: `${it.name} · ${R.perUnit(it)} · Eat Your Meat`,
    description: `${it.desc}`.slice(0, 155),
    jsonld: `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
    body: `<div class="wrap">${R.pdpHTML(D, it, '../', NOTES[it.id] || [])}</div>`,
  }));
}

// ---------- info pages ----------
for (const p of pages) {
  const body = `<article class="wrap prose"><h1>${esc(curly(p.title))}</h1>${p.sections.map((s) => `${s.heading ? `<h2 id="${s.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}">${esc(curly(s.heading))}</h2>` : ''}${curlyHtml(relLinks(s.html, '')).replace(/<table>/g, `<div class="tablewrap" role="region" tabindex="0" aria-label="${esc(s.heading || p.title)}, table"><table>`).replace(/<\/table>/g, '</table></div>')}`).join('\n')}</article>`;
  out(`${p.slug}.html`, layout({ root: '', file: `${p.slug}.html`, page: p.slug, title: `${curly(p.title)} · Eat Your Meat`, description: curly(p.description), body, jsonld: p.slug === 'contact' ? shopLd : '' }));
}

// ---------- account and gift cards (filled in by app.js) ----------
out('account.html', layout({ root: '', file: 'account.html', page: 'account', noindex: true, title: 'Your account · Eat Your Meat', description: 'Your orders and Butcher’s Box subscriptions: skip a box, cancel, or look up an order.',
  body: `<div class="wrap prose prose--app"><h1>Your account</h1><p>Your orders, subscriptions and gift cards are saved in this browser.</p>
  <section aria-labelledby="subs-h"><h2 id="subs-h">Butcher’s Box subscriptions</h2><div data-subs></div></section>
  <section aria-labelledby="gift-h"><h2 id="gift-h">Gift cards</h2><div data-gifts></div></section>
  <section aria-labelledby="look-h"><h2 id="look-h">Find an order</h2><form class="lookup" data-lookup><label for="look">Ticket number</label><div class="lookup__row"><input id="look" name="n" inputmode="numeric" pattern="[0-9]{1,4}" maxlength="4" required placeholder="47"><button class="btn btn--ink" type="submit">Find</button></div></form><div data-lookup-out aria-live="polite"></div></section>
  <section aria-labelledby="ord-h"><h2 id="ord-h">Your orders</h2><div data-orders></div></section></div>` }));
out('gift-cards.html', layout({ root: '', file: 'gift-cards.html', page: 'gift', title: 'Gift cards · Eat Your Meat', description: 'Eat Your Meat gift cards, sent by email. Good for anything on the board or the Butcher’s Box.',
  body: `<div class="wrap prose prose--app"><h1>Gift cards</h1><p>We send it by email with your note. It’s good for anything on the board, pickup, delivery or the Butcher’s Box.</p>
  <form class="gift" data-gift><fieldset class="opt"><legend>Amount</legend><div class="opt__row">${D.giftCards.map((a, i) => `<label><input type="radio" name="amount" value="${a}" ${i === 1 ? 'checked' : ''}><span>${S.sign(a)}</span></label>`).join('')}</div></fieldset>
  <label class="field">Your name<input name="from" autocomplete="name" maxlength="60" required></label>
  <label class="field">Recipient’s email<input type="email" name="to" autocomplete="off" required></label>
  <p class="err" data-gift-err aria-live="polite"></p>
  <label class="field"><span>Note <small>(optional)</small></span><textarea name="note" rows="3" maxlength="200"></textarea></label>
  <button class="btn btn--red" type="submit">Put it on my ticket</button></form></div>` }));

out('404.html', layout({ root: '/', file: '404.html', page: '404', noindex: true, title: 'Not on the board · Eat Your Meat', description: 'That page isn’t on the board.',
  body: `<div class="gone"><h1 class="gone__line"><span class="gone__name">that page</span><span class="gone__note">gone</span></h1><p class="gone__text">Not on the board this week. Try the board, or ask at the counter.</p><p><a class="btn btn--paper" href="/index.html#board">See the board</a> <a class="btn btn--paper" href="/contact.html">Contact</a></p></div>` }));

// ---------- sitemap + robots ----------
const urls = ['', ...pages.map((p) => `${p.slug}.html`), 'gift-cards.html', ...D.items.map((i) => `cuts/${i.id}.html`)];
out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${D.site}/${u}</loc></url>`).join('\n')}\n</urlset>\n`);
out('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${D.site}/sitemap.xml\n`);
console.log(`built index + ${D.items.length} cuts + ${pages.length} pages + account + gift cards`);
