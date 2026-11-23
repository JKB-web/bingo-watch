// Network handling for the browser tests.
//
// Modes (environment variable NET):
//   replay  (default)  answer data requests from tests/fixtures/network.json; nothing goes to the internet.
//   record             fetch the answers we do not have yet from the internet and add them to tests/fixtures/network.json
//                      (NET_FRESH=1 fetches everything again).
//   live               go to the internet, save nothing.
//   offline            block everything (shows how the app copes without any data).
//
// MapLibre is always served from node_modules. Map tiles (basemap, radar, satellite) are never saved:
// they are large and change all the time, so in replay/offline mode they are simply not loaded.
const path = require('path'), fs = require('fs');

const FIXTURE = path.join(__dirname, 'fixtures', 'network.json');
const LOCAL_ML = path.join(__dirname, '..', 'node_modules', 'maplibre-gl', 'dist');
const HAVE_ML = fs.existsSync(path.join(LOCAL_ML, 'maplibre-gl.js'));
const TILE_HOSTS = ['server.arcgisonline.com', 'tilecache.rainviewer.com', 'gibs.earthdata.nasa.gov'];
const PROXIES = [/^https:\/\/api\.allorigins\.win\/raw\?url=(.+)$/, /^https:\/\/corsproxy\.io\/\?(.+)$/, /^https:\/\/api\.codetabs\.com\/v1\/proxy\?quest=(.+)$/];

const MODE = (process.env.NET || (process.env.OFFLINE ? 'offline' : 'replay')).toLowerCase();
let store = { recorded: null, entries: {} };
if (fs.existsSync(FIXTURE)) store = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const missing = new Set(), served = new Set(), pending = [];

// The app calls aviationweather/NOAA through three CORS proxies at once; they all fetch the same thing.
function keyOf(url) {
  for (const re of PROXIES) { const m = url.match(re); if (m) return decodeURIComponent(m[1]); }
  return url;
}
const isTile = u => TILE_HOSTS.some(h => u.includes('//' + h));
const isExternal = u => /^https?:/.test(u);

// Record mode: the browser fetches through the normal network (and proxy); we save the answers as they arrive.
async function onResponse(res) {
  const url = res.url();
  if (store.entries[keyOf(url)] && !process.env.NET_FRESH) return;   // already saved (or answered from the saved copy)
  if (!isExternal(url) || isTile(url) || url.includes('maplibre-gl')) return;
  const key = keyOf(url);
  let body = null; try { body = await res.body(); } catch (e) {}
  const text = body ? body.toString('utf8') : '';
  // Keep only real answers – not rate limits, errors or the HTML error pages some proxies return.
  if (body && res.status() === 200 && body.length < 3e6 && !(PROXIES.some(re => re.test(url)) && text.trim().startsWith('<'))) {
    const ct = (res.headers()['content-type'] || 'application/octet-stream');
    const textual = /json|text|javascript|css|xml/.test(ct);
    store.entries[key] = { contentType: ct, ...(textual ? { text } : { base64: body.toString('base64') }) };
    missing.delete(key);
  } else if (!store.entries[key]) missing.add(key + '  (HTTP ' + res.status() + ')');
}
async function attach(ctx) {
  if (MODE === 'record') ctx.on('response', r => { pending.push(onResponse(r)); });
  await ctx.route('**/*', async (route) => {
    const url = route.request().url();
    if (HAVE_ML && url.includes('maplibre-gl.js')) return route.fulfill({ path: path.join(LOCAL_ML, 'maplibre-gl.js'), contentType: 'application/javascript' });
    if (HAVE_ML && url.includes('maplibre-gl.css')) return route.fulfill({ path: path.join(LOCAL_ML, 'maplibre-gl.css'), contentType: 'text/css' });
    if (!isExternal(url)) return route.continue();
    if (MODE === 'live') return route.continue();
    if (MODE === 'offline') return route.abort();
    const key = keyOf(url);
    if (MODE === 'record') {
      // Only fetch what we do not have yet (saves the free services' daily limits). NET_FRESH=1 fetches everything again.
      const have = store.entries[keyOf(url)];
      if (have && !process.env.NET_FRESH) return route.fulfill({ status: 200, contentType: have.contentType,
        body: have.text !== undefined ? have.text : Buffer.from(have.base64, 'base64'), headers: { 'access-control-allow-origin': '*' } });
      return route.continue();   // the browser fetches it; onResponse() saves it
    }
    // replay
    const e = store.entries[key];
    if (!e) { if (!isTile(url)) missing.add(key); return route.abort(); }
    served.add(key);
    return route.fulfill({ status: 200, contentType: e.contentType, body: e.text !== undefined ? e.text : Buffer.from(e.base64, 'base64'),
      headers: { 'access-control-allow-origin': '*' } });
  });
}
async function save() {
  if (MODE !== 'record') return;
  // some answers never finish streaming (e.g. aborted requests); don't wait for them forever
  await Promise.race([Promise.allSettled(pending), new Promise(r => setTimeout(r, 15000))]);
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  store.recorded = new Date().toISOString();
  const sorted = {}; Object.keys(store.entries).sort().forEach(k => { sorted[k] = store.entries[k]; });
  fs.writeFileSync(FIXTURE, JSON.stringify({ recorded: store.recorded, entries: sorted }, null, 1));
}
function report() {
  const short = u => u.length > 110 ? u.slice(0, 107) + '...' : u;
  const lines = [`Network mode: ${MODE}` + (MODE === 'replay' ? ` (fixtures recorded ${store.recorded || 'never'}, ${Object.keys(store.entries).length} answers)` : '')];
  if (missing.size) lines.push((MODE === 'record' ? 'Not saved (error/limit):' : 'No saved answer for:') + '\n  ' + [...missing].map(short).join('\n  '));
  return lines.join('\n');
}
module.exports = { attach, save, report, MODE, store, served, missing };
