// Bingo Watch – weather.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// ---- ATMOSPHERE: grid, model, sampler -------------------------------------
const ATMO_F = ['u10', 'v10', 'u250', 'v250', 'u300', 'v300', 'cld', 't700', 'rh700',
                'u500', 'v500', 't2', 'td2', 'pmsl', 'ptend', 'cape', 'li', 'vis', 't850', 'prcp', 'frzl'];
const ATMO = {
    latMin: -63, latStep: 9, nLat: 16,
    lonMin: -180, lonStep: 12, nLon: 30,
    F: ATMO_F.length, nodes: null, useLive: false, liveCount: 0, total: 480,
    fetching: false, updated: null, version: 1, error: null, cs: null
};
ATMO.total = ATMO.nLat * ATMO.nLon;
const WX_CACHE_KEY = 'bingoAtmoCacheV2';

function wxClimateState(date) {
    const d = date || new Date();
    const doy = Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
    return { season: Math.cos(2 * Math.PI * (doy - 20) / 365.25), ph: (d.getTime() / 86400000) * 0.42 };
}
function jetCenters(lon, cs) {
    const l = lon * D2R, s = cs.season, ph = cs.ph;
    const nhW = 0.72 + 0.28 * s, shW = 0.72 - 0.28 * s;
    return [
        { c: 52 - 3 * s + 7 * Math.sin(4 * l + ph + 0.8) + 3 * Math.sin(6 * l - 1.4 * ph), A: 92 * nhW, w: 8 },
        { c: 30 - 3 * s + 3 * Math.sin(3 * l + 1.2), A: 108 * nhW, w: 6.5 },
        { c: -53 - 3 * s + 4 * Math.sin(5 * l + 1.2 * ph + 0.3), A: 85 * shW, w: 8 },
        { c: -30 - 3 * s + 2.5 * Math.sin(3 * l + 0.4), A: 100 * shW, w: 6.5 }
    ];
}
function tropopauseFL(lat, lon, cs) {
    const c = Math.cos(lat * D2R);
    return 280 + 262 * c * c + 12 * Math.sin(3 * lon * D2R + cs.ph * 0.5 + lat * 0.09) * c;
}
// Instant analytic global atmosphere (jets, trades, storm tracks, ITCZ cloud band ...)
function atmoModel(lat, lon, csIn) {
    const cs = csIn || ATMO.cs || (ATMO.cs = wxClimateState());
    const l = lon * D2R, absLat = Math.abs(lat), cosLat = Math.max(0.15, Math.cos(lat * D2R));
    let u = 0, v = 0;
    const jets = jetCenters(lon, cs), jE = jetCenters(lon + 1, cs), jW = jetCenters(lon - 1, cs);
    jets.forEach((j, i) => {
        const g = wxGauss(lat, j.c, j.w);
        const slope = (jE[i].c - jW[i].c) / 2;
        const nrm = Math.hypot(cosLat, slope);
        const sp = j.A * g;
        u += sp * cosLat / nrm; v += sp * slope / nrm;
    });
    u += 12 * wxClamp((absLat - 18) / 14, 0, 1) - 7 * wxGauss(absLat, 6, 9);
    v += 5 * Math.sin(3 * l + cs.ph) * wxClamp(absLat / 40, 0, 1);
    const u300 = 0.86 * u, v300 = 0.86 * v + 1.2 * Math.sin(2 * l + cs.ph);
    const zonal = absLat < 28 ? -(8 + 4 * wxGauss(absLat, 14, 8)) : (absLat < 62 ? 10 + 9 * wxGauss(absLat, 48, 10) : -6);
    const u10 = zonal + 5 * Math.cos(3 * l + cs.ph * 1.3 + lat * 0.08);
    const v10 = 7 * Math.sin(4 * l + cs.ph + lat * 0.05) * wxClamp(absLat / 35, 0.25, 1);
    const cld = wxClamp(40 + 38 * wxGauss(lat, 6, 9) + 30 * wxGauss(absLat, 52, 10) * (0.6 + 0.4 * Math.sin(3 * l + cs.ph))
        - 28 * wxGauss(absLat, 24, 7) + 16 * Math.sin(5 * l + cs.ph * 0.7 + lat * 0.15) * Math.sin(lat * D2R * 3), 0, 100);
    const t700 = 10 - 0.55 * absLat + 3 * Math.sin(2 * l + cs.ph);
    const rh700 = wxClamp(20 + 0.9 * cld + 8 * Math.sin(2 * l + lat * 0.1 + cs.ph), 0, 100);
    // surface + mid-level extras (analytic stand-ins used until live data arrives)
    const u500 = 0.55 * u + 0.3 * u10, v500 = 0.55 * v;
    const hemi = lat >= 0 ? 1 : -1, summer = hemi * cs.season;               // >0 = summer in this hemisphere
    const t2 = 29 - 0.62 * absLat - 0.0045 * absLat * absLat + 9 * summer * wxClamp(absLat / 50, 0, 1) + 4 * Math.sin(2 * l + cs.ph * 0.6);
    const lowTrack = wxGauss(absLat, 55, 9) * (0.5 + 0.5 * Math.sin(4 * l + cs.ph * 1.2 + lat * 0.05));
    const pmsl = 1012 + 9 * wxGauss(absLat, 32, 8) * (0.7 + 0.3 * Math.cos(3 * l + cs.ph)) - 22 * lowTrack - 5 * wxGauss(lat, 6, 8);
    const ptend = -3.2 * wxGauss(absLat, 55, 10) * Math.cos(4 * l + cs.ph * 1.2 + lat * 0.05);
    const cape = Math.max(0, 2600 * wxGauss(lat, 6 + 10 * cs.season, 12) * (0.45 + 0.55 * Math.sin(5 * l + cs.ph)) + 700 * wxGauss(absLat, 32, 8) * Math.max(0, summer) * (0.5 + 0.5 * Math.sin(3 * l)));
    const li = 4 - cape / 450;
    const rh2 = wxClamp(55 + 0.35 * cld + 10 * Math.sin(3 * l + lat * 0.2 + cs.ph), 15, 100);
    const td2 = t2 - (100 - rh2) / 5;
    const prcp = Math.max(0, (cld - 70) / 30) * (0.6 + 0.6 * wxGauss(lat, 6, 9) + 0.4 * lowTrack);
    const vis = wxClamp(24000 - 220 * Math.max(0, rh2 - 70) * Math.max(0, 6 - (t2 - td2)) - 6000 * prcp, 400, 24000);
    const t850 = t2 - 9 + 3 * lowTrack;
    const frzl = Math.max(0, (t2 + 2) * 150);
    return { u10, v10, u250: u, v250: v, u300, v300, cld, t700, rh700, u500, v500, t2, td2, pmsl, ptend, cape, li, vis, t850, prcp, frzl };
}
function atmoModelNodes() {
    const nodes = new Float32Array(ATMO.total * ATMO.F);
    for (let j = 0; j < ATMO.nLat; j++) for (let i = 0; i < ATMO.nLon; i++) {
        const m = atmoModel(ATMO.latMin + j * ATMO.latStep, ATMO.lonMin + i * ATMO.lonStep);
        ATMO_F.forEach((k, f) => { nodes[(j * ATMO.nLon + i) * ATMO.F + f] = m[k]; });
    }
    return nodes;
}
function sampleAtmos(lat, lon) {
    if (!ATMO.useLive || !ATMO.nodes) return atmoModel(lat, lon);
    const fj = wxClamp((lat - ATMO.latMin) / ATMO.latStep, 0, ATMO.nLat - 1);
    let fi = (lon - ATMO.lonMin) / ATMO.lonStep;
    fi = ((fi % ATMO.nLon) + ATMO.nLon) % ATMO.nLon;
    const j0 = Math.floor(fj), j1 = Math.min(ATMO.nLat - 1, j0 + 1);
    const i0 = Math.floor(fi) % ATMO.nLon, i1 = (i0 + 1) % ATMO.nLon;
    const tj = fj - j0, ti = fi - Math.floor(fi);
    const N = ATMO.nodes, F = ATMO.F, nl = ATMO.nLon, out = {};
    for (let k = 0; k < F; k++) {
        const a = N[(j0 * nl + i0) * F + k], b = N[(j0 * nl + i1) * F + k];
        const c = N[(j1 * nl + i0) * F + k], d = N[(j1 * nl + i1) * F + k];
        out[ATMO_F[k]] = (a * (1 - ti) + b * ti) * (1 - tj) + (c * (1 - ti) + d * ti) * tj;
    }
    return out;
}
function icingIndex(a) {
    const tf = wxGauss(a.t700, -9, 9);
    return wxClamp((a.rh700 - 62) / 28, 0, 1) * tf * wxClamp(a.cld / 60, 0.3, 1);
}

// ---- LIVE DATA (throttled, cached) -----------------------------------------
function setWxStatus() {
    const el = document.getElementById('wxStatusLine');
    if (!el) return;
    const da = currentLang === 'da';
    let txt;
    if (ATMO.fetching) txt = (da ? 'Henter live-data… ' : 'Fetching live data… ') + ATMO.liveCount + '/' + ATMO.total;
    else if (ATMO.useLive && ATMO.updated) {
        const hh = String(ATMO.updated.getUTCHours()).padStart(2, '0'), mm = String(ATMO.updated.getUTCMinutes()).padStart(2, '0');
        txt = (da ? 'Live Open-Meteo · opdateret ' : 'Live Open-Meteo · updated ') + hh + ':' + mm + ' UTC';
    } else txt = da ? 'Global model (live-data ikke tilgængelig)' : 'Global model (live data unavailable)';
    el.innerText = txt;
}
function loadAtmoCache() {
    try {
        const raw = localStorage.getItem(WX_CACHE_KEY);
        if (!raw) return null;
        const c = JSON.parse(raw);
        if (!c || !Array.isArray(c.nodes) || c.nodes.length !== ATMO.total * ATMO.F) return null;
        return c;
    } catch (e) { return null; }
}
function applyAtmoNodes(arr, tMs) {
    ATMO.nodes = Float32Array.from(arr);
    ATMO.useLive = true;
    ATMO.updated = new Date(tMs);
    ATMO.version++;
}
async function fetchLiveAtmosphere(force) {
    if (ATMO.fetching) return;
    const cached = loadAtmoCache();
    if (cached && !force && Date.now() - cached.t < 45 * 60000) {
        applyAtmoNodes(cached.nodes, cached.t); setWxStatus(); rebuildWxLayers(true); return;
    }
    if (cached && !ATMO.useLive && Date.now() - cached.t < 6 * 3600000) {   // stale but better than the model
        applyAtmoNodes(cached.nodes, cached.t); rebuildWxLayers(true);
    }
    ATMO.fetching = true; ATMO.liveCount = 0; ATMO.error = null; setWxStatus();
    const nodes = atmoModelNodes();
    const pts = [];
    for (let j = 0; j < ATMO.nLat; j++) for (let i = 0; i < ATMO.nLon; i++)
        pts.push({ j, i, lat: ATMO.latMin + j * ATMO.latStep, lon: ATMO.lonMin + i * ATMO.lonStep });
    const vars = 'wind_speed_10m,wind_direction_10m,wind_speed_250hPa,wind_direction_250hPa,wind_speed_300hPa,wind_direction_300hPa,cloud_cover,temperature_700hPa,relative_humidity_700hPa,' +
                 'wind_speed_500hPa,wind_direction_500hPa,temperature_2m,dew_point_2m,pressure_msl,cape,lifted_index,visibility,temperature_850hPa,precipitation,freezing_level_height';
    let got = 0, failures = 0;
    for (let c = 0; c < pts.length && failures < 3; c += 40) {
        const chunk = pts.slice(c, c + 40);
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + chunk.map(p => p.lat).join(',') +
            '&longitude=' + chunk.map(p => p.lon).join(',') + '&hourly=' + vars +
            '&wind_speed_unit=kn&forecast_hours=1&past_hours=3&timezone=GMT';
        let ok = false;
        for (let attempt = 0; attempt < 3 && !ok; attempt++) {
            try {
                const res = await fetchTimeout(url, {}, 12000);
                if (res.status === 429) { await wxSleep(6000 * (attempt + 1)); continue; }
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const json = await res.json();
                const items = Array.isArray(json) ? json : [json];
                chunk.forEach((p, idx) => {
                    const h = items[idx] && items[idx].hourly;
                    if (!h) return;
                    const now = (k) => h[k] ? h[k].length - 1 : 0;                 // last entry = the current hour
                    const g = (k) => (h[k] && h[k][now(k)] != null) ? Number(h[k][now(k)]) : null;
                    const g0 = (k) => (h[k] && h[k][0] != null) ? Number(h[k][0]) : null;
                    const s10 = g('wind_speed_10m'), d10 = g('wind_direction_10m');
                    const s250 = g('wind_speed_250hPa'), d250 = g('wind_direction_250hPa');
                    const s300 = g('wind_speed_300hPa'), d300 = g('wind_direction_300hPa');
                    const cld = g('cloud_cover'), t7 = g('temperature_700hPa'), r7 = g('relative_humidity_700hPa');
                    if ([s10, d10, s250, d250, s300, d300, cld, t7, r7].some(x => x === null || isNaN(x))) return;
                    const [u10, v10] = windUV(s10, d10), [u250, v250] = windUV(s250, d250), [u300, v300] = windUV(s300, d300);
                    const s500 = g('wind_speed_500hPa'), d500 = g('wind_direction_500hPa');
                    const [u500, v500] = (s500 === null || d500 === null) ? [0.55 * u250, 0.55 * v250] : windUV(s500, d500);
                    const fb = atmoModel(p.lat, p.lon);                                  // per-field fallback if one variable is missing
                    const or = (x, d) => (x === null || isNaN(x)) ? d : x;
                    const pm = g('pressure_msl'), pm0 = g0('pressure_msl');
                    const vals = [u10, v10, u250, v250, u300, v300, cld, t7, r7, u500, v500,
                        or(g('temperature_2m'), fb.t2), or(g('dew_point_2m'), fb.td2), or(pm, fb.pmsl), (pm !== null && pm0 !== null) ? pm - pm0 : fb.ptend,
                        or(g('cape'), fb.cape), or(g('lifted_index'), fb.li), or(g('visibility'), fb.vis), or(g('temperature_850hPa'), fb.t850),
                        or(g('precipitation'), fb.prcp), or(g('freezing_level_height'), fb.frzl)];
                    vals.forEach((x, f) => { nodes[(p.j * ATMO.nLon + p.i) * ATMO.F + f] = x; });
                    got++;
                });
                ok = true;
            } catch (e) {
                if (attempt === 2) { failures++; ATMO.error = String(e && e.message || e); }
                else await wxSleep(1500);
            }
        }
        if (ok) failures = 0;
        ATMO.liveCount = got; setWxStatus();
        await wxSleep(1100);   // gentle pacing keeps us far below Open-Meteo's per-minute limit
    }
    ATMO.fetching = false;
    if (got >= 0.5 * ATMO.total) {
        const now = Date.now();
        applyAtmoNodes(nodes, now);
        try { localStorage.setItem(WX_CACHE_KEY, JSON.stringify({ t: now, nodes: Array.from(nodes, x => Math.round(x * 10) / 10) })); } catch (e) {}
    } else console.warn('Live atmosphere incomplete, keeping model:', got, ATMO.error);
    setWxStatus();
    rebuildWxLayers(true);
}

// ---- CONTOURING (marching squares with segment chaining) -------------------
function contourPolylines(vals, nx, ny, level, xOf, yOf) {
    const pos = new Map(), adj = new Map();
    function ep(id) {
        let p = pos.get(id); if (p) return p;
        const horiz = (id % 2 === 0), cell = (id - (horiz ? 0 : 1)) / 2;
        const j = Math.floor(cell / nx), i = cell % nx;
        if (horiz) { const a = vals[j * nx + i], b = vals[j * nx + i + 1]; p = [xOf(i + (level - a) / (b - a)), yOf(j)]; }
        else { const a = vals[j * nx + i], b = vals[(j + 1) * nx + i]; p = [xOf(i), yOf(j + (level - a) / (b - a))]; }
        pos.set(id, p); return p;
    }
    const H = (i, j) => (j * nx + i) * 2, V = (i, j) => (j * nx + i) * 2 + 1;
    const link = (a, b) => {
        if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []);
        adj.get(a).push(b); adj.get(b).push(a);
    };
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = vals[j * nx + i], b = vals[j * nx + i + 1], c = vals[(j + 1) * nx + i + 1], d = vals[(j + 1) * nx + i];
        const idx = (a >= level ? 1 : 0) | (b >= level ? 2 : 0) | (c >= level ? 4 : 0) | (d >= level ? 8 : 0);
        if (idx === 0 || idx === 15) continue;
        const top = H(i, j), right = V(i + 1, j), bottom = H(i, j + 1), left = V(i, j);
        switch (idx) {
            case 1: case 14: link(left, top); break;
            case 2: case 13: link(top, right); break;
            case 3: case 12: link(left, right); break;
            case 4: case 11: link(right, bottom); break;
            case 6: case 9: link(top, bottom); break;
            case 7: case 8: link(left, bottom); break;
            case 5: if ((a + b + c + d) / 4 >= level) { link(top, right); link(left, bottom); } else { link(left, top); link(right, bottom); } break;
            case 10: if ((a + b + c + d) / 4 >= level) { link(left, top); link(right, bottom); } else { link(top, right); link(left, bottom); } break;
        }
    }
    const visited = new Set(), out = [];
    function trace(start) {
        const path = [start]; visited.add(start);
        let cur = start;
        for (;;) {
            let nxt = -1;
            for (const n of adj.get(cur)) if (!visited.has(n)) { nxt = n; break; }
            if (nxt < 0) break;
            visited.add(nxt); path.push(nxt); cur = nxt;
        }
        const closed = path.length > 2 && adj.get(cur).includes(start);
        const pts = path.map(ep);
        if (closed) pts.push(pts[0]);
        return { pts, closed };
    }
    adj.forEach((nb, id) => { if (nb.length === 1 && !visited.has(id)) out.push(trace(id)); });
    adj.forEach((nb, id) => { if (!visited.has(id)) out.push(trace(id)); });
    return out;
}
function wxField(fn, la0, la1, dla, lo0, lo1, dlo) {
    const nx = Math.round((lo1 - lo0) / dlo) + 1, ny = Math.round((la1 - la0) / dla) + 1;
    const vals = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) { const lat = la0 + j * dla; for (let i = 0; i < nx; i++) vals[j * nx + i] = fn(lat, lo0 + i * dlo); }
    return { vals, nx, ny, la0, dla, lo0, dlo };
}
function wxPad(f, fill) {
    const nx = f.nx + 2, ny = f.ny + 2, vals = new Float32Array(nx * ny).fill(fill);
    for (let j = 0; j < f.ny; j++) for (let i = 0; i < f.nx; i++) vals[(j + 1) * nx + i + 1] = f.vals[j * f.nx + i];
    return { vals, nx, ny, la0: f.la0 - f.dla, dla: f.dla, lo0: f.lo0 - f.dlo, dlo: f.dlo };
}
function wxRings(field, level) {      // closed rings (field padded so every contour closes)
    const P = wxPad(field, -999);
    return contourPolylines(P.vals, P.nx, P.ny, level, fi => P.lo0 + fi * P.dlo, fj => P.la0 + fj * P.dla)
        .filter(l => l.closed && l.pts.length >= 5).map(l => l.pts);
}
function ringInfo(ring) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    ring.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}
function polyFeature(ring, props) { return { type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [ring] } }; }
function fc(features) { return { type: 'FeatureCollection', features }; }

// ---- LAYER DATA BUILDERS --------------------------------------------------
function buildJetsGeoJSON() {
    const feats = [];
    const bands = [[15, 36], [37, 76], [-36, -15], [-76, -37]];
    function emit(run) {
        const sm = run.map((p, i) => {
            const a = run[Math.max(0, i - 1)], b = run[Math.min(run.length - 1, i + 1)];
            return [p[0], (a[1] + p[1] * 2 + b[1]) / 4, p[2]];
        });
        for (let i = 0; i < sm.length - 1; i++) feats.push({ type: 'Feature', properties: { kind: 'seg', spd: (sm[i][2] + sm[i + 1][2]) / 2 },
            geometry: { type: 'LineString', coordinates: [[sm[i][0], sm[i][1]], [sm[i + 1][0], sm[i + 1][1]]] } });
        for (let i = 2; i < sm.length - 2; i += 4) {
            const a = sm[i - 1], b = sm[i + 1];
            const brg = (Math.atan2((b[0] - a[0]) * Math.cos(sm[i][1] * D2R), b[1] - a[1]) / D2R + 360) % 360;
            feats.push({ type: 'Feature', properties: { kind: 'arrow', bearing: brg }, geometry: { type: 'Point', coordinates: [sm[i][0], sm[i][1]] } });
        }
        for (let i = 4; i < sm.length - 3; i += 10) feats.push({ type: 'Feature', properties: { kind: 'label', label: Math.round(sm[i][2]) + ' KT' },
            geometry: { type: 'Point', coordinates: [sm[i][0], sm[i][1]] } });
    }
    bands.forEach(([lo, hi]) => {
        let run = [];
        const flush = () => { if (run.length >= 4) emit(run); run = []; };
        for (let lon = -180; lon <= 180; lon += 3) {
            let best = -1, bl = lo;
            for (let lat = lo; lat <= hi; lat += 1) {
                const a = sampleAtmos(lat, lon), s = Math.hypot(a.u250, a.v250);
                if (s > best) { best = s; bl = lat; }
            }
            if (best >= 62) run.push([lon, bl, best]); else flush();
        }
        flush();
    });
    return fc(feats);
}
function buildBarbsGeoJSON() {
    // Ensartet tæthed over hele jorden = samme fysiske afstand som det tidligere Europa-gitter
    // (2,1° bredde x 2,5° længde ved ~51°N). Længdegrads-trinnet skaleres med 1/cos(lat),
    // så afstanden i km er den samme ved ækvator og nær polerne.
    const pts = [], LAT_STEP = 2.1, REF_LON_KM = 2.5 * Math.cos(51 * D2R);
    for (let lat = -66; lat <= 72.01; lat += LAT_STEP) {
        const n = Math.max(1, Math.round(360 / (REF_LON_KM / Math.max(0.2, Math.cos(lat * D2R)))));
        const step = 360 / n, off = (Math.round(lat / LAT_STEP) % 2) * step / 2;   // forskudte rækker = jævnt mønster
        for (let i = 0; i < n; i++) pts.push([lat, -180 + off + i * step]);
    }
    return fc(pts.map(([lat, lon]) => {
        const a = sampleAtmos(lat, lon), spd = windSpd(a.u10, a.v10);
        const k = wxClamp(Math.round(spd / 5) * 5, 0, 150);
        return { type: 'Feature', properties: { icon: 'wxb-' + (lat < 0 ? 'S' : 'N') + '-' + k, dir: windDirFrom(a.u10, a.v10) },
            geometry: { type: 'Point', coordinates: [lon, lat] } };
    }));
}
function buildCloudGeoJSON() {
    const f = wxField((la, lo) => sampleAtmos(la, lo).cld, -84, 84, 3, -180, 180, 3);
    const feats = [];
    wxRings(f, 55).forEach(r => feats.push(polyFeature(r, { level: 1 })));
    wxRings(f, 82).forEach(r => feats.push(polyFeature(r, { level: 2 })));
    return fc(feats);
}
function buildCatGeoJSON() {
    const f = wxField((lat, lon) => {
        const a = sampleAtmos(lat, lon), sp = Math.hypot(a.u250, a.v250);
        if (sp < 50) return 0;
        const n = sampleAtmos(lat + 1.5, lon), s = sampleAtmos(lat - 1.5, lon);
        const cl = Math.max(0.3, Math.cos(lat * D2R));
        const e = sampleAtmos(lat, lon + 1.5 / cl), w = sampleAtmos(lat, lon - 1.5 / cl);
        const dy = Math.hypot(n.u250 - s.u250, n.v250 - s.v250) / 3;
        const dx = Math.hypot(e.u250 - w.u250, e.v250 - w.v250) / 3;
        const vert = Math.hypot(a.u250 - a.u300, a.v250 - a.v300) / 4;
        return (Math.hypot(dx, dy) + vert) * wxClamp((sp - 50) / 30, 0, 1);
    }, -70, 70, 2.5, -180, 180, 2.5);
    const feats = [];
    [[9, 'MOD'], [14, 'SEV']].forEach(([lvl, sev]) => {
        wxRings(f, lvl).forEach(r => {
            const info = ringInfo(r);
            if (info.w < 5 && info.h < 3) return;
            feats.push(polyFeature(r, { sev: sev === 'SEV' ? 2 : 1, label: (info.w > 8 && info.h > 3) ? sev + ' CAT  FL300-FL390' : '' }));
            if (info.w > 8 && info.h > 3) feats.push({ type: 'Feature', properties: { kind: 'lab', label: sev + ' CAT FL300-390', sev: sev === 'SEV' ? 2 : 1 },
                geometry: { type: 'Point', coordinates: [info.cx, info.cy] } });
        });
    });
    return fc(feats);
}
function buildTropGeoJSON() {
    const cs = ATMO.cs || (ATMO.cs = wxClimateState());
    const f = wxField((la, lo) => tropopauseFL(la, lo, cs), -78, 78, 2, -180, 180, 2);
    const feats = [];
    [300, 340, 380, 420, 460, 500].forEach(lv => {
        contourPolylines(f.vals, f.nx, f.ny, lv, fi => f.lo0 + fi * f.dlo, fj => f.la0 + fj * f.dla).forEach(l => {
            if (l.pts.length < 4) return;
            feats.push({ type: 'Feature', properties: { fl: lv, label: 'FL' + lv }, geometry: { type: 'LineString', coordinates: l.pts } });
        });
    });
    [-150, -30, 90].forEach(lo => feats.push({ type: 'Feature', properties: { fl: 540, label: 'FL' + Math.round(tropopauseFL(0, lo, cs) / 10) * 10, kind: 'pt' }, geometry: { type: 'Point', coordinates: [lo, 0] } }));
    [-120, 0, 120].forEach(lo => { feats.push({ type: 'Feature', properties: { fl: 280, label: 'FL280', kind: 'pt' }, geometry: { type: 'Point', coordinates: [lo, 82] } });
        feats.push({ type: 'Feature', properties: { fl: 280, label: 'FL280', kind: 'pt' }, geometry: { type: 'Point', coordinates: [lo, -80] } }); });
    return fc(feats);
}
function buildIcingGeoJSON() {
    const f = wxField((la, lo) => icingIndex(sampleAtmos(la, lo)), -80, 80, 3, -180, 180, 3);
    const feats = [];
    [[0.4, 'MOD'], [0.7, 'SEV']].forEach(([lvl, sev]) => {
        wxRings(f, lvl).forEach(r => {
            const info = ringInfo(r);
            feats.push(polyFeature(r, { sev: sev === 'SEV' ? 2 : 1 }));
            if (info.w > 9 && info.h > 4) feats.push({ type: 'Feature', properties: { kind: 'lab', label: sev + ' ICE FL100-FL200' }, geometry: { type: 'Point', coordinates: [info.cx, info.cy] } });
        });
    });
    return fc(feats);
}

// ---- ICONS (wind barbs, jet arrows, volcano) -------------------------------
function wxIsDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
function addCanvasIcon(name, size, draw) {
    if (!map || map.hasImage(name)) return;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'); draw(g, size);
    map.addImage(name, g.getImageData(0, 0, size, size), { pixelRatio: 2 });
}
function drawBarb(g, S, k, south, col, lw) {
    const cx = S / 2, cy = S / 2, top = S * 0.08;
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
    if (k < 5) {
        g.beginPath(); g.arc(cx, cy, S * 0.09, 0, 6.2832); g.stroke();
        g.beginPath(); g.arc(cx, cy, S * 0.17, 0, 6.2832); g.stroke(); return;
    }
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, top); g.stroke();
    g.beginPath(); g.arc(cx, cy, S * 0.035, 0, 6.2832); g.fill();
    const sg = south ? -1 : 1, bl = S * 0.22, st = S * 0.075;
    let rem = k; const pen = Math.floor(rem / 50); rem -= pen * 50;
    const full = Math.floor(rem / 10); rem -= full * 10; const half = rem >= 5 ? 1 : 0;
    let y = top;
    for (let p = 0; p < pen; p++) {
        g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + sg * bl, y - st * 0.3); g.lineTo(cx, y + st * 1.1); g.closePath(); g.fill(); g.stroke();
        y += st * 1.4;
    }
    for (let f = 0; f < full; f++) { g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + sg * bl, y - st * 0.9); g.stroke(); y += st; }
    if (half) { if (!pen && !full) y += st; g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + sg * bl * 0.5, y - st * 0.45); g.stroke(); }
}
function ensureWxIcons() {
    if (!map) return;
    const dark = wxIsDark();
    const col = dark ? '#dbe4ee' : '#1b365d', halo = dark ? 'rgba(10,16,24,0.85)' : 'rgba(255,255,255,0.9)';
    ['N', 'S'].forEach(h => {
        for (let k = 0; k <= 150; k += 5) {
            addCanvasIcon('wxb-' + h + '-' + k, 64, (g, S) => { drawBarb(g, S, k, h === 'S', halo, S * 0.085); drawBarb(g, S, k, h === 'S', col, S * 0.04); });
        }
    });
    addCanvasIcon('wx-jet-arrow', 40, (g, S) => {
        g.beginPath(); g.moveTo(S / 2, S * 0.1); g.lineTo(S * 0.8, S * 0.85); g.lineTo(S / 2, S * 0.65); g.lineTo(S * 0.2, S * 0.85); g.closePath();
        g.fillStyle = '#ffffff'; g.strokeStyle = 'rgba(15,23,42,0.85)'; g.lineWidth = 3; g.lineJoin = 'round'; g.stroke(); g.fill();
    });
    addCanvasIcon('wx-volcano', 48, (g, S) => {
        g.beginPath(); g.moveTo(S * 0.12, S * 0.86); g.lineTo(S * 0.42, S * 0.36); g.lineTo(S * 0.58, S * 0.36); g.lineTo(S * 0.88, S * 0.86); g.closePath();
        g.fillStyle = '#b4472f'; g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.lineJoin = 'round'; g.stroke(); g.fill();
        g.fillStyle = '#f59e0b'; [[0.5, 0.26, 0.07], [0.42, 0.15, 0.06], [0.58, 0.14, 0.05]].forEach(([x, y, r]) => { g.beginPath(); g.arc(S * x, S * y, S * r, 0, 6.2832); g.fill(); });
    });
}

// ---- GENERIC MAP HELPERS --------------------------------------------------
function wxBeforeId() {
    for (const id of ['layer-flight-planned', 'layer-flight-focus-direct', 'layer-flight-focus-planned', 'layer-flight-flown', 'layer-occ-rings', 'layer-occ-waypoints']) if (map.getLayer(id)) return id;
    return undefined;
}
// Text labels get their own copy of the source: if the label font cannot be loaded,
// only the labels are lost – the lines and areas of the same layer still draw.
const wxData = {};
function wxPutSource(id, data) {
    wxData[id] = data;
    [id, id + '-lbl'].forEach(sid => { const s = map.getSource(sid); if (s) s.setData(data); else if (sid === id) map.addSource(sid, { type: 'geojson', data }); });
}
function wxPutLayer(def, group) {
    if (def.type === 'symbol' && def.layout && def.layout['text-field'] && wxData[def.source]) {
        const lbl = def.source + '-lbl';
        if (!map.getSource(lbl)) map.addSource(lbl, { type: 'geojson', data: wxData[def.source] });
        def.source = lbl;
    }
    const vis = liveWeatherState[group] ? 'visible' : 'none';
    def.layout = def.layout || {}; def.layout.visibility = vis;
    if (map.getLayer(def.id)) { map.setLayoutProperty(def.id, 'visibility', vis); return; }
    map.addLayer(def, wxBeforeId());
}
function wxText() {
    const dark = wxIsDark();
    return { color: dark ? '#e6edf3' : '#1b365d', halo: dark ? 'rgba(10,16,24,0.9)' : 'rgba(255,255,255,0.95)' };
}
function wxLabelLayout(extra) {
    return Object.assign({ 'text-field': ['get', 'label'], 'text-font': WX_FONT, 'text-size': 11, 'text-allow-overlap': false, 'text-padding': 4 }, extra || {});
}

// ---- LAYER RENDERERS ------------------------------------------------------
function renderJet() {
    wxPutSource('wx-jets', buildJetsGeoJSON());
    const col = ['interpolate', ['linear'], ['get', 'spd'], 60, '#60a5fa', 80, '#34d399', 100, '#fbbf24', 120, '#f97316', 150, '#ef4444'];
    const T = wxText();
    wxPutLayer({ id: 'wx-jet-band', type: 'line', source: 'wx-jets', filter: ['==', ['get', 'kind'], 'seg'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': col, 'line-width': ['interpolate', ['linear'], ['get', 'spd'], 60, 8, 150, 22], 'line-blur': 6, 'line-opacity': 0.28 } }, 'jet');
    wxPutLayer({ id: 'wx-jet-core', type: 'line', source: 'wx-jets', filter: ['==', ['get', 'kind'], 'seg'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': col, 'line-width': ['interpolate', ['linear'], ['get', 'spd'], 60, 1.6, 100, 3, 150, 4.8], 'line-opacity': 0.92 } }, 'jet');
    wxPutLayer({ id: 'wx-jet-arrows', type: 'symbol', source: 'wx-jets', filter: ['==', ['get', 'kind'], 'arrow'],
        layout: { 'icon-image': 'wx-jet-arrow', 'icon-rotate': ['get', 'bearing'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-size': 0.55 } }, 'jet');
    wxPutLayer({ id: 'wx-jet-labels', type: 'symbol', source: 'wx-jets', filter: ['==', ['get', 'kind'], 'label'],
        layout: wxLabelLayout({ 'text-offset': [0, -1.1] }), paint: { 'text-color': T.color, 'text-halo-color': T.halo, 'text-halo-width': 1.6 } }, 'jet');
}
function renderBarbs() {
    wxPutSource('wx-barbs-src', buildBarbsGeoJSON());
    wxPutLayer({ id: 'wx-barbs', type: 'symbol', source: 'wx-barbs-src',
        layout: { 'icon-image': ['get', 'icon'], 'icon-rotate': ['get', 'dir'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
            'icon-size': ['interpolate', ['linear'], ['zoom'], 1.5, 0.5, 4, 0.75, 8, 1] },
        paint: { 'icon-opacity': 0.88 } }, 'barbs');
}
function renderCloud() {
    wxPutSource('wx-cloud-src', buildCloudGeoJSON());
    const dark = wxIsDark(), c = dark ? '#cfd8e3' : '#8aa0b8';
    wxPutLayer({ id: 'wx-cloud-fill-1', type: 'fill', source: 'wx-cloud-src', filter: ['==', ['get', 'level'], 1], paint: { 'fill-color': c, 'fill-opacity': 0.2 } }, 'cloud');
    wxPutLayer({ id: 'wx-cloud-fill-2', type: 'fill', source: 'wx-cloud-src', filter: ['==', ['get', 'level'], 2], paint: { 'fill-color': c, 'fill-opacity': 0.26 } }, 'cloud');
    wxPutLayer({ id: 'wx-cloud-line', type: 'line', source: 'wx-cloud-src', paint: { 'line-color': c, 'line-width': 1, 'line-opacity': 0.55 } }, 'cloud');
}
function renderCat() {
    wxPutSource('wx-cat-src', buildCatGeoJSON());
    const T = wxText(), col = ['match', ['get', 'sev'], 2, '#dc2626', '#f59e0b'];
    wxPutLayer({ id: 'wx-cat-fill', type: 'fill', source: 'wx-cat-src', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': col, 'fill-opacity': 0.22 } }, 'cat');
    wxPutLayer({ id: 'wx-cat-line', type: 'line', source: 'wx-cat-src', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'line-color': col, 'line-width': 1.4, 'line-dasharray': [3, 2], 'line-opacity': 0.85 } }, 'cat');
    wxPutLayer({ id: 'wx-cat-label', type: 'symbol', source: 'wx-cat-src', filter: ['==', ['get', 'kind'], 'lab'],
        layout: wxLabelLayout({ 'text-size': 10.5 }), paint: { 'text-color': T.color, 'text-halo-color': T.halo, 'text-halo-width': 1.6 } }, 'cat');
}
function renderTrop() {
    wxPutSource('wx-trop-src', buildTropGeoJSON());
    const T = wxText(), dark = wxIsDark();
    wxPutLayer({ id: 'wx-trop-line', type: 'line', source: 'wx-trop-src', filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': dark ? '#a5b4fc' : '#4f46e5', 'line-width': 1.2, 'line-opacity': 0.7 } }, 'trop');
    wxPutLayer({ id: 'wx-trop-label', type: 'symbol', source: 'wx-trop-src', filter: ['==', ['geometry-type'], 'LineString'],
        layout: wxLabelLayout({ 'symbol-placement': 'line', 'symbol-spacing': 380, 'text-size': 10.5 }),
        paint: { 'text-color': T.color, 'text-halo-color': T.halo, 'text-halo-width': 1.6 } }, 'trop');
    wxPutLayer({ id: 'wx-trop-pt', type: 'symbol', source: 'wx-trop-src', filter: ['==', ['geometry-type'], 'Point'],
        layout: wxLabelLayout({ 'text-size': 11 }), paint: { 'text-color': T.color, 'text-halo-color': T.halo, 'text-halo-width': 1.6 } }, 'trop');
}
function renderIcing() {
    wxPutSource('wx-ice-src', buildIcingGeoJSON());
    const T = wxText(), col = ['match', ['get', 'sev'], 2, '#1d4ed8', '#0ea5e9'];
    wxPutLayer({ id: 'wx-ice-fill', type: 'fill', source: 'wx-ice-src', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': col, 'fill-opacity': 0.24 } }, 'icing');
    wxPutLayer({ id: 'wx-ice-line', type: 'line', source: 'wx-ice-src', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'line-color': col, 'line-width': 1.3, 'line-opacity': 0.85 } }, 'icing');
    wxPutLayer({ id: 'wx-ice-label', type: 'symbol', source: 'wx-ice-src', filter: ['==', ['get', 'kind'], 'lab'],
        layout: wxLabelLayout({ 'text-size': 10.5 }), paint: { 'text-color': T.color, 'text-halo-color': T.halo, 'text-halo-width': 1.6 } }, 'icing');
}

// Volcanoes: static aviation reference list (not a live eruption feed)
const WX_VOLCANOES = [
    ['Etna', 'Italy', 37.748, 14.999, 'Toulouse'], ['Stromboli', 'Italy', 38.789, 15.213, 'Toulouse'], ['Campi Flegrei', 'Italy', 40.827, 14.139, 'Toulouse'],
    ['Reykjanes', 'Iceland', 63.880, -22.430, 'London'], ['Popocatépetl', 'Mexico', 19.023, -98.622, 'Washington'], ['Colima', 'Mexico', 19.514, -103.620, 'Washington'],
    ['Fuego', 'Guatemala', 14.473, -90.880, 'Washington'], ['Santiaguito', 'Guatemala', 14.756, -91.552, 'Washington'], ['Pacaya', 'Guatemala', 14.381, -90.601, 'Washington'],
    ['Kilauea', 'Hawaii, USA', 19.421, -155.287, 'Washington'], ['Nevado del Ruiz', 'Colombia', 4.895, -75.322, 'Washington'],
    ['Soufrière Hills', 'Montserrat', 16.720, -62.180, 'Washington'], ['La Soufrière', 'St Vincent', 13.330, -61.180, 'Washington'],
    ['Sakurajima', 'Japan', 31.585, 130.657, 'Tokyo'], ['Suwanosejima', 'Japan', 29.638, 129.714, 'Tokyo'], ['Aso', 'Japan', 32.884, 131.104, 'Tokyo'],
    ['Nishinoshima', 'Japan', 27.247, 140.874, 'Tokyo'], ['Taal', 'Philippines', 14.002, 120.993, 'Tokyo'], ['Mayon', 'Philippines', 13.257, 123.686, 'Tokyo'],
    ['Kanlaon', 'Philippines', 10.412, 123.132, 'Tokyo'], ['Shiveluch', 'Russia', 56.653, 161.360, 'Anchorage'], ['Klyuchevskoy', 'Russia', 56.056, 160.638, 'Anchorage'],
    ['Great Sitkin', 'Alaska, USA', 52.077, -176.111, 'Anchorage'], ['Cleveland', 'Alaska, USA', 52.822, -169.944, 'Anchorage'],
    ['Merapi', 'Indonesia', -7.540, 110.446, 'Darwin'], ['Semeru', 'Indonesia', -8.108, 112.922, 'Darwin'], ['Ibu', 'Indonesia', 1.488, 127.630, 'Darwin'],
    ['Lewotobi Laki-laki', 'Indonesia', -8.542, 122.775, 'Darwin'], ['Ruapehu', 'New Zealand', -39.281, 175.564, 'Wellington'], ['Whakaari', 'New Zealand', -37.521, 177.183, 'Wellington'],
    ['Nyiragongo', 'DR Congo', -1.520, 29.250, 'Toulouse'], ['Erta Ale', 'Ethiopia', 13.600, 40.670, 'Toulouse'], ['Piton de la Fournaise', 'Réunion', -21.244, 55.708, 'Toulouse'],
    ['Sabancaya', 'Peru', -15.787, -71.857, 'Buenos Aires'], ['Ubinas', 'Peru', -16.355, -70.903, 'Buenos Aires'], ['Villarrica', 'Chile', -39.421, -71.939, 'Buenos Aires']
];
function renderVolcano() {
    wxPutSource('wx-volc-src', fc(WX_VOLCANOES.map(v => ({ type: 'Feature', properties: { name: v[0], country: v[1], vaac: v[4], label: v[0] }, geometry: { type: 'Point', coordinates: [v[3], v[2]] } }))));
    const T = wxText();
    wxPutLayer({ id: 'wx-volc', type: 'symbol', source: 'wx-volc-src',
        layout: wxLabelLayout({ 'icon-image': 'wx-volcano', 'icon-size': 0.62, 'icon-allow-overlap': true, 'text-size': 10, 'text-offset': [0, 1.15], 'text-anchor': 'top', 'text-optional': true }),
        paint: { 'text-color': T.color, 'text-halo-color': T.halo, 'text-halo-width': 1.5 } }, 'volcano');
}

// Tropical cyclones (GDACS live feed; shown only if the feed is reachable)
let wxCyclones = { data: null, t: 0, markers: [] };
async function wxFetchJson(url) {
    try { const r = await fetchTimeout(url, {}, 7000); if (r.ok) return await r.json(); } catch (e) {}
    return fetchWithFallback(url, true);
}
async function loadCyclones(force) {
    if (!force && wxCyclones.data && Date.now() - wxCyclones.t < 20 * 60000) return;
    const centers = [], feats = [];
    try {
        const data = await wxFetchJson('https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP');
        const byEvent = {};
        ((data && data.features) || []).forEach(f => {
            const p = f.properties || {};
            if (p.eventtype !== 'TC' || !f.geometry) return;
            (byEvent[p.eventid] = byEvent[p.eventid] || []).push(f);
        });
        Object.values(byEvent).forEach(list => {
            const pts = list.filter(f => f.geometry.type === 'Point');
            const cen = pts.find(f => /centroid/i.test((f.properties || {}).Class || '')) || pts[0];
            if (!cen) return;
            const p = cen.properties || {};
            let kmh = p.severitydata && Number(p.severitydata.severity);
            if (!kmh && p.severitytext) { const m = /(\d+(\.\d+)?)\s*km\/h/.exec(p.severitytext); kmh = m ? Number(m[1]) : 0; }
            const kt = Math.round((kmh || 0) / 1.852);
            const name = p.eventname || p.name || 'TC';
            const [lon, lat] = cen.geometry.coordinates;
            const rad = wxClamp(60 + 1.7 * kt, 80, 360);
            centers.push({ lat, lon, name, kt });
            feats.push({ type: 'Feature', properties: { kind: 'center', label: name + (kt ? '  ' + kt + ' KT' : '') }, geometry: { type: 'Point', coordinates: [lon, lat] } });
            feats.push({ type: 'Feature', properties: { kind: 'radius', label: 'SAFETY ' + Math.round(rad) + ' NM' }, geometry: { type: 'Polygon', coordinates: [createGeoCircle(lon, lat, rad, 72)] } });
            list.forEach(f => {
                const t = f.geometry.type;
                if (t === 'LineString' || t === 'MultiLineString') feats.push({ type: 'Feature', properties: { kind: 'track' }, geometry: f.geometry });
                else if (t === 'Polygon' || t === 'MultiPolygon') feats.push({ type: 'Feature', properties: { kind: 'cone' }, geometry: f.geometry });
            });
        });
        wxCyclones.data = { geo: fc(feats), centers }; wxCyclones.t = Date.now();
    } catch (e) {
        console.warn('Tropical cyclone feed unavailable:', e);
        wxCyclones.data = { geo: fc([]), centers: [], failed: true }; wxCyclones.t = Date.now() - 15 * 60000;
    }
}
function clearCycloneMarkers() { wxCyclones.markers.forEach(m => m.remove()); wxCyclones.markers = []; }
function renderCyclone() {
    const d = wxCyclones.data || { geo: fc([]), centers: [] };
    wxPutSource('wx-tc-src', d.geo);
    const T = wxText(), mag = '#d946ef';
    wxPutLayer({ id: 'wx-tc-cone', type: 'fill', source: 'wx-tc-src', filter: ['==', ['get', 'kind'], 'cone'], paint: { 'fill-color': mag, 'fill-opacity': 0.1 } }, 'cyclone');
    wxPutLayer({ id: 'wx-tc-radius-fill', type: 'fill', source: 'wx-tc-src', filter: ['==', ['get', 'kind'], 'radius'], paint: { 'fill-color': mag, 'fill-opacity': 0.1 } }, 'cyclone');
    wxPutLayer({ id: 'wx-tc-radius-line', type: 'line', source: 'wx-tc-src', filter: ['==', ['get', 'kind'], 'radius'], paint: { 'line-color': mag, 'line-width': 1.4, 'line-dasharray': [3, 2], 'line-opacity': 0.9 } }, 'cyclone');
    wxPutLayer({ id: 'wx-tc-track', type: 'line', source: 'wx-tc-src', filter: ['==', ['get', 'kind'], 'track'], paint: { 'line-color': mag, 'line-width': 2, 'line-dasharray': [2, 2] } }, 'cyclone');
    wxPutLayer({ id: 'wx-tc-label', type: 'symbol', source: 'wx-tc-src', filter: ['==', ['get', 'kind'], 'center'],
        layout: wxLabelLayout({ 'text-offset': [0, 2.1], 'text-size': 11.5 }), paint: { 'text-color': T.color, 'text-halo-color': T.halo, 'text-halo-width': 1.8 } }, 'cyclone');
    clearCycloneMarkers();
    if (liveWeatherState.cyclone) d.centers.forEach(c => {
        const el = document.createElement('div');
        el.className = 'tc-marker' + (c.lat < 0 ? ' south' : '');
        el.innerHTML = '<svg viewBox="0 0 48 48"><path d="M24 24 m0 -5 a5 5 0 1 1 -5 5 M24 24 m0 -10 a10 10 0 1 1 -10 10 M24 24 m0 -15 a15 15 0 1 1 -15 15 M24 24 m0 -20 a20 20 0 0 1 20 20" fill="none" stroke="#d946ef" stroke-width="3.2" stroke-linecap="round"/><circle cx="24" cy="24" r="3.4" fill="#fff" stroke="#d946ef" stroke-width="2"/></svg>';
        wxCyclones.markers.push(new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([c.lon, c.lat]).addTo(map));
    });
}

// SIGMET (live ISIGMET feed; clearly flagged sample boxes if the feed is unreachable)
let wxSigmet = { data: null, sample: false };
async function loadSigmetData() {
    if (wxSigmet.data) return;
    const features = [];
    // Worldwide: International SIGMETs (all FIRs that publish coordinates) + US domestic SIGMETs (incl. convective).
    // No cap on the number of areas any more (was 120, which cut off part of the world).
    const addRing = (coords, hz, fir) => {
        if (!Array.isArray(coords) || coords.length < 3) return;
        const ring = coords.map(c => [Number(c.lon), Number(c.lat)]).filter(c => !isNaN(c[0]) && !isNaN(c[1]));
        if (ring.length < 3) return;
        const a = ring[0], b = ring[ring.length - 1];
        if (a[0] !== b[0] || a[1] !== b[1]) ring.push([...a]);
        features.push({ type: 'Feature', properties: { hazard: hz, fir, label: hz + ' ' + fir }, geometry: { type: 'Polygon', coordinates: [ring] } });
    };
    const feeds = await Promise.allSettled([
        fetchWithFallback('https://aviationweather.gov/api/data/isigmet?format=json', true),
        fetchWithFallback('https://aviationweather.gov/api/data/airsigmet?format=json', true)
    ]);
    if (feeds[0].status === 'fulfilled' && Array.isArray(feeds[0].value)) feeds[0].value.forEach(sig =>
        addRing(sig.coords, sig.hazard || 'SIGMET', sig.firId || sig.firName || 'FIR'));
    else console.warn('International SIGMET feed unavailable:', feeds[0].reason);
    if (feeds[1].status === 'fulfilled' && Array.isArray(feeds[1].value)) feeds[1].value.forEach(sig => {
        if (String(sig.airSigmetType || '').toUpperCase() !== 'SIGMET') return;     // skip AIRMETs / outlooks
        const hz = String(sig.hazard || 'SIGMET').toUpperCase().replace('CONVECTIVE', 'TS');
        addRing(sig.coords, hz, 'US');
    });
    else console.warn('US SIGMET feed unavailable:', feeds[1].reason);
    wxSigmet.sample = features.length === 0;
    if (wxSigmet.sample) {
        [{ hazard: 'TURB', fir: 'EKDK', c: [6.5, 54.8, 9.8, 56.8] }, { hazard: 'TS', fir: 'EDGG', c: [6.0, 49.0, 10.5, 51.4] },
         { hazard: 'ICE', fir: 'ENOR', c: [4.0, 59.0, 11.5, 62.5] }, { hazard: 'TURB', fir: 'EGTT', c: [-5.0, 50.5, 1.5, 53.5] }].forEach(s => {
            const [x0, y0, x1, y1] = s.c;
            features.push({ type: 'Feature', properties: { hazard: s.hazard, fir: s.fir, label: 'SAMPLE ' + s.hazard + ' ' + s.fir }, geometry: { type: 'Polygon', coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]] } });
        });
    }
    wxSigmet.data = fc(features);
}
function renderSigmet() {
    const feats = wxSigmet.data ? wxSigmet.data.features : [];
    const labels = feats.map(f => { const i = ringInfo(f.geometry.coordinates[0]); return { type: 'Feature', properties: { kind: 'lab', label: f.properties.label }, geometry: { type: 'Point', coordinates: [i.cx, i.cy] } }; });
    wxPutSource('wx-sigmet-src', fc(feats.concat(labels)));
    const T = wxText();
    const col = ['case', ['in', 'TS', ['get', 'hazard']], '#ef4444', ['in', 'TURB', ['get', 'hazard']], '#f59e0b', ['in', 'ICE', ['get', 'hazard']], '#38bdf8',
        ['in', 'VA', ['get', 'hazard']], '#a855f7', ['in', 'TC', ['get', 'hazard']], '#ec4899', '#ef4444'];
    wxPutLayer({ id: 'wx-sigmet-fill', type: 'fill', source: 'wx-sigmet-src', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': col, 'fill-opacity': 0.14 } }, 'sigmet');
    wxPutLayer({ id: 'wx-sigmet-line', type: 'line', source: 'wx-sigmet-src', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'line-color': col, 'line-width': 1.5, 'line-dasharray': [3, 2], 'line-opacity': 0.85 } }, 'sigmet');
    wxPutLayer({ id: 'wx-sigmet-label', type: 'symbol', source: 'wx-sigmet-src', filter: ['==', ['get', 'kind'], 'lab'],
        layout: wxLabelLayout({ 'text-size': 10.5 }), paint: { 'text-color': T.color, 'text-halo-color': T.halo, 'text-halo-width': 1.6 } }, 'sigmet');
}

// =====================================================================
// FIELD LAYERS (v30): smooth colour fields drawn from the global grid
// Each field is rendered into a Web-Mercator image (so it lines up exactly on the map)
// =====================================================================
const FIELD_MERC_LAT = 82;
const mercY = lat => Math.log(Math.tan(Math.PI / 4 + lat * D2R / 2));
const invMercY = y => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / D2R;
function rampColor(stops, v) {      // stops: [[value, [r,g,b,a]], ...]
    if (v <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) {
        const [a, ca] = stops[i - 1], [b, cb] = stops[i], t = (v - a) / (b - a);
        return [0, 1, 2, 3].map(k => ca[k] + (cb[k] - ca[k]) * t);
    }
    return stops[stops.length - 1][1];
}
const C = (hex, a) => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, a]; };
// value(atmos sample, lat, lon) -> number; ramp: colour stops; legend: label, unit, ticks
const FIELD_DEFS = {
    cloud: { val: a => a.cld, unit: '%', ticks: [0, 50, 100],
             ramp: [[20, C('#8a97a8', 0)], [45, C('#8a97a8', 70)], [75, C('#6b7686', 125)], [100, C('#4d5665', 165)]] },
    cape:  { val: a => a.cape, unit: 'J/kg', ticks: [0, 1000, 2500, 4000],
             ramp: [[100, C('#5b8def', 0)], [300, C('#5b8def', 90)], [800, C('#38c3a0', 130)], [1500, C('#a8d84a', 150)], [2500, C('#f6c445', 165)], [3500, C('#f0703a', 175)], [4500, C('#c8326a', 185)]] },
    conv:  { val: a => Math.min(500, (8000 + 750 * Math.sqrt(Math.max(0, a.cape))) / 100) * wxClamp((a.cape - 80) / 400, 0, 1) * wxClamp((a.cld - 15) / 35, 0, 1), unit: 'FL', ticks: [100, 250, 400, 500],
             ramp: [[40, C('#6aa8ff', 0)], [110, C('#6aa8ff', 110)], [200, C('#3fd0b0', 140)], [300, C('#f5d442', 160)], [400, C('#f07a3a', 175)], [480, C('#d8345f', 190)]] },
    dust:  { val: (a, lat, lon) => dustAt(lat, lon), unit: 'µg/m³', ticks: [0, 100, 500, 1000],
             ramp: [[30, C('#e3c56a', 0)], [80, C('#e3c56a', 95)], [250, C('#dca04e', 135)], [600, C('#c8683a', 160)], [1200, C('#9b3a5a', 180)]] },
    fog:   { val: a => fogProb(a), unit: '%', ticks: [0, 50, 100],
             ramp: [[20, C('#8da2c8', 0)], [40, C('#8da2c8', 90)], [70, C('#6c7fb0', 140)], [100, C('#4e5d96', 175)]] },
    frz:   { val: a => frzProb(a), unit: '%', ticks: [0, 50, 100],
             ramp: [[8, C('#9aa7d6', 0)], [20, C('#9aa7d6', 110)], [50, C('#7c6fd0', 150)], [100, C('#5b3fb8', 185)]] },
    ptend: { val: a => a.ptend, unit: 'hPa/3h', ticks: [-4, 0, 4],
             ramp: [[-5, C('#5a6fa8', 150)], [-2, C('#8aa0cc', 90)], [-0.6, C('#c9d3e6', 0)], [0.6, C('#d9e6c4', 0)], [2, C('#a9c77d', 90)], [5, C('#6f9a3e', 150)]] },
    t2m:   { val: a => a.t2, unit: '°C', ticks: [-30, 0, 20, 40],
             ramp: [[-40, C('#6a4fb8', 150)], [-20, C('#4f7fd8', 140)], [-5, C('#7fc0e8', 125)], [0, C('#cfe9f2', 110)], [10, C('#b7e0a2', 115)], [20, C('#f3e07a', 125)], [30, C('#f29b4c', 140)], [42, C('#d24343', 155)]] },
    vis:   { val: a => a.vis / 1000, unit: 'km', ticks: [0, 5, 10],
             ramp: [[0.3, C('#d24a6e', 170)], [1.5, C('#e9886e', 140)], [3, C('#f2c27a', 110)], [6, C('#9cc9e6', 60)], [9, C('#9cc9e6', 0)]] }
};
const FIELD_LAYERS = Object.keys(FIELD_DEFS);
function fogProb(a) {
    const spread = a.t2 - a.td2, wind = Math.hypot(a.u10, a.v10);
    let p = wxClamp((3 - spread) / 3, 0, 1) * wxClamp((14 - wind) / 10, 0.15, 1);
    if (a.vis < 1000) p = Math.max(p, 0.9); else if (a.vis < 3000) p = Math.max(p, 0.55);
    return 100 * wxClamp(p, 0, 1);
}
function frzProb(a) {    // rain falling from a warm layer onto a sub-zero surface
    const warmNose = wxClamp(a.t850 / 3, 0, 1), cold = wxClamp((1 - a.t2) / 4, 0, 1), wet = wxClamp(a.prcp / 0.4, 0, 1) * 0.8 + wxClamp((a.cld - 60) / 40, 0, 1) * 0.2;
    return 100 * warmNose * cold * wet;
}
// airborne dust: live from Open-Meteo air quality when available, otherwise source regions
const DUST = { nodes: null, fetching: false, updated: 0 };
const DUST_SRC = [[22, 3, 14, 18, 1100], [18, 15, 10, 14, 700], [24, 48, 8, 12, 600], [41, 105, 6, 14, 450], [-25, 135, 6, 10, 250], [32, -112, 4, 6, 150]];
function dustModel(lat, lon) {
    let v = 0; const ph = Date.now() / 86400000;
    DUST_SRC.forEach(([la, lo, sla, slo, amp]) => { v += amp * wxGauss(lat, la, sla) * wxGauss(((lon - lo + 540) % 360) - 180, 4 * Math.sin(ph + la), slo); });
    return v;
}
function dustAt(lat, lon) {
    if (!DUST.nodes) return dustModel(lat, lon);
    const fj = wxClamp((lat - ATMO.latMin) / ATMO.latStep, 0, ATMO.nLat - 1); let fi = (lon - ATMO.lonMin) / ATMO.lonStep; fi = ((fi % ATMO.nLon) + ATMO.nLon) % ATMO.nLon;
    const j0 = Math.floor(fj), j1 = Math.min(ATMO.nLat - 1, j0 + 1), i0 = Math.floor(fi) % ATMO.nLon, i1 = (i0 + 1) % ATMO.nLon, tj = fj - j0, ti = fi - Math.floor(fi), N = DUST.nodes, nl = ATMO.nLon;
    return (N[j0 * nl + i0] * (1 - ti) + N[j0 * nl + i1] * ti) * (1 - tj) + (N[j1 * nl + i0] * (1 - ti) + N[j1 * nl + i1] * ti) * tj;
}
async function fetchDust() {
    if (DUST.fetching || (DUST.nodes && Date.now() - DUST.updated < 45 * 60000)) return;
    DUST.fetching = true;
    const nodes = new Float32Array(ATMO.total); let got = 0;
    const pts = []; for (let j = 0; j < ATMO.nLat; j++) for (let i = 0; i < ATMO.nLon; i++) pts.push({ j, i, lat: ATMO.latMin + j * ATMO.latStep, lon: ATMO.lonMin + i * ATMO.lonStep });
    for (let c = 0; c < pts.length; c += 60) {
        const chunk = pts.slice(c, c + 60);
        try {
            const res = await fetchTimeout('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + chunk.map(p => p.lat).join(',') + '&longitude=' + chunk.map(p => p.lon).join(',') + '&hourly=dust&forecast_hours=1&timezone=GMT', {}, 12000);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const json = await res.json(), items = Array.isArray(json) ? json : [json];
            chunk.forEach((p, k) => { const h = items[k] && items[k].hourly; const v = h && h.dust && h.dust[0]; nodes[p.j * ATMO.nLon + p.i] = (v == null) ? dustModel(p.lat, p.lon) : Number(v); if (v != null) got++; });
        } catch (e) { chunk.forEach(p => { nodes[p.j * ATMO.nLon + p.i] = dustModel(p.lat, p.lon); }); }
        await wxSleep(400);
    }
    DUST.fetching = false;
    if (got > ATMO.total * 0.3) { DUST.nodes = nodes; DUST.updated = Date.now(); if (liveWeatherState.dust) renderWxLayer('dust', true); }
}
function renderFieldLayer(id) {
    const def = FIELD_DEFS[id], W = 360, H = 240;
    const y0 = mercY(FIELD_MERC_LAT), y1 = mercY(-FIELD_MERC_LAT);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
    for (let py = 0; py < H; py++) {
        const lat = invMercY(y0 + (y1 - y0) * (py + 0.5) / H);
        for (let px = 0; px < W; px++) {
            const lon = -180 + 360 * (px + 0.5) / W;
            const v = def.val(sampleAtmos(lat, lon), lat, lon);
            const c = rampColor(def.ramp, v), o = (py * W + px) * 4;
            d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = c[3];
        }
    }
    ctx.putImageData(img, 0, 0);
    const url = cv.toDataURL('image/png'), src = 'wx-f-' + id + '-src', coords = [[-180, FIELD_MERC_LAT], [180, FIELD_MERC_LAT], [180, -FIELD_MERC_LAT], [-180, -FIELD_MERC_LAT]];
    const s = map.getSource(src);
    if (s && s.updateImage) s.updateImage({ url, coordinates: coords });
    else map.addSource(src, { type: 'image', url, coordinates: coords });
    wxPutLayer({ id: 'wx-f-' + id, type: 'raster', source: src, paint: { 'raster-opacity': 0.85, 'raster-resampling': 'linear', 'raster-fade-duration': 0 } }, id);
    if (id === 'cape') renderLiLines();
}
// lifted index ≤ -2 outlined on top of CAPE
function renderLiLines() {
    const f = wxField((la, lo) => -sampleAtmos(la, lo).li, -78, 78, 3, -180, 180, 3);
    const feats = [];
    [[2, 1], [5, 2]].forEach(([lv, k]) => wxRings(f, lv).forEach(r => feats.push({ type: 'Feature', properties: { k }, geometry: { type: 'LineString', coordinates: r } })));
    wxPutSource('wx-li-src', fc(feats));
    wxPutLayer({ id: 'wx-li-line', type: 'line', source: 'wx-li-src', paint: { 'line-color': wxIsDark() ? '#e6edf3' : '#2b3a55', 'line-width': ['match', ['get', 'k'], 2, 1.4, 0.9], 'line-opacity': 0.6, 'line-dasharray': [2, 2] } }, 'cape');
}
// mean sea level pressure: isobars every 4 hPa + H/L centres
function renderMslp() {
    const f = wxField((la, lo) => sampleAtmos(la, lo).pmsl, -78, 78, 2, -180, 180, 2);
    const feats = [];
    for (let lv = 960; lv <= 1048; lv += 4) {
        contourPolylines(f.vals, f.nx, f.ny, lv, fi => f.lo0 + fi * f.dlo, fj => f.la0 + fj * f.dla)
            .filter(l => l.pts.length >= 4).forEach(l => feats.push({ type: 'Feature', properties: { kind: 'iso', label: String(lv), major: lv % 8 === 0 ? 1 : 0 }, geometry: { type: 'LineString', coordinates: l.pts } }));
    }
    // local extremes -> H / L
    for (let j = 2; j < f.ny - 2; j += 1) for (let i = 2; i < f.nx - 2; i += 1) {
        const v = f.vals[j * f.nx + i]; let mx = true, mn = true;
        for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { if (!dj && !di) continue; const jj = j + dj, ii = (i + di + f.nx) % f.nx; if (jj < 0 || jj >= f.ny) continue; const w = f.vals[jj * f.nx + ii]; if (w >= v) mx = false; if (w <= v) mn = false; }
        if ((mx && v > 1018) || (mn && v < 1004)) feats.push({ type: 'Feature', properties: { kind: 'centre', hl: mx ? 'H' : 'L', label: Math.round(v) + '' }, geometry: { type: 'Point', coordinates: [f.lo0 + i * f.dlo, f.la0 + j * f.dla] } });
    }
    wxPutSource('wx-mslp-src', fc(feats));
    const T = wxText(), dark = wxIsDark();
    wxPutLayer({ id: 'wx-mslp-line', type: 'line', source: 'wx-mslp-src', filter: ['==', ['get', 'kind'], 'iso'],
        paint: { 'line-color': dark ? '#b8c4d6' : '#4a5a74', 'line-width': ['match', ['get', 'major'], 1, 1.3, 0.8], 'line-opacity': 0.75 } }, 'mslp');
    wxPutLayer({ id: 'wx-mslp-label', type: 'symbol', source: 'wx-mslp-src', filter: ['all', ['==', ['get', 'kind'], 'iso'], ['==', ['get', 'major'], 1]],
        layout: wxLabelLayout({ 'symbol-placement': 'line', 'symbol-spacing': 320, 'text-size': 10 }), paint: { 'text-color': T.color, 'text-halo-color': T.halo, 'text-halo-width': 1.5 } }, 'mslp');
    wxPutLayer({ id: 'wx-mslp-hl', type: 'symbol', source: 'wx-mslp-src', filter: ['==', ['get', 'kind'], 'centre'],
        layout: { 'text-field': ['get', 'hl'], 'text-font': WX_FONT, 'text-size': 20, 'text-allow-overlap': false },
        paint: { 'text-color': ['match', ['get', 'hl'], 'H', dark ? '#7fb2ff' : '#1e3a6e', dark ? '#ff8a8a' : '#b3192e'], 'text-halo-color': T.halo, 'text-halo-width': 2 } }, 'mslp');
    wxPutLayer({ id: 'wx-mslp-hlv', type: 'symbol', source: 'wx-mslp-src', filter: ['==', ['get', 'kind'], 'centre'],
        layout: { 'text-field': ['get', 'label'], 'text-font': WX_FONT, 'text-size': 10, 'text-offset': [0, 1.5], 'text-allow-overlap': false },
        paint: { 'text-color': T.color, 'text-halo-color': T.halo, 'text-halo-width': 1.5 } }, 'mslp');
}
// satellite: NASA GIBS true-colour mosaic (previous UTC day, so it is complete)
function renderSatellite() {
    const d = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const url = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
    if (map.getSource('wx-sat-src') && map.getSource('wx-sat-src').tiles && map.getSource('wx-sat-src').tiles[0] !== url) { if (map.getLayer('wx-sat')) map.removeLayer('wx-sat'); map.removeSource('wx-sat-src'); }
    if (!map.getSource('wx-sat-src')) map.addSource('wx-sat-src', { type: 'raster', tiles: [url], tileSize: 256, maxzoom: 9, attribution: 'NASA GIBS' });
    wxPutLayer({ id: 'wx-sat', type: 'raster', source: 'wx-sat-src', paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 200 } }, 'sat');
    // satellite sits right above the base map, under everything else
    if (map.getLayer('wx-sat') && map.getLayer('occ-osm-layer')) { const layers = map.getStyle().layers; const i = layers.findIndex(l => l.id === 'occ-osm-layer'); if (layers[i + 1]) map.moveLayer('wx-sat', layers[i + 1].id); }
}

// ---------- animated winds (particle flow field) ----------
const WIND_LEVELS = [['sfc', 'SFC', 'u10', 'v10'], ['fl180', 'FL180', 'u500', 'v500'], ['fl300', 'FL300', 'u300', 'v300'], ['fl340', 'FL340', 'u250', 'v250']];
const flow = { on: false, raf: 0, parts: [], level: 'fl340', last: 0, moved: 0 };
try { flow.level = localStorage.getItem('bingoFlowLevel') || 'fl340'; } catch (e) {}
function setFlowLevel(lv) { flow.level = lv; try { localStorage.setItem('bingoFlowLevel', lv); } catch (e) {} flowReset(); syncWxMenuUI(); updateWxLegend(); }
function flowCanvas() {
    let c = document.getElementById('flowCanvas');
    if (!c) { c = document.createElement('canvas'); c.id = 'flowCanvas'; c.setAttribute('aria-hidden', 'true'); document.getElementById('radarLayer').appendChild(c); }
    return c;
}
function flowReset() {
    const c = flowCanvas(), dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(c.clientWidth * dpr); c.height = Math.round(c.clientHeight * dpr);
    const n = Math.round(Math.min(2200, c.clientWidth * c.clientHeight / 380) * (prefersReducedMotion() ? 0.3 : 1));
    flow.parts = Array.from({ length: n }, () => ({ x: Math.random() * c.clientWidth, y: Math.random() * c.clientHeight, age: Math.random() * 80 }));
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, c.width, c.height);
}
function startFlow() {
    if (flow.raf || !map) return;
    flow.on = true; flowCanvas().style.display = 'block'; flowReset();
    if (!startFlow._bound) { startFlow._bound = true; map.on('move', () => { if (flow.on) { flow.moved = performance.now(); const c = flowCanvas(); c.getContext('2d').clearRect(0, 0, c.width, c.height); } }); window.addEventListener('resize', () => { if (flow.on) flowReset(); }); }
    const tick = (now) => {
        const c = flowCanvas(), ctx = c.getContext('2d'), w = c.clientWidth, h = c.clientHeight;
        const lv = WIND_LEVELS.find(l => l[0] === flow.level) || WIND_LEVELS[3];
        const dark = wxIsDark();
        ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
        if (now - flow.moved > 120) {
            const pxPerKt = 0.022;                       // screen-space speed: 100 kt ≈ 2 px per frame
            ctx.lineWidth = 1.2;
            for (const p of flow.parts) {
                const ll = map.unproject([p.x, p.y]);
                const a = sampleAtmos(ll.lat, ll.lng), u = a[lv[2]], v = a[lv[3]], sp = Math.hypot(u, v);
                const nx = p.x + u * pxPerKt, ny = p.y - v * pxPerKt;
                ctx.strokeStyle = sp < 15 ? (dark ? 'rgba(180,200,230,0.5)' : 'rgba(90,110,140,0.45)') : sp < 40 ? (dark ? 'rgba(120,200,255,0.7)' : 'rgba(40,120,200,0.6)') : sp < 80 ? 'rgba(60,190,140,0.75)' : sp < 120 ? 'rgba(240,180,40,0.8)' : 'rgba(230,80,70,0.85)';
                ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
                p.x = nx; p.y = ny; p.age++;
                if (p.age > 90 || p.x < 0 || p.y < 0 || p.x > w || p.y > h) { p.x = Math.random() * w; p.y = Math.random() * h; p.age = 0; }
            }
        }
        flow.raf = requestAnimationFrame(tick);
    };
    flow.raf = requestAnimationFrame(tick);
}
function stopFlow() {
    flow.on = false; cancelAnimationFrame(flow.raf); flow.raf = 0;
    const c = document.getElementById('flowCanvas'); if (c) { c.getContext('2d').clearRect(0, 0, c.width, c.height); c.style.display = 'none'; }
}

// ---------- legend for the active colour layers ----------
const LEGEND_LABEL = { cloud: ['Skydække', 'Cloud cover'], cape: ['CAPE', 'CAPE'], conv: ['Konvektive skytoppe (est.)', 'Convective cloud tops (est.)'], dust: ['Støv', 'Dust'],
    fog: ['Tåge-sandsynlighed', 'Fog probability'], frz: ['Isslag-sandsynlighed', 'Freezing rain probability'], ptend: ['Trykændring', 'Pressure tendency'],
    t2m: ['Temperatur (2 m)', 'Temperature (2 m)'], vis: ['Sigtbarhed', 'Visibility'] };
function updateWxLegend() {
    let el = document.getElementById('wx-legend');
    if (!el) { el = document.createElement('div'); el.id = 'wx-legend'; document.body.appendChild(el); }
    const da = currentLang === 'da';
    const rows = FIELD_LAYERS.filter(id => liveWeatherState[id]).map(id => {
        const def = FIELD_DEFS[id], lo = def.ramp[0][0], hi = def.ramp[def.ramp.length - 1][0];
        const grad = def.ramp.map(([v, c]) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0.15, c[3] / 255).toFixed(2)}) ${(100 * (v - lo) / (hi - lo)).toFixed(0)}%`).join(',');
        const ticks = def.ticks.map(t => `<span style="left:${wxClamp(100 * (t - lo) / (hi - lo), 0, 100)}%">${t}</span>`).join('');
        return `<div class="lg-row"><div class="lg-name">${LEGEND_LABEL[id][da ? 0 : 1]} <em>${def.unit}</em></div><div class="lg-bar" style="background:linear-gradient(90deg,${grad})"></div><div class="lg-ticks">${ticks}</div></div>`;
    });
    if (liveWeatherState.flow) { const lv = WIND_LEVELS.find(l => l[0] === flow.level); rows.unshift(`<div class="lg-row"><div class="lg-name">${da ? 'Vind' : 'Wind'} · ${lv[1]} <em>kt</em></div><div class="lg-bar" style="background:linear-gradient(90deg,#7c8fa8 0%,#2878c8 20%,#3cbe8c 45%,#f0b428 70%,#e65046 100%)"></div><div class="lg-ticks"><span style="left:0">0</span><span style="left:20%">15</span><span style="left:45%">40</span><span style="left:70%">80</span><span style="left:100%">120+</span></div></div>`); }
    el.innerHTML = rows.join('');
    el.classList.toggle('show', rows.length > 0);
}

// ---- ORCHESTRATION --------------------------------------------------------
let wxBuilt = {};
let wxPopupsBound = false;
async function renderWxLayer(id, force) {
    if (!map || !map.getStyle()) return;
    if (id === 'flow') { if (liveWeatherState.flow) startFlow(); return; }
    const atmoDep = ['jet', 'barbs', 'cat', 'icing', 'mslp'].includes(id) || FIELD_LAYERS.includes(id);
    const fresh = wxBuilt[id] === (atmoDep ? ATMO.version : 1) && map.getLayer(WX_LAYER_GROUPS[id][0]);
    if (fresh && !force) return;
    ATMO.cs = wxClimateState();
    try {
        if (id === 'cyclone') await loadCyclones(force);
        if (id === 'sigmet') await loadSigmetData();
        if (id === 'dust') fetchDust();
        if (FIELD_LAYERS.includes(id)) renderFieldLayer(id);
        else ({ jet: renderJet, barbs: renderBarbs, cat: renderCat, trop: renderTrop, icing: renderIcing, mslp: renderMslp, sat: renderSatellite,
           cyclone: renderCyclone, volcano: renderVolcano, sigmet: renderSigmet })[id]();
        wxBuilt[id] = atmoDep ? ATMO.version : 1;
    } catch (e) { console.warn('Weather layer failed: ' + id, e); }
}
function bringOccToTop() {
    ['layer-occ-rings', 'layer-occ-waypoints', 'layer-occ-airport-hit', 'layer-flight-planned', 'layer-flight-focus-direct', 'layer-flight-focus-planned', 'layer-flight-flown'].forEach(id => { if (map.getLayer(id)) map.moveLayer(id); });
}
function rebuildWxLayers(force) {
    if (!map) return;
    ensureWxIcons();
    WX_LAYER_DEFS.forEach(d => { if (liveWeatherState[d.id]) renderWxLayer(d.id, !!force && wxBuilt[d.id] !== undefined); });
}
function setWxVisibility(id, on) {
    (WX_LAYER_GROUPS[id] || []).forEach(lid => { if (map.getLayer(lid)) map.setLayoutProperty(lid, 'visibility', on ? 'visible' : 'none'); });
    if (id === 'flow') { if (on) startFlow(); else stopFlow(); }
    updateWxLegend();
    if (id === 'cyclone' && !on) clearCycloneMarkers();
}
async function toggleWxLayer(id) {
    liveWeatherState[id] = !liveWeatherState[id];
    syncWxMenuUI();
    if (!map) return;
    if (liveWeatherState[id]) {
        ensureWxIcons();
        await renderWxLayer(id, id === 'cyclone' || id === 'sigmet' ? false : false);
        setWxVisibility(id, true);
        bringOccToTop();
        if (id === 'cyclone' && wxCyclones.data && wxCyclones.data.failed) showToast(currentLang === 'da' ? 'Cyklon-feed ikke tilgængeligt' : 'Cyclone feed unavailable');
        else if (id === 'cyclone' && wxCyclones.data && !wxCyclones.data.centers.length) showToast(currentLang === 'da' ? 'Ingen aktive tropiske cykloner i feedet' : 'No active tropical cyclones in feed');
        if (id === 'sigmet' && wxSigmet.sample) showToast(currentLang === 'da' ? 'SIGMET live-feed utilgængeligt – viser EKSEMPLER' : 'SIGMET live feed unavailable – showing SAMPLE areas');
    } else setWxVisibility(id, false);
    updateWxLegend();
    const def = WX_LAYER_DEFS.find(d => d.id === id);
    showToast(wxName(def) + (liveWeatherState[id] ? (currentLang === 'da' ? ' TIL' : ' ON') : (currentLang === 'da' ? ' FRA' : ' OFF')));
}
function bindWxPopups() {
    if (wxPopupsBound || !map) return;
    wxPopupsBound = true;
    const pop = (layer, html) => {
        map.on('click', layer, (e) => {
            const f = e.features && e.features[0]; if (!f) return;
            new maplibregl.Popup({ closeButton: true, maxWidth: '260px' }).setLngLat(e.lngLat).setHTML(html(f.properties)).addTo(map);
        });
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
    };
    pop('wx-volc', p => '<b>' + p.name + '</b><br>' + p.country + '<br>VAAC ' + p.vaac + '<br><small>Reference list – check VAAC advisories for current status</small>');
    pop('wx-sigmet-fill', p => '<b>' + (p.hazard || 'SIGMET') + '</b><br>FIR ' + (p.fir || ''));
}
// ---- MENU UI ----
function initWxMenu() {
    const list = document.getElementById('wxMenuList');
    if (!list) return;
    let last = null;
    list.innerHTML = WX_LAYER_DEFS.map(d => {
        const head = d.grp !== last ? '<div class="wx-grp" data-grp="' + d.grp + '"></div>' : ''; last = d.grp;
        const lvl = d.id === 'flow' ? '<div class="wx-level" id="wxFlowLevel">' + WIND_LEVELS.map(l => '<button type="button" data-lv="' + l[0] + '" onclick="setFlowLevel(\'' + l[0] + '\')">' + l[1] + '</button>').join('') + '</div>' : '';
        return head + '<div class="wx-row" data-wx="' + d.id + '"><span class="material-icons-outlined wx-row-icon">' + d.icon + '</span>' +
            '<span class="wx-row-name"></span><label class="switch"><input type="checkbox" onchange="toggleWxLayer(\'' + d.id + '\')"><span class="slider"></span></label></div>' + lvl;
    }).join('');
    syncWxMenuUI(); setWxStatus();
}
function syncWxMenuUI() {
    document.querySelectorAll('#wxMenuList .wx-row').forEach(row => {
        const def = WX_LAYER_DEFS.find(d => d.id === row.getAttribute('data-wx'));
        row.querySelector('.wx-row-name').innerText = wxName(def);
        row.querySelector('input').checked = !!liveWeatherState[def.id];
        row.classList.toggle('on', !!liveWeatherState[def.id]);
    });
    document.querySelectorAll('#wxMenuList .wx-grp').forEach(g => { g.textContent = WX_GROUP_NAMES[g.dataset.grp][currentLang === 'da' ? 0 : 1]; });
    const lv = document.getElementById('wxFlowLevel');
    if (lv) { lv.classList.toggle('show', !!liveWeatherState.flow); lv.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.lv === flow.level)); }
}
function toggleWxMenu(force) {
    const m = document.getElementById('wx-menu'), b = document.getElementById('btn-wx-menu');
    const open = force !== undefined ? force : !m.classList.contains('open');
    m.classList.toggle('open', open); b.classList.toggle('active', open);
}
document.addEventListener('mousedown', (e) => {
    const m = document.getElementById('wx-menu');
    if (m && m.classList.contains('open') && !m.contains(e.target) && !e.target.closest('#btn-wx-menu')) toggleWxMenu(false);
});
