// Bingo Watch – payload.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// =====================================================================
// CABIN AND CARGO (simulated, but fixed per flight via its route seed)
// Passenger flights: a top-down cabin plan per aircraft type with classes and occupied seats, passengers per
// class, crew, bags and mail. Freighters: the main deck with pallets (ULDs) by contents and weight, total
// payload against the maximum, and the centre of gravity within its limits – like a simple load sheet.
// =====================================================================

// Cabin layouts: sections from the front. seats = groups across the cabin, e.g. [3,3] = 3 + aisle + 3.
const CABIN = {
    AT76: [{ c: 'Y', rows: 18, seats: [2, 2] }],
    DH8D: [{ c: 'Y', rows: 20, seats: [2, 2] }],
    AT45: [{ c: 'Y', rows: 12, seats: [2, 2] }],
    E190: [{ c: 'J', rows: 3, seats: [1, 2] }, { c: 'Y', rows: 23, seats: [2, 2] }],
    CRJ9: [{ c: 'J', rows: 3, seats: [1, 2] }, { c: 'Y', rows: 18, seats: [2, 2] }],
    E75L: [{ c: 'J', rows: 3, seats: [1, 2] }, { c: 'Y', rows: 17, seats: [2, 2] }],
    GLEX: [{ c: 'J', rows: 6, seats: [1, 1] }],
    GLF6: [{ c: 'J', rows: 7, seats: [1, 1] }],
    C68A: [{ c: 'J', rows: 4, seats: [1, 1] }],
    A320: [{ c: 'J', rows: 3, seats: [2, 2] }, { c: 'Y', rows: 26, seats: [3, 3] }],
    A20N: [{ c: 'J', rows: 3, seats: [2, 2] }, { c: 'Y', rows: 26, seats: [3, 3] }],
    B738: [{ c: 'J', rows: 3, seats: [2, 2] }, { c: 'Y', rows: 27, seats: [3, 3] }],
    B38M: [{ c: 'J', rows: 3, seats: [2, 2] }, { c: 'Y', rows: 27, seats: [3, 3] }],
    A321: [{ c: 'J', rows: 4, seats: [2, 2] }, { c: 'Y', rows: 31, seats: [3, 3] }],
    B789: [{ c: 'J', rows: 7, seats: [1, 2, 1] }, { c: 'W', rows: 4, seats: [2, 3, 2] }, { c: 'Y', rows: 26, seats: [3, 3, 3] }],
    A359: [{ c: 'J', rows: 8, seats: [1, 2, 1] }, { c: 'W', rows: 4, seats: [2, 4, 2] }, { c: 'Y', rows: 28, seats: [3, 3, 3] }],
    B77W: [{ c: 'J', rows: 10, seats: [1, 2, 1] }, { c: 'W', rows: 4, seats: [2, 4, 2] }, { c: 'Y', rows: 32, seats: [3, 4, 3] }],
    A333: [{ c: 'J', rows: 8, seats: [1, 2, 1] }, { c: 'Y', rows: 33, seats: [2, 4, 2] }],
    A388: [{ c: 'F', rows: 4, seats: [1, 2, 1] }, { c: 'J', rows: 20, seats: [1, 2, 1] }, { c: 'W', rows: 5, seats: [2, 4, 2] }, { c: 'Y', rows: 38, seats: [3, 4, 3] }],
    B748: [{ c: 'F', rows: 2, seats: [1, 2, 1] }, { c: 'J', rows: 12, seats: [1, 2, 1] }, { c: 'W', rows: 4, seats: [2, 4, 2] }, { c: 'Y', rows: 30, seats: [3, 4, 3] }],
    B744: [{ c: 'J', rows: 13, seats: [1, 2, 1] }, { c: 'W', rows: 4, seats: [2, 4, 2] }, { c: 'Y', rows: 30, seats: [3, 4, 3] }]
};
const CABIN_FALLBACK = { prop: 'AT76', rj: 'E190', biz: 'GLEX', narrow: 'A320', wide: 'B789', quad: 'B744' };
const CLASS_NAMES = { F: ['First', 'First'], J: ['Business', 'Business'], W: ['Premium', 'Premium'], Y: ['Economy', 'Economy'] };
const CLASS_LOAD = { F: [0.4, 0.85], J: [0.55, 0.92], W: [0.6, 0.95], Y: [0.7, 0.97] };

// Freighters: main-deck pallet positions (2 abreast) and max payload in tonnes
const FREIGHTERS = {
    wide: [['B77L', 'Boeing 777F', 13, 102], ['B763', 'Boeing 767-300F', 12, 52], ['A332', 'Airbus A330-200F', 11, 70]],
    quad: [['B748', 'Boeing 747-8F', 17, 134], ['B744', 'Boeing 747-400F', 15, 113]]
};
const CARGO_KINDS = [
    { k: 'gen', w: 40, col: '#7c8ea6', da: 'Stykgods', en: 'General cargo', items: [['Maskindele', 'Machine parts'], ['Tekstiler', 'Textiles'], ['Bildele', 'Car parts']] },
    { k: 'ecom', w: 16, col: '#5b8def', da: 'E-handel', en: 'E-commerce', items: [['Pakker', 'Parcels']] },
    { k: 'elec', w: 12, col: '#8b5cf6', da: 'Elektronik', en: 'Electronics', items: [['Telefoner og computere', 'Phones and computers']] },
    { k: 'perish', w: 12, col: '#22a06b', da: 'Kølevarer', en: 'Perishables', items: [['Frugt (kølet)', 'Fruit (chilled)'], ['Fisk (kølet)', 'Fish (chilled)'], ['Blomster', 'Flowers']] },
    { k: 'pharma', w: 7, col: '#06b6d4', da: 'Medicin 2–8 °C', en: 'Pharma 2–8 °C', items: [['Vacciner', 'Vaccines']] },
    { k: 'mail', w: 7, col: '#f59e0b', da: 'Post', en: 'Mail', items: [['Post', 'Mail']] },
    { k: 'dg', w: 5, col: '#e5484d', da: 'Farligt gods', en: 'Dangerous goods', items: [['Lithium-batterier (klasse 9)', 'Lithium batteries (class 9)'], ['Maling (klasse 3)', 'Paint (class 3)']] },
    { k: 'avi', w: 1.5, col: '#a16207', da: 'Levende dyr', en: 'Live animals', items: [['Heste (AVI)', 'Horses (AVI)']] }
];

// Some of the big aircraft are freighters (about one in five). Called once when a flight is created; it uses
// its own random stream, so the routes and aircraft of all other flights stay exactly the same.
function maybeFreighter(ac, seed) {
    if (!FREIGHTERS[ac.cat]) return ac;
    const r = mulberry32((seed >>> 0) ^ 0x1f3a5c7e);
    if (r() >= 0.2) return ac;
    const list = FREIGHTERS[ac.cat], f = list[Math.floor(r() * list.length)];
    return { ...ac, code: f[0], name: f[1], cargo: { positions: f[2], maxT: f[3] } };
}

function payloadFor(p) {
    if (p._payload) return p._payload;
    const r = mulberry32(((p.routeSeed || p.num) >>> 0) ^ 0x2c1b3c6d), rnd = (a, b) => a + r() * (b - a);
    const ac = p.ac || { cat: 'narrow', code: 'A320' };
    const hours = (p.durMin || 60) / 60;
    if (ac.cargo) {
        // --- freighter: pallets, two abreast; heaviest in the middle (good for the balance)
        const n = ac.cargo.positions * 2, target = ac.cargo.maxT * rnd(0.62, 0.93), pallets = [];
        const pick = () => { let x = r() * CARGO_KINDS.reduce((s, k) => s + k.w, 0); for (const k of CARGO_KINDS) { x -= k.w; if (x <= 0) return k; } return CARGO_KINDS[0]; };
        let raw = 0;
        for (let i = 0; i < n; i++) {
            const row = Math.floor(i / 2), mid = 1 - Math.abs(row / (ac.cargo.positions - 1) - 0.5) * 1.2;
            const empty = r() < 0.06;
            const kind = empty ? null : pick();
            const w = empty ? 0 : rnd(0.6, 1.4) * (0.7 + 0.6 * mid);
            pallets.push({ row, side: i % 2, kind, w }); raw += w;
        }
        pallets.forEach(q => { q.t = q.w / raw * target; });
        // centre of gravity in % MAC: from the moments of the pallets (front = small arm)
        const mom = pallets.reduce((s, q) => s + q.t * (q.row + 0.5) / ac.cargo.positions, 0) / Math.max(1e-6, target);
        const cg = Math.round((13 + (mom - 0.35) * 40 + rnd(-1.5, 1.5)) * 10) / 10;
        const byKind = {};
        pallets.forEach(q => { if (!q.kind) return; const b = byKind[q.kind.k] = byKind[q.kind.k] || { kind: q.kind, t: 0, n: 0, item: q.kind.items[Math.floor(r() * q.kind.items.length)] }; b.t += q.t; b.n++; });
        return (p._payload = { cargo: true, pallets, positions: ac.cargo.positions, totalT: target, maxT: ac.cargo.maxT, cg: Math.max(14, Math.min(33, cg)), cgLim: [12, 35],
            groups: Object.values(byKind).sort((a, b) => b.t - a.t), crew: hours > 9 ? 4 : 2 });
    }
    // --- passenger flight
    const layout = CABIN[ac.code] || CABIN[CABIN_FALLBACK[ac.cat]] || CABIN.A320;
    const sections = layout.map(s => {
        const per = s.seats.reduce((a, b) => a + b, 0), cap = per * s.rows;
        const lf = rnd(...(CLASS_LOAD[s.c] || [0.7, 0.95]));
        const taken = new Uint8Array(cap); let n = Math.round(cap * lf);
        for (let i = 0; i < cap && n > 0; i++) { if (r() < n / (cap - i)) { taken[i] = 1; n--; } }   // spread evenly over the cabin
        return { ...s, per, cap, taken, pax: taken.reduce((a, b) => a + b, 0) };
    });
    const cap = sections.reduce((a, s) => a + s.cap, 0), pax = sections.reduce((a, s) => a + s.pax, 0);
    const cabinCrew = ac.cat === 'biz' ? 1 : Math.max(1, Math.ceil(cap / 50));
    const pilots = ac.cat === 'biz' ? 2 : hours > 9 ? (hours > 13 ? 4 : 3) : 2;
    const bagsT = pax * rnd(14, 19) / 1000, mailT = ac.cat === 'wide' || ac.cat === 'quad' ? rnd(0.5, 3) : rnd(0, 0.4);
    const bellyT = ac.cat === 'wide' || ac.cat === 'quad' ? rnd(4, 18) : ac.cat === 'narrow' ? rnd(0, 2) : 0;
    return (p._payload = { cargo: false, sections, cap, pax, crew: { pilots, cabin: cabinCrew }, bagsT, mailT, bellyT });
}

// Top-down drawing (nose to the right). big = the large view.
function payloadSvg(p, big) {
    const P = payloadFor(p), da = currentLang === 'da';
    const s = big === true ? 2.6 : big ? big : 1;           // big: true = large view, or a scale factor
    if (P.cargo) {
        const cw = 15 * s, ch = 13 * s, gap = 2 * s, rows = P.positions, W = 24 * s + rows * (cw + gap) + 34 * s, H = 2 * ch + gap + 16 * s;
        const x0 = 22 * s, y0 = 8 * s;
        let g = `<path class="pl-body" d="M${8 * s} ${H / 2} Q${10 * s} ${4 * s} ${30 * s} ${4 * s} L${W - 30 * s} ${4 * s} Q${W - 4 * s} ${4 * s} ${W - 2 * s} ${H / 2} Q${W - 4 * s} ${H - 4 * s} ${W - 30 * s} ${H - 4 * s} L${30 * s} ${H - 4 * s} Q${10 * s} ${H - 4 * s} ${8 * s} ${H / 2}Z"/>`;
        P.pallets.forEach(q => {
            const x = x0 + q.row * (cw + gap), y = y0 + q.side * (ch + gap);
            g += q.kind ? `<rect class="pl-uld" x="${x}" y="${y}" width="${cw}" height="${ch}" rx="${1.5 * s}" fill="${q.kind.col}"><title>${da ? q.kind.da : q.kind.en} · ${q.t.toFixed(1)} t</title></rect>`
                        : `<rect class="pl-uld empty" x="${x}" y="${y}" width="${cw}" height="${ch}" rx="${1.5 * s}"/>`;
        });
        return `<svg class="pl-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${da ? 'Lastdæk set oppefra' : 'Main deck from above'}">${g}</svg>`;
    }
    const sw = 4.6 * s, sg = 1 * s, aisle = 4.5 * s, rowGap = 1.3 * s, classGap = 4 * s;
    const maxAcross = Math.max(...P.sections.map(t => t.per + (t.seats.length - 1) * 0)), groupsMax = Math.max(...P.sections.map(t => t.seats.length));
    const Hc = maxAcross * (sw + sg) + (groupsMax - 1) * aisle;
    let x = 26 * s, g = '';
    P.sections.forEach((t, si) => {
        const across = t.per * (sw + sg) + (t.seats.length - 1) * aisle, yOff = 10 * s + (Hc - across) / 2;
        const rw = t.c === 'F' || t.c === 'J' ? sw * 1.6 : sw;        // premium seats are longer
        let k = 0;
        for (let row = 0; row < t.rows; row++) {
            let y = yOff;
            t.seats.forEach((grp, gi) => {
                for (let i = 0; i < grp; i++, k++) {
                    g += `<rect class="pl-seat c${t.c}${t.taken[k] ? ' on' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${rw.toFixed(1)}" height="${sw.toFixed(1)}" rx="${(0.8 * s).toFixed(1)}"/>`;
                    y += sw + sg;
                }
                if (gi < t.seats.length - 1) y += aisle;
            });
            x += rw + rowGap;
        }
        if (si < P.sections.length - 1) x += classGap;
    });
    const W = x + 30 * s, H = Hc + 20 * s;
    const body = `<path class="pl-body" d="M${6 * s} ${H / 2} Q${8 * s} ${3 * s} ${26 * s} ${3 * s} L${W - 26 * s} ${3 * s} Q${W - 3 * s} ${3 * s} ${W - 1 * s} ${H / 2} Q${W - 3 * s} ${H - 3 * s} ${W - 26 * s} ${H - 3 * s} L${26 * s} ${H - 3 * s} Q${8 * s} ${H - 3 * s} ${6 * s} ${H / 2}Z"/>`;
    return `<svg class="pl-svg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" width="${W.toFixed(0)}" height="${H.toFixed(0)}" role="img" aria-label="${da ? 'Kabine set oppefra' : 'Cabin from above'}">${body}${g}</svg>`;
}

// Card in the flight panel
function payloadCardHtml(p) {
    const P = payloadFor(p), da = currentLang === 'da', T = (a, b) => da ? a : b;
    const t1 = v => (Math.round(v * 10) / 10).toLocaleString(da ? 'da-DK' : 'en-GB') + ' t';
    if (P.cargo) {
        const pct = Math.round(P.totalT / P.maxT * 100), cgPos = (P.cg - P.cgLim[0]) / (P.cgLim[1] - P.cgLim[0]) * 100;
        return `<div class="ff-card pl-card">
            <div class="ff-title">${T('Last (fragtfly)', 'Cargo (freighter)')} <span class="pl-sim">${T('simuleret', 'simulated')}</span></div>
            <button type="button" class="pl-draw" onclick="event.stopPropagation(); openPayloadBig(${p.num})" title="${T('Vis stort', 'Show large')}">${payloadSvg(p)}</button>
            <div class="pl-stats"><div><b>${t1(P.totalT)}</b><span>${T('last', 'payload')} · ${pct} % ${T('af maks.', 'of max')} ${P.maxT} t</span></div>
                <div><b>${P.pallets.filter(q => q.kind).length}/${P.pallets.length}</b><span>${T('paller', 'pallets')}</span></div>
                <div><b>${P.crew}</b><span>${T('piloter', 'pilots')}</span></div></div>
            <div class="pl-list">${P.groups.map(gp => `<div><i style="background:${gp.kind.col}"></i><span>${da ? gp.kind.da : gp.kind.en} <small>${da ? gp.item[0] : gp.item[1]}</small></span><b>${t1(gp.t)}</b></div>`).join('')}</div>
            <div class="pl-cg"><span>${T('Tyngdepunkt', 'Centre of gravity')} ${P.cg.toFixed(1)} % MAC</span><div class="pl-cg-bar"><div class="pl-cg-ok"></div><i style="left:${cgPos}%"></i></div>
                <small>${T('grænser', 'limits')} ${P.cgLim[0]}–${P.cgLim[1]} % MAC</small></div>
        </div>`;
    }
    const cls = P.sections.map(s => `<div><i class="c${s.c}"></i><span>${da ? CLASS_NAMES[s.c][0] : CLASS_NAMES[s.c][1]}</span><b>${s.pax}/${s.cap}</b></div>`).join('');
    return `<div class="ff-card pl-card">
        <div class="ff-title">${T('Kabine', 'Cabin')} <span class="pl-sim">${T('simuleret', 'simulated')}</span></div>
        <button type="button" class="pl-draw" onclick="event.stopPropagation(); openPayloadBig(${p.num})" title="${T('Vis stort', 'Show large')}">${payloadSvg(p)}</button>
        <div class="pl-stats"><div><b>${P.pax}</b><span>${T('passagerer', 'passengers')} · ${Math.round(P.pax / P.cap * 100)} % ${T('belagt', 'full')}</span></div>
            <div><b>${P.crew.pilots} + ${P.crew.cabin}</b><span>${T('piloter + kabine', 'pilots + cabin')}</span></div></div>
        <div class="pl-list pl-classes">${cls}</div>
        <div class="pl-hold">${T('Lastrum', 'Hold')}: ${T('bagage', 'bags')} ${t1(P.bagsT)}${P.mailT >= 0.05 ? ` · ${T('post', 'mail')} ${t1(P.mailT)}` : ''}${P.bellyT >= 0.05 ? ` · ${T('fragt', 'freight')} ${t1(P.bellyT)}` : ''}</div>
    </div>`;
}
function openPayloadBig(num) {
    const p = activePlaneMarkers[num]; if (!p) return;
    const da = currentLang === 'da', P = payloadFor(p);
    closePayloadBig();
    const box = document.createElement('div');
    box.id = 'payload-big'; box.setAttribute('role', 'dialog');
    box.innerHTML = `<div class="pb-card" onclick="event.stopPropagation()">
        <div class="pb-head"><b>${p.flightNo} · ${p.ac ? p.ac.code + ' ' + p.ac.name : ''}</b><span>${P.cargo ? (da ? 'Lastdæk set oppefra – næsen til højre' : 'Main deck from above – nose to the right') : (da ? 'Kabine set oppefra – næsen til højre' : 'Cabin from above – nose to the right')}</span>
        <button type="button" onclick="closePayloadBig()" aria-label="${da ? 'Luk' : 'Close'}"><span class="material-icons-outlined">close</span></button></div>
        <div class="pb-draw">${payloadSvg(p, window.innerWidth < 700 ? 1.5 : true)}</div>${payloadCardHtml(p).replace(/<button type="button" class="pl-draw"[\s\S]*?<\/button>/, '')}</div>`;
    box.addEventListener('click', closePayloadBig);
    document.body.appendChild(box);
}
function closePayloadBig() { const b = document.getElementById('payload-big'); if (b) b.remove(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('payload-big')) { e.stopImmediatePropagation(); closePayloadBig(); } }, true);
