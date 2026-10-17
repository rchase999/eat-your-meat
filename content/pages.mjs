// Page copy for the static info pages. Every fact comes from eym-research/v2/FACTS.md.
export const pages = [
  {
    slug: 'about',
    title: 'About us',
    description: 'A whole-animal butcher shop in Williamsburg, Brooklyn, since 2019. Four farms within 220 miles, beef hung 21 days, every cut sold until it runs out.',
    sections: [
      {
        heading: null,
        html: `<p>Eat Your Meat is a whole-animal butcher shop at Kent Ave and N 4th St in Williamsburg, Brooklyn. We opened in 2019.</p>
<p>We buy whole animals from four farms, all within 220 miles of the shop, and cut them up ourselves. We sell nearly every cut, nose to tail, until it's gone. To see what's left from this week's animals, check the <a href="/#board">board</a>.</p>`,
      },
      {
        heading: 'The farms',
        html: `<table>
<thead><tr><th scope="col">Farm</th><th scope="col">Where</th><th scope="col">Distance from the shop</th><th scope="col">What we buy</th></tr></thead>
<tbody>
<tr><th scope="row">Kittle Hollow Farm</th><td>Delhi, NY (Delaware County)</td><td>156 miles</td><td>Angus-Hereford cross steers, raised on grass, with a little grain in the last 90 days.</td></tr>
<tr><th scope="row">Two Creeks Farm</th><td>Kutztown, PA</td><td>114 miles</td><td>Berkshire-cross pigs raised outdoors, finished on a barley and acorn ration in the fall.</td></tr>
<tr><th scope="row">Ridgeback Farm</th><td>Salem, NY (Washington County)</td><td>207 miles</td><td>Katahdin lambs raised on pasture, about 7 months old at slaughter.</td></tr>
<tr><th scope="row">Old Mill Poultry</th><td>Lancaster County, PA</td><td>161 miles</td><td>Pasture-raised chickens, air-chilled.</td></tr>
</tbody>
</table>`,
      },
      {
        heading: 'Our week',
        html: `<p>The animals come in on Monday. The shop is closed to walk-ins that day, because that's when we cut. Dani does the pigs and the chickens, and Marisol the lambs and then the steer, which has already hung 21 days in our cooler. By late Monday morning the new board is up, here and online.</p>
<p>We buy the whole animal and pay for all of it, neck and shanks included, so everything on the board stays there until it sells. A steer has one hanger steak. When it's gone, the next one comes with the next steer.</p>
<div class="about-photos"><figure><span class="standin">Stand-in photo</span><img src="assets/img/shop/cutting.webp" alt="Gloved hands slicing a beef roast on a wooden block" width="1200" height="900" loading="lazy"><figcaption>On the block</figcaption></figure><figure><span class="standin">Stand-in photo</span><img src="assets/img/shop/scale.webp" alt="A hanging scale weighing ground meat, with sausage links on the steel counter" width="1200" height="900" loading="lazy"><figcaption>On the scale</figcaption></figure><figure><span class="standin">Stand-in photo</span><img src="assets/img/shop/sausage.webp" alt="Hands twisting fresh sausage into links" width="1200" height="900" loading="lazy"><figcaption>Into sausage</figcaption></figure></div>
<p>Butcher's Boxes are cut on Wednesday. Whatever's left at the end of the week becomes sausage and stock: the trim goes into the grinder, the bones simmer for 12 hours, and the fat is rendered into tallow.</p>`,
      },
      {
        heading: 'In their words',
        html: `<p class="hand">"Buying the whole animal means selling the whole animal. Most weeks the neck and the shanks go last, so that's what I cook at home."</p>
<p><strong>Marisol Vega</strong>, head butcher, 22 years at the block, the last seven here</p>
<p class="hand hand--t">"Saturday mornings it's short ribs and whole chickens. If you want the short ribs, order Friday."</p>
<p><strong>Theo</strong>, at the counter</p>
<p class="hand hand--j">"He was the one who pushed to the front at feeding time. Grass his whole life, and a little grain at the end. Heavy for his age, and calm on the trailer, which matters more than people think."</p>
<p><strong>Jen Kittle</strong>, Kittle Hollow Farm, on this week's steer</p>`,
      },
    ],
  },
  {
    slug: 'delivery',
    title: 'Delivery',
    description: 'Same-evening courier in Brooklyn and Manhattan, overnight shipping to the lower 48, or free pickup in Williamsburg. Cutoffs, fees and what arrives.',
    sections: [
      {
        heading: null,
        html: `<p>You can get your order three ways: our courier the same evening in Brooklyn and Manhattan, overnight shipping to the lower 48 states, or pickup at the shop. All times are Eastern.</p>
<table>
<thead><tr><th scope="col">Option</th><th scope="col">Where</th><th scope="col">Order by</th><th scope="col">Arrives</th><th scope="col">Fee</th></tr></thead>
<tbody>
<tr><th scope="row">Same-evening courier</th><td>Brooklyn (ZIPs 11201–11256) and Manhattan (ZIPs 10001–10282)</td><td>2 PM, Tue–Sun</td><td>5–9 PM the same day</td><td>$8, free on $100 of meat or more (gift cards don't count)</td></tr>
<tr><th scope="row">Overnight shipping</th><td>The lower 48 states</td><td>Noon, Mon–Wed</td><td>The next day, by end of day local time</td><td>$19, free on $200 of meat or more (gift cards don't count)</td></tr>
<tr><th scope="row">Pickup</th><td>The shop, Kent Ave &amp; N 4th St</td><td>Any time</td><td>Ready in 2 hours, during opening hours</td><td>Free</td></tr>
</tbody>
</table>`,
      },
      {
        heading: 'Same-evening courier',
        html: `<p>Order by 2 PM and our courier brings it between 5 and 9 PM that evening, Tuesday through Sunday. We text you when the courier leaves the shop, so give us a number that gets texts.</p>
<p>Orders after 2 PM go out on the next courier day. There's no courier on Monday because the shop is closed, so an order placed after 2 PM on Sunday arrives Tuesday evening.</p>`,
      },
      {
        heading: 'Overnight shipping',
        html: `<p>Order by noon on Monday, Tuesday or Wednesday and we ship it that day. It arrives the next day by end of day, local time. The shop is closed to customers on Monday, but we're in cutting and packing.</p>
<p>Orders placed after noon on Wednesday ship the following Monday. We stop there so nothing sits in a carrier's depot over the weekend.</p>`,
      },
      {
        heading: `Where we don't deliver`,
        html: `<p>We don't ship to Alaska, Hawaii, US territories or anywhere outside the US.</p>
<p>Our boxes are packed to stay below 40°F for 48 hours, and we only ship where we can count on next-day arrival. That means the lower 48. Raw meat import rules make shipping outside the US impractical, so we don't try.</p>`,
      },
      {
        heading: 'What arrives',
        html: `<p>Courier orders come cold in an insulated bag. Shipped orders come in an insulated box with dry ice. Handle the dry ice with gloves or a towel, and let what's left evaporate somewhere with fresh air.</p>
<p>Put everything in the fridge or freezer as soon as it arrives. Storage times are on the <a href="/food-safety.html">food safety</a> page.</p>`,
      },
      {
        heading: 'If it arrives warm',
        html: `<p>The meat should feel fridge-cold. If it doesn't, don't cook it. Take a photo of the meat and the packaging and contact us within 48 hours at <a href="mailto:hello@eatyourmeat.example">hello@eatyourmeat.example</a> or <a href="tel:+17185550142">(718) 555-0142</a>. We'll refund or replace it. The details are in our <a href="/refunds.html">refund policy</a>.</p>`,
      },
    ],
  },
  {
    slug: 'faq',
    title: 'Common questions',
    description: `Why prices are estimates, what "charged by actual weight" means, why cuts sell out, freezing, canceling the Butcher's Box and special orders.`,
    sections: [
      {
        heading: 'Why is the price an estimate?',
        html: `<p>Because we don't know the exact weight until we cut it. Every animal is a little different, so a ribeye from one steer won't weigh the same as a ribeye from the next. Each item shows an approximate weight and an estimated price based on it.</p>`,
      },
      {
        heading: 'What does "charged by actual weight" mean?',
        html: `<p>We price meat per pound and charge for what's on the scale after we cut your order. If your chops come in a bit heavy, you pay a bit more. If they come in light, you pay less. It's usually within 10% of the estimate, and the charge is capped at the estimate plus 10%. If a piece comes in heavier than that, the extra is on us.</p>
<p>A few things are priced per piece instead: stock by the quart, tallow by the jar, and gift cards.</p>`,
      },
      {
        heading: 'Why is something sold out?',
        html: `<p>We buy whole animals, and each one only has so much of each cut. A steer has one hanger steak. When a cut sells out, it's out until the next animal comes in. The <a href="/#board">board</a> shows what's left this week.</p>`,
      },
      {
        heading: 'Can you cut it thicker?',
        html: `<p>Usually, if we still have that part of the animal in one piece. Write the thickness you want under "Add a note for the counter" on the product page, or call before you order. If we can't do it, we call you before we cut. A thicker steak weighs more, so the price goes up with it.</p>`,
      },
      {
        heading: `How do I cancel the Butcher's Box?`,
        html: `<p>In your <a href="/account.html">Account</a>, by email or by phone. Boxes are cut on Wednesdays. Skip or cancel any time before Sunday 11:59 PM Eastern and that week's box won't be cut or charged. There's no cancellation fee.</p>`,
      },
      {
        heading: `What's in the butcher's pick?`,
        html: `<p>A fixed list of cuts for each box size, with a note from Marisol. You can see the whole list before you order, or pick your own 6, 10 or 14 cuts.</p>`,
      },
      {
        heading: 'Can I freeze it?',
        html: `<p>Yes. Vacuum-sealed, it keeps up to 6 months in the freezer. Thaw it in the fridge, not on the counter. Fresh, steaks and roasts keep 3–5 days in the fridge, and ground meat and poultry 1–2 days. More on the <a href="/food-safety.html">food safety</a> page.</p>`,
      },
      {
        heading: 'Do you ship to Alaska or Hawaii?',
        html: `<p>No. Overnight shipping covers the lower 48 states only, and we don't ship to US territories or outside the US. The <a href="/delivery.html">delivery</a> page explains why.</p>`,
      },
      {
        heading: `Can you get me something you don't stock?`,
        html: `<p>Often, yes. Duck, rabbit, goat, quail, guinea hen and farm-raised venison usually come in within a week. A whole suckling pig needs 10 days' notice.</p>
<p>Venison is farm-raised only, because wild game can't legally be sold in the US.</p>`,
      },
    ],
  },
  {
    slug: 'contact',
    title: 'Contact',
    description: 'Address, hours, phone and email for Eat Your Meat, a whole-animal butcher shop in Williamsburg, Brooklyn. Cutting requests and wholesale too.',
    sections: [
      {
        heading: null,
        html: `<p>The phone number and email below are placeholders for this sample shop, so nobody will answer them.</p>`,
      },
      {
        heading: 'Visit',
        html: `<p>Kent Ave &amp; N 4th St, Brooklyn, NY 11249</p>
<ul>
<li>Tuesday to Saturday: 9 AM–7 PM</li>
<li>Sunday: 10 AM–5 PM</li>
<li>Monday: closed</li>
</ul>`,
      },
      {
        heading: 'Call or email',
        html: `<ul>
<li>Phone: <a href="tel:+17185550142">(718) 555-0142</a></li>
<li>Email: <a href="mailto:hello@eatyourmeat.example">hello@eatyourmeat.example</a></li>
</ul>`,
      },
      {
        heading: 'Cutting requests',
        html: `<p>Want a thicker chop or something we don't stock? Call during opening hours, or email us the cut, the size and the day you need it. Special orders usually take about a week; the <a href="/faq.html">FAQ</a> has the list.</p>`,
      },
      {
        heading: 'Wholesale',
        html: `<p>Restaurants and shops can email the same address: <a href="mailto:hello@eatyourmeat.example">hello@eatyourmeat.example</a>.</p>`,
      },
    ],
  },
  {
    slug: 'refunds',
    title: 'Refunds and replacements',
    description: 'If something is wrong with your order, like spoiled meat, a warm box or the wrong cut, tell us within 48 hours with a photo and we refund or replace it.',
    sections: [
      {
        heading: 'What we refund or replace',
        html: `<p>If something is wrong with your order, we refund it or replace it. Wrong means:</p>
<ul>
<li>It's spoiled.</li>
<li>It arrived warm.</li>
<li>It's the wrong cut.</li>
</ul>`,
      },
      {
        heading: 'How to ask',
        html: `<ol>
<li>Contact us within 48 hours of getting your order.</li>
<li>Send a photo of the meat and the packaging.</li>
<li>Include your order number.</li>
</ol>
<p>Email <a href="mailto:hello@eatyourmeat.example">hello@eatyourmeat.example</a> or call <a href="tel:+17185550142">(718) 555-0142</a>. If you think something is spoiled or it arrived warm, don't cook it.</p>`,
      },
      {
        heading: `What we can't refund`,
        html: `<p>Some things are out of our hands once the meat leaves the shop:</p>
<ul>
<li>A steak cooked past where you wanted it. Our product pages list pull temperatures, and you can call and ask before you cook.</li>
<li>Meat left out after delivery, or kept longer than the storage times on the <a href="/food-safety.html">food safety</a> page.</li>
<li>A change of mind after delivery. We can't sell raw meat again once it has left the shop.</li>
<li>Weight differences. You pay for actual weight, which is usually within 10% of the estimate. That's how the price works, not a mistake.</li>
<li>An order sent to a wrong address that was entered at checkout. See the <a href="/shipping.html">shipping policy</a>.</li>
</ul>`,
      },
      {
        heading: `Butcher's Box`,
        html: `<p>You can skip or cancel before Sunday 11:59 PM Eastern with no fee. After that, that week's box goes ahead: it's cut on Wednesday and charged then, at actual weight. If anything in it is wrong, the same rules apply.</p>`,
      },
    ],
  },
  {
    slug: 'shipping',
    title: 'Shipping policy',
    description: 'Shipping terms for Eat Your Meat: courier zones, overnight schedule, fees, packaging, carrier delays, weather and address errors. All times Eastern.',
    sections: [
      {
        heading: null,
        html: `<p>This policy covers courier delivery, overnight shipping and pickup. All times are Eastern. For a plainer walkthrough, see <a href="/delivery.html">delivery</a>.</p>`,
      },
      {
        heading: 'Where we deliver',
        html: `<ul>
<li><strong>Same-evening courier:</strong> Brooklyn (ZIPs 112xx) and Manhattan (ZIPs 10001–10282).</li>
<li><strong>Overnight shipping:</strong> the lower 48 states.</li>
<li><strong>Pickup:</strong> at the shop, Kent Ave &amp; N 4th St, Brooklyn, NY 11249.</li>
</ul>
<p>We don't ship to Alaska, Hawaii, US territories or addresses outside the US.</p>`,
      },
      {
        heading: 'Schedule and fees',
        html: `<table>
<thead><tr><th scope="col">Option</th><th scope="col">Order by</th><th scope="col">Delivered</th><th scope="col">Fee</th></tr></thead>
<tbody>
<tr><th scope="row">Same-evening courier</th><td>2 PM, Tue–Sun</td><td>5–9 PM the same day</td><td>$8, free on $100 of meat or more (gift cards don't count)</td></tr>
<tr><th scope="row">Overnight shipping</th><td>Noon, Mon–Wed</td><td>The next day, by end of day local time</td><td>$19, free on $200 of meat or more (gift cards don't count)</td></tr>
<tr><th scope="row">Pickup</th><td>Any time</td><td>Ready in 2 hours, during opening hours</td><td>Free</td></tr>
</tbody>
</table>
<p>Courier orders placed after 2 PM go out on the next courier day. There's no courier on Monday. Overnight orders placed after noon on Wednesday ship the following Monday, so nothing sits in a carrier's depot over the weekend.</p>`,
      },
      {
        heading: 'Packaging',
        html: `<p>Courier orders travel in insulated bags. Shipped orders go in an insulated box with dry ice, packed to stay below 40°F for 48 hours.</p>`,
      },
      {
        heading: 'Carriers and delays',
        html: `<p>Once an order leaves the shop, a courier or shipping carrier is moving it, but getting it to you cold is still our job. If an order arrives warm or spoiled for any reason, a carrier delay included, tell us within 48 hours with a photo and we'll refund or replace it under our <a href="/refunds.html">refund policy</a>.</p>
<p>If bad weather is forecast along the route, we may hold an overnight box until the next ship day. We'll tell you before we do.</p>`,
      },
      {
        heading: 'Address errors',
        html: `<p>Check your address and phone number before you order. We text courier customers when the courier leaves, so the phone number matters. If you spot a mistake, call us right away; if the order hasn't left, we'll fix it. We can't refund or replace an order delivered to a wrong address that was entered at checkout.</p>`,
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy',
    description: 'What a small butcher shop needs to deliver your order, who we share it with, and how to ask us to delete it.',
    sections: [
      {
        heading: null,
        html: `<p>Your ticket, orders and gift cards are saved in your own browser, on your device. Clearing your browser's data for this site deletes them.</p>`,
      },
      {
        heading: `What we'd collect and why`,
        html: `<ul>
<li><strong>Name and delivery address</strong>, to get the order to you.</li>
<li><strong>Phone number</strong>, to text you when the courier leaves and to call if there's a problem with your order.</li>
<li><strong>Email</strong>, to contact you about your order or your Butcher's Box.</li>
</ul>
<p>Card details go to our payment processor. We don't store them.</p>`,
      },
      {
        heading: `Who we'd share it with`,
        html: `<ul>
<li>The payment processor, to charge your card.</li>
<li>Our courier, for same-evening orders: the name, address and phone number on the order.</li>
<li>The shipping carrier, for overnight orders: the name, address and phone number on the order.</li>
</ul>
<p>Each gets what it needs for its part of the job and nothing more. We don't sell your data.</p>`,
      },
      {
        heading: 'Cookies and storage',
        html: `<p>The site stores only what your ticket needs, in your browser. There are no advertising or tracking cookies.</p>`,
      },
      {
        heading: 'Deleting your information',
        html: `<p>Email <a href="mailto:hello@eatyourmeat.example">hello@eatyourmeat.example</a> or call <a href="tel:+17185550142">(718) 555-0142</a> and ask. We'll tell you what we have and delete it.</p>`,
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of sale',
    description: `Terms of sale for Eat Your Meat: prices by the pound, estimates and actual weight, availability, Butcher's Box renewal and cancellation, New York law.`,
    sections: [
      {
        heading: 'Prices and weight',
        html: `<p>Meat is priced per pound. Each item shows an approximate weight and an estimated price. We charge the actual weight after cutting, which is usually within 10% of the estimate, so your final total can be a little higher or lower than the estimate at checkout. We don't charge more than the estimate plus 10%.</p>
<p>A few items are priced per piece: stock by the quart, tallow by the jar, and gift cards.</p>`,
      },
      {
        heading: 'Availability',
        html: `<p>We sell whole animals cut by cut. When a cut sells out, it's out until the next animal. If something on your order sells out before we cut it, we'll tell you, and you won't be charged for it.</p>`,
      },
      {
        heading: `Butcher's Box subscription`,
        html: `<p>The Butcher's Box is our only subscription.</p>
<ul>
<li>You choose 6, 10 or 14 cuts from box-eligible items, or take the butcher's pick: a fixed list for each size, with a note from Marisol.</li>
<li>You choose how often: every 2, 4 or 8 weeks, or one time.</li>
<li>Subscriptions get 10% off the estimated price. One-time boxes get no discount.</li>
<li>A subscription renews automatically on the schedule you picked until you cancel it.</li>
<li>Boxes are cut on Wednesdays and charged when cut, at actual weight, capped at the estimate plus 10%.</li>
<li>You can skip or cancel any time before Sunday 11:59 PM Eastern for that week's box, in your <a href="/account.html">Account</a>, by email or by phone. There's no cancellation fee.</li>
<li>These terms appear next to the order button, and you tick a checkbox to agree to them before a subscription starts.</li>
</ul>`,
      },
      {
        heading: 'Delivery, refunds and privacy',
        html: `<p>Delivery is covered by our <a href="/shipping.html">shipping policy</a>, problems with an order by our <a href="/refunds.html">refund policy</a>, and your information by our <a href="/privacy.html">privacy policy</a>.</p>`,
      },
      {
        heading: 'Governing law',
        html: `<p>These terms are governed by the laws of the State of New York.</p>`,
      },
    ],
  },
  {
    slug: 'food-safety',
    title: 'Food safety',
    description: 'How long fresh meat keeps in the fridge and freezer, how to thaw it safely, and USDA safe minimum internal temperatures for beef, pork, lamb and poultry.',
    sections: [
      {
        heading: 'How long it keeps',
        html: `<table>
<thead><tr><th scope="col">What</th><th scope="col">Fridge</th><th scope="col">Freezer, vacuum-sealed</th></tr></thead>
<tbody>
<tr><th scope="row">Steaks, chops and roasts</th><td>3–5 days</td><td>Up to 6 months</td></tr>
<tr><th scope="row">Ground meat and poultry</th><td>1–2 days</td><td>Up to 6 months</td></tr>
</tbody>
</table>
<p>Keep your fridge at 40°F or below and your freezer at 0°F. Store raw meat on the bottom shelf so nothing drips onto food you won't cook.</p>`,
      },
      {
        heading: 'Thawing',
        html: `<ul>
<li><strong>In the fridge.</strong> The safest way. Steaks and chops usually thaw overnight. A big roast can take a day or more. Meat thawed in the fridge can go back in the freezer if your plans change.</li>
<li><strong>In cold water.</strong> Faster. Keep the meat in its sealed package, put it under cold tap water, and change the water every 30 minutes. Cook it as soon as it has thawed.</li>
<li><strong>Not on the counter.</strong> The outside warms up past 40°F while the middle is still frozen, and that's the range where bacteria grow fast.</li>
</ul>`,
      },
      {
        heading: 'USDA safe minimum internal temperatures',
        html: `<table>
<thead><tr><th scope="col">What</th><th scope="col">Safe minimum</th></tr></thead>
<tbody>
<tr><th scope="row">Beef, pork and lamb steaks, chops and roasts</th><td>145°F, then rest 3 minutes</td></tr>
<tr><th scope="row">Ground beef, pork and lamb, including fresh sausage</th><td>160°F</td></tr>
<tr><th scope="row">Poultry, whole, in pieces or ground</th><td>165°F</td></tr>
</tbody>
</table>
<p>Check with an instant-read thermometer in the thickest part, away from the bone.</p>`,
      },
      {
        heading: 'Pull temperatures on our product pages',
        html: `<p>Our product pages list chef-style pull temperatures. For whole cuts of beef, pork and lamb they're lower than the USDA numbers, because you take the meat off the heat early and it keeps cooking while it rests. For poultry and ground meat they're the USDA numbers or higher.</p>
<p>The USDA numbers above are the safe minimums. For ground meat and poultry, go by the USDA numbers. If you're cooking for someone who is pregnant, older, very young or has a weakened immune system, use them for everything.</p>`,
      },
    ],
  },
  {
    slug: 'accessibility',
    title: 'Accessibility',
    description: 'We aim for WCAG 2.2 AA. What we have done, what still falls short, and how to tell us about a problem on the Eat Your Meat site.',
    sections: [
      {
        heading: null,
        html: `<p>We want this site to work for everyone, including people who use a keyboard, a screen reader, zoom or reduced motion. We're aiming for WCAG 2.2 level AA.</p>`,
      },
      {
        heading: `What we've done`,
        html: `<ul>
<li>You can use the site with a keyboard alone.</li>
<li>Whatever has keyboard focus gets a visible outline.</li>
<li>If your device is set to reduce motion, the site turns its animations off.</li>
<li>Text meets WCAG AA contrast: at least 4.5:1 against its background, or 3:1 for large text.</li>
<li>Nothing on the site moves or plays on its own.</li>
</ul>`,
      },
      {
        heading: 'Known limitations',
        html: `<p>Some cuts have no photo yet. Where we can, the page shows a diagram of the animal with the part the cut comes from highlighted instead.</p>
<p>If you find something else that gets in your way, we want to know.</p>`,
      },
      {
        heading: 'Report a problem',
        html: `<p>Email <a href="mailto:hello@eatyourmeat.example">hello@eatyourmeat.example</a> or call <a href="tel:+17185550142">(718) 555-0142</a>. Tell us the page, what you were trying to do, and what you were using: browser, screen reader, zoom or anything else.</p>`,
      },
    ],
  },
];
