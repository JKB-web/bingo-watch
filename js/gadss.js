// Bingo Watch – gadss.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// =====================================================================
// GADSS (simulated): an aircraft stops sending position reports for a while.
// Caution (yellow) at 10 min without a report, warning (red) from 15 min.
// =====================================================================
const gadss = { enabled: true, timer: 0 };
try { gadss.enabled = localStorage.getItem('bingoGadss') !== '0'; } catch (e) {}
function setGadssEnabled(on) {
    gadss.enabled = !!on;
    try { localStorage.setItem('bingoGadss', on ? '1' : '0'); } catch (e) {}
    document.querySelectorAll('.gadss-toggle').forEach(c => c.checked = gadss.enabled);
    if (!gadss.enabled) Object.values(activePlaneMarkers).forEach(p => { if (p.gadss) endGadss(p, true); });
}
const rndIn = (a, b) => a + Math.random() * (b - a);
function gadssMinutes(p) { const g = p.gadss; return Math.floor((g.level === 'caution' ? 10 : 15) + (Date.now() - g.levelAt) / 3000); }   // 1 sim-minute ≈ 3 s
function startGadss(p) {
    // most alerts clear again while still yellow; only about one in four turns red
    const now = Date.now(), resolvesEarly = Math.random() < 0.75;
    p.gadss = { level: 'caution', levelAt: now, ack: false, escalateAt: resolvesEarly ? Infinity : now + rndIn(15000, 22000), resolveAt: resolvesEarly ? now + rndIn(8000, 14000) : Infinity };
    applyGadssClass(p); renderGadssBar();                 // quiet: no sound and no pop-up for a caution
}
function escalateGadss(p) {
    const now = Date.now();
    Object.assign(p.gadss, { level: 'warning', levelAt: now, ack: false, escalateAt: Infinity, resolveAt: now + rndIn(15000, 25000) });
    playSound('gadss-warning');                           // one soft two-tone chime, no pop-up
    applyGadssClass(p); renderGadssBar();
}
function endGadss(p, silent) {
    p.gadss = null; gadss.lastEnd = Date.now(); applyGadssClass(p); renderGadssBar();
    // resolved silently: the alert simply disappears
    if (focusedFlightNum === p.num) updateFlightFocus();
}
function ackGadss(num) {
    const p = activePlaneMarkers[num]; if (!p || !p.gadss) return;
    p.gadss.ack = true; applyGadssClass(p); renderGadssBar();
    if (focusedFlightNum === num) updateFlightFocus();
}
function applyGadssClass(p) {
    const lv = p.gadss ? p.gadss.level : null;
    if (p.el) { p.el.classList.toggle('gadss-caution', lv === 'caution'); p.el.classList.toggle('gadss-warning', lv === 'warning'); p.el.classList.toggle('gadss-ack', !!(p.gadss && p.gadss.ack)); }
    const row = document.getElementById('log-entry-' + p.num);
    if (row) { row.classList.toggle('gadss-caution', lv === 'caution'); row.classList.toggle('gadss-warning', lv === 'warning'); }
}
function gadssText(p) {
    const da = currentLang === 'da', m = gadssMinutes(p);
    return p.gadss.level === 'warning' ? (da ? `Tab af positionsrapportering (${m} min)` : `Loss of position reporting (${m} min)`)
                                       : (da ? `Positionsrapport forsinket (${m} min)` : `Position report overdue (${m} min)`);
}
function renderGadssBar() {
    let bar = document.getElementById('gadss-bar');
    if (!bar) { bar = document.createElement('div'); bar.id = 'gadss-bar'; bar.setAttribute('aria-live', 'polite'); document.body.appendChild(bar); }
    const list = Object.values(activePlaneMarkers).filter(p => p.gadss).sort((a, b) => (b.gadss.level === 'warning') - (a.gadss.level === 'warning'));
    const sig = list.map(p => p.num + p.gadss.level + p.gadss.ack + gadssMinutes(p)).join() + currentLang;
    if (bar.dataset.sig === sig) return;
    bar.dataset.sig = sig;
    bar.innerHTML = list.map(p => `<div class="gb-chip ${p.gadss.level}${p.gadss.ack ? ' ack' : ''}">
        <button type="button" class="gb-main" onclick="focusFlightInLog(${p.num})"><span class="gb-dot"></span><b>${p.flightNo}</b><span>${gadssText(p)}</span></button>
        ${p.gadss.ack ? '' : `<button type="button" class="gb-ack" onclick="ackGadss(${p.num})" title="${currentLang === 'da' ? 'Kvittér' : 'Acknowledge'}">✓</button>`}</div>`).join('');
    bar.classList.toggle('show', list.length > 0);
}
function gadssTick() {
    const now = Date.now(), planes = Object.values(activePlaneMarkers);
    planes.forEach(p => {
        if (!p.gadss) return;
        if (p.landed || !gadss.enabled) return endGadss(p, true);
        if (now >= p.gadss.resolveAt) return endGadss(p);
        if (now >= p.gadss.escalateAt) escalateGadss(p);
    });
    if (gadss.enabled) {
        const airborne = planes.filter(p => !p.landed && p.route && p.flownDistNm > 40 && p.totalDistNm - p.flownDistNm > 60);
        const active = planes.filter(p => p.gadss).length;
        if (airborne.length >= 3 && active < 1 && now - (gadss.lastEnd || 0) > 90000 && Math.random() < 0.006) {   // rare: ≈ one every 4–5 min, never two at once
            const c = airborne.filter(p => !p.gadss); if (c.length) startGadss(c[Math.floor(Math.random() * c.length)]);
        }
    }
    renderGadssBar();
}
gadss.timer = setInterval(gadssTick, 1000);
