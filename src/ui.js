import * as G from './game.js';
const $ = s => document.querySelector(s);
const app = $('#app'), modal = $('#modal'), sheet = $('#sheet'), toasts = $('#toasts');
const W = { clear: '☀️ Clear', snow: '🌨️ Snow', storm: '🌪️ Storm' };
let s = null, pack = {}, screen = 'title';
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };

function save() { if (s && !s.over) store.set('tog_run', s); else store.set('tog_run', null); }
function esc(t) { return String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

function toast(msg, tone = '') { const d = document.createElement('div'); d.className = 'toast ' + tone; d.textContent = msg; toasts.appendChild(d); setTimeout(() => d.remove(), tone === 'bad' ? 5200 : 3500); }

function doAct(a) {
  const prevDay = s.day;
  G.act(s, a);
  pack = {};
  for (const f of s.flash) toast(f.msg, f.tone);
  if (s.day !== prevDay) { for (const f of s.flash) { const m = f.msg.match(/at ([A-Z][a-zA-Z ]+?)[:!.]/); const i = m ? G.CAMPS.findIndex(c => c.name === m[1].trim()) : -1; if (i >= 0) shakeCamp(i); } }
  save(); render();
  if (s.over) finish();
}
let shakeQ = [];
function shakeCamp(i) { shakeQ.push(i); }

// ---------- Title / character select ----------
function title() {
  screen = 'title';
  const saved = store.get('tog_run', null), best = store.get('tog_best', null), runs = store.get('tog_runs', 0);
  app.innerHTML = `
  <h1>Ton of Goods</h1>
  <div class="sub">Klondike, 1897 · rough playable prototype · programmer art</div>
  <div class="panel">
    <p class="big" style="margin:0 0 6px">Get a ton of goods over the Chilkoot Pass before winter.</p>
    <p style="margin:0">The Mounties won't let you into Canada without <b>2,000 lb</b> of supplies. Your supplies are your cards. You can only carry a few 50 lb loads a day, so you shuttle them camp to camp. <b>Whatever you leave behind is a cache</b>, and caches get robbed, buried and soaked.</p>
    <p class="sub" style="margin:8px 0 0">One leg of the full game: Dyea to the Summit, about 10 to 15 minutes.</p>
  </div>
  ${saved ? `<div class="actions"><button class="primary wide" id="cont">Continue run (day ${saved.day}, ${esc(G.CHARACTERS[saved.charKey].name)})</button></div>` : ''}
  <h2>Choose who's going north</h2>
  <div class="pick">${Object.entries(G.CHARACTERS).map(([k, c]) => `<button data-c="${k}"><b>${esc(c.name)}</b>${esc(c.text)}</button>`).join('')}</div>
  <p class="sub">${runs ? `Runs played: ${runs}. Best score: ${best ? best.score + ' (' + esc(best.who) + ')' : 'none yet'}.` : ''}</p>
  ${howTo()}`;
  app.querySelectorAll('[data-c]').forEach(b => b.onclick = () => start(b.dataset.c));
  $('#cont') && ($('#cont').onclick = () => { s = saved; screen = 'game'; render(); if (s.event) showEvent(); });
}
function howTo() {
  return `<details><summary>How to play</summary><ul>
  <li><b>Pick loads</b> at your camp (or tap Auto-pack), then <b>Haul</b>. One haul is one day of 50 lb trips up the next leg.</li>
  <li><b>Choose where to sleep.</b> The camp you sleep at is guarded. Every other pile is a cache at risk, and each camp shows tonight's risk.</li>
  <li><b>Cards do things depending on where they sit.</b> A tent or stove where you sleep restores stamina. A tarp in a cache stops storms ruining food. A rifle in a cache halves theft. Snowshoes in your pack add a load on snowy legs.</li>
  <li>You eat 3 lb a day from food where you sleep. Snow builds up at Sheep Camp and the Scales until it avalanches. Buried loads can be dug out.</li>
  <li>At the Summit, the Mounties check for 2,000 lb, 900 lb of food, a tent, a stove and tools. The pass closes after day ${G.DEADLINE}.</li></ul></details>`;
}
function start(charKey) {
  const q = new URLSearchParams(location.search).get('seed');
  s = G.newGame(q ? +q : Math.floor(Math.random() * 1e9), charKey);
  screen = 'game'; pack = {}; save(); render(); outfitter();
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
  if (s.day === 1 && s.pos === 0) tips.push('Start here: tap <b>Auto-pack</b>, then a <b>Haul</b> button. Walking back down keeps Dyea guarded tonight; camping up top guards the new pile instead.');
  if (s.pos === 4 && !behind.length) tips.push('Everything is up. Tap <b>Face the Mounties</b>.');
  else if (!here.cards.length && !here.buried.length && behind.length) tips.push(`Nothing left here. <b>Walk down</b> to ${G.CAMPS[behind[behind.length - 1]].name} to fetch the rest.`);
  if (here.buried.length) tips.push(`${here.buried.length} loads are buried here. <b>Dig out</b> to recover them (a day and 2 stamina).`);
  if (s.weather[1] === 'storm') tips.push('🌪️ <b>Storm tomorrow:</b> hauling is halved and the Golden Stairs close. Uncovered caches may lose food tonight. A tarp in a cache protects it.');
  if (s.stamina < cost && here.cards.length) tips.push('Too tired to haul. <b>Rest</b>, and sleep where your tent and stove are.');
  if (s.day >= G.DEADLINE - 6) tips.push(`⏳ The pass closes after day ${G.DEADLINE}. Consider the tramway or buying from quitters at the top.`);
  return tips.slice(0, 2).map(t => `<div class="coach">${t}</div>`).join('');
}
function render() {
  if (screen !== 'game' || !s) return;
  const ins = G.inspection(s);
  const ids = packIds(), cap = G.capacity(s, ids), cost = G.haulCost(s, ids);
  const here = s.camps[s.pos];
  const forecast = s.charKey === 'sourdough' ? `${W[s.weather[1]]}, then ${W[s.weather[2]]}` : W[s.weather[1]];
  const daysLeft = G.DEADLINE - s.day;
  let html = `<div class="status">
   <div class="chips">
    <span class="chip ${daysLeft <= 5 ? 'warn' : ''}">📅 Day ${s.day}/${G.DEADLINE}</span>
    <span class="chip">Today ${W[s.weather[0]]}</span><span class="chip">Next ${forecast}</span>
    <span class="chip ${s.stamina <= 3 ? 'warn' : ''}">💪 ${s.stamina}/${s.maxStamina}${s.sick ? ' 🤒' : ''}</span>
    <span class="chip">💵 $${s.cash}</span>
    ${s.packers ? '<span class="chip">🧺 Packers</span>' : ''}${s.sled ? '<span class="chip">🛷 Sled</span>' : ''}
   </div>
   <div class="bar"><i style="width:${Math.min(100, ins.lb / 20)}%"></i></div>
   <div class="barlabel"><span>At the Summit: <b>${ins.lb.toLocaleString()}</b> / 2,000 lb · food ${ins.food}/900</span><span>Your outfit: ${G.totalLb(s).toLocaleString()} lb</span></div>
  </div>`;
  // trail: summit at top
  html += '<div class="trail">';
  for (let i = 4; i >= 0; i--) {
    const c = s.camps[i], lb = G.campLb(s, i), tr = G.theftRisk(s, i), av = G.avalancheRisk(s, i);
    const b = [];
    if (i === s.pos) b.push('<span class="badge safe">You sleep here: guarded</span>');
    else if (s.guard === i || (i === 1 && s.seen.protected)) b.push('<span class="badge safe">💂 Watched</span>');
    if (c.cards.length && i !== s.pos) b.push(`<span class="badge ${tr ? 'risk' : 'safe'}">🦝 Theft ${Math.round(tr * 100)}%${G.campHas(s, i, 'rifle') ? ' (rifle)' : ''}</span>`);
    if (G.CAMPS[i].aval) b.push(`<span class="badge snow">❄️ Snow ${'▮'.repeat(Math.min(8, s.snowLoad[i]))}${'▯'.repeat(Math.max(0, 8 - s.snowLoad[i]))} avalanche ${Math.round(av * 100)}%</span>`);
    if (c.cards.length && i !== s.pos) b.push(G.campHas(s, i, 'tarp') ? '<span class="badge safe">🛡️ Tarp</span>' : '<span class="badge risk">☔ Uncovered</span>');
    if (c.buried.length) b.push(`<span class="badge risk">⛏️ ${c.buried.length} buried</span>`);
    const gear = ['tent', 'stove', 'tarp', 'rifle'].filter(k => G.campHas(s, i, k)).map(k => G.DEFS[k].icon).join('');
    html += `<div class="camp ${i === s.pos ? 'here' : ''}" id="camp${i}"><div class="row"><span class="name">${esc(G.CAMPS[i].name)}${i === s.pos ? '<span class="you">YOU</span>' : ''}</span><span class="lb">${gear} ${c.cards.length} loads · ${lb.toLocaleString()} lb</span></div><div class="badges">${b.join('')}</div></div>`;
    if (i > 0) { const L = G.LEGS[i - 1]; html += `<div class="leg">▲ <b>${L.name}</b>: ${L.loads} loads/day, ${L.cost} stamina${L.sled ? ', sled helps' : ''}${L.snowy ? ', snowy' : ''}${L.stairs ? ', closed in storms' : ''}</div>`; }
  }
  html += '</div>';
  // action panel
  html += `<div class="panel">${coach(cap, cost)}`;
  if (s.pos < 4) {
    const to = G.CAMPS[s.pos + 1].name;
    html += `<div><b>At ${esc(G.CAMPS[s.pos].name)}.</b> ${here.cards.length ? `Haul up ${G.LEGS[s.pos].name} to ${esc(to)}: up to <b>${cap} loads</b> today, costs <b>${cost} stamina</b>.` : 'No loads here.'}</div>`;
    if (here.cards.length) {
      const types = {}; for (const id of here.cards) { const k = s.cards[id].k; (types[k] ||= []).push(id); }
      html += '<div class="cards">' + Object.entries(types).map(([k, arr]) => {
        const d = G.DEFS[k], n = pack[k] || 0, lb = arr.reduce((a, id) => a + s.cards[id].w, 0);
        return `<div class="ctype ${n ? 'packed' : ''}"><div class="t"><span>${d.icon} ${esc(d.name)}</span><span class="sub">×${arr.length}</span></div><div class="d">${esc(d.text)}${lb !== arr.length * 50 ? ` (${lb} lb)` : ''}</div><div class="ctl"><button class="small" data-m="${k}" ${n ? '' : 'disabled'}>−</button><span class="n">${n}</span><button class="small" data-p="${k}" ${n < arr.length && ids.length < cap ? '' : 'disabled'}>+</button></div></div>`;
      }).join('') + '</div>';
      html += `<div class="packbar"><span>🎒 Pack: <b>${ids.length}/${cap}</b> loads · ${ids.reduce((a, id) => a + s.cards[id].w, 0)} lb</span><button class="small" id="auto">Auto-pack</button><button class="small" id="clear" ${ids.length ? '' : 'disabled'}>Clear</button></div>`;
      const canHaul = ids.length && s.stamina >= cost && cap > 0;
      const empties = ids.length === here.cards.length;
      html += `<div class="actions">
        <button class="primary" id="haulO" ${canHaul && !empties ? '' : 'disabled'}>Haul, walk back<br><span style="font-weight:normal;font-size:12px">sleep at ${esc(G.CAMPS[s.pos].name)}</span></button>
        <button class="primary" id="haulD" ${canHaul ? '' : 'disabled'}>Haul, camp up<br><span style="font-weight:normal;font-size:12px">sleep at ${esc(to)}</span></button></div>`;
    }
  } else html += `<div><b>At the Chilkoot Summit.</b> The Mounties' hut flies the Union Jack. They'll weigh everything that's here.</div>`;
  const L = G.legal(s), has = t => L.find(a => a.type === t);
  const more = [];
  if (s.pos === 4) more.push(`<button class="primary" id="mounties">Face the Mounties</button>`);
  more.push(`<button id="rest">Rest a day (+3 💪)</button>`);
  if (has('dig')) more.push(`<button id="dig" ${has('dig').ok ? '' : 'disabled'}>⛏️ Dig out (day, 2 💪)</button>`);
  if (has('back')) more.push(`<button id="back" ${has('back').ok ? '' : 'disabled'}>↓ Walk down (1 💪)</button>`);
  if (has('up') && s.pos < 4) more.push(`<button id="up" ${has('up').ok ? '' : 'disabled'}>↑ Walk up empty (1 💪)</button>`);
  if (has('tram')) more.push(`<button id="tram" ${has('tram').ok && (ids.length || here.cards.length) ? '' : 'disabled'}>🚡 Tramway ${ids.length ? ids.length + ' packed' : 'up to 6'} loads ($6 each)</button>`);
  if (has('sell')) more.push(`<button id="sell">Sell tobacco (+$40)</button>`);
  if (has('packers')) more.push(`<button id="packers" ${has('packers').ok ? '' : 'disabled'}>${s.packers ? 'Dismiss packers' : 'Hire packers ($15, $10/haul)'}</button>`);
  if (has('guard')) more.push(`<button id="guard" ${has('guard').ok ? '' : 'disabled'}>${s.guard === s.pos ? 'Dismiss watchman' : s.guard !== null ? 'Move watchman here' : 'Hire watchman here ($5/night away)'}</button>`);
  html += `<div class="more">${more.join('')}</div></div>`;
  // log
  const recent = s.log.slice(-10).reverse();
  html += `<div class="log"><h2>Trail diary</h2>${recent.map(l => `<div class="${l.tone}">Day ${l.day}: ${esc(l.msg)}</div>`).join('')}</div>`;
  html += `<p class="sub">Seed ${s.seed} · ${esc(G.CHARACTERS[s.charKey].name)} · <a href="#" id="abandon">Abandon run</a></p>${howTo()}`;
  app.innerHTML = html;
  // wire
  app.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { pack[b.dataset.p] = (pack[b.dataset.p] || 0) + 1; render(); });
  app.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { pack[b.dataset.m]--; if (!pack[b.dataset.m]) delete pack[b.dataset.m]; render(); });
  const on = (id, f) => { const e = document.getElementById(id); if (e) e.onclick = f; };
  on('auto', () => { setPackFromIds(G.autoPack(s, 'origin')); render(); });
  on('clear', () => { pack = {}; render(); });
  on('haulO', () => doAct({ type: 'haul', ids: packIds(), sleep: 'origin' }));
  on('haulD', () => doAct({ type: 'haul', ids: packIds(), sleep: 'dest' }));
  on('rest', () => doAct({ type: 'rest' }));
  on('dig', () => doAct({ type: 'dig' }));
  on('back', () => doAct({ type: 'back' }));
  on('up', () => doAct({ type: 'up' }));
  on('tram', () => doAct({ type: 'tram', ids: packIds(), n: packIds().length || 6 }));
  on('sell', () => doAct({ type: 'sell' }));
  on('packers', () => doAct({ type: 'packers' }));
  on('guard', () => { if (s.guard !== null && s.guard !== s.pos) G.act(s, { type: 'guard' }); doAct({ type: 'guard' }); });
  on('mounties', () => doAct({ type: 'mounties' }));
  on('abandon', e => { e.preventDefault(); if (confirm('Abandon this run?')) { store.set('tog_run', null); s = null; title(); } });
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
  sheet.innerHTML = `<h2>${s.over.win ? '🇨🇦 Through the pass!' : '❌ Run over'}</h2><p>${esc(s.over.reason)}</p>
  <p class="big">Score ${sc}${isBest ? ' · new best!' : ` · best ${best.score}`}</p>
  <table class="sum">
   <tr><td>Days on the trail</td><td>${Math.min(s.day, G.DEADLINE)} of ${G.DEADLINE}</td></tr>
   <tr><td>Weight at the Summit</td><td>${ins.lb.toLocaleString()} lb</td></tr>
   <tr><td>Stolen by thieves</td><td>${st.stolen} lb in ${st.thefts} raids</td></tr>
   <tr><td>Avalanches / loads buried</td><td>${st.avalanches} / ${st.buried} lb</td></tr>
   <tr><td>Ruined by storms and rot</td><td>${st.ruined} lb</td></tr>
   <tr><td>Eaten</td><td>${st.eaten} lb</td></tr>
   <tr><td>Sent by tramway</td><td>${st.tram} loads</td></tr>
   <tr><td>Cash left</td><td>$${s.cash}</td></tr>
  </table>
  <p class="sub">${s.over.win ? 'Next in the full game: Lake Bennett. Whipsaw a boat and race the Yukon freeze to Dawson.' : 'Tip: ' + tipFor(s)}</p>
  <div class="opts"><button class="primary" id="again">One more run</button><button id="same">Replay this seed (${s.seed})</button></div>`;
  $('#again').onclick = () => { modal.classList.add('hidden'); s = null; title(); };
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
title();
