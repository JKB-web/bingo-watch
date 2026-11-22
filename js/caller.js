// Bingo Watch – caller.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// =====================================================================
// CALLER SCREEN: a separate window for the caller; the OCC stays on the big screen
// =====================================================================
let callerWin = null;
function callerState() {
    return { drawn: drawnNumbers.slice(), spinning: isSpinning, auto: !!autopilotInterval, round: currentRound, lang: currentLang, stage: document.body.classList.contains('stage-open'),
             attract: attract.on, last: drawnNumbers[drawnNumbers.length - 1] || null, lingo: drawnNumbers.length ? lingoFor(drawnNumbers[drawnNumbers.length - 1]) : '',
             cards: Object.keys(generatedCards || {}).length, dark: wxIsDark(), season };
}
setInterval(() => { if (callerWin && callerWin.closed) { callerWin = null; try { localStorage.removeItem('bingoCallerOpen'); } catch (e) {} } }, 2000);
setTimeout(() => {   // after a reload of this page: offer to reconnect the caller screen with one click
    let was = false; try { was = localStorage.getItem('bingoCallerOpen') === '1'; } catch (e) {}
    const rc = document.getElementById('caller-reconnect');
    if (was && rc) { rc.querySelector('span').textContent = currentLang === 'da' ? 'Genforbind opråber-skærm' : 'Reconnect caller screen'; rc.classList.add('show'); }
}, 1500);
function callerMark(n) {           // tap a number on the caller screen = mark it (for physical balls)
    if (isSpinning || drawnNumbers.includes(n)) return;
    if (!startTime) { startTime = new Date(); statsInterval = setInterval(updateStats, 1000); }
    finalize(n);
}
function callerCheck(id) {
    const g = generatedCards && generatedCards[id];
    if (!g) return null;
    let rows = 0, hit = 0;
    for (let r = 0; r < 3; r++) { let need = 0, h = 0; for (let c = 0; c < 9; c++) { const v = g[c][r]; if (v) { need++; if (drawnNumbers.includes(v)) h++; } } hit += h; if (h === need) rows++; }
    return { rows, hit, ok: rows >= currentRound };
}
function callerShowCheck(id) {
    const win = document.getElementById('panel-verify');
    if (win && win.style.display === 'none') toggleWindow('panel-verify');
    document.getElementById('verify-id').value = id; verifyWin();
}
function openCallerWindow() {
    if (callerWin && !callerWin.closed) { callerWin.focus(); return; }
    callerWin = window.open('', 'bingoCaller', 'width=560,height=860');   // re-uses the window if it is still open
    if (!callerWin) { showToast(currentLang === 'da' ? 'Pop op-vindue blokeret – tillad pop op-vinduer for at åbne opråber-skærmen' : 'Popup blocked – allow popups to open the caller screen'); return; }
    const fill = (w) => {
        w.document.open();
        w.document.write(CALLER_HTML());
        w.document.close();
        // scripts written with document.write are not always executed: insert the logic as a real script element
        const sc = w.document.createElement('script');
        sc.textContent = CALLER_JS;
        w.document.body.appendChild(sc);
    };
    try { fill(callerWin); }
    catch (e) {
        // Only when the file is opened locally (file://): after a reload the old window belongs to the previous
        // page and may not be taken over. Close it and open a fresh one (on https it reconnects by itself).
        try { callerWin.close(); } catch (e2) {}
        callerWin = window.open('', 'bingoCaller_' + Date.now(), 'width=560,height=860');
        if (!callerWin) { showToast(currentLang === 'da' ? 'Pop op-vindue blokeret' : 'Popup blocked'); return; }
        fill(callerWin);
    }
    try { localStorage.setItem('bingoCallerOpen', '1'); } catch (e) {}
    document.getElementById('caller-reconnect').classList.remove('show');
    showToast(currentLang === 'da' ? 'Opråber-skærm åbnet – flyt den til din egen skærm' : 'Caller screen opened – move it to your own monitor');
}
function CALLER_HTML() {
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Bingo Watch – Caller</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">' +
    '<style>' + CALLER_CSS + '</style></head><body>' +
    '<div id="lost" hidden></div>' +
    '<header><span class="brand">✈ BINGO WATCH</span><span id="count"></span></header>' +
    '<section class="now"><div class="num" id="num">--</div><div class="lingo" id="lingo"></div><div class="recent" id="recent"></div></section>' +
    '<button id="next" class="next" onclick="act(\'next\')">NEXT</button>' +
    '<div class="row"><button id="undo" onclick="act(\'undo\')"></button><button id="auto" onclick="act(\'auto\')"></button><button id="banko" class="banko" onclick="act(\'banko\')">BANKO!</button></div>' +
    '<div class="seg" id="round"><button data-r="1" onclick="act(\'round\',1)"></button><button data-r="2" onclick="act(\'round\',2)"></button><button data-r="3" onclick="act(\'round\',3)"></button></div>' +
    '<div class="grid" id="grid"></div>' +
    '<div class="check"><input id="cid" autocomplete="off"><button id="cbtn" onclick="act(\'check\')"></button><button id="cshow" onclick="act(\'show\')"></button></div><div id="cres"></div>' +
    '<div class="row small"><button id="stage" onclick="act(\'stage\')"></button><button id="attr" onclick="act(\'attract\')"></button></div>' +
    '</body></html>';
}
const CALLER_CSS = `
    :root { --bg:#eef0f3; --card:rgba(255,255,255,0.7); --line:rgba(17,20,26,0.1); --text:#15171a; --muted:#6b7079; --acc:#1e3a6e; --acc2:#24467f; --on:#1e3a6e; --onText:#fff; }
    body.dark { --bg:#0c0d10; --card:rgba(255,255,255,0.06); --line:rgba(255,255,255,0.1); --text:#f2f3f5; --muted:#9097a1; --acc:#6f93d6; --acc2:#34589a; --on:#6f93d6; --onText:#0c0d10; }
    body.xmas { --acc:#b3192e; --acc2:#c8253a; --on:#b3192e; --onText:#fff; }
    * { box-sizing:border-box; } html, body { margin:0; }
    body { font-family:Inter, system-ui, sans-serif; background:var(--bg); color:var(--text); padding:12px; display:flex; flex-direction:column; gap:8px; min-height:100vh; -webkit-font-smoothing:antialiased; }
    header { display:flex; justify-content:space-between; align-items:center; font-weight:700; font-size:14px; letter-spacing:.03em; }
    #count { color:var(--muted); font-weight:600; font-variant-numeric:tabular-nums; }
    .now { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:10px 12px 12px; text-align:center; }
    .num { font-size:min(22vw, 18vh, 120px); font-weight:300; line-height:1; letter-spacing:-.05em; color:var(--acc); font-variant-numeric:tabular-nums; }
    .num.pop { animation:pop .5s cubic-bezier(.2,1.3,.3,1); } @keyframes pop { from { transform:scale(.7); opacity:0; } to { transform:none; opacity:1; } }
    .lingo { min-height:20px; font-weight:600; color:var(--acc); font-size:14px; margin-top:4px; }
    .recent { display:flex; gap:6px; justify-content:center; margin-top:8px; min-height:28px; }
    .recent span { min-width:34px; padding:4px 6px; border:1px solid var(--line); border-radius:7px; font-weight:600; font-variant-numeric:tabular-nums; }
    button { font-family:inherit; border:1px solid var(--line); background:var(--card); color:var(--text); border-radius:7px; font-weight:600; font-size:13px; padding:10px; cursor:pointer; }
    button:hover { filter:brightness(1.05); } button:disabled { opacity:.5; cursor:default; }
    .next { font-size:22px; font-weight:700; letter-spacing:.06em; padding:18px; border:none; color:#fff; background:linear-gradient(180deg, var(--acc2), var(--acc)); box-shadow:0 8px 22px rgba(0,0,0,.18); }
    body.dark .next { color:#fff; }
    .row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; } .row.small { grid-template-columns:1fr 1fr; }
    #auto.on { background:var(--on); color:var(--onText); border-color:transparent; }
    .banko { color:var(--acc); border-color:var(--acc); }
    .seg { display:grid; grid-template-columns:repeat(3,1fr); gap:3px; padding:3px; border-radius:8px; background:rgba(127,127,127,.12); }
    .seg button { border:none; background:transparent; padding:7px 4px; font-size:12px; color:var(--muted); }
    .seg button.on { background:var(--card); color:var(--text); box-shadow:0 1px 4px rgba(0,0,0,.12); }
    .grid { display:grid; grid-template-columns:repeat(10, minmax(0,1fr)); gap:4px; }
    .grid button { padding:0; aspect-ratio:1.65; font-size:13px; font-variant-numeric:tabular-nums; color:var(--muted); background:transparent; }
    .grid button.on { background:var(--on); color:var(--onText); border-color:transparent; opacity:.75; }
    .grid button.last { opacity:1; box-shadow:0 0 0 3px rgba(127,127,127,.35); }
    .check { display:grid; grid-template-columns:1fr auto auto; gap:6px; }
    .check input { font:inherit; padding:9px 10px; border:1px solid var(--line); border-radius:7px; background:var(--card); color:var(--text); }
    #cres { min-height:18px; font-size:13px; font-weight:600; }
    #cres.ok { color:#30a46c; } #cres.no { color:var(--muted); } #cres.bad { color:#e5484d; }
    #lost { position:fixed; inset:0; background:rgba(12,13,16,.85); color:#fff; display:flex; align-items:center; justify-content:center; text-align:center; padding:30px; font-weight:600; z-index:9; }
    #lost[hidden] { display:none; }`;
const CALLER_JS = `
    const M = () => { try { return window.opener && !window.opener.closed && window.opener.callerState ? window.opener : null; } catch (e) { return null; } };
    const T = { da: { next:'NÆSTE NUMMER', undo:'↶ Fortryd', auto:'Autopilot', round:['1 række','2 rækker','Fuld plade'], check:'Tjek', show:'Vis på storskærm', ph:'Plade-ID',
                      stage:'Storskærm', attr:'Attract mode', of:'af 90', lost:'Forbindelsen til hovedskærmen er tabt. Tryk på "Genforbind opråber-skærm" på hovedskærmen.',
                      remove:'Fjern tallet {n} fra spillet?', nf:'Plade {id} findes ikke', okTxt:'Gyldig gevinst – {r}', noTxt:'Ikke nok – {r}', rows:['0 rækker','1 række','2 rækker','fuld plade'], nocards:'Ingen plader genereret' },
               en: { next:'NEXT NUMBER', undo:'↶ Undo', auto:'Autopilot', round:['1 row','2 rows','Full card'], check:'Check', show:'Show on big screen', ph:'Card ID',
                      stage:'Big screen', attr:'Attract mode', of:'of 90', lost:'Lost the connection to the main screen. Press "Reconnect caller screen" on the main screen.',
                      remove:'Remove number {n} from the game?', nf:'Card {id} not found', okTxt:'Valid win – {r}', noTxt:'Not enough – {r}', rows:['0 rows','1 row','2 rows','full card'], nocards:'No cards generated' } };
    let sig = '', lastNum = null;
    const grid = document.getElementById('grid');
    for (let i = 1; i <= 90; i++) { const b = document.createElement('button'); b.textContent = i; b.id = 'g' + i; b.onclick = () => act('mark', i); grid.appendChild(b); }
    function act(a, v) {
        const m = M(); if (!m) return;
        const st = m.callerState(), t = T[st.lang] || T.en;
        if (a === 'next') m.drawNumber();
        if (a === 'undo') m.undoLastNumber();
        if (a === 'auto') m.toggleAutopilot();
        if (a === 'banko') m.triggerConfetti();
        if (a === 'round') m.setRound(v);
        if (a === 'stage') m.toggleStage();
        if (a === 'attract') { if (st.attract) m.stopAttract(); else m.startAttract(); }
        if (a === 'mark') { if (st.drawn.includes(v)) { if (confirm(t.remove.replace('{n}', v))) m.removeNumber(v); } else m.callerMark(v); }
        if (a === 'check' || a === 'show') {
            const id = document.getElementById('cid').value.trim(), out = document.getElementById('cres');
            const r = m.callerCheck(id);
            if (!r) { out.className = 'bad'; out.textContent = st.cards ? t.nf.replace('{id}', id || '–') : t.nocards; }
            else { out.className = r.ok ? 'ok' : 'no'; out.textContent = (r.ok ? t.okTxt : t.noTxt).replace('{r}', t.rows[r.rows]) + ' · ' + r.hit + '/15'; }
            if (a === 'show' && r) m.callerShowCheck(id);
        }
        if (a !== 'attract') m.noteActivity();
        setTimeout(render, 30);
    }
    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT') { if (e.key === 'Enter') act('check'); return; }
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); act('next'); }
        const k = e.key.toLowerCase();
        if (k === 'u') act('undo'); if (k === 'a') act('auto'); if (k === 'b') act('banko'); if (k === 'p') act('stage');
    });
    function render() {
        const m = M(), lost = document.getElementById('lost');
        if (!m) { lost.hidden = false; lost.textContent = T.da.lost + ' / ' + T.en.lost; return; }
        lost.hidden = true;
        const s = m.callerState(), t = T[s.lang] || T.en;
        const key = JSON.stringify(s); if (key === sig) return; sig = key;
        document.body.classList.toggle('dark', s.dark); document.body.classList.toggle('xmas', s.season === 'xmas');
        document.getElementById('next').textContent = t.next; document.getElementById('next').disabled = s.spinning || s.drawn.length >= 90;
        document.getElementById('undo').textContent = t.undo; document.getElementById('undo').disabled = !s.drawn.length;
        const au = document.getElementById('auto'); au.textContent = t.auto; au.classList.toggle('on', s.auto);
        document.querySelectorAll('#round button').forEach((b, i) => { b.textContent = t.round[i]; b.classList.toggle('on', s.round === i + 1); });
        document.getElementById('count').textContent = s.drawn.length + ' ' + t.of;
        const num = document.getElementById('num');
        num.textContent = s.spinning ? '…' : (s.last || '--');
        if (s.last !== lastNum && s.last) { num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop'); }
        lastNum = s.last;
        document.getElementById('lingo').textContent = s.lingo;
        document.getElementById('recent').innerHTML = s.drawn.slice(-6, -1).reverse().map(n => '<span>' + n + '</span>').join('');
        for (let i = 1; i <= 90; i++) { const b = document.getElementById('g' + i); b.className = (s.drawn.includes(i) ? 'on' : '') + (i === s.last ? ' last' : ''); }
        document.getElementById('cid').placeholder = t.ph; document.getElementById('cbtn').textContent = t.check; document.getElementById('cshow').textContent = t.show;
        document.getElementById('stage').textContent = t.stage + (s.stage ? ' ✓' : ''); document.getElementById('attr').textContent = t.attr + (s.attract ? ' ✓' : '');
    }
    render(); setInterval(render, 250);`;
