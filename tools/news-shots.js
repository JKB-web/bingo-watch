#!/usr/bin/env node
// Takes the screenshots shown with the updates in "Nyt siden sidst" / the manual chapter "Nyheder".
//   node tools/news-shots.js            -> all pictures
//   node tools/news-shots.js 2026-11-23.2  -> only that update
// Pictures are written to img/news/<id>.webp. Data comes from the saved test answers (tests/fixtures);
// map tiles and radar come from the internet, so the pictures look like the real site.
// To add a picture for a new update: add a scene below with the update's id, and `img` in js/changelog.js.
const { chromium, devices } = require('playwright');
const path = require('path'), fs = require('fs');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const FILE = 'file://' + path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'img', 'news');
const LOCAL_ML = path.join(ROOT, 'node_modules', 'maplibre-gl', 'dist');
const fixtures = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'network.json'), 'utf8')).entries; } catch (e) { return {}; } })();
const PROXY = [/^https:\/\/api\.allorigins\.win\/raw\?url=(.+)$/, /^https:\/\/corsproxy\.io\/\?(.+)$/, /^https:\/\/api\.codetabs\.com\/v1\/proxy\?quest=(.+)$/];
const keyOf = u => { for (const re of PROXY) { const m = u.match(re); if (m) return decodeURIComponent(m[1]); } return u; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DESK = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

async function open(browser, opts, seen) {
  const ctx = await browser.newContext(opts);
  await ctx.route('**/*', route => {
    const u = route.request().url();
    if (u.includes('maplibre-gl.js')) return route.fulfill({ path: path.join(LOCAL_ML, 'maplibre-gl.js'), contentType: 'application/javascript' });
    if (u.includes('maplibre-gl.css')) return route.fulfill({ path: path.join(LOCAL_ML, 'maplibre-gl.css'), contentType: 'text/css' });
    const e = fixtures[keyOf(u)];
    if (e) return route.fulfill({ status: 200, contentType: e.contentType, body: e.text !== undefined ? e.text : Buffer.from(e.base64, 'base64'), headers: { 'access-control-allow-origin': '*' } });
    return route.continue();
  });
  await ctx.addInitScript(s => {
    let x = 7; Math.random = () => (x = (x * 16807) % 2147483647) / 2147483647;   // same flights every time
    try { localStorage.setItem('bingoGadss', 'off'); if (s) localStorage.setItem('bingoSeenChangelog', s); } catch (e) {}
  }, seen || null);
  const pg = await ctx.newPage(); pg.on('dialog', d => d.accept());
  await pg.goto(FILE); await sleep(3500);
  await pg.evaluate(() => setLanguage('da')); await sleep(300);   // all pictures in Danish
  // the pictures themselves must not show up inside a picture
  await pg.addStyleTag({ content: '.news-thumb { display: none !important; } #toast { display: none !important; }' });
  return { ctx, pg };
}
const start = async pg => { await pg.click('.start-btn'); await sleep(400); };
const draw = (pg, n) => pg.evaluate(n => { for (let i = 0; i < n; i++) finalize(); }, n);

// one function per update id; each returns a PNG buffer
const SCENES = {
  '2026-11-27.1': async (b) => {
    const { ctx, pg } = await open(b, DESK);
    await start(pg);
    await pg.evaluate(async () => {
      document.querySelectorAll('.content-wrapper > .window').forEach(w => w.style.display = 'none');
      ['#hud-stats', '.coord-pill', '.fab-container', '.ops-right-toolbar'].forEach(s => document.querySelectorAll(s).forEach(e => e.style.visibility = 'hidden'));
      await toggleWxLayer('zones');
      const A = c => AIRPORT_DB.find(a => a.code === c);
      const pairs = [['EKCH', 'RJTT'], ['EGLL', 'VHHH'], ['EDDF', 'OMDB'], ['EFHK', 'ZBAA'], ['LFPG', 'VIDP'], ['EHAM', 'WSSS'], ['ESSA', 'VTBS']];
      const feats = pairs.map(([d, e], i) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: buildRealisticRoute(A(d), A(e), 100 + i).track } }));
      map.addSource('news-routes', { type: 'geojson', data: { type: 'FeatureCollection', features: feats } });
      map.addLayer({ id: 'news-routes', type: 'line', source: 'news-routes', paint: { 'line-color': '#2f8a4c', 'line-width': 2.2 } });
      map.jumpTo({ center: [72, 40], zoom: 2.35 }); });
    await sleep(4000);
    const png = await pg.screenshot({ clip: { x: 60, y: 50, width: 1320, height: 800 } }); await ctx.close(); return png;
  },
  '2026-11-26.2': async (b) => {
    const { ctx, pg } = await open(b, DESK, '2026-11-23.1');
    const png = await pg.locator('#start-overlay .briefing-card').screenshot(); await ctx.close(); return png;
  },
  '2026-11-26.1': async (b) => {
    const { ctx, pg } = await open(b, DESK);
    await start(pg); await draw(pg, 9); await sleep(2500);
    const png = await pg.locator('#panel-control').screenshot(); await ctx.close(); return png;
  },
  '2026-11-23.2': async (b) => {
    const { ctx, pg } = await open(b, DESK);
    await start(pg); await draw(pg, 30); await sleep(1500);
    await pg.evaluate(() => { ['panel-log', 'panel-control', 'panel-grid'].forEach(id => { const w = document.getElementById(id); if (w) w.style.display = 'none'; });
      // the airport with the most traffic, so the card has something to show
      const n = {}; Object.values(activePlaneMarkers).forEach(p => [p.depAirport, p.destAirport].forEach(a => { if (a) n[a.code] = (n[a.code] || 0) + 1; }));
      const code = Object.keys(n).filter(c => AIRPORT_DB.some(a => a.code === c)).sort((a, b) => n[b] - n[a])[0] || currentICAO;
      const ap = AIRPORT_DB.find(a => a.code === code); window.__ap = code; map.jumpTo({ center: [ap.lon + 6, ap.lat - 2], zoom: 4.6 }); });
    await sleep(2500); await pg.evaluate(() => openAirportCard(window.__ap)); await sleep(1500);
    const r = await pg.evaluate(() => { const c = document.getElementById('ap-card').getBoundingClientRect(); return { x: c.left, y: c.top, w: c.width, h: c.height }; });
    const pad = 40, x = Math.max(0, r.x - 260), y = Math.max(0, r.y - pad);
    const png = await pg.screenshot({ clip: { x, y, width: Math.min(1440 - x, r.x + r.w + pad - x), height: Math.min(900 - y, r.h + 2 * pad) } }); await ctx.close(); return png;
  },
  '2026-11-23.1': async (b) => {
    const { ctx, pg } = await open(b, DESK);
    await start(pg);
    await pg.evaluate(async () => { document.querySelectorAll('.content-wrapper > .window').forEach(w => w.style.display = 'none');
      for (let i = 0; i < 60 && ATMO.fetching; i++) await new Promise(r => setTimeout(r, 500));
      ['#hud-stats', '.coord-pill', '#wxLegend', '.wx-legend', '.carto-osm-badge', '.fab-container', '.ops-right-toolbar', '.maplibregl-ctrl-bottom-right', '.maplibregl-ctrl-bottom-left'].forEach(s => document.querySelectorAll(s).forEach(e => e.style.visibility = 'hidden'));
      toggleGlobeProjection(); await toggleWxLayer('jet'); await toggleWxLayer('flow'); map.jumpTo({ center: [-8, 44], zoom: 1.85 }); });
    await pg.addStyleTag({ content: '*:has(> .lg-row) { visibility: hidden !important; }' });   // the colour legend
    await sleep(6000);
    const c = await pg.evaluate(() => { const r = map.getContainer().getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const png = await pg.screenshot({ clip: { x: Math.round(c.x - 560), y: 50, width: 1120, height: 830 } }); await ctx.close(); return png;
  },
  '2026-11-22.1': async (b) => {
    const { ctx, pg } = await open(b, DESK);
    await start(pg); await draw(pg, 14); await sleep(2000);
    await pg.evaluate(() => { ['panel-control', 'panel-grid'].forEach(id => { const w = document.getElementById(id); if (w) w.style.display = 'none'; });
      const p = Object.values(activePlaneMarkers).filter(p => !p.landed).sort((a, b) => (b.flightDurationMin || b.duration || 0) - (a.flightDurationMin || a.duration || 0))[0] || Object.values(activePlaneMarkers)[0];
      selectFlightFromLog(p.num); window.__p = p; });
    await sleep(2500);
    await pg.evaluate(() => { const p = window.__p; setGadssEnabled(true); startGadss(p); escalateGadss(p); p.gadss.resolveAt = Infinity; });
    await sleep(2500);
    const png = await pg.screenshot(); await ctx.close(); return png;
  },
  '2026-11-21.1': async (b) => {
    const shots = [];
    for (const step of ['map', 'flight']) {
      const { ctx, pg } = await open(b, { ...devices['Pixel 7'] });
      await start(pg); await draw(pg, 8); await sleep(2000);
      if (step === 'flight') { await pg.evaluate(() => { const p = Object.values(activePlaneMarkers).find(p => !p.landed) || Object.values(activePlaneMarkers)[0]; selectFlightFromLog(p.num); }); await sleep(3500); }
      else { await pg.evaluate(() => mobileSetTab('draw')); await sleep(1200); }
      shots.push(await pg.screenshot()); await ctx.close();
    }
    return shots;   // combined side by side below
  },
  '2026-11-20.1': async (b) => {
    const { ctx, pg } = await open(b, DESK);
    await start(pg); await draw(pg, 6); await sleep(1500);
    await pg.evaluate(() => openManual('map')); await sleep(1200);
    const png = await pg.screenshot(); await ctx.close(); return png;
  }
};

// PNG(s) -> one WebP, at most 1200 px wide (two phone shots are placed side by side on a light background)
function toWebp(id, shot) {
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = path.join(OUT, '.tmp-' + id.replace('.', '-'));
  const ins = (Array.isArray(shot) ? shot : [shot]).map((buf, i) => { const f = tmp + '-' + i + '.png'; fs.writeFileSync(f, buf); return f; });
  const out = path.join(OUT, id.replace('.', '-') + '.webp');
  const py = `
import sys
from PIL import Image
ins, out = sys.argv[1:-1], sys.argv[-1]
ims = [Image.open(f).convert('RGB') for f in ins]
if len(ims) > 1:
    h = max(i.height for i in ims); gap = 60
    W = sum(i.width for i in ims) + gap * (len(ims) + 1); bg = Image.new('RGB', (W, h + 2 * gap), (232, 236, 242)); x = gap
    for i in ims: bg.paste(i, (x, gap)); x += i.width + gap
    im = bg
else: im = ims[0]
if im.width > 1200: im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
im.save(out, 'WEBP', quality=80, method=6)
print(out, im.size)`;
  const res = execFileSync('python3', ['-I', '-c', py, ...ins, out]).toString().trim();
  ins.forEach(f => fs.unlinkSync(f));
  return res;
}

(async () => {
  const only = process.argv[2];
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [id, scene] of Object.entries(SCENES)) {
    if (only && id !== only) continue;
    try { console.log(id, '->', toWebp(id, await scene(browser))); }
    catch (e) { console.log(id, 'FAILED', e.message.split('\n')[0]); }
  }
  await browser.close();
})();
