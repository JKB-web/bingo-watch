// Bingo Watch – ui.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// --- CORE FUNCTIONS ---
function initResizeObserver() {
    const ro = new ResizeObserver(entries => {
        for(let entry of entries) {
            const h = entry.contentRect.height;
            const w = entry.contentRect.width;
            const fontSize = Math.min(w * 0.6, h * 0.6);
            const numEl = document.getElementById('currentNumber');
            if(numEl) numEl.style.fontSize = fontSize + 'px';
        }
    });
    const displayContainer = document.querySelector('#panel-control .display-container');
    if(displayContainer) ro.observe(displayContainer);
}

function toggleManualMode(checked) {
    manualMode = checked;
    document.querySelectorAll('#tab-general input[onchange^="toggleManualMode"]').forEach(c => c.checked = checked);
    showToast(manualMode ? (currentLang=='da'?"Manuel Mode Aktiveret":"Manual Mode ON") : (currentLang=='da'?"Manuel Mode Deaktiveret":"Manual Mode OFF"));
}

function printFlightLog() {
    const printWindow = window.open('', '', 'width=600,height=800');
    printWindow.document.write('<html><head><title>Flight Plan Export</title>');
    printWindow.document.write('<style>body{font-family:sans-serif;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:8px;text-align:left;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h1>BINGO WATCH - FLIGHT LOG</h1>');
    printWindow.document.write('<p>Time: ' + new Date().toLocaleString() + '</p>');
    printWindow.document.write('<table><tr><th>#</th><th>Code/Lingo</th></tr>');
    drawnNumbers.forEach(num => {
       const lingo = bingoLingoData[currentLang][num] || '-';
       printWindow.document.write(`<tr><td>${num}</td><td>${lingo}</td></tr>`);
    });
    printWindow.document.write('</table></body></html>');
    printWindow.document.close();
    printWindow.print();
}

function showToast(msg) {
    const t = document.getElementById('toast'); t.innerText = msg; t.className = "show";
    setTimeout(() => { t.className = t.className.replace("show", ""); }, 3000);
}

function toggleMute() { 
    isMuted = !isMuted; 
    const icon = document.getElementById('masterMuteIcon'); 
    icon.innerText = isMuted ? 'volume_off' : 'volume_up';
    showToast(currentLang === 'da' ? (isMuted ? "Lyd fra" : "Lyd til") : (isMuted ? "Mute" : "Sound On"));
}

function setMasterVolume(val) { masterVolume = val / 100; }

function showTab(tabName) {
    document.querySelectorAll('#panel-settings .tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#panel-settings .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    const btns = document.querySelectorAll('#panel-settings .tab-btn');
    if(tabName === 'general') btns[0].classList.add('active');
    if(tabName === 'audio') btns[1].classList.add('active');
    if(tabName === 'visual') btns[2].classList.add('active');
    if(tabName === 'shortcuts') btns[3].classList.add('active');
}

function setCustomColor(varName, value) { document.documentElement.style.setProperty(varName, value); }

function toggleLightDarkQuick() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyThemePreset(isDark ? 'default' : 'dark');
}

function applyThemePreset(preset) {
    const root = document.documentElement;
    const icon = document.getElementById('quickThemeIcon');
    const sel = document.getElementById('themeSelectDropdown');
    if (sel) sel.value = preset;

    currentThemeMode = preset;
    if (preset === 'default') {
        root.removeAttribute('data-theme');
        root.style.cssText = '';
        if (icon) icon.innerText = 'dark_mode';
    } else if (preset === 'dark') {
        root.setAttribute('data-theme', 'dark');
        root.style.cssText = '';
        if (icon) icon.innerText = 'light_mode';
    } else if (preset === 'matrix') {
        root.setAttribute('data-theme', 'dark');
        root.style.setProperty('--primary-blue', '#00ff00');
        root.style.setProperty('--accent-orange', '#00ff00');
        root.style.setProperty('--bg-color', '#000000');
        root.style.setProperty('--window-bg', '#001000');
        root.style.setProperty('--window-bg-alpha', 'rgba(0, 20, 0, 0.92)');
        root.style.setProperty('--text-main', '#00ff00');
        root.style.setProperty('--text-muted', '#009900');
    }

    if (map) {
        map.setStyle(buildOccMapStyle(preset), { diff: false });
        map.once('styledata', () => {
            setTimeout(() => syncAllMapLayersAndProjection(), 150);
        });
    }
}

function renderDock() {
    const container = document.getElementById('dockContainer');
    let items = defaultDockItems;
    
    let savedOrder = null;
    try { savedOrder = JSON.parse(localStorage.getItem('bingoDockOrder')); } catch (e) { console.warn('Dock order unavailable (localStorage blocked?)', e); }
    if(savedOrder && Array.isArray(savedOrder)) {
        const orderedItems = [];
        savedOrder.forEach(id => {
            const found = items.find(i => i.id === id);
            if(found) orderedItems.push(found);
        });
        items.forEach(i => {
            if(!orderedItems.find(o => o.id === i.id)) orderedItems.push(i);
        });
        items = orderedItems;
    }

    container.innerHTML = '';
    items.forEach(item => {
        const btn = document.createElement('div');
        btn.className = 'dock-btn';
        btn.setAttribute('onclick', item.id === 'manual' ? 'openManual()' : `toggleWindow('${item.id}')`);
        btn.setAttribute('draggable', 'true');
        btn.dataset.itemId = item.id; btn.dataset.itemIcon = item.icon; btn.dataset.itemLabel = item.label;
        btn.id = 'dock-btn-' + item.id;
        btn.title = item.label;
        
        let label = item.label;
        if(item.id === 'panel-control') label = translations[currentLang].flightDeck;
        if(item.id === 'panel-grid') label = translations[currentLang].navGrid;
        if(item.id === 'panel-prizes') label = translations[currentLang].prizeTitle;
        if(item.id === 'panel-metar') label = translations[currentLang].weatherTitle;
        if(item.id === 'panel-log') label = translations[currentLang].flightLog;
        if(item.id === 'panel-settings') label = translations[currentLang].settings;
        if(item.id === 'panel-gen') label = translations[currentLang].genTitle;
        if(item.id === 'panel-verify') label = translations[currentLang].verifyTitle;
        if(item.id === 'panel-tie') label = translations[currentLang].tieShort;
        if(item.id === 'manual') label = translations[currentLang].manualLabel;

        btn.title = label;
        btn.innerHTML = `<span class="material-icons-outlined dock-icon">${item.icon}</span><span class="dock-label">${label}</span>`;
        btn.addEventListener('dragstart', handleDragStart); btn.addEventListener('dragover', handleDragOver); btn.addEventListener('drop', handleDrop); btn.addEventListener('dragenter', handleDragEnter); btn.addEventListener('dragleave', handleDragLeave); btn.addEventListener('dragend', handleDragEnd);
        container.appendChild(btn);
    });
}

let dragSrcEl = null;
function handleDragStart(e) { this.style.opacity = '0.4'; dragSrcEl = this; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/html', this.innerHTML); }
function handleDragOver(e) { if (e.preventDefault) e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return false; }
function handleDragEnter() { this.classList.add('over'); }
function handleDragLeave() { this.classList.remove('over'); }
function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (dragSrcEl !== this) {
        const container = document.getElementById('dockContainer');
        const allItems = [...container.querySelectorAll('.dock-btn')];
        const srcIndex = allItems.indexOf(dragSrcEl);
        const targetIndex = allItems.indexOf(this);
        if(srcIndex < targetIndex) { this.after(dragSrcEl); } else { this.before(dragSrcEl); }
        saveDockOrder();
    }
    return false;
}
function handleDragEnd() { this.style.opacity = '1'; document.querySelectorAll('.dock-btn').forEach(item => item.classList.remove('over')); }

function saveDockOrder() { 
    const container = document.getElementById('dockContainer');
    const items = Array.from(container.children).map(btn => btn.dataset.itemId);
    try { localStorage.setItem('bingoDockOrder', JSON.stringify(items)); } catch (e) { console.warn('Could not save dock order', e); }
}

// --- WINDOW DRAG & RESIZE ---
const GRID_SIZE = 10;
const windows = document.querySelectorAll('.window');
let activeWindow = null;
let isResizing = false;
let startX, startY, startW, startH, startL, startT;

windows.forEach(win => {
    const header = win.querySelector('.window-header');
    header.addEventListener('mousedown', (e) => {
        if(e.target.classList.contains('close-btn')) return;
        activeWindow = win; 
        isResizing = false;
        windows.forEach(w => w.style.zIndex = 100); win.style.zIndex = 500;
        startX = e.clientX; startY = e.clientY;
        startL = win.offsetLeft; startT = win.offsetTop;
        document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
    });
    win.addEventListener('mousedown', () => { windows.forEach(w => w.style.zIndex = 100); win.style.zIndex = 500; });

    const resizer = win.querySelector('.window-resizer');
    if(resizer) {
        resizer.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            activeWindow = win;
            isResizing = true;
            windows.forEach(w => w.style.zIndex = 100); win.style.zIndex = 500;
            startX = e.clientX; startY = e.clientY;
            startW = win.offsetWidth; startH = win.offsetHeight;
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        });
    }
});

function onMove(e) {
    if(!activeWindow) return;
    e.preventDefault();
    if(isResizing) {
        let newW = startW + (e.clientX - startX);
        let newH = startH + (e.clientY - startY);
        newW = Math.round(newW / GRID_SIZE) * GRID_SIZE;
        newH = Math.round(newH / GRID_SIZE) * GRID_SIZE;
        activeWindow.style.width = Math.max(200, newW) + 'px';
        activeWindow.style.height = Math.max(100, newH) + 'px';
    } else {
        let newL = startL + (e.clientX - startX);
        let newT = startT + (e.clientY - startY);
        newL = Math.max(0, Math.round(newL / GRID_SIZE) * GRID_SIZE);
        newT = Math.max(0, Math.round(newT / GRID_SIZE) * GRID_SIZE);
        activeWindow.style.left = newL + 'px';
        activeWindow.style.top = newT + 'px';
        activeWindow.style.right = 'auto';
    }
}
function onUp() {
    activeWindow = null;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
}

function toggleDock() {
    document.body.classList.toggle('sidebar-is-open');
    setTimeout(() => { if (map) map.resize(); }, 280);
}
function toggleWindow(id) {
    if (isMobileUI()) { const open = document.getElementById(id).style.display !== 'none'; mobileSetTab(open ? 'map' : id); return; }
    const win = document.getElementById(id); const btn = document.querySelector(`.dock-btn[data-item-id="${id}"]`);
    if (win.style.display === 'none') { win.style.display = 'flex'; windows.forEach(w => w.style.zIndex = 100); win.style.zIndex = 500; if(btn) btn.classList.add('active'); } 
    else { win.style.display = 'none'; if(btn) btn.classList.remove('active'); }
}
function closeWindow(id) {
    if (isMobileUI()) { mobileSetTab('map'); return; }
    const win = document.getElementById(id); const btn = document.querySelector(`.dock-btn[data-item-id="${id}"]`);
    win.style.display = 'none'; if(btn) btn.classList.remove('active');
}
function resetPositions() {
    ensureInitialPositions();
}

function toggleFullscreen() { if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); } else { if (document.exitFullscreen) { document.exitFullscreen(); } } }
function toggleSoundSetting(type, isEnabled) { soundConfig[type] = isEnabled; }
function updateApSpeed() { if(autopilotInterval) { toggleAutopilot(); toggleAutopilot(); } }
function toggleAutopilot() {
    const btn = document.getElementById('fab-auto'); 
    const speedInput = document.getElementById('apSpeed');
    let speed = parseInt(speedInput.value); if(speed < 1) speed = 1;
    if(autopilotInterval) { 
        clearInterval(autopilotInterval); autopilotInterval = null; 
        btn.classList.remove('active'); 
    } else { 
        drawNumber(); autopilotInterval = setInterval(drawNumber, speed * 1000); 
        btn.classList.add('active'); 
    }
}

function updateStats() {
    if(!startTime) return;
    const now = new Date(); const diff = Math.floor((now - startTime) / 1000);
    const m = Math.floor(diff / 60).toString().padStart(2,'0'); const s = (diff % 60).toString().padStart(2,'0');
    document.getElementById('flightTime').innerText = `${m}:${s}`;
}

document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (e.key === 'Escape' && document.body.classList.contains('manual-open')) { closeManual(); return; }   // also from the search field
    if(tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return; // FIX: also ignore SELECT/TEXTAREA
    if(e.key === ' ' && tag === 'BUTTON') return; 

    if (document.body.classList.contains('manual-open')) { const k = e.key.toLowerCase(); if (k === 'escape' || k === 'h') closeManual(); return; }
    switch(e.key.toLowerCase()) {
        case 'h': openManual(); break;
        case ' ': e.preventDefault(); drawNumber(); break;
        case 'b': triggerConfetti(); break;
        case 'a': toggleAutopilot(); break;
        case 'm': toggleMute(); break;
        case 'r': confirmNewGame(); break;
        case 'p': toggleStage(); break;
        case 'o': openCallerWindow(); break;
        case 'escape': if (document.body.classList.contains('stage-open')) toggleStage(false); break;
        case 'l': resetPositions(); break;
        case 'f': toggleFullscreen(); break;
    }
});


function playSound(type) {
    if(isMuted) return;
    if(!soundConfig[type]) return;
    
    try {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        const masterGain = audioCtx.createGain();
        masterGain.gain.value = masterVolume;
        masterGain.connect(audioCtx.destination);

        if (type === 'tick') {
            const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(masterGain);
            osc.type = 'square'; osc.frequency.setValueAtTime(600, now);
            gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now); osc.stop(now + 0.05);

        } else if (type === 'chime') {
            const o1 = audioCtx.createOscillator(); const g1 = audioCtx.createGain();
            o1.connect(g1); g1.connect(masterGain);
            o1.type = 'sine'; o1.frequency.setValueAtTime(600, now);
            g1.gain.setValueAtTime(0, now); g1.gain.linearRampToValueAtTime(0.3, now+0.05); g1.gain.exponentialRampToValueAtTime(0.001, now+1.2);
            o1.start(now); o1.stop(now+1.2);
            const o2 = audioCtx.createOscillator(); const g2 = audioCtx.createGain();
            o2.connect(g2); g2.connect(masterGain);
            o2.type = 'sine'; o2.frequency.setValueAtTime(450, now+0.6);
            g2.gain.setValueAtTime(0, now+0.6); g2.gain.linearRampToValueAtTime(0.3, now+0.65); g2.gain.exponentialRampToValueAtTime(0.001, now+2.0);
            o2.start(now+0.6); o2.stop(now+2.0);
        } else if (type === 'jingle') {
            // sleigh bells: short bright metallic hits in a shake rhythm + a soft two-note bell
            const hit = (t, f, v) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'triangle';
                o.frequency.setValueAtTime(f, t); o.connect(g); g.connect(masterGain);
                g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.16); o.start(t); o.stop(t + 0.18); };
            [0, 0.07, 0.14, 0.28, 0.35, 0.42].forEach((d, i) => { hit(now + d, 2600 + (i % 3) * 420, 0.09); hit(now + d + 0.012, 3900 + (i % 2) * 300, 0.05); });
            [[1318.5, 0.55], [1046.5, 0.8]].forEach(([f, d]) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'sine';
                o.frequency.setValueAtTime(f, now + d); o.connect(g); g.connect(masterGain); g.gain.setValueAtTime(0, now + d);
                g.gain.linearRampToValueAtTime(0.22, now + d + 0.02); g.gain.exponentialRampToValueAtTime(0.001, now + d + 1.2); o.start(now + d); o.stop(now + d + 1.25); });
        } else if (type === 'gadss-caution' || type === 'gadss-warning') {
            const warn = type === 'gadss-warning', notes = warn ? [[784, 0], [587, 0.2]] : [[740, 0], [988, 0.18]];
            notes.forEach(([f, t]) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(masterGain);
                g.gain.setValueAtTime(0, now + t); g.gain.linearRampToValueAtTime(0.07, now + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0008, now + t + 0.35); o.start(now + t); o.stop(now + t + 0.36); });
        } else if (type === 'pop') {
            // firework / balloon pop: filtered noise burst + a little crackle
            const len = 0.35, buf = audioCtx.createBuffer(1, audioCtx.sampleRate * len, audioCtx.sampleRate), d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
            const src = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
            f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.8; src.buffer = buf; src.connect(f); f.connect(g); g.connect(masterGain); g.gain.value = 0.9; src.start(now);
            [0.18, 0.24, 0.31, 0.36].forEach(t => { const o = audioCtx.createOscillator(), gg = audioCtx.createGain(); o.type = 'square'; o.frequency.value = 3000 + Math.random() * 2500;
                o.connect(gg); gg.connect(masterGain); gg.gain.setValueAtTime(0.04, now + t); gg.gain.exponentialRampToValueAtTime(0.0005, now + t + 0.03); o.start(now + t); o.stop(now + t + 0.04); });
        } else if (type === 'chirp') {
            [0, 0.14].forEach((t, k) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'sine';
                o.frequency.setValueAtTime(1800 + k * 300, now + t); o.frequency.exponentialRampToValueAtTime(3200 + k * 400, now + t + 0.09);
                o.connect(g); g.connect(masterGain); g.gain.setValueAtTime(0, now + t); g.gain.linearRampToValueAtTime(0.18, now + t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.12); o.start(now + t); o.stop(now + t + 0.13); });
        } else if (type === 'spooky' || type === 'spooky-fanfare') {
            const notes = type === 'spooky' ? [[220, 0, 0.9]] : [[220, 0, 0.5], [261.6, 0.45, 0.5], [311.1, 0.9, 0.5], [369.9, 1.35, 1.4]];
            notes.forEach(([f, t, len]) => { const o = audioCtx.createOscillator(), o2 = audioCtx.createOscillator(), lfo = audioCtx.createOscillator(), lg = audioCtx.createGain(), g = audioCtx.createGain();
                o.type = 'sawtooth'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 1.5; lfo.frequency.value = 6; lg.gain.value = 6;
                lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
                const flt = audioCtx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 900;
                o.connect(flt); o2.connect(flt); flt.connect(g); g.connect(masterGain);
                g.gain.setValueAtTime(0, now + t); g.gain.linearRampToValueAtTime(0.12, now + t + 0.08); g.gain.exponentialRampToValueAtTime(0.001, now + t + len);
                [o, o2, lfo].forEach(x => { x.start(now + t); x.stop(now + t + len + 0.05); }); });
        } else if (type === 'newyear-fanfare') {
            const notes = [[523.25, 0], [659.25, 0.15], [783.99, 0.3], [1046.5, 0.45], [783.99, 0.75], [1046.5, 0.9]];
            notes.forEach(([f, t]) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'triangle'; o.frequency.value = f; o.connect(g); g.connect(masterGain);
                g.gain.setValueAtTime(0, now + t); g.gain.linearRampToValueAtTime(0.25, now + t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.6); o.start(now + t); o.stop(now + t + 0.65); });
            setTimeout(() => playSound('pop'), 1150); setTimeout(() => playSound('pop'), 1450);
        } else if (type === 'jingle-fanfare') {
            playSound('fanfare-xmas');
        } else if (type === 'fanfare-xmas') {
            // "Jingle Bells" opening phrase (public-domain melody, 1857)
            const E = 659.25, G = 783.99, C = 523.25, D = 587.33, q = 0.22;
            const notes = [[E, 1], [E, 1], [E, 2], [E, 1], [E, 1], [E, 2], [E, 1], [G, 1], [C, 1.5], [D, 0.5], [E, 4]];
            let t = now;
            notes.forEach(([f, len]) => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'triangle';
                o.frequency.setValueAtTime(f, t); o.connect(g); g.connect(masterGain); g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.25, t + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t + len * q + 0.25); o.start(t); o.stop(t + len * q + 0.3); t += len * q; });
        } else if (type === 'fanfare') {
            const freqs = [523.25, 659.25, 783.99, 1046.50, 523.25, 659.25, 783.99, 1046.50];
            let delay = 0;
            freqs.forEach(f => {
                const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
                o.connect(g); g.connect(masterGain);
                o.type = 'triangle'; o.frequency.value = f;
                g.gain.setValueAtTime(0, now + delay);
                g.gain.linearRampToValueAtTime(0.3, now + delay + 0.1);
                g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.6);
                o.start(now + delay); o.stop(now + delay + 0.6);
                delay += 0.08;
            });
        }
    } catch(e) {
        console.warn("Audio failed", e);
    }
}

function createGrid() {
    const grid = document.getElementById('grid'); grid.innerHTML = '';
    for (let i = 1; i <= maxNumber; i++) {
        const cell = document.createElement('div'); cell.className = 'grid-cell'; cell.id = 'cell-' + i; cell.textContent = i; 
        cell.onclick = function() {
            if (!manualMode || isSpinning) return;              // never two numbers at once
            if (!drawnNumbers.includes(i)) {
                if (!startTime) { startTime = new Date(); statsInterval = setInterval(updateStats, 1000); }
                finalize(i);
            } else if (confirm(currentLang === 'da' ? `Fjern tallet ${i} fra spillet?` : `Remove number ${i} from the game?`)) removeNumber(i);
        };
        grid.appendChild(cell);
    }
}

function triggerConfetti() {
    if(autopilotInterval) {
        clearInterval(autopilotInterval); autopilotInterval = null; document.getElementById('fab-auto').classList.remove('active');
    }
    playSound(season !== 'none' ? SEASONS[season].fanfare : 'fanfare');
    
    const overlay = document.getElementById('banko-overlay');
    overlay.style.display = 'flex';
    setTimeout(() => { overlay.style.display = 'none'; }, 4000);

    const colors = ({ xmas: ['#c8102e', '#0b7a3e', '#f4c542', '#ffffff', '#e8f1ff'], newyear: ['#f4c542', '#fff1b8', '#c9b6ff', '#ffffff', '#ff9ad5'],
                      easter: ['#ffc8dd', '#ffe57a', '#bde0a6', '#cdb4ff', '#ffffff'], halloween: ['#ff7a1a', '#2b1838', '#8b5cf6', '#ffd23f', '#3fbf3f'],
                      party: ['#ff5d73', '#ffcd3c', '#4cc9f0', '#7bd389', '#b388ff'] })[season] || ['#1e3a6e', '#15171a', '#e74c3c', '#f1c40f', '#ffffff'];
    for(let i=0; i<350; i++) {
        const conf = document.createElement('div'); conf.className = 'confetti';
        conf.style.left = (Math.random() * 100) + 'vw'; conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.animationDuration = (Math.random() * 3 + 2) + 's'; conf.style.transform = `rotate(${Math.random()*360}deg)`;
        conf.style.setProperty('--drift', (Math.random() * 300 - 150) + 'px');
        const sym = { xmas: ['❄', '✦', '★'], newyear: ['✦', '★', '✧'], easter: ['🌼', '✿', '🥚'], halloween: ['🦇', '🎃', '✦'], party: ['🎈', '★', '✦'] }[season];
        if (sym && i % 3 === 0) { conf.classList.add('flake'); conf.textContent = sym[i % 9 === 0 ? 2 : (i % 2)]; conf.style.color = conf.style.backgroundColor; conf.style.backgroundColor = 'transparent'; }
        document.body.appendChild(conf); setTimeout(() => conf.remove(), 5000);
    }
}
