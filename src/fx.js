// Falling snow, screen shake, floating numbers. Light enough for phones.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let cv, cx, flakes = [], wind = 0.6, density = 1, raf = 0, last = 0;
export function startSnow(canvas) {
  cv = canvas; cx = cv.getContext('2d');
  const resize = () => { const r = devicePixelRatio > 1 ? 1.5 : 1; cv.width = innerWidth * r; cv.height = innerHeight * r; cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; cx.setTransform(r, 0, 0, r, 0, 0); };
  resize(); addEventListener('resize', resize);
  const n = reduce ? 0 : Math.min(160, Math.round(innerWidth * innerHeight / 7000));
  flakes = Array.from({ length: n }, () => mk(true));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = 0; loop(0); } });
  loop(0);
}
function mk(any) { const z = Math.random(); return { x: Math.random() * innerWidth * 1.3 - innerWidth * 0.3, y: any ? Math.random() * innerHeight : -10, z, r: 0.6 + z * 2.2, vy: 30 + z * 70, ph: Math.random() * 6.28 }; }
export function setSnow(w, d = 1) { wind = w; density = d; }
function loop(t) {
  cancelAnimationFrame(raf); if (document.hidden || !cx) return;
  const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016; last = t;
  cx.clearRect(0, 0, innerWidth, innerHeight);
  const lim = Math.floor(flakes.length * density);
  cx.fillStyle = 'rgba(255,252,245,0.85)';
  for (let i = 0; i < lim; i++) {
    const f = flakes[i]; f.ph += dt * 1.3;
    f.y += f.vy * dt; f.x += (wind * 90 * (0.4 + f.z) + Math.sin(f.ph) * 12) * dt;
    if (f.y > innerHeight + 5 || f.x > innerWidth + 20) Object.assign(f, mk(false));
    cx.globalAlpha = 0.35 + f.z * 0.6; cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 6.283); cx.fill();
  }
  cx.globalAlpha = 1;
  raf = requestAnimationFrame(loop);
}
export function shake(el = document.body, strong = false) {
  if (reduce) return; el.classList.remove('shake', 'shake-big'); void el.offsetWidth; el.classList.add(strong ? 'shake-big' : 'shake');
}
export function floatText(anchor, text, tone = 'bad') {
  if (!anchor) return; const r = anchor.getBoundingClientRect(); const d = document.createElement('div');
  d.className = 'floatnum ' + tone; d.textContent = text; d.style.left = (r.left + r.width * (0.55 + Math.random() * 0.3)) + 'px'; d.style.top = (r.top + r.height * 0.2) + 'px';
  document.body.appendChild(d); setTimeout(() => d.remove(), 1600);
}
export function stamp(container, text, tone) {
  const d = document.createElement('div'); d.className = 'stamp ' + tone; d.textContent = text; container.appendChild(d);
}
