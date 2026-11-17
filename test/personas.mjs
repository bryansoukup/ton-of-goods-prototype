// Simulated personas (bots) that play the real game logic. NOT real players.
import * as G from '../src/game.js';

const lowestCamp = s => { for (let i = 0; i < 4; i++) if (s.camps[i].cards.length || s.camps[i].buried.length) return i; return 4; };

function packFor(s, sleepAt, opt) {
  // choose cards: leave sleeping gear where you sleep unless the camp is emptying
  const here = s.camps[s.pos].cards;
  let ids = G.autoPack(s);
  const cap = G.capacity(s, ids);
  if (opt.smartGear && sleepAt === 'origin' && here.length > cap) {
    const keep = new Set(['tent', 'stove', 'woolens']);
    const rest = here.filter(id => !keep.has(s.cards[id].k));
    ids = ids.filter(id => !keep.has(s.cards[id].k));
    for (const id of rest) { if (ids.length >= G.capacity(s, ids)) break; if (!ids.includes(id)) ids.push(id); }
  }
  if (opt.smartGear && sleepAt === 'dest') { // bring the tent/stove along
    for (const k of ['tent', 'stove']) { const id = here.find(i => s.cards[i].k === k); if (id && !ids.includes(id)) { ids.unshift(id); } }
  }
  return ids.slice(0, G.capacity(s, ids));
}

export const PERSONAS = {
  deckbuilder: { // roguelite / deckbuilder fan: optimizes, uses every tool
    char: 'greenhorn', shop: ['sled', 'food', 'food'], smartGear: true, restBuffer: 1, reserve: 60,
    event: (s, ev, opts) => ({ packersOffer: 'yes', soapy: 'protect', shell: 'no', quitter: 'yes', beggar: 'give', wallet: 'hand', stolenGoods: 'buy' }[ev.key]),
    sleep: (s, ids) => (s.camps[s.pos].cards.length - ids.length) >= ids.length ? 'origin' : 'dest', guard: true, tram: true,
  },
  historian: { // strategy/history fan: careful, protects caches
    char: 'sourdough', shop: ['food'], smartGear: true, restBuffer: 2, reserve: 30,
    event: (s, ev) => ({ packersOffer: 'yes', soapy: 'no', shell: 'no', quitter: 'yes', beggar: 'give', wallet: 'hand', stolenGoods: 'buy' }[ev.key]),
    sleep: (s, ids) => (s.camps[s.pos].cards.length - ids.length) >= ids.length ? 'origin' : 'dest', guard: false, tram: true,
  },
  casual: { // casual browser: taps the big button, takes defaults
    char: 'greenhorn', shop: [], smartGear: false, restBuffer: 0, reserve: 0,
    event: (s, ev, opts) => null, // first enabled option
    sleep: () => 'origin', guard: false, tram: false,
  },
  streamer: { // streamer: fast, risky, gambles for clips
    char: 'partners', shop: ['sled'], smartGear: true, restBuffer: 0, reserve: 0,
    event: (s, ev) => ({ packersOffer: 'no', soapy: 'con', shell: 'bet', quitter: 'no', beggar: 'no', wallet: 'keep', stolenGoods: 'no', mountie: 'bribe' }[ev.key]),
    sleep: () => 'dest', guard: false, tram: false,
  },
};

export function playRun(seed, pk, maxSteps = 600) {
  const p = PERSONAS[pk];
  const s = G.newGame(seed, p.char);
  const trace = { firstEventDay: null, bigMoments: [], events: [] };
  for (const k of p.shop) G.act(s, { type: 'shop', key: k });
  G.act(s, { type: 'depart' });
  let steps = 0;
  while (!s.over && steps++ < maxSteps) {
    const before = s.log.length;
    if (s.event) {
      const ev = s.event; trace.events.push(ev.key); if (trace.firstEventDay === null) trace.firstEventDay = s.day;
      let v = p.event(s, ev, ev.options);
      if (ev.key === 'mountie') {
        const ok = ev.options.map((o, i) => [o, i]).filter(([o]) => o.ok !== false);
        const pref = p.event(s, ev) || (ok.find(([o]) => o.v === 'buy') ? 'buy' : ok.find(([o]) => o.v === 'later') ? 'later' : ok.find(([o]) => o.v === 'bribe') ? 'bribe' : 'quit');
        v = ok.find(([o]) => o.v === pref) ? pref : ok.find(([o]) => o.v === 'buy') ? 'buy' : ok.find(([o]) => o.v === 'bribe') ? 'bribe' : 'quit';
      }
      let i = ev.options.findIndex(o => o.v === v && o.ok !== false);
      if (i < 0) i = ev.options.findIndex(o => o.ok !== false);
      G.act(s, { type: 'choose', i });
      if (ev.key === 'mountie' && v === 'later') { s._wentBack = (s._wentBack || 0) + 1; }
      continue;
    }
    const target = lowestCamp(s);
    if (s.pos === 4 && target === 4) { G.act(s, { type: 'mounties' }); continue; }
    if (s.pos === 4 && s._wentBack > 2) { G.act(s, { type: 'mounties' }); continue; }
    if (s.pos > target) { if (s.stamina >= 1) G.act(s, { type: 'back' }); else G.act(s, { type: 'rest' }); continue; }
    if (s.pos < target) { if (s.stamina >= 1) G.act(s, { type: 'up' }); else G.act(s, { type: 'rest' }); continue; }
    const here = s.camps[s.pos];
    if (here.buried.length && s.stamina >= 2) { G.act(s, { type: 'dig' }); continue; }
    if (G.campHas(s, s.pos, 'tobacco') && (p.reserve > 0)) G.act(s, { type: 'sell' });
    if (p.tram && s.pos === 3 && s.cash - 6 >= p.reserve + (s.guard !== null ? 0 : 0)) { G.act(s, { type: 'tram', n: Math.floor((s.cash - p.reserve) / 6) }); if (!s.camps[3].cards.length) continue; }
    if (s.pos === 4 || !here.cards.length) { if (s.stamina >= 1 && s.pos < 4) G.act(s, { type: 'up' }); else G.act(s, { type: 'rest' }); continue; }
    let ids = G.autoPack(s); const sleep = p.sleep(s, ids); ids = p.smartGear ? G.autoPack(s, sleep) : G.autoPack(s);
    const cost = G.haulCost(s, ids);
    if (G.capacity(s, ids) === 0 || s.stamina < cost + p.restBuffer) { G.act(s, { type: 'rest' }); continue; }
    if (s.packers && s.cash < p.reserve + 10) G.act(s, { type: 'packers' });
    if (s.guard !== null && s.guard !== s.pos && s.camps[s.guard].cards.length === 0) G.act(s, { type: 'guard' }) ;
    if (p.guard && sleep === 'dest' && here.cards.length > ids.length && s.guard === null && s.cash >= 5 + p.reserve) G.act(s, { type: 'guard' });
    G.act(s, { type: 'haul', ids, sleep });
    for (const l of s.log.slice(before)) if (/AVALANCHE|Thieves|Mountie|soaks/.test(l.msg)) trace.bigMoments.push(`d${l.day}: ${l.msg}`);
  }
  return { s, trace, score: G.score(s) };
}

if ((process.argv[1] || '').endsWith('personas.mjs')) {
  const N = +(process.argv[2] || 300);
  for (const pk of Object.keys(PERSONAS)) {
    const res = []; for (let i = 1; i <= N; i++) res.push(playRun(i * 7919, pk));
    const wins = res.filter(r => r.s.over?.win), unfinished = res.filter(r => !r.s.over);
    const avg = (a, f) => a.length ? (a.reduce((x, r) => x + f(r), 0) / a.length) : 0;
    const reasons = {}; for (const r of res) { const k = !r.s.over ? 'STUCK' : r.s.over.win ? (/bribe|pockets/.test(r.s.over.reason) ? 'win-bribe' : /quitters/.test(r.s.over.reason) ? 'win-bought' : 'win-clean') : (/winter/.test(r.s.over.reason) ? 'lose-winter' : /bribe|insulted/.test(r.s.over.reason) ? 'lose-bribe' : 'lose-other'); reasons[k] = (reasons[k] || 0) + 1; }
    console.log(`\n## ${pk}  win ${(wins.length / N * 100).toFixed(0)}%  stuck ${unfinished.length}`);
    console.log('  outcomes', JSON.stringify(reasons));
    console.log(`  days avg ${avg(res, r => r.s.day).toFixed(1)}  decisions avg ${avg(res, r => r.s.stats.decisions).toFixed(0)}  events/run ${avg(res, r => r.trace.events.length).toFixed(1)}`);
    console.log(`  lost lb: stolen ${avg(res, r => r.s.stats.stolen).toFixed(0)} buried ${avg(res, r => r.s.stats.buried).toFixed(0)} ruined ${avg(res, r => r.s.stats.ruined).toFixed(0)} eaten ${avg(res, r => r.s.stats.eaten).toFixed(0)}  avalanches/run ${avg(res, r => r.s.stats.avalanches).toFixed(2)} thefts/run ${avg(res, r => r.s.stats.thefts).toFixed(1)}  cash end ${avg(res, r => r.s.cash).toFixed(0)}`);
    console.log(`  score avg ${avg(res, r => r.score).toFixed(0)}  first event day ${avg(res.filter(r => r.trace.firstEventDay), r => r.trace.firstEventDay).toFixed(1)}`);
  }
}
