// Bingo Watch – attract.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// =====================================================================
// ATTRACT MODE: when nothing happens, the camera tours the OCC map
// =====================================================================
const attract = { on: false, delay: 0, last: Date.now(), step: 0, timer: 0, saved: null, lastMouse: null, startedAt: 0 };
try { attract.delay = +(localStorage.getItem('bingoAttract') || 0); } catch (e) {}
function setAttractDelay(min) { attract.delay = min; try { localStorage.setItem('bingoAttract', String(min)); } catch (e) {} noteActivity(); }
function noteActivity(fromDraw) {
    attract.last = Date.now();
    if (attract.on && (fromDraw || Date.now() - attract.startedAt > 2500)) stopAttract();   // short grace period right after starting
}
['mousedown', 'keydown', 'touchstart', 'wheel'].forEach(ev => window.addEventListener(ev, () => noteActivity(), { passive: true, capture: true }));
window.addEventListener('mousemove', e => {
    const p = attract.lastMouse; attract.lastMouse = [e.clientX, e.clientY];
    if (p && Math.hypot(e.clientX - p[0], e.clientY - p[1]) > 12) noteActivity();
}, { passive: true });
setInterval(() => {
    const sel = document.getElementById('attractSelect'); if (sel && +sel.value !== attract.delay) sel.value = String(attract.delay);
    if (!attract.delay || attract.on || !map || document.body.classList.contains('stage-open') || isSpinning || document.getElementById('start-overlay').style.display !== 'none' && document.getElementById('start-overlay').offsetParent) return;
    if (Date.now() - attract.last > attract.delay * 60000) startAttract();
}, 5000);
function startAttract() {
    if (!map || attract.on) return;
    attract.on = true; attract.step = 0; attract.startedAt = Date.now();
    releaseTracking(true);
    if (focusedFlightNum !== null) clearFlightSelection();
    if (typeof santa !== 'undefined' && santa.follow) toggleSantaFollow(false);
    const c = map.getCenter();
    attract.saved = { center: [c.lng, c.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() };
    document.body.classList.add('attract');
    attractStep();
    attract.timer = setInterval(attractStep, 11000);
    setTimeout(() => { attract.last = Date.now(); }, 0);
}
function stopAttract() {
    if (!attract.on) return;
    attract.on = false; clearInterval(attract.timer);
    document.body.classList.remove('attract');
    if (map && attract.saved) { map.stop(); map.flyTo({ ...attract.saved, duration: 1400 }); }
}
function attractStep() {
    if (!attract.on || !map) return;
    const da = currentLang === 'da';
    const flights = Object.values(activePlaneMarkers).filter(p => !p.landed);
    const kinds = ['world'];
    if (flights.length) kinds.push('flight', 'flight');
    kinds.push('airport');
    if (season === 'xmas') kinds.push('santa');
    const kind = attract.step % 4 === 0 ? 'world' : kinds[1 + Math.floor(Math.random() * (kinds.length - 1))] || 'airport';
    attract.step++;
    let title = '', sub = '';
    if (kind === 'world') {
        const lon = (map.getCenter().lng + 100) % 360 - 180;
        map.flyTo({ center: [lon, isGlobeMode ? 25 : 30], zoom: isGlobeMode ? 1.9 : 2.2, pitch: 0, bearing: 0, duration: 7000, curve: 1.3, essential: true });
        title = da ? 'Verden lige nu' : 'The world right now';
        sub = da ? `${flights.length} fly i luften · ${drawnNumbers.length} af 90 tal trukket` : `${flights.length} aircraft airborne · ${drawnNumbers.length} of 90 numbers drawn`;
    } else if (kind === 'flight') {
        const p = flights[Math.floor(Math.random() * flights.length)];
        map.flyTo({ center: [p.lon, p.lat], zoom: 5.2, pitch: 50, bearing: (p.headingDeg || 0) - 20, duration: 6500, curve: 1.5, essential: true });
        const alt = Math.round(altAtNm(p, p.flownDistNm) / 100);
        title = `${p.flightNo} · ${p.depAirport.code} → ${p.destAirport.code}`;
        sub = `${p.depAirport.name} → ${p.destAirport.name} · FL${String(alt).padStart(3, '0')} · ${p.spd} kts`;
    } else if (kind === 'santa') {
        const st = santaState();
        map.flyTo({ center: [st.lon, st.lat], zoom: 4.2, pitch: 40, bearing: 0, duration: 6500, essential: true });
        title = '🎅 ' + (da ? 'Julemanden' : 'Santa'); sub = document.getElementById('spWhere').textContent;
    } else {
        const ap = AIRPORT_DB[Math.floor(Math.random() * AIRPORT_DB.length)];
        map.flyTo({ center: [ap.lon, ap.lat], zoom: 6.2, pitch: 45, bearing: Math.random() * 60 - 30, duration: 6500, curve: 1.4, essential: true });
        title = `${ap.code} · ${ap.name}`;
        sub = da ? 'Lufthavn i Bingo Watch-netværket' : 'Airport in the Bingo Watch network';
    }
    // after arriving, drift slowly
    setTimeout(() => { if (attract.on && map) map.easeTo({ bearing: map.getBearing() + 18, duration: 4200, easing: t => t }); }, 6800);
    const last = drawnNumbers[drawnNumbers.length - 1];
    document.getElementById('acNum').textContent = last || '--';
    document.getElementById('acTitle').textContent = title;
    document.getElementById('acSub').textContent = sub;
    const cap = document.getElementById('attract-caption'); cap.classList.remove('swap'); void cap.offsetWidth; cap.classList.add('swap');
}
