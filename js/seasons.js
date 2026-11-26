// Bingo Watch – seasons.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// =====================================================================
// CHRISTMAS MODE: snow, Santa flying around the world, lights, hat, bells
// =====================================================================
let xmasOn = false;
const XMAS_LINGO = {
    da: { 1: 'Første søndag i advent', 2: 'Anden søndag i advent', 3: 'Tredje søndag i advent', 4: 'Fjerde søndag i advent', 7: 'Syv små nisser', 9: 'Ni rensdyr foran slæden',
          12: 'Tolv juledage', 13: 'Lucia-dagen', 18: 'Risalamande med mandel', 24: 'Juleaften', 25: 'Juledag', 26: 'Anden juledag', 31: 'Nytårsaften', 50: 'Halvtreds pebernødder', 90: 'Julemandens sidste stop' },
    en: { 1: 'First Sunday of Advent', 2: 'Second Sunday of Advent', 3: 'Third Sunday of Advent', 4: 'Fourth Sunday of Advent', 7: 'Seven little elves', 9: 'Nine reindeer up front',
          12: 'Twelve days of Christmas', 13: "St Lucy's Day", 18: 'Rice pudding with the almond', 24: 'Christmas Eve', 25: 'Christmas Day', 26: 'Boxing Day', 31: "New Year's Eve", 50: 'Fifty gingerbread biscuits', 90: "Santa's last stop" }
};
function lingoFor(n) {
    const t = translations[currentLang];
    if (xmasOn && XMAS_LINGO[currentLang][n]) return '🎄 ' + XMAS_LINGO[currentLang][n];
    return bingoLingoData[currentLang][n] || `${t.lingoDefault} ${n}`;
}
// ===================== SEASONS =====================
const SEASONS = {
    xmas:      { icon: 'ac_unit',      particles: 'snow',     emoji: '🎄', draw: 'jingle', fanfare: 'jingle-fanfare' },
    newyear:   { icon: 'celebration',  particles: 'glitter',  emoji: '🎆', draw: 'pop',    fanfare: 'newyear-fanfare' },
    easter:    { icon: 'egg',          particles: 'petals',   emoji: '🐣', draw: 'chirp',  fanfare: 'fanfare' },
    halloween: { icon: 'nights_stay',  particles: 'bats',     emoji: '🎃', draw: 'spooky', fanfare: 'spooky-fanfare' },
    party:     { icon: 'cake',         particles: 'balloons', emoji: '🎉', draw: 'pop',    fanfare: 'fanfare' }
};
const SEASON_LINGO = {
    newyear: { da: { 1: 'Nytårsdag', 10: 'Nedtællingen begynder', 12: 'Klokken slår tolv', 31: 'Nytårsaften', 50: 'Kransekage', 60: 'Kongens nytårstale' },
               en: { 1: "New Year's Day", 10: 'The countdown begins', 12: 'The clock strikes twelve', 31: "New Year's Eve", 50: 'Champagne corks', 60: 'Fireworks finale' } },
    easter: { da: { 3: 'Påskelilje', 5: 'Påskefrokost', 7: 'Påskeugen', 13: 'Påskeharen', 20: 'Gækkebrev', 40: 'Fastelavn er forbi', 88: 'To påskeæg' },
              en: { 3: 'Daffodil', 5: 'Easter lunch', 7: 'Holy week', 13: 'The Easter bunny', 20: 'Snowdrop letter', 40: 'Lent is over', 88: 'Two Easter eggs' } },
    halloween: { da: { 13: 'Uheldige fredag', 31: 'Halloween-aften', 66: 'Spøgelsestimen', 13: 'Sort kat over vejen', 99: 'Græskarlygten' , 9: 'Ni liv', 69: 'Hekseskoven' },
                 en: { 13: 'Black cat crossing', 31: 'Halloween night', 66: 'The witching hour', 9: 'Nine lives', 69: 'Haunted forest' } },
    party: { da: { 18: 'Myndig', 21: 'Nøglen til døren', 30: 'Trediveår', 40: 'Fyrre og frisk', 50: 'Et halvt hundrede', 60: 'Sølvhår', 70: 'Pensionist på eventyr' },
             en: { 18: 'Coming of age', 21: 'Key of the door', 30: 'Dirty thirty', 40: 'Life begins at forty', 50: 'Half a century', 60: 'Silver fox', 70: 'Still dancing' } }
};
let seasonChoice = 'none', season = 'none', partyText = '';
function easterDate(y) {        // anonymous Gregorian algorithm
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
}
function seasonByDate(d = new Date()) {
    const m = d.getMonth() + 1, day = d.getDate(), y = d.getFullYear();
    if ((m === 12 && day >= 27) || (m === 1 && day <= 2)) return 'newyear';
    if (m === 12 || (m === 11 && day >= 25)) return 'xmas';
    if (m === 10 && day >= 18) return 'halloween';
    const e = easterDate(y), diff = (d - e) / 86400000;
    if (diff >= -10 && diff <= 2) return 'easter';
    return 'none';
}
function seasonLabel(id) { return translations[currentLang]['season' + id.charAt(0).toUpperCase() + id.slice(1)] || id; }
function setSeasonChoice(choice, silent) {
    seasonChoice = choice;
    try { localStorage.setItem('bingoSeason', choice); } catch (e) {}
    setSeason(choice === 'auto' ? seasonByDate() : choice, silent);
}
function setSeason(id, silent) {
    if (!SEASONS[id]) id = 'none';
    // tear everything down
    stopSnow(); stopSanta(); stopNewYear(); stopEaster(); stopHalloween();
    Object.keys(SEASONS).forEach(k => document.body.classList.remove('season-' + k));
    season = id; xmasOn = id === 'xmas';
    document.body.classList.toggle('xmas', xmasOn);
    document.body.classList.toggle('season-on', id !== 'none');
    if (id !== 'none') {
        document.body.classList.add('season-' + id);
        startSnow(SEASONS[id].particles);
        if (id === 'xmas') startSanta();
        if (id === 'newyear') startNewYear();
        if (id === 'easter') startEaster();
        if (id === 'halloween') startHalloween();
    }
    const sel = document.getElementById('seasonSelect'); if (sel) sel.value = seasonChoice;
    const ic = document.getElementById('seasonIcon'); if (ic) ic.textContent = id === 'none' ? 'celebration' : SEASONS[id].icon;
    const b = document.getElementById('xmasBtn'); if (b) b.classList.toggle('active', id !== 'none');
    const pr = document.getElementById('partyRow'); if (pr) pr.style.display = (seasonChoice === 'party' || id === 'party') ? '' : 'none';
    updatePartyBanner();
    buildSeasonMenu();
    if (drawnNumbers.length) showCurrentNumber();
    renderStage();
    if (!silent) {
        const da = currentLang === 'da';
        const msg = { none: da ? 'Sæsontilstand er slået fra' : 'Season mode is off', xmas: da ? '🎄 Glædelig jul!' : '🎄 Merry Christmas!', newyear: da ? '🎆 Godt nytår!' : '🎆 Happy New Year!',
                      easter: da ? '🐣 God påske!' : '🐣 Happy Easter!', halloween: da ? '🎃 Uhyggelig halloween!' : '🎃 Happy Halloween!', party: da ? '🎉 Lad festen begynde!' : '🎉 Let the party begin!' }[id];
        showToast(msg);
    }
}
// kept for older calls / saved settings
function toggleXmas(on, silent) { setSeasonChoice((on === undefined ? !xmasOn : !!on) ? 'xmas' : 'none', silent); }
function lingoFor(n) {
    const t = translations[currentLang];
    if (season === 'xmas' && XMAS_LINGO[currentLang][n]) return '🎄 ' + XMAS_LINGO[currentLang][n];
    const sl = SEASON_LINGO[season]; if (sl && sl[currentLang][n]) return SEASONS[season].emoji + ' ' + sl[currentLang][n];
    return bingoLingoData[currentLang][n] || `${t.lingoDefault} ${n}`;
}
function drawSoundName() { return season !== 'none' ? SEASONS[season].draw : 'chime'; }
function setPartyText(v) { partyText = (v || '').slice(0, 60); try { localStorage.setItem('bingoPartyText', partyText); } catch (e) {} updatePartyBanner(); renderStage(); }
function updatePartyBanner() {
    const el = document.getElementById('partyBanner'); if (!el) return;
    const show = season === 'party' && partyText.trim();
    el.textContent = show ? '🎉 ' + partyText.trim() + ' 🎉' : '';
    el.classList.toggle('show', !!show);
}
function buildSeasonMenu() {
    const m = document.getElementById('season-menu'); if (!m) return;
    const items = ['none', 'auto', 'xmas', 'newyear', 'easter', 'halloween', 'party'];
    const icon = id => id === 'none' ? 'block' : id === 'auto' ? 'event' : SEASONS[id].icon;
    m.innerHTML = `<div class="wx-menu-title">${translations[currentLang].seasonMode}</div>` + items.map(id =>
        `<button type="button" class="sm-item${seasonChoice === id ? ' on' : ''}" onclick="setSeasonChoice('${id}'); toggleSeasonMenu();"><span class="material-icons-outlined">${icon(id)}</span>${seasonLabel(id)}${id === 'auto' && seasonChoice === 'auto' ? ` <em>· ${seasonLabel(season)}</em>` : ''}</button>`).join('');
}
function toggleSeasonMenu(e) {
    if (e) e.stopPropagation();
    const m = document.getElementById('season-menu');
    buildSeasonMenu();
    m.classList.toggle('open');
}
document.addEventListener('click', e => { const m = document.getElementById('season-menu'); if (m && m.classList.contains('open') && !m.contains(e.target)) m.classList.remove('open'); });
function seasonPill(icon, where, sub) {
    const p = document.getElementById('season-pill'); if (!p) return;
    if (!where) { p.classList.remove('show'); return; }
    document.getElementById('ssIcon').textContent = icon; document.getElementById('ssWhere').textContent = where; document.getElementById('ssSub').textContent = sub || '';
    p.classList.add('show');
}

// ---------- New Year: the midnight wave travels west, fireworks pop over each city ----------
const ny = { raf: 0, lastIdx: -1, timer: 0, markers: [] };
function nyClock() {
    const now = Date.now(), y = new Date().getUTCFullYear();
    const tl = yr => { const stops = SANTA_STOPS.map(st => Date.UTC(yr, 0, 1, 0, 0) - st[3] * 3600000); return { stops, start: stops[0] - 1800000, end: stops[stops.length - 1] + 1800000, yr }; };
    let cur = tl(y + 1); const prev = tl(y);
    if (now >= prev.start && now <= prev.end) return { live: true, t: now, tl: prev };
    const lap = 6 * 60000, f = (now % lap) / lap;
    return { live: false, t: cur.start + f * (cur.end - cur.start), tl: cur, next: now < prev.start ? prev.stops[0] : cur.stops[0] };
}
function fireworkAt(lon, lat, big) {
    if (!map) return;
    const el = document.createElement('div'); el.className = 'firework' + (big ? ' big' : '');
    const hue = Math.floor(Math.random() * 360);
    el.style.setProperty('--fw', `hsl(${hue} 95% 62%)`); el.style.setProperty('--fw2', `hsl(${(hue + 50) % 360} 95% 70%)`);
    el.innerHTML = Array.from({ length: 14 }, (_, i) => `<i style="--a:${(i / 14) * 360}deg"></i>`).join('');
    const mk = new maplibregl.Marker({ element: el, anchor: 'center', subpixelPositioning: true }).setLngLat([lon, lat]).addTo(map);
    setTimeout(() => mk.remove(), 1900);
}
function startNewYear() {
    ny.lastIdx = -1;
    const tick = () => {
        const c = nyClock(), stops = c.tl.stops;
        let idx = -1; while (idx + 1 < stops.length && c.t >= stops[idx + 1]) idx++;
        const da = currentLang === 'da', yr = c.tl.yr;
        if (idx !== ny.lastIdx && idx >= 0) { const st = SANTA_STOPS[idx]; fireworkAt(st[2], st[1], true); if (!prefersReducedMotion()) playSound('pop'); }
        ny.lastIdx = idx;
        // random fireworks over places that are already in the new year
        if (idx >= 0 && Math.random() < 0.6) { const st = SANTA_STOPS[Math.floor(Math.random() * (idx + 1))]; fireworkAt(st[2] + (Math.random() - 0.5) * 2, st[1] + (Math.random() - 0.5) * 2, false); }
        const next = SANTA_STOPS[idx + 1];
        const where = idx < 0 ? (da ? `Nytåret nærmer sig ${next[0]}` : `New Year approaches ${next[0]}`)
                    : (da ? `Det er blevet ${yr} i ${SANTA_STOPS[idx][0]}` : `It is ${yr} in ${SANTA_STOPS[idx][0]}`);
        let sub = next ? (da ? `Næste: ${next[0]}` : `Next: ${next[0]}`) : (da ? 'Hele verden har sagt godt nytår' : 'The whole world has said Happy New Year');
        if (!c.live && c.next) { const days = Math.max(0, Math.ceil((c.next - Date.now()) / 86400000)); sub += ' · ' + (da ? `Prøvekørsel – nytår om ${days} dage` : `Rehearsal – New Year in ${days} days`); }
        else if (c.live) sub += ' · LIVE';
        seasonPill('🎆', where, sub);
    };
    tick(); ny.timer = setInterval(tick, 1300);
}
function stopNewYear() { clearInterval(ny.timer); ny.timer = 0; seasonPill(); document.querySelectorAll('.firework').forEach(e => e.parentNode && e.parentNode.removeChild(e)); }

// ---------- Easter: an egg hunt on the map ----------
const eggs = { markers: [], found: 0, total: 12 };
function eggSvg(c1, c2) { return `<svg viewBox="0 0 24 30" width="18" height="22"><path d="M12 1 C 4 1 1 13 1 19 C 1 25 6 29 12 29 C 18 29 23 25 23 19 C 23 13 20 1 12 1 z" fill="${c1}" stroke="rgba(0,0,0,0.25)" stroke-width="0.8"/>
    <path d="M2.5 14 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l2 -2" stroke="${c2}" stroke-width="1.8" fill="none"/><circle cx="8" cy="21" r="1.6" fill="${c2}"/><circle cx="16" cy="22" r="1.6" fill="${c2}"/><circle cx="12" cy="25" r="1.2" fill="${c2}"/></svg>`; }
function startEaster() {
    if (!map) return;
    const seed = new Date().getFullYear() * 1000 + new Date().getDate();
    const rnd = mulberry32(seed);
    const pool = AIRPORT_DB.slice(); const picks = [];
    while (picks.length < eggs.total && pool.length) picks.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    const cols = [['#ffc8dd', '#ff70a6'], ['#fff3a3', '#f4a300'], ['#c7f0bd', '#38a169'], ['#cfe3ff', '#3f7ae0'], ['#e4d4ff', '#8b5cf6']];
    eggs.found = 0;
    picks.forEach((ap, i) => {
        const el = document.createElement('div'); el.className = 'egg-marker';
        const c = cols[i % cols.length]; el.innerHTML = eggSvg(c[0], c[1]);
        el.title = currentLang === 'da' ? 'Et påskeæg! Klik for at finde det' : 'An Easter egg! Click to find it';
        el.addEventListener('mousedown', e => e.stopPropagation());
        el.addEventListener('click', e => {
            e.stopPropagation(); if (el.classList.contains('found')) return;
            el.classList.add('found'); eggs.found++; playSound('chirp'); updateEggPill();
            if (eggs.found === eggs.total) { triggerConfetti(); showToast(currentLang === 'da' ? '🐣 Alle påskeæg er fundet!' : '🐣 You found every Easter egg!'); }
        });
        const off = [(rnd() - 0.5) * 3, (rnd() - 0.5) * 2];
        eggs.markers.push(new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([ap.lon + off[0], ap.lat + off[1]]).addTo(map));
    });
    updateEggPill();
}
function updateEggPill() {
    const da = currentLang === 'da';
    seasonPill('🐣', da ? `Påskeæg fundet: ${eggs.found} af ${eggs.total}` : `Easter eggs found: ${eggs.found} of ${eggs.total}`,
               da ? 'Æggene gemmer sig ved lufthavne rundt om i verden – klik på dem' : 'The eggs hide near airports around the world – click them');
}
function stopEaster() { eggs.markers.forEach(m => m.remove()); eggs.markers = []; seasonPill(); }

// ---------- Halloween: ghosts drift over the map ----------
const ghosts = { markers: [], timer: 0, seen: 0 };
function startHalloween() {
    if (!map) return;
    ghosts.seen = 0;
    const spawn = () => {
        if (ghosts.markers.length >= 7) { const old = ghosts.markers.shift(); old.m.remove(); }
        const ap = AIRPORT_DB[Math.floor(Math.random() * AIRPORT_DB.length)];
        const el = document.createElement('div'); el.className = 'ghost-marker';
        el.innerHTML = `<svg viewBox="0 0 30 34" width="26" height="30"><path d="M15 2 C 7 2 3 8 3 15 V 31 l4 -3 l4 3 l4 -3 l4 3 l4 -3 l4 3 V 15 C 27 8 23 2 15 2 z" fill="rgba(255,255,255,0.92)" stroke="rgba(60,40,90,0.35)"/>
            <ellipse cx="11" cy="14" rx="2.2" ry="3" fill="#2b1838"/><ellipse cx="19" cy="14" rx="2.2" ry="3" fill="#2b1838"/><ellipse cx="15" cy="21" rx="2.4" ry="3" fill="#2b1838"/></svg>`;
        el.addEventListener('mousedown', e => e.stopPropagation());
        el.addEventListener('click', e => { e.stopPropagation(); if (el.classList.contains('boo')) return; el.classList.add('boo'); ghosts.seen++; playSound('spooky');
            showToast(currentLang === 'da' ? '👻 BØH!' : '👻 BOO!'); updateGhostPill(); });
        const m = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([ap.lon + (Math.random() - 0.5) * 4, ap.lat + (Math.random() - 0.5) * 3]).addTo(map);
        ghosts.markers.push({ m, el });
    };
    for (let i = 0; i < 5; i++) spawn();
    ghosts.timer = setInterval(spawn, 6000);
    updateGhostPill();
}
function updateGhostPill() {
    const da = currentLang === 'da', d = new Date(), h = new Date(d.getFullYear(), 9, 31);
    if (d > h) h.setFullYear(h.getFullYear() + 1);
    const days = Math.ceil((h - d) / 86400000);
    seasonPill('🎃', da ? `Spøgelser skræmt: ${ghosts.seen}` : `Ghosts spooked: ${ghosts.seen}`,
               (da ? 'Klik på spøgelserne på kortet' : 'Click the ghosts on the map') + (days > 0 ? (da ? ` · Halloween om ${days} dage` : ` · Halloween in ${days} days`) : ''));
}
function stopHalloween() { clearInterval(ghosts.timer); ghosts.timer = 0; ghosts.markers.forEach(g => g.m.remove()); ghosts.markers = []; seasonPill(); }

// ---------- snow (one light canvas loop for the map and the big screen) ----------
const snow = { flakes: [], raf: 0, last: 0, kind: null };
// particle kinds per season: snow, glitter, petals, bats, balloons
function makeParticle(kind, fresh) {
    const p = { x: Math.random(), y: fresh ? Math.random() : (kind === 'balloons' ? 1.08 : -0.03), w: Math.random() * Math.PI * 2, o: 0.4 + Math.random() * 0.5 };
    if (kind === 'snow') Object.assign(p, { r: 0.8 + Math.random() * 2.4, s: 0.02 + Math.random() * 0.05 });
    if (kind === 'glitter') Object.assign(p, { r: 1.5 + Math.random() * 2.5, s: 0.03 + Math.random() * 0.05, c: ['#f4c542', '#fff1b8', '#c9b6ff', '#ffffff', '#ff9ad5'][Math.floor(Math.random() * 5)], rot: Math.random() * 6 });
    if (kind === 'petals') Object.assign(p, { r: 2.5 + Math.random() * 3, s: 0.015 + Math.random() * 0.03, c: ['#ffc8dd', '#ffe57a', '#bde0a6', '#cdb4ff', '#ffffff'][Math.floor(Math.random() * 5)], rot: Math.random() * 6 });
    if (kind === 'bats') Object.assign(p, { r: 5 + Math.random() * 6, s: 0.04 + Math.random() * 0.05, dir: Math.random() < 0.5 ? -1 : 1, y: fresh ? Math.random() * 0.7 : Math.random() * 0.6, x: fresh ? Math.random() : (Math.random() < 0.5 ? -0.05 : 1.05) });
    if (kind === 'balloons') Object.assign(p, { r: 9 + Math.random() * 9, s: 0.018 + Math.random() * 0.025, c: ['#ff5d73', '#ffcd3c', '#4cc9f0', '#7bd389', '#b388ff', '#ff8fd1'][Math.floor(Math.random() * 6)] });
    return p;
}
function startSnow(kind) {
    kind = kind || 'snow';
    if (snow.raf && snow.kind === kind) return;
    cancelAnimationFrame(snow.raf);
    snow.kind = kind;
    const base = { snow: 140, glitter: 110, petals: 60, bats: 14, balloons: 26 }[kind] || 100;
    const N = Math.round(base * (prefersReducedMotion() ? 0.3 : 1));
    snow.flakes = Array.from({ length: N }, () => makeParticle(kind, true));
    snow.last = performance.now();
    const tick = (now) => {
        const dt = Math.min(0.05, (now - snow.last) / 1000); snow.last = now;
        const slow = prefersReducedMotion() ? 0.25 : 1;
        ['snowCanvas', 'stageSnow'].forEach(id => {
            const c = document.getElementById(id); if (!c || !c.offsetParent && id === 'stageSnow') return;
            const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
            const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
            const big = id === 'stageSnow' ? 1.6 : 1, dark = id === 'stageSnow' || wxIsDark();
            snow.flakes.forEach(f => {
                const x = f.x * w, y = f.y * h;
                ctx.globalAlpha = f.o;
                if (kind === 'snow') { ctx.fillStyle = dark ? '#ffffff' : '#b9cbe3'; ctx.beginPath(); ctx.arc(x + Math.sin(f.w) * 12, y, f.r * big, 0, Math.PI * 2); ctx.fill(); }
                else if (kind === 'glitter') { ctx.save(); ctx.translate(x + Math.sin(f.w) * 8, y); ctx.rotate(f.rot); ctx.globalAlpha = f.o * (0.55 + 0.45 * Math.sin(f.w * 3));
                    ctx.fillStyle = f.c; const r = f.r * big; ctx.fillRect(-r, -r * 0.35, r * 2, r * 0.7); ctx.restore(); }
                else if (kind === 'petals') { ctx.save(); ctx.translate(x + Math.sin(f.w) * 18, y); ctx.rotate(f.rot + Math.sin(f.w) * 0.6);
                    ctx.fillStyle = f.c; ctx.beginPath(); ctx.ellipse(0, 0, f.r * big, f.r * 0.55 * big, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
                else if (kind === 'bats') { const flap = Math.sin(f.w * 7) * 0.6, r = f.r * big; ctx.save(); ctx.translate(x, y + Math.sin(f.w * 2) * 10); ctx.scale(f.dir, 1);
                    ctx.fillStyle = dark ? '#1a0f24' : '#2b1838'; ctx.globalAlpha = Math.min(1, f.o + 0.3); ctx.beginPath();
                    ctx.moveTo(0, 0); ctx.quadraticCurveTo(-r * 0.8, -r * (0.9 + flap), -r * 2, -r * flap * 0.6); ctx.quadraticCurveTo(-r * 1.4, r * 0.1, -r * 1.2, r * 0.35);
                    ctx.quadraticCurveTo(-r * 0.6, r * 0.05, 0, r * 0.35); ctx.quadraticCurveTo(r * 0.6, r * 0.05, r * 1.2, r * 0.35); ctx.quadraticCurveTo(r * 1.4, r * 0.1, r * 2, -r * flap * 0.6);
                    ctx.quadraticCurveTo(r * 0.8, -r * (0.9 + flap), 0, 0); ctx.fill(); ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
                else if (kind === 'balloons') { const r = f.r * big, bx = x + Math.sin(f.w) * 10; ctx.globalAlpha = 0.85;
                    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.5)' : 'rgba(60,60,60,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, y + r * 1.2);
                    ctx.quadraticCurveTo(bx + Math.sin(f.w * 2) * 6, y + r * 2.2, bx, y + r * 3.4); ctx.stroke();
                    ctx.fillStyle = f.c; ctx.beginPath(); ctx.ellipse(bx, y, r * 0.85, r * 1.1, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(bx - 3, y + r * 1.15); ctx.lineTo(bx + 3, y + r * 1.15); ctx.lineTo(bx, y + r * 1.05); ctx.fill();
                    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(bx - r * 0.3, y - r * 0.4, r * 0.18, r * 0.3, -0.5, 0, Math.PI * 2); ctx.fill(); }
            });
        });
        snow.flakes.forEach((f, i) => {
            f.w += dt * 0.8;
            if (kind === 'bats') { f.x += f.dir * f.s * dt * slow * 2; if (f.x < -0.1 || f.x > 1.1) snow.flakes[i] = makeParticle(kind, false); }
            else if (kind === 'balloons') { f.y -= f.s * dt * slow * 2; if (f.y < -0.1) snow.flakes[i] = makeParticle(kind, false); }
            else { f.y += f.s * dt * slow * (1 + (f.r || 1) * 0.25); if (f.rot != null) f.rot += dt * 0.7; if (f.y > 1.03) snow.flakes[i] = makeParticle(kind, false); }
        });
        snow.raf = requestAnimationFrame(tick);
    };
    snow.raf = requestAnimationFrame(tick);
}
function stopSnow() {
    cancelAnimationFrame(snow.raf); snow.raf = 0; snow.kind = null;
    ['snowCanvas', 'stageSnow'].forEach(id => { const c = document.getElementById(id); if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height); });
}

// ---------- Santa's route: east -> west, one stop per time zone, at local midnight Christmas night ----------
// [name, lat, lon, UTC offset on 24/25 Dec, presents (millions, rough)]
const SANTA_STOPS = [
    ['Kiritimati', 1.87, -157.4, 14, 2], ['Auckland', -36.85, 174.76, 13, 30], ['Suva', -18.14, 178.44, 12, 6], ['Sydney', -33.87, 151.21, 11, 70],
    ['Brisbane', -27.47, 153.03, 10, 25], ['Tokyo', 35.68, 139.69, 9, 120], ['Seoul', 37.57, 126.98, 9, 60], ['Manila', 14.6, 120.98, 8, 110],
    ['Beijing', 39.9, 116.4, 8, 90], ['Singapore', 1.35, 103.82, 8, 12], ['Bangkok', 13.76, 100.5, 7, 40], ['Jakarta', -6.21, 106.85, 7, 60],
    ['Dhaka', 23.81, 90.41, 6, 30], ['Delhi', 28.61, 77.21, 5.5, 140], ['Karachi', 24.86, 67.0, 5, 25], ['Dubai', 25.2, 55.27, 4, 12],
    ['Nairobi', -1.29, 36.82, 3, 50], ['Moscow', 55.76, 37.62, 3, 80], ['Istanbul', 41.01, 28.98, 3, 40], ['Cairo', 30.04, 31.24, 2, 30],
    ['Helsinki', 60.17, 24.94, 2, 6], ['Johannesburg', -26.2, 28.05, 2, 45], ['Odense', 55.4, 10.39, 1, 1], ['København', 55.68, 12.57, 1, 5],
    ['Oslo', 59.91, 10.75, 1, 5], ['Stockholm', 59.33, 18.07, 1, 9], ['Berlin', 52.52, 13.4, 1, 70], ['Rom', 41.9, 12.5, 1, 55],
    ['Paris', 48.86, 2.35, 1, 60], ['Madrid', 40.42, -3.7, 1, 45], ['Lagos', 6.52, 3.38, 1, 70], ['London', 51.51, -0.13, 0, 65],
    ['Reykjavík', 64.15, -21.94, 0, 1], ['Nuuk', 64.18, -51.72, -2, 1], ['Rio de Janeiro', -22.91, -43.17, -3, 90], ['Buenos Aires', -34.6, -58.38, -3, 45],
    ['New York', 40.71, -74.01, -5, 110], ['Toronto', 43.65, -79.38, -5, 35], ['Chicago', 41.88, -87.63, -6, 60], ['Mexico City', 19.43, -99.13, -6, 100],
    ['Denver', 39.74, -104.99, -7, 25], ['Los Angeles', 34.05, -118.24, -8, 70], ['Vancouver', 49.28, -123.12, -8, 10], ['Anchorage', 61.22, -149.9, -9, 2],
    ['Honolulu', 21.31, -157.86, -10, 2]
];
const NORTH_POLE = ['Nordpolen', 89.9, 10, null, 0];
const santa = { marker: null, el: null, raf: 0, follow: false, lastUi: 0, trailT: 0, lastPos: null };
function santaTimeline(year) {
    // stop i is reached at 00:00 local on 25 Dec; take-off from the North Pole an hour before the first stop
    const tStop = SANTA_STOPS.map(st => Date.UTC(year, 11, 25, 0, 0) - st[3] * 3600000);
    return { start: tStop[0] - 3600000, stops: tStop, end: tStop[tStop.length - 1] + 3600000 };
}
function santaClock() {
    const now = Date.now(), y = new Date().getUTCFullYear();
    const tl = santaTimeline(y);
    if (now >= tl.start && now <= tl.end) return { live: true, t: now, tl };
    // practice lap: the whole night compressed into 12 minutes, looping
    const lap = 12 * 60000, f = (now % lap) / lap;
    const nextXmas = now < tl.start ? tl.start : santaTimeline(y + 1).start;
    return { live: false, t: tl.start + f * (tl.end - tl.start), tl, nextXmas };
}
function santaState() {
    const c = santaClock(), { tl } = c, t = c.t;
    const pts = [NORTH_POLE].concat(SANTA_STOPS, [NORTH_POLE]);
    const times = [tl.start].concat(tl.stops, [tl.end]);
    let i = 0; while (i < times.length - 2 && t >= times[i + 1]) i++;
    const seg = times[i + 1] - times[i];
    // stay ~25% of each leg over the city (delivering), fly the rest
    const raw = seg > 0 ? Math.min(1, Math.max(0, (t - times[i]) / seg)) : 1;
    const stay = i === 0 ? 0 : 0.25, f = raw < stay ? 0 : (raw - stay) / (1 - stay);
    const ease = f * f * (3 - 2 * f);
    const a = pts[i], b = pts[i + 1];
    const [lat, lon] = gInterp(a[1], a[2], b[1], b[2], ease);
    const totalM = SANTA_STOPS.reduce((s, x) => s + x[4], 0);
    let doneM = SANTA_STOPS.slice(0, Math.max(0, i)).reduce((s, x) => s + x[4], 0);
    if (i > 0 && i <= SANTA_STOPS.length) doneM -= pts[i][4] * (1 - Math.min(1, raw / Math.max(0.01, stay)));
    const delivering = i > 0 && raw < stay;
    const ahead = gInterp(a[1], a[2], b[1], b[2], Math.min(1, ease + 0.004));
    const aheadOk = ease < 0.996;
    return { lat, lon, from: a, to: b, i, delivering, live: c.live, nextXmas: c.nextXmas, presents: Math.max(0, doneM) * 1e6 * 3, total: totalM * 1e6 * 3,
             brg: gBearing(a[1], a[2], b[1], b[2]), ahead: aheadOk ? [ahead[1], ahead[0]] : null };
}
function startSanta() {
    if (!map || santa.raf) return;
    if (!santa.marker) {
        const el = document.createElement('div');
        el.className = 'santa-marker';
        el.title = currentLang === 'da' ? 'Julemanden – klik for at følge' : 'Santa – click to follow';
        const deer = (x, y, d, lead) => `
            <g class="sd${lead ? ' lead' : ''}" style="animation-delay:${d}s">
              <path d="M${x - 4.2} ${y + 10} q-1.6 3.4 -0.6 6.2 M${x + 4.2} ${y + 10} q1.6 3.4 0.6 6.2 M${x - 3.6} ${y + 1.5} q-2.2 -2.6 -1.4 -5.4 M${x + 3.6} ${y + 1.5} q2.2 -2.6 1.4 -5.4" class="sd-legs"/>
              <ellipse cx="${x}" cy="${y + 6}" rx="4.6" ry="7.4" class="sd-body"/>
              <ellipse cx="${x}" cy="${y + 9.5}" rx="2.6" ry="2.8" class="sd-tail"/>
              <circle cx="${x}" cy="${y - 2.6}" r="3.1" class="sd-head"/>
              <path d="M${x - 1.8} ${y - 4.6} l-3.6 -3.4 l-1.8 1.2 M${x - 4.4} ${y - 7.2} l-0.4 -2.6 M${x + 1.8} ${y - 4.6} l3.6 -3.4 l1.8 1.2 M${x + 4.4} ${y - 7.2} l0.4 -2.6" class="sd-antler"/>
              ${lead ? `<circle cx="${x}" cy="${y - 5.4}" r="1.9" class="sd-nose"/>` : `<circle cx="${x}" cy="${y - 5.2}" r="1.1" class="sd-snout"/>`}
            </g>`;
        el.innerHTML = `<div class="santa-rot"><div class="santa-dust"><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <svg viewBox="0 0 64 112" width="16" height="28" aria-hidden="true">
            <defs>
              <radialGradient id="snNose"><stop offset="0" stop-color="#fff2f2"/><stop offset="0.35" stop-color="#ff2a3d"/><stop offset="1" stop-color="#ff2a3d" stop-opacity="0"/></radialGradient>
              <linearGradient id="snSled" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e0303f"/><stop offset="1" stop-color="#9c0f20"/></linearGradient>
            </defs>
            <circle cx="32" cy="9" r="7" fill="url(#snNose)" class="sd-glow"/>
            <path d="M32 18 L32 60 M22 38 L27 64 M42 38 L37 64 M22 56 L28 66 M42 56 L36 66" class="sd-rein"/>
            ${deer(32, 14, 0, true)}
            ${deer(22, 32, 0.18)}${deer(42, 32, 0.05)}
            ${deer(22, 50, 0.3)}${deer(42, 50, 0.12)}
            <g class="sd-bells"><circle cx="27" cy="44" r="1.2"/><circle cx="37" cy="44" r="1.2"/><circle cx="27" cy="62" r="1.2"/><circle cx="37" cy="62" r="1.2"/></g>
            <path d="M18 74 q0 -8 6 -9 h16 q6 1 6 9" class="sd-runner"/>
            <path d="M15 76 q0 -6 5 -6 h24 q5 0 5 6 v22 q0 9 -9 9 h-16 q-9 0 -9 -9 z" fill="url(#snSled)" stroke="#f4c542" stroke-width="1.6"/>
            <path d="M14 77 v22 q0 10 10 10 M50 77 v22 q0 10 -10 10" class="sd-runner"/>
            <ellipse cx="32" cy="98" rx="11" ry="7" fill="#6d3b1f"/><ellipse cx="32" cy="96.5" rx="8.5" ry="5" fill="#8b5030"/>
            <rect x="23.5" y="92" width="6" height="6" rx="1" fill="#0b7a3e" transform="rotate(-14 26.5 95)"/><rect x="34" y="91" width="6" height="6" rx="1" fill="#3f7ae0" transform="rotate(12 37 94)"/>
            <path d="M26.5 92 v6 M24 95 h6" stroke="#f4c542" stroke-width="0.9" transform="rotate(-14 26.5 95)"/>
            <ellipse cx="32" cy="83" rx="9" ry="8" fill="#c8102e"/>
            <path d="M24 80.5 q8 -4 16 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>
            <circle cx="32" cy="79" r="5.2" fill="#f2c9a0"/>
            <path d="M27.6 77.6 q4.4 -9 8.8 0 z" fill="#c8102e"/><path d="M27 78.2 q5 -2 10 0" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>
            <circle cx="32" cy="71.4" r="1.9" fill="#fff"/>
            <path d="M28.6 81.2 q3.4 3.2 6.8 0" fill="#fff"/>
            <path d="M23 86 q-4 -4 -7 -10 M41 86 q4 -4 7 -10" stroke="#c8102e" stroke-width="3.2" fill="none" stroke-linecap="round"/>
            <circle cx="16" cy="75.5" r="1.8" fill="#fff"/><circle cx="48" cy="75.5" r="1.8" fill="#fff"/>
          </svg></div>`;
        el.addEventListener('mousedown', e => e.stopPropagation());
        el.addEventListener('click', e => { e.stopPropagation(); toggleSantaFollow(); });
        santa.el = el;
        santa.marker = new maplibregl.Marker({ element: el, anchor: 'center', subpixelPositioning: true });
    }
    const st = santaState();
    santa.marker.setLngLat([st.lon, st.lat]).addTo(map);
    document.getElementById('santa-pill').classList.add('show');
    const loop = (now) => {
        const st = santaState();
        santa.marker.setLngLat([st.lon, st.lat]);
        if (map && st.ahead) {          // same logic as the aircraft: nose along the track on screen
            const a = map.project([st.lon, st.lat]), b = map.project(st.ahead);
            const dx = b.x - a.x, dy = b.y - a.y;
            if (Math.abs(dx) + Math.abs(dy) > 0.01) {
                const target = ((Math.atan2(dx, -dy) * 180 / Math.PI) + 360) % 360;
                santa.hdg = santa.hdg == null ? target : (santa.hdg + angDiff(target, santa.hdg) * 0.12 + 360) % 360;   // smooth turns
                if (!santa.rot) santa.rot = santa.el.querySelector('.santa-rot');
                santa.rot.style.transform = `rotate(${santa.hdg.toFixed(1)}deg)`;
            }
        }
        santa.el.classList.toggle('delivering', !!st.delivering);
        santa.lastPos = [st.lon, st.lat];
        if (santa.follow) followCamera(st.lon, st.lat);   // smooth on the flat map too (see followCamera)
        if (now - santa.lastUi > 400) { santa.lastUi = now; updateSantaUi(st); }
        santa.raf = requestAnimationFrame(loop);
    };
    santa.raf = requestAnimationFrame(loop);
}
function stopSanta() {
    cancelAnimationFrame(santa.raf); santa.raf = 0; if (santa.follow) endFollowCamera(); santa.follow = false;
    if (santa.marker) santa.marker.remove();
    document.getElementById('santa-pill').classList.remove('show');
    if (map && map.getLayer('santa-gifts')) { map.removeLayer('santa-gifts'); map.removeLayer('santa-trail'); }
    if (map && map.getSource('santa-src')) map.removeSource('santa-src');
}
function updateSantaUi(st) {
    const da = currentLang === 'da';
    const nf = new Intl.NumberFormat(da ? 'da-DK' : 'en-GB');
    const name = x => (x === NORTH_POLE ? (da ? 'Nordpolen' : 'the North Pole') : x[0]);
    const where = st.delivering ? (da ? `Deler gaver ud i ${name(st.from)}` : `Delivering in ${name(st.from)}`)
                                : (da ? `På vej mod ${name(st.to)}` : `Flying to ${name(st.to)}`);
    document.getElementById('spWhere').textContent = where;
    let sub = `${nf.format(Math.round(st.presents))} ${da ? 'gaver leveret' : 'presents delivered'}`;
    if (!st.live && st.nextXmas) {
        const days = Math.ceil((st.nextXmas - Date.now()) / 86400000);
        sub += ' · ' + (da ? `Øvetur – juleaften om ${days} dag${days === 1 ? '' : 'e'}` : `Practice run – Christmas Eve in ${days} day${days === 1 ? '' : 's'}`);
    } else if (st.live) sub += ' · LIVE';
    document.getElementById('spSub').textContent = sub;
    const fb = document.getElementById('spFollow');
    fb.textContent = santa.follow ? (da ? 'Følger…' : 'Following…') : (da ? 'Følg' : 'Follow');
    fb.classList.toggle('on', santa.follow);
    // gift trail: visited stops + the stretch flown so far on this leg
    if (!map || !map.style || !map.style._loaded) return;
    const visited = SANTA_STOPS.slice(0, Math.max(0, st.delivering ? st.i : st.i));
    const feats = visited.map(v => ({ type: 'Feature', properties: { k: 'gift' }, geometry: { type: 'Point', coordinates: [v[2], v[1]] } }));
    const leg = densifyGC([[st.from[1], st.from[2]], [st.lat, st.lon]], 80);
    feats.push({ type: 'Feature', properties: { k: 'trail' }, geometry: { type: 'LineString', coordinates: leg } });
    const gj = { type: 'FeatureCollection', features: feats };
    if (!map.getSource('santa-src')) {
        map.addSource('santa-src', { type: 'geojson', data: gj });
        map.addLayer({ id: 'santa-trail', type: 'line', source: 'santa-src', filter: ['==', ['get', 'k'], 'trail'],
            layout: { 'line-cap': 'round' }, paint: { 'line-color': '#f4c542', 'line-width': 2.4, 'line-opacity': 0.85, 'line-dasharray': [1, 2] } });
        map.addLayer({ id: 'santa-gifts', type: 'circle', source: 'santa-src', filter: ['==', ['get', 'k'], 'gift'],
            paint: { 'circle-radius': 4.5, 'circle-color': '#c8102e', 'circle-stroke-color': '#f4c542', 'circle-stroke-width': 2 } });
    } else map.getSource('santa-src').setData(gj);
}
function toggleSantaFollow(on) {
    santa.follow = on === undefined ? !santa.follow : !!on;
    if (!santa.follow) endFollowCamera();
    if (santa.follow) {
        releaseTracking(true);
        const st = santaState();
        if (map) map.flyTo({ center: [st.lon, st.lat], zoom: Math.min(Math.max(map.getZoom(), 3.2), 4.5), duration: 900 });
    }
    const st = santaState(); updateSantaUi(st);
}
// restore the saved choice once the map exists
setTimeout(() => {
    let choice = 'none';
    try {
        partyText = localStorage.getItem('bingoPartyText') || '';
        const pt = document.getElementById('partyText'); if (pt) pt.value = partyText;
        choice = localStorage.getItem('bingoSeason') || (localStorage.getItem('bingoXmas') === '1' ? 'xmas' : 'none');
    } catch (e) {}
    setSeasonChoice(choice, true);
}, 1200);
