// Bingo Watch – app.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// Live UTC Clock in Header
function updateUtcClock() {
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const el = document.getElementById('utcClock');
    if (el) el.innerText = `${hh}:${mm} UTC`;
}
setInterval(updateUtcClock, 1000);
updateUtcClock();

window.onload = () => {
    // FIX: every init step is isolated - one failure (blocked localStorage, map library not loaded...)
    // no longer stops the airport search, autocomplete, grid etc. from starting.
    const steps = [
        ['renderDock', () => renderDock()],
        ['ensureInitialPositions', () => ensureInitialPositions()],
        ['initWxMenu', () => initWxMenu()],
        ['setLanguage', () => setLanguage('en')],
        ['createGrid', () => createGrid()],
        ['initResizeObserver', () => initResizeObserver()],
        ['initRealMapAndWeather', () => initRealMapAndWeather()],
        ['setupAutocomplete', () => setupAutocomplete()],
        ['smartWeatherSearch', () => smartWeatherSearch()],
        ['initPrizes(small)', () => initPrizes('small')],
        ['initPrizes(big)', () => initPrizes('big')],
        ['restoreGame', () => restoreGame()]
    ];
    steps.forEach(([name, fn]) => {
        try { fn(); } catch (e) { console.error('Init step failed: ' + name, e); }
    });
    if (typeof maplibregl === 'undefined') {
        showToast(currentLang === 'da' ? 'Kortbiblioteket kunne ikke indlæses (tjek internetforbindelsen)' : 'Map library could not be loaded (check internet connection / unpkg.com)');
    }
};

/* =====================================================================
   OCC TACTICAL MAP + 3D GLOBE + REAL WEATHER DATA (100% LOCAL FILE SAFE)
   ===================================================================== */
function initRealMapAndWeather() {
    map = new maplibregl.Map({
        container: 'realMap',
        style: buildOccMapStyle('default'),
        center: [currentLon, currentLat],
        zoom: defaultMapZoom(),
        attributionControl: false
    });

    map.on('mousemove', (e) => {
        const { lat, lng } = e.lngLat;
        const pill = document.getElementById('coordPill');
        if (pill) pill.innerText = formatDMS(lat, lng);
    });

    map.on('move', () => {
        updateAllPlaneScreenHeadings();
    });
    // Camera lock is released as soon as the user clicks or drags the map
    map.on('mousedown', () => { window._mapGrabAt = Date.now(); releaseTracking(false, true); if (santa.follow) toggleSantaFollow(false); });
    // Klik et tomt sted på kortet: fravælg flyet og fold dets kort i Active Flights sammen igen
    map.on('click', (e) => { if (e.originalEvent && e.originalEvent._airportClick) return; if (typeof closeAirportCard === 'function') closeAirportCard(); clearFlightSelection(); });
    map.on('touchstart', () => releaseTracking(false, true));
    map.on('dragstart', () => releaseTracking(false, true));

    map.on('style.load', () => {
        syncAllMapLayersAndProjection();
    });

    // FIX: tile/source problems are now visible in the console instead of failing silently
    let basemapErrorShown = false;
    map.on('error', (e) => {
        console.warn('Map error:', e && e.error ? e.error.message : e);
        if (e && e.sourceId === 'occ-osm-base' && !basemapErrorShown) {
            basemapErrorShown = true;
            showToast(currentLang === 'da' ? 'Kortfliser kunne ikke indlæses (Esri). Tjek forbindelsen / konsollen (F12).' : 'Basemap tiles failed to load (Esri). Check connection / console (F12).');
        }
    });
}

let mapSyncRunning = false;
let mapSyncQueued = false;
async function syncAllMapLayersAndProjection() {
    if (!map) return;
    // FIX: avoid overlapping runs (style.load + theme switch used to trigger two at once)
    if (mapSyncRunning) { mapSyncQueued = true; return; }
    mapSyncRunning = true;
    try {
        applyCurrentProjection();
        // FIX: rings, airports and routes are drawn IMMEDIATELY - they no longer wait for slow weather APIs
        loadOccTacticalOverlay();
        updateFlightRoutesLayer();

        // Weather layers load in parallel; one failing/hanging API cannot block the others
        // Global weather layers are drawn instantly from the built-in atmosphere model,
        // then upgraded when live Open-Meteo data arrives (throttled + cached).
        wxBuilt = {};
        ensureWxIcons();
        rebuildWxLayers(false);
        bindWxPopups();
        if (liveWeatherState.sun) renderSun();
        fetchLiveAtmosphere(false);
        await Promise.allSettled([loadRealRainViewerLayers()]);
        bringOccToTop();
    } catch (e) {
        console.warn('Map layer sync error:', e);
    } finally {
        mapSyncRunning = false;
        if (mapSyncQueued) { mapSyncQueued = false; syncAllMapLayersAndProjection(); }
    }
}

function applyCurrentProjection() {
    if (!map) return;
    try {
        map.setProjection({ type: isGlobeMode ? 'globe' : 'mercator' });
        if (typeof flow !== 'undefined' && flow.on) flowReset();   // respawn wind particles on the new projection
    } catch (e) {
        console.warn('Projection switch error:', e);
    }
}

function formatDMS(lat, lon) {
    const toDMS = (val, pos, neg) => {
        const dir = val >= 0 ? pos : neg;
        const abs = Math.abs(val);
        const d = Math.floor(abs);
        const m = Math.floor((abs - d) * 60);
        const s = Math.floor(((abs - d) * 60 - m) * 60);
        const pad = (n, l = 2) => String(n).padStart(l, '0');
        return `${dir}${pad(d, pos === 'E' ? 3 : 2)}:${pad(m)}:${pad(s)}`;
    };
    return `${toDMS(lat, 'N', 'S')} ${toDMS(lon, 'E', 'W')}`;
}
