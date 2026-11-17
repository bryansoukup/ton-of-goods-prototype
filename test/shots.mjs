import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8765/';
const b = await chromium.launch();
for (const [n, vp] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 900 }]]) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: n === 'phone' ? 2 : 1 });
  await p.goto(URL + '?seed=4242'); await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForTimeout(3000); await p.screenshot({ path: `/workspace/ton-of-goods/shots/title-${n}.png` });
  await p.click('#begin'); await p.waitForTimeout(1200); await p.screenshot({ path: `/workspace/ton-of-goods/shots/select-${n}.png` });
  await p.click('[data-c="greenhorn"]'); await p.waitForTimeout(500); await p.click('[data-k="sled"]'); await p.click('#go'); await p.waitForTimeout(400);
  for (let i = 0; i < 6; i++) { if (await p.evaluate(() => !!window.__tog.state.event)) { await (await p.$$('#sheet [data-i]:not([disabled])'))[0].click(); continue; } const en = await p.$('#haulO:not([disabled])'); if (en) await en.click(); else await p.click('#rest', { timeout: 2000 }).catch(() => { }); await p.waitForTimeout(150); }
  if (await p.evaluate(() => !!window.__tog.state.event)) await (await p.$$('#sheet [data-i]:not([disabled])'))[0].click();
  for (const k of ['coffee', 'flour', 'flour']) { const e = await p.$(`[data-p="${k}"]:not([disabled])`); if (e) await e.click(); }
  await p.waitForTimeout(600); await p.screenshot({ path: `/workspace/ton-of-goods/shots/game-${n}.png` });
  await p.close();
}
await b.close();
