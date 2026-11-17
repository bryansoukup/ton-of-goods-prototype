import * as G from './game.js';
import * as A from './audio.js';
import * as FX from './fx.js';
const $ = s => document.querySelector(s);
const app = $('#app'), modal = $('#modal'), sheet = $('#sheet'), toasts = $('#toasts');
const W = { clear: 'Clear', snow: 'Snow', storm: 'Storm' };
let s = null, pack = {}, screen = 'title';
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
  G.act(s, a);
  pack = {}; toasts.innerHTML = '';
  for (const f of s.flash) toast(f.msg, f.tone);
  if (s.day !== prevDay) { for (const f of s.flash) { const m = f.msg.match(/at ([A-Z][a-zA-Z ]+?)[:!.]/); const i = m ? G.CAMPS.findIndex(c => c.name === m[1].trim()) : -1; if (i >= 0) shakeCamp(i); } }
  // sound
  if (a.type === 'haul') { A.sfx('drop', 0.6); setTimeout(() => A.sfx('step1', 0.5), 120); setTimeout(() => A.sfx('step2', 0.5), 380); }
  else if (a.type === 'use') A.sfx(['tobacco', 'pans'].includes(a.k) ? 'coins' : 'flip', 0.7);
  else if (a.type === 'rest') A.sfx('thud', 0.4);
  else if (a.type === 'choose' || a.type === 'shop') A.sfx('place', 0.6);
  else if (['tram', 'packers', 'guard', 'work'].includes(a.type)) A.sfx('coins', 0.6);
  if (s.stats.avalanches > avs) { A.rumble(2.4); setTimeout(() => FX.shake(document.body, true), 50); }
  else if (s.stats.thefts > thefts || s.stats.ruined > ruined) { A.sfx('hit', 0.7); setTimeout(() => FX.shake(document.body), 50); }
  save(); render();
  // floating weight numbers per camp
  s.camps.forEach((c, i) => { const d = G.campLb(s, i) - before[i]; if (d) FX.floatText(document.getElementById('camp' + i), (d > 0 ? '+' : '−') + Math.abs(d) + ' lb', d > 0 ? 'good' : 'bad'); });
  if (s.cash !== cash0) FX.floatText(document.querySelector('.chip.cash'), (s.cash > cash0 ? '+$' : '−$') + Math.abs(s.cash - cash0), s.cash > cash0 ? 'good' : 'bad');
  FX.setSnow(s.weather[0] === 'storm' ? 2.2 : s.weather[0] === 'snow' ? 0.9 : 0.4, s.weather[0] === 'clear' ? 0.25 : s.weather[0] === 'snow' ? 0.7 : 1);
  A.windLevel(s.weather[0] === 'storm' ? 0.9 : s.weather[0] === 'snow' ? 0.45 : 0.22);
  if (s.over) finish();
}
let shakeQ = [];
function shakeCamp(i) { shakeQ.push(i); }

// ---------- Title / character select ----------
function title() {
  screen = 'title'; document.body.classList.remove('ingame'); modal.classList.add('hidden');
  FX.setSnow(1.6, 1);
  app.innerHTML = `<div class="title" id="title">
    <div class="art"></div><div class="vig"></div>
    <div class="top">
      <div class="kicker">KLONDIKE · 1897</div>
      <h1 class="logo">Ton<span class="of">of</span>Goods</h1>
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
    <p class="sub" style="color:#a89678;font-size:12px;margin-top:14px">Sound: Kenney.nl (CC0) · Fonts: Rye &amp; IM Fell (SIL OFL) · Art generated for this prototype</p>
    <p class="sub" style="color:#cbb896">${runs ? `Runs: ${runs} · Best score: ${best ? best.score : '-'}` : ''}</p>
  </div>`;
  app.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { A.unlock(); A.sfx('place', 0.8); start(b.dataset.c); });
  $('#cont') && ($('#cont').onclick = () => { A.unlock(); s = saved; screen = 'game'; render(); if (s.event) showEvent(); });
  $('#backTitle').onclick = () => title();
}
function howTo() {
  return `<details><summary>How to play</summary><ul>
  <li><b>Haul</b> moves a day's worth of 50 lb loads up to the next camp. Pick loads with + and −, or let Haul auto-pack.</li><li><b>Burn a card</b> for a boost now: coffee for stamina, pans for cash, rope for extra loads. But it's weight the Mounties won't count.</li>
  <li><b>Choose where to sleep.</b> The camp you sleep at is guarded. Every other pile is a cache at risk, and each camp shows tonight's risk.</li>
  <li><b>Cards do things depending on where they sit.</b> A tent or stove where you sleep restores stamina. A tarp in a cache stops storms ruining food. A rifle in a cache halves theft. Snowshoes in your pack add a load on snowy legs.</li>
  <li>You eat 3 lb a day from food where you sleep. Snow builds up at Sheep Camp and the Scales until it avalanches. Buried loads can be dug out.</li>
  <li>At the Summit, the Mounties check for 2,000 lb, 900 lb of food, a tent, a stove and tools. The pass closes after day ${G.DEADLINE}.</li></ul></details>`;
}
function start(charKey) {
  const q = new URLSearchParams(location.search).get('seed');
  s = G.newGame(q ? +q : Math.floor(Math.random() * 1e9), charKey);
  screen = 'game'; pack = {}; save(); FX.setSnow(0.4, 0.3); A.windLevel(0.25); render(); outfitter();
}

// ---------- Outfitter ----------
function outfitter() {
  const opts = G.legal(s);
  modal.classList.remove('hidden');
  const extra = Object.values(s.cards).length - 40;
  sheet.innerHTML = `<h2>Dyea outfitter</h2>
  <p>You have <b>$${s.cash}</b>. Money left over can buy your way out of trouble at the summit (supplies from quitters, a bribe) or pay for packers, a watchman and the tramway on the trail.</p>
  <p class="sub">Your outfit: 40 loads = 2,000 lb exactly${extra > 0 ? ` + ${extra} extra` : ''}. You'll eat about 100 lb on the trail and lose some to thieves and storms. Arrive short and the Mounties won't let you in.</p>
  <div class="opts">${opts.filter(o => o.type === 'shop').map(o => `<button data-k="${o.key}" ${o.ok ? '' : 'disabled'}>${esc(o.label)}</button>`).join('')}
  <button class="primary" id="go">Head up the trail →</button></div>`;
  sheet.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { G.act(s, { type: 'shop', key: b.dataset.k }); save(); render(); outfitter(); });
  $('#go').onclick = () => { G.act(s, { type: 'depart' }); modal.classList.add('hidden'); save(); render(); };
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
function coach(cap, cost) {
  const here = s.camps[s.pos], tips = [];
  const behind = [0, 1, 2, 3].filter(i => i < s.pos && (s.camps[i].cards.length || s.camps[i].buried.length));
  if (s.day === 1 && s.pos === 0) tips.push('Start here: tap a <b>Haul</b> button at the bottom. It packs for you. The camp you sleep at is guarded, and every other pile is exposed.');
  if (s.pos === 4 && !behind.length) tips.push('Everything is up. Tap <b>Face the Mounties</b>.');
  else if (!here.cards.length && !here.buried.length && behind.length) tips.push(`Nothing left here. <b>Walk down</b> to ${G.CAMPS[behind[behind.length - 1]].name} to fetch the rest.`);
  if (here.buried.length) tips.push(`${here.buried.length} loads are buried here. <b>Dig out</b> to recover them (a day and 2 stamina).`);
  if (s.weather[1] === 'storm') tips.push('<b>Storm tomorrow:</b> hauling is halved and the Golden Stairs close. Uncovered caches may lose food tonight. A tarp in a cache protects it.');
  const exposed = [0, 1, 2, 3, 4].filter(i => i !== s.pos && G.stormExposed(s, i) && s.camps[i].cards.some(id => G.DEFS[s.cards[id].k].kind === 'food'));
  if (exposed.length && G.campHas(s, s.pos, 'tarp') && s.pos < 4) tips.push(`Your food at ${exposed.map(i => G.CAMPS[i].name).join(', ')} is uncovered and your tarp is here. Pack the tarp so it covers the pile you leave.`);
  if (s.stamina < cost && here.cards.length) tips.push('Too tired to haul. <b>Rest</b>, and sleep where your tent and stove are.');
  if (s.day >= G.DEADLINE - 6) tips.push(`The pass closes after day ${G.DEADLINE}. Consider the tramway or buying from quitters at the top.`);
  return tips.slice(0, 2).map(t => `<div class="coach">${t}</div>`).join('');
}
function render() {
  if (screen !== 'game' || !s) return;
  document.body.classList.add('ingame');
  const ins = G.inspection(s);
  const ids = packIds(), cap = G.capacity(s, ids), cost = G.haulCost(s, ids);
  const here = s.camps[s.pos];
  const forecast = s.charKey === 'sourdough' ? `${W[s.weather[1]]}, then ${W[s.weather[2]]}` : W[s.weather[1]];
  const daysLeft = G.DEADLINE - s.day;
  let bar = null;
  let html = `<div class="status paper">
   <div class="chips"><span class="brand">Ton of Goods</span>
    <span class="chip ${daysLeft <= 5 ? 'warn' : ''}">Day ${s.day}/${G.DEADLINE}</span>
    <span class="chip">Today ${W[s.weather[0]]}</span><span class="chip">Next ${forecast}</span>
    <span class="chip ${s.stamina <= 3 ? 'warn' : ''}">Stamina ${s.stamina}/${s.maxStamina}${s.sick ? ' · fever' : ''}</span>
    <span class="chip cash">$${s.cash}</span>
    ${s.packers ? '<span class="chip">Packers</span>' : ''}${s.sled ? '<span class="chip">Sled</span>' : ''}
   </div>
   <div class="gauge" id="gauge"><i style="width:${Math.min(100, ins.lb / 20)}%"></i>${[25, 50, 75].map(x => `<span class="tick" style="left:${x}%"></span>`).join('')}<b>${ins.lb.toLocaleString()} / 2,000 lb at the Summit</b></div><div class="gsub"><span>Food at Summit ${ins.food}/900</span><span>Whole outfit ${G.totalLb(s).toLocaleString()} lb</span></div>
  </div>`;
  // trail: summit at top
  html += '<div class="gamegrid"><div class="col-l"><div class="trail">';
  for (let i = 4; i >= 0; i--) {
    const c = s.camps[i], lb = G.campLb(s, i), tr = G.theftRisk(s, i), av = G.avalancheRisk(s, i);
    const b = [];
    if (i === s.pos) b.push('<span class="badge safe">You sleep here: guarded</span>');
    else if (s.guard === i || (i === 1 && s.seen.protected)) b.push('<span class="badge safe">Watched</span>');
    if (c.cards.length && i !== s.pos) b.push(`<span class="badge ${tr ? 'risk' : 'safe'}">Theft ${Math.round(tr * 100)}%${G.campHas(s, i, 'rifle') ? ' (rifle)' : ''}</span>`);
    if (G.CAMPS[i].aval) b.push(`<span class="badge snow">Snow <span class="meter">${Array.from({ length: 8 }, (_, j) => `<i class="${j < s.snowLoad[i] ? 'on' : ''}"></i>`).join('')}</span> avalanche ${Math.round(av * 100)}%</span>`);
    if (c.cards.length && i !== s.pos) b.push(G.campHas(s, i, 'tarp') ? '<span class="badge safe">Tarp</span>' : '<span class="badge risk">Uncovered</span>');
    if (c.buried.length) b.push(`<span class="badge risk">${c.buried.length} buried</span>`);
    const gear = ['tent', 'stove', 'tarp', 'rifle'].filter(k => G.campHas(s, i, k)).map(k => `<img class="gi" src="assets/cards/${k}.webp" alt="${k}" title="${G.DEFS[k].name}">`).join('');
    html += `<div class="camp paper ${i === s.pos ? 'here' : ''}" id="camp${i}"><div class="row"><span class="name">${esc(G.CAMPS[i].name)}${i === s.pos ? '<span class="you">YOU</span>' : ''}</span><span class="lb">${gear} ${c.cards.length} loads · ${lb.toLocaleString()} lb</span></div><div class="badges">${b.join('')}</div></div>`;
    if (i > 0) { const L = G.LEGS[i - 1]; html += `<div class="leg">▲ <b>${L.name}</b>: ${L.loads} loads/day, ${L.cost} stamina${L.sled ? ', sled helps' : ''}${L.snowy ? ', snowy' : ''}${L.stairs ? ', closed in storms' : ''}</div>`; }
  }
  html += '</div></div><div class="col-r">';
  // action panel
  html += `<div class="panel paper">${coach(cap, cost)}`;
  if (s.pos < 4) {
    const to = G.CAMPS[s.pos + 1].name;
    html += `<div><b>At ${esc(G.CAMPS[s.pos].name)}.</b> ${here.cards.length ? `Haul up ${G.LEGS[s.pos].name} to ${esc(to)}: up to <b>${cap} loads</b> today, costs <b>${cost} stamina</b>.` : 'No loads here.'}</div>`;
    if (here.cards.length) {
      const types = {}; for (const id of here.cards) { const k = s.cards[id].k; (types[k] ||= []).push(id); }
      html += '<div class="cards">' + Object.entries(types).map(([k, arr]) => {
        const d = G.DEFS[k], n = pack[k] || 0, lb = arr.reduce((a, id) => a + s.cards[id].w, 0);
        return `<div class="ctype ${n ? 'packed' : ''}" data-k="${k}"><span class="art" style="background-image:url(assets/cards/${ART[k]}.webp)"></span><div class="t"><span>${esc(d.name)}</span><span class="sub">×${arr.length}</span></div>${d.text !== 'Food.' || lb !== arr.length * 50 ? `<div class="d">${d.text !== 'Food.' ? esc(d.text) : 'Food.'}${lb !== arr.length * 50 ? ` (${lb} lb)` : ''}</div>` : ''}${d.use ? `<button class="small burn" data-u="${k}" title="Burns 50 lb">Burn · ${esc(d.use)}</button>` : ''}<div class="ctl"><button class="small" data-m="${k}" ${n ? '' : 'disabled'}>−</button><span class="n">${n}</span><button class="small" data-p="${k}" ${n < arr.length && ids.length < cap ? '' : 'disabled'}>+</button></div></div>`;
      }).join('') + '</div>';
      html += `<div class="packbar"><span>Pack: <b>${ids.length}/${cap}</b> loads · ${ids.reduce((a, id) => a + s.cards[id].w, 0)} lb</span><button class="small" id="auto">Auto-pack</button><button class="small" id="clear" ${ids.length ? '' : 'disabled'}>Clear</button></div>`;
      const effIds = ids.length ? ids : G.autoPack(s, 'origin');
      const left = here.cards.length - effIds.length, frm = esc(G.CAMPS[s.pos].name);
      const riskO = Math.round(G.CAMPS[s.pos + 1].theft * 100), riskD = Math.round(G.CAMPS[s.pos].theft * 100);
      html += `<div class="sub" style="margin-top:6px"><b>Return</b>: you guard the ${left} loads left at ${frm}. The new pile at ${esc(to)} is exposed (~${riskO}% theft${s.day < 3 ? ', but not before day 3' : ''}).<br><b>Camp up</b>: you guard ${esc(to)}. ${left > 0 ? `The ${left} loads left at ${frm} are exposed (~${riskD}% theft) and you walk back down tomorrow (1 stamina).` : 'Nothing is left behind.'}</div>`;
      bar = { canHaul: s.stamina >= cost && cap > 0, empties: effIds.length === here.cards.length, frm, to: esc(to), n: effIds.length, cost };
    }
  } else { const ok = !ins.shortLb && !ins.shortFood && !ins.missing.length; html += `<div><b>At the Chilkoot Summit.</b> The Mounties will weigh everything here. ${ok ? '<b style="color:var(--good)">You would pass inspection right now.</b>' : `<b style="color:var(--bad)">Right now you'd fail:</b> ${ins.shortLb ? ins.shortLb + ' lb short' : ''}${ins.shortFood ? (ins.shortLb ? ', ' : '') + ins.shortFood + ' lb food short' : ''}${ins.missing.length ? (ins.shortLb || ins.shortFood ? ', ' : '') + 'missing ' + ins.missing.map(k => G.DEFS[k].name).join(', ') : ''}. ${ins.behind ? ins.behind + ' lb is still down the trail.' : ''}`}</div>`; }
  const L = G.legal(s), has = t => L.find(a => a.type === t);
  const more = [];
  if (s.pos === 4) more.push(`<button class="primary" id="mounties">Face the Mounties</button>`);
  more.push(`<button id="rest">Rest a day (+3 stamina)</button>`);
  if (has('work')) more.push(`<button id="work" ${has('work').ok ? '' : 'disabled'}>Pack for others: +$10 (a day, 3 stamina)</button>`);
  if (has('dig')) more.push(`<button id="dig" ${has('dig').ok ? '' : 'disabled'}>Dig out (a day, 2 stamina)</button>`);
  if (has('back')) more.push(`<button id="back" ${has('back').ok ? '' : 'disabled'}>Walk down (1 stamina)</button>`);
  if (has('up') && s.pos < 4) more.push(`<button id="up" ${has('up').ok ? '' : 'disabled'}>Walk up empty (1 stamina)</button>`);
  if (has('tram')) more.push(`<button id="tram" ${has('tram').ok && (ids.length || here.cards.length) ? '' : 'disabled'}>Tramway: ${ids.length ? ids.length + ' packed' : 'up to 6'} loads ($6 each)</button>`);
  if (has('packers')) more.push(`<button id="packers" ${has('packers').ok ? '' : 'disabled'}>${s.packers ? 'Dismiss packers' : 'Hire packers ($15, $10/haul)'}</button>`);
  if (has('guard')) more.push(`<button id="guard" ${has('guard').ok ? '' : 'disabled'}>${s.guard === s.pos ? 'Dismiss watchman' : s.guard !== null ? 'Move watchman here' : 'Hire watchman here ($5/night away)'}</button>`);
  html += `<div class="more">${more.join('')}</div></div>`;
  if (bar) html += `<div class="dock"><button id="auto2" class="small">Auto-<br>pack</button>
    <button class="primary" id="haulO" ${bar.canHaul && !bar.empties ? '' : 'disabled'}>Haul ${bar.n} &amp; return<br><small>sleep at ${bar.frm} · −${bar.cost} stamina</small></button>
    <button class="primary" id="haulD" ${bar.canHaul ? '' : 'disabled'}>Haul ${bar.n} &amp; camp up<br><small>sleep at ${bar.to} · −${bar.cost} stamina</small></button></div>`;
  else if (s.pos === 4 && !s.over) html += `<div class="dock"><button class="primary" id="mounties2" style="grid-column:1/-1">Face the Mounties</button></div>`;
  // log
  const recent = s.log.slice(-10).reverse();
  html += `<div class="log paper"><h2>Trail Diary</h2>${recent.map(l => `<div class="${l.tone}">Day ${l.day}: ${esc(l.msg)}</div>`).join('')}</div>`;
  html += `<p class="foot">Seed ${s.seed} · ${esc(G.CHARACTERS[s.charKey].name)} · <a href="#" id="abandon">Abandon run</a></p>${howTo()}</div></div>`;
  app.innerHTML = html;
  // wire
  app.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const k = b.dataset.p; pack[k] = (pack[k] || 0) + 1; A.sfx('slide', 0.55); render(); const el = app.querySelector(`.ctype[data-k="${k}"]`); el && el.classList.add('pop'); });
  app.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { A.sfx('place', 0.4); pack[b.dataset.m]--; if (!pack[b.dataset.m]) delete pack[b.dataset.m]; render(); });
  const on = (id, f) => { const e = document.getElementById(id); if (e) e.onclick = f; };
  on('auto', () => { setPackFromIds(G.autoPack(s, 'origin')); A.sfx('fan', 0.6); render(); });
  on('clear', () => { pack = {}; render(); });
  const hp = sl => { const p = packIds(); return p.length ? p : G.autoPack(s, sl); };
  on('haulO', () => doAct({ type: 'haul', ids: hp('origin'), sleep: 'origin' }));
  on('haulD', () => doAct({ type: 'haul', ids: hp('dest'), sleep: 'dest' }));
  on('auto2', () => { setPackFromIds(G.autoPack(s, 'origin')); A.sfx('fan', 0.6); render(); });
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
  A.sfx(s.over.win ? 'good' : 'bad', 0.8); setTimeout(() => A.sfx('thud', 0.9), 300);
  $('#again').onclick = () => { modal.classList.add('hidden'); s = null; selectChar(); };
  $('#same').onclick = () => { modal.classList.add('hidden'); const c = s.charKey, seed = s.seed; s = G.newGame(seed, c); screen = 'game'; render(); outfitter(); };
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
