// Bingo Watch – game.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// ================= GAME SAFETY + CALLER TOOLS =================
function confirmNewGame() {
    if (drawnNumbers.length === 0 || confirm(currentLang === 'da'
        ? `Start et nyt spil? De ${drawnNumbers.length} trukne tal bliver nulstillet.`
        : `Start a new game? The ${drawnNumbers.length} drawn numbers will be cleared.`)) resetGame();
}

// --- save / restore the running game (survives reloads and browser crashes) ---
const GAME_KEY = 'bingoWatchGameV1';
let currentRound = 1, gameRestoring = false, gameLoaded = false;
function saveGame() {
    if (gameRestoring || !gameLoaded) return;   // don't overwrite a saved game before it is restored
    try {
        const flights = {};
        drawnNumbers.forEach(n => { const p = activePlaneMarkers[n]; if (p) flights[n] = { dep: p.depAirport.code, dest: p.destAirport.code, seed: p.routeSeed, stdMs: p.stdMs, reg: p.reg, squawk: p.squawk, flown: p.flownDistNm }; });
        localStorage.setItem(GAME_KEY, JSON.stringify({ v: 1, t: Date.now(), drawn: drawnNumbers, startMs: startTime ? startTime.getTime() : null,
            round: currentRound, lang: currentLang, flights }));
    } catch (e) {}
}
setInterval(() => { if (drawnNumbers.length) saveGame(); }, 10000);   // keeps aircraft progress fresh
window.addEventListener('beforeunload', saveGame);
function restoreGame() {
    let st = null;
    try { st = JSON.parse(localStorage.getItem(GAME_KEY) || 'null'); } catch (e) {}
    if (!st || st.v !== 1) { gameLoaded = true; setRound(1, true); return; }
    if (st.lang && st.lang !== currentLang) setLanguage(st.lang);
    setRound(st.round || 1, true);
    if (!Array.isArray(st.drawn) || !st.drawn.length) { gameLoaded = true; return; }
    gameRestoring = true;
    const elapsedS = Math.max(0, (Date.now() - (st.t || Date.now())) / 1000);
    st.drawn.forEach(n => {
        if (drawnNumbers.includes(n) || n < 1 || n > maxNumber) return;
        drawnNumbers.push(n);
        const cell = document.getElementById('cell-' + n); if (cell) cell.classList.add('active');
        const f = createFlightData(n, st.flights && st.flights[n]);
        const saved = st.flights && st.flights[n];
        if (saved && typeof saved.flown === 'number') f.flownDistNm = Math.min(f.totalDistNm, saved.flown + elapsedS * (f.nmps || CONSTANT_NM_PER_SECOND));
        addRadarPlane(f);
        updateLog(f);
    });
    if (st.startMs) { startTime = new Date(st.startMs); clearInterval(statsInterval); statsInterval = setInterval(updateStats, 1000); updateStats(); }
    showCurrentNumber();
    updateCommonUI();
    gameRestoring = false;
    gameLoaded = true;
    saveGame();
    showToast(currentLang === 'da' ? `Spillet er gendannet – ${drawnNumbers.length} tal trukket` : `Game restored – ${drawnNumbers.length} numbers drawn`);
}

// --- round: what is being played for (1 row / 2 rows / full card) ---
function setRound(r, silent) {
    currentRound = Math.min(3, Math.max(1, r | 0));
    document.querySelectorAll('.round-seg button').forEach(b => b.classList.toggle('active', +b.dataset.round === currentRound));
    renderStage();
    if (!silent) { saveGame(); showToast((currentLang === 'da' ? 'Der spilles nu om: ' : 'Now playing for: ') + roundName()); }
}
const roundName = (r = currentRound) => translations[currentLang]['round' + r];

// --- the last five numbers ---
function updateRecent() {
    const prev = drawnNumbers.slice(-6, -1).reverse();
    const html = prev.map(n => `<span class="rc">${n}</span>`).join('');
    const el = document.getElementById('recentStrip');
    if (el) el.innerHTML = prev.length ? `<span class="rc-label">${translations[currentLang].statPrev}</span>${html}` : '';
    renderStage();
}

// --- big screen for a projector / TV ---
function toggleStage(open) {
    const on = open === undefined ? !document.body.classList.contains('stage-open') : !!open;
    document.body.classList.toggle('stage-open', on);
    document.getElementById('stage').setAttribute('aria-hidden', on ? 'false' : 'true');
    if (on) { renderStage(true); if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); }
    else if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}
function renderStage(full) {
    const st = document.getElementById('stage');
    if (!st || !document.body.classList.contains('stage-open')) return;
    const grid = document.getElementById('stageGrid');
    if (full || grid.children.length !== maxNumber) {
        grid.innerHTML = '';
        for (let i = 1; i <= maxNumber; i++) { const d = document.createElement('div'); d.className = 'sg'; d.id = 'sg-' + i; d.textContent = i; grid.appendChild(d); }
    }
    const last = drawnNumbers[drawnNumbers.length - 1];
    for (let i = 1; i <= maxNumber; i++) { const d = document.getElementById('sg-' + i); d.className = 'sg' + (drawnNumbers.includes(i) ? ' on' : '') + (i === last ? ' last' : ''); }
    const num = document.getElementById('stageNumber');
    if (num.textContent !== String(last || '--')) { num.textContent = last || '--'; num.classList.remove('pop'); void num.offsetWidth; if (last) num.classList.add('pop'); }
    const t = translations[currentLang];
    document.getElementById('stageLingo').textContent = last ? lingoFor(last) : '';
    document.getElementById('stageRecent').innerHTML = drawnNumbers.slice(-6, -1).reverse().map(n => `<span>${n}</span>`).join('');
    document.getElementById('stageRound').textContent = `${t.roundLabel}: ${roundName()}`;
    document.getElementById('stageCount').textContent = `${drawnNumbers.length} / ${maxNumber}`;
    const sp = document.getElementById('stageParty'); if (sp) { sp.textContent = (typeof partyText !== 'undefined' && partyText.trim()) ? '🎉 ' + partyText.trim() + ' 🎉' : ''; sp.classList.toggle('show', !!sp.textContent); }
}
