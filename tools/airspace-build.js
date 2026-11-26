#!/usr/bin/env node
// Builds js/airspace-data.js (closed / caution airspace for the game) from:
//   - EASA's list of Conflict Zone Information Bulletins (which bulletins are active, numbers and dates)
//   - tools/airspace-sources.json (which bulletin covers which airspace, closed or caution)
//   - FIR boundaries from the VATSIM vatspy-data-project (CC BY-SA 4.0)
//
//   node tools/airspace-build.js              -> update js/airspace-data.js, print what changed
//   node tools/airspace-build.js --report f   -> also write a Markdown summary of the changes to f (used for the pull request)
//
// Exit code 0 = done (changed or not); the file "changed" flag is printed as CHANGED=yes|no for the GitHub workflow.
// A bulletin EASA lists that is not in airspace-sources.json is reported as "unmapped" – it needs a human
// to decide which airspace it covers and whether it is closed or caution.
const fs = require('fs'), path = require('path');
const polygonClipping = require('polygon-clipping');
const vm = require('vm');

// Run the game's own route code (js/routes.js + js/airspace.js) in Node to work out which zone corners can
// "see" each other. Shipped with the data, so the first long-haul route in the browser is instant.
function computeCornerVisibility(dataJs) {
    const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
    const ctx = { console, Math, JSON, Uint8Array, Map, Set, performance: { now: () => Date.now() }, setTimeout: () => 0,
        localStorage: { getItem: () => null, setItem() {} }, window: {}, atob: s => Buffer.from(s, 'base64').toString('binary'), currentLang: 'en' };
    vm.createContext(ctx);
    for (const code of [read('js/routes.js'), dataJs, read('js/airspace.js')]) vm.runInContext(code, ctx);
    return vm.runInContext(`(() => { const N = ZONE_NODES.length, bits = new Uint8Array(Math.ceil(N * (N - 1) / 16)); let b = 0;
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++, b++) { const a = ZONE_NODES[i], c = ZONE_NODES[j];
            if (gHav(a[0], a[1], c[0], c[1]) <= 9000 && !legBlocked(a[0], a[1], c[0], c[1])) bits[b >> 3] |= 1 << (b & 7); }
        return { fp: zoneFingerprint(), bits: Array.from(bits) }; })()`, ctx);
}

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'js', 'airspace-data.js');
const EASA_URL = 'https://www.easa.europa.eu/en/domains/air-operations/czibs';
const FIR_URL = 'https://raw.githubusercontent.com/vatsimnetwork/vatspy-data-project/master/Boundaries.geojson';
const argv = process.argv.slice(2);
const reportFile = argv.includes('--report') ? argv[argv.indexOf('--report') + 1] : null;

const decode = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&rsquo;|&#8217;/g, '’')
    .replace(/&quot;/g, '"').replace(/&ndash;/g, '–').replace(/\s+/g, ' ').trim();
const toIso = d => { const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(d || ''); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };

async function get(url) {
    const res = await fetch(url, { headers: { 'user-agent': 'bingo-watch-airspace-updater' } });
    if (!res.ok) throw new Error(url + ' -> HTTP ' + res.status);
    return res.text();
}

// The first table on EASA's page lists the active bulletins (the second the withdrawn ones).
function parseEasa(html) {
    const table = (html.match(/<table[\s\S]*?<\/table>/) || [])[0];
    if (!table) throw new Error('EASA page: no table found – has the page layout changed?');
    const rows = [];
    for (const tr of table.match(/<tr[\s\S]*?<\/tr>/g) || []) {
        const cells = (tr.match(/<td[\s\S]*?<\/td>/g) || []).map(decode);
        if (cells.length < 4) continue;
        const href = (tr.match(/href="([^"]+)"/) || [])[1];
        const subj = cells[3];
        const m = /^(.*?)\s+((?:CZIB-)?\d{4}-\d{2}\s?-?R?\d*)\s+(Active|Suspended|Withdrawn)\s*$/i.exec(subj);
        rows.push({ subject: m ? m[1].trim() : subj, number: m ? m[2].replace(/\s+/g, ' ') : '', status: m ? m[3] : '',
            issued: toIso(cells[0]), revised: toIso(cells[1]), validUntil: toIso(cells[2]),
            url: href ? new URL(href, EASA_URL).href : EASA_URL });
    }
    const active = rows.filter(r => /active/i.test(r.status));
    if (active.length < 3) throw new Error('EASA page: found only ' + active.length + ' active bulletins – layout changed?');
    return active;
}

// Douglas–Peucker in degrees. A closed ring starts and ends on the same point, so it is split at the
// point farthest from the start and both halves are simplified.
function simplify(ring, tol) {
    const open = ring.slice(0, ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? -1 : ring.length);
    if (open.length < 4) return ring;
    let far = 0, fd = -1;
    open.forEach(([x, y], i) => { const d = (x - open[0][0]) ** 2 + (y - open[0][1]) ** 2; if (d > fd) { fd = d; far = i; } });
    const a = dp(open.slice(0, far + 1), tol), b = dp(open.slice(far).concat([open[0]]), tol);
    return a.concat(b.slice(1));
}
function dp(ring, tol) {
    if (ring.length <= 4) return ring;
    const keep = new Uint8Array(ring.length); keep[0] = keep[ring.length - 1] = 1;
    const stack = [[0, ring.length - 1]];
    while (stack.length) {
        const [a, b] = stack.pop(); let idx = -1, max = tol;
        const [x1, y1] = ring[a], [x2, y2] = ring[b], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-9;
        for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * ring[i][0] - dx * ring[i][1] + x2 * y1 - y2 * x1) / L; if (d > max) { max = d; idx = i; } }
        if (idx >= 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
    }
    return ring.filter((_, i) => keep[i]);
}
const r3 = v => Math.round(v * 1000) / 1000;

(async () => {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'airspace-sources.json'), 'utf8'));
    const czibs = parseEasa(await get(EASA_URL));
    const firs = {};
    JSON.parse(await get(FIR_URL)).features.forEach(f => { firs[f.properties.id] = f.geometry; });

    const zones = [], notes = [], used = new Set();
    for (const z of cfg.zones) {
        let src = z.source || null;
        if (z.match) {
            const c = czibs.find(c => c.subject.toLowerCase().includes(z.match.toLowerCase()));
            if (!c) { notes.push(`- **Fjernet:** ${z.da} – EASA har ikke længere "${z.match}" som aktiv advarsel.`); continue; }
            used.add(c);
            src = { da: 'EASA ' + c.number, en: 'EASA ' + c.number, number: c.number, subject: c.subject, url: c.url, issued: c.issued, revised: c.revised, validUntil: c.validUntil };
        }
        let polys = [];
        (z.firs || []).forEach(id => {
            const g = firs[id];
            if (!g) { notes.push(`- **Advarsel:** FIR ${id} (${z.da}) findes ikke i grænsedataene.`); return; }
            polys.push(...(g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates]));
        });
        (z.polys || []).forEach(p => polys.push([p.concat([p[0]])]));
        if (!polys.length) continue;
        let merged = polygonClipping.union(...polys.map(p => [p]));
        if (z.clip && z.clip.maxLat != null) merged = polygonClipping.intersection(merged, [[[-180, -90], [180, -90], [180, z.clip.maxLat], [-180, z.clip.maxLat], [-180, -90]]]);
        // keep real areas; drop the slivers left where neighbouring FIRs do not meet exactly (< 0.5 square degrees)
        const area = r => Math.abs(r.reduce((a, p, i) => { const q = r[(i + 1) % r.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
        const rings = [];
        merged.forEach(poly => poly.forEach(ring => {
            const s = simplify(ring, 0.03).map(([x, y]) => [r3(x), r3(y)]);
            if (s.length >= 4 && (area(s) >= 0.5 || merged.length === 1 && poly.length === 1)) rings.push(s);
        }));
        zones.push({ id: z.id, level: z.level, da: z.da, en: z.en, note_da: z.note_da, note_en: z.note_en,
            except: z.except || [], source: src, rings });
    }
    czibs.filter(c => !used.has(c)).forEach(c => notes.push(`- **NY – kræver handling:** "${c.subject}" (${c.number}, ${c.url}). Den er ikke på kortet endnu: den skal tilføjes i tools/airspace-sources.json (hvilket luftrum, og om det er lukket eller advarsel).`));

    const data = { source: 'EASA Conflict Zone Information Bulletins + EU/Russian airspace bans', easaUrl: EASA_URL,
        firData: 'FIR boundaries: VATSIM vatspy-data-project, CC BY-SA 4.0', zones };
    const v = computeCornerVisibility('const AIRSPACE_DATA = ' + JSON.stringify(data) + ';');
    data.vis = { fp: v.fp, bits: Buffer.from(v.bits).toString('base64') };
    const body = JSON.stringify(data);
    const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    const oldBody = (old.match(/const AIRSPACE_DATA = (.*);\s*$/m) || [])[1];
    const changed = oldBody !== body;
    if (changed) {
        fs.writeFileSync(OUT, `// Bingo Watch – airspace-data.js  (GENERATED by tools/airspace-build.js – do not edit by hand)
// Closed and caution airspace from EASA's Conflict Zone Information Bulletins (${EASA_URL})
// and the EU/Russian airspace bans. FIR boundaries derived from the VATSIM vatspy-data-project,
// licensed CC BY-SA 4.0 (https://github.com/vatsimnetwork/vatspy-data-project); this derived data is shared under the same licence.
// Last changed: ${new Date().toISOString().slice(0, 10)}
const AIRSPACE_DATA = ${body};
`);
    }
    // what changed, in words (for the pull request)
    const prev = oldBody ? JSON.parse(oldBody).zones : [];
    const byId = Object.fromEntries(prev.map(z => [z.id, z]));
    for (const z of zones) {
        const o = byId[z.id];
        if (!o) notes.push(`- **Ny zone:** ${z.da} (${z.level === 'closed' ? 'lukket' : 'advarsel'})${z.source && z.source.number ? ' – ' + z.source.number : ''}`);
        else {
            if (o.level !== z.level) notes.push(`- **Niveau ændret:** ${z.da}: ${o.level} → ${z.level}`);
            if ((o.source || {}).number !== (z.source || {}).number) notes.push(`- **Ny revision:** ${z.da}: ${(o.source || {}).number || '–'} → ${(z.source || {}).number || '–'} (${(z.source || {}).url || ''}). Zonen er opdateret; tjek gerne, om EASA's anbefaling er ændret (lukket ↔ advarsel).`);
        }
        delete byId[z.id];
    }
    Object.values(byId).forEach(z => notes.push(`- **Zone fjernet fra kortet:** ${z.da}`));
    const summary = `${zones.length} zoner (${zones.filter(z => z.level === 'closed').length} lukkede, ${zones.filter(z => z.level === 'caution').length} advarsler) fra ${czibs.length} aktive EASA-advarsler.`;
    console.log(summary); notes.forEach(n => console.log(n)); console.log('CHANGED=' + (changed ? 'yes' : 'no'));
    if (reportFile) fs.writeFileSync(reportFile, `Automatisk opdatering af de lukkede luftrum fra EASA's konfliktzone-advarsler (${EASA_URL}).\n\n${summary}\n\n**Ændringer:**\n${notes.length ? notes.join('\n') : '- Grænser eller datoer er opdateret.'}\n\n**Sådan godkender du:** tryk på **Merge pull request** nederst og derefter **Confirm merge**. Siden er opdateret et par minutter efter. Står der "NY – kræver handling", så spørg Claude om hjælp til at tilføje den.\n`);
})().catch(e => { console.error('AIRSPACE UPDATE FAILED:', e.message); process.exit(1); });
