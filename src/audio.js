// Ambient wind (synthesized) + Kenney CC0 SFX. Starts on first user gesture.
let ctx = null, master = null, windGain = null, buffers = {}, muted = false, started = false;
try { muted = localStorage.getItem('tog_mute') === '1'; } catch { }
const FILES = ['place', 'slide', 'fan', 'coins', 'drop', 'crack', 'hit', 'good', 'bad', 'step1', 'step2', 'flip', 'thud'];
export function isMuted() { return muted; }
export function setMuted(m) { muted = m; try { localStorage.setItem('tog_mute', m ? '1' : '0'); } catch { } if (master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.2); }
export async function unlock() {
  if (started) { if (ctx?.state === 'suspended') ctx.resume(); return; }
  started = true;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
  startWind();
  for (const f of FILES) fetch(`assets/sfx/${f}.mp3`).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => buffers[f] = buf).catch(() => { });
}
function noiseBuffer(sec = 4) { const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } return b; }
function startWind() {
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer(6); src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.7;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lfoG = ctx.createGain(); lfoG.gain.value = 260; lfo.connect(lfoG); lfoG.connect(bp.frequency);
  windGain = ctx.createGain(); windGain.gain.value = 0.0001; windGain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 3);
  const gust = ctx.createOscillator(); gust.frequency.value = 0.11; const gustG = ctx.createGain(); gustG.gain.value = 0.22; gust.connect(gustG); gustG.connect(windGain.gain);
  src.connect(bp); bp.connect(windGain); windGain.connect(master); src.start(); lfo.start(); gust.start();
}
export function windLevel(v) { if (windGain) windGain.gain.setTargetAtTime(v, ctx.currentTime, 1.5); }
export function sfx(name, vol = 0.7, rate = 1) {
  if (!ctx || muted) return; const b = buffers[name]; if (!b) return;
  const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate * (0.94 + Math.random() * 0.12); const g = ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); s.start();
}
export function rumble(sec = 2.2) {
  if (!ctx || muted) return;
  const s = ctx.createBufferSource(); s.buffer = noiseBuffer(sec); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(1.6, ctx.currentTime + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + sec);
  s.connect(lp); lp.connect(g); g.connect(master); s.start(); sfx('crack', 0.9, 0.7);
}
