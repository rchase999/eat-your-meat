// Eat Your Meat catalog. Concept store: every value here is sample data (see the site notice).
// Shared by the browser (window.EYM_DATA) and the Node build (module.exports).
(function (root) {
  const data = {
    site: 'https://eat-your-meat-iota.vercel.app',
    shop: {
      name: 'Eat Your Meat',
      street: 'Kent Ave & N 4th St',
      cityLine: 'Brooklyn, NY 11249',
      mapUrl: 'https://www.openstreetmap.org/search?query=Kent%20Ave%20%26%20N%204th%20St%2C%20Brooklyn%2C%20NY',
      phone: '(718) 555-0142',
      phoneHref: 'tel:+17185550142',
      email: 'hello@eatyourmeat.example',
      since: 2019,
      hours: [['Tue–Sat', '9 AM–7 PM'], ['Sun', '10 AM–5 PM'], ['Mon', 'Closed']],
      // The week, in Eastern time. Animals are cut Monday and the board goes up online at `boardUp`;
      // sold-out times (items[].soldOut) are on that Monday. On open days the board is rewritten at `rechalk`.
      boardUp: '11:20',
      rechalk: '8:40',
      butcher: 'Marisol Vega',
      // initials on the labels: who cut it (animals[].by)
      crew: { MV: 'Marisol Vega, head butcher', DO: 'Dani Okafor, butcher' },
      // the butcher's weekly note, written when the board goes up
      note: 'Good steer this week. The Kittles kept him on grass to the end, and the fat’s yellow and sweet. Two big pigs and a little one, so ask which shoulder you’re getting. Got a smoker? Ask me for the lamb breast.',
      // other people who get a word in
      farmer: { name: 'Jen Kittle', where: 'Kittle Hollow Farm', text: 'He was the one who pushed to the front at feeding time. Grass his whole life, and a little grain at the end. Heavy for his age, and calm on the trailer, which matters more than people think.' },
      counter: { name: 'Theo', where: 'at the counter', text: 'Saturday mornings it’s short ribs and whole chickens. If you want the short ribs, order Friday.' },
    },

    farms: {
      kittle: { name: 'Kittle Hollow Farm', place: 'Delhi, NY', miles: 156, raises: 'Angus × Hereford steers, raised on grass, with a little grain in the last 90 days' },
      twocreeks: { name: 'Two Creeks Farm', place: 'Kutztown, PA', miles: 114, raises: 'Berkshire-cross pigs raised outdoors' },
      ridgeback: { name: 'Ridgeback Farm', place: 'Salem, NY', miles: 207, raises: 'Katahdin lambs on pasture, about 7 months old' },
      oldmill: { name: 'Old Mill Poultry', place: 'Lancaster County, PA', miles: 161, raises: 'Pasture-raised chickens, air-chilled' },
    },

    // This week's animals, all cut on Monday.
    animals: {
      beef: { label: 'Steer #2186', farm: 'kittle', detail: 'hung 21 days', cut: 'Monday', by: 'MV', chalk: 'Steer #2186 from the Kittles, hung 21 days' },
      pork: { label: '3 pigs', farm: 'twocreeks', detail: 'one on the small side', cut: 'Monday', by: 'DO', chalk: '3 pigs' },
      lamb: { label: '2 lambs', farm: 'ridgeback', detail: 'cut Monday', cut: 'Monday', by: 'MV', chalk: '2 lambs' },
      chicken: { label: '38 chickens', farm: 'oldmill', detail: 'in Monday', cut: 'Monday', by: 'DO', chalk: '38 birds' },
      house: { label: 'Made here', farm: null, detail: 'cured, smoked and rendered in the back', cut: null, by: 'DO' },
    },
    speciesOrder: ['beef', 'pork', 'lamb', 'chicken', 'house'],
    speciesLabel: { beef: 'Beef', pork: 'Pork', lamb: 'Lamb', chicken: 'Chicken', house: 'Made in the shop' },
    // the chalkboard: two columns, and what's written small next to each heading
    chalkCols: [['beef', 'chicken'], ['pork', 'lamb', 'house']],
    chalkNote: { beef: 'per lb', pork: 'Two Creeks', lamb: 'Ridgeback', chicken: 'Old Mill', house: '' },
    chalkLabel: { beef: 'Beef', pork: 'Pork', lamb: 'Lamb', chicken: 'Chicken', house: 'Made here' },

    // Primal names per species, used by the cut diagram and the board filter.
    primals: {
      beef: { head: 'Head', chuck: 'Chuck', rib: 'Rib', loin: 'Loin', round: 'Round', brisket: 'Brisket', plate: 'Plate', flank: 'Flank', shank: 'Shank', tail: 'Tail' },
      pork: { head: 'Head', shoulder: 'Shoulder', loin: 'Loin', belly: 'Belly', leg: 'Leg', hock: 'Hock' },
      lamb: { neck: 'Neck', shoulder: 'Shoulder', rack: 'Rack', loin: 'Loin', leg: 'Leg', breast: 'Breast', shank: 'Shank' },
    },

    // unit 'lb': price is per pound; weight comes from `lb` or the chosen option.
    // unit 'each': price is per piece.
    // options: [{ label, choices: [{ label, lb?, units?, default? }] }]; `lb` sets the weight, `units` is how many stock units it uses.
    // made: replaces the "Cut" line for things we cure, smoke or render, which aren't from this week's animals.
    // chalk: the name as written on the chalkboard (items without it are on the full list only).
    // ring / arrow: the butcher's marks on the chalkboard. says: Marisol, in her own words.
    // img: a photo of this cut from our own shoot; without one, the build draws the cut (content/drawings.mjs).
    items: [
      // ---- Beef: Steer #2186 ----
      { id: 'ribeye-bone-in', name: 'Bone-in ribeye', short: 'Bone-in ribeye', chalk: 'Ribeye, bone in', species: 'beef', primal: 'rib', unit: 'lb', price: 34, stock: 4, bone: 'Bone-in', feeds: 'Feeds 2', cook: 'steak', box: false,
        options: [{ label: 'Thickness', choices: [{ label: '1½″', lb: 1.6, default: true }, { label: '2″', lb: 2.1 }] }],
        says: 'I cook an inch and a half at home and save the two-inch ones for the grill.',
        desc: 'From ribs 6 to 12. The bone slows the heat down, so the meat next to it stays juicy.' },
      { id: 'ribeye', name: 'Ribeye, boneless', short: 'Ribeye', chalk: 'Ribeye', species: 'beef', primal: 'rib', unit: 'lb', price: 38, stock: 6, bone: 'Boneless', feeds: 'Feeds 1–2', cook: 'steak', box: true,
        options: [{ label: 'Thickness', choices: [{ label: '1″', lb: 0.8 }, { label: '1¼″', lb: 1, default: true }, { label: '1½″', lb: 1.2 }] }],
        desc: 'The fattiest steak on the steer, and the most forgiving: an extra minute in the pan won’t ruin it. Salt it an hour ahead.' },
      { id: 'strip', name: 'Strip steak', short: 'Strip', chalk: 'Strip', species: 'beef', primal: 'loin', unit: 'lb', price: 32, stock: 8, bone: 'Boneless', feeds: 'Feeds 1–2', cook: 'steak', box: true,
        options: [{ label: 'Thickness', choices: [{ label: '1″', lb: 0.7 }, { label: '1¼″', lb: 0.9, default: true }, { label: '1½″', lb: 1.1 }] }],
        desc: 'Leaner and firmer than a ribeye, with a strip of fat down one side. Render that edge in the pan first, then cook the steak in the fat.' },
      { id: 'tenderloin', name: 'Tenderloin steak', short: 'Tenderloin', chalk: 'Tenderloin', species: 'beef', primal: 'loin', unit: 'lb', price: 48, stock: 6, bone: 'Boneless', feeds: 'Feeds 1', cook: 'steak', box: false,
        options: [{ label: 'Thickness', choices: [{ label: '1½″', lb: 0.4 }, { label: '2″', lb: 0.55, default: true }] }],
        says: 'People buy it for birthdays. I’d buy the hanger.',
        desc: 'Filet. The most tender cut and the mildest. There’s hardly any fat, so keep it at medium-rare or under.' },
      { id: 'hanger', name: 'Hanger steak', short: 'Hanger', chalk: 'Hanger', ring: true, species: 'beef', primal: 'plate', unit: 'lb', price: 22, lb: 1, stock: 1, bone: 'Boneless', feeds: 'Feeds 2', cook: 'steak', box: false,
        says: 'My favorite steak on the animal.',
        desc: 'One per steer, so one this week. We take the seam out, which leaves you two steaks. Hot pan, medium-rare, slice across the grain.' },
      { id: 'skirt', name: 'Skirt steak', short: 'Skirt', chalk: 'Skirt', species: 'beef', primal: 'plate', unit: 'lb', price: 20, lb: 1.2, stock: 2, bone: 'Boneless', feeds: 'Feeds 2–3', cook: 'steak', box: true,
        desc: 'Long, thin and loose-grained, so it soaks up a marinade. Two minutes a side over high heat, then slice it across the grain.' },
      { id: 'flank', name: 'Flank steak', short: 'Flank', species: 'beef', primal: 'flank', unit: 'lb', price: 18, lb: 1.5, stock: 2, bone: 'Boneless', feeds: 'Feeds 3', cook: 'steak', box: true,
        desc: 'Lean, beefy and the same thickness end to end, so it cooks evenly. Grill it whole and slice it thin for tacos.' },
      { id: 'short-rib', name: 'Short ribs, 3-bone plate', short: 'Short ribs', chalk: 'Short ribs', pin: true, species: 'beef', primal: 'plate', unit: 'lb', price: 14, lb: 4, stock: 2, bone: 'Bone-in', feeds: 'Feeds 4', cook: 'low', box: true,
        desc: 'Three bones in one piece. Braise it for three hours or smoke it for eight, until a fork goes in without a push.' },
      { id: 'brisket', name: 'Brisket', short: 'Brisket', chalk: 'Brisket, whole', species: 'beef', primal: 'brisket', unit: 'lb', price: 11, stock: 1, bone: 'Boneless', feeds: 'Feeds 10–14', cook: 'low', box: false,
        options: [{ label: 'Size', choices: [{ label: 'Whole, point and flat (~12 lb)', lb: 12, default: true }, { label: 'Flat only (~6 lb)', lb: 6 }] }],
        desc: 'Two per steer and one’s gone. We leave a quarter inch of fat on top. If you take the flat only, the point goes into the grinder.' },
      { id: 'chuck-eye', name: 'Chuck eye steak', short: 'Chuck eye', chalk: 'Chuck eye', pin: true, arrow: 'better than the ribeye', species: 'beef', primal: 'chuck', unit: 'lb', price: 19, lb: 0.8, stock: 2, bone: 'Boneless', feeds: 'Feeds 1–2', cook: 'steak', box: true,
        says: 'Eats like a ribeye for half the price. Salt it the night before, cook it hot and take it off at medium-rare.',
        desc: 'The ribeye muscle where it runs into the shoulder. Two per steer.' },
      { id: 'flat-iron', name: 'Flat iron steak', short: 'Flat iron', chalk: 'Flat iron', species: 'beef', primal: 'chuck', unit: 'lb', price: 24, lb: 0.9, stock: 0, soldOut: '12:15', bone: 'Boneless', feeds: 'Feeds 2', cook: 'steak', box: false,
        desc: 'From the top blade in the shoulder. Two per steer, and both went within an hour of the board going up.' },
      { id: 'chuck-roast', name: 'Chuck roast', short: 'Chuck roast', species: 'beef', primal: 'chuck', unit: 'lb', price: 12, stock: 4, bone: 'Boneless', feeds: 'Feeds 4–6', cook: 'low', box: true,
        options: [{ label: 'Size', choices: [{ label: '~2½ lb', lb: 2.5, default: true }, { label: '~4 lb', lb: 4 }] }],
        says: 'This is what I cook on Sundays.',
        desc: 'Pot roast, stew, or shredded for tacos. Low heat and a lot of time.' },
      { id: 'eye-of-round', name: 'Eye of round roast', short: 'Eye of round', species: 'beef', primal: 'round', unit: 'lb', price: 13.5, lb: 3, stock: 2, bone: 'Boneless', feeds: 'Feeds 6', cook: 'steak', good: ['oven'], box: false,
        desc: 'Lean and tight-grained. Roast it rare, chill it overnight and slice it paper-thin for sandwiches.' },
      { id: 'top-round', name: 'Top round steak', short: 'Top round', species: 'beef', primal: 'round', unit: 'lb', price: 12, lb: 1.5, stock: 3, bone: 'Boneless', feeds: 'Feeds 3', cook: 'steak', box: true,
        desc: 'London broil. Marinate it overnight, cook it hot to medium-rare and slice it thin across the grain.' },
      { id: 'ground-beef', name: 'Ground beef, 80/20', short: 'Ground beef', chalk: 'Ground, 80/20', species: 'beef', primal: 'trim', unit: 'lb', price: 10, stock: 30, bone: 'Boneless', feeds: 'Feeds 3–4', cook: 'ground', box: true,
        options: [{ label: 'Pack', choices: [{ label: '1 lb pack', lb: 1, default: true }, { label: '4 × ¼ lb patties', lb: 1 }] }],
        desc: 'Trim from this steer, ground twice. 80% lean.' },
      { id: 'marrow-bones', name: 'Marrow bones, cross-cut', short: 'Marrow bones', species: 'beef', primal: 'shank', unit: 'lb', price: 5.5, lb: 2, stock: 3, bone: 'Bone-in', feeds: null, cook: null, good: ['oven'], box: false,
        desc: 'Leg bones cut into 2-inch rounds. Roast them at 450°F for 15 to 20 minutes and spread the marrow on toast.' },
      { id: 'oxtail', name: 'Oxtail', short: 'Oxtail', chalk: 'Oxtail', species: 'beef', primal: 'tail', unit: 'lb', price: 11, lb: 2.5, stock: 1, bone: 'Bone-in', feeds: 'Feeds 3–4', cook: 'low', box: false,
        desc: 'One tail, cut into sections. Braise it four hours. The sauce sets like jelly when it cools.' },
      { id: 'tongue', name: 'Beef tongue', short: 'Tongue', species: 'beef', primal: 'head', unit: 'lb', price: 8.5, lb: 3, stock: 1, bone: 'Boneless', feeds: 'Feeds 4–6', cook: 'low', box: false,
        desc: 'Simmer it three hours, peel it while it’s warm, then slice and sear.' },

      // ---- Pork: 3 pigs ----
      { id: 'pork-chops', name: 'Pork loin chops, boneless', short: 'Pork chops', chalk: 'Loin chops', species: 'pork', primal: 'loin', unit: 'lb', price: 15, stock: 8, bone: 'Boneless', feeds: 'Feeds 2', cook: 'pork', box: true,
        options: [{ label: 'Pack', choices: [{ label: '2 chops, 1″ (~1 lb)', lb: 1, default: true }, { label: '2 chops, 1½″ (~1.5 lb)', lb: 1.5 }] }],
        desc: 'Outdoor pigs, so the meat’s darker and fattier than supermarket pork. Salt the chops an hour ahead and take them off at 140°F.' },
      { id: 'pork-tenderloin', name: 'Pork tenderloin', short: 'Pork tenderloin', chalk: 'Tenderloin', species: 'pork', primal: 'loin', unit: 'lb', price: 16, lb: 1.1, stock: 0, soldOut: '14:10', bone: 'Boneless', feeds: 'Feeds 2–3', cook: 'pork', box: false,
        desc: 'Three pigs, six tenderloins, all gone the first afternoon. The loin chops are the closest thing on the board.' },
      { id: 'pork-belly', name: 'Pork belly', short: 'Pork belly', chalk: 'Belly, skin on', species: 'pork', primal: 'belly', unit: 'lb', price: 11.5, lb: 2, stock: 3, bone: 'Boneless', feeds: 'Feeds 4', cook: 'low', box: true,
        options: [{ label: 'Skin', choices: [{ label: 'Skin on', default: true }, { label: 'Skin off' }] }],
        desc: 'A two-pound slab. Keep the skin for crackling: score it, salt it overnight and roast it hot at the end.' },
      { id: 'spare-ribs', name: 'Spare ribs', short: 'Spare ribs', species: 'pork', primal: 'belly', unit: 'lb', price: 9.5, lb: 3, stock: 2, bone: 'Bone-in', feeds: 'Feeds 3', cook: 'low', box: false,
        desc: 'A full rack from the belly side. Six hours on the smoker at 225°F, or wrapped in foil in the oven if you live in an apartment.' },
      { id: 'pork-shoulder', name: 'Pork shoulder, bone-in', short: 'Pork shoulder', chalk: 'Shoulder', species: 'pork', primal: 'shoulder', unit: 'lb', price: 8, stock: 3, bone: 'Bone-in', feeds: 'Feeds 6–12', cook: 'low', box: true,
        options: [{ label: 'Size', choices: [{ label: 'Half (~4 lb)', lb: 4, default: true }, { label: 'Whole (~8 lb)', lb: 8, units: 2 }] }],
        says: 'Two big pigs and a little one this week, so the halves run from three to five pounds. Put it in the note if you want a big one.',
        desc: 'Boston butt. For pulled pork, cook it until the bone slides out clean, around 200°F inside.' },
      { id: 'fresh-ham', name: 'Fresh ham, half', short: 'Fresh ham', species: 'pork', primal: 'leg', unit: 'lb', price: 7, lb: 8, stock: 2, bone: 'Bone-in', feeds: 'Feeds 10–12', cook: 'pork', box: false,
        desc: 'The back leg, uncured, skin on. Score the skin and roast it low for five hours.' },
      { id: 'pork-jowl', name: 'Pork jowl', short: 'Jowl', species: 'pork', primal: 'head', unit: 'lb', price: 9, lb: 1, stock: 4, bone: 'Boneless', feeds: null, cook: null, box: false,
        says: 'If you’ve never made guanciale, start with this. Salt, pepper and three weeks in the fridge.',
        desc: 'The cheek, fattier than belly. Slice it and crisp it in a pan, or cure it.' },
      { id: 'pork-hock', name: 'Pork hocks', short: 'Hocks', species: 'pork', primal: 'hock', unit: 'lb', price: 5, lb: 2, stock: 4, bone: 'Bone-in', feeds: null, cook: 'low', box: false,
        desc: 'Two fresh hocks, for a pot of beans or greens.' },
      { id: 'pork-sausage', name: 'Sweet Italian sausage', short: 'Sausage', chalk: 'Sausage, sweet', pin: true, species: 'pork', primal: 'trim', unit: 'lb', price: 13, lb: 1, stock: 14, bone: null, feeds: 'Feeds 3', cook: 'ground', box: true,
        desc: 'This week’s shoulder trim with fennel, garlic and a splash of white wine, in natural casings. Five links to the pound.' },
      { id: 'bacon', name: 'Bacon, house-smoked', short: 'Bacon', chalk: 'Bacon, hickory', species: 'house', primal: null, unit: 'lb', price: 16, lb: 1, stock: 10, bone: null, made: 'Last week’s pigs, cured 7 days, smoked Monday', storage: 'Fridge: up to 7 days. Freezer: up to 1 month.', feeds: null, cook: null, box: true,
        says: 'It’s at its best by the weekend.',
        desc: 'Smoked over hickory in the back and sliced thick. Start it in a cold pan.' },

      // ---- Lamb: 2 lambs ----
      { id: 'lamb-rack', name: 'Rack of lamb, frenched', short: 'Lamb rack', chalk: 'Rack, frenched', species: 'lamb', primal: 'rack', unit: 'lb', price: 34, lb: 1.5, stock: 4, bone: 'Bone-in', feeds: 'Feeds 2–3', cook: 'lamb', box: false,
        desc: 'Eight ribs, bones cleaned. Sear the fat side, roast at 425°F, pull it at 130°F and cut it into chops at the table.' },
      { id: 'lamb-loin-chops', name: 'Lamb loin chops', short: 'Loin chops', chalk: 'Loin chops', species: 'lamb', primal: 'loin', unit: 'lb', price: 26, lb: 0.75, stock: 0, soldOut: '17:30', bone: 'Bone-in', feeds: 'Feeds 1–2', cook: 'lamb', box: false,
        desc: 'Two little T-bones to a pack. Three minutes a side in a hot pan. They go first every week.' },
      { id: 'lamb-shoulder-chops', name: 'Lamb shoulder chops', short: 'Lamb chops', chalk: 'Shoulder chops', species: 'lamb', primal: 'shoulder', unit: 'lb', price: 16, stock: 5, bone: 'Bone-in', feeds: 'Feeds 2', cook: 'lamb', box: true,
        options: [{ label: 'Pack', choices: [{ label: '2 chops (~1.2 lb)', lb: 1.2, default: true }, { label: '4 chops (~2.4 lb)', lb: 2.4, units: 2 }] }],
        desc: 'Cheaper than loin chops, with a few seams of fat. Cook them to medium so the fat softens.' },
      { id: 'lamb-leg', name: 'Leg of lamb, bone-in', short: 'Leg of lamb', species: 'lamb', primal: 'leg', unit: 'lb', price: 14, stock: 3, bone: 'Bone-in', feeds: 'Feeds 4–10', cook: 'lamb', box: true,
        options: [{ label: 'Size', choices: [{ label: 'Half, shank end (~3 lb)', lb: 3, default: true }, { label: 'Whole (~6 lb)', lb: 6, units: 2 }] }],
        desc: 'Stud it with garlic, roast at 350°F and pull it at 135°F. A whole leg feeds ten.' },
      { id: 'lamb-breast', name: 'Lamb breast', short: 'Lamb breast', species: 'lamb', primal: 'breast', unit: 'lb', price: 7.5, lb: 1.5, stock: 3, bone: 'Bone-in', feeds: 'Feeds 2', cook: 'low', box: false,
        desc: 'Lamb’s answer to spare ribs. Rub it with cumin, smoke or roast it low for three hours, then crisp it under the broiler.' },
      { id: 'lamb-shank', name: 'Lamb shank', short: 'Lamb shank', species: 'lamb', primal: 'shank', unit: 'lb', price: 12, lb: 1, stock: 4, bone: 'Bone-in', feeds: 'Feeds 1', cook: 'low', box: true,
        desc: 'One shank. Braise it in wine for two and a half hours until the meat falls off the bone.' },
      { id: 'lamb-neck', name: 'Lamb neck', short: 'Lamb neck', chalk: 'Neck', species: 'lamb', primal: 'neck', unit: 'lb', price: 10, lb: 1.5, stock: 2, bone: 'Bone-in', feeds: 'Feeds 2', cook: 'low', box: false,
        says: 'The best braising cut on the animal.',
        desc: 'One per lamb. Two and a half hours in a covered pot and it falls apart.' },
      { id: 'ground-lamb', name: 'Ground lamb', short: 'Ground lamb', species: 'lamb', primal: 'trim', unit: 'lb', price: 13, lb: 1, stock: 9, bone: 'Boneless', feeds: 'Feeds 3–4', cook: 'ground', box: true,
        desc: 'Shoulder and leg trim, about 80% lean. Kofta, meatballs, or a lamb burger with a lot of mint.' },

      // ---- Chicken: 38 birds ----
      { id: 'whole-chicken', name: 'Whole chicken', short: 'Whole chicken', chalk: 'Whole bird', species: 'chicken', primal: null, unit: 'lb', price: 6.5, lb: 4, stock: 22, bone: 'Bone-in', feeds: 'Feeds 4', cook: 'poultry', box: true,
        options: [{ label: 'Cut', choices: [{ label: 'Whole', default: true }, { label: 'Spatchcocked' }, { label: 'Cut in 8' }] }],
        says: 'Ask for it spatchcocked and it’s dinner in forty-five minutes.',
        desc: 'Air-chilled, so the skin dries and crisps instead of steaming. Salt it the night before and leave it uncovered in the fridge.' },
      { id: 'chicken-thighs', name: 'Chicken thighs, bone-in, skin-on', short: 'Chicken thighs', chalk: 'Thighs', species: 'chicken', primal: null, unit: 'lb', price: 7.5, lb: 1.5, stock: 5, bone: 'Bone-in', feeds: 'Feeds 3', cook: 'thigh', box: true,
        desc: 'Four to a pack. Skin-side down in a cold pan, leave them alone for 15 minutes, flip, finish in the oven.' },
      { id: 'chicken-breasts', name: 'Chicken breasts, boneless', short: 'Chicken breasts', species: 'chicken', primal: null, unit: 'lb', price: 13, lb: 1.2, stock: 10, bone: 'Boneless', feeds: 'Feeds 2', cook: 'breast', box: true,
        desc: 'Two to a pack, skinless. Brine them for 30 minutes in salted water and they won’t dry out.' },
      { id: 'chicken-wings', name: 'Chicken wings', short: 'Chicken wings', species: 'chicken', primal: null, unit: 'lb', price: 6, lb: 2, stock: 3, bone: 'Bone-in', feeds: 'Feeds 2–3', cook: 'wings', box: true,
        desc: 'Whole wings, ten to a pack. 425°F on a rack for 45 minutes, then toss them in whatever sauce you like.' },

      // ---- Made in the shop ----
      { id: 'salami', name: 'Salami, house-cured', short: 'Salami', species: 'house', primal: null, unit: 'lb', price: 32, lb: 0.5, stock: 6, bone: null, kept: 'Dry-cured', made: 'Cured 60 days in the back', storage: 'Whole, in the fridge: up to 6 weeks. Once sliced, wrap it and eat it within 3 weeks.', feeds: null, cook: null, box: false,
        desc: 'Shoulder trim with garlic and black pepper. Slice it thin and eat it at room temperature.' },
      { id: 'beef-stock', name: 'Beef stock', short: 'Beef stock', chalk: 'Stock, quart', pack: 'tub', species: 'house', primal: null, unit: 'each', price: 12, size: '1 quart', stock: 12, bone: null, made: 'Last week’s steer, simmered 12 hours', feeds: null, cook: null, box: false, frozen: true,
        says: 'I use it for everything. Rice, beans, the pan after a steak.',
        desc: 'The bones are roasted first. No salt, so season it when you use it.' },
      { id: 'beef-tallow', name: 'Beef tallow', short: 'Tallow', pack: 'jar', species: 'house', primal: null, unit: 'each', price: 8, size: '8 oz jar', stock: 10, bone: null, kept: 'Shelf-stable', made: 'Rendered last week', storage: 'Refrigerate it once it’s open, and it keeps for months.', feeds: null, cook: null, box: false,
        desc: 'Strained steer fat. Sear steaks in it and roast potatoes in it.' },
    ],

    // Chef-style pull temperatures (°F), lower than USDA minimums for whole cuts; see food-safety page.
    cook: {
      steak: [['Rare', 120], ['Medium-rare', 128], ['Medium', 135]],
      pork: [['Medium', 140], ['Medium-well', 145]],
      lamb: [['Medium-rare', 130], ['Medium', 135]],
      low: [['Fork-tender', 203]],
      ground: [['Safe minimum', 160]],
      poultry: [['Breast', 165], ['Thigh', 175]],
      breast: [['Done', 165]],
      thigh: [['Done', 175]],
      wings: [['Crisp', 180]],
    },

    specialOrders: [
      { name: 'Duck', lead: 'about a week' }, { name: 'Rabbit', lead: 'about a week' }, { name: 'Goat', lead: 'about a week' },
      { name: 'Quail', lead: 'about a week' }, { name: 'Guinea hen', lead: 'about a week' }, { name: 'Venison, farm-raised', short: 'venison', lead: 'about a week' },
      { name: 'Whole suckling pig', lead: '10 days' },
    ],
    notSold: [
      { name: 'Wild venison', why: 'Wild game can’t legally be sold in the US. Farm-raised venison is a special order.' },
    ],

    box: {
      sizes: { 6: 'Dinner for two, about a week', 10: 'A family of four, about a week', 14: 'A family of four, plus leftovers' },
      freqs: { 2: 'Every 2 weeks', 4: 'Every 4 weeks', 8: 'Every 8 weeks', 0: 'One time' },
      picks: {
        6: { ids: ['ground-beef', 'chicken-thighs', 'pork-chops', 'pork-sausage', 'chuck-eye', 'whole-chicken'], note: 'Six dinners. Cook the steak first and keep the whole chicken for Sunday.' },
        10: { ids: ['ground-beef', 'chicken-thighs', 'pork-chops', 'pork-sausage', 'chuck-eye', 'whole-chicken', 'strip', 'lamb-shoulder-chops', 'bacon', 'short-rib'], note: 'The six, plus a strip, lamb chops, bacon, and short ribs to braise on the weekend.' },
        14: { ids: ['ground-beef', 'chicken-thighs', 'pork-chops', 'pork-sausage', 'chuck-eye', 'whole-chicken', 'strip', 'lamb-shoulder-chops', 'bacon', 'short-rib', 'ribeye', 'lamb-shank', 'lamb-leg', 'skirt'], note: 'The ten, plus a ribeye, a lamb shank, a half leg of lamb and skirt for tacos.' },
      },
    },

    giftCards: [50, 100, 200],

    pages: [
      { href: 'delivery.html', label: 'Delivery' }, { href: 'about.html', label: 'About us' }, { href: 'faq.html', label: 'Common questions' },
      { href: 'contact.html', label: 'Contact' }, { href: 'account.html', label: 'Your account' }, { href: 'gift-cards.html', label: 'Gift cards' },
    ],
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.EYM_DATA = data;
})(this);
