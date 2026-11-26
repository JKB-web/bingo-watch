// Bingo Watch – startup.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// ---- Smooth scrolling: mouse-wheel notches are eased; trackpads keep native (already smooth) scrolling ----
(function () {
    const SEL = '.window-content, .log-table-container, .dock-items-container, .briefing-content, .wx-menu, .autocomplete-items, .raw-text-box';
    const state = new WeakMap();
    function step(el) {
        const st = state.get(el);
        const max = el.scrollHeight - el.clientHeight;
        st.target = Math.max(0, Math.min(max, st.target));
        const diff = st.target - el.scrollTop;
        if (Math.abs(diff) < 0.5) { el.scrollTop = st.target; st.raf = 0; return; }
        el.scrollTop += diff * 0.2;
        st.raf = requestAnimationFrame(() => step(el));
    }
    document.addEventListener('wheel', (e) => {
        if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        const el = e.target.closest && e.target.closest(SEL);
        if (!el || el.scrollHeight <= el.clientHeight + 1) return;
        const isNotch = e.deltaMode !== 0 || (Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
        if (!isNotch) return;                      // trackpad: native
        e.preventDefault();
        let st = state.get(el);
        if (!st) { st = { target: el.scrollTop, raf: 0 }; state.set(el, st); }
        if (!st.raf) st.target = el.scrollTop;
        const px = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * el.clientHeight : e.deltaY;
        st.target += px;
        if (!st.raf) st.raf = requestAnimationFrame(() => step(el));
    }, { passive: false });
})();

// ---- Welcome card: on desktop it is scaled to fit the window, so it never needs a scrollbar ----
function fitBriefingCard() {
    const card = document.querySelector('#start-overlay .briefing-card');
    if (!card) return;
    card.style.transform = '';
    if (window.innerWidth < 900 || window.innerHeight <= 520) return;   // phones/tablets (also landscape): normal scrolling
    const avail = window.innerHeight - 32, h = card.scrollHeight;
    if (h > avail) card.style.transform = `scale(${Math.max(0.6, avail / h).toFixed(3)})`;
}
window.addEventListener('resize', fitBriefingCard);
window.addEventListener('load', fitBriefingCard);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBriefingCard);
renderBriefingNews();
fitBriefingCard();
updateVerifyEmptyState();
document.getElementById('verify-id').addEventListener('keydown', e => { if (e.key === 'Enter') verifyWin(); });
    
