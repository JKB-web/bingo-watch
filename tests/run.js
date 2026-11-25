#!/usr/bin/env node
// Bingo Watch end-to-end checks (drawing, undo, manual mode, save/restore, cards, verify, prizes,
// flights, map, weather layers with real recorded data, themes, big screen, seasons, layout, mobile).
//   npm test                         -> tests index.html with the saved answers in tests/fixtures (no internet)
//   node tests/run.js dist/bingo-watch.html
//   NET=live npm test                -> use the real internet instead (counts against the free services' limits)
// Needs: npm install (installs Playwright + MapLibre), then `npx playwright install chromium` once.
const { chromium, devices } = require('playwright');
const path = require('path'), fs = require('fs');
const FILE = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
const net = require('./net');   // replay saved answers (default), or NET=live / NET=offline
const results = []; const errs = [];
const check = (area, name, ok, info='') => results.push({ area, name, ok: !!ok, info: String(info).slice(0, 140) });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function setup(ctxOpts = { viewport: { width: 1440, height: 900 } }, label='desktop') {
  const ctx = await browser.newContext(ctxOpts);
  await net.attach(ctx);
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(`[${label}] PAGEERR ${e.message}`));
  pg.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|ERR_INTERNET|Failed to load resource|net::|smartWeatherSearch|Style is not done loading|Live atmosphere|CORS|fetch/i.test(m.text())) errs.push(`[${label}] CONSOLE ${m.text().slice(0, 200)}`); });
  pg.on('popup', async p => { await p.close().catch(()=>{}); });
  return { ctx, pg };
}
let browser;
(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  let { ctx, pg } = await setup();
  let dialogAnswer = true; pg.on('dialog', d => dialogAnswer ? d.accept() : d.dismiss());
  await pg.goto(FILE); await sleep(3500);
  await pg.evaluate(() => localStorage.clear()); await pg.reload(); await sleep(3500);

  // ---------- start / language ----------
  check('Start', 'Velkomstkort vises', await pg.isVisible('.briefing-card'));
  check('Start', 'Ingen scroll i velkomstkort (desktop)', await pg.evaluate(() => { const c = document.querySelector('.briefing-card'); return getComputedStyle(c).overflowY === 'hidden' || c.scrollHeight <= c.clientHeight + 1; }));
  await pg.click('.lang-btn[data-set-lang="da"]').catch(async () => pg.evaluate(() => setLanguage('da')));
  check('Sprog', 'Dansk valgt', await pg.evaluate(() => currentLang === 'da' && document.querySelector('[data-lang="drawBtn"]').innerText.toUpperCase().includes('TRÆK')));
  await pg.click('.start-btn'); await sleep(500);
  check('Start', 'Velkomst lukker', !(await pg.isVisible('.briefing-card')));
  check('Kort', 'MapLibre-kort oprettet', await pg.evaluate(() => !!map && map.loaded !== undefined));

  // ---------- drawing ----------
  await pg.click('.btn-draw'); await sleep(1400);
  check('Træk', 'Træk-knap trækker 1 tal', await pg.evaluate(() => drawnNumbers.length === 1), await pg.evaluate(() => drawnNumbers));
  await pg.keyboard.press('Space'); await sleep(1400);
  check('Træk', 'Mellemrum trækker', await pg.evaluate(() => drawnNumbers.length === 2));
  await pg.evaluate(() => { drawNumber(); drawNumber(); drawNumber(); }); await sleep(1400);
  check('Træk', 'Dobbelttryk under animation giver kun ét tal', await pg.evaluate(() => drawnNumbers.length === 3));
  const ui = await pg.evaluate(() => ({ n: drawnNumbers.length, cells: document.querySelectorAll('.grid-cell.active').length, latest: document.querySelectorAll('.grid-cell.latest').length,
      drawn: document.getElementById('drawnCount').innerText, remain: document.getElementById('remainCount').innerText, rows: document.querySelectorAll('#flightLogTableBody tr.flight-row').length,
      planes: document.querySelectorAll('.radar-plane').length, cur: document.getElementById('currentNumber').innerText, last: drawnNumbers[drawnNumbers.length - 1],
      recent: document.querySelectorAll('#recentStrip .rc').length }));
  check('Træk', 'Gitter, tællere, log og fly stemmer', ui.cells === 3 && ui.latest === 1 && ui.drawn === '3' && ui.remain === '87' && ui.rows === 3 && ui.planes === 3 && +ui.cur === ui.last, JSON.stringify(ui));
  check('Træk', 'Seneste tal-strip', ui.recent === 2);
  await pg.evaluate(() => { for (let i = 0; i < 87; i++) finalize(); });
  const all = await pg.evaluate(() => ({ n: drawnNumbers.length, u: new Set(drawnNumbers).size, min: Math.min(...drawnNumbers), max: Math.max(...drawnNumbers) }));
  check('Træk', 'Alle 90 tal unikke 1–90', all.n === 90 && all.u === 90 && all.min === 1 && all.max === 90, JSON.stringify(all));
  await pg.evaluate(() => drawNumber()); await sleep(300);
  check('Træk', 'Træk nr. 91 afvises', await pg.evaluate(() => drawnNumbers.length === 90));
  await sleep(1500);
  check('Fly', '90 fly animeres uden fejl', await pg.evaluate(() => Object.keys(activePlaneMarkers).length === 90));

  // ---------- undo / reset ----------
  await pg.click('#fab-undo'); await sleep(200);
  check('Fortryd', 'Fortryd fjerner sidste tal + fly + logrække', await pg.evaluate(() => drawnNumbers.length === 89 && Object.keys(activePlaneMarkers).length === 89 && document.querySelectorAll('#flightLogTableBody tr.flight-row').length === 89));
  dialogAnswer = false; await pg.click('.new-game-btn'); await sleep(200);
  check('Nyt spil', 'Annullér beholder spillet', await pg.evaluate(() => drawnNumbers.length === 89));
  dialogAnswer = true; await pg.click('.new-game-btn'); await sleep(300);
  check('Nyt spil', 'Bekræft nulstiller alt', await pg.evaluate(() => drawnNumbers.length === 0 && !document.querySelector('.grid-cell.active') && !document.querySelector('.radar-plane') && document.getElementById('flightTime').innerText === '00:00'));

  // ---------- manual mode ----------
  await pg.evaluate(() => toggleManualMode(true));
  await pg.click('#cell-7'); await pg.click('#cell-42'); await sleep(200);
  check('Manuel', 'Klik markerer tal', await pg.evaluate(() => drawnNumbers.join(',') === '7,42'));
  dialogAnswer = false; await pg.click('#cell-7'); await sleep(100);
  check('Manuel', 'Klik på trukket tal + annullér beholder det', await pg.evaluate(() => drawnNumbers.includes(7)));
  dialogAnswer = true; await pg.click('#cell-7'); await sleep(100);
  check('Manuel', 'Klik på trukket tal + bekræft fjerner det', await pg.evaluate(() => !drawnNumbers.includes(7) && drawnNumbers.length === 1));
  await pg.evaluate(() => { drawNumber(); }); await pg.click('#cell-11'); await sleep(1400);
  check('Manuel', 'Klik under animation ignoreres', await pg.evaluate(() => !drawnNumbers.includes(11) || drawnNumbers.length === 2), await pg.evaluate(() => drawnNumbers));
  await pg.evaluate(() => toggleManualMode(false));

  // ---------- autopilot ----------
  await pg.evaluate(() => { document.getElementById('apSpeed').value = 1; });
  const before = await pg.evaluate(() => drawnNumbers.length);
  await pg.keyboard.press('a'); await sleep(4300); await pg.keyboard.press('a'); await sleep(1500);   // 1 s interval: ≥ 3 draws
  const after = await pg.evaluate(() => drawnNumbers.length);
  check('Autopilot', 'Trækker automatisk og stopper', after - before >= 3 && await pg.evaluate(() => autopilotInterval === null), `${before}->${after}`);

  // ---------- persistence ----------
  const snap = await pg.evaluate(() => ({ d: drawnNumbers.slice(), r: Object.values(activePlaneMarkers).map(p => p.depAirport.code + p.destAirport.code).sort().join() }));
  await pg.evaluate(() => setRound(2));
  await pg.reload(); await sleep(4000);
  const rest = await pg.evaluate(() => ({ d: drawnNumbers.slice(), r: Object.values(activePlaneMarkers).map(p => p.depAirport.code + p.destAirport.code).sort().join(), round: currentRound, lang: currentLang }));
  check('Gem', 'Tal gendannes efter genindlæsning', JSON.stringify(rest.d) === JSON.stringify(snap.d), `${snap.d.length} tal`);
  check('Gem', 'Samme ruter gendannes', rest.r === snap.r);
  check('Gem', 'Runde og sprog gendannes', rest.round === 2 && rest.lang === 'da');
  await pg.click('.start-btn').catch(() => {}); await sleep(300);

  // ---------- cards / verify ----------
  await pg.evaluate(() => { document.getElementById('gen-players').value = 4; document.getElementById('gen-cards').value = 2; generateAndPrintCards(); });
  await sleep(800);
  check('Plader', '8 plader genereret og gemt', await pg.evaluate(() => Object.keys(generatedCards).length === 8 && !!localStorage.getItem('bingoGeneratedCards')));
  check('Plader', 'Alle plader gyldige (5 pr. række, rigtige kolonner)', await pg.evaluate(() => Object.values(generatedCards).every(g => [0,1,2].every(r => g.filter(c => c[r]).length === 5) && g.every((col, c) => col.every(v => !v || (v >= (c ? c * 10 : 1) && v <= (c === 8 ? 90 : c * 10 + 9)))))));
  // build a deterministic situation: card 1-1 with exactly row 0 complete
  const vres = await pg.evaluate(async () => {
    resetGame(); const g = generatedCards['1-1']; const out = {};
    const row = r => g.map(c => c[r]).filter(Boolean);
    toggleManualMode(true); row(0).forEach(n => finalize(n)); toggleManualMode(false);
    const run = async (id) => { document.getElementById('verify-id').value = id; verifyWin(); await new Promise(r => setTimeout(r, 2600)); return document.getElementById('verify-status-text').innerText; };
    if (document.getElementById('panel-verify').style.display === 'none') toggleWindow('panel-verify');
    setRound(1, true); out.r1 = await run('1-1');
    setRound(2, true); out.r2 = await run('1-1');
    row(1).concat(row(2)).forEach(n => finalize(n)); setRound(3, true); out.full = await run('1-1');
    out.bad = await run('99-9');
    return out;
  });
  check('Tjek plade', '1 række godkendes i runde 1', /Gyldig/.test(vres.r1), vres.r1);
  check('Tjek plade', '1 række afvises i runde 2', /Ikke nok/.test(vres.r2), vres.r2);
  check('Tjek plade', 'Fuld plade godkendes', /fuld plade/i.test(vres.full), vres.full);
  check('Tjek plade', 'Ukendt plade-ID håndteres', /findes ikke/.test(vres.bad), vres.bad);

  // ---------- tie / prizes ----------
  const tie = await pg.evaluate(async () => { document.getElementById('tie-count').value = 5; resolveTie(); await new Promise(r => setTimeout(r, 2700)); return document.getElementById('tie-result').innerText.trim(); });
  check('Konflikt', 'Vinder trækkes mellem 1–5', /^Spiller [1-5]$/.test(tie), tie);
  const prize = await pg.evaluate(async () => { document.getElementById('totalSmall').value = 3; initPrizes('small'); const got = [];
    for (let i = 0; i < 3; i++) { drawPrize('small'); await new Promise(r => setTimeout(r, 2000)); got.push(document.getElementById('resSmall').innerText.trim()); }
    drawPrize('small'); await new Promise(r => setTimeout(r, 300)); return { got, empty: document.getElementById('resSmall').innerText.trim(), count: document.getElementById('smallCount').innerText }; });
  check('Gaver', '3 forskellige vindere, derefter tom pulje', new Set(prize.got).size === 3 && /Tom/.test(prize.empty) && prize.count === '0', JSON.stringify(prize));

  // ---------- flights / map ----------
  await pg.evaluate(() => { resetGame(); for (let i = 0; i < 6; i++) finalize(); }); await sleep(2500);
  const fl = await pg.evaluate(async () => {
    const n = drawnNumbers[0]; selectFlightFromLog(n); await new Promise(r => setTimeout(r, 1500));
    const o = { focus: focusedFlightNum === n, panel: document.getElementById('flight-focus').classList.contains('open'), chart: !!document.querySelector('#flight-profile-chart svg .pf-flown'),
                tracked: trackedFlightNum === n, pushed: document.body.classList.contains('flight-focus-open') };
    clearFlightSelection(); await new Promise(r => setTimeout(r, 1500));
    o.closed = focusedFlightNum === null && !document.getElementById('flight-focus').classList.contains('open'); o.zoom = map.getZoom().toFixed(1);
    return o; });
  check('Fly', 'Vælg fly åbner panel, graf og følger', fl.focus && fl.panel && fl.chart && fl.tracked && fl.pushed, JSON.stringify(fl));
  check('Fly', 'Fravælg lukker og zoomer ud', fl.closed && fl.zoom === '4.5', fl.zoom);
  const planeBox = await pg.evaluate(() => { const p = Object.values(activePlaneMarkers)[0]; map.jumpTo({ center: [p.lon, p.lat], zoom: 4 }); return p.num; });
  await pg.evaluate(() => document.querySelectorAll('.content-wrapper > .window').forEach(w => w.style.display = 'none')); await sleep(800);
  const box = await pg.evaluate(n => { const r = document.querySelector('#plane-obj-' + n + ' .plane-rotator').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, planeBox);
  await pg.mouse.click(box.x, box.y); await sleep(1200);
  check('Fly', 'Klik på fly på kortet vælger det', await pg.evaluate(n => focusedFlightNum === n, planeBox));
  await pg.evaluate(() => clearFlightSelection()); await sleep(600);
  const layerErrs = await pg.evaluate(async () => { const out = []; const ids = ['jet','barbs','cloud','cat','trop','icing','cyclone','volcano','sigmet'];
    for (const id of ids) { try { await toggleWxLayer(id); await new Promise(r => setTimeout(r, 300)); await toggleWxLayer(id); } catch (e) { out.push(id + ':' + e.message); } }
    for (const t of ['rings','radar']) { try { await toggleLiveLayer(t); await toggleLiveLayer(t); } catch (e) { out.push(t + ':' + e.message); } }
    try { toggleSun(); await new Promise(r => setTimeout(r, 300)); toggleSun(); } catch (e) { out.push('sun:' + e.message); }
    try { toggleGlobeProjection(); await new Promise(r => setTimeout(r, 1500)); toggleGlobeProjection(); } catch (e) { out.push('globe:' + e.message); }
    try { zoomMap('in'); zoomMap('out'); centerMapOnAirport(); } catch (e) { out.push('zoom:' + e.message); }
    return out; });
  check('Kort', 'Alle 9 vejrlag + ringe, radar, sol, globus, zoom kan slås til/fra', layerErrs.length === 0, layerErrs.join('; '));

  // ---------- icons: every icon name used must exist in the Material Icons font ----------
  if (net.MODE !== 'offline') {
    const src = ['index.html', ...fs.readdirSync(path.join(__dirname, '..', 'js')).map(f => 'js/' + f)].map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');
    const names = new Set();
    for (const re of [/icon: '([a-z0-9_]+)'/g, /material-icons(?:-outlined)?[^>]*>([a-z0-9_]+)</g, /I\('([a-z0-9_]+)'\)/g]) for (const mm of src.matchAll(re)) names.add(mm[1]);
    const missingIcons = await pg.evaluate(async (names) => { await document.fonts.ready; const out = [];
      for (const n of names) for (const cls of ['material-icons', 'material-icons-outlined']) { const s = document.createElement('span'); s.className = cls; s.textContent = n; s.style.fontSize = '24px'; document.body.appendChild(s);
        const w = s.getBoundingClientRect().width; s.remove(); if (w > 30) out.push(cls.replace('material-icons', 'mi') + ':' + n); }
      return out; }, [...names]);
    check('Ikoner', `Alle ${names.size} ikonnavne findes i ikon-skrifttypen`, missingIcons.length === 0, missingIcons.join(', '));
  }

  // ---------- weather with real (recorded) data ----------
  if (net.MODE !== 'offline') {
    for (let i = 0; i < 60 && await pg.evaluate(() => ATMO.fetching); i++) await sleep(1000);
    // share of grid points whose jet-level wind differs from the built-in model = points that came from Open-Meteo
    const atmo = await pg.evaluate(() => { const m = atmoModelNodes(), F = ATMO.F; let real = 0;
      if (ATMO.useLive) for (let k = 0; k < ATMO.total; k++) if (Math.abs(ATMO.nodes[k * F + 2] - m[k * F + 2]) > 0.5) real++;
      return { live: ATMO.useLive, real, total: ATMO.total }; });
    check('Vejrdata', 'Live vind/vejr fra Open-Meteo indlæst', atmo.live && atmo.real >= atmo.total * 0.75, JSON.stringify(atmo));
    const jet = await pg.evaluate(async () => {
      if (!liveWeatherState.jet) await toggleWxLayer('jet');
      const segs = buildJetsGeoJSON().features.filter(f => f.properties.kind === 'seg');
      const maxJump = Math.max(0, ...segs.map(f => Math.abs(f.geometry.coordinates[1][1] - f.geometry.coordinates[0][1])));
      await toggleWxLayer('jet'); return { segs: segs.length, maxJump: +maxJump.toFixed(2) }; });
    check('Vejrdata', 'Jetstrømme er glatte med rigtige data (ingen spring)', jet.segs > 40 && jet.maxJump < 2.5, JSON.stringify(jet));
    const radar = await pg.evaluate(async () => { if (!map.getLayer('layer-rainviewer-radar')) await loadRealRainViewerLayers(); return !!map.getLayer('layer-rainviewer-radar'); });
    check('Vejrdata', 'RainViewer-radar lag oprettet', radar);
    const metar = await pg.evaluate(async () => { await fetchWeatherData('EKCH'); return document.getElementById('metarRawText').innerText; });
    check('Vejrdata', 'METAR for EKCH hentes og vises', /EKCH \d{6}Z/.test(metar), metar.slice(0, 80));
    const tc = await pg.evaluate(async () => { await loadCyclones(true); return wxCyclones.data && { failed: !!wxCyclones.data.failed, n: wxCyclones.data.centers.length }; });
    check('Vejrdata', 'Tropiske cykloner fra GDACS indlæst', tc && !tc.failed, JSON.stringify(tc));
    if (tc && tc.n) {
      // the spinning marker must sit on the cyclone (and stay there) – not jump around the map
      await pg.evaluate(async () => { if (!liveWeatherState.cyclone) await toggleWxLayer('cyclone'); const c = wxCyclones.data.centers[0]; map.jumpTo({ center: [c.lon, c.lat], zoom: 2.5 }); });
      let worst = 0;
      for (let i = 0; i < 5; i++) { await sleep(700); worst = Math.max(worst, await pg.evaluate(() => { const c = wxCyclones.data.centers[0], m = wxCyclones.markers[0];
        if (!m) return 999; const r = m.getElement().getBoundingClientRect(), mr = map.getContainer().getBoundingClientRect(), p = map.project([c.lon, c.lat]);
        return Math.hypot(r.left + r.width / 2 - mr.left - p.x, r.top + r.height / 2 - mr.top - p.y); })); }
      await pg.evaluate(() => toggleWxLayer('cyclone'));
      check('Vejrdata', 'Cyklon-markøren står fast på cyklonen', worst < 4, 'max ' + Math.round(worst) + ' px fra cyklonen');
    }
    const sig = await pg.evaluate(async () => { await loadSigmetData(); return { sample: !!wxSigmet.sample }; });
    check('Vejrdata', 'SIGMET fra aviationweather (ikke eksempel)', !sig.sample, JSON.stringify(sig));
  }

  // ---------- themes / settings / stage / xmas ----------
  for (const t of ['dark', 'matrix', 'default']) { await pg.evaluate(t => applyThemePreset(t), t); await sleep(1500); }
  check('Tema', 'Lys/mørk/matrix skifter uden fejl, fly kører videre', await pg.evaluate(() => Object.keys(activePlaneMarkers).length === 6));
  await pg.evaluate(() => { toggleWindow('panel-settings'); ['general','audio','visual','shortcuts'].forEach(t => showTab(t)); resetPositions(); });
  check('Indstillinger', 'Faner + nulstil layout', await pg.evaluate(() => document.getElementById('panel-log').style.display === 'flex'));
  await pg.keyboard.press('p'); await sleep(500);
  check('Storskærm', 'P åbner storskærm med gitter', await pg.evaluate(() => document.body.classList.contains('stage-open') && document.querySelectorAll('#stageGrid .sg.on').length === drawnNumbers.length));
  await pg.keyboard.press('Escape'); await sleep(300);
  check('Storskærm', 'Esc lukker', await pg.evaluate(() => !document.body.classList.contains('stage-open')));
  await pg.evaluate(() => toggleXmas(true)); await sleep(1500);
  const x = await pg.evaluate(() => ({ santa: !!document.querySelector('.santa-marker'), pill: document.getElementById('santa-pill').classList.contains('show'), snow: !!snow.raf, txt: document.getElementById('spWhere').innerText }));
  check('Jul', 'Julemand, sne og infoboks', x.santa && x.pill && x.snow && x.txt.length > 3, JSON.stringify(x));
  await pg.evaluate(() => { toggleSantaFollow(true); }); await sleep(1500);
  check('Jul', 'Følg julemanden', await pg.evaluate(() => { const st = santaState(), c = map.getCenter(); return santa.follow && Math.abs(c.lat - st.lat) < 3; }));
  await pg.evaluate(() => toggleXmas(false)); await sleep(300);
  check('Jul', 'Slå fra rydder op', await pg.evaluate(() => !document.querySelector('.santa-marker') && !snow.raf));

  // ---------- v37: weather menu, airport card, followed aircraft ----------
  await pg.evaluate(() => toggleWxMenu(true)); await sleep(300);
  check('Kort', 'Vejrlag-menu har ingen vandret scroll', await pg.evaluate(() => { const m = document.getElementById('wx-menu'); return getComputedStyle(m).overflowX === 'hidden' || m.scrollWidth <= m.clientWidth; }));
  await pg.evaluate(() => toggleWxMenu(false));
  const apc = await pg.evaluate(async () => {
    const p = Object.values(activePlaneMarkers).find(q => !q.landed); if (!p) return { err: 'no flight' };
    const code = p.destAirport.code;
    openAirportCard(code);
    await new Promise(r => setTimeout(r, 100));
    const card = document.getElementById('ap-card'), r = card.getBoundingClientRect();
    const onTop = card.contains(document.elementFromPoint(r.left + r.width / 2, r.top + 30));
    const row = [...card.querySelectorAll('.apc-flight-main b')].some(b => b.textContent === p.flightNo);
    requestAssistance(p.num, 'med');
    const chip = !!document.querySelector('#ap-card .apc-assist-chip') && p.el.classList.contains('has-assist');
    editAirportContacts(true);
    const f = document.querySelector('#ap-card .apc-form'); f.ops.value = '+45 12 34 56 78'; f.note.value = 'Stand 4';
    f.requestSubmit();
    const saved = JSON.parse(localStorage.getItem('bingoApContacts') || '{}')[code];
    const tel = document.querySelector('#ap-card a.apc-contact');
    apShowWeather(code);
    const res = { code, onTop, row, chip, saved: !!saved && saved.ops === '+45 12 34 56 78' && saved.note === 'Stand 4', tel: tel && tel.getAttribute('href'), closed: !document.getElementById('ap-card'), wx: document.getElementById('wxSearchInput').value === code };
    delete p.assist; p.el.classList.remove('has-assist'); localStorage.removeItem('bingoApContacts');
    return res;
  });
  check('Lufthavn', 'Lufthavnskort ligger øverst og viser indgående fly', apc.onTop && apc.row, JSON.stringify(apc));
  check('Lufthavn', 'Assistance ved landing markeres på flyet', apc.chip, JSON.stringify(apc));
  check('Lufthavn', 'Kontakter gemmes og kan ringes op', apc.saved && apc.tel === 'tel:+4512345678', JSON.stringify(apc));
  check('Lufthavn', '"Vejr her" lukker kortet og viser vejret', apc.closed && apc.wx, JSON.stringify(apc));
  check('Fly', 'Valgt fly har tæt ring (sporet skinner ikke igennem)', await pg.evaluate(() => {
    const p = Object.values(activePlaneMarkers).find(q => !q.landed); if (!p) return false;
    p.el.classList.add('selected-plane'); const bg = getComputedStyle(p.el.querySelector('.plane-rotator')).backgroundImage + '|' + getComputedStyle(p.el.querySelector('.plane-rotator')).backgroundColor;
    p.el.classList.remove('selected-plane'); return /gradient/.test(bg) && !/rgba\([^)]*, 0\.[0-8]\d*\)$/.test(bg.split('|')[1]); }));

  // ---------- layout ----------
  for (const vp of [[1280, 720], [1440, 900], [1920, 1080]]) {
    await pg.setViewportSize({ width: vp[0], height: vp[1] }); await pg.evaluate(() => resetPositions()); await sleep(400);
    const ov = await pg.evaluate(() => { const els = [...document.querySelectorAll('.content-wrapper > .window')].filter(w => w.style.display !== 'none').map(w => [w.id, w.getBoundingClientRect()]);
      ['.ops-right-toolbar', '.fab-container', '#hud-stats', '.coord-pill'].forEach(s => els.push([s, document.querySelector(s).getBoundingClientRect()]));
      const o = []; for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i][1], b = els[j][1]; if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) o.push(els[i][0] + '×' + els[j][0]); } return o; });
    check('Layout', `Ingen overlap ${vp.join('×')}`, ov.length === 0, ov.join(', '));
  }
  await ctx.close();

  // ---------- mobile ----------
  ({ ctx, pg } = await setup({ ...devices['iPhone 13'] }, 'mobile'));
  pg.on('dialog', d => d.accept());
  await pg.goto(FILE); await sleep(3500);
  check('Mobil', 'Velkomstkort: START-knappen ses uden at scrolle', await pg.evaluate(() => { const b = document.querySelector('.start-btn').getBoundingClientRect(), c = document.querySelector('.briefing-card').getBoundingClientRect(); return b.bottom <= innerHeight && b.top >= 0 && c.height < innerHeight * 0.85; }));
  await pg.click('.start-btn'); await sleep(400);
  const m = {};
  for (const t of ['draw', 'grid', 'flights', 'more', 'map']) { await pg.tap(`#m-nav button[data-tab="${t}"]`); await sleep(250);
    m[t] = await pg.evaluate(t => ({ open: [...document.querySelectorAll('.content-wrapper > .window')].filter(w => w.style.display !== 'none').map(w => w.id).join(), more: document.getElementById('m-more').classList.contains('open') }), t); }
  check('Mobil', 'Faneblade åbner ét vindue ad gangen', m.draw.open === 'panel-control' && m.grid.open === 'panel-grid' && m.flights.open === 'panel-log' && m.more.more && m.map.open === '', JSON.stringify(m));
  await pg.tap('#m-nav button[data-tab="draw"]'); await sleep(200); await pg.tap('.btn-draw'); await sleep(1400);
  check('Mobil', 'Træk virker på mobil', await pg.evaluate(() => drawnNumbers.length === 1));
  check('Mobil', 'Ingen vandret scroll', await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await ctx.close();
  await browser.close();

  const pass = results.filter(r => r.ok).length;
  console.log('\n' + net.report());
  console.log(`\n${pass}/${results.length} passed`);
  results.forEach(r => console.log(`${r.ok ? 'PASS' : 'FAIL'} | ${r.area} | ${r.name}${r.ok ? '' : ' | ' + r.info}`));
  console.log('\nERRORS:\n' + (errs.length ? [...new Set(errs)].join('\n') : '(none)'));
  process.exitCode = (pass === results.length && !errs.length) ? 0 : 1;
})().catch(e => { console.error('TEST CRASH', e); process.exit(1); });
