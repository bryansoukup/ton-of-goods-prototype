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
  const fromPos = s.pos;
  const fromEl = document.getElementById('camp' + s.pos);
  const toEl = a.type === 'haul' ? document.getElementById('camp' + (s.pos + 1)) : a.type === 'up' ? document.getElementById('camp' + (s.pos + 1)) : a.type === 'back' ? document.getElementById('camp' + (s.pos - 1)) : null;
  const haulN = a.type === 'haul' ? (a.ids && a.ids.length ? a.ids.length : 6) : 0;
  G.act(s, a);
  if (a.type === 'haul') walkAnim = { from: fromPos, mid: fromPos + 1, to: s.pos };
  else if (s.pos !== fromPos) walkAnim = { from: fromPos, to: s.pos };
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

// ---------- Map, forecasts, provision copy ----------
const MAP = [
  { x: 70, y: 82.5, mi: 0, ft: 0, side: 'left' },
  { x: 58, y: 71, mi: 8, ft: 500, side: 'right' },
  { x: 45, y: 58, mi: 13, ft: 1000, side: 'left' },
  { x: 58.5, y: 35.5, mi: 16, ft: 2500, side: 'left' },
  { x: 71, y: 9.2, mi: 16.5, ft: 3525, side: 'left' },
];
const STAIRS = { x: 64, y: 22, mi: 16.3, ft: 3000 };
let walkAnim = null, mapReady = false;

function eatRate(st = s) { return st.charKey === 'partners' ? 6 : 3; }
function fmtMi(n) { const v = Math.round(n * 10) / 10; return (v % 1 ? v.toFixed(1) : String(v)) + ' mi'; }
function fmtFt(n) { return n <= 0 ? 'sea level' : Math.round(n).toLocaleString() + ' ft'; }
function mapXY(pos) {
  const i = Math.max(0, Math.min(4, pos));
  const lo = Math.floor(i), hi = Math.ceil(i), t = i - lo;
  if (lo === hi) return { ...MAP[lo] };
  return { x: MAP[lo].x + (MAP[hi].x - MAP[lo].x) * t, y: MAP[lo].y + (MAP[hi].y - MAP[lo].y) * t, mi: MAP[lo].mi + (MAP[hi].mi - MAP[lo].mi) * t, ft: MAP[lo].ft + (MAP[hi].ft - MAP[lo].ft) * t };
}
function calloutName(pos) {
  if (Number.isInteger(pos) || Math.abs(pos - Math.round(pos)) < 0.08) return G.CAMPS[Math.round(pos)].name;
  if (pos > 3.12 && pos < 3.88) return 'The Golden Stairs';
  return 'On the trail';
}
function setCallout(pos) {
  const el = document.getElementById('mapcallout'); if (!el) return;
  const c = mapXY(pos);
  el.textContent = `${calloutName(pos)} · ${fmtMi(c.mi)} · ${fmtFt(c.ft)}`;
}
function setToken(pos, animate = true) {
  const tok = document.getElementById('party'); if (!tok) return;
  const c = mapXY(pos);
  tok.style.transition = animate ? 'left 0.95s ease-in-out, top 0.95s ease-in-out' : 'none';
  tok.style.left = c.x + '%'; tok.style.top = c.y + '%';
  setCallout(pos);
}
function panMap(pos, animate = true) {
  const view = document.getElementById('trailmap'), stage = document.getElementById('mapstage');
  if (!view || !stage) return;
  const { y } = mapXY(pos);
  const vH = view.clientHeight, sH = stage.clientHeight;
  if (!sH) { requestAnimationFrame(() => panMap(pos, animate)); return; }
  let ty = 0.58 * vH - (y / 100) * sH;
  const min = Math.min(0, vH - sH);
  ty = Math.max(min, Math.min(0, ty));
  stage.style.transition = animate && mapReady ? 'transform 1.05s cubic-bezier(.22,.7,.2,1)' : 'none';
  stage.style.transform = `translateY(${ty}px)`;
  mapReady = true;
  setCallout(pos);
}
function reduceMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
function playWalk() {
  const tok = document.getElementById('party');
  if (!walkAnim || !tok || reduceMotion()) { setToken(s.pos, false); panMap(s.pos, false); walkAnim = null; return 0; }
  const w = walkAnim; walkAnim = null;
  tok.classList.add('walking');
  setToken(w.from, false); panMap(w.from, false);
  const go = p => { setToken(p, true); panMap(p, true); };
  const two = w.mid != null && w.mid !== w.to;
  setTimeout(() => {
    go(w.mid != null ? w.mid : w.to);
    if (two) setTimeout(() => go(w.to), 950);
    setTimeout(() => tok.classList.remove('walking'), two ? 2000 : 1050);
  }, 40);
  return two ? 2000 : 1100;
}
if (!window.__togMapResize) {
  window.__togMapResize = () => { if (s && screen === 'game') panMap(s.pos, false); };
  window.addEventListener('resize', window.__togMapResize);
}

function effectLine(k, w = 50) {
  const days = Math.max(1, Math.round(w / eatRate()));
  const feed = `Feeds you ${days} day${days === 1 ? '' : 's'}, ${w} lb, one trip`;
  const lines = {
    flour: feed + '.', beans: feed + '.', oats: feed + '.',
    bacon: feed + '. Can go rancid if left uncovered.',
    fruit: feed + '. Storms cannot ruin it.',
    coffee: feed + '. In your pack, each haul costs 1 less stamina.',
    tent: 'Where you sleep: +1 stamina a night. Mounties require it.',
    stove: 'Where you sleep: +1 stamina a night. Mounties require it.',
    tools: 'For the Bennett boat. Mounties require one.',
    woolens: 'Where you sleep: storms cost no stamina.',
    tarp: 'In a cache: storms and rot cannot touch food there.',
    rifle: 'In a cache: halves theft.',
    snowshoes: 'In your pack: +1 load on Long Hill and the Golden Stairs.',
    medicine: 'Where you sleep: cures fever.',
    tobacco: 'Trade goods. Sell for $40.',
    hardware: 'Boat hardware for Lake Bennett.',
    pans: 'Kitchen kit. Sell for $15.',
  };
  return lines[k] || (G.DEFS[k]?.text || '');
}

function countAfter(k, camp, ids) {
  let n = s.camps[camp].cards.filter(id => s.cards[id].k === k).length;
  if (s.pos < 4) {
    const moved = ids.filter(id => s.cards[id].k === k).length;
    if (camp === s.pos) n -= moved;
    if (camp === s.pos + 1) n += moved;
  }
  return n;
}
function foodAfter(camp, ids) {
  let n = G.foodLbAt(s, camp);
  if (s.pos < 4) {
    const moved = ids.reduce((a, id) => a + (G.DEFS[s.cards[id].k].kind === 'food' ? s.cards[id].w : 0), 0);
    if (camp === s.pos) n -= moved;
    if (camp === s.pos + 1) n += moved;
  }
  return n;
}
function gearAt(camp, ids, k) { return countAfter(k, camp, ids) > 0; }

function forecastLines(ids, sleep, label) {
  const out = [];
  if (s.pos >= 4) return out;
  const to = s.pos + 1, sleepI = sleep === 'dest' ? to : s.pos;
  const sleepName = G.CAMPS[sleepI].name;
  const food = foodAfter(sleepI, ids);
  const need = eatRate();
  const tent = gearAt(sleepI, ids, 'tent'), stove = gearAt(sleepI, ids, 'stove'), wool = gearAt(sleepI, ids, 'woolens');
  const rec = 1 + (tent ? 1 : 0) + (stove ? 1 : 0) + (s.charKey === 'sourdough' ? 1 : 0);
  if (food < need) out.push({ bad: true, t: `${label} you go to bed hungry at ${sleepName} (−2 stamina).` });
  else {
    const gear = (!tent && !stove) ? ` but without the tent and stove (+${rec} stamina)` : (!tent || !stove) ? ` but without the ${!tent ? 'tent' : 'stove'} (+${rec} stamina)` : `, tent and stove with you`;
    out.push({ bad: !tent || !stove, t: `${label} you eat at ${sleepName}${gear}.` });
  }
  if (!tent || !stove) { /* already merged */ }
  else if (food < need) out.push({ bad: true, t: `${label} you also sleep without ${!tent && !stove ? 'the tent and stove' : !tent ? 'the tent' : 'the stove'} at ${sleepName}.` });
  if (s.weather[0] === 'storm' && !wool) out.push({ bad: true, t: `Storm tonight. ${label} no woolens at ${sleepName}: you will shiver (−1 stamina).` });
  if (s.weather[0] === 'storm' && wool) out.push({ bad: false, t: `Storm tonight. ${label} your woolens keep you warm at ${sleepName}.` });
  const cacheI = sleep === 'dest' ? s.pos : to;
  const cacheName = G.CAMPS[cacheI].name;
  const cacheLeft = (sleep === 'dest' ? s.camps[s.pos].cards.length - ids.length : ids.length);
  if (cacheLeft > 0) {
    const tarp = gearAt(cacheI, ids, 'tarp'), rifle = gearAt(cacheI, ids, 'rifle');
    const stormSoon = s.weather[0] === 'storm' || s.weather[1] === 'storm';
    const verb = sleep === 'dest' ? 'camp up' : 'return';
    if (stormSoon && !tarp) out.push({ bad: true, t: `${s.weather[0] === 'storm' ? 'Storm tonight' : 'Storm tomorrow'}. If you ${verb}, the cache at ${cacheName} is uncovered — food could be ruined.` });
    if (stormSoon && tarp) out.push({ bad: false, t: `Your tarp will cover the cache at ${cacheName} if you ${verb}.` });
    if (!rifle && s.day >= 3 && s.guard !== cacheI) out.push({ bad: true, t: `Thieves may hit the cache at ${cacheName} if you ${verb} (no rifle there).` });
  }
  return out;
}

function mountieForecast(ids) {
  let lb = G.campLb(s, 4), food = G.foodLbAt(s, 4);
  const missing = ['tent', 'stove', 'tools'].filter(k => !G.campHas(s, 4, k) && !(s.pos === 3 && ids.some(id => s.cards[id].k === k)));
  if (s.pos === 3) {
    lb += ids.reduce((a, id) => a + s.cards[id].w, 0);
    food += ids.reduce((a, id) => a + (G.DEFS[s.cards[id].k].kind === 'food' ? s.cards[id].w : 0), 0);
  }
  const shortLb = Math.max(0, G.GOAL_LB - lb), shortFood = Math.max(0, G.FOOD_REQ - food);
  const bits = [`${lb.toLocaleString()} of ${G.GOAL_LB.toLocaleString()} lb`, `${food.toLocaleString()} of ${G.FOOD_REQ.toLocaleString()} lb food`];
  if (missing.length) bits.push('still need ' + missing.map(k => G.DEFS[k].name.toLowerCase()).join(', '));
  const bad = shortLb > 0 || shortFood > 0 || missing.length;
  let t = 'Mounties at the Summit: ' + bits.join(', ') + '.';
  if (bad) {
    const parts = [];
    if (shortLb) parts.push('short ' + shortLb.toLocaleString() + ' lb');
    if (shortFood) parts.push('short ' + shortFood.toLocaleString() + ' lb of food');
    if (missing.length) parts.push('need ' + missing.map(k => G.DEFS[k].name.toLowerCase()).join(', '));
    t = 'Mountie check: ' + parts.join('; ') + '.';
  } else t = 'Mountie check: the outfit at the Summit would pass.';
  return { bad, t };
}

function hazardForecast() {
  const out = [];
  for (const i of [2, 3]) {
    const av = G.avalancheRisk(s, i);
    if (av > 0) out.push({ bad: true, t: `Snow is heavy at ${G.CAMPS[i].name}: avalanche risk ${Math.round(av * 100)}%. Keep loads moving.` });
  }
  const tools = [0, 1, 2, 3, 4].reduce((a, i) => a + s.camps[i].cards.filter(id => s.cards[id].k === 'tools').length, 0);
  const hw = [0, 1, 2, 3, 4].reduce((a, i) => a + s.camps[i].cards.filter(id => s.cards[id].k === 'hardware').length, 0);
  if (s.pos >= 2) out.push({ bad: tools < 1, t: `Bennett boat gear: ${tools} axe & whipsaw, ${hw} hardware.` });
  return out;
}

function forecastHTML() {
  if (s.pos >= 4) {
    const ins = G.inspection(s);
    const ok = !ins.shortLb && !ins.shortFood && !ins.missing.length;
    return `<div class="forecast">${ok ? '<div>The Mounties would let you through.</div>' : `<div class="bad">${[ins.shortLb ? 'Short ' + ins.shortLb.toLocaleString() + ' lb' : '', ins.shortFood ? 'short ' + ins.shortFood.toLocaleString() + ' lb of food' : '', ins.missing.length ? 'missing ' + ins.missing.map(k => G.DEFS[k].name.toLowerCase()).join(', ') : ''].filter(Boolean).join('; ')}.</div>`}</div>`;
  }
  const chosen = packIds();
  const idsO = chosen.length ? chosen : G.autoPack(s, 'origin');
  const idsD = chosen.length ? chosen : G.autoPack(s, 'dest');
  const same = chosen.length > 0 || idsO.join() === idsD.join();
  let lines = [];
  if (s.camps[s.pos].cards.length && s.pos < 4) {
    if (same) {
      lines.push(...forecastLines(idsO, 'origin', 'If you return,'));
      lines.push(...forecastLines(idsD, 'dest', 'If you camp up,'));
    } else {
      lines.push(...forecastLines(idsO, 'origin', 'If you return,'));
      lines.push(...forecastLines(idsD, 'dest', 'If you camp up,'));
    }
    // de-dupe identical texts
    const seen = new Set(); lines = lines.filter(l => { if (seen.has(l.t)) return false; seen.add(l.t); return true; });
    // prefer shortfalls, cap length
    const bad = lines.filter(l => l.bad), ok = lines.filter(l => !l.bad);
    lines = [...bad, ...ok].slice(0, tut(s).pack ? 5 : 2);
    if (tut(s).pack || G.inspection(s).lb > 0 || s.pos >= 2) lines.push(mountieForecast(chosen.length ? chosen : idsO));
    lines.push(...hazardForecast());
  } else if (s.pos < 4) {
    lines.push(mountieForecast([]));
    lines.push(...hazardForecast());
  }
  if (!lines.length) return '';
  return `<div class="forecast">${lines.map(l => `<div class="${l.bad ? 'bad' : ''}">${esc(l.t)}</div>`).join('')}</div>`;
}

function outfitForecast() {
  const food = [0, 1, 2, 3, 4].reduce((a, i) => a + G.foodLbAt(s, i), 0);
  const days = Math.floor(food / eatRate());
  const tarps = s.camps[0].cards.filter(id => s.cards[id].k === 'tarp').length;
  const lines = [];
  lines.push({ bad: food < G.FOOD_REQ, t: `Food on the outfit: ${food.toLocaleString()} lb. You eat ${eatRate()} lb a night; the Mounties require ${G.FOOD_REQ.toLocaleString()} lb of food at the Summit. The pass closes in ${G.DEADLINE} days.` });
  lines.push({ bad: false, t: 'They will also want 2,000 lb in all, plus a tent, a stove and tools.' });
  lines.push({ bad: tarps < 2, t: tarps ? `You have ${tarps} tarp${tarps === 1 ? '' : 's'} to cover caches in a storm.` : 'No tarp: a storm can ruin any cache you leave uncovered.' });
  if (s.sled) lines.push({ bad: false, t: 'The sled means fewer trips across the flats and the canyon.' });
  else lines.push({ bad: false, t: 'A sled would mean fewer trips on the first two legs ($50).' });
  return `<div class="forecast">${lines.map(l => `<div class="${l.bad ? 'bad' : ''}">${esc(l.t)}</div>`).join('')}</div>`;
}

function tokenSvg(small = false) {
  const w = small ? 22 : 28, h = small ? 30 : 36;
  return `<svg class="toksvg${small ? ' second' : ''}" viewBox="0 0 32 40" width="${w}" height="${h}" aria-hidden="true">
    <ellipse cx="16" cy="37.5" rx="8" ry="2.2" fill="rgba(0,0,0,.45)"/>
    <circle cx="16" cy="18" r="15.2" fill="#2a1a10" stroke="#d2a94f" stroke-width="1.8"/>
    <circle cx="16.5" cy="11.2" r="3.3" fill="#e8d2ae"/>
    <path d="M11.5 15.2 h9 a2 2 0 0 1 2 2 v6.2 a1.6 1.6 0 0 1-1.6 1.6 h-9.8 a1.6 1.6 0 0 1-1.6-1.6 V17.2 a2 2 0 0 1 2-2z" fill="#6e4a28" stroke="#3a2414" stroke-width=".7"/>
    <path d="M13.2 25.2 L12.2 33.2" stroke="#c4a07a" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M19.2 25.2 L20.2 33.2" stroke="#c4a07a" stroke-width="1.7" stroke-linecap="round"/>
    <path d="M12.8 8.6 h7.2 a1 1 0 0 1 .8 1.6 l-3.2 3.2 h-2.4 l-3.2-3.2 a1 1 0 0 1 .8-1.6z" fill="#3d2a18"/>
  </svg>`;
}
function mapHTML(T) {
  const spots = [];
  for (let i = 0; i < 5; i++) {
    const c = s.camps[i], p = MAP[i], tr = G.theftRisk(s, i), av = G.avalancheRisk(s, i);
    const dest = s.pos < 4 && i === s.pos + 1;
    const cls = `mapspot ${p.side} ${i === s.pos ? 'here' : ''} ${dest ? 'dest' : ''}`;
    const n = c.cards.length;
    const cacheIcons = i !== s.pos ? ['tarp', 'rifle'].filter(k => G.campHas(s, i, k)).map(k => `<span class="mic">${k}</span>`).join('') : '';
    const pileHtml = (n || c.buried.length) ? `<span class="mappile">${n ? `<i class="crate"></i><b>${n}</b>` : ''}${c.buried.length ? `<span class="buried">${c.buried.length} buried</span>` : ''}</span>` : '';
    spots.push(`<div class="${cls}" id="camp${i}" style="left:${p.x}%;top:${p.y}%">
      <div class="mappin">
        ${pileHtml}
        <span class="mapname">${esc(G.CAMPS[i].name)}</span>
        <span class="mapmeta">${fmtMi(p.mi)} · ${fmtFt(p.ft)}</span>
        ${cacheIcons ? `<span class="mapgear">${cacheIcons}</span>` : ''}
      </div>
    </div>`);
    if (T.cache && tr > 0) spots.push(`<div class="threat thief" style="left:${p.x + (p.side === 'left' ? 7 : -7)}%;top:${p.y - 3}%" title="Thieves may hit this cache"><span></span></div>`);
    if (T.hazard && G.CAMPS[i].aval && (s.snowLoad[i] >= 4 || av > 0)) spots.push(`<div class="threat aval ${av >= 0.12 ? 'hot' : ''}" style="left:${p.x}%;top:${p.y - 6}%" title="Avalanche zone"><span></span></div>`);
  }
  if (s.weather[0] === 'storm' || s.weather[1] === 'storm') {
    const approaching = s.weather[0] !== 'storm';
    spots.push(`<div class="threat storm ${approaching ? 'soon' : 'now'}" style="left:42%;top:18%" title="${approaching ? 'Storm coming' : 'Storm tonight'}"></div>`);
    if (s.pos >= 2) spots.push(`<div class="threat storm ${approaching ? 'soon' : 'now'}" style="left:68%;top:28%"></div>`);
  }
  if (s.event && !s.over) spots.push(`<div class="npc event" style="left:${MAP[s.pos].x}%;top:${MAP[s.pos].y - 8}%" title="${esc(s.event.title)}"></div>`);
  if (s.seen.arrive1 || s.packers) spots.push(`<div class="npc packers" style="left:${MAP[1].x + 8}%;top:${MAP[1].y - 2}%" title="Tlingit packers"></div>`);
  if (s.seen.arrive3) spots.push(`<div class="npc tram" style="left:${MAP[3].x + 7}%;top:${MAP[3].y}%" title="Aerial tramway"></div>`);
  spots.push(`<div class="npc mountie" style="left:${MAP[4].x - 8}%;top:${MAP[4].y}%" title="North-West Mounted Police"></div>`);
  const here = mapXY(walkAnim ? walkAnim.from : s.pos);
  const partners = s.charKey === 'partners';
  return `<div class="trailmap paper" id="trailmap">
    <div class="mapstage" id="mapstage">
      <img src="assets/img/trail-map.webp" alt="The Chilkoot trail, from Dyea at the water to the Summit">
      <div class="maplabel stairs" style="left:${STAIRS.x}%;top:${STAIRS.y}%">The Golden Stairs<span>${fmtMi(STAIRS.mi)} · ${fmtFt(STAIRS.ft)}</span></div>
      ${spots.join('')}
      <div class="token ${partners ? 'pair' : ''}" id="party" style="left:${here.x}%;top:${here.y}%" aria-label="Your party">
        <span class="tokbob">${tokenSvg()}${partners ? tokenSvg(true) : ''}</span>
      </div>
    </div>
    <div class="mapvig"></div>
    <div class="mapcallout" id="mapcallout">${esc(G.CAMPS[s.pos].name)} · ${fmtMi(MAP[s.pos].mi)} · ${fmtFt(MAP[s.pos].ft)}</div>
  </div>`;
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
  $('#cont') && ($('#cont').onclick = () => { A.unlock(); A.setBed('game'); s = saved; screen = 'game'; mapReady = false; walkAnim = null; render(); if (s.event) showEvent(); });
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
  screen = 'game'; pack = {}; packOpen = null; moreOpen = false; walkAnim = null; mapReady = false; save();
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
  ${outfitForecast()}
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

  html += `<div class="gamegrid"><div class="col-l">${mapHTML(T)}</div><div class="col-r">`;

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
      if (!packingOn()) html += `<div class="todayfan" aria-hidden="true">${preview.map((id, i) => {
        const k = s.cards[id].k, r = (i - (preview.length - 1) / 2) * 9;
        return `<div class="tc" style="background-image:url(assets/cards/${ART[k]}.webp);--r:${r}deg;--y:${Math.abs(r) * 0.4}px"></div>`;
      }).join('')}</div>`;
      html += forecastHTML();
      if (packingOn()) {
        const types = {}; for (const id of here.cards) { const k = s.cards[id].k; (types[k] ||= []).push(id); }
        const leaveLbl = 'Leave';
        html += `<div class="provhead"><span>Today's load: ${ids.length} of ${cap} · to ${esc(to)}</span><span class="packbar"><button class="small" id="auto">Auto-pack</button><button class="small" id="clear" ${ids.length ? '' : 'disabled'}>Clear</button></span></div>`;
        html += '<div class="cards chunky">' + Object.entries(types).map(([k, arr]) => {
          const d = G.DEFS[k], pn = pack[k] || 0, w = s.cards[arr[0]].w;
          return `<div class="ctype chunky ${pn ? 'packed' : ''}" data-k="${k}"><span class="art" style="background-image:url(assets/cards/${ART[k]}.webp)"></span><div class="t"><span>${esc(d.name)}</span><span class="sub">×${arr.length}</span></div><div class="d">${esc(effectLine(k, w))}</div>${pn ? `<div class="d taken">Taking ${pn} · ${pn * w} lb up the trail</div>` : `<div class="d">Left at ${esc(G.CAMPS[s.pos].name)} — a cache if you camp up the trail.</div>`}${d.use ? `<button class="small burn" data-u="${k}">Use</button>` : ''}<div class="ctl"><button data-m="${k}" ${pn ? '' : 'disabled'}>${leaveLbl}</button><span class="n">${pn}</span><button data-p="${k}" ${pn < arr.length && ids.length < cap ? '' : 'disabled'}>Take</button></div></div>`;
        }).join('') + '</div>';
      }
      // ghost preview on next camp is injected after as a data attr; also a line here
      bar = { canHaul: s.stamina >= cost && cap > 0, empties: (ids.length ? ids : G.autoPack(s, 'origin')).length === here.cards.length, frm: esc(G.CAMPS[s.pos].name), to: esc(to), n, cost };
    } else {
      html += `<div class="haulstat">At ${esc(G.CAMPS[s.pos].name)}.<br>Nothing left to carry here.</div>`;
      html += forecastHTML();
    }
  } else {
    const ok = !ins.shortLb && !ins.shortFood && !ins.missing.length;
    html += `<div class="haulstat">At the Summit.</div><div>${ok ? '<b style="color:var(--good)">The Mounties would let you through.</b>' : `<b style="color:var(--bad)">Not yet.</b> ${ins.behind ? 'Goods are still down the trail.' : 'The outfit is short.'}`}</div>`;
    html += forecastHTML();
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

  if (bar && bar.canHaul) html += `<div class="dock"><button class="primary" id="haulO" ${!bar.empties ? '' : 'disabled'}>Haul and return</button>
    <button class="primary" id="haulD">Haul and camp</button>
    <button id="moreBtn">More</button></div>`;
  else if (s.pos === 4 && !s.over) html += `<div class="dock solo"><button class="primary" id="mounties2">Face the Mounties</button><button id="moreBtn">More</button></div>`;
  else html += `<div class="dockhint">${s.weather[0] === 'storm' && s.pos === 3 ? 'The Golden Stairs are closed in the storm.' : s.stamina < (bar ? bar.cost : 2) ? 'Too tired to haul.' : ''}</div>
    <div class="dock solo"><button class="primary" id="rest">Rest</button><button id="moreBtn">More</button></div>`;

  const recent = s.log.slice(-8).reverse();
  html += `<div class="log paper hidden" id="diary"><h2>Trail Diary</h2>${recent.map(l => `<div class="${l.tone}">Day ${l.day}: ${esc(l.msg)}</div>`).join('')}</div>`;
  html += `</div></div>`;
  app.innerHTML = html;

  // ghost +N on destination camp pin
  if (bar && bar.n) {
    const dest = document.getElementById('camp' + (s.pos + 1));
    if (dest) {
      const pin = dest.querySelector('.mappin') || dest;
      const g = document.createElement('span'); g.className = 'ghost'; g.textContent = '+' + bar.n;
      pin.appendChild(g);
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
  on('togglePack', () => { packOpen = !packingOn(); A.sfx('place', 0.4); moreOpen = true; render(); requestAnimationFrame(() => document.querySelector('.provhead, .cards.chunky')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); });
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
  playWalk();
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
