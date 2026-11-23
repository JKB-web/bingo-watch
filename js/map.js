// Bingo Watch – map.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// OCC TACTICAL RANGE RINGS (50 NM, 100 NM, 200 NM), RADAR CROSSHAIRS & WAYPOINTS
function createGeoCircle(centerLon, centerLat, radiusNm, steps = 72) {
    const coords = [];
    const radiusKm = radiusNm * 1.852;
    const earthKm = 6371;
    const latRad = centerLat * Math.PI / 180;
    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        const dLat = (radiusKm / earthKm) * (180 / Math.PI) * Math.sin(angle);
        const dLon = (radiusKm / (earthKm * Math.cos(latRad))) * (180 / Math.PI) * Math.cos(angle);
        coords.push([centerLon + dLon, centerLat + dLat]);
    }
    return coords;
}

function buildOccTacticalGeoJSON() {
    const features = [];
    // Range Rings: 50 NM, 100 NM, 200 NM around selected airport
    [50, 100, 200].forEach(nm => {
        features.push({
            type: 'Feature',
            properties: { kind: 'ring', label: `${nm}NM` },
            geometry: {
                type: 'LineString',
                coordinates: createGeoCircle(currentLon, currentLat, nm)
            }
        });
    });

    // Crosshair lines through selected airport
    const spanLat = 3.5;
    const spanLon = 6.0;
    features.push({
        type: 'Feature',
        properties: { kind: 'crosshair' },
        geometry: {
            type: 'MultiLineString',
            coordinates: [
                [[currentLon - spanLon, currentLat], [currentLon + spanLon, currentLat]],
                [[currentLon, currentLat - spanLat], [currentLon, currentLat + spanLat]]
            ]
        }
    });

    // Airport Waypoints
    AIRPORT_DB.forEach(ap => {
        features.push({
            type: 'Feature',
            properties: {
                kind: 'waypoint',
                code: ap.code,
                isPrimary: ap.code === currentICAO ? 1 : 0
            },
            geometry: {
                type: 'Point',
                coordinates: [ap.lon, ap.lat]
            }
        });
    });

    return { type: 'FeatureCollection', features };
}

function loadOccTacticalOverlay() {
    if (!map) return;
    const geojson = buildOccTacticalGeoJSON();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const lineCol = currentThemeMode === 'matrix' ? '#00ff00' : (isDark ? '#388bfd' : '#1b365d');
    const vis = liveWeatherState.rings ? 'visible' : 'none';

    if (!map.getSource('occ-tactical')) {
        map.addSource('occ-tactical', { type: 'geojson', data: geojson, promoteId: 'code' });
    } else {
        map.getSource('occ-tactical').setData(geojson);
    }

    if (!map.getLayer('layer-occ-rings')) {
        map.addLayer({
            id: 'layer-occ-rings',
            type: 'line',
            source: 'occ-tactical',
            filter: ['in', ['get', 'kind'], ['literal', ['ring', 'crosshair']]],
            paint: {
                'line-color': lineCol,
                'line-width': ['match', ['get', 'kind'], 'ring', 1.1, 0.7],
                'line-dasharray': [4, 4],
                'line-opacity': isDark ? 0.35 : 0.25
            },
            layout: { visibility: vis }
        });
    } else {
        map.setPaintProperty('layer-occ-rings', 'line-color', lineCol);
        map.setLayoutProperty('layer-occ-rings', 'visibility', vis);
    }

    if (!map.getLayer('layer-occ-waypoints')) {
        map.addLayer({
            id: 'layer-occ-waypoints',
            type: 'circle',
            source: 'occ-tactical',
            filter: ['==', ['get', 'kind'], 'waypoint'],
            paint: {
                'circle-radius': ['case', ['boolean', ['feature-state', 'hover'], false], 7, ['==', ['get', 'isPrimary'], 1], 5, 3],
                'circle-color': ['case', ['==', ['get', 'isPrimary'], 1], '#2f5aa8', lineCol],
                'circle-stroke-width': 1,
                'circle-stroke-color': isDark ? '#101820' : '#ffffff',
                'circle-opacity': 0.85
            },
            layout: { visibility: vis }
        });
        // invisible, larger target so the small dots are easy to hover and click
        map.addLayer({ id: 'layer-occ-airport-hit', type: 'circle', source: 'occ-tactical', filter: ['==', ['get', 'kind'], 'waypoint'],
            paint: { 'circle-radius': 11, 'circle-color': '#000', 'circle-opacity': 0 }, layout: { visibility: vis } });
        bindAirportInteraction();
    } else {
        map.setPaintProperty('layer-occ-waypoints', 'circle-color', ['case', ['==', ['get', 'isPrimary'], 1], '#2f5aa8', lineCol]);
        map.setLayoutProperty('layer-occ-waypoints', 'visibility', vis);
        if (map.getLayer('layer-occ-airport-hit')) map.setLayoutProperty('layer-occ-airport-hit', 'visibility', vis);
    }
}

// ---- Airports: info on hover, click = switch to that airport and show its weather ----
let apBound = false, apHoverId = null, apTip = null;
function airportInfoHtml(ap) {
    const da = currentLang === 'da';
    const dep = Object.values(activePlaneMarkers).filter(p => !p.landed && p.depAirport.code === ap.code).length;
    const arr = Object.values(activePlaneMarkers).filter(p => !p.landed && p.destAirport.code === ap.code).length;
    const home = ap.code === currentICAO;
    const cur = AIRPORT_DB.find(a => a.code === currentICAO);
    let dist = '';
    if (cur && !home) dist = `${Math.round(gHav(cur.lat, cur.lon, ap.lat, ap.lon))} NM ${da ? 'fra' : 'from'} ${cur.code} · ${String(Math.round(gBearing(cur.lat, cur.lon, ap.lat, ap.lon))).padStart(3, '0')}°`;
    const dms = formatDMS(ap.lat, ap.lon);
    return `<div class="ap-tip-head"><b>${ap.code}</b>${home ? `<span class="ap-badge">${da ? 'Valgt' : 'Selected'}</span>` : ''}</div>
        <div class="ap-tip-name">${ap.name}</div>
        <div class="ap-tip-grid"><span>${da ? 'Afgange i luften' : 'Departures airborne'}</span><b>${dep}</b><span>${da ? 'På vej hertil' : 'Inbound'}</span><b>${arr}</b></div>
        ${dist ? `<div class="ap-tip-sub">${dist}</div>` : ''}<div class="ap-tip-sub">${dms}</div>
        <div class="ap-tip-hint">${home ? (da ? 'Klik for trafik, kontakter og vejr' : 'Click for traffic, contacts and weather') : (da ? 'Klik for trafik, kontakter og vejr' : 'Click for traffic, contacts and weather')}</div>`;
}
function bindAirportInteraction() {
    if (apBound || !map) return;
    apBound = true;
    const clearHover = () => {
        if (apHoverId !== null && map.getSource('occ-tactical')) map.setFeatureState({ source: 'occ-tactical', id: apHoverId }, { hover: false });
        apHoverId = null; if (apTip) { apTip.remove(); apTip = null; }
        map.getCanvas().style.cursor = '';
    };
    map.on('mousemove', 'layer-occ-airport-hit', (e) => {
        const f = e.features && e.features[0]; if (!f) return;
        const code = f.properties.code, ap = AIRPORT_DB.find(a => a.code === code); if (!ap) return;
        map.getCanvas().style.cursor = 'pointer';
        if (apHoverId !== code && !(typeof apCard !== 'undefined' && apCard.code === code)) {
            if (apHoverId !== null) map.setFeatureState({ source: 'occ-tactical', id: apHoverId }, { hover: false });
            apHoverId = code; map.setFeatureState({ source: 'occ-tactical', id: code }, { hover: true });
            if (apTip) apTip.remove();
            apTip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'ap-tip', offset: 12, maxWidth: '260px' })
                .setLngLat([ap.lon, ap.lat]).setHTML(airportInfoHtml(ap)).addTo(map);
        }
    });
    map.on('mouseleave', 'layer-occ-airport-hit', clearHover);
    map.on('click', 'layer-occ-airport-hit', (e) => {
        const f = e.features && e.features[0]; if (!f) return;
        if (e.originalEvent) e.originalEvent._airportClick = true;   // the general map click (deselect flight) must ignore this click
        clearHover();
        openAirportCard(f.properties.code, e.point);   // v37: airport card (traffic, assistance, contacts, weather)
    });
}
function selectAirport(code) {
    const ap = AIRPORT_DB.find(a => a.code === code); if (!ap) return;
    if (isMobileUI()) mobileSetTab('panel-metar');
    else { const w = document.getElementById('panel-metar'); if (w && w.style.display === 'none') toggleWindow('panel-metar'); }
    document.getElementById('wxSearchInput').value = code;
    smartWeatherSearch();
    showToast((currentLang === 'da' ? 'Skiftet til ' : 'Switched to ') + `${ap.code} – ${ap.name}`);
}

// Hjælpefunktioner til Web Mercator Y <-> Breddegrad, så ruten og flyet følger 100% samme rette linje på kortet
function latToMercatorY(lat) {
    const clamped = Math.max(-85, Math.min(85, lat));
    const rad = clamped * Math.PI / 180;
    return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

function mercatorYToLat(mercY) {
    return (2 * Math.atan(Math.exp(mercY)) - Math.PI / 2) * 180 / Math.PI;
}

// Interpolerer et punkt (t i [0..1]) langs Mercator-linjen, så flyet ligger 100% centreret oven på stregen
function interpolateMercatorPoint(startLon, startLat, destLon, destLat, t) {
    const clampedT = Math.max(0, Math.min(1, t));
    const lon = startLon + (destLon - startLon) * clampedT;
    const y1 = latToMercatorY(startLat);
    const y2 = latToMercatorY(destLat);
    const lat = mercatorYToLat(y1 + (y2 - y1) * clampedT);
    return [lon, lat];
}
