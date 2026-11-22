// Bingo Watch – state.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

const maxNumber = 90;
let drawnNumbers = [];
let isSpinning = false;
let drawToken = 0; // FIX: identifies the current draw so an old safety timer cannot cancel a newer one
let autopilotInterval = null;
let isMuted = false;
let masterVolume = 1.0;
let manualMode = false;
let currentLang = 'en';
let currentICAO = 'EKOD';
// Map State
let currentLat = 55.47;
let currentLon = 10.33;

// BASEMAP: Esri World Canvas (Light Gray / Dark Gray Base). No API key needed.
// NOTE the tile order is {z}/{y}/{x} (ArcGIS), NOT {z}/{x}/{y}. Max zoom is 16.
// Esri's terms of use apply and the attribution (shown bottom-left) must stay visible.
const ESRI_TILES = {
    light: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
    dark:  ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}']
};
const ESRI_ATTRIBUTION = 'Esri, HERE, Garmin, © OpenStreetMap contributors';

// Bygger et MapLibre-style objekt med index.html's monokrome OCC-æstetik, så vejrlag forbliver knivskarpe
function buildOccMapStyle(theme = 'default') {
    const isDark = theme === 'dark' || theme === 'matrix';
    return {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
            'occ-osm-base': {
                type: 'raster',
                tiles: isDark ? ESRI_TILES.dark : ESRI_TILES.light,
                tileSize: 256,
                maxzoom: 16,
                attribution: ESRI_ATTRIBUTION
            }
        },
        layers: [
            {
                id: 'occ-background',
                type: 'background',
                paint: {
                    'background-color': theme === 'matrix' ? '#000800' : (isDark ? '#101820' : '#f4f7f9')
                }
            },
            {
                id: 'occ-osm-layer',
                type: 'raster',
                source: 'occ-osm-base',
                paint: {
                    // Esri Gray Canvas is already monochrome - keep it crisp, only a light touch of contrast
                    'raster-saturation': -1,
                    'raster-contrast': isDark ? 0.08 : 0.05,
                    'raster-opacity': isDark ? 0.92 : 1
                }
            }
        ]
    };
}

// Real MapLibre Map & Live Weather Layer State
let map = null;
let isGlobeMode = false;
let saved2DView = { center: [10.33, 55.47], zoom: 4.5 };
let currentThemeMode = 'default';
let liveWeatherState = {
    rings: true,
    radar: true,
    jet: false, barbs: false, cloud: false, cat: false, trop: false,
    flow: false, cape: false, conv: false, dust: false, fog: false, frz: false, mslp: false, ptend: false, t2m: false, vis: false, sat: false,
    icing: false, cyclone: false, volcano: false, sigmet: false,
    sun: false
};
let trackedFlightNum = null; // camera follows this aircraft until the user clicks away
let cachedRainViewerData = null;
let activePlaneMarkers = {}; // Maps drawn number -> { marker, el, startLat, startLon, lat, lon, destLat, destLon, stepLat, stepLon }

// Load saved generated cards from localStorage so Verify Win works even after page reload
let generatedCards = {};
try {
    const savedCards = localStorage.getItem('bingoGeneratedCards');
    if (savedCards) generatedCards = JSON.parse(savedCards);
} catch (e) {
    console.warn('Could not load saved cards from localStorage', e);
}

let soundConfig = { 'gadss-caution': true, 'gadss-warning': true, tick: true, chime: true, fanfare: true, jingle: true, pop: true, chirp: true, spooky: true, 'spooky-fanfare': true, 'newyear-fanfare': true, 'jingle-fanfare': true, 'fanfare-xmas': true };
let startTime = null;
let statsInterval = null;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- FETCH HELPERS ---
// fetch() with a hard timeout so a hanging server can never block the UI/map
function fetchTimeout(url, opts = {}, ms = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// aviationweather.gov and NOAA send NO CORS headers, so a browser page cannot call them directly.
// BEST FIX: deploy a free Cloudflare Worker that adds CORS headers and paste its URL here, e.g.
//   const WX_PROXY_WORKER = 'https://your-worker.your-name.workers.dev/?url=';
const WX_PROXY_WORKER = '';

// Races all proxies IN PARALLEL (fastest valid answer wins) and rejects HTML error pages / empty bodies.
async function fetchWithFallback(targetUrl, asJson = false) {
    const proxies = [];
    if (WX_PROXY_WORKER) proxies.push((u) => WX_PROXY_WORKER + encodeURIComponent(u));
    proxies.push(
        (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
    );
    return Promise.any(proxies.map(async (build) => {
        const res = await fetchTimeout(build(targetUrl), {}, 5000);
        if (res.status === 204) throw new Error('No content');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const body = (await res.text()).trim();
        if (!body || body.startsWith('<')) throw new Error('Not data (empty or HTML error page)');
        return asJson ? JSON.parse(body) : body;
    }));
}
