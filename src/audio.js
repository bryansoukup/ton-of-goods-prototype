// Ambient wind (synthesized) + looping title bed + Kenney CC0 SFX + stings.
// Audio starts on the first user gesture, per browser autoplay rules.
let ctx = null, master = null, windGain = null, musicGain = null, musicSrc = null;
let buffers = {}, raw = {}, muted = false, started = false, bedName = 'title';
try { muted = localStorage.getItem('tog_mute') === '1'; } catch { }

const FILES = ['place', 'slide', 'fan', 'coins', 'drop', 'crack', 'hit', 'good', 'bad', 'step1', 'step2', 'flip', 'thud', 'theme', 'win', 'lose'];

// Prefetch so the first tap can play as soon as we decode.
for (const f of FILES) fetch(`assets/sfx/${f}.mp3`).then(r => r.arrayBuffer()).then(b => { raw[f] = b; }).catch(() => { });

export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('tog_mute', m ? '1' : '0'); } catch { }
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.08);
}

export async function unlock() {
  if (started) { if (ctx?.state === 'suspended') await ctx.resume(); return; }
  started = true;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
  startWind();
  for (const f of FILES) {
    try {
      const ab = raw[f] || await fetch(`assets/sfx/${f}.mp3`).then(r => r.arrayBuffer());
      raw[f] = ab;
      buffers[f] = await ctx.decodeAudioData(ab.slice(0));
    } catch { }
  }
  startBed(bedName);
}

function noiseBuffer(sec = 4) {
  const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
  let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  return b;
}
function startWind() {
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer(6); src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.7;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lfoG = ctx.createGain(); lfoG.gain.value = 260; lfo.connect(lfoG); lfoG.connect(bp.frequency);
  windGain = ctx.createGain(); windGain.gain.value = 0.0001; windGain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 3);
  const gust = ctx.createOscillator(); gust.frequency.value = 0.11; const gustG = ctx.createGain(); gustG.gain.value = 0.18; gust.connect(gustG); gustG.connect(windGain.gain);
  src.connect(bp); bp.connect(windGain); windGain.connect(master); src.start(); lfo.start(); gust.start();
}
export function windLevel(v) { if (windGain && ctx) windGain.gain.setTargetAtTime(Math.max(0.0001, v), ctx.currentTime, 1.5); }

function whenReady(name, fn) {
  if (buffers[name]) { fn(); return; }
  const t0 = Date.now();
  const iv = setInterval(() => {
    if (buffers[name] || Date.now() - t0 > 2500) { clearInterval(iv); if (buffers[name]) fn(); }
  }, 40);
}

export function sfx(name, vol = 0.7, rate = 1) {
  if (!ctx || muted) return;
  whenReady(name, () => {
    if (!ctx || muted) return;
    const s = ctx.createBufferSource(); s.buffer = buffers[name];
    s.playbackRate.value = rate * (0.94 + Math.random() * 0.12);
    const g = ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); s.start();
  });
}

export function setBed(name) {
  bedName = name;
  if (!ctx) return;
  if (name === 'none') { stopBed(); return; }
  startBed(name);
}
function stopBed() {
  if (musicSrc) { try { musicSrc.stop(); } catch { } musicSrc = null; }
}
function startBed(name) {
  if (!ctx || !buffers.theme) return;
  const vol = name === 'title' ? 0.46 : 0.22;
  if (musicSrc && musicGain) {
    musicGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.8);
    return;
  }
  stopBed();
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.0001;
  musicGain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 2.2);
  musicGain.connect(master);
  musicSrc = ctx.createBufferSource();
  musicSrc.buffer = buffers.theme;
  musicSrc.loop = true;
  musicSrc.connect(musicGain);
  musicSrc.start();
}
export function sting(name, vol = 0.85) {
  if (musicGain && ctx) {
    const t = ctx.currentTime;
    const back = bedName === 'title' ? 0.46 : 0.22;
    musicGain.gain.setTargetAtTime(0.05, t, 0.08);
    musicGain.gain.setTargetAtTime(back, t + 2.4, 0.7);
  }
  sfx(name, vol, 1);
}

export function rumble(sec = 2.2) {
  if (!ctx || muted) return;
  const s = ctx.createBufferSource(); s.buffer = noiseBuffer(sec);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(1.6, ctx.currentTime + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + sec);
  s.connect(lp); lp.connect(g); g.connect(master); s.start(); sfx('crack', 0.9, 0.7);
}
