// Bingo Watch – tools.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// --- SHARED MODERN ANIMATIONS: slot reel + particle burst ---
const prefersReducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Rolls a vertical "slot reel" of random values that eases out and lands on finalText. Resolves when it has landed.
function spinReel(container, finalText, randomText, opts = {}) {
    const items = opts.items || 26, duration = prefersReducedMotion() ? 300 : (opts.duration || 1900);
    container.classList.remove('reel-won');
    const reel = document.createElement('div');
    reel.className = 'reel';
    const strip = document.createElement('div');
    strip.className = 'reel-strip';
    let last = null;
    for (let i = 0; i < items - 1; i++) {
        let t = randomText(); let guard = 0;
        while (t === last && guard++ < 5) t = randomText();
        last = t;
        const it = document.createElement('div'); it.className = 'reel-item'; it.textContent = t; strip.appendChild(it);
    }
    const fin = document.createElement('div'); fin.className = 'reel-item reel-final'; fin.textContent = finalText; strip.appendChild(fin);
    reel.appendChild(strip);
    container.innerHTML = ''; container.appendChild(reel);
    const h = reel.getBoundingClientRect().height || 48;
    strip.style.transition = 'none'; strip.style.transform = 'translateY(0)';
    void strip.offsetHeight;
    strip.style.transition = `transform ${duration}ms cubic-bezier(0.12, 0.8, 0.14, 1)`;
    strip.style.transform = `translateY(${-(items - 1) * h}px)`;
    // soft ticks that slow down with the reel
    if (opts.ticks !== false && !prefersReducedMotion()) {
        [0, 90, 190, 300, 430, 590, 790, 1050, 1380].forEach(ms => { if (ms < duration - 200) setTimeout(() => playSound('tick'), ms); });
    }
    return new Promise(res => setTimeout(() => {
        // keep only the landed value (same position), so nothing from the strip can show afterwards
        strip.style.transition = 'none'; strip.style.transform = 'none';
        strip.replaceChildren(fin);
        container.classList.add('reel-won');
        if (opts.burst !== false) particleBurst(container);
        res();
    }, duration + 40));
}
function particleBurst(anchor, n = 14) {
    if (prefersReducedMotion()) return;
    const host = document.createElement('div'); host.className = 'burst';
    for (let i = 0; i < n; i++) {
        const d = document.createElement('i');
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, r = 38 + Math.random() * 30;
        d.style.setProperty('--dx', `${Math.cos(a) * r}px`); d.style.setProperty('--dy', `${Math.sin(a) * r}px`);
        d.style.animationDelay = `${Math.random() * 60}ms`;
        host.appendChild(d);
    }
    anchor.appendChild(host);
    setTimeout(() => host.remove(), 1000);
}

// --- TIE BREAKER LOGIC ---
let tieBusy = false;
function resolveTie() {
    if (tieBusy) return;
    const count = parseInt(document.getElementById('tie-count').value);
    const resultDisplay = document.getElementById('tie-result');
    const label = currentLang === 'da' ? 'Spiller' : 'Player';
    if (!(count >= 2)) {
        resultDisplay.innerHTML = `<div class="reel-idle">${currentLang === 'da' ? 'Mindst 2 spillere' : 'Need 2+ players'}</div>`;
        return;
    }
    tieBusy = true;
    const winner = Math.floor(Math.random() * count) + 1;
    spinReel(resultDisplay, `${label} ${winner}`, () => `${label} ${Math.floor(Math.random() * count) + 1}`, { duration: 2300 })
        .then(() => { playSound('fanfare'); tieBusy = false; });
}

// --- LANGUAGE ---
function applyLanguageTo(root) {
    const t = translations[currentLang];
    root.querySelectorAll('[data-lang]').forEach(el => { const v = t[el.getAttribute('data-lang')]; if (v) el.innerText = v; });
    root.querySelectorAll('[data-lang-html]').forEach(el => { const v = t[el.getAttribute('data-lang-html')]; if (v) el.innerHTML = v; });
    root.querySelectorAll('[data-lang-ph]').forEach(el => { const v = t[el.getAttribute('data-lang-ph')]; if (v) el.placeholder = v; });
    root.querySelectorAll('[data-lang-title]').forEach(el => { const v = t[el.getAttribute('data-lang-title')]; if (v) el.title = v; });
    root.querySelectorAll('[data-lang-tip]').forEach(el => { const v = t[el.getAttribute('data-lang-tip')]; if (v) el.setAttribute('data-tip', v); });
}
function setLanguage(lang) {
    currentLang = lang;
    const t = translations[lang];
    document.documentElement.lang = lang;
    applyLanguageTo(document);
    if (typeof refreshAirportCard === 'function') refreshAirportCard();
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-set-lang') === lang));
    const sel = document.querySelector('#tab-general select.select-input'); if (sel) sel.value = lang;
    document.querySelector('.banko-text').innerText = t.bankoMsg;
    const currentNum = document.getElementById('currentNumber').innerText;
    if (currentNum !== '--') {
        const num = parseInt(currentNum);
        const lingoText = bingoLingoData[lang][num] || `${t.lingoDefault} ${num}`;
        document.getElementById('lingoText').innerHTML = `<span style="color:var(--accent-orange); font-weight:bold;">${lingoText}</span>`;
    } else {
        document.getElementById('lingoText').innerText = t.systemReady;
    }
    if (typeof syncWxMenuUI === 'function') { syncWxMenuUI(); setWxStatus(); }
    if (typeof renderDock === 'function') {
        renderDock();
        document.querySelectorAll('.dock-btn').forEach(b => { const w = document.getElementById(b.dataset.itemId); b.classList.toggle('active', !!w && w.classList.contains('window') && w.style.display !== 'none' && !isMobileUI()); });
    }
    if (focusedFlightNum !== null && activePlaneMarkers[focusedFlightNum]) openFlightFocus(focusedFlightNum);
    updateTrackPill();
    if (typeof updateVerifyEmptyState === 'function') updateVerifyEmptyState();
    if (typeof updateRecent === 'function') updateRecent();
    if (typeof renderBriefingNews === 'function') renderBriefingNews();
    if (typeof updateWxLegend === 'function') updateWxLegend();
    if (document.body.classList.contains('manual-open') && typeof renderManual === 'function') renderManual();
    if (typeof saveGame === 'function') saveGame();
}

// --- PRIZES LOGIC ---
let prizePools = { small: [], big: [] };
function initPrizes(type) {
    const countInput = document.getElementById(type === 'small' ? 'totalSmall' : 'totalBig');
    const count = parseInt(countInput.value) || 0;
    prizePools[type] = Array.from({length: count}, (_, i) => i + 1);
    document.getElementById(type === 'small' ? 'smallCount' : 'bigCount').innerText = `${count}`;
    document.getElementById(type === 'small' ? 'resSmall' : 'resBig').innerHTML = '<div class="reel-idle">--</div>';
    showToast(currentLang === 'da' ? "Gavepulje nulstillet" : "Prize pool reset");
}
const prizeBusy = { small: false, big: false };
function drawPrize(type) {
    if (prizeBusy[type]) return;
    const pool = prizePools[type];
    const resEl = document.getElementById(type === 'small' ? 'resSmall' : 'resBig');
    const boxEl = document.getElementById(type === 'small' ? 'box-small' : 'box-big');
    if (pool.length === 0) {
        resEl.innerHTML = `<div class="reel-idle prize-empty">${currentLang === 'da' ? 'Tom – tryk SET' : 'Empty – press SET'}</div>`;
        return;
    }
    prizeBusy[type] = true;
    const idx = Math.floor(Math.random() * pool.length);
    const winner = pool[idx];
    pool.splice(idx, 1);
    const total = parseInt(document.getElementById(type === 'small' ? 'totalSmall' : 'totalBig').value) || winner;
    boxEl.classList.remove('gift-open'); boxEl.classList.add('gift-wobble');
    spinReel(resEl, '#' + winner, () => '#' + (Math.floor(Math.random() * total) + 1), { duration: 1700 }).then(() => {
        boxEl.classList.remove('gift-wobble'); void boxEl.offsetWidth; boxEl.classList.add('gift-open');
        document.getElementById(type === 'small' ? 'smallCount' : 'bigCount').innerText = `${pool.length}`;
        playSound('chime');
        prizeBusy[type] = false;
    });
}

// --- BINGO CARD GENERATOR & VERIFY ---
function generateAndPrintCards() {
    const players = parseInt(document.getElementById('gen-players').value) || 1;
    const cardsPerPlayer = parseInt(document.getElementById('gen-cards').value) || 1;
    
    generatedCards = {};

    let html = `<html><head><title>Bingo Cards</title><style>
        body{font-family:sans-serif; text-align:center;}
        .page{page-break-after:always; padding:20px;}
        .card{border:2px solid #333; display:inline-block; margin:10px; padding:5px; width:450px;}
        .card-header{background:#333; color:#fff; padding:5px; font-weight:bold; display:flex; justify-content:space-between;}
        table{width:100%; border-collapse:collapse; margin-top:5px;}
        td{border:1px solid #ccc; width:11%; height:50px; text-align:center; font-size:24px; font-weight:bold;}
        .filled{background:#f4f4f4;}
    </style></head><body>`;

    for(let p=1; p<=players; p++) {
        html += `<div class="page"><h1>${currentLang === 'da' ? 'Spiller' : 'Player'} ${p}</h1>`;
        for(let c=1; c<=cardsPerPlayer; c++) {
            const grid = generate90Card();
            const cardId = `${p}-${c}`;
            generatedCards[cardId] = grid;

            html += `<div class="card"><div class="card-header"><span>BINGO</span><span>#${cardId}</span></div><table>`;
            for(let r=0; r<3; r++) {
                html += "<tr>";
                for(let col=0; col<9; col++) {
                    const val = grid[col][r];
                    html += `<td class="${val?'filled':''}">${val || ''}</td>`;
                }
                html += "</tr>";
            }
            html += `</table></div>`;
        }
        html += `</div>`;
    }
    html += `</body></html>`;

    try {
        localStorage.setItem('bingoGeneratedCards', JSON.stringify(generatedCards));
    } catch (e) {
        console.warn('Could not save generated cards to localStorage', e);
    }
    updateVerifyEmptyState();

    const w = window.open('', '', 'width=800,height=600');
    if(!w) {
        showToast(currentLang === 'da' ? "Pop op-vindue blokeret! Tillad pop op-vinduer." : "Popup blocked! Please allow popups.");
    } else {
        w.document.write(html);
        w.document.close();
        w.print();
    }
}

function updateVerifyEmptyState() {
    const ids = Object.keys(generatedCards || {});
    const da = currentLang === 'da';
    const txt = document.getElementById('verify-empty-text');
    const input = document.getElementById('verify-id');
    if (txt) txt.innerText = ids.length === 0
        ? (da ? 'Ingen plader genereret endnu. Lav dem i Card Generator.' : 'No cards generated yet. Create them in the Card Generator.')
        : (da ? `${ids.length} plader klar – indtast et plade-ID (fx ${ids[0]})` : `${ids.length} cards ready – enter a card ID (e.g. ${ids[0]})`);
    if (input) input.disabled = ids.length === 0;
}
function setVerifyStatus(text, kind) {
    const el = document.getElementById('verify-status-text');
    el.className = 'verify-status' + (kind ? ' show ' + kind : '');
    el.innerText = text || '';
}

let verifyBusy = false;
function verifyWin() {
    if (verifyBusy) return;
    const id = document.getElementById('verify-id').value.trim();
    const gridContainer = document.getElementById('verify-grid-render');
    const frame = document.getElementById('verify-frame');
    const empty = document.getElementById('verify-empty');
    const da = currentLang === 'da';

    if (!generatedCards[id]) {
        frame.classList.add('is-hidden'); empty.style.display = '';
        updateVerifyEmptyState();
        setVerifyStatus(Object.keys(generatedCards).length === 0 ? '' : (da ? `Plade "${id || '–'}" findes ikke` : `Card "${id || '–'}" not found`), id ? 'bad' : '');
        const inp = document.getElementById('verify-id'); inp.classList.remove('input-shake'); void inp.offsetWidth; inp.classList.add('input-shake');
        return;
    }
    verifyBusy = true;
    const grid = generatedCards[id];
    empty.style.display = 'none';
    frame.classList.remove('is-hidden', 'scanned'); frame.classList.add('scanning');
    document.getElementById('verify-card-id').innerText = '#' + id;
    setVerifyStatus(da ? 'Scanner plade…' : 'Scanning card…', 'busy');
    gridContainer.innerHTML = '';

    const cells = [], rows = [[], [], []];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) {
        const val = grid[c][r];
        const div = document.createElement('div');
        div.className = 'v-cell' + (val ? '' : ' empty');
        if (val) div.innerText = val;
        div.style.animationDelay = `${(r * 9 + c) * 14}ms`;
        gridContainer.appendChild(div);
        if (val) { const hit = drawnNumbers.includes(val); cells.push({ div, hit }); rows[r].push(hit); }
    }
    const scanMs = prefersReducedMotion() ? 0 : 1100;
    setTimeout(() => {
        frame.classList.remove('scanning'); frame.classList.add('scanned');
        const hits = cells.filter(x => x.hit);
        hits.forEach((x, i) => setTimeout(() => { x.div.classList.add('hit'); playSound('tick'); }, prefersReducedMotion() ? 0 : i * 70));
        const doneAt = (prefersReducedMotion() ? 0 : hits.length * 70) + 150;
        setTimeout(() => {
            let rowWins = 0;
            rows.forEach((rh, r) => {
                if (rh.length && rh.every(Boolean)) {
                    rowWins++;
                    for (let c = 0; c < 9; c++) gridContainer.children[r * 9 + c].classList.add('row-done');
                }
            });
            const rowsTxt = rowWins === 3 ? (da ? 'fuld plade' : 'full card') : (da ? `${rowWins} række${rowWins > 1 ? 'r' : ''}` : `${rowWins} row${rowWins > 1 ? 's' : ''}`);
            if (rowWins >= currentRound) {
                setVerifyStatus(da ? `Gyldig gevinst – ${rowsTxt}` + (rowWins === 3 ? ' · BANKO!' : '') : `Valid win – ${rowsTxt}` + (rowWins === 3 ? ' · BINGO!' : ''), 'win');
                particleBurst(frame, rowWins === 3 ? 22 : 14); playSound(rowWins === 3 ? 'fanfare' : 'chime');
            } else if (rowWins > 0) {
                setVerifyStatus(da ? `Ikke nok – ${rowsTxt}, der spilles om ${roundName().toLowerCase()}` : `Not enough – ${rowsTxt}, playing for ${roundName().toLowerCase()}`, 'none');
            } else setVerifyStatus(da ? `Ingen gevinst · ${hits.length}/${cells.length} tal ramt` : `No win · ${hits.length}/${cells.length} numbers hit`, 'none');
            verifyBusy = false;
        }, doneAt);
    }, scanMs);
}

function clearVerify() {
    document.getElementById('verify-id').value = '';
    document.getElementById('verify-grid-render').innerHTML = '';
    document.getElementById('verify-frame').classList.add('is-hidden');
    document.getElementById('verify-empty').style.display = '';
    setVerifyStatus('');
    updateVerifyEmptyState();
}

function generate90Card() {
    let grid = Array(9).fill().map(() => Array(3).fill(null)); 
    
    let success = false;
    let safetyCounter = 0;
    while(!success && safetyCounter < 5000) {
        safetyCounter++;
        grid = Array(9).fill().map(() => Array(3).fill(null));
        let rowIndices = [];
        for(let r=0; r<3; r++) {
            let indices = [0,1,2,3,4,5,6,7,8].sort(()=>Math.random()-0.5).slice(0,5);
            rowIndices.push(indices);
        }
        
        for(let r=0; r<3; r++) {
            rowIndices[r].forEach(c => {
                grid[c][r] = 1; 
            });
        }
        
        let emptyCol = false;
        for(let c=0; c<9; c++) {
            if(!grid[c][0] && !grid[c][1] && !grid[c][2]) emptyCol = true;
        }
        if(!emptyCol) success = true;
    }
    
    for(let c=0; c<9; c++) {
        let start = c*10 + (c===0?1:0);
        let end = (c===8?90:(c*10+9));
        let pool = []; for(let k=start; k<=end; k++) pool.push(k);
        pool.sort(() => Math.random()-0.5);
        
        let count = (grid[c][0]?1:0) + (grid[c][1]?1:0) + (grid[c][2]?1:0);
        let values = pool.slice(0, count).sort((a,b)=>a-b);
        
        let vIdx = 0;
        for(let r=0; r<3; r++) {
            if(grid[c][r]) {
                grid[c][r] = values[vIdx++];
            }
        }
    }
    return grid;
}
