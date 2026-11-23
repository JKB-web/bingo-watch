// Bingo Watch – map-controls.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// ---- SUN + DAY/NIGHT TERMINATOR -------------------------------------------
function sunPosition(date) {
    const n = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
    const L = (280.460 + 0.9856474 * n) % 360, g = ((357.528 + 0.9856003 * n) % 360) * D2R;
    const lam = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * D2R;
    const eps = (23.439 - 0.0000004 * n) * D2R;
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / D2R;
    const gmst = (280.46061837 + 360.98564736629 * n) % 360;
    let lon = ((ra - gmst) % 360 + 540) % 360 - 180;
    return { lat: dec / D2R, lon };
}
function sunAltitude(lat, lon, sp) {
    const s = Math.sin(lat * D2R) * Math.sin(sp.lat * D2R) + Math.cos(lat * D2R) * Math.cos(sp.lat * D2R) * Math.cos((lon - sp.lon) * D2R);
    return Math.asin(wxClamp(s, -1, 1)) / D2R;
}
function buildNightGeoJSON(date) {
    const sp = sunPosition(date);
    const f = wxField((la, lo) => -sunAltitude(la, lo, sp), -90, 90, 2, -180, 180, 2);
    const feats = [];
    [0, 6, 12, 18].forEach((lv, k) => wxRings(f, lv).forEach(r => feats.push(polyFeature(r, { depth: k }))));
    feats.push({ type: 'Feature', properties: { kind: 'sun' }, geometry: { type: 'Point', coordinates: [sp.lon, sp.lat] } });
    return { geo: fc(feats), sp };
}
let sunTimer = null;
function renderSun() {
    if (!map) return;
    const { geo, sp } = buildNightGeoJSON(new Date());
    wxPutSource('wx-sun-src', geo);
    const vis = liveWeatherState.sun ? 'visible' : 'none';
    const add = (def) => { def.layout = Object.assign({ visibility: vis }, def.layout || {}); if (map.getLayer(def.id)) map.setLayoutProperty(def.id, 'visibility', vis); else map.addLayer(def, wxBeforeId()); };
    add({ id: 'wx-night', type: 'fill', source: 'wx-sun-src', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#071226', 'fill-opacity': isGlobeMode ? 0.16 : 0.13 } });
    add({ id: 'wx-sun-glow', type: 'circle', source: 'wx-sun-src', filter: ['==', ['get', 'kind'], 'sun'], paint: { 'circle-radius': 26, 'circle-color': '#ffd479', 'circle-blur': 0.9, 'circle-opacity': isGlobeMode ? 0.3 : 0.55, 'circle-pitch-alignment': 'map' } });
    add({ id: 'wx-sun-dot', type: 'circle', source: 'wx-sun-src', filter: ['==', ['get', 'kind'], 'sun'], paint: { 'circle-radius': 6.5, 'circle-color': '#fff3c4', 'circle-stroke-width': 2, 'circle-stroke-color': '#f5a524' } });
    if (map.getLayer('wx-night')) map.setPaintProperty('wx-night', 'fill-opacity', isGlobeMode ? 0.16 : 0.13);
    if (map.getLayer('wx-sun-glow')) map.setPaintProperty('wx-sun-glow', 'circle-opacity', isGlobeMode ? 0.3 : 0.55);
    applySunSky(sp);
}
function applySunSky(sp) {
    try {
        if (liveWeatherState.sun && isGlobeMode && typeof map.setSky === 'function') {
            // Dæmpet atmosfære: den lyse fog/horizon + fuld atmosphere-blend vaskede dagsiden helt ud
            const dk = wxIsDark();
            map.setSky({ 'sky-color': dk ? '#0b1220' : '#3d5f86', 'horizon-color': dk ? '#24364f' : '#8fa9c6', 'fog-color': dk ? '#1a2433' : '#9fb3c9',
                'sky-horizon-blend': 0.5, 'horizon-fog-blend': 0.5, 'fog-ground-blend': 0.6,
                'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.18, 4, 0.1, 6, 0] });
        } else if (typeof map.setSky === 'function') {
            map.setSky({ 'atmosphere-blend': 0 });
        }
    } catch (e) { console.warn('setSky not available', e); }
    // Det lyse Esri-kort + atmosfære gav en overeksponeret dagside på globussen: dæmp rasteret lidt i den kombination
    try {
        if (map.getLayer('occ-osm-layer')) {
            const dimDay = liveWeatherState.sun && isGlobeMode && !wxIsDark();
            map.setPaintProperty('occ-osm-layer', 'raster-brightness-max', dimDay ? 0.88 : 1);
            map.setPaintProperty('occ-osm-layer', 'raster-contrast', dimDay ? 0.12 : 0.05);
            if (currentThemeMode === 'default' && map.getLayer('occ-background')) map.setPaintProperty('occ-background', 'background-color', dimDay ? '#dde2e7' : '#f4f7f9');
        }
    } catch (e) {}
    try {
        if (liveWeatherState.sun && typeof map.setLight === 'function') {
            const c = map.getCenter(), alt = sunAltitude(c.lat, c.lng, sp);
            const dLon = (sp.lon - c.lng) * D2R, y = Math.sin(dLon) * Math.cos(sp.lat * D2R);
            const x = Math.cos(c.lat * D2R) * Math.sin(sp.lat * D2R) - Math.sin(c.lat * D2R) * Math.cos(sp.lat * D2R) * Math.cos(dLon);
            const az = (Math.atan2(y, x) / D2R + 360) % 360;
            map.setLight({ anchor: 'map', position: [1.5, az, wxClamp(90 - alt, 5, 95)], color: '#ffffff', intensity: isGlobeMode ? 0.25 : 0.4 });
        }
    } catch (e) {}
}
function toggleSun() {
    liveWeatherState.sun = !liveWeatherState.sun;
    document.getElementById('btn-sun').classList.toggle('active', liveWeatherState.sun);
    if (liveWeatherState.sun) {
        renderSun(); bringOccToTop();
        clearInterval(sunTimer); sunTimer = setInterval(() => { if (liveWeatherState.sun) renderSun(); }, 60000);
    } else {
        clearInterval(sunTimer);
        ['wx-night', 'wx-sun-glow', 'wx-sun-dot'].forEach(id => { if (map && map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none'); });
        if (map) applySunSky({ lat: 0, lon: 0 });
    }
    showToast(liveWeatherState.sun ? (currentLang === 'da' ? 'Sol & dag/nat-terminator TIL' : 'Sun & day/night terminator ON') : (currentLang === 'da' ? 'Sol & dag/nat FRA' : 'Sun & day/night OFF'));
}

// Toggle 3D Globe vs 2D Map Projection
function toggleGlobeProjection() {
    if (!map) return;
    isGlobeMode = !isGlobeMode;
    releaseTracking(true);
    applyCurrentProjection();
    if (liveWeatherState.sun) setTimeout(() => renderSun(), 200);

    if (isGlobeMode) {
        const c = map.getCenter();
        saved2DView = { center: [c.lng, c.lat], zoom: map.getZoom() };
        map.flyTo({ center: [currentLon, 35], zoom: 2.1, pitch: 0, bearing: 0, duration: 1200 });
    } else {
        map.flyTo({ center: saved2DView.center || [currentLon, currentLat], zoom: Math.max(3.8, saved2DView.zoom || 4.5), duration: 1000 });
    }

    document.getElementById('btn-globe').classList.toggle('active', isGlobeMode);
    showToast(currentLang === 'da' ? (isGlobeMode ? '3D-globus aktiveret' : '2D-kort aktiveret') : (isGlobeMode ? '3D Globe View Activated' : '2D Map View Activated'));
}

// Toggle OCC rings + radar (the 9 weather layers use toggleWxLayer via the Weather Layers menu)
async function toggleLiveLayer(type) {
    liveWeatherState[type] = !liveWeatherState[type];
    const isVis = liveWeatherState[type] ? 'visible' : 'none';
    const da = currentLang === 'da';
    if (type === 'rings') {
        if (map && map.getLayer('layer-occ-rings')) {
            map.setLayoutProperty('layer-occ-rings', 'visibility', isVis);
            map.setLayoutProperty('layer-occ-waypoints', 'visibility', isVis);
            if (map.getLayer('layer-occ-airport-hit')) map.setLayoutProperty('layer-occ-airport-hit', 'visibility', isVis);
        }
        document.getElementById('btn-occ-rings').classList.toggle('active', liveWeatherState.rings);
        showToast(liveWeatherState.rings ? (da ? 'OCC rækkeviddecirkler TIL' : 'OCC Range Rings & Waypoints ON') : (da ? 'OCC rækkeviddecirkler FRA' : 'OCC Range Rings OFF'));
    } else if (type === 'radar') {
        if (map && !map.getLayer('layer-rainviewer-radar')) {
            await loadRealRainViewerLayers();
            bringOccToTop();
        } else if (map && map.getLayer('layer-rainviewer-radar')) {
            map.setLayoutProperty('layer-rainviewer-radar', 'visibility', isVis);
        }
        syncWxMenuUI();
        showToast(liveWeatherState.radar ? (da ? 'Live nedbørsradar TIL' : 'Live Precipitation Radar ON') : (da ? 'Nedbørsradar FRA' : 'Precipitation Radar OFF'));
    }
}

function centerMapOnAirport() {
    if (!map) return;
    releaseTracking(true);
    map.flyTo({ center: [currentLon, currentLat], zoom: 5.2, duration: 1200 });
}

function startMission() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    document.getElementById('start-overlay').style.display = 'none';
    playSound('chime');
}

// Start layout: computed from the real window size, fixed 12px spacing, nothing overlaps
// (right edge keeps clear of the map toolbar + round buttons, bottom keeps clear of the HUD).
