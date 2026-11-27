// Bingo Watch – divert.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// =====================================================================
// DIVERSION via ACARS: in the flight panel, tap ALT1 / ALT2, confirm, and an ACARS message is "sent" to the
// aircraft. The crew answers (WILCO) and the aircraft turns towards the alternate: the flown part of the track
// is kept, a new route (round closed airspace) leads to the alternate, ETA and descent follow.
// =====================================================================

// Re-route p from flown distance atNm to the airport 'code'. Deterministic for a given seed, so a saved game
// can rebuild exactly the same diversion. Returns false if it is not possible.
function applyDivert(p, code, atNm, seed) {
    const alt = AIRPORT_DB.find(a => a.code === code), r = p.route;
    if (!alt || !r || p.landed || alt.code === p.destAirport.code) return false;
    atNm = Math.max(0, Math.min(atNm, r.total - 1));
    const pos = routePosAt(r, atNm), ahead = routePosAt(r, Math.min(r.total, atNm + 2));
    const hdg = gBearing(pos[1], pos[0], ahead[1], ahead[0]);
    const alt0 = altAtNm(p, atNm);                                   // height when the turn starts
    const nr = buildRealisticRoute({ code: 'DIV' + p.num + '-' + Math.round(atNm), lat: pos[1], lon: normLon(pos[0]), name: '' }, alt, seed, { fromAir: { hdg } });
    // keep longitudes continuous with the flown part (tracks may be "unwrapped" past ±180°)
    const shift = Math.round((pos[0] - nr.track[0][0]) / 360) * 360;
    const sh = pts => pts.map(([lo, la]) => [lo + shift, la]);
    const i = routeIndexAt(r, atNm);
    const track = r.track.slice(0, i + 1).concat([pos], sh(nr.track).slice(1));
    const cum = [0];
    for (let k = 1; k < track.length; k++) cum.push(cum[k - 1] + gHav(track[k - 1][1], track[k - 1][0], track[k][1], track[k][0]));
    p.route = { planned: [pos].concat(sh(nr.planned).slice(1)), track, cum, total: cum[cum.length - 1], direct: nr.direct, rwyDep: r.rwyDep, rwyArr: nr.rwyArr };
    p.divert = { to: alt.code, from: (p.divert && p.divert.from) || p.destAirport.code, atNm, alt0, seed };
    (p.diverts = p.diverts || []).push({ to: alt.code, atNm, seed });   // saved with the game, replayed on restore
    p.destAirport = alt; p.destLat = alt.lat; p.destLon = alt.lon;
    p.totalDistNm = Math.max(Math.ceil(atNm) + 1, Math.round(p.route.total));
    p.durMin = Math.max(15, Math.round(p.totalDistNm / p.spd * 60));
    p.eta = new Date(p.stdMs + p.durMin * 60000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    p._prof = null; p._segs = null; p._doneFeats = null; p._alts = null;
    refreshDivertedRow(p);
    return true;
}
// The flight log row and its detail card show the new destination and ETA
function refreshDivertedRow(p) {
    const row = document.getElementById('log-entry-' + p.num);
    if (row) {
        const tds = row.querySelectorAll('td');
        if (tds[3]) tds[3].innerHTML = `${p.destAirport.code}<span class="divert-tag" title="${currentLang === 'da' ? 'Omdirigeret' : 'Diverted'}">↪</span>`;
        if (tds[4]) tds[4].innerText = p.eta;
    }
    const det = document.getElementById('log-detail-' + p.num);
    const items = det ? det.querySelectorAll('.flight-detail-item') : [];
    if (items[1]) items[1].innerHTML = `<span class="flight-detail-label">${currentLang === 'da' ? 'Destination' : 'Destination'} (${p.destAirport.code})</span>` +
        `<span class="flight-detail-val" style="font-family:inherit; font-size:10.5px;">${p.destAirport.name} <em>(${currentLang === 'da' ? 'omdirigeret fra' : 'diverted from'} ${p.divert.from})</em></span>`;
}

// ---- ACARS dialogue in the flight panel ----
const acars = {};          // num -> { code, state: 'confirm' | 'sent' }
function acarsBox(p) {
    const a = acars[p.num], da = currentLang === 'da';
    if (!a) return '';
    const alt = AIRPORT_DB.find(x => x.code === a.code); if (!alt) return '';
    const pos = [p.lat, p.lon], nm = Math.round(gHav(pos[0], pos[1], alt.lat, alt.lon)), mins = Math.round(nm / p.spd * 60);
    const min = mins < 60 ? mins + ' min' : Math.floor(mins / 60) + (da ? ' t ' : ' h ') + (mins % 60) + ' min';
    const msg = `DIVERT ${alt.code} – ${alt.name.toUpperCase()}`;
    if (a.state === 'confirm') return `<div class="acars-box">
        <div class="acars-title"><span class="material-icons-outlined">mark_email_unread</span>${da ? 'Send ACARS til' : 'Send ACARS to'} ${p.flightNo}?</div>
        <div class="acars-msg">${msg}</div>
        <div class="acars-sub">${da ? `Ca. ${nm} NM direkte · ${min} · ny destination ${alt.code}` : `About ${nm} NM direct · ${min} · new destination ${alt.code}`}${typeof payloadFor === 'function' ? (payloadFor(p).cargo ? (da ? ` · ${Math.round(payloadFor(p).totalT)} t last om bord` : ` · ${Math.round(payloadFor(p).totalT)} t cargo on board`) : (da ? ` · ${payloadFor(p).pax} passagerer om bord` : ` · ${payloadFor(p).pax} passengers on board`)) : ''}</div>
        <div class="acars-btns"><button type="button" class="acars-no" onclick="event.stopPropagation(); cancelAcars(${p.num})">${da ? 'Annullér' : 'Cancel'}</button>
        <button type="button" class="acars-yes" onclick="event.stopPropagation(); sendAcarsDivert(${p.num})">${da ? 'Send ACARS' : 'Send ACARS'}</button></div></div>`;
    return `<div class="acars-box sent"><div class="acars-title"><span class="material-icons-outlined">send</span>ACARS ${da ? 'sendt' : 'sent'} · ${msg}</div>
        <div class="acars-sub">${da ? 'Venter på svar fra besætningen…' : 'Waiting for the crew to answer…'}</div></div>`;
}
function askDivert(num, code) {
    const p = activePlaneMarkers[num];
    if (!p || p.landed || !code || code === p.destAirport.code) return;
    acars[num] = { code, state: 'confirm' };
    renderAcars(p);
}
function cancelAcars(num) { delete acars[num]; const p = activePlaneMarkers[num]; if (p) renderAcars(p); }
function sendAcarsDivert(num) {
    const p = activePlaneMarkers[num], a = acars[num];
    if (!p || !a) return;
    a.state = 'sent'; renderAcars(p);
    playSound('click');
    setTimeout(() => {                                   // the crew answers after a moment
        const q = activePlaneMarkers[num]; delete acars[num];
        if (!q || q.landed) { if (q) renderAcars(q); return; }
        const from = q.destAirport.code;
        const ok = applyDivert(q, a.code, q.flownDistNm, Math.floor(Math.random() * 2 ** 31));
        if (!ok) { renderAcars(q); return; }
        playSound('chime');
        showToast(currentLang === 'da' ? `ACARS fra ${q.flightNo}: WILCO – omdirigerer til ${a.code} (fra ${from})` : `ACARS from ${q.flightNo}: WILCO – diverting to ${a.code} (from ${from})`);
        if (focusedFlightNum === num) {                // refresh the panel, keeping it expanded on phones
            const panel = document.getElementById('flight-focus');
            if (panel) panel.dataset.keep = '1';
            openFlightFocus(num); if (typeof renderProfileChart === 'function') renderProfileChart(q);
            if (panel) delete panel.dataset.keep;
        }
        updateFlightRoutesLayer(true);
        if (typeof saveGame === 'function') saveGame();
    }, 2600);
}
function renderAcars(p) {
    const box = document.querySelector('#flight-focus [data-ff="acars"]');
    if (box && focusedFlightNum === p.num) box.innerHTML = acarsBox(p);
}
