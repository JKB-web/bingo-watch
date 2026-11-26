// Bingo Watch – routes.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// =====================================================================
// REALISTIC ROUTES: great-circle base + departure (runway heading, turn) + airway-like
// dog-legs + arrival (approach fixes, downwind/base when needed, final). The aircraft follows
// a smoothed version of the planned route, like a real flown track.
// =====================================================================
const RAD = Math.PI / 180, R_NM = 3440.065;
function gHav(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * RAD, dLon = (lon2 - lon1) * RAD;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
    return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(a)));
}
function gBearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin((lon2 - lon1) * RAD) * Math.cos(lat2 * RAD);
    const x = Math.cos(lat1 * RAD) * Math.sin(lat2 * RAD) - Math.sin(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.cos((lon2 - lon1) * RAD);
    return (Math.atan2(y, x) / RAD + 360) % 360;
}
function gDest(lat, lon, brg, nm) {
    const d = nm / R_NM, b = brg * RAD, la = lat * RAD, lo = lon * RAD;
    const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
    const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
    return [la2 / RAD, ((lo2 / RAD + 540) % 360) - 180];
}
function gInterp(lat1, lon1, lat2, lon2, f) {          // point at fraction f along the great circle
    const d = gHav(lat1, lon1, lat2, lon2) / R_NM;
    if (d < 1e-9) return [lat1, lon1];
    const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1 * RAD) * Math.cos(lon1 * RAD) + B * Math.cos(lat2 * RAD) * Math.cos(lon2 * RAD);
    const y = A * Math.cos(lat1 * RAD) * Math.sin(lon1 * RAD) + B * Math.cos(lat2 * RAD) * Math.sin(lon2 * RAD);
    const z = A * Math.sin(lat1 * RAD) + B * Math.sin(lat2 * RAD);
    return [Math.atan2(z, Math.hypot(x, y)) / RAD, Math.atan2(y, x) / RAD];
}
const angDiff = (a, b) => ((a - b + 540) % 360) - 180;
function unwrapLons(pts) {                               // keep longitudes continuous across the date line
    for (let i = 1; i < pts.length; i++) { while (pts[i][0] - pts[i - 1][0] > 180) pts[i][0] -= 360; while (pts[i][0] - pts[i - 1][0] < -180) pts[i][0] += 360; }
    return pts;
}
function densifyGC(llPts, stepNm) {                      // llPts: [[lat,lon],...] -> [[lon,lat],...] along great circles
    const out = [];
    for (let i = 0; i < llPts.length - 1; i++) {
        const [a1, o1] = llPts[i], [a2, o2] = llPts[i + 1];
        const len = gHav(a1, o1, a2, o2), st = Math.max(1.2, Math.min(stepNm, len / 3));
        const n = Math.max(1, Math.ceil(len / st));
        for (let k = 0; k < n; k++) { const q = gInterp(a1, o1, a2, o2, k / n); out.push([q[1], q[0]]); }
    }
    const L = llPts[llPts.length - 1]; out.push([L[1], L[0]]);
    return unwrapLons(out);
}
function chaikin(pts, iters) {                           // rounds every corner, keeps both end points
    let p = pts;
    for (let it = 0; it < iters; it++) {
        const q = [p[0]];
        for (let i = 0; i < p.length - 1; i++) {
            const [x0, y0] = p[i], [x1, y1] = p[i + 1];
            q.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
        }
        q.push(p[p.length - 1]); p = q;
    }
    return p;
}
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// opts.fromAir = { hdg }: the route starts in the air at 'dep' (a position, not an airport) on that heading – used
// when an aircraft is diverted; no departure procedure then.
function buildRealisticRoute(dep, dest, seed, opts) {
    // exceptions such as 'arrivals and departures in the Gulf' apply to the whole route of this flight
    return typeof withAirspaceContext === 'function' ? withAirspaceContext(dep, dest, () => buildRouteInner(dep, dest, seed, opts)) : buildRouteInner(dep, dest, seed, opts);
}
function buildRouteInner(dep, dest, seed, opts) {
    const rand = mulberry32(seed == null ? Math.floor(Math.random() * 2 ** 31) : seed);
    const rnd = (a, b) => a + rand() * (b - a);
    // The route follows a corridor that stays out of closed / high-risk airspace (js/airspace.js).
    const corr = typeof safeCorridor === 'function' ? safeCorridor(dep, dest) : [[dep.lat, dep.lon], [dest.lat, dest.lon]];
    const D = corridorLength(corr);
    const clear = (a, b) => typeof legBlocked !== 'function' || !legBlocked(a[0], a[1], b[0], b[1]);
    const crsOut = corridorAt(corr, 0).crs;
    const nearEnd = corridorAt(corr, Math.max(0, D - 40)).pt;
    const crsIn = gBearing(nearEnd[0], nearEnd[1], dest.lat, dest.lon);
    const legsClear = pts => pts.every((q, i) => i === 0 || clear(pts[i - 1], q));
    // --- departure: climb out on runway heading, turn towards the route (a runway whose climb-out stays clear)
    let rwyDep = null, depPts;
    if (opts && opts.fromAir) depPts = [gDest(dep.lat, dep.lon, opts.fromAir.hdg, 6)];   // keep flying ahead while turning
    else for (let t = 0; t < 8; t++) {
        rwyDep = (Math.round((crsOut + rnd(-80, 80) * (t < 4 ? 1 : 2)) / 10) * 10 + 360) % 360;
        const co = gDest(dep.lat, dep.lon, rwyDep, Math.min(7, D * 0.08));
        depPts = [co];
        const dTurn = angDiff(crsOut, rwyDep);
        if (Math.abs(dTurn) > 75 && D > 60) depPts.push(gDest(co[0], co[1], rwyDep + Math.sign(dTurn) * 80, 6));
        if (legsClear([[dep.lat, dep.lon], ...depPts])) break;
    }
    const wp = [[dep.lat, dep.lon], ...depPts];
    const e0 = wp.length;                                   // first en-route waypoint
    // --- en route: airway-like dog-legs off the corridor (correlated, larger mid-route); the corridor's
    //     corners (detours around closed airspace) are fixed waypoints
    const en = [];
    let acc = 0;
    for (let i = 1; i < corr.length - 1; i++) { acc += gHav(corr[i - 1][0], corr[i - 1][1], corr[i][0], corr[i][1]); en.push({ nm: acc, pt: corr[i], base: corr[i] }); }
    const n = Math.max(0, Math.min(24, Math.round(D / 200)));
    let off = 0;
    const maxOff = Math.min(D * 0.03, 60);
    for (let i = 1; i <= n; i++) {
        const f = (i + rnd(-0.3, 0.3)) / (n + 1), nm = f * D;
        if (nm < 35 || D - nm < 45) continue;
        const { pt, crs } = corridorAt(corr, nm);
        off = 0.55 * off + 0.45 * rnd(-1, 1) * maxOff;
        en.push({ nm, base: pt, pt: gDest(pt[0], pt[1], crs + 90, off * Math.sqrt(Math.sin(Math.PI * f))) });
    }
    en.sort((a, b) => a.nm - b.nm);
    // a dog-leg that would touch closed airspace is pulled back onto the corridor
    for (let pass = 0; pass < 3; pass++) {
        const seq = [wp[wp.length - 1], ...en.map(e => e.pt), [dest.lat, dest.lon]];
        let bad = false;
        for (let i = 0; i < seq.length - 1; i++) if (!clear(seq[i], seq[i + 1])) {
            if (en[i - 1]) en[i - 1].pt = en[i - 1].base; if (en[i]) en[i].pt = en[i].base; bad = true;
        }
        if (!bad) break;
    }
    // --- arrival: approach fixes; downwind + base when the runway points the "wrong" way
    function arrival(rwyArr, last) {
        const pts = [];
        const inbound = gBearing(last[0], last[1], dest.lat, dest.lon);
        const fromSide = Math.sign(angDiff(gBearing(dest.lat, dest.lon, last[0], last[1]), rwyArr + 180)) || 1;
        const faf = gDest(dest.lat, dest.lon, rwyArr + 180, 9);
        const itp = gDest(dest.lat, dest.lon, rwyArr + 180, 15);              // intercept on the extended centre line
        if (D > 40) {
            if (Math.abs(angDiff(inbound, rwyArr)) > 100) {
                const abeam = gDest(dest.lat, dest.lon, rwyArr + 90 * fromSide, 7);
                pts.push(gDest(abeam[0], abeam[1], rwyArr, 7));              // join downwind
                pts.push(gDest(abeam[0], abeam[1], rwyArr + 180, 12));       // end of downwind
                pts.push(gDest(itp[0], itp[1], rwyArr + 90 * fromSide, 4));  // base turn
            } else {
                pts.push(gDest(itp[0], itp[1], rwyArr + 180 + 30 * fromSide, 12)); // IAF, 30° intercept
            }
            pts.push(itp);
        }
        pts.push(faf, gDest(dest.lat, dest.lon, rwyArr + 180, 3.5), [dest.lat, dest.lon]);
        return pts;
    }
    // pick an approach that stays clear of closed airspace; if the dog-legs are the problem, fly the corridor
    let rwyArr, arr;
    for (let pass = 0; pass < 2; pass++) {
        const last = en.length ? en[en.length - 1].pt : wp[wp.length - 1];
        for (let t = 0; t < 10; t++) {
            rwyArr = (Math.round((crsIn + rnd(-130, 130) * (t < 5 ? 1 : 1.4)) / 10) * 10 + 360) % 360;
            arr = arrival(rwyArr, last);
            if (legsClear([last, ...arr])) break;
        }
        if (legsClear([wp[wp.length - 1], ...en.map(e => e.pt), ...arr])) break;
        en.forEach(e => { e.pt = e.base; });
    }
    en.forEach(e => wp.push(e.pt));
    const e1 = wp.length;                                   // first arrival waypoint
    wp.push(...arr);
    const planned = densifyGC(wp, 30);                    // the flight plan (drawn as the dashed line)

    // --- what the aircraft actually flies: the plan in straight legs with smooth turns, plus the few
    //     deliberate changes real flights get – a "direct to" a fix further ahead from ATC (skipping some
    //     waypoints), and now and then a detour round weather. Never into closed airspace.
    const tw = wp.slice(0, e0);
    const fixes = wp.slice(e0, e1), target = fixes.concat([wp[e1] || wp[wp.length - 1]]);
    let i = 0;
    while (i < fixes.length) {
        tw.push(fixes[i]);
        let jumped = false;
        if (rand() < 0.3 && i + 2 < target.length) {
            for (let s = Math.min(3, target.length - i - 2); s >= 1; s--) {          // skip up to 3 fixes
                if (clear(fixes[i], target[i + s + 1])) { i += s + 1; jumped = true; break; }
            }
        }
        if (!jumped) i++;
    }
    // weather: on longer flights, sometimes a smooth detour of 10–25 NM to one side and back
    if (D > 250 && rand() < 0.45) {
        const legs = [];
        for (let k = e0 - 1; k < tw.length - 1; k++) { const L = gHav(tw[k][0], tw[k][1], tw[k + 1][0], tw[k + 1][1]); if (L > 150 && k >= 0) legs.push([k, L]); }
        if (legs.length) {
            const [k, L] = legs[Math.floor(rand() * legs.length)];
            const a = tw[k], b = tw[k + 1], crs = gBearing(a[0], a[1], b[0], b[1]);
            const side = rand() < 0.5 ? -1 : 1, dev = rnd(10, 25), len = rnd(40, Math.min(110, L - 90)), d0 = rnd(30, L - len - 60);
            const at = d => gInterp(a[0], a[1], b[0], b[1], d / L);
            const p0 = at(d0), p1 = at(d0 + 25), p2 = at(d0 + 25 + len), p3 = at(d0 + 50 + len);
            const q1 = gDest(p1[0], p1[1], crs + 90 * side, dev), q2 = gDest(p2[0], p2[1], crs + 90 * side, dev);
            if (clear(p0, q1) && clear(q1, q2) && clear(q2, p3)) tw.splice(k + 1, 0, p0, q1, q2, p3);
        }
    }
    tw.push(...wp.slice(e1));
    let track = chaikin(densifyGC(tw, 8), 2);              // fly-by turns: corners rounded, legs stay straight
    if (typeof zoneAt === 'function') {                    // rounding a corner must not cut into closed airspace
        const far = ([lo, la]) => gHav(la, lo, dep.lat, dep.lon) > 30 && gHav(la, lo, dest.lat, dest.lon) > 30;
        if (track.some(q => far(q) && zoneAt(q[1], q[0]))) track = densifyGC(tw, 8);
    }
    unwrapLons(track);
    const cum = [0];
    for (let i = 1; i < track.length; i++) cum.push(cum[i - 1] + gHav(track[i - 1][1], track[i - 1][0], track[i][1], track[i][0]));
    const direct = densifyGC([[dep.lat, dep.lon], [dest.lat, dest.lon]], 60);
    return { planned, track, cum, total: cum[cum.length - 1], direct, rwyDep, rwyArr };
}
function routeIndexAt(r, nm) {
    let lo = 0, hi = r.cum.length - 1;
    if (nm <= 0) return 0;
    if (nm >= r.cum[hi]) return hi - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (r.cum[mid] <= nm) lo = mid; else hi = mid; }
    return lo;
}
function routePosAt(r, nm) {
    const i = routeIndexAt(r, nm), a = r.track[i], b = r.track[i + 1] || a;
    const seg = (r.cum[i + 1] || r.cum[i]) - r.cum[i];
    const t = seg > 0 ? Math.min(1, Math.max(0, (nm - r.cum[i]) / seg)) : 0;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
// altitude-coloured track: consecutive points grouped into 1 500 ft bands -> few features per flight
const ALT_BAND = 1500;
function buildTrackSegments(p) {
    const r = p.route, segs = [];
    let cur = null;
    for (let i = 0; i < r.track.length; i++) {
        const band = Math.round(altAtNm(p, r.cum[i]) / ALT_BAND);
        if (!cur || cur.band !== band) {
            if (cur) cur.i1 = i;
            cur = { band, alt: band * ALT_BAND, i0: cur ? i - 1 : 0, i1: i };
            segs.push(cur);
        } else cur.i1 = i;
    }
    return segs;
}
const ALT_COLOR_STOPS = [0, '#9ad7ff', 6000, '#5ab8e6', 15000, '#3fb2a2', 25000, '#4caf6e', 33000, '#2f8a4c', 41000, '#1f6338'];
const altColorExpr = () => ['interpolate', ['linear'], ['get', 'alt']].concat(ALT_COLOR_STOPS);

// ---- static lines (planned / focus route / direct): rebuilt only when flights or focus change
function updateStaticRoutes() {
    if (!map || !map.style || !map.style._loaded) return;
    const feats = [];
    Object.values(activePlaneMarkers).forEach(p => {
        if (!p.route) return;
        // the dashed line is always the flight plan – the same whether or not the flight is selected
        if (p.num === focusedFlightNum)                     // routes are only shown for the selected flight
            feats.push({ type: 'Feature', properties: { kind: 'planned', num: p.num }, geometry: { type: 'LineString', coordinates: p.route.planned } });
    });
    const gj = { type: 'FeatureCollection', features: feats };
    if (!map.getSource('occ-routes-static')) map.addSource('occ-routes-static', { type: 'geojson', data: gj, tolerance: 0.3 });
    else map.getSource('occ-routes-static').setData(gj);
}
// ---- dynamic flown tracks (altitude coloured)
function trackFeatures(p) {
    if (!p.route) return [];
    if (p.landed && p._doneFeats) return p._doneFeats;
    if (!p._segs) p._segs = buildTrackSegments(p);
    const r = p.route, nm = p.landed ? r.total : p.flownDistNm, iNow = routeIndexAt(r, nm), out = [];
    for (const sg of p._segs) {
        if (sg.i0 > iNow) break;
        const coords = r.track.slice(sg.i0, Math.min(sg.i1, iNow) + 1);
        if (sg.i1 > iNow || (p.landed === false && sg.i1 >= iNow)) coords.push(routePosAt(r, nm));
        if (coords.length >= 2) out.push({ type: 'Feature', properties: { kind: 'track', num: p.num, alt: sg.alt }, geometry: { type: 'LineString', coordinates: coords } });
    }
    if (p.landed) p._doneFeats = out;
    return out;
}
function updateFlightRoutesLayer(full) {
    if (!map || !map.style || !map.style._loaded) return;   // style is being (re)built, e.g. after a theme switch
    if (full !== false || !map.getSource('occ-routes-static')) updateStaticRoutes();
    const feats = [];
    Object.values(activePlaneMarkers).forEach(p => {
        if (p.num !== focusedFlightNum) return;                 // tracks are only shown for the selected flight (90 would be a tangle)
        const f = trackFeatures(p); for (let i = 0; i < f.length; i++) feats.push(f[i]);
    });
    const geojson = { type: 'FeatureCollection', features: feats };
    if (!map.getSource('occ-flight-routes')) map.addSource('occ-flight-routes', { type: 'geojson', data: geojson, tolerance: 0.3 });
    else map.getSource('occ-flight-routes').setData(geojson);
    ensureRouteLayers();
}
function ensureRouteLayers() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const fnum = focusedFlightNum === null ? -1 : focusedFlightNum;
    if (!map.getLayer('layer-flight-planned')) map.addLayer({ id: 'layer-flight-planned', type: 'line', source: 'occ-routes-static',
        filter: ['==', ['get', 'kind'], 'planned'],
        layout: { 'line-join': 'round' },
        paint: { 'line-color': plannedColorExpr(isDark, fnum), 'line-width': ['case', ['==', ['get', 'num'], fnum], 2.2, 1.5],
                 'line-dasharray': [3, 2.5], 'line-opacity': ['case', ['==', ['get', 'num'], fnum], 0.95, 0.75] } });
    if (!map.getLayer('layer-flight-flown')) map.addLayer({ id: 'layer-flight-flown', type: 'line', source: 'occ-flight-routes',
        filter: ['==', ['get', 'kind'], 'track'], layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': altColorExpr(),
                 'line-width': ['case', ['==', ['get', 'num'], fnum], 5, 2.6],
                 'line-opacity': ['case', ['==', ['get', 'num'], fnum], 0.95, 0.92] } });
}
function plannedColorExpr(isDark, fnum) { return ['case', ['==', ['get', 'num'], fnum], isDark ? '#e2e8f0' : '#14213d', isDark ? '#a8b6cc' : '#2b3f63']; }
function setFocusRouteFilter() {
    if (!map || !map.style || !map.style._loaded) return;
    updateFlightRoutesLayer(true);
    const fnum = focusedFlightNum === null ? -1 : focusedFlightNum;
    if (map.getLayer('layer-flight-planned')) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        map.setPaintProperty('layer-flight-planned', 'line-color', plannedColorExpr(isDark, fnum));
        map.setPaintProperty('layer-flight-planned', 'line-width', ['case', ['==', ['get', 'num'], fnum], 2.2, 1.5]);
        map.setPaintProperty('layer-flight-planned', 'line-opacity', ['case', ['==', ['get', 'num'], fnum], 0.95, 0.75]);
    }
    if (map.getLayer('layer-flight-flown')) {
        map.setPaintProperty('layer-flight-flown', 'line-width', ['case', ['==', ['get', 'num'], fnum], 5, 2.6]);
        map.setPaintProperty('layer-flight-flown', 'line-opacity', ['case', ['==', ['get', 'num'], fnum], 0.95, 0.92]);
    }
}

// 1. REAL PRECIPITATION RADAR (RainViewer Public API - Direct CORS)
async function loadRealRainViewerLayers() {
    if (!map) return;
    try {
        if (!cachedRainViewerData) {
            const res = await fetchTimeout('https://api.rainviewer.com/public/weather-maps.json', {}, 8000);
            if (!res.ok) return;
            cachedRainViewerData = await res.json();
        }
        const data = cachedRainViewerData;
        const host = data.host || 'https://tilecache.rainviewer.com';

        if (data.radar && data.radar.past && data.radar.past.length > 0) {
            const latestRadar = data.radar.past[data.radar.past.length - 1];
            const radarUrl = `${host}${latestRadar.path}/256/{z}/{x}/{y}/2/1_1.png`;

            if (map.getLayer('layer-rainviewer-radar')) {
                map.removeLayer('layer-rainviewer-radar');
            }
            if (map.getSource('rainviewer-radar')) {
                map.removeSource('rainviewer-radar');
            }
            map.addSource('rainviewer-radar', {
                type: 'raster',
                tiles: [radarUrl],
                tileSize: 256,
                maxzoom: 7
            });
            if (!map.getLayer('layer-rainviewer-radar')) {
                map.addLayer({
                    id: 'layer-rainviewer-radar',
                    type: 'raster',
                    source: 'rainviewer-radar',
                    paint: { 'raster-opacity': 0.65 },
                    layout: { visibility: liveWeatherState.radar ? 'visible' : 'none' }
                });
            } else {
                map.setLayoutProperty('layer-rainviewer-radar', 'visibility', liveWeatherState.radar ? 'visible' : 'none');
            }
        }
    } catch (err) {
        console.warn('RainViewer live radar fetch error:', err);
    }
}

/* =====================================================================
   GLOBAL WEATHER ENGINE - 9 OPSCONTROL LAYERS + SUN / DAY-NIGHT TERMINATOR
   Design: every layer is drawn from ONE atmosphere sampler. The sampler
   always has an instant global model (so layers are never empty) and is
   upgraded with live Open-Meteo data that is fetched in small, throttled
   batches (no more HTTP 429 bursts) and cached in localStorage.
   ===================================================================== */
const WX_LAYER_DEFS = [
    { id: 'flow',    grp: 'wind', icon: 'air',             en: 'Animated winds',          da: 'Animerede vinde' },
    { id: 'jet',     grp: 'wind', icon: 'multiline_chart', en: 'Jetstreams',              da: 'Jetstrømme' },
    { id: 'barbs',   grp: 'wind', icon: 'flag',            en: 'Wind barbs',              da: 'Vindfaner' },
    { id: 'cat',     grp: 'wind', icon: 'waves',           en: 'Clear air turbulence',    da: 'Turbulens i klar luft (CAT)' },
    { id: 'trop',    grp: 'wind', icon: 'layers',          en: 'Tropopause',              da: 'Tropopause' },
    { id: 'radar',   grp: 'cloud', icon: 'radar',          en: 'Precipitation radar (RainViewer)', da: 'Nedbørsradar (RainViewer)' },
    { id: 'cloud',   grp: 'cloud', icon: 'cloud',          en: 'Cloud cover total',       da: 'Samlet skydække' },
    { id: 'cape',    grp: 'cloud', icon: 'thunderstorm',   en: 'CAPE and lifted index',   da: 'CAPE og lifted index' },
    { id: 'conv',    grp: 'cloud', icon: 'filter_drama',   en: 'Convective cloud tops',   da: 'Konvektive skytoppe' },
    { id: 'sat',     grp: 'cloud', icon: 'satellite_alt',  en: 'Satellite',               da: 'Satellit' },
    { id: 'icing',   grp: 'hazard', icon: 'ac_unit',       en: 'In-flight icing',         da: 'Isdannelse under flyvning' },
    { id: 'frz',     grp: 'hazard', icon: 'severe_cold',   en: 'Freezing rain probability', da: 'Isslag-sandsynlighed' },
    { id: 'fog',     grp: 'hazard', icon: 'dehaze',        en: 'Fog probability',         da: 'Tåge-sandsynlighed' },
    { id: 'vis',     grp: 'hazard', icon: 'visibility',    en: 'Visibility',              da: 'Sigtbarhed' },
    { id: 'dust',    grp: 'hazard', icon: 'grain',         en: 'Dust',                    da: 'Støv' },
    { id: 'mslp',    grp: 'surface', icon: 'speed',        en: 'Mean sea level pressure', da: 'Lufttryk (isobarer)' },
    { id: 'ptend',   grp: 'surface', icon: 'trending_down', en: 'Pressure tendency',      da: 'Trykændring (3 t)' },
    { id: 't2m',     grp: 'surface', icon: 'thermostat',   en: 'Temperature (2 m)',       da: 'Temperatur (2 m)' },
    { id: 'cyclone', grp: 'warn', icon: 'cyclone',         en: 'Tropical cyclones',       da: 'Tropiske cykloner' },
    { id: 'volcano', grp: 'warn', icon: 'volcano',         en: 'Active volcanoes',        da: 'Aktive vulkaner' },
    { id: 'sigmet',  grp: 'warn', icon: 'warning_amber',   en: 'SIGMET',                  da: 'SIGMET' },
    { id: 'zones',   grp: 'warn', icon: 'block',           en: 'Closed airspace (EASA)', da: 'Lukkede luftrum (EASA)' }
];
const WX_GROUP_NAMES = { wind: ['Vind og højde', 'Wind and altitude'], cloud: ['Skyer og konvektion', 'Cloud and convection'], hazard: ['Farer', 'Hazards'],
                         surface: ['Jordoverflade', 'Surface'], warn: ['Advarsler', 'Warnings'] };
const WX_LAYER_GROUPS = {
    jet:     ['wx-jet-band', 'wx-jet-core', 'wx-jet-arrows', 'wx-jet-labels'],
    barbs:   ['wx-barbs'],
    radar:   ['layer-rainviewer-radar'],   // RainViewer tiles, loaded by loadRealRainViewerLayers()
    cloud:   ['wx-f-cloud'],
    cape:    ['wx-f-cape', 'wx-li-line'], conv: ['wx-f-conv'], dust: ['wx-f-dust'], fog: ['wx-f-fog'], frz: ['wx-f-frz'],
    ptend:   ['wx-f-ptend'], t2m: ['wx-f-t2m'], vis: ['wx-f-vis'], sat: ['wx-sat'], flow: [],
    mslp:    ['wx-mslp-line', 'wx-mslp-label', 'wx-mslp-hl', 'wx-mslp-hlv'],
    cat:     ['wx-cat-fill', 'wx-cat-line', 'wx-cat-label'],
    trop:    ['wx-trop-line', 'wx-trop-label', 'wx-trop-pt'],
    icing:   ['wx-ice-fill', 'wx-ice-line', 'wx-ice-label'],
    cyclone: ['wx-tc-cone', 'wx-tc-radius-fill', 'wx-tc-radius-line', 'wx-tc-track', 'wx-tc-label'],
    volcano: ['wx-volc'],
    sigmet:  ['wx-sigmet-fill', 'wx-sigmet-line', 'wx-sigmet-label'],
    zones:   ['wx-zone-fill', 'wx-zone-line', 'wx-zone-label']
};
const WX_FONT = ['Open Sans Semibold'];
const D2R = Math.PI / 180;
const wxClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wxGauss = (x, c, s) => Math.exp(-Math.pow((x - c) / s, 2));
const wxSleep = (ms) => new Promise(r => setTimeout(r, ms));
function wxName(def) { return currentLang === 'da' ? def.da : def.en; }
function windSpd(u, v) { return Math.hypot(u, v); }
function windDirFrom(u, v) { return (Math.atan2(-u, -v) / D2R + 360) % 360; }
function windUV(spd, dirFrom) { const r = dirFrom * D2R; return [-spd * Math.sin(r), -spd * Math.cos(r)]; }
