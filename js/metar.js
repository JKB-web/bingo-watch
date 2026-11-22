// Bingo Watch – metar.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// --- AUTOCOMPLETE & REAL NOAA/AVIATIONWEATHER FETCH ---
function setupAutocomplete() {
    const inp = document.getElementById("wxSearchInput");
    // FIX: Enter now runs the search
    inp.addEventListener("keydown", function(e) {
        if (e.key === 'Enter') { e.preventDefault(); closeAutocomplete(); smartWeatherSearch(); }
    });
    inp.addEventListener("input", function() {
        const val = this.value;
        closeAutocomplete();
        if (!val) return false;
        
        const list = document.createElement("DIV");
        list.setAttribute("id", "autocomplete-list");
        list.setAttribute("class", "autocomplete-items");
        this.parentNode.appendChild(list);

        AIRPORT_DB.forEach(airport => {
            if (airport.name.toLowerCase().includes(val.toLowerCase()) || airport.code.toLowerCase().includes(val.toLowerCase())) {
                const item = document.createElement("DIV");
                item.innerHTML = `<strong>${airport.code}</strong> - ${airport.name}`;
                item.innerHTML += `<input type='hidden' value='${airport.code}'>`;
                item.addEventListener("click", function() {
                    inp.value = this.getElementsByTagName("input")[0].value;
                    closeAutocomplete();
                    smartWeatherSearch();
                });
                list.appendChild(item);
            }
        });
    });
    document.addEventListener("click", function (e) {
        if(e.target.id !== "wxSearchInput") closeAutocomplete();
    });
}
function closeAutocomplete() {
    const list = document.getElementById("autocomplete-list");
    if(list) list.remove();
}

function smartWeatherSearch() {
    const inputEl = document.getElementById('wxSearchInput');
    let input = inputEl.value.trim();
    if(!input) return;
    const q = input.toLowerCase();

    // FIX: exact ICAO match wins over a partial name match
    let found = AIRPORT_DB.find(a => a.code.toLowerCase() === q)
             || AIRPORT_DB.find(a => a.name.toLowerCase().includes(q));

    if(found) {
        currentICAO = found.code;
        inputEl.value = found.code;
        currentLat = found.lat;
        currentLon = found.lon;
        updateBackgroundMap();
        loadOccTacticalOverlay();
        fetchWeatherData(found.code);
    } else if (/^[a-z]{4}$/i.test(input)) {
        currentICAO = input.toUpperCase();
        inputEl.value = currentICAO;
        loadOccTacticalOverlay();
        fetchWeatherData(currentICAO);
        showToast(currentLang === 'da' ? `${currentICAO} er ikke i lufthavnslisten – kun vejr, kortet er ikke flyttet.` : `${currentICAO} is not in the airport list - weather only, map not moved.`);
    } else {
        showToast(currentLang === 'da' ? "Lufthavnen blev ikke fundet. Prøv en 4-bogstavs ICAO-kode." : "Airport not found in DB. Try 4-letter ICAO code.");
    }
}

function zoomMap(dir) {
    if (!map) return;
    if (dir === 'in') map.zoomIn();
    if (dir === 'out') map.zoomOut();
}

function updateBackgroundMap() {
    if (map) {
        releaseTracking(true);
        map.flyTo({ center: [currentLon, currentLat], duration: 1000 });
    }
}

// REAL WEATHER FETCH FOR #panel-metar (METAR Only)
let wxRequestId = 0;
async function fetchWeatherData(icao) {
    const myId = ++wxRequestId;
    const stale = () => myId !== wxRequestId;
    const rawEl = document.getElementById('metarRawText');
    rawEl.innerText = `Fetching live METAR for ${icao}...`;

    let metarLoaded = false;

    // Strategy 1: AviationWeather.gov JSON API (via CORS proxies)
    try {
        const data = await fetchWithFallback(`https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`, true);
        if (stale()) return;
        if (Array.isArray(data) && data.length > 0 && data[0].rawOb) {
            parseAndDisplayMetarString(data[0].rawOb);
            metarLoaded = true;
        }
    } catch (e) {
        console.warn('AviationWeather JSON API failed:', e);
    }
    if (stale()) return;

    // Strategy 2: NOAA TGFTP text server (via CORS proxies)
    if (!metarLoaded) {
        try {
            const text = await fetchWithFallback(`https://tgftp.nws.noaa.gov/data/observations/metar/stations/${icao}.TXT`, false);
            if (stale()) return;
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            const metar = lines.find(l => /\b\d{6}Z\b/.test(l));
            if (metar) {
                parseAndDisplayMetarString(metar);
                metarLoaded = true;
            }
        } catch (e) {
            console.warn('NOAA METAR text failed:', e);
        }
    }
    if (stale()) return;

    // Strategy 3: Open-Meteo model data (CORS-enabled)
    const ap = AIRPORT_DB.find(a => a.code === icao);
    if (!metarLoaded && ap) {
        try {
            const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${ap.lat}&longitude=${ap.lon}&current=temperature_2m,dew_point_2m,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility&wind_speed_unit=kn&forecast_days=1`;
            const res = await fetchTimeout(omUrl, {}, 8000);
            if (stale()) return;
            if (res.ok) {
                const om = await res.json();
                const c = om.current;
                if (c) {
                    const now = new Date();
                    const day = String(now.getUTCDate()).padStart(2, '0');
                    const hh = String(now.getUTCHours()).padStart(2, '0');
                    const mm = String(now.getUTCMinutes()).padStart(2, '0');

                    const wDir = String(Math.round(c.wind_direction_10m || 0)).padStart(3, '0');
                    const wSpd = String(Math.round(c.wind_speed_10m || 0)).padStart(2, '0');
                    const temp = Math.round(c.temperature_2m || 0);
                    const dew = Math.round(c.dew_point_2m || 0);
                    const fmtT = (v) => (v < 0 ? 'M' + String(Math.abs(v)).padStart(2, '0') : String(v).padStart(2, '0'));
                    const qnh = Math.round(c.pressure_msl || 1013);
                    const visM = Math.min(9999, Math.round(c.visibility || 9999));

                    const constructedMetar = `${icao} ${day}${hh}${mm}Z AUTO ${wDir}${wSpd}KT ${String(visM).padStart(4, '0')} ${fmtT(temp)}/${fmtT(dew)} Q${String(qnh).padStart(4, '0')} (MODEL DATA - OPEN-METEO, NOT AN OFFICIAL METAR)`;
                    parseAndDisplayMetarString(constructedMetar);
                    metarLoaded = true;
                }
            }
        } catch (err) {
            console.warn('Open-Meteo fallback failed:', err);
        }
    }
    if (stale()) return;

    if (!metarLoaded) {
        rawEl.innerText = ap
            ? (currentLang === 'da' ? `Ingen METAR for ${icao} (stationen udsender måske ikke METAR, eller vejrtjenesten kan ikke nås).` : `No METAR available for ${icao} (station may not issue METARs, or the weather service/proxies are unreachable).`)
            : (currentLang === 'da' ? `Ingen METAR for ${icao} (ukendt lufthavn, og ingen live-kilde kan nås).` : `No METAR available for ${icao} (unknown airport and no live source reachable).`);
        ['wx-wind', 'wx-temp', 'wx-vis', 'wx-qnh'].forEach(id => { const el = document.getElementById(id); if (el) el.innerText = '--'; });
    }
}

function updateWxTimestamp() {
    const el = document.getElementById('wxLastUpdated');
    if (!el) return;
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    el.innerText = `UPD ${hh}:${mm}Z`;
}

async function refreshAllWeatherData(manual = false) {
    const btn = document.getElementById('wxRefreshBtn');
    if (btn) btn.style.transform = 'rotate(360deg)';
    try {
        cachedRainViewerData = null;
        wxSigmet.data = null;
        if (manual) wxCyclones.t = 0;
        await Promise.allSettled([
            fetchWeatherData(currentICAO),
            loadRealRainViewerLayers(),
            fetchLiveAtmosphere(!!manual),
            (liveWeatherState.sigmet ? renderWxLayer('sigmet', true) : Promise.resolve()),
            (liveWeatherState.cyclone ? renderWxLayer('cyclone', true) : Promise.resolve())
        ]);
        if (map) bringOccToTop();
        updateWxTimestamp();
        if (manual) showToast(currentLang === 'da' ? 'Vejrdata opdateret' : 'Weather data refreshed');
    } finally {
        setTimeout(() => { if (btn) btn.style.transform = 'rotate(0deg)'; }, 350);
    }
}

// Automatisk opdatering af vejrdata (METAR, nedbørsradar og vind) hvert 10. minut
setInterval(() => {
    refreshAllWeatherData(false);
}, 10 * 60 * 1000);

function parseAndDisplayMetarString(metar) {
    const rawEl = document.getElementById('metarRawText');
    rawEl.innerText = metar;
    updateWxTimestamp();

    const windMatch = metar.match(/(\d{3}|VRB)(\d{2,3})(G\d{2,3})?KT/);
    const tempMatch = metar.match(/(M?\d{2})\/(M?\d{2})/);
    const qnhMatch = metar.match(/Q(\d{4})/);
    const altMatch = metar.match(/A(\d{4})/);
    const visMatch = metar.match(/\s(\d{4})\s/);
    const smMatch = metar.match(/\s(\d+)SM\s/);
    const cavok = metar.includes("CAVOK");

    document.getElementById('wx-wind').innerText = (windMatch && parseInt(windMatch[2], 10) > 0) ? `${windMatch[1]}°/${windMatch[2]}kt` : "CALM";
    document.getElementById('wx-temp').innerText = tempMatch ? `${tempMatch[1].replace('M','-')}°C` : "N/A";
    if (qnhMatch) {
        document.getElementById('wx-qnh').innerText = `${qnhMatch[1]}`;
    } else if (altMatch) {
        const hpa = Math.round((parseInt(altMatch[1]) / 100) * 33.8639);
        document.getElementById('wx-qnh').innerText = `${hpa}`;
    } else {
        document.getElementById('wx-qnh').innerText = "1013";
    }

    if (cavok) {
        document.getElementById('wx-vis').innerText = "10km+";
    } else if (visMatch) {
        const vis = parseInt(visMatch[1]);
        document.getElementById('wx-vis').innerText = vis >= 9999 ? "10km+" : (vis < 1000 ? vis + "m" : (vis / 1000) + "km");
    } else if (smMatch) {
        document.getElementById('wx-vis').innerText = `${smMatch[1]} SM`;
    } else {
        document.getElementById('wx-vis').innerText = "10km+";
    }
}
