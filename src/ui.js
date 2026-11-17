import * as G from './game.js';
import * as A from './audio.js';
import * as FX from './fx.js';
const $ = s => document.querySelector(s);
const app = $('#app'), modal = $('#modal'), sheet = $('#sheet'), toasts = $('#toasts');
const W = { clear: 'Clear', snow: 'Snow', storm: 'Storm' };
let s = null, pack = {}, screen = 'title', moreOpen = false, packOpen = null;
const ART = { flour: 'flour', bacon: 'bacon', beans: 'beans', oats: 'flour', fruit: 'beans', coffee: 'coffee', tent: 'tent', stove: 'stove', tools: 'tools', woolens: 'woolens', tarp: 'tarp', rifle: 'rifle', snowshoes: 'snowshoes', medicine: 'medicine', tobacco: 'tobacco', hardware: 'hardware', pans: 'pans' };
const PORTRAIT = { greenhorn: 'Recommended first run', sourdough: '', partners: '' };
const CH_STATS = { greenhorn: ['$280', '11 stamina'], sourdough: ['$140', '12 stamina', '+1 load', '+1 rest', '2-day forecast'], partners: ['$130', '+2 loads', 'eats double'] };
const CH_FLAVOR = { greenhorn: 'A clerk from Seattle with a fat wallet and soft hands.', sourdough: 'Thirty winters in the North. Reads the sky like a newspaper.', partners: 'Two brothers, one rope, twice the appetite.' };
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };

function save() { if (s && !s.over) store.set('tog_run', s); else store.set('tog_run', null); }
function esc(t) { return String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

function toast(msg, tone = '') { while (toasts.children.length >= 3) toasts.firstChild.remove(); const d = document.createElement('div'); d.className = 'toast ' + tone; d.textContent = msg; toasts.appendChild(d); setTimeout(() => d.remove(), tone === 'bad' ? 5200 : 3500); }

function doAct(a) {
  const prevDay = s.day, before = s.camps.map((c, i) => G.campLb(s, i)), cash0 = s.cash, avs = s.stats.avalanches, thefts = s.stats.thefts, ruined = s.stats.ruined;
  const fromEl = document.getElementById('camp' + s.pos);
  const toEl = a.type === 'haul' ? document.getElementById('camp' + (s.pos + 1)) : null;
  const haulN = a.type === 'haul' ? (a.ids && a.ids.length ? a.ids.length : 6) : 0;
  G.act(s, a);
  pack = {}; toasts.innerHTML = ''; moreOpen = false;
  for (const f of s.flash) toast(f.msg, f.tone);
  if (s.day !== prevDay) { for (const f of s.flash) { const m = f.msg.match(/at ([A-Z][a-zA-Z ]+?)[:!.]/); const i = m ? G.CAMPS.findIndex(c => c.name === m[1].trim()) : -1; if (i >= 0) shakeCamp(i); } }
  if (a.type === 'haul') {
    A.sfx('drop', 0.65);
    setTimeout(() => A.sfx('step1', 0.5), 120);
    setTimeout(() => A.sfx('step2', 0.5), 380);
    setTimeout(() => A.sfx('thud', 0.9), 560);
    FX.haulFly(fromEl, toEl, haulN);
  } else if (a.type === 'use') A.sfx(['tobacco', 'pans'].includes(a.k) ? 'coins' : 'flip', 0.7);
  else if (a.type === 'rest') A.sfx('thud', 0.4);
  else if (a.type === 'choose' || a.type === 'shop') A.sfx('place', 0.6);
  else if (['tram', 'packers', 'guard', 'work'].includes(a.type)) A.sfx('coins', 0.6);
  else if (a.type === 'mounties') { A.sfx('thud', 0.9); setTimeout(() => A.sfx('flip', 0.5), 180); }
  else A.sfx('place', 0.4);
  if (s.stats.avalanches > avs) { A.rumble(2.4); setTimeout(() => FX.shake(document.body, true), 50); }
  else if (s.stats.thefts > thefts) { A.sfx('hit', 0.75); setTimeout(() => FX.shake(document.body), 50); }
  else if (s.stats.ruined > ruined) { A.sfx('hit', 0.55); setTimeout(() => FX.shake(document.body), 50); }
  save(); render();
  s.camps.forEach((c, i) => { const d = G.campLb(s, i) - before[i]; if (d) FX.floatText(document.getElementById('camp' + i), (d > 0 ? '+' : '−') + Math.abs(d) + ' lb', d > 0 ? 'good' : 'bad'); });
  if (s.cash !== cash0) FX.floatText(document.querySelector('.chip.cash'), (s.cash > cash0 ? '+$' : '−$') + Math.abs(s.cash - cash0), s.cash > cash0 ? 'good' : 'bad');
  FX.setSnow(s.weather[0] === 'storm' ? 2.2 : s.weather[0] === 'snow' ? 0.9 : 0.4, s.weather[0] === 'clear' ? 0.25 : s.weather[0] === 'snow' ? 0.7 : 1);
  A.windLevel(s.weather[0] === 'storm' ? 0.9 : s.weather[0] === 'snow' ? 0.45 : 0.22);
  if (s.over) finish();
}
let shakeQ = [];
function shakeCamp(i) { shakeQ.push(i); }

// ---------- Teaching (UI only; game rules unchanged) ----------
function reached(st) {
  let r = st.pos;
  st.camps.forEach((c, i) => { if (c.cards.length || c.buried.length) r = Math.max(r, i); });
  return r;
}
function tut(st) {
  const r = reached(st);
  return { cache: r >= 1, hazard: r >= 2, packers: r >= 1, tram: r >= 3, pack: st.pos >= 1 };
}
function tipOnce(key, html) {
  const seen = store.get('tog_tips', {});
  if (seen[key]) return '';
  seen[key] = 1; store.set('tog_tips', seen);
  return `<div class="coach">${html}</div>`;
}
function packingOn() { return packOpen ?? tut(s).pack; }
function pile(n) {
  if (!n) return '<span class="pile"></span>';
  return `<span class="pile" aria-hidden="true">${'<i></i>'.repeat(Math.min(18, n))}</span>`;
}
function pips(cur, max, cost = 0) {
  return `<span class="pips" aria-label="Stamina ${cur} of ${max}">${Array.from({ length: max }, (_, i) => `<i class="${i < cur - cost ? 'on' : i < cur ? 'cost' : 'off'}"></i>`).join('')}</span>`;
}

// ---------- Title / character select ----------
function title() {
  screen = 'title'; document.body.classList.remove('ingame'); modal.classList.add('hidden');
  FX.setSnow(1.6, 1); A.setBed('title'); A.windLevel(0.35);
  app.innerHTML = `<div class="title" id="title">
    <div class="art"></div><div class="vig"></div>
    <div class="top">
      <div class="kicker">KLONDIKE · 1897</div>
      <h1 class="logo">Ton<span class="of">or</span>Starve</h1>
      <div class="rule">✦</div>
      <p class="hook">The Mounties demand a ton.<br>You can carry fifty pounds.</p>
    </div>
    <div class="bottom">
      <div class="fan" aria-hidden="true">${['flour', 'snowshoes', 'rifle'].map(k => `<div class="tc" style="background-image:url(assets/cards/${k}.webp)"><span>50 LB</span></div>`).join('')}</div>
      <button class="cta" id="begin">Begin the Climb</button>
      <div class="tagline">A strategy roguelite · <b>Prototype</b>: one leg, Dyea to the Summit · about 12 min</div>
    </div></div>`;
  $('#begin').onclick = () => { A.unlock(); A.sfx('fan', 0.7); selectChar(); };
  $('#title').addEventListener('pointerdown', () => A.unlock(), { once: true });
}
function selectChar() {
  screen = 'select'; document.body.classList.remove('ingame'); modal.classList.add('hidden');
  const saved = store.get('tog_run', null), best = store.get('tog_best', null), runs = store.get('tog_runs', 0);
  app.innerHTML = `<div class="select"><div class="art"></div>
    <h2>Who Goes North?</h2>
    <p class="lead">Haul 2,000 lb over the Chilkoot before the pass closes. Whatever you leave behind gets robbed, buried or soaked.</p>
    <div class="chars">${Object.entries(G.CHARACTERS).map(([k, c]) => `<button class="char" data-c="${k}"><div class="frame">
      ${PORTRAIT[k] ? `<div class="ribbon">${PORTRAIT[k]}</div>` : ''}
      <img src="assets/img/${k}.webp" alt="" loading="eager">
      <div class="body"><div class="nm">${esc(c.name.replace('The ', ''))}</div>
      <div class="stats">${CH_STATS[k].map(x => `<span class="st">${x}</span>`).join('')}</div>
      <div class="fl">${CH_FLAVOR[k]}</div></div></div></button>`).join('')}</div>
    <div class="selectfoot">${saved ? `<button id="cont">Continue run: day ${saved.day}, ${esc(G.CHARACTERS[saved.charKey].name)}</button>` : ''}<button id="backTitle">← Title</button></div>
    <p class="sub" style="color:#a89678;font-size:12px;margin-top:14px">Sound: Kenney.nl (CC0) · Title music synthesized for this prototype (CC0) · Fonts: Rye &amp; IM Fell (SIL OFL) · Art generated for this prototype</p>
    <p class="sub" style="color:#cbb896">${runs ? `Runs: ${runs} · Best score: ${best ? best.score : '-'}` : ''}</p>
  </div>`;
  app.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { A.unlock(); A.sfx('place', 0.8); start(b.dataset.c); });
  $('#cont') && ($('#cont').onclick = () => { A.unlock(); A.setBed('game'); s = saved; screen = 'game'; render(); if (s.event) showEvent(); });
  $('#backTitle').onclick = () => title();
}
function howTo() {
  return `<details><summary>How to play</summary><ul>
  <li><b>Haul</b> moves a day's loads up to the next camp. The game packs for you unless you choose the loads.</li>
  <li><b>The camp you sleep at is guarded.</b> Every other pile is a cache at risk.</li>
  <li>Cards matter by where they sit: a tent or stove where you sleep restores stamina; a tarp covers a cache; a rifle halves theft; snowshoes in your pack help on snowy legs.</li>
  <li>You eat a little food each night where you sleep. Snow can avalanche at the upper camps. At the Summit, the Mounties want a full ton, enough food, a tent, a stove and tools before the pass closes.</li></ul></details>`;
}
function start(charKey) {
  const q = new URLSearchParams(location.search).get('seed');
  s = G.newGame(q ? +q : Math.floor(Math.random() * 1e9), charKey);
  screen = 'game'; pack = {}; packOpen = null; moreOpen = false; save();
  A.setBed('game'); FX.setSnow(0.4, 0.3); A.windLevel(0.25); render(); outfitter();
}

// ---------- Outfitter ----------
function outfitter() {
  const opts = G.legal(s);
  modal.classList.remove('hidden');
  const meta = {
    sled: { name: 'Sled', price: '$50', blurb: 'Heavier hauls on the first two legs.' },
    food: { name: 'Beans', price: '$15', blurb: 'A spare sack for the trail.' },
    tarp: { name: 'Tarp', price: '$12', blurb: 'Covers a cache in a storm.' },
  };
  sheet.innerHTML = `<h2>Dyea outfitter</h2>
  <p>Your ton is packed. Cash left buys help on the trail.</p>
  <div class="shop">${opts.filter(o => o.type === 'shop').map(o => {
    const m = meta[o.key] || { name: o.label, price: '', blurb: '' };
    const bought = /bought/i.test(o.label);
    return `<button data-k="${o.key}" ${o.ok ? '' : 'disabled'}><b>${esc(bought ? m.name + ' bought' : m.name)}</b><em>${esc(bought ? '' : m.price)}</em><span>${esc(m.blurb)}</span></button>`;
  }).join('')}</div>
  <div class="opts"><button class="primary" id="go">Head up the trail</button></div>
  <p class="sub cashline">$${s.cash} in your pocket.</p>`;
  sheet.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { G.act(s, { type: 'shop', key: b.dataset.k }); A.sfx('coins', 0.5); save(); render(); outfitter(); });
  $('#go').onclick = () => { G.act(s, { type: 'depart' }); A.sfx('fan', 0.55); modal.classList.add('hidden'); save(); render(); };
}

// ---------- Events ----------
function showEvent() {
  const ev = s.event; if (!ev) return;
  if (modal.classList.contains('hidden')) A.sfx('flip', 0.6);
  modal.classList.remove('hidden');
  sheet.innerHTML = `<h2>${esc(ev.title)}</h2><p>${esc(ev.text)}</p>
  <div class="opts">${ev.options.map((o, i) => `<button data-i="${i}" ${o.ok === false ? 'disabled' : ''}>${esc(o.label)}</button>`).join('')}</div>`;
  sheet.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { modal.classList.add('hidden'); doAct({ type: 'choose', i: +b.dataset.i }); });
}

// ---------- Main render ----------
function packIds() {
  const ids = [];
  for (const [k, n] of Object.entries(pack)) { const avail = s.camps[s.pos].cards.filter(id => s.cards[id].k === k).sort((a, b) => s.cards[b].w - s.cards[a].w); ids.push(...avail.slice(0, n)); }
  return ids;
}
function setPackFromIds(ids) { pack = {}; for (const id of ids) { const k = s.cards[id].k; pack[k] = (pack[k] || 0) + 1; } }

function coach(T) {
  if (s.pos === 4) {
    const behind = [0, 1, 2, 3].some(i => s.camps[i].cards.length || s.camps[i].buried.length);
    if (!behind) return tipOnce('mounties', 'Everything is up. Face the Mounties when you are ready.') || `<div class="coach">Everything is up. Face the Mounties when you are ready.</div>`;
  }
  if (s.camps[s.pos].buried.length) return `<div class="coach">Loads are buried here. Dig them out when you can.</div>`;
  if (s.stamina < 2 && s.camps[s.pos].cards.length) return `<div class="coach">Too tired to haul. Rest, and sleep where your tent and stove are.</div>`;
  if (T.cache) {
    const t = tipOnce('cache', 'You only guard the camp you sleep at. Everything you leave behind is a cache.');
    if (t) return t;
  }
  if (T.packers && s.pos <= 1) {
    const t = tipOnce('packers', 'Tlingit packers will carry more, for a fee. You will find them under More.');
    if (t) return t;
  }
  if (T.hazard) {
    const t = tipOnce('hazard', 'Snow builds on the upper camps. Too much, and the slope lets go.');
    if (t) return t;
  }
  if (T.tram && s.pos === 3) {
    const t = tipOnce('tram', 'The tramway can lift loads to the Summit — for a price. You will find it under More.');
    if (t) return t;
  }
  if (s.day === 1 && s.pos === 0) return `<div class="coach">Haul a day's load up the pass. Walk back tonight, or camp with what you carried.</div>`;
  if (s.weather[1] === 'storm') return `<div class="coach">A storm is coming. Hauling will be harder tomorrow.</div>`;
  return '';
}

function render() {
  if (screen !== 'game' || !s) return;
  document.body.classList.add('ingame');
  const T = tut(s);
  const ins = G.inspection(s);
  const ids = packIds(), cap = G.capacity(s, ids), cost = G.haulCost(s, ids);
  const here = s.camps[s.pos];
  const stormComing = s.weather[1] === 'storm' || s.charKey === 'sourdough';
  const forecast = s.charKey === 'sourdough' ? `${W[s.weather[1]]}, then ${W[s.weather[2]]}` : W[s.weather[1]];
  let bar = null;
  const showGaugeN = T.tram || ins.lb > 0;
  let html = `<div class="status paper">
   <div class="chips"><span class="brand">Ton or Starve</span>
    <span class="chip">Day ${s.day}</span>
    <span class="chip wx">Today ${W[s.weather[0]]}${stormComing ? ' · next ' + forecast : ''}</span>
    ${pips(s.stamina, s.maxStamina, here.cards.length && s.pos < 4 ? cost : 0)}
    <span class="chip cash">$${s.cash}</span>
    ${s.packers ? '<span class="chip">Packers</span>' : ''}${s.sled ? '<span class="chip">Sled</span>' : ''}${s.sick ? '<span class="chip warn">Fever</span>' : ''}
   </div>
   <div class="gauge" id="gauge"><i style="width:${Math.min(100, ins.lb / 20)}%"></i>${[25, 50, 75].map(x => `<span class="tick" style="left:${x}%"></span>`).join('')}<b>${showGaugeN ? ins.lb.toLocaleString() + ' lb at the Summit' : 'Toward the Summit'}</b></div>
   <div class="days" title="Days on the trail"><i style="width:${Math.min(100, (s.day / G.DEADLINE) * 100)}%"></i></div>
  </div>`;

  html += '<div class="gamegrid"><div class="col-l"><div class="trail">';
  for (let i = 4; i >= 0; i--) {
    const c = s.camps[i], tr = G.theftRisk(s, i), av = G.avalancheRisk(s, i);
    const b = [];
    if (i === s.pos) b.push('<span class="badge safe">You: guarded</span>');
    else if (T.cache && (s.guard === i || (i === 1 && s.seen.protected))) b.push('<span class="badge safe">Watched</span>');
    else if (T.cache && c.cards.length && i !== s.pos) b.push(`<span class="badge ${tr ? 'risk' : 'safe'}">${tr ? (T.hazard ? 'At risk · theft ' + Math.round(tr * 100) + '%' : 'At risk') : 'Safe tonight'}${G.campHas(s, i, 'rifle') ? ' · rifle' : ''}</span>`);
    if (T.hazard && G.CAMPS[i].aval) b.push(`<span class="badge snow">Snow <span class="meter">${Array.from({ length: 8 }, (_, j) => `<i class="${j < s.snowLoad[i] ? 'on' : ''}"></i>`).join('')}</span>${av ? ' avalanche ' + Math.round(av * 100) + '%' : ''}</span>`);
    if (T.cache && c.cards.length && i !== s.pos) b.push(G.campHas(s, i, 'tarp') ? '<span class="badge safe">Tarp</span>' : '<span class="badge risk">Uncovered</span>');
    if (c.buried.length) b.push(`<span class="badge risk">Buried</span>`);
    const gear = ['tent', 'stove', 'tarp', 'rifle'].filter(k => G.campHas(s, i, k)).map(k => `<img class="gi" src="assets/cards/${k}.webp" alt="${k}" title="${G.DEFS[k].name}">`).join('');
    const dest = s.pos < 4 && i === s.pos + 1;
    html += `<div class="camp paper ${i === s.pos ? 'here' : ''} ${dest ? 'dest' : ''}" id="camp${i}"><div class="row"><span class="name">${esc(G.CAMPS[i].name)}${i === s.pos ? '<span class="you">YOU</span>' : ''}</span><span class="lb">${gear}${pile(c.cards.length)}</span></div><div class="badges">${b.join('')}</div></div>`;
    if (i > 0) html += `<div class="leg">▲ ${esc(G.LEGS[i - 1].name)}</div>`;
  }
  html += '</div></div><div class="col-r">';

  html += `<div class="panel paper">${coach(T)}`;
  if (s.pos < 4) {
    const to = G.CAMPS[s.pos + 1].name;
    if (here.cards.length) {
      const effIds = ids.length ? ids : G.autoPack(s, 'origin');
      const n = effIds.length;
      const trips = cap > 0 ? Math.ceil(here.cards.length / cap) : 0;
      const preview = effIds.slice(0, 5);
      html += `<div class="haulstat">At ${esc(G.CAMPS[s.pos].name)} → ${esc(to)}
        <span class="trips">About ${trips} trip${trips === 1 ? '' : 's'} to empty this camp</span></div>`;
      html += `<div class="todayfan" aria-hidden="true">${preview.map((id, i) => {
        const k = s.cards[id].k, r = (i - (preview.length - 1) / 2) * 9;
        return `<div class="tc" style="background-image:url(assets/cards/${ART[k]}.webp);--r:${r}deg;--y:${Math.abs(r) * 0.4}px"></div>`;
      }).join('')}</div>`;
      if (packingOn()) {
        const types = {}; for (const id of here.cards) { const k = s.cards[id].k; (types[k] ||= []).push(id); }
        html += '<div class="cards compact">' + Object.entries(types).map(([k, arr]) => {
          const d = G.DEFS[k], pn = pack[k] || 0;
          return `<div class="ctype compact ${pn ? 'packed' : ''}" data-k="${k}"><span class="art" style="background-image:url(assets/cards/${ART[k]}.webp)"></span><div class="t"><span>${esc(d.name)}</span><span class="sub">×${arr.length}</span></div>${d.use ? `<button class="small burn" data-u="${k}">Use</button>` : ''}<div class="ctl"><button class="small" data-m="${k}" ${pn ? '' : 'disabled'}>−</button><span class="n">${pn}</span><button class="small" data-p="${k}" ${pn < arr.length && ids.length < cap ? '' : 'disabled'}>+</button></div></div>`;
        }).join('') + '</div>';
        html += `<div class="packbar"><button class="small" id="auto">Auto-pack</button><button class="small" id="clear" ${ids.length ? '' : 'disabled'}>Clear</button></div>`;
      }
      // ghost preview on next camp is injected after as a data attr; also a line here
      bar = { canHaul: s.stamina >= cost && cap > 0, empties: (ids.length ? ids : G.autoPack(s, 'origin')).length === here.cards.length, frm: esc(G.CAMPS[s.pos].name), to: esc(to), n, cost };
    } else {
      html += `<div class="haulstat">At ${esc(G.CAMPS[s.pos].name)}.<br>Nothing left to carry here.</div>`;
    }
  } else {
    const ok = !ins.shortLb && !ins.shortFood && !ins.missing.length;
    html += `<div class="haulstat">At the Summit.</div><div>${ok ? '<b style="color:var(--good)">The Mounties would let you through.</b>' : `<b style="color:var(--bad)">Not yet.</b> ${ins.behind ? 'Goods are still down the trail.' : 'The outfit is short.'}`}</div>`;
  }

  const L = G.legal(s), has = t => L.find(a => a.type === t);
  const more = [];
  if (s.pos === 4) more.push(`<button class="primary" id="mounties">Face the Mounties</button>`);
  if (bar && bar.canHaul) more.push(`<button id="rest">Rest</button>`);
  if (has('work')) more.push(`<button id="work" ${has('work').ok ? '' : 'disabled'}>Work for cash</button>`);
  if (has('dig')) more.push(`<button id="dig" ${has('dig').ok ? '' : 'disabled'}>Dig out</button>`);
  if (has('back')) more.push(`<button id="back" ${has('back').ok ? '' : 'disabled'}>Walk down</button>`);
  if (has('up') && s.pos < 4) more.push(`<button id="up" ${has('up').ok ? '' : 'disabled'}>Walk up empty</button>`);
  if (T.tram && has('tram')) more.push(`<button id="tram" ${has('tram').ok && (ids.length || here.cards.length) ? '' : 'disabled'}>Send by tramway</button>`);
  if (T.packers && has('packers')) more.push(`<button id="packers" ${has('packers').ok ? '' : 'disabled'}>${s.packers ? 'Dismiss packers' : 'Hire packers'}</button>`);
  if (T.cache && has('guard')) more.push(`<button id="guard" ${has('guard').ok ? '' : 'disabled'}>${s.guard === s.pos ? 'Dismiss watchman' : s.guard !== null ? 'Move watchman here' : 'Hire a watchman'}</button>`);
  if (here.cards.length && s.pos < 4) more.push(`<button id="togglePack">${packingOn() ? 'Hide loads' : 'Choose loads'}</button>`);
  more.push(`<button id="showLog">Trail diary</button>`);
  more.push(`<a href="#" id="abandon">Abandon run</a>`);
  html += `<div class="moresheet ${moreOpen ? '' : 'hidden'}" id="moresheet">${more.join('')}${howTo()}</div></div>`;

  if (bar && bar.canHaul) html += `<div class="dockhint">Today's load goes to ${bar.to}</div>
    <div class="dock"><button class="primary" id="haulO" ${!bar.empties ? '' : 'disabled'}>Haul and return</button>
    <button class="primary" id="haulD">Haul and camp</button>
    <button id="moreBtn">More</button></div>`;
  else if (s.pos === 4 && !s.over) html += `<div class="dock solo"><button class="primary" id="mounties2">Face the Mounties</button><button id="moreBtn">More</button></div>`;
  else html += `<div class="dockhint">${s.weather[0] === 'storm' && s.pos === 3 ? 'The Golden Stairs are closed in the storm.' : s.stamina < (bar ? bar.cost : 2) ? 'Too tired to haul.' : ''}</div>
    <div class="dock solo"><button class="primary" id="rest">Rest</button><button id="moreBtn">More</button></div>`;

  const recent = s.log.slice(-8).reverse();
  html += `<div class="log paper hidden" id="diary"><h2>Trail Diary</h2>${recent.map(l => `<div class="${l.tone}">Day ${l.day}: ${esc(l.msg)}</div>`).join('')}</div>`;
  html += `</div></div>`;
  app.innerHTML = html;

  // ghost +N on destination
  if (bar && bar.n) {
    const dest = document.getElementById('camp' + (s.pos + 1));
    if (dest) {
      const lb = dest.querySelector('.lb') || dest;
      const g = document.createElement('span'); g.className = 'ghost'; g.textContent = '+' + bar.n + ' loads';
      lb.appendChild(g);
    }
  }

  app.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const k = b.dataset.p; pack[k] = (pack[k] || 0) + 1; A.sfx('slide', 0.55); render(); const el = app.querySelector(`.ctype[data-k="${k}"]`); el && el.classList.add('pop'); });
  app.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { A.sfx('place', 0.4); pack[b.dataset.m]--; if (!pack[b.dataset.m]) delete pack[b.dataset.m]; render(); });
  const on = (id, f) => { const e = document.getElementById(id); if (e) e.onclick = f; };
  on('auto', () => { setPackFromIds(G.autoPack(s, 'origin')); A.sfx('fan', 0.6); render(); });
  on('clear', () => { pack = {}; render(); });
  const hp = sl => { const p = packIds(); return p.length ? p : G.autoPack(s, sl); };
  on('haulO', () => doAct({ type: 'haul', ids: hp('origin'), sleep: 'origin' }));
  on('haulD', () => doAct({ type: 'haul', ids: hp('dest'), sleep: 'dest' }));
  on('moreBtn', () => {
    moreOpen = !moreOpen; A.sfx('flip', 0.4);
    const m = document.getElementById('moresheet');
    if (m) m.classList.toggle('hidden', !moreOpen);
  });
  on('togglePack', () => { packOpen = !packingOn(); A.sfx('place', 0.4); moreOpen = true; render(); });
  on('showLog', () => {
    moreOpen = true; A.sfx('flip', 0.3);
    const m = document.getElementById('moresheet'); if (m) m.classList.remove('hidden');
    const d = document.getElementById('diary'); if (d) { d.classList.remove('hidden'); d.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  });
  on('mounties2', () => doAct({ type: 'mounties' }));
  app.querySelectorAll('[data-u]').forEach(b => b.onclick = () => doAct({ type: 'use', k: b.dataset.u }));
  on('rest', () => doAct({ type: 'rest' }));
  on('work', () => doAct({ type: 'work' }));
  on('dig', () => doAct({ type: 'dig' }));
  on('back', () => doAct({ type: 'back' }));
  on('up', () => doAct({ type: 'up' }));
  on('tram', () => doAct({ type: 'tram', ids: packIds(), n: packIds().length || 6 }));
  on('sell', () => doAct({ type: 'sell' }));
  on('packers', () => doAct({ type: 'packers' }));
  on('guard', () => { if (s.guard !== null && s.guard !== s.pos) G.act(s, { type: 'guard' }); doAct({ type: 'guard' }); });
  on('mounties', () => doAct({ type: 'mounties' }));
  on('abandon', e => { e.preventDefault(); if (confirm('Abandon this run?')) { store.set('tog_run', null); s = null; selectChar(); } });
  for (const i of shakeQ) { const el = document.getElementById('camp' + i); if (el) { el.classList.add('shake'); } } shakeQ = [];
  if (s.event && !s.over) showEvent();
}

// ---------- End ----------
function finish() {
  const sc = G.score(s), ins = G.inspection(s);
  const runs = store.get('tog_runs', 0) + 1; store.set('tog_runs', runs);
  const best = store.get('tog_best', null), isBest = !best || sc > best.score;
  if (isBest) store.set('tog_best', { score: sc, who: G.CHARACTERS[s.charKey].name });
  store.set('tog_run', null);
  const st = s.stats;
  modal.classList.remove('hidden');
  sheet.innerHTML = `<h2>${s.over.win ? 'Through the Pass!' : 'Run Over'}</h2><p>${esc(s.over.reason)}</p>
  <p class="big">Score ${sc}${isBest ? ' · new best!' : ` · best ${best.score}`}</p>
  <table class="sum">
   <tr><td>Days on the trail</td><td>${Math.min(s.day, G.DEADLINE)} of ${G.DEADLINE}</td></tr>
   <tr><td>Weight at the Summit</td><td>${ins.lb.toLocaleString()} lb</td></tr>
   <tr><td>Stolen by thieves</td><td>${st.stolen} lb in ${st.thefts} raids</td></tr>
   <tr><td>Avalanches / loads buried</td><td>${st.avalanches} / ${st.buried} lb</td></tr>
   <tr><td>Ruined by storms and rot</td><td>${st.ruined} lb</td></tr>
   <tr><td>Burned for boosts</td><td>${st.burned} lb</td></tr>
   <tr><td>Eaten</td><td>${st.eaten} lb</td></tr>
   <tr><td>Sent by tramway</td><td>${st.tram} loads</td></tr>
   <tr><td>Cash left</td><td>$${s.cash}</td></tr>
  </table>
  <p class="sub">${s.over.win ? 'Next in the full game: Lake Bennett. Whipsaw a boat and race the Yukon freeze to Dawson.' : 'Tip: ' + tipFor(s)}</p>
  <div class="opts"><button class="primary" id="again">One more run</button><button id="same">Replay this seed (${s.seed})</button></div>`;
  FX.stamp(sheet, s.over.win ? 'ADMITTED' : /winter/.test(s.over.reason) ? 'SNOWED IN' : 'TURNED BACK', s.over.win ? 'good' : 'bad');
  A.sfx('thud', 0.85);
  A.sting(s.over.win ? 'win' : 'lose', 0.9);
  $('#again').onclick = () => { modal.classList.add('hidden'); s = null; selectChar(); };
  $('#same').onclick = () => { modal.classList.add('hidden'); const c = s.charKey, seed = s.seed; s = G.newGame(seed, c); screen = 'game'; packOpen = null; render(); outfitter(); };
}
function tipFor(s) {
  const st = s.stats;
  if (/winter/.test(s.over.reason)) return 'You ran out of days. A sled, packers or the tramway buys time, and so does sleeping up top so you don\'t lose days walking.';
  if (st.stolen >= 150) return 'Thieves took a lot. A rifle or a watchman on the cache you leave behind makes a big difference.';
  if (st.ruined >= 100) return 'Storms and rot ruined food. Keep a tarp on every pile you leave.';
  if (st.buried >= 300) return 'Avalanches hit you. Watch the snow meter and keep loads moving out of Sheep Camp and the Scales.';
  return 'Arrive with spare weight. Extra sacks at Dyea are cheaper than buying from quitters at the top.';
}

window.__tog = { get state() { return s; }, G };
FX.startSnow(document.getElementById('snow'));
const mute = document.getElementById('mute');
const setIcon = () => mute.textContent = A.isMuted() ? '🔇' : '🔊';
setIcon(); mute.onclick = () => { A.unlock(); A.setMuted(!A.isMuted()); setIcon(); };
title();
