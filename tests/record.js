#!/usr/bin/env node
// Fetches real answers from every data source the app uses and saves them in tests/fixtures/network.json,
// so `npm test` can replay them without going to the internet.
//   npm run record
// Answers that fail (e.g. Open-Meteo's daily limit) are listed; answers saved earlier are kept, so you can
// simply run it again later to fill the gaps.
process.env.NET = 'record';
const { chromium } = require('playwright');
const path = require('path');
const net = require('./net');
const FILE = 'file://' + path.resolve(path.join(__dirname, '..', 'index.html'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await net.attach(ctx);
  const pg = await ctx.newPage();
  await pg.goto(FILE); await sleep(1500);
  await pg.evaluate(() => localStorage.clear()); await pg.reload(); await sleep(4000);
  await pg.click('.start-btn'); await sleep(1000);
  console.log('Weather layers ...');
  await pg.evaluate(async () => {
    for (const id of ['jet', 'cyclone', 'sigmet', 'dust', 'sat']) { if (!liveWeatherState[id]) await toggleWxLayer(id); }
  });
  console.log('METAR ...');
  for (const icao of ['EKCH', 'EKOD', 'EKBI', 'ESSA', 'EGLL']) {
    await pg.evaluate(i => fetchWeatherData(i), icao).catch(() => {}); await sleep(1500);
  }
  console.log('Live atmosphere (Open-Meteo) ... this can take a minute');
  const t0 = Date.now();
  await pg.evaluate(() => { fetchLiveAtmosphere(false); });   // the app throttles itself; we just wait below
  await sleep(1500); while (Date.now() - t0 < 150000 && await pg.evaluate(() => ATMO.fetching)) await sleep(1000);
  const atmo = await pg.evaluate(() => ({ live: ATMO.useLive, count: ATMO.liveCount, total: ATMO.total, error: ATMO.error && String(ATMO.error) }));
  await sleep(2000);
  await net.save();          // reads the answers' bodies, so before the browser closes
  await browser.close();
  console.log(`Live atmosphere: ${atmo.count}/${atmo.total} grid points` + (atmo.error ? ` (${atmo.error})` : ''));
  console.log(net.report());
  console.log(`Saved ${Object.keys(net.store.entries).length} answers to tests/fixtures/network.json`);
  process.exit(0);
})().catch(e => { console.error('RECORD CRASH', e); process.exit(1); });
