// Drives the real UI in headless Chromium by tapping buttons, like a player would.
import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8765/';
const runs = [{ name: 'phone', vp: { width: 390, height: 844 }, char: 'greenhorn', seed: 42 }, { name: 'desktop', vp: { width: 1280, height: 900 }, char: 'partners', seed: 7 }];
const browser = await chromium.launch();
let fail = 0;
for (const r of runs) {
  const page = await browser.newPage({ viewport: r.vp });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL + '?seed=' + r.seed); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.screenshot({ path: `shots/${r.name}-0-title.png`, fullPage: false });
  await page.click(`[data-c="${r.char}"]`);
  await page.screenshot({ path: `shots/${r.name}-1-outfitter.png` });
  await page.click('[data-k="sled"]'); await page.click('[data-k="food"]');
  await page.click('#go');
  await page.screenshot({ path: `shots/${r.name}-2-day1.png` });
  let steps = 0, shotMid = false, shotBurn = false;
  const vis = async sel => (await page.$(sel)) && await page.isVisible(sel) && await page.isEnabled(sel);
  while (steps++ < 400) {
    const st = await page.evaluate(() => { const s = window.__tog.state; return s && { over: !!s.over, ev: s.event?.key, pos: s.pos, day: s.day, here: s.camps[s.pos].cards.length, buried: s.camps[s.pos].buried.length, behind: [0, 1, 2, 3].some(i => i < s.pos && (s.camps[i].cards.length || s.camps[i].buried.length)) }; });
    if (!st || st.over) break;
    if (!shotMid && st.pos >= 2) { shotMid = true; await page.screenshot({ path: `shots/${r.name}-3-mid.png` }); }
    if (st.ev) {
      if (st.ev === 'mountie') await page.screenshot({ path: `shots/${r.name}-4-mountie.png` });
      const btns = await page.$$('#sheet [data-i]:not([disabled])'); await btns[0].click(); continue;
    }
    if (st.buried && await vis('#dig')) { await page.click('#dig'); continue; }
    if (st.pos === 4 && !st.behind) { await page.click('#mounties2'); continue; }
    if (st.day === 6 && !shotBurn && await vis('[data-u]')) { shotBurn = true; await page.click('[data-u]'); }
    if (!st.here && st.behind) { if (await vis('#back')) await page.click('#back'); else await page.click('#rest'); continue; }
    if (!st.here && !st.behind && st.pos < 4) { if (await vis('#up')) await page.click('#up'); else await page.click('#rest'); continue; }
    if (await vis('#haulO')) { await page.click('#haulO'); continue; }
    if (await vis('#haulD')) { await page.click('#haulD'); continue; }
    await page.click('#rest');
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: `shots/${r.name}-5-end.png` });
  const end = await page.evaluate(() => { const s = window.__tog.state; return { over: s?.over, day: s?.day, endShown: !!document.querySelector('#again') }; });
  console.log(r.name, 'steps', steps, JSON.stringify(end), 'errors', errors.length ? errors : 'none');
  if (errors.length || !end.over || !end.endShown) fail++;
  // replay flow works
  await page.click('#again'); if (!(await page.$('[data-c="greenhorn"]'))) { console.log('restart failed'); fail++; }
  await page.close();
}
await browser.close();
process.exit(fail ? 1 : 0);
