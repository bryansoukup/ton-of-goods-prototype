// Ton of Goods prototype: pure game logic (runs in browser and Node).
export const GOAL_LB = 2000, FOOD_REQ = 900, CARD_LB = 50;

export const CAMPS = [
  { name: 'Dyea', theft: 0.30, aval: false, blurb: 'Tidewater beach. Crowded, and thieves are everywhere.' },
  { name: 'Canyon City', theft: 0.22, aval: false, blurb: 'Tent town at the canyon mouth.' },
  { name: 'Sheep Camp', theft: 0.15, aval: true, blurb: 'Last timber. Snow piles up on the slopes above.' },
  { name: 'The Scales', theft: 0.10, aval: true, blurb: 'Packers re-weigh loads here before the Golden Stairs.' },
  { name: 'Chilkoot Summit', theft: 0.05, aval: false, blurb: 'Canadian border. The Mounties inspect every outfit.' },
];
export const LEGS = [
  { name: 'Dyea Flats', loads: 7, cost: 2, sled: true },
  { name: 'Taiya Canyon', loads: 6, cost: 2, sled: true },
  { name: 'Long Hill', loads: 5, cost: 3, snowy: true },
  { name: 'The Golden Stairs', loads: 4, cost: 4, snowy: true, stairs: true },
];
export const DEADLINE = 40;

export const DEFS = {
  flour: { name: 'Flour', kind: 'food', icon: '🌾', text: 'Food.' },
  bacon: { name: 'Bacon', kind: 'food', icon: '🥓', text: 'Food. Can go rancid in an uncovered cache.', rancid: true },
  beans: { name: 'Beans', kind: 'food', icon: '🫘', text: 'Food.' },
  oats: { name: 'Rolled Oats', kind: 'food', icon: '🥣', text: 'Food.' },
  fruit: { name: 'Dried Fruit', kind: 'food', icon: '🍑', text: 'Food. Storms can\'t ruin it.', hardy: true },
  coffee: { name: 'Coffee & Sugar', kind: 'food', icon: '☕', text: 'Food. In your pack: hauling costs 1 less stamina.' },
  tent: { name: 'Tent', kind: 'gear', icon: '⛺', text: 'Where you sleep: +1 stamina a night. Mounties require it.', req: true },
  stove: { name: 'Yukon Stove', kind: 'gear', icon: '🔥', text: 'Where you sleep: +1 stamina a night. Mounties require it.', req: true },
  tools: { name: 'Axe & Whipsaw', kind: 'gear', icon: '🪓', text: 'For the boat. Mounties require one.', req: true },
  woolens: { name: 'Woolens', kind: 'gear', icon: '🧥', text: 'Where you sleep: storms and frostbite cost no stamina.' },
  tarp: { name: 'Oilcloth Tarp', kind: 'gear', icon: '🛡️', text: 'In a cache: storms and rot can\'t touch food there.' },
  rifle: { name: 'Rifle', kind: 'gear', icon: '🔫', text: 'In a cache: halves theft risk there.' },
  snowshoes: { name: 'Snowshoes', kind: 'gear', icon: '🎿', text: 'In your pack: +1 load on Long Hill and the Golden Stairs.' },
  medicine: { name: 'Medicine Chest', kind: 'gear', icon: '💊', text: 'Where you sleep: cures sickness events.' },
  tobacco: { name: 'Trade Tobacco', kind: 'trade', icon: '🚬', text: 'Sell at any camp for $40.' },
  hardware: { name: 'Nails, Pitch & Rope', kind: 'gear', icon: '🔩', text: 'Boat hardware. Dead weight until Lake Bennett.' },
  pans: { name: 'Pots & Pans', kind: 'gear', icon: '🍳', text: 'Kitchen kit.' },
};
const DECK = { flour: 8, bacon: 4, beans: 4, oats: 2, fruit: 2, coffee: 2, tent: 1, stove: 1, tools: 2, woolens: 2, tarp: 2, rifle: 1, snowshoes: 1, medicine: 1, tobacco: 1, hardware: 3, pans: 3 };
// Pack priority for auto-pack (lower = earlier)
const PRIO = { flour: 1, beans: 1, oats: 1, bacon: 1, fruit: 2, hardware: 2, pans: 2, tools: 3, tobacco: 3, medicine: 4, rifle: 5, tarp: 6, woolens: 7, coffee: 0, snowshoes: 0, tent: 9, stove: 9 };

export const CHARACTERS = {
  greenhorn: { name: 'The Greenhorn', cash: 220, stamina: 10, text: '$220 cash, 10 stamina. Money solves problems.' },
  sourdough: { name: 'The Sourdough', cash: 140, stamina: 12, text: '$140 cash, 12 stamina, +1 stamina a night, +1 load every haul, sees weather 2 days ahead.' },
  partners: { name: 'Two Partners', cash: 180, stamina: 10, text: '$180 cash, +2 loads every haul, but eat twice as much.' },
};

// ---------- RNG ----------
function rnd(s) { s.rng = (s.rng + 0x6D2B79F5) | 0; let t = s.rng; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const pick = (s, a) => a[Math.floor(rnd(s) * a.length)];

function rollWeather(s, day) {
  const storm = Math.min(0.32, 0.08 + day * 0.006), snow = 0.28;
  const r = rnd(s);
  return r < storm ? 'storm' : r < storm + snow ? 'snow' : 'clear';
}

export function newGame(seed = Date.now() % 1e9, charKey = 'greenhorn') {
  const ch = CHARACTERS[charKey];
  const s = {
    seed, rng: seed | 0, charKey, day: 1, pos: 0, cash: ch.cash, maxStamina: ch.stamina, stamina: ch.stamina,
    cards: {}, nextId: 1, camps: CAMPS.map(() => ({ cards: [], buried: [] })), snowLoad: [0, 0, 0, 0, 0],
    weather: [], guard: null, packers: false, sled: false, boost: 0, sick: false,
    phase: 'outfitter', event: null, over: null, log: [], seen: {}, flash: [],
    stats: { stolen: 0, buried: 0, ruined: 0, eaten: 0, bought: 0, days: 0, avalanches: 0, thefts: 0, decisions: 0, tram: 0, spent: 0 },
  };
  for (const [k, n] of Object.entries(DECK)) for (let i = 0; i < n; i++) addCard(s, k, 0);
  s.weather = [rollWeather(s, 1), rollWeather(s, 2), rollWeather(s, 3)];
  s.weather[0] = 'clear';
  log(s, `Day 1. You land at Dyea with a ton of goods: 40 sacks and crates, 50 lb each. Get 2,000 lb to the Summit by day ${DEADLINE}.`);
  return s;
}
function addCard(s, k, camp, w = CARD_LB) { const id = s.nextId++; s.cards[id] = { id, k, w }; s.camps[camp].cards.push(id); return id; }
function removeCard(s, id) { for (const c of s.camps) { c.cards = c.cards.filter(x => x !== id); c.buried = c.buried.filter(x => x !== id); } delete s.cards[id]; }
function log(s, msg, tone = '') { s.log.push({ day: s.day, msg, tone }); if (s.log.length > 80) s.log.shift(); }
function flash(s, msg, tone) { s.flash.push({ msg, tone }); log(s, msg, tone); }

export const def = (s, id) => DEFS[s.cards[id].k];
export const campHas = (s, i, k) => s.camps[i].cards.some(id => s.cards[id].k === k);
export const campLb = (s, i) => s.camps[i].cards.reduce((a, id) => a + s.cards[id].w, 0);
export const totalLb = s => Object.values(s.cards).reduce((a, c) => a + c.w, 0);
export const foodLbAt = (s, i) => s.camps[i].cards.filter(id => def(s, id).kind === 'food').reduce((a, id) => a + s.cards[id].w, 0);

export function capacity(s, ids = []) {
  if (s.pos >= LEGS.length) return 0;
  const leg = LEGS[s.pos], w = s.weather[0];
  let n = leg.loads;
  if (s.sled && leg.sled) n += 3;
  if (s.packers) n += 3;
  if (s.charKey === 'partners') n += 2;
  if (s.charKey === 'sourdough') n += 1;
  n += s.boost;
  if (leg.snowy && ids.some(id => s.cards[id]?.k === 'snowshoes')) n += 1;
  if (w === 'snow' && leg.snowy) n -= 1;
  if (w === 'storm') n = leg.stairs ? 0 : Math.floor(n / 2);
  return Math.max(0, n);
}
export function haulCost(s, ids = []) {
  if (s.pos >= LEGS.length) return 99;
  let c = LEGS[s.pos].cost + (s.weather[0] === 'storm' ? 1 : 0) + (s.sick ? 1 : 0);
  if (ids.some(id => s.cards[id]?.k === 'coffee')) c -= 1;
  return Math.max(1, c);
}
export function theftRisk(s, i) {
  if (i === s.pos || s.camps[i].cards.length === 0 || s.guard === i) return 0;
  if (s.day < 3) return 0;
  if (i === 1 && s.seen.protected) return 0;
  let p = CAMPS[i].theft * Math.min(1, 0.5 + s.camps[i].cards.length / 12);
  if (campHas(s, i, 'rifle')) p *= 0.5;
  return Math.round(p * 100) / 100;
}
export function avalancheRisk(s, i) { if (!CAMPS[i].aval) return 0; return Math.min(0.3, Math.max(0, (s.snowLoad[i] - 3) * 0.04)); }
export function stormExposed(s, i) { return i !== s.pos && s.camps[i].cards.length > 0 && !campHas(s, i, 'tarp'); }

export function autoPack(s, sleep = 'origin') {
  // Fill the pack, but if you will sleep here, leave one food load, the tent and the stove behind.
  const here = s.camps[s.pos].cards.slice().sort((a, b) => (PRIO[s.cards[a].k] ?? 5) - (PRIO[s.cards[b].k] ?? 5) || a - b);
  const keep = new Set();
  if (sleep === 'origin') {
    const food = here.filter(id => def(s, id).kind === 'food');
    if (food.length) keep.add(food[food.length - 1]);
    for (const k of ['tent', 'stove', 'woolens']) { const id = here.find(i => s.cards[i].k === k); if (id) keep.add(id); }
    // protect the cache you leave up the trail: send the tarp and rifle up first
    const lead = ['tarp', 'rifle'].map(k => here.find(i => s.cards[i].k === k)).filter(Boolean);
    here.sort((a, b) => (lead.includes(b) ? 1 : 0) - (lead.includes(a) ? 1 : 0));
  } else {
    // leave a tarp and the rifle guarding what stays behind
    for (const k of ['tarp', 'rifle']) { const id = here.find(i => s.cards[i].k === k); if (id) keep.add(id); }
    // sleeping up top: bring tent, stove and one food first
    const first = [];
    for (const k of ['tent', 'stove']) { const id = here.find(i => s.cards[i].k === k); if (id) first.push(id); }
    const f = here.find(i => def(s, i).kind === 'food'); if (f) first.push(f);
    here.sort((a, b) => (first.includes(b) ? 1 : 0) - (first.includes(a) ? 1 : 0));
  }
  const pack = [];
  for (const id of here) { if (keep.has(id)) continue; if (pack.length >= capacity(s, pack)) break; pack.push(id); }
  if (!pack.length) for (const id of here) { if (pack.length >= capacity(s, pack)) break; pack.push(id); }
  while (pack.length > capacity(s, pack)) pack.pop();
  return pack;
}

// ---------- Actions ----------
// returns list of legal action descriptors for bots / UI
export function legal(s) {
  if (s.over) return [];
  if (s.event) return s.event.options.map((o, i) => ({ type: 'choose', i, label: o.label, ok: o.ok !== false }));
  if (s.phase === 'outfitter') return OUTFITTER.map(o => ({ type: 'shop', key: o.key, label: o.label(s), ok: o.ok(s) })).concat([{ type: 'depart', ok: true }]);
  const a = [];
  const here = s.camps[s.pos];
  if (s.pos < LEGS.length && here.cards.length && capacity(s) > 0 && s.stamina >= haulCost(s)) a.push({ type: 'haul', ok: true });
  a.push({ type: 'rest', ok: true });
  if (s.pos > 0) a.push({ type: 'back', ok: s.stamina >= 1 });
  if (s.pos < LEGS.length) a.push({ type: 'up', ok: s.stamina >= 1 });
  if (here.buried.length) a.push({ type: 'dig', ok: s.stamina >= 2 });
  if (campHas(s, s.pos, 'tobacco')) a.push({ type: 'sell', ok: true });
  a.push({ type: 'guard', ok: s.guard === s.pos ? true : s.cash >= 5 });
  if (s.pos <= 1) a.push({ type: 'packers', ok: s.packers || s.cash >= 15 });
  if (s.pos === 3 && here.cards.length) a.push({ type: 'tram', ok: s.cash >= 6 });
  if (s.pos === 4) a.push({ type: 'mounties', ok: true });
  return a;
}

const OUTFITTER = [
  { key: 'sled', label: s => s.sled ? 'Sled bought' : 'Buy a sled ($50): +3 loads a day on the first two legs', ok: s => !s.sled && s.cash >= 50, run: s => { s.sled = true; spend(s, 50); } },
  { key: 'food', label: () => 'Buy a 50 lb sack of beans ($15): cover what you eat and lose', ok: s => s.cash >= 15, run: s => { addCard(s, 'beans', 0); spend(s, 15); s.stats.bought++; } },
  { key: 'tarp', label: () => 'Buy an extra oilcloth tarp ($12)', ok: s => s.cash >= 12, run: s => { addCard(s, 'tarp', 0); spend(s, 12); s.stats.bought++; } },
];
function spend(s, n) { s.cash -= n; s.stats.spent += n; }

export function act(s, a) {
  if (s.over) return s;
  s.flash = [];
  s.stats.decisions++;
  if (a.type === 'choose') { const ev = s.event; const o = ev.options[a.i]; if (o.ok === false) return s; s.event = null; EVENTS[ev.key].resolve(s, o.v, ev); return s; }
  if (a.type === 'shop') { const o = OUTFITTER.find(x => x.key === a.key); if (o && o.ok(s)) { o.run(s); } return s; }
  if (a.type === 'depart') { s.phase = 'trail'; log(s, 'You leave the outfitter. Pick loads and haul them up the trail.'); return s; }
  switch (a.type) {
    case 'haul': {
      let ids = (a.ids && a.ids.length ? a.ids : autoPack(s, a.sleep)).filter(id => s.camps[s.pos].cards.includes(id));
      ids = ids.slice(0, capacity(s, ids));
      const cost = haulCost(s, ids);
      if (!ids.length || s.stamina < cost) return s;
      const from = s.pos, to = s.pos + 1;
      s.camps[from].cards = s.camps[from].cards.filter(id => !ids.includes(id));
      s.camps[to].cards.push(...ids);
      s.stamina -= cost; s.boost = 0;
      if (s.packers) spend(s, 10);
      const sleepUp = a.sleep === 'dest' || s.camps[from].cards.length === 0;
      if (sleepUp) s.pos = to;
      log(s, `Hauled ${ids.length} loads (${ids.length * 50} lb) up ${LEGS[from].name} to ${CAMPS[to].name}. ${sleepUp ? 'You camp with them.' : 'You walk back down to ' + CAMPS[from].name + '.'}`);
      if (s.packers && s.cash < 10) { s.packers = false; log(s, 'You can no longer pay the packers. They leave.'); }
      if (to === 4 && !s.seen.summitArrive) { s.seen.summitArrive = 1; flash(s, 'First loads reach the Summit. The Mounties watch from their hut.', 'good'); }
      return endDay(s);
    }
    case 'rest': { s.stamina = Math.min(s.maxStamina, s.stamina + 3); if (s.sick) { s.sick = false; log(s, 'The fever breaks.', 'good'); } log(s, 'You rest a day at ' + CAMPS[s.pos].name + '.'); return endDay(s, true); }
    case 'back': if (s.pos > 0 && s.stamina >= 1) { s.pos--; s.stamina--; log(s, `You hike down to ${CAMPS[s.pos].name} (1 stamina).`); } return s;
    case 'up': if (s.pos < 4 && s.stamina >= 1) { s.pos++; s.stamina--; log(s, `You climb empty-handed to ${CAMPS[s.pos].name} (1 stamina).`); } return s;
    case 'dig': { const c = s.camps[s.pos]; if (!c.buried.length || s.stamina < 2) return s; c.cards.push(...c.buried); log(s, `You dig out ${c.buried.length} buried loads.`, 'good'); c.buried = []; s.stamina -= 2; return endDay(s); }
    case 'sell': { const id = s.camps[s.pos].cards.find(i => s.cards[i].k === 'tobacco'); if (id) { removeCard(s, id); s.cash += 40; log(s, 'Sold the trade tobacco for $40.'); } return s; }
    case 'guard': {
      if (s.guard === s.pos) { s.guard = null; log(s, 'You dismiss the watchman.'); return s; }
      if (s.cash < 5) return s; s.guard = s.pos; log(s, `You hire a watchman at ${CAMPS[s.pos].name} ($5 for each night you are away). Nothing is stolen from a guarded camp.`); return s;
    }
    case 'packers': {
      if (s.packers) { s.packers = false; log(s, 'You let the Tlingit packers go.'); return s; }
      if (s.cash < 15) return s; s.packers = true; spend(s, 15); log(s, 'You hire Tlingit packers: $15 now, then $10 per haul day, +3 loads every haul.', 'good'); return s;
    }
    case 'tram': {
      const here = s.camps[3]; const n = Math.min(a.n || 6, here.cards.length, Math.floor(s.cash / 6)); if (n <= 0) return s;
      const ids = (a.ids && a.ids.length ? a.ids : here.cards.slice()).slice(0, n);
      here.cards = here.cards.filter(id => !ids.includes(id)); s.camps[4].cards.push(...ids); spend(s, 6 * n); s.stats.tram += n;
      log(s, `The aerial tramway lifts ${n} loads to the Summit ($${6 * n}). Unguarded up there, though.`, 'good'); return s;
    }
    case 'mounties': return inspect(s);
  }
  return s;
}

export function inspection(s) {
  const lb = campLb(s, 4), food = foodLbAt(s, 4);
  const missing = ['tent', 'stove', 'tools'].filter(k => !campHas(s, 4, k));
  return { lb, food, missing, shortLb: Math.max(0, GOAL_LB - lb), shortFood: Math.max(0, FOOD_REQ - food), behind: [0, 1, 2, 3].reduce((a, i) => a + campLb(s, i) + s.camps[i].buried.length * 50, 0) };
}
function inspect(s) {
  const r = inspection(s);
  if (!r.shortLb && !r.shortFood && !r.missing.length) return win(s, 'The Mountie weighs your outfit: ' + r.lb.toLocaleString() + ' lb. "Welcome to Canada."');
  const short = Math.max(r.shortLb, r.shortFood);
  const buyCost = Math.ceil(short / 50) * 12 + r.missing.length * 25;
  const opts = [];
  opts.push({ label: `Buy from quitters at the summit: $${buyCost}`, v: 'buy', ok: s.cash >= buyCost, cost: buyCost });
  opts.push({ label: 'Slip the Mountie $60 (risky)', v: 'bribe', ok: s.cash >= 60 });
  if (r.behind > 0) opts.push({ label: `Go back for the ${r.behind} lb still on the trail`, v: 'later' });
  opts.push({ label: 'Give up and turn back', v: 'quit' });
  s.event = { key: 'mountie', title: 'Mountie inspection', text: `Corporal checks your outfit: ${r.lb} lb (needs ${GOAL_LB}), ${r.food} lb food (needs ${FOOD_REQ})${r.missing.length ? ', missing: ' + r.missing.map(k => DEFS[k].name).join(', ') : ''}.`, options: opts };
  return s;
}
function win(s, msg) { s.over = { win: true, reason: msg }; s.stats.days = s.day; log(s, msg, 'good'); return s; }
function lose(s, msg) { s.over = { win: false, reason: msg }; s.stats.days = s.day; log(s, msg, 'bad'); return s; }

export function score(s) {
  const r = inspection(s);
  if (s.over?.win) return 1000 + Math.max(0, DEADLINE - s.day) * 40 + s.cash + Math.max(0, r.lb - GOAL_LB);
  return Math.round(r.lb / 4);
}

// ---------- Night ----------
function endDay(s, rested = false) {
  // eat
  const need = s.charKey === 'partners' ? 5 : 3;
  let left = need;
  const food = s.camps[s.pos].cards.filter(id => def(s, id).kind === 'food').sort((a, b) => s.cards[a].w - s.cards[b].w);
  for (const id of food) { if (!left) break; const t = Math.min(left, s.cards[id].w); s.cards[id].w -= t; left -= t; s.stats.eaten += t; if (s.cards[id].w <= 0) removeCard(s, id); }
  if (left > 0) { s.stamina -= 2; flash(s, `No food at ${CAMPS[s.pos].name}. You go to bed hungry (−2 stamina).`, 'bad'); }
  // recover
  let rec = 1 + (campHas(s, s.pos, 'tent') ? 1 : 0) + (campHas(s, s.pos, 'stove') ? 1 : 0) + (s.charKey === 'sourdough' ? 1 : 0);
  if (s.sick) rec -= 1;
  s.stamina = Math.min(s.maxStamina, s.stamina + rec);
  const w = s.weather[0];
  // guard pay
  if (s.guard !== null && s.guard !== s.pos) { if (s.cash >= 5) spend(s, 5); else { s.guard = null; log(s, 'You can\'t pay the watchman. He walks off.'); } }
  // storm
  if (w === 'storm') {
    if (!campHas(s, s.pos, 'woolens')) { s.stamina -= 1; flash(s, 'A storm howls all night. Without woolens you shiver (−1 stamina).', 'bad'); }
    s.camps.forEach((c, i) => {
      if (!stormExposed(s, i)) return;
      const f = c.cards.filter(id => def(s, id).kind === 'food' && !def(s, id).hardy);
      if (f.length && rnd(s) < 0.5) { const id = pick(s, f); const nm = def(s, id).name; s.stats.ruined += s.cards[id].w; removeCard(s, id); flash(s, `Storm soaks an uncovered cache at ${CAMPS[i].name}: ${nm} ruined.`, 'bad'); }
    });
  }
  // rancid bacon in uncovered unguarded caches on clear days
  if (w === 'clear') s.camps.forEach((c, i) => {
    if (i === s.pos || campHas(s, i, 'tarp')) return;
    const b = c.cards.filter(id => DEFS[s.cards[id].k].rancid);
    if (b.length && rnd(s) < 0.10) { const id = b[0]; s.stats.ruined += s.cards[id].w; removeCard(s, id); flash(s, `Bacon left uncovered at ${CAMPS[i].name} turns rancid.`, 'bad'); }
  });
  // theft
  s.camps.forEach((c, i) => {
    const p = theftRisk(s, i);
    if (p && rnd(s) < p) {
      const n = c.cards.length >= 10 && rnd(s) < 0.5 ? 2 : 1;
      const names = [];
      for (let k = 0; k < n && c.cards.length; k++) { const id = pick(s, c.cards); names.push(def(s, id).name); s.stats.stolen += s.cards[id].w; removeCard(s, id); }
      s.stats.thefts++;
      flash(s, `Thieves hit your cache at ${CAMPS[i].name}: ${names.join(' and ')} gone.`, 'bad');
    }
  });
  // snow load + avalanche
  s.camps.forEach((c, i) => {
    if (!CAMPS[i].aval) return;
    s.snowLoad[i] = Math.max(0, s.snowLoad[i] + (w === 'storm' ? 2 : w === 'snow' ? 1 : -1));
    const p = avalancheRisk(s, i);
    if (p && rnd(s) < p) {
      s.snowLoad[i] = 0; s.stats.avalanches++;
      const n = Math.ceil(c.cards.length * 0.5);
      for (let k = 0; k < n; k++) { const id = pick(s, c.cards); c.cards = c.cards.filter(x => x !== id); c.buried.push(id); }
      s.stats.buried += n * 50;
      if (s.pos === i) { s.stamina -= 3; flash(s, `AVALANCHE at ${CAMPS[i].name}! It roars through camp. You crawl out (−3 stamina); ${n} loads buried.`, 'bad'); }
      else flash(s, `AVALANCHE at ${CAMPS[i].name}! ${n ? n + ' of your loads are buried. Spend a day there to dig them out.' : 'Luckily nothing of yours was there.'}`, 'bad');
    }
  });
  // advance day
  s.day++;
  s.weather.shift(); s.weather.push(rollWeather(s, s.day + 2));
  if (s.stamina < 0) s.stamina = 0;
  if (s.day > DEADLINE) return lose(s, `Day ${DEADLINE}: winter closes the Chilkoot. Your outfit is stranded on the trail.`);
  if (s.day === DEADLINE - 5) flash(s, 'Five days until the pass closes for winter.', 'bad');
  // scripted choice moments on first arrival, then random events
  const scripted = !s.seen['arrive' + s.pos] && ARRIVE[s.pos];
  if (scripted) { s.seen['arrive' + s.pos] = 1; s.event = ARRIVE[s.pos](s); }
  else if (s.day > 2 && rnd(s) < 0.3) { const pool = Object.entries(EVENTS).filter(([k, e]) => e.random && (s.seen['ev_' + k] || 0) < (e.max || 1) && (!e.when || e.when(s))); if (pool.length) { const [k, e] = pick(s, pool); s.seen['ev_' + k] = (s.seen['ev_' + k] || 0) + 1; s.event = { key: k, ...e.make(s) }; } }
  return s;
}

// ---------- Events ----------
const ARRIVE = {
  1: s => ({ key: 'packersOffer', title: 'Tlingit packers', text: 'At Canyon City, Tlingit packers offer to carry for you. They know this trail better than anyone. $15 up front, then $10 every haul day, for +3 loads per haul.', options: [{ label: 'Hire them ($15, then $10/haul)', v: 'yes', ok: s.cash >= 15 }, { label: 'Haul it yourself', v: 'no' }] }),
  2: s => ({ key: 'soapy', title: 'A friendly stranger', text: 'A smooth-talking man at Sheep Camp says he is with "the Telegraph Office" and can wire your family for $10. Soapy Smith\'s gang runs this con. Or you could pay a camp regular $20 to keep an eye on your Canyon City cache for good.', options: [{ label: 'Pay the "telegraph" ($10)', v: 'con', ok: s.cash >= 10 }, { label: 'Pay $20 to protect the Canyon City cache', v: 'protect', ok: s.cash >= 20 && s.camps[1].cards.length > 0 }, { label: 'Ignore him', v: 'no' }] }),
  3: s => ({ key: 'tramOffer', title: 'The Scales', text: 'Above you, the Golden Stairs: 1,500 steps cut in the ice. A new aerial tramway lifts goods to the Summit for $6 per 50 lb load. You can use it any day you are at the Scales.', options: [{ label: 'Good to know', v: 'ok' }] }),
};
export const EVENTS = {
  packersOffer: { resolve(s, v) { if (v === 'yes' && s.cash >= 15) act(s, { type: 'packers' }); s.stats.decisions--; } },
  soapy: { resolve(s, v) { if (v === 'con') { spend(s, 10); flash(s, 'There is no telegraph line. Soapy\'s man pockets your $10 and laughs.', 'bad'); } if (v === 'protect') { spend(s, 20); s.seen.protected = 1; log(s, 'The Canyon City cache is now watched for free.', 'good'); } } },
  tramOffer: { resolve() { } },
  mountie: {
    resolve(s, v, ev) {
      if (v === 'buy') { const c = ev.options[0].cost; spend(s, c); s.stats.bought += Math.ceil(c / 12); return win(s, `You buy the shortfall from busted stampeders for $${c}. The Mountie stamps your papers.`); }
      if (v === 'bribe') { spend(s, 60); if (rnd(s) < (s.seen.honest ? 0.8 : 0.35)) return win(s, 'The Mountie pockets the $60 and looks the other way. You\'re through, but it was close.'); return lose(s, 'The Mountie is insulted by the bribe. He turns you back to Dyea. Run over.'); }
      if (v === 'quit') return lose(s, 'You sell what you can at the summit and head home. The Klondike will have to wait.');
    }
  },
  shell: { random: true, max: 2, when: s => s.pos <= 1 && s.cash >= 20, make: () => ({ title: 'Shell game', text: 'A man in a bowler hat runs a shell game on a barrel. "Find the pea, triple your money!"', options: [{ label: 'Bet $20', v: 'bet' }, { label: 'Walk away', v: 'no' }] }), resolve(s, v) { if (v !== 'bet') return; if (rnd(s) < 0.33) { s.cash += 40; flash(s, 'You find the pea! +$40.', 'good'); } else { spend(s, 20); flash(s, 'The pea was never under any shell. −$20.', 'bad'); } } },
  quitter: { random: true, max: 2, when: s => s.cash >= 20, make: () => ({ title: 'A quitter', text: 'A stampeder is giving up and going home. He\'ll sell you two 50 lb sacks of flour, right here, for $20.', options: [{ label: 'Buy (+100 lb here, $20)', v: 'yes' }, { label: 'No thanks', v: 'no' }] }), resolve(s, v) { if (v === 'yes') { spend(s, 20); addCard(s, 'flour', s.pos); addCard(s, 'flour', s.pos); s.stats.bought += 2; log(s, 'You buy two sacks of flour.', 'good'); } } },
  beggar: { random: true, when: s => s.camps[s.pos].cards.some(id => def(s, id).kind === 'food'), make: () => ({ title: 'A hungry stampeder', text: 'A man who lost everything in the canyon begs for food. He offers to haul for you tomorrow in return.', options: [{ label: 'Give him a food load (−50 lb, +3 loads next haul)', v: 'give' }, { label: 'Refuse', v: 'no' }] }), resolve(s, v) { if (v !== 'give') return; const id = s.camps[s.pos].cards.find(i => def(s, i).kind === 'food'); if (id) { removeCard(s, id); s.boost = 3; log(s, 'He eats like a wolf, then shoulders a pack beside you.', 'good'); } } },
  sickness: { random: true, make: s => ({ title: 'Fever', text: 'You wake shaking with fever.', options: campHas(s, s.pos, 'medicine') ? [{ label: 'Use the medicine chest (cured)', v: 'med' }] : [{ label: 'Push on sick (+1 haul cost, −1 recovery until you rest)', v: 'push' }] }), resolve(s, v) { if (v === 'push') s.sick = true; else log(s, 'Quinine and rest. You feel fine.', 'good'); } },
  wallet: { random: true, make: () => ({ title: 'Found purse', text: 'You find a leather purse in the snow with $25 and no name in it.', options: [{ label: 'Keep it (+$25)', v: 'keep' }, { label: 'Hand it to the Mounties\' lost-and-found', v: 'hand' }] }), resolve(s, v) { if (v === 'keep') s.cash += 25; else { s.seen.honest = 1; log(s, 'The Mounties will remember an honest man.', 'good'); } } },
  stolenGoods: { random: true, when: s => s.stats.stolen > 0 && s.cash >= 15, make: () => ({ title: 'Familiar sacks', text: 'A trader is selling a sack with your initials on it.', options: [{ label: 'Buy it back ($15, +50 lb here)', v: 'buy' }, { label: 'Let it go', v: 'no' }] }), resolve(s, v) { if (v === 'buy') { spend(s, 15); addCard(s, 'beans', s.pos); log(s, 'You buy back your own beans.', ''); } } },
};
