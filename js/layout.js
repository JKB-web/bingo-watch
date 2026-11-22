// Bingo Watch – layout.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

const MOBILE_MQ = '(max-width: 768px), (max-height: 520px) and (max-width: 1100px)';   // phones in portrait AND landscape
const isMobileUI = () => window.matchMedia(MOBILE_MQ).matches;
function ensureInitialPositions() {
    const G = 10;                          // same 10px grid that dragging and resizing snap to
    const cw = document.querySelector('.content-wrapper');
    const W = cw ? cw.clientWidth : window.innerWidth, H = cw ? cw.clientHeight : window.innerHeight;
    const RIGHT = 66;                      // toolbar (10 + 44) + gap
    const BOTTOM = 76;                     // HUD strip at the bottom centre
    const snap = v => Math.round(v / 10) * 10;
    const px = v => snap(v) + 'px';
    const place = {};
    const logW = 300, deckW = 340;
    const deckH = Math.min(510, H - G - BOTTOM);
    const logH = deckH;                    // Active Flights starts as tall as the Flight Deck next to it
    place['panel-log'] = { left: G, top: G, w: logW, h: logH, show: true };
    const deckL = G + logW + G;
    place['panel-control'] = { left: deckL, top: G, w: deckW, h: deckH, show: true };
    const rightRoom = W - RIGHT - (deckL + deckW + G);      // free width to the right of the deck
    if (rightRoom >= 340) {
        const gw = Math.min(420, rightRoom);
        const gridH = Math.min(420, Math.max(300, Math.round((H - 3 * G - BOTTOM) * 0.56)));
        place['panel-grid'] = { right: RIGHT, top: G, w: gw, h: gridH, show: true };
        const mTop = G + gridH + G, mH = Math.min(330, H - mTop - G);
        place['panel-metar'] = { right: RIGHT, top: mTop, w: gw, h: Math.max(240, mH), show: false };
    } else {
        // narrower screens: grid goes under the flight deck, weather stays closed
        const gTop = G + deckH + G;
        place['panel-grid'] = { left: deckL, top: gTop, w: deckW, h: Math.max(280, H - gTop - G), show: H - gTop - G >= 280 };
        place['panel-metar'] = { right: RIGHT, top: G, w: 360, h: 320, show: false };
    }
    const pTop = G + deckH + G;
    place['panel-prizes'] = { left: deckL, top: Math.min(pTop, H - 360 - G), w: deckW, h: 360, show: false };
    const cx = Math.max(deckL, Math.round(W / 2 - 180));
    place['panel-gen'] = { left: cx, top: 90, w: 360, h: 260, show: false };
    place['panel-verify'] = { left: cx, top: 90, w: 360, h: 380, show: false };
    place['panel-tie'] = { left: cx, top: 90, w: 360, h: 280, show: false };
    place['panel-settings'] = { left: cx, top: 70, w: 380, h: 460, show: false };

    const mobile = isMobileUI();
    for (const [id, pl] of Object.entries(place)) {
        const el = document.getElementById(id);
        if (!el) continue;
        const btn = document.querySelector(`.dock-btn[data-item-id="${id}"]`);
        if (mobile) { el.style.cssText = ''; el.style.display = 'none'; }
        else {
            el.style.top = px(pl.top); el.style.width = px(pl.w); el.style.height = px(pl.h);
            // right-hand windows get a real left position on the grid (snapped down, so they keep clear of the toolbar)
            const left = pl.right !== undefined ? Math.floor((W - pl.right - snap(pl.w)) / 10) * 10 : snap(pl.left);
            el.style.left = left + 'px'; el.style.right = 'auto';
            el.style.display = pl.show ? 'flex' : 'none';
        }
        if (btn) btn.classList.toggle('active', !mobile && pl.show);
    }
    if (mobile) mobileSetTab('map');
}
// keep dragged windows reachable when the browser window shrinks
window.addEventListener('resize', () => {
    if (isMobileUI()) return;
    const cw = document.querySelector('.content-wrapper'); if (!cw) return;
    document.querySelectorAll('.content-wrapper > .window').forEach(w => {
        if (w.style.display === 'none') return;
        const r = w.getBoundingClientRect(), c = cw.getBoundingClientRect();
        if (r.right > c.right - 10) { w.style.left = Math.max(10, Math.floor((c.width - r.width - 66) / 10) * 10) + 'px'; w.style.right = 'auto'; }
        if (r.bottom > c.bottom - 10) w.style.top = Math.max(10, Math.floor((c.height - r.height - 10) / 10) * 10) + 'px';
    });
});

// ---------------- SIMPLE MOBILE VERSION ----------------
// One full-width sheet at a time + a bottom tab bar. Desktop is untouched.
const MOBILE_TABS = { draw: 'panel-control', grid: 'panel-grid', flights: 'panel-log' };
function mobileSetTab(tab) {
    const all = ['panel-log', 'panel-control', 'panel-metar', 'panel-prizes', 'panel-grid', 'panel-gen', 'panel-verify', 'panel-tie', 'panel-settings'];
    const target = MOBILE_TABS[tab] || (tab.startsWith('panel-') ? tab : null);
    all.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = (id === target) ? 'flex' : 'none'; });
    const more = document.getElementById('m-more'); if (more) { more.classList.toggle('open', tab === 'more'); if (tab === 'more') renderMobileMore(); }
    document.body.classList.toggle('m-sheet-open', !!target || tab === 'more');
    const key = target ? (Object.keys(MOBILE_TABS).find(k => MOBILE_TABS[k] === target) || 'more') : tab;
    document.querySelectorAll('#m-nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === key));
}
function mobileNav(tab) {
    const btn = document.querySelector(`#m-nav button[data-tab="${tab}"]`);
    if (btn && btn.classList.contains('active') && tab !== 'map') mobileSetTab('map');   // tap again = back to map
    else mobileSetTab(tab);
}
window.matchMedia(MOBILE_MQ).addEventListener('change', () => { ensureInitialPositions(); if (map) map.resize(); });
