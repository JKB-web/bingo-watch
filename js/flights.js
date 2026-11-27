// Bingo Watch – flights.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// Beregner den præcise skærm-vinkel langs selve Mercator-ruten lige foran flyet, så næsen altid peger 100% langs stregen
function computeTangentHeadingDeg(p) {
    if (!p.route) return p.headingDeg || 0;
    const nm = Math.min(p.route.total - 0.5, Math.max(0, p.flownDistNm));
    const [lon1, lat1] = routePosAt(p.route, nm);
    const [lon2, lat2] = routePosAt(p.route, Math.min(p.route.total, nm + 2.5));
    if (map && typeof map.project === 'function') {
        const pt1 = map.project([lon1, lat1]), pt2 = map.project([lon2, lat2]);
        const dx = pt2.x - pt1.x, dy = pt2.y - pt1.y;
        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) return ((Math.atan2(dx, -dy) * 180 / Math.PI) + 360) % 360;
    }
    return gBearing(lat1, lon1, lat2, lon2);
}
function setPlaneRotation(p, deg) {
    if (Math.abs(angDiff(deg, p._rotShown == null ? 999 : p._rotShown)) < 0.15) return;   // skip invisible changes
    p._rotShown = deg;
    if (!p.rot) p.rot = p.el && p.el.querySelector('.plane-rotator');
    if (p.rot) p.rot.style.transform = `rotate(${deg.toFixed(1)}deg)`;
}

function updateAllPlaneScreenHeadings() {
    Object.values(activePlaneMarkers).forEach(p => {
        if (!p.el) return;
        const headingDeg = computeTangentHeadingDeg(p);
        p.headingDeg = headingDeg;
        setPlaneRotation(p, headingDeg);
    });
}

// Geografisk distance i Nautical Miles (NM) mellem to koordinater (Haversine)
function calcDistanceNm(lat1, lon1, lat2, lon2) {
    const R_NM = 3440.065;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.max(25, Math.round(R_NM * c));
}

// Konstant ground speed for ALLE fly (460 KT) + silkeblød 60 FPS fremdrift i NM pr. sekund
const CONSTANT_GROUND_SPEED_KT = 460;
const CONSTANT_NM_PER_SECOND = 5.5; // Identisk med 1.65 NM pr. 300ms, men opdateres nu silkeblødt 60 gange i sekundet

// Vælger et tilfældigt par af lufthavne (DEP -> DEST) fra AIRPORT_DB
function pickRandomRoutePair(num) {
    const depIdx = Math.floor(Math.random() * AIRPORT_DB.length);
    const depAirport = AIRPORT_DB[depIdx];
    const possibleDests = AIRPORT_DB.filter(a => a.code !== depAirport.code);
    const destAirport = possibleDests[Math.floor(Math.random() * possibleDests.length)];
    return { depAirport, destAirport };
}

// ---------- aircraft types (own icon set, chosen from the route length; stable per flight via the route seed) ----------
const AC_CATS = {
    prop:  { da: 'To-motorers turboprop', en: 'Twin turboprop', size: 18, types: [['AT76', 'ATR 72-600'], ['DH8D', 'Dash 8-400'], ['AT45', 'ATR 42-500']], fl: [190, 250], spd: 280,
             svg: '<path d="M12 2.2c.8 0 1.3.8 1.3 1.8v5.6l8.9 1.2v1.9l-8.9-.4v5.6l2.6 1.6v1.5L12 20.3l-3.9.7v-1.5l2.6-1.6v-5.6l-8.9.4v-1.9l8.9-1.2V4c0-1 .5-1.8 1.3-1.8z"/><rect x="5.2" y="8" width="1.6" height="4.4" rx=".8"/><rect x="17.2" y="8" width="1.6" height="4.4" rx=".8"/><rect x="3.4" y="7.8" width="5.2" height=".9" rx=".45"/><rect x="15.4" y="7.8" width="5.2" height=".9" rx=".45"/>' },
    rj:    { da: 'Regionaljet (motorer bagpå)', en: 'Regional jet (rear engines)', size: 18, types: [['E190', 'Embraer 190'], ['CRJ9', 'CRJ-900'], ['E75L', 'Embraer 175']], fl: [300, 360], spd: 440,
             svg: '<path d="M12 1.8c.8 0 1.3.8 1.3 1.9v6.1l8.4 3.4v1.8l-8.4-2v4.2l2.7 2v1.5L12 20l-4 .7v-1.5l2.7-2v-4.2l-8.4 2v-1.8l8.4-3.4V3.7c0-1.1.5-1.9 1.3-1.9z"/><rect x="8.2" y="13.6" width="1.6" height="3.4" rx=".8"/><rect x="14.2" y="13.6" width="1.6" height="3.4" rx=".8"/>' },
    biz:   { da: 'Forretningsjet', en: 'Business jet', size: 16, types: [['GLEX', 'Global Express'], ['GLF6', 'Gulfstream G650'], ['C68A', 'Citation Latitude']], fl: [410, 450], spd: 470,
             svg: '<path d="M12 2.4c.7 0 1.1.7 1.1 1.7v6.4l7.6 4.3v1.6l-7.6-2.4v3.7l2.4 1.9v1.3L12 20.3l-3.5.6v-1.3l2.4-1.9v-3.7l-7.6 2.4v-1.6l7.6-4.3V4.1c0-1 .4-1.7 1.1-1.7z"/><rect x="8.6" y="13.2" width="1.4" height="3" rx=".7"/><rect x="14" y="13.2" width="1.4" height="3" rx=".7"/>' },
    narrow:{ da: 'To-motorers mellemjet', en: 'Twin engine medium jet', size: 19, types: [['A320', 'Airbus A320'], ['A20N', 'Airbus A320neo'], ['B738', 'Boeing 737-800'], ['B38M', 'Boeing 737 MAX 8'], ['A321', 'Airbus A321']], fl: [330, 380], spd: 460,
             svg: '<path d="M12 1.5c.9 0 1.4.9 1.4 2v5.7l9.2 5.4v1.8l-9.2-2.9v5l2.8 2.1v1.5L12 21.2l-4.2.9v-1.5l2.8-2.1v-5l-9.2 2.9v-1.8l9.2-5.4V3.5c0-1.1.5-2 1.4-2z"/><ellipse cx="7.3" cy="11.9" rx=".95" ry="1.7"/><ellipse cx="16.7" cy="11.9" rx=".95" ry="1.7"/>' },
    wide:  { da: 'To-motorers tungt fly', en: 'Twin engine heavy jet', size: 22, types: [['B789', 'Boeing 787-9'], ['A359', 'Airbus A350-900'], ['B77W', 'Boeing 777-300ER'], ['A333', 'Airbus A330-300']], fl: [350, 410], spd: 485,
             svg: '<path d="M12 .9c1 0 1.6 1 1.6 2.3v6l9.6 6v2l-9.6-3.2v5.2l3 2.2v1.6L12 22.1l-4.6.9v-1.6l3-2.2V14l-9.6 3.2v-2l9.6-6v-6C10.4 1.9 11 .9 12 .9z"/><ellipse cx="6.6" cy="12.7" rx="1.25" ry="2.1"/><ellipse cx="17.4" cy="12.7" rx="1.25" ry="2.1"/>' },
    quad:  { da: 'Fire-motorers tungt fly', en: 'Four engine heavy jet', size: 23, types: [['A388', 'Airbus A380-800'], ['B748', 'Boeing 747-8'], ['B744', 'Boeing 747-400']], fl: [340, 390], spd: 490,
             svg: '<path d="M12 .8c1.1 0 1.7 1.1 1.7 2.4v6l9.6 6.1v2l-9.6-3.3v5.2l3 2.2v1.6L12 22.2l-4.7.9v-1.6l3-2.2V14L.7 17.3v-2l9.6-6.1v-6C10.3 1.9 10.9.8 12 .8z"/><ellipse cx="7.6" cy="12" rx="1" ry="1.8"/><ellipse cx="16.4" cy="12" rx="1" ry="1.8"/><ellipse cx="4.4" cy="14" rx="1" ry="1.7"/><ellipse cx="19.6" cy="14" rx="1" ry="1.7"/>' }
};
function pickAircraft(distNm, seed) {
    const r = mulberry32((seed >>> 0) ^ 0x5bd1e995), x = r();
    let cat;
    if (distNm < 330) cat = x < 0.6 ? 'prop' : x < 0.92 ? 'rj' : 'biz';
    else if (distNm < 1500) cat = x < 0.72 ? 'narrow' : x < 0.9 ? 'rj' : 'biz';
    else if (distNm < 3800) cat = x < 0.45 ? 'narrow' : x < 0.93 ? 'wide' : 'biz';
    else cat = x < 0.72 ? 'wide' : x < 0.95 ? 'quad' : 'biz';
    const c = AC_CATS[cat], t = c.types[Math.floor(r() * c.types.length)];
    const fl = Math.round((c.fl[0] + r() * (c.fl[1] - c.fl[0])) / 10) * 10;
    return { cat, code: t[0], name: t[1], fl };
}
function createFlightData(num, preset) {
    let depAirport, destAirport;
    if (preset) { depAirport = AIRPORT_DB.find(a => a.code === preset.dep); destAirport = AIRPORT_DB.find(a => a.code === preset.dest); }
    if (!depAirport || !destAirport) ({ depAirport, destAirport } = pickRandomRoutePair(num));
    const routeSeed = preset && preset.seed != null ? preset.seed : Math.floor(Math.random() * 2 ** 31);
    // Starter præcis på afgangslufthavnen så linjen og flyet udgår fra selve lufthavnspunktet
    const startLat = depAirport.lat;
    const startLon = depAirport.lon;

    const route = buildRealisticRoute(depAirport, destAirport, routeSeed);
    const totalDistNm = Math.max(25, Math.round(route.total));
    let ac = pickAircraft(gHav(depAirport.lat, depAirport.lon, destAirport.lat, destAirport.lon), routeSeed);
    if (typeof maybeFreighter === 'function') ac = maybeFreighter(ac, routeSeed);   // some big aircraft are freighters
    const fl = Math.min(ac.fl, flightProfile({ totalDistNm, fl: ac.fl }).peak / 100 || ac.fl);   // short hops cruise lower
    const spd = AC_CATS[ac.cat].spd;                       // ground speed depends on the aircraft type

    const now = preset && preset.stdMs ? new Date(preset.stdMs) : new Date();
    const formatTime = (date) => date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const std = formatTime(now);
    const flightDurationMin = Math.max(15, Math.round((totalDistNm / spd) * 60));
    const eta = formatTime(new Date(now.getTime() + flightDurationMin * 60000));

    const flightObj = {
        num,
        flightNo: `BNGO${num}`,
        depAirport,
        destAirport,
        startLat,
        startLon,
        lat: startLat,
        lon: startLon,
        destLat: destAirport.lat,
        destLon: destAirport.lon,
        totalDistNm,
        flownDistNm: 0,
        fl,
        spd,
        headingDeg: 0,
        std,
        eta,
        landed: false,
        stdMs: now.getTime(),
        durMin: flightDurationMin,
        route,
        routeSeed,
        ac,
        nmps: CONSTANT_NM_PER_SECOND * spd / CONSTANT_GROUND_SPEED_KT,   // game speed scaled by the type's real speed
        reg: preset && preset.reg ? preset.reg : makeRegistration(depAirport.code),
        squawk: preset && preset.squawk ? preset.squawk : makeSquawk()
    };
    flightObj.headingDeg = computeTangentHeadingDeg(flightObj);
    return flightObj;
}

function addRadarPlane(flight) {
    if (!map || !flight) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'radar-plane';
    wrapper.id = 'plane-obj-' + flight.num;
    wrapper.innerHTML = `
        <div class="plane-rotator" style="transform: rotate(${flight.headingDeg.toFixed(2)}deg)">
            <svg class="plane-icon ac-${flight.ac ? flight.ac.cat : 'narrow'}" viewBox="0 0 24 24" style="--ac-size:${flight.ac ? AC_CATS[flight.ac.cat].size : 19}px">${flight.ac ? AC_CATS[flight.ac.cat].svg : AC_CATS.narrow.svg}</svg>
        </div>
        <div class="plane-info-box">${flight.flightNo} ${flight.ac ? flight.ac.code : ''} FL${flight.fl}</div>
    `;

    // anchor: 'center' + centreret .plane-rotator sikrer, at flyets midte ligger 100% oven på linjen
    const marker = new maplibregl.Marker({ element: wrapper, anchor: 'center', subpixelPositioning: true })   // no pixel snapping = no shaking
        .setLngLat([flight.startLon, flight.startLat])
        .addTo(map);

    // Klik på flyet på kortet -> fremhæv det i Active Flights (og følg det med kameraet)
    wrapper.addEventListener('mousedown', (e) => e.stopPropagation());
    wrapper.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    wrapper.addEventListener('click', (e) => { e.stopPropagation(); focusFlightInLog(flight.num); });

    flight.marker = marker;
    flight.el = wrapper;
    activePlaneMarkers[flight.num] = flight;

    updateFlightRoutesLayer();
}

// Opdaterer Active Flights-rækken og detaljekortet når et fly flyver eller lander
function syncFlightRowUI(p) {
    const row = document.getElementById('log-entry-' + p.num);
    const detailRow = document.getElementById('log-detail-' + p.num);
    const progressPct = p.totalDistNm > 0 ? Math.min(100, Math.max(0, Math.round((p.flownDistNm / p.totalDistNm) * 100))) : 100;
    const remainNm = p.landed ? 0 : Math.max(0, Math.round(p.totalDistNm - p.flownDistNm));

    const rowFill = row && row.querySelector('.row-progress-fill');
    if (rowFill) {
        rowFill.style.width = `${p.landed ? 100 : progressPct}%`;
        if (p.landed) rowFill.style.background = '#64748b';
    }

    if (row && p.landed && !row.classList.contains('landed-row')) {
        row.classList.add('landed-row');
        const etaCell = row.querySelector('.eta-cell');
        if (etaCell) etaCell.innerHTML = `<span class="status-pill landed">${translations[currentLang].stLanded}</span>`;
    }

    // Opdater kun DOM i detaljekortet hvis det er åbent eller netop landet
    if (detailRow && (detailRow.classList.contains('open') || p.landed)) {
        const statusEl = detailRow.querySelector('.detail-status');
        const remEl = detailRow.querySelector('.detail-rem');
        const hdgEl = detailRow.querySelector('.detail-hdg');
        const gsEl = detailRow.querySelector('.detail-gs');
        const progEl = detailRow.querySelector('.flight-progress-fill');

        if (statusEl) {
            statusEl.className = 'status-pill ' + (p.landed ? 'landed' : 'enroute') + ' detail-status';
            statusEl.innerText = p.landed ? translations[currentLang].stLanded : translations[currentLang].stInFlight;
        }
        if (remEl) remEl.innerText = `${remainNm} / ${p.totalDistNm} NM (${progressPct}%)`;
        if (hdgEl) hdgEl.innerText = `${String(Math.round(p.headingDeg)).padStart(3, '0')}°`;
        if (gsEl) gsEl.innerText = p.landed ? `0 KT (FL000)` : `${p.spd} KT (FL${p.fl})`;
        if (progEl) {
            progEl.style.width = `${progressPct}%`;
            if (p.landed) progEl.style.background = '#64748b';
        }
    }
}

// Klik på et fly i Active Flights: Luk alle andre kort først (kun ét åbent ad gangen) + panorer til flyet på kortet
let focusedFlightNum = null;
// Klik på et fly (i listen eller på kortet): vælg det. Klik igen på det valgte fly: fravælg.
function selectFlightFromLog(num) {
    const p = activePlaneMarkers[num];
    if (focusedFlightNum === num) { clearFlightSelection(); return; }
    const row = document.getElementById('log-entry-' + num);
    const detailRow = document.getElementById('log-detail-' + num);
    document.querySelectorAll('#flightLogTableBody tr.flight-detail-row.open').forEach(r => r.classList.remove('open'));
    document.querySelectorAll('#flightLogTableBody tr.flight-row.expanded').forEach(r => r.classList.remove('expanded'));
    if (detailRow && row) { detailRow.classList.add('open'); row.classList.add('expanded'); }
    if (!p || !map) return;
    syncFlightRowUI(p);
    releaseTracking(true);
    document.querySelectorAll('.radar-plane.selected-plane').forEach(el => el.classList.remove('selected-plane'));
    if (p.el) p.el.classList.add('selected-plane');
    openFlightFocus(num);
    map.resize();                                  // the map area just got narrower: measure it BEFORE flying
    flyToAircraft(p, Math.max(map.getZoom(), isGlobeMode ? 3.2 : 5.2), 1100, () => {
        if (!p.landed && focusedFlightNum === p.num) { trackedFlightNum = p.num; updateTrackPill(); }
    });
}

// Åbner Active Flights, rydder evt. søgefilter, vælger flyet og scroller til det
function focusFlightInLog(num) {
    if (focusedFlightNum === num) { clearFlightSelection(); return; }
    // the Active Flights window is NOT opened if it is closed – the flight panel shows the details
    const win = document.getElementById('panel-log');
    const logOpen = !!win && win.style.display !== 'none' && !isMobileUI();
    const row = document.getElementById('log-entry-' + num);
    if (row && row.style.display === 'none') {
        const search = document.querySelector('#panel-log .log-search-input');
        if (search) search.value = '';
        filterLog('');
    }
    selectFlightFromLog(num);
    if (row && logOpen) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Fravælg: fold kortet sammen, luk detaljepanelet, slip kameraet og zoom ud til standardvisningen
function clearFlightSelection() {
    const hadSelection = focusedFlightNum !== null || !!document.querySelector('#flightLogTableBody tr.flight-detail-row.open');
    document.querySelectorAll('#flightLogTableBody tr.flight-detail-row.open').forEach(r => r.classList.remove('open'));
    document.querySelectorAll('#flightLogTableBody tr.flight-row.expanded').forEach(r => r.classList.remove('expanded'));
    document.querySelectorAll('.radar-plane.selected-plane').forEach(el => el.classList.remove('selected-plane'));
    releaseTracking(true);
    closeFlightFocus();
    if (hadSelection) zoomToDefaultView();
}
// Fly to where the aircraft WILL be when the animation ends, then hand over to frame-by-frame following.
function flyToAircraft(p, zoom, duration, done) {
    const lead = p.landed || !p.route ? 0 : (p.nmps || CONSTANT_NM_PER_SECOND) * duration / 1000;
    const target = p.route ? routePosAt(p.route, Math.min(p.route.total, p.flownDistNm + lead)) : [p.lon, p.lat];
    map.stop();
    const started = Date.now();
    map.flyTo({ center: target, zoom, duration, essential: true, padding: focusPadding() });
    if (done) map.once('moveend', () => { if ((window._mapGrabAt || 0) < started) done(); });
}
// phones: start further out, so routes and weather around the airport are actually in view
function defaultMapZoom() { return isMobileUI() ? 2.6 : 4.5; }
// free map area when the flight panel / profile is open: centre the aircraft there, not behind a panel
function focusPadding() {
    const none = { top: 0, bottom: 0, left: 0, right: 0 };
    if (!document.body.classList.contains('flight-focus-open')) return none;
    const mapR = document.getElementById('realMap').getBoundingClientRect();
    const pad = { ...none };
    const ff = document.getElementById('flight-focus').getBoundingClientRect();
    const prof = document.getElementById('flight-profile');
    if (isMobileUI()) {
        if (ff.left > mapR.left + mapR.width * 0.4) pad.right = Math.max(0, mapR.right - ff.left + 8);   // side panel (landscape)
        else pad.bottom = Math.max(0, mapR.bottom - ff.top + 8);                                          // bottom sheet (portrait)
    } else if (prof && getComputedStyle(prof).display !== 'none') {
        pad.bottom = Math.max(0, mapR.bottom - prof.getBoundingClientRect().top + 8);
    }
    pad.top = 8;
    return pad;
}
function applyFocusPadding(animate) {
    if (!map) return;
    const pad = focusPadding();
    if (animate) map.easeTo({ padding: pad, duration: 300 }); else map.setPadding(pad);
}
window.addEventListener('resize', () => { if (focusedFlightNum !== null) setTimeout(() => applyFocusPadding(false), 50); });
function zoomToDefaultView() {
    if (!map) return;
    map.resize();
    map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
    if (isGlobeMode) map.flyTo({ center: [currentLon, 35], zoom: 2.1, pitch: 0, bearing: 0, duration: 1200 });
    else map.flyTo({ center: [currentLon, currentLat], zoom: defaultMapZoom(), pitch: 0, bearing: 0, duration: 1200 });
}

// ---------------- FLIGHT DETAIL PANEL + VERTICAL PROFILE ----------------
const L = (da, en) => currentLang === 'da' ? da : en;
function makeRegistration(icao) {
    const pre = { EK: 'OY-', ED: 'D-A', EG: 'G-', EI: 'EI-', LF: 'F-H', ES: 'SE-', EN: 'LN-', EF: 'OH-', EH: 'PH-', EB: 'OO-', LS: 'HB-J', LO: 'OE-L', LE: 'EC-', LP: 'CS-T',
                  LI: 'I-', LG: 'SX-', LT: 'TC-', EP: 'SP-', LK: 'OK-', LH: 'HA-', BI: 'TF-', OM: 'A6-', OT: 'A7-', LL: '4X-', RJ: 'JA', VH: 'B-', YS: 'VH-', YM: 'VH-', NZ: 'ZK-',
                  CY: 'C-F', SB: 'PR-', MM: 'XA-', FA: 'ZS-', WS: '9V-', VT: 'HS-', RK: 'HL', ZB: 'B-', ZS: 'B-', VI: 'VT-', VA: 'VT-' };
    const p2 = icao.slice(0, 2), p1 = icao[0];
    const prefix = pre[p2] || (p1 === 'K' ? 'N' : '9H-');
    const A = 'ABCDEFGHJKLMNPRSTUVWXYZ';
    if (prefix === 'N') return 'N' + (100 + Math.floor(Math.random() * 899)) + A[Math.floor(Math.random() * A.length)] + A[Math.floor(Math.random() * A.length)];
    let r = prefix; const n = Math.max(2, 6 - prefix.length);
    for (let i = 0; i < n; i++) r += A[Math.floor(Math.random() * A.length)];
    return r;
}
function makeSquawk() {
    let s; do { s = Array.from({ length: 4 }, () => Math.floor(Math.random() * 8)).join(''); } while (/^(7500|7600|7700|0000|1200|2000)$/.test(s));
    return s;
}
function nearestAlternates(p) {
    if (p._alts) return p._alts;
    const d = p.destAirport;
    p._alts = AIRPORT_DB.filter(a => a.code !== d.code && a.code !== p.depAirport.code)
        .map(a => ({ a, nm: calcDistanceNm(d.lat, d.lon, a.lat, a.lon) }))
        .sort((x, y) => x.nm - y.nm).slice(0, 2).map(x => x.a.code);
    return p._alts;
}
// Simple climb / cruise / descent model along the route distance
function flightProfile(p) {
    if (p._prof) return p._prof;
    const D = p.totalDistNm, cruise = p.fl * 100;
    let climb = cruise / 2200 / 60 * 330, desc = cruise / 1000 * 3, peak = cruise;
    if (climb + desc > D * 0.9) { const k = (D * 0.9) / (climb + desc); climb *= k; desc *= k; peak = Math.round(cruise * k / 100) * 100; }
    return (p._prof = { D, climb, desc, peak });
}
function altAtNm(p, nm) {
    const pr = flightProfile(p);
    if (p.divert && nm >= p.divert.atNm) {               // diverted: keep the height of the turn, then descend into the alternate
        const a0 = p.divert.alt0, D = pr.D;
        if (nm >= D) return 0;
        const start = Math.max(p.divert.atNm, D - Math.max(1, a0 / 1000 * 3));
        if (nm < start) return a0;
        const x = (D - nm) / Math.max(1e-6, D - start);
        return a0 * (x * (2 - x)) * 0.85 + a0 * 0.15 * x;
    }
    if (nm <= 0 || nm >= pr.D) return 0;
    if (nm < pr.climb) { const x = nm / pr.climb; return pr.peak * (1 - (1 - x) * (1 - x)); }
    if (nm > pr.D - pr.desc) { const x = (pr.D - nm) / pr.desc; return pr.peak * (x * (2 - x)) * 0.85 + pr.peak * 0.15 * x; }
    return pr.peak;
}
function liveState(p) {
    const nm = p.landed ? p.totalDistNm : p.flownDistNm;
    const prog = p.totalDistNm ? nm / p.totalDistNm : 1;
    const alt = p.landed ? 0 : Math.round(altAtNm(p, nm) / 25) * 25;
    const dAlt = altAtNm(p, Math.min(p.totalDistNm, nm + 0.5)) - altAtNm(p, Math.max(0, nm - 0.5));
    const vs = p.landed ? 0 : Math.round((dAlt * p.spd / 60) / 50) * 50;
    const simMs = (p.stdMs || Date.now()) + prog * (p.durMin || 60) * 60000;
    const remain = Math.max(0, p.totalDistNm - nm);
    const fuelKg = p.landed ? null : Math.round(((remain / p.spd) * 2500 + 2200) / 100) * 100;
    return { nm, prog, alt, vs, simMs, remain, fuelKg };
}
const hhmm = ms => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const fmtFt = ft => ft.toLocaleString('en-US').replace(/,/g, ' ') + ' ft';

function openFlightFocus(num) {
    const p = activePlaneMarkers[num];
    if (!p) return;
    focusedFlightNum = num;
    const panel = document.getElementById('flight-focus');
    dockFabsInPanel(false);
    const alts = nearestAlternates(p);
    const etaMs = p.stdMs + p.durMin * 60000;
    const chip = code => `<span class="ff-chip"><span class="ff-dot"></span>${code}</span>`;
    // airports: tap to open the airport card; alternates: tap to divert the aircraft there (via ACARS)
    const apBtn = code => `<button type="button" class="ff-chip ff-ap" onclick="event.stopPropagation(); openAirportCard('${code}')" title="${L('Vis lufthavn', 'Show airport')}"><span class="ff-dot"></span>${code}</button>`;
    const altBtn = code => p.landed ? apBtn(code) : `<span class="ff-alt"><button type="button" class="ff-chip ff-ap" onclick="event.stopPropagation(); openAirportCard('${code}')" title="${L('Vis lufthavn', 'Show airport')}"><span class="ff-dot"></span>${code}</button>` +
        `<button type="button" class="ff-divert" onclick="event.stopPropagation(); askDivert(${p.num}, '${code}')" title="${L('Omdirigér hertil (ACARS)', 'Divert here (ACARS)')}"><span class="material-icons-outlined">alt_route</span>${L('Omdirigér', 'Divert')}</button></span>`;
    const item = (label, val, key, cls) => `<div class="ff-item"><span class="ff-label">${label}</span><span class="ff-val ${cls || ''}" ${key ? `data-ff="${key}"` : ''}>${val}</span></div>`;
    panel.innerHTML = `
        <div class="ff-card ff-head" onclick="toggleFlightFocusExpand()">
            <div class="ff-row"><span class="ff-route"><span class="material-icons-outlined">flight</span>${p.depAirport.code} – ${p.destAirport.code}</span><span class="ff-strong" data-ff="altHead">–</span></div>
            <div class="ff-row ff-sub"><span>${p.flightNo} / ${p.reg} / ${p.std}</span><span><span data-ff="atdHead">${p.std}</span> / <span class="ff-accent">${hhmm(etaMs)}</span></span></div>
            <div class="ff-progress"><div class="ff-progress-fill" data-ff="prog"></div></div>
        </div>
        <div class="ff-gadss" data-ff="gadss"></div>
        <div class="ff-acars" data-ff="acars">${typeof acarsBox === 'function' ? acarsBox(p) : ''}</div>
        <div class="ff-assist" data-ff="assist"></div>
        <div class="ff-scroll">
            <div class="ff-card">
                <div class="ff-title">${L('Flyvning', 'Flight')}</div>
                <div class="ff-grid">
                    ${item('ATC ID', p.flightNo)}${item(L('Registrering', 'Registration'), p.reg)}
                    ${p.ac ? `<div class="ff-item ff-span"><span class="ff-label">${L('Flytype', 'Aircraft type')}</span><span class="ff-val ff-actype"><svg viewBox="0 0 24 24">${AC_CATS[p.ac.cat].svg}</svg>${p.ac.code} · ${p.ac.name}<small>${L(AC_CATS[p.ac.cat].da, AC_CATS[p.ac.cat].en)}${p.ac.cargo ? L(' · fragtfly', ' · freighter') : ''}</small></span></div>` : ''}
                    ${item(L('Dato', 'Date'), new Date(p.stdMs).toISOString().slice(0, 10))}${item('STD', p.std)}
                    ${item('DEP', apBtn(p.depAirport.code))}${item('DEST' + (p.divert ? ' ↪' : ''), apBtn(p.destAirport.code))}
                    ${item('ALT1', alts[0] ? altBtn(alts[0]) : '–')}${item('ALT2', alts[1] ? altBtn(alts[1]) : '–')}
                    <div class="ff-item ff-span"><span class="ff-label">${L('Rute', 'Route')}</span><span class="ff-val">${p.depAirport.name} → ${p.destAirport.name} · ${p.totalDistNm} NM${p.divert ? ` <em class="ff-diverted">${L('omdirigeret fra', 'diverted from')} ${p.divert.from}</em>` : ''}</span></div>
                </div>
            </div>
            ${typeof payloadCardHtml === 'function' ? payloadCardHtml(p) : ''}
            <div class="ff-card">
                <div class="ff-title">Live <span class="ff-status" data-ff="status"></span></div>
                <div class="ff-grid">
                    ${item(L('Afgang (ATD)', 'Takeoff (ATD)'), p.std)}${item(L('Landing (ETA)', 'Landing (ETA)'), hhmm(etaMs), '', 'ff-accent')}
                    ${item(L('Højde', 'Altitude'), '–', 'alt')}${item(L('Vertikal hast.', 'Vertical speed'), '–', 'vs')}
                    ${item(L('Kurs', 'Track'), '–', 'trk')}${item(L('Hastighed', 'Speed'), '–', 'spd')}
                    ${item(L('Brændstof (est.)', 'Fuel (est.)'), '–', 'fuel')}${item('Squawk', p.squawk)}
                    ${item(L('Sim-tid', 'Sim time'), '–', 'ltt')}${item(L('Tilbage', 'Remaining'), '–', 'rem')}
                    ${item('Lat', '–', 'lat')}${item('Lon', '–', 'lon')}
                </div>
            </div>
        </div>
        <div class="ff-actions">
            <button class="ff-btn ff-more" onclick="toggleFlightFocusExpand()"><span class="material-icons-outlined">expand_less</span><span>${L('Detaljer', 'Details')}</span></button>
            <button class="ff-btn" onclick="clearFlightSelection()">${L('Luk', 'Close')}</button>
            <button class="ff-btn ff-primary" data-ff="followBtn" onclick="toggleFollowFocused()">${L('Følg fly', 'Follow aircraft')}</button>
        </div>`;
    document.body.classList.add('flight-focus-open');
    if (isMobileUI() && !panel.dataset.keep) panel.classList.remove('expanded');   // phones start with the compact card
    dockFabsInPanel(true);
    pushWindowsForFocus(true);
    panel.classList.add('open');
    document.getElementById('flight-profile').classList.add('open');
    setFocusRouteFilter();
    renderProfileChart(p);
    updateFlightFocus();
}
function toggleFlightFocusExpand() {
    if (!isMobileUI()) return;
    const panel = document.getElementById('flight-focus');
    panel.classList.toggle('expanded');
    setTimeout(() => applyFocusPadding(true), 260);
}
function closeFlightFocus() {
    focusedFlightNum = null;
    if (map && typeof map.setPadding === 'function') map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
    if (document.body.classList.contains('flight-focus-open')) pushWindowsForFocus(false);
    dockFabsInPanel(false);
    document.body.classList.remove('flight-focus-open');
    const panel = document.getElementById('flight-focus'), prof = document.getElementById('flight-profile');
    if (panel) panel.classList.remove('open');
    if (prof) prof.classList.remove('open');
    setFocusRouteFilter();
}
// Like expanding the side menu: the content area shrinks, so the map and every window move clear of the panel.
// Windows that would end up under the panel or the profile chart are slid in (and slid back on close).
function pushWindowsForFocus(open) {
    if (isMobileUI()) return;
    document.body.classList.add('pushing');
    clearTimeout(pushWindowsForFocus._t);
    pushWindowsForFocus._t = setTimeout(() => { document.body.classList.remove('pushing'); if (map) map.resize(); }, 420);
    const cw = document.querySelector('.content-wrapper');
    const wins = [...document.querySelectorAll('.content-wrapper > .window')];
    if (!open) {
        wins.forEach(w => {
            if (!w.dataset.pushed) return;
            const o = JSON.parse(w.dataset.pushed);
            w.style.left = o.left; w.style.top = o.top; w.style.height = o.height; w.style.width = o.width;
            w.classList.remove('push-hidden');
            delete w.dataset.pushed;
        });
        return;
    }
    requestAnimationFrame(() => {
        const cr = cw.getBoundingClientRect();
        // windows must clear the flight panel AND the toolbar / round buttons that slide in next to it, and the profile chart
        const railW = document.querySelector('.ops-right-toolbar').offsetWidth || 44;
        const maxR = (window.innerWidth - cr.left) - (322 + railW + 10), maxB = cr.height - 196;    // final size (the width is still animating)
        const MIN_W = 300, MIN_H = 180, floor10 = v => Math.floor(v / 10) * 10;
        const vis = wins.filter(w => w.style.display !== 'none' && !w.dataset.pushed);
        const fits = w => w.offsetLeft + w.offsetWidth <= maxR && w.offsetTop + w.offsetHeight <= maxB;
        // windows that already fit stay exactly where they are; the others are placed around them
        const placed = vis.filter(fits).map(w => ({ l: w.offsetLeft, t: w.offsetTop, r: w.offsetLeft + w.offsetWidth, b: w.offsetTop + w.offsetHeight }));
        const hits = (r) => placed.some(p => r.l < p.r && p.l < r.r && r.t < p.b && p.t < r.b);
        vis.filter(w => !fits(w)).sort((a, b) => a.offsetLeft - b.offsetLeft).forEach(w => {
            const x = w.offsetLeft, y = w.offsetTop, ww = w.offsetWidth, hh = w.offsetHeight;
            const xs = x + ww <= maxR ? [[x, ww]] : [[floor10(maxR - ww), ww], [x, Math.max(MIN_W, floor10(maxR - x))], [floor10(maxR - MIN_W), MIN_W]];
            const ys = y + hh <= maxB ? [[y, hh]] : [[floor10(maxB - hh), hh], [y, Math.max(MIN_H, floor10(maxB - y))], [floor10(maxB - MIN_H), MIN_H]];
            w.dataset.pushed = JSON.stringify({ left: w.style.left, top: w.style.top, height: w.style.height, width: w.style.width });
            let best = null;
            for (const [cx, cw] of xs) { for (const [cy, ch] of ys) {
                const r = { l: cx, t: cy, r: cx + cw, b: cy + ch };
                if (cx >= 10 && cy >= 10 && cw >= MIN_W && ch >= MIN_H && r.r <= maxR + 1 && r.b <= maxB + 1 && !hits(r)) { best = { x: cx, y: cy, w: cw, h: ch, r }; break; }
            } if (best) break; }
            if (!best) { w.classList.add('push-hidden'); return; }   // no room without covering something: tuck it away until the panel closes
            w.style.left = best.x + 'px'; w.style.top = best.y + 'px'; w.style.width = best.w + 'px'; w.style.height = best.h + 'px';
            placed.push(best.r);
        });
    });
}
// the round buttons (fullscreen, sound, undo, autopilot) sit in the flight panel while it is open
let fabHome = null;
function dockFabsInPanel(on) {
    const fab = document.querySelector('.fab-container'); if (!fab || isMobileUI()) return;
    if (!fabHome) fabHome = { parent: fab.parentNode, next: fab.nextSibling };
    if (on) {
        const actions = document.querySelector('#flight-focus .ff-actions');
        if (actions && fab.parentNode !== actions.parentNode) actions.parentNode.insertBefore(fab, actions);
        fab.classList.add('in-panel');
    } else if (fab.classList.contains('in-panel')) {
        fabHome.parent.insertBefore(fab, fabHome.next);
        fab.classList.remove('in-panel');
    }
}
function toggleFollowFocused() {
    const p = activePlaneMarkers[focusedFlightNum];
    if (!p || p.landed) return;
    if (trackedFlightNum === p.num) releaseTracking(false, true);
    else flyToAircraft(p, map.getZoom(), 700, () => { if (focusedFlightNum === p.num) { trackedFlightNum = p.num; updateTrackPill(); updateFlightFocus(); } });
    updateFlightFocus();
}
function updateFlightFocus() {
    const p = activePlaneMarkers[focusedFlightNum];
    if (!p) { if (focusedFlightNum !== null) closeFlightFocus(); return; }
    const st = liveState(p), panel = document.getElementById('flight-focus');
    const set = (k, v) => { const el = panel.querySelector(`[data-ff="${k}"]`); if (el) el.innerText = v; };
    set('altHead', fmtFt(st.alt)); set('alt', fmtFt(st.alt));
    set('vs', (st.vs > 0 ? '+' : '') + st.vs + ' fpm');
    set('trk', String(Math.round(p.headingDeg)).padStart(3, '0') + '°');
    set('spd', p.landed ? '0 kts' : p.spd + ' kts');
    set('fuel', st.fuelKg === null ? '–' : st.fuelKg.toLocaleString('en-US').replace(/,/g, ' ') + ' kg');
    set('ltt', hhmm(st.simMs));
    set('rem', Math.round(st.remain) + ' NM');
    const dms = formatDMS(p.lat, p.lon).split(' ');
    set('lat', dms[0] || '–'); set('lon', dms[1] || '–');
    const phase = p.landed ? L('Landet', 'Landed') : st.vs > 100 ? L('Stiger', 'Climbing') : st.vs < -100 ? L('Daler', 'Descending') : L('Marchhøjde', 'Cruise');
    const stEl = panel.querySelector('[data-ff="status"]'); if (stEl) { stEl.innerText = phase; stEl.className = 'ff-status' + (p.landed ? ' landed' : ''); }
    const pf = panel.querySelector('[data-ff="prog"]'); if (pf) pf.style.width = (st.prog * 100).toFixed(1) + '%';
    const fb = panel.querySelector('[data-ff="followBtn"]');
    if (fb) { fb.disabled = p.landed; fb.innerText = trackedFlightNum === p.num ? L('Følger…', 'Following…') : L('Følg fly', 'Follow aircraft'); fb.classList.toggle('on', trackedFlightNum === p.num); }
    updateProfileProgress(p, st);
    const ab = panel.querySelector('[data-ff="assist"]');
    if (ab) {
        const t = p.assist && typeof ASSIST_TYPES !== 'undefined' ? ASSIST_TYPES.find(a => a.k === p.assist.type) : null;
        const sig = t ? t.k + '|' + p.landed + '|' + currentLang : '';
        if (ab.dataset.sig !== sig) {
            ab.dataset.sig = sig;
            ab.classList.toggle('show', !!t);
            ab.innerHTML = t ? `<span class="material-icons-outlined">${t.icon}</span><span>${p.landed ? L('Står klar', 'Standing by') : L('Bestilt ved landing', 'Requested on arrival')}: <b>${L(t.da, t.en)}</b> · ${p.destAirport.code}</span>
                <button type="button" onclick="event.stopPropagation(); openAirportCard('${p.destAirport.code}')">${L('Lufthavn', 'Airport')}</button>` : '';
        }
    }
    const gb = panel.querySelector('[data-ff="gadss"]');
    if (gb) {
        const sig = p.gadss ? p.gadss.level + '|' + p.gadss.ack + '|' + gadssMinutes(p) + '|' + currentLang : '';
        if (gb.dataset.sig === sig) { /* unchanged – keep the button clickable */ }
        else if (p.gadss) {
            gb.dataset.sig = sig;
            gb.className = 'ff-gadss show ' + p.gadss.level + (p.gadss.ack ? ' ack' : '');
            gb.innerHTML = `<div><b>GADSS ${p.gadss.level === 'warning' ? L('advarsel', 'warning') : L('forsigtighed', 'caution')}</b><span>${gadssText(p)}</span></div>` +
                (p.gadss.ack ? `<em>${L('Kvitteret', 'Acknowledged')}</em>` : `<button type="button" onclick="event.stopPropagation(); ackGadss(${p.num})">${L('Kvittér', 'Acknowledge')}</button>`);
        } else { gb.dataset.sig = ''; gb.className = 'ff-gadss'; gb.innerHTML = ''; }
    }
}

// Vertical profile chart (single series: altitude over time). Planned = dashed, flown = solid, "now" = vertical line.
let profGeom = null;
function renderProfileChart(p) {
    const host = document.getElementById('flight-profile-chart');
    if (!host || !p) return;
    const W = Math.max(320, host.clientWidth), H = Math.max(120, host.clientHeight);
    const m = { l: 52, r: 14, t: 10, b: 24 };
    const pr = flightProfile(p);
    const t0 = p.stdMs, t1 = p.stdMs + p.durMin * 60000;
    const flMax = Math.max(400, Math.ceil(pr.peak / 100 / 100) * 100 + 0);
    const x = t => m.l + (t - t0) / (t1 - t0) * (W - m.l - m.r);
    const y = fl => m.t + (1 - fl / flMax) * (H - m.t - m.b);
    const N = 160, pts = [];
    for (let i = 0; i <= N; i++) { const f = i / N; pts.push([x(t0 + f * (t1 - t0)), y(altAtNm(p, f * pr.D) / 100), f]); }
    profGeom = { W, H, m, x, y, t0, t1, pts, flMax, num: p.num };
    const path = arr => arr.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
    // grid + axes
    let g = '';
    for (let fl = 0; fl <= flMax; fl += 100) g += `<line class="pf-grid" x1="${m.l}" x2="${W - m.r}" y1="${y(fl)}" y2="${y(fl)}"/><text class="pf-tick" x="${m.l - 8}" y="${y(fl) + 3.5}" text-anchor="end">FL ${fl}</text>`;
    const durMin = p.durMin, step = [15, 30, 60, 120, 180, 240].find(s => durMin / s <= 12) || 360;
    const first = Math.ceil(t0 / (step * 60000)) * step * 60000;
    g += `<text class="pf-tick" x="${m.l}" y="${H - 6}" text-anchor="start">${hhmm(t0)}</text>`;
    for (let t = first; t < t1; t += step * 60000) {
        if (x(t) - m.l < 34 || (W - m.r) - x(t) < 34) continue;
        g += `<line class="pf-grid pf-vgrid" x1="${x(t)}" x2="${x(t)}" y1="${m.t}" y2="${H - m.b}"/><text class="pf-tick" x="${x(t)}" y="${H - 6}" text-anchor="middle">${hhmm(t)}</text>`;
    }
    g += `<text class="pf-tick" x="${W - m.r}" y="${H - 6}" text-anchor="end">${hhmm(t1)}</text>`;
    let stops = '';
    for (let k = 0; k < ALT_COLOR_STOPS.length; k += 2) stops += `<stop offset="${Math.min(1, ALT_COLOR_STOPS[k] / 100 / flMax)}" stop-color="${ALT_COLOR_STOPS[k + 1]}"/>`;
    host.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${L('Højdeprofil', 'Vertical profile')} ${p.flightNo}">
        <defs><linearGradient id="pfAltGrad" gradientUnits="userSpaceOnUse" x1="0" y1="${y(0)}" x2="0" y2="${y(flMax)}">${stops}</linearGradient>
              <linearGradient id="pfLegendGrad" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient></defs>
        <g>${g}</g>
        <rect class="pf-future" x="0" y="${m.t}" width="0" height="${H - m.t - m.b}"/>
        <path class="pf-planned" d="${path(pts)}"/>
        <path class="pf-flown" d=""/>
        <g class="pf-gadss-hist"></g>
        <rect class="pf-gadss" x="0" y="${m.t}" width="0" height="${H - m.t - m.b}"/>
        <line class="pf-gadss-edge" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}"/>
        <circle class="pf-gadss-last" r="4" cx="-10" cy="-10"/>
        <text class="pf-gadss-label" x="0" y="${m.t + 12}"></text>
        <line class="pf-now" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}"/>
        <circle class="pf-dot" r="4.5" cx="-10" cy="-10"/>
        <line class="pf-cross" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" style="display:none"/>
        <circle class="pf-cross-dot" r="4" style="display:none"/>
        <rect class="pf-hit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}"/>
    </svg><div class="pf-tip" style="display:none"></div>
    <div class="pf-legend"><span>${L('Højde', 'Altitude')}</span><span>FL0</span><svg width="90" height="8"><rect width="90" height="8" rx="2" fill="url(#pfLegendGrad)"/></svg><span>FL${flMax}</span></div>`;
    const svg = host.querySelector('svg'), tip = host.querySelector('.pf-tip');
    const cross = svg.querySelector('.pf-cross'), cdot = svg.querySelector('.pf-cross-dot');
    const hit = svg.querySelector('.pf-hit');
    hit.addEventListener('mousemove', e => {
        const r = svg.getBoundingClientRect(), mx = e.clientX - r.left;
        const f = Math.min(1, Math.max(0, (mx - m.l) / (W - m.l - m.r)));
        const t = t0 + f * (t1 - t0), alt = altAtNm(p, f * pr.D);
        cross.setAttribute('x1', mx); cross.setAttribute('x2', mx); cross.style.display = '';
        cdot.setAttribute('cx', mx); cdot.setAttribute('cy', y(alt / 100)); cdot.style.display = '';
        tip.style.display = 'block';
        tip.innerHTML = `<b>${hhmm(t)}</b> · FL ${String(Math.round(alt / 100)).padStart(3, '0')}<br><span>${Math.round(pr.D * (1 - f))} NM ${L('tilbage', 'to go')}</span>`;
        const tw = tip.offsetWidth;
        tip.style.left = Math.min(W - tw - 4, Math.max(4, mx + 12)) + 'px';
        tip.style.top = Math.max(4, y(alt / 100) - 46) + 'px';
    });
    hit.addEventListener('mouseleave', () => { cross.style.display = 'none'; cdot.style.display = 'none'; tip.style.display = 'none'; });
}
function updateProfileProgress(p, st) {
    const host = document.getElementById('flight-profile-chart');
    if (!host || !profGeom || profGeom.num !== p.num) return;
    const svg = host.querySelector('svg'); if (!svg) return;
    const g = profGeom, f = Math.min(1, st.prog);
    const nx = g.x(g.t0 + f * (g.t1 - g.t0)), ny = g.y(st.alt / 100);
    const flown = g.pts.filter(q => q[2] <= f).concat([[nx, ny]]);
    svg.querySelector('.pf-flown').setAttribute('d', flown.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' '));
    const now = svg.querySelector('.pf-now'); now.setAttribute('x1', nx); now.setAttribute('x2', nx);
    const dot = svg.querySelector('.pf-dot'); dot.setAttribute('cx', nx); dot.setAttribute('cy', ny);
    const fut = svg.querySelector('.pf-future'); fut.setAttribute('x', nx); fut.setAttribute('width', Math.max(0, g.W - g.m.r - nx));
    // GADSS episodes that are over stay on the profile: yellow while the report was overdue, red where it was a warning
    const hist = svg.querySelector('.pf-gadss-hist'), log = p.gadssLog || [];
    if (hist && hist.dataset.n !== String(log.length)) {
        hist.dataset.n = String(log.length);
        const top = g.m.t, h = g.H - g.m.t - g.m.b, X = t => Math.max(g.m.l, Math.min(g.W - g.m.r, g.x(t)));
        hist.innerHTML = log.map(e => {
            const xa = X(e.from), xw = e.warn ? X(e.warn) : null, xb = X(e.to);
            return `<rect class="pf-gh caution" x="${xa}" y="${top}" width="${Math.max(0, (xw || xb) - xa)}" height="${h}"/>` +
                (xw != null ? `<rect class="pf-gh warning" x="${xw}" y="${top}" width="${Math.max(0, xb - xw)}" height="${h}"/>` : '') +
                `<line class="pf-gh-edge ${e.warn ? 'warning' : 'caution'}" x1="${xa}" x2="${xa}" y1="${top}" y2="${top + h}"/>` +
                `<text class="pf-gh-label ${e.warn ? 'warning' : 'caution'}" x="${xa + 3}" y="${top + h - 4}">GADSS</text>`;
        }).join('');
    }
    // GADSS: shade the stretch since the last position report and mark that report
    const gr = svg.querySelector('.pf-gadss'), ge = svg.querySelector('.pf-gadss-edge'), gl = svg.querySelector('.pf-gadss-last'), gt = svg.querySelector('.pf-gadss-label');
    if (gr) {
        svg.classList.toggle('gadss-caution', !!p.gadss && p.gadss.level === 'caution');
        svg.classList.toggle('gadss-warning', !!p.gadss && p.gadss.level === 'warning');
        if (p.gadss) {
            const tLast = Math.max(g.t0, st.simMs - gadssMinutes(p) * 60000);
            const fLast = (tLast - g.t0) / (g.t1 - g.t0), lx = g.x(tLast), ly = g.y(altAtNm(p, Math.max(0, fLast) * p.totalDistNm) / 100);
            gr.setAttribute('x', lx); gr.setAttribute('width', Math.max(0, nx - lx));
            ge.setAttribute('x1', lx); ge.setAttribute('x2', lx);
            gl.setAttribute('cx', lx); gl.setAttribute('cy', ly);
            gt.textContent = `GADSS · ${gadssMinutes(p)} min`;
            gt.setAttribute('x', Math.max(g.m.l + 4, lx + 4));
        } else { gr.setAttribute('width', 0); gl.setAttribute('cx', -10); gt.textContent = ''; ge.setAttribute('x1', -10); ge.setAttribute('x2', -10); }
    }
}
window.addEventListener('resize', () => { const p = activePlaneMarkers[focusedFlightNum]; if (p) { renderProfileChart(p); updateFlightFocus(); } });

function updateTrackPill() {
    const pill = document.getElementById('track-pill');
    if (!pill) return;
    const p = trackedFlightNum !== null ? activePlaneMarkers[trackedFlightNum] : null;
    pill.classList.toggle('show', !!p);
    if (p) document.getElementById('trackPillText').innerText = `${translations[currentLang].tracking} ${p.flightNo}`;
}
// Camera that follows an aircraft (or Santa): one small jumpTo per frame. MapLibre snaps the raster basemap to
// whole pixels whenever it thinks the map is standing still, and a jumpTo does not count as moving – so on the
// flat map the ground moved in 1-pixel jerks under the aircraft (the globe has no snapping). While following we
// therefore tell MapLibre that the map is moving; a fly-to or the user's own dragging still has priority.
function followCamera(lon, lat) {
    if (!map || map.isEasing() || (map.handlers && map.handlers.isMoving())) return;
    map._moving = true;
    map.jumpTo({ center: [lon, lat] });
    if (typeof map.redraw === 'function') map.redraw();
}
function endFollowCamera() {
    if (map && map._moving && !map.isEasing()) { map._moving = false; map.triggerRepaint(); }   // last frame pixel-sharp again
}
function releaseTracking(silent, keepCard) {
    if (trackedFlightNum === null) return;
    endFollowCamera();
    const p = activePlaneMarkers[trackedFlightNum];
    if (p && p.el) p.el.classList.remove('selected-plane');
    trackedFlightNum = null;
    updateTrackPill();
    if (!silent && !keepCard) clearFlightSelection();
    if (!silent) showToast(currentLang === 'da' ? 'Kamera frigivet' : 'Camera released');
}

// Silkeblød 60 FPS requestAnimationFrame-loop til flybevægelse langs Mercator-ruten
let lastAnimTime = performance.now();
let lastRouteGeoJsonSync = 0;

function animateActivePlanes(now) {
    const dtSec = Math.min(0.1, Math.max(0.001, (now - lastAnimTime) / 1000));
    lastAnimTime = now;

    const planes = Object.values(activePlaneMarkers);
    let anyMoved = false;
    let anyLandedThisFrame = false;

    for (let i = 0; i < planes.length; i++) {
        const p = planes[i];
        if (p.landed) continue;

        anyMoved = true;
        p.flownDistNm += (p.nmps || CONSTANT_NM_PER_SECOND) * dtSec;

        if (p.flownDistNm >= p.totalDistNm) {
            p.flownDistNm = p.totalDistNm;
            const endPt = p.route ? p.route.track[p.route.track.length - 1] : [p.destLon, p.destLat];
            p.lon = endPt[0];
            p.lat = endPt[1];
            p.landed = true;
            anyLandedThisFrame = true;
            p.marker.setLngLat([p.lon, p.lat]);
            p.el.classList.add('landed');
            const infoBox = p.el.querySelector('.plane-info-box');
            if (infoBox) infoBox.innerText = `${p.flightNo} LANDED`;
            syncFlightRowUI(p);
            if (p.assist && typeof assistOnLanding === 'function') assistOnLanding(p);
            if (trackedFlightNum === p.num) releaseTracking(true);   // stay at the destination
            if (focusedFlightNum === p.num) setTimeout(updateFlightFocus, 0);
        } else {
            const [nextLon, nextLat] = p.route ? routePosAt(p.route, p.flownDistNm)
                                               : interpolateMercatorPoint(p.startLon, p.startLat, p.destLon, p.destLat, p.flownDistNm / p.totalDistNm);
            p.lon = nextLon;
            p.lat = nextLat;
            p.marker.setLngLat([nextLon, nextLat]);

            const headingDeg = computeTangentHeadingDeg(p);
            p.headingDeg = headingDeg;
            setPlaneRotation(p, headingDeg);
        }
    }

    // Camera follow: lock the map centre to the tracked aircraft until the user clicks away
    if (trackedFlightNum !== null && map) {
        const tp = activePlaneMarkers[trackedFlightNum];
        if (!tp) releaseTracking(true);
        else followCamera(tp.lon, tp.lat);   // draws the map in the SAME frame as the aircraft -> no wobble
    }

    // Opdater selve GeoJSON-rutelinjen og det åbne telemetri-kort ~8 gange i sekundet (eller straks ved landing)
    if ((anyMoved && (now - lastRouteGeoJsonSync > (focusedFlightNum !== null ? 100 : 250))) || anyLandedThisFrame) {
        lastRouteGeoJsonSync = now;
        try { updateFlightRoutesLayer(anyLandedThisFrame); } catch (e) { /* never let a map hiccup stop the animation loop */ }
        planes.forEach(p => {
            if (p.landed) return;
            syncFlightRowUI(p);
            const ib = p.el && p.el.querySelector('.plane-info-box');
            if (ib) ib.innerText = `${p.flightNo} ${p.ac ? p.ac.code : ''} FL${String(Math.round(altAtNm(p, p.flownDistNm) / 100)).padStart(3, '0')}`;
        });
        if (focusedFlightNum !== null) updateFlightFocus();
    }

    requestAnimationFrame(animateActivePlanes);
}
requestAnimationFrame(animateActivePlanes);

function drawNumber() {
    if (isSpinning) return;
    if (drawnNumbers.length >= maxNumber) { 
        showToast(currentLang === 'da' ? "Alle fly er landet!" : "Flight Complete!"); if(autopilotInterval) toggleAutopilot(); return; 
    }
    if(!startTime) { startTime = new Date(); statsInterval = setInterval(updateStats, 1000); }

    isSpinning = true;
    const myToken = ++drawToken;
    const display = document.getElementById('currentNumber');
    display.classList.add('rolling');
    
    // The roll lasts a fixed TIME (not a number of ticks): on a slow or busy device the ticks come late, and a
    // tick count could outlast the safety timer below, which then unlocked drawing while a number was still rolling.
    const t0 = performance.now();
    clearInterval(drawRollTimer);
    drawRollTimer = setInterval(() => {
        display.innerText = Math.floor(Math.random() * maxNumber) + 1;
        playSound('tick');
        if (performance.now() - t0 >= 800) {
            clearInterval(drawRollTimer); drawRollTimer = 0;
            try { finalize(); }
            catch(e) { console.error(e); isSpinning = false; }
        }
    }, 50);

    // safety net if something went wrong: stop the roll itself too, so no number can land after unlocking
    setTimeout(() => {
        if (isSpinning && myToken === drawToken) { clearInterval(drawRollTimer); drawRollTimer = 0; isSpinning = false; display.classList.remove('rolling'); }
    }, 4000);
}
let drawRollTimer = 0;

function finalize(presetNum) {
    try {
        let num;
        if (presetNum) { if (drawnNumbers.includes(presetNum)) return; num = presetNum; } 
        else { do { num = Math.floor(Math.random() * maxNumber) + 1; } while (drawnNumbers.includes(num)); }
        
        drawnNumbers.push(num);
        
        const display = document.getElementById('currentNumber');
        display.classList.remove('rolling'); display.innerText = num;
        
        const lingoEl = document.getElementById('lingoText');
        const t = translations[currentLang];
        const lingo = lingoFor(num);
        lingoEl.innerHTML = `<span style="color:var(--accent-orange); font-weight:bold;">${lingo}</span>`;

        document.querySelectorAll('.grid-cell.latest').forEach(el => el.classList.remove('latest'));
        const cell = document.getElementById('cell-' + num);
        if(cell) cell.classList.add('active', 'latest');

        const flight = createFlightData(num);
        updateCommonUI();
        addRadarPlane(flight);
        updateLog(flight);
        playSound(drawSoundName());
        noteActivity(true);
        saveGame();
    } finally {
        isSpinning = false;
    }
}

function undoLastNumber() {
    if (isSpinning || drawnNumbers.length === 0) return;
    removeNumber(drawnNumbers[drawnNumbers.length - 1]);
}
// Removes any drawn number (undo = the last one; manual mode can remove an older mistaken click)
function removeNumber(removedNum) {
    const idx = drawnNumbers.indexOf(removedNum);
    if (idx < 0) return;
    drawnNumbers.splice(idx, 1);
    const cell = document.getElementById('cell-' + removedNum); if (cell) cell.classList.remove('active', 'latest');
    if (trackedFlightNum === removedNum) releaseTracking(true);
    if (focusedFlightNum === removedNum) clearFlightSelection();
    if (activePlaneMarkers[removedNum] && activePlaneMarkers[removedNum].gadss) activePlaneMarkers[removedNum].gadss = null;
    if (activePlaneMarkers[removedNum]) {
        activePlaneMarkers[removedNum].marker.remove();
        delete activePlaneMarkers[removedNum];
        updateFlightRoutesLayer();
    }
    const plane = document.getElementById('plane-obj-' + removedNum); if (plane) plane.remove();
    const logEntry = document.getElementById('log-entry-' + removedNum); if (logEntry) logEntry.remove();
    const logDetail = document.getElementById('log-detail-' + removedNum); if (logDetail) logDetail.remove();
    document.querySelectorAll('.grid-cell.latest').forEach(el => el.classList.remove('latest'));
    showCurrentNumber();
    updateCommonUI();
    saveGame();
}
function showCurrentNumber() {
    const t = translations[currentLang];
    const last = drawnNumbers[drawnNumbers.length - 1];
    document.getElementById('currentNumber').innerText = last || '--';
    const lingoEl = document.getElementById('lingoText');
    if (last) {
        const c = document.getElementById('cell-' + last); if (c) c.classList.add('latest');
        lingoEl.innerHTML = `<span style="color:var(--accent-orange); font-weight:bold;">${lingoFor(last)}</span>`;
    } else lingoEl.innerText = t.systemReady;
}


function updateCommonUI() {
    updateRecent();
    const percent = (drawnNumbers.length / maxNumber) * 100;
    document.getElementById('flightProgress').style.width = percent + '%';
    document.getElementById('drawnCount').innerText = drawnNumbers.length;
    document.getElementById('remainCount').innerText = maxNumber - drawnNumbers.length;
}

function updateLog(flight) {
    const tbody = document.getElementById('flightLogTableBody');
    if(!tbody || !flight) return;

    const t = translations[currentLang];
    const lingo = bingoLingoData[currentLang][flight.num] || `${t.lingoDefault} ${flight.num}`;

    const row = document.createElement('tr');
    row.id = 'log-entry-' + flight.num;
    row.className = 'flight-row';
    row.title = 'Click to locate on map & view flight telemetry';
    row.onclick = () => selectFlightFromLog(flight.num);
    row.innerHTML = `
        <td class="col-mono" style="font-weight:bold; color:var(--primary-blue);">${flight.flightNo}<div class="row-progress"><div class="row-progress-fill"></div></div></td>
        <td style="font-weight:bold;">${flight.std}</td>
        <td>${flight.depAirport.code}</td>
        <td>${flight.destAirport.code}</td>
        <td class="eta-cell" style="color:var(--primary-blue); font-weight:700;">${flight.eta}</td>
    `;
    row.style.animation = "fadeIn 0.4s";
    row.title = currentLang === 'da' ? 'Klik for at finde på kortet og følge flyet' : 'Click to locate & follow on map';

    const detailRow = document.createElement('tr');
    detailRow.id = 'log-detail-' + flight.num;
    detailRow.className = 'flight-detail-row';
    detailRow.innerHTML = `
        <td colspan="5">
            <div class="flight-detail-card">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-light); padding-bottom:4px;">
                    <span style="font-weight:800; color:var(--accent-orange);">#${flight.num} — ${lingo}</span>
                    <span class="status-pill enroute detail-status">${t.stInFlight}</span>
                </div>
                <div class="flight-detail-grid">
                    <div class="flight-detail-item">
                        <span class="flight-detail-label"><span data-lang="lblOrigin">Origin</span> (${flight.depAirport.code})</span>
                        <span class="flight-detail-val" style="font-family:inherit; font-size:10.5px;">${flight.depAirport.name}</span>
                    </div>
                    <div class="flight-detail-item">
                        <span class="flight-detail-label"><span data-lang="lblDest">Destination</span> (${flight.destAirport.code})</span>
                        <span class="flight-detail-val" style="font-family:inherit; font-size:10.5px;">${flight.destAirport.name}</span>
                    </div>
                    <div class="flight-detail-item">
                        <span class="flight-detail-label" data-lang="lblSpeed">Speed / Flight Level</span>
                        <span class="flight-detail-val detail-gs">${flight.spd} KT (FL${flight.fl})</span>
                    </div>
                    <div class="flight-detail-item">
                        <span class="flight-detail-label" data-lang="lblHdg">Track Heading</span>
                        <span class="flight-detail-val detail-hdg">${String(flight.headingDeg).padStart(3, '0')}°</span>
                    </div>
                    <div class="flight-detail-item" style="grid-column: span 2;">
                        <span class="flight-detail-label" data-lang="lblRem">Remaining Distance</span>
                        <span class="flight-detail-val detail-rem">${flight.totalDistNm} / ${flight.totalDistNm} NM (0%)</span>
                    </div>
                </div>
                <div class="flight-progress-track">
                    <div class="flight-progress-fill" style="width:0%"></div>
                </div>
            </div>
        </td>
    `;

    if (flight.gadss) row.classList.add('gadss-' + flight.gadss.level);
    const firstRow = tbody.firstChild;
    tbody.insertBefore(row, firstRow);
    tbody.insertBefore(detailRow, row.nextSibling);
    applyLanguageTo(detailRow);
}

function filterLog(query) {
    const filter = query.toUpperCase();
    const rows = document.querySelectorAll('#flightLogTableBody tr.flight-row');
    rows.forEach(row => {
        const num = row.id.replace('log-entry-', '');
        const detailRow = document.getElementById('log-detail-' + num);
        const txtValue = (row.textContent || row.innerText) + ' ' + (detailRow ? (detailRow.textContent || detailRow.innerText) : '');
        const match = txtValue.toUpperCase().indexOf(filter) > -1;
        row.style.display = match ? "" : "none";
        if (!match && detailRow) detailRow.classList.remove('open');
    });
}

function resetGame() {
    const t = translations[currentLang];
    if(autopilotInterval) {
        clearInterval(autopilotInterval);
        autopilotInterval = null;
        document.getElementById('fab-auto').classList.remove('active');
    }
    
    drawnNumbers = [];
    startTime = null;
    clearInterval(statsInterval);
    clearInterval(drawRollTimer); drawRollTimer = 0;   // a roll in progress must not land a number in the new game
    isSpinning = false;

    document.getElementById('currentNumber').innerText = "--";
    document.getElementById('lingoText').innerText = t.systemReady;

    updateCommonUI();

    document.getElementById('flightTime').innerText = "00:00";
    document.getElementById('flightProgress').style.width = "0%";

    document.querySelectorAll('.grid-cell').forEach(c => c.className = 'grid-cell');
    document.getElementById('flightLogTableBody').innerHTML = '';

    releaseTracking(true);
    closeFlightFocus();
    Object.values(activePlaneMarkers).forEach(p => p.marker.remove());
    activePlaneMarkers = {};
    updateFlightRoutesLayer();
    document.querySelectorAll('.radar-plane').forEach(p => p.remove());

    updateRecent();
    saveGame();
    showToast(currentLang === 'da' ? 'Nyt spil startet' : 'New game started');
}
