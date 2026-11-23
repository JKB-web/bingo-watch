// Bingo Watch – airport-card.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.
//
// Tap / click an airport on the map -> an airport card:
//   • traffic: aircraft airborne from here and inbound (with ETA) – tap a flight to select it
//   • assistance on arrival: order ambulance, PRM / wheelchair, fire & rescue standby, technician or fuel
//     for an inbound flight (simulated – shown on the flight and confirmed when it lands)
//   • contacts: the controller's own phone numbers / notes per airport (saved in this browser only)
//   • weather here (the old click behaviour) and a link to look the airport up online

const AP_CONTACT_KEY = 'bingoApContacts';
const AP_CONTACT_FIELDS = [
    { k: 'ops', icon: 'support_agent', da: 'OPS / handling', en: 'OPS / handling' },
    { k: 'med', icon: 'medical_services', da: 'Ambulance / læge', en: 'Ambulance / medical' },
    { k: 'arff', icon: 'local_fire_department', da: 'Brand & redning', en: 'Fire & rescue' },
    { k: 'fuel', icon: 'local_gas_station', da: 'Brændstof', en: 'Fuel' }
];
const ASSIST_TYPES = [
    { k: 'med', icon: 'medical_services', da: 'Ambulance', en: 'Ambulance' },
    { k: 'prm', icon: 'accessible', da: 'Kørestol / PRM', en: 'Wheelchair / PRM' },
    { k: 'arff', icon: 'local_fire_department', da: 'Brandberedskab', en: 'Fire standby' },
    { k: 'tech', icon: 'build', da: 'Tekniker', en: 'Technician' },
    { k: 'fuel', icon: 'local_gas_station', da: 'Hurtig tankning', en: 'Quick refuel' }
];
let apContacts = {};
try { apContacts = JSON.parse(localStorage.getItem(AP_CONTACT_KEY) || '{}') || {}; } catch (e) { apContacts = {}; }
function saveApContacts() { try { localStorage.setItem(AP_CONTACT_KEY, JSON.stringify(apContacts)); } catch (e) {} }

const apCard = { el: null, code: null, editing: false, assistFor: null, timer: 0 };
const apEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const apTel = s => String(s || '').replace(/[^\d+]/g, '');
const apL = (da, en) => currentLang === 'da' ? da : en;

function apFlights(code) {
    const all = Object.values(activePlaneMarkers);
    const eta = p => p.stdMs + p.durMin * 60000;
    return {
        inbound: all.filter(p => !p.landed && p.destAirport.code === code).sort((a, b) => eta(a) - eta(b)),
        outbound: all.filter(p => !p.landed && p.depAirport.code === code),
        landed: all.filter(p => p.landed && p.destAirport.code === code).length,
        eta
    };
}

function airportCardHtml(ap) {
    const da = currentLang === 'da';
    const home = ap.code === currentICAO;
    const cur = AIRPORT_DB.find(a => a.code === currentICAO);
    const f = apFlights(ap.code);
    const c = apContacts[ap.code] || {};
    const dist = cur && !home ? `${Math.round(gHav(cur.lat, cur.lon, ap.lat, ap.lon))} NM ${apL('fra', 'from')} ${cur.code} · ${String(Math.round(gBearing(cur.lat, cur.lon, ap.lat, ap.lon))).padStart(3, '0')}°` : '';

    // ---- inbound traffic + assistance ----
    const assistName = k => { const t = ASSIST_TYPES.find(a => a.k === k); return t ? apL(t.da, t.en) : k; };
    const rows = f.inbound.slice(0, 6).map(p => {
        const remMin = Math.max(0, Math.round((p.totalDistNm - p.flownDistNm) / (p.nmps || CONSTANT_NM_PER_SECOND) / 60 * 10) / 10);
        const asg = p.assist ? `<span class="apc-assist-chip"><span class="material-icons-outlined">${ASSIST_TYPES.find(a => a.k === p.assist.type).icon}</span>${apEsc(assistName(p.assist.type))}</span>` : '';
        const picker = apCard.assistFor === p.num ? `<div class="apc-assist-pick">${ASSIST_TYPES.map(t =>
            `<button type="button" class="${p.assist && p.assist.type === t.k ? 'on' : ''}" onclick="requestAssistance(${p.num}, '${t.k}')"><span class="material-icons-outlined">${t.icon}</span>${apL(t.da, t.en)}</button>`).join('')}
            ${p.assist ? `<button type="button" class="apc-cancel" onclick="requestAssistance(${p.num}, null)"><span class="material-icons-outlined">close</span>${apL('Annullér', 'Cancel')}</button>` : ''}</div>` : '';
        return `<div class="apc-flight">
                <button type="button" class="apc-flight-main" onclick="apSelectFlight(${p.num})" title="${apL('Vælg flyet', 'Select the flight')}">
                    <b>${p.flightNo}</b><span>${apL('fra', 'from')} ${p.depAirport.code}</span><span class="apc-eta">ETA ${hhmm(f.eta(p))}</span>
                </button>
                <button type="button" class="apc-assist-btn ${p.assist ? 'on' : ''}" onclick="toggleAssistPicker(${p.num})" title="${apL('Bestil assistance ved landing', 'Request assistance on arrival')}">
                    <span class="material-icons-outlined">${p.assist ? 'check_circle' : 'add_alert'}</span>
                </button>
                ${asg}${picker}
            </div>`;
    }).join('');
    const more = f.inbound.length > 6 ? `<div class="apc-muted">+ ${f.inbound.length - 6} ${apL('flere', 'more')}</div>` : '';

    // ---- contacts ----
    let contacts;
    if (apCard.editing) {
        contacts = `<form class="apc-form" onsubmit="saveAirportContacts(event)">
            ${AP_CONTACT_FIELDS.map(fl => `<label><span class="material-icons-outlined">${fl.icon}</span><input type="tel" name="${fl.k}" value="${apEsc(c[fl.k])}" placeholder="${apL(fl.da, fl.en)}" autocomplete="off"></label>`).join('')}
            <label class="apc-note"><span class="material-icons-outlined">sticky_note_2</span><textarea name="note" rows="2" placeholder="${apL('Note (fx frekvens, gate, kontaktperson)', 'Note (e.g. frequency, stand, contact person)')}">${apEsc(c.note)}</textarea></label>
            <div class="apc-form-btns"><button type="button" class="apc-btn" onclick="editAirportContacts(false)">${apL('Fortryd', 'Cancel')}</button><button type="submit" class="apc-btn apc-primary">${apL('Gem', 'Save')}</button></div>
        </form>`;
    } else {
        const list = AP_CONTACT_FIELDS.filter(fl => c[fl.k]).map(fl =>
            `<a class="apc-contact" href="tel:${apEsc(apTel(c[fl.k]))}"><span class="material-icons-outlined">${fl.icon}</span><span class="apc-contact-l">${apL(fl.da, fl.en)}</span><b>${apEsc(c[fl.k])}</b></a>`).join('');
        const note = c.note ? `<div class="apc-note-txt">${apEsc(c.note)}</div>` : '';
        contacts = (list || note) ? list + note
            : `<div class="apc-muted">${apL('Ingen kontakter gemt for denne lufthavn endnu.', 'No contacts saved for this airport yet.')}</div>`;
        contacts += `<div class="apc-contact-actions">
            <button type="button" class="apc-btn" onclick="editAirportContacts(true)"><span class="material-icons-outlined">edit</span>${(list || note) ? apL('Redigér', 'Edit') : apL('Tilføj kontakter', 'Add contacts')}</button>
            <a class="apc-btn" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(ap.code + ' ' + ap.name + ' airport operations contact')}"><span class="material-icons-outlined">travel_explore</span>${apL('Find online', 'Look up')}</a>
        </div>`;
    }

    return `<div class="apc">
        <div class="apc-head"><b>${ap.code}</b>${home ? `<span class="ap-badge">${apL('Valgt', 'Selected')}</span>` : ''}<button type="button" class="apc-x" onclick="closeAirportCard()" aria-label="${apL('Luk', 'Close')}"><span class="material-icons-outlined">close</span></button></div>
        <div class="apc-name">${apEsc(ap.name)}</div>
        <div class="apc-stats">
            <div><b>${f.outbound.length}</b><span>${apL('Afgået, i luften', 'Departed, airborne')}</span></div>
            <div><b>${f.inbound.length}</b><span>${apL('På vej hertil', 'Inbound')}</span></div>
            <div><b>${f.landed}</b><span>${apL('Landet her', 'Landed here')}</span></div>
        </div>
        <div class="apc-sub">${dist ? dist + '<br>' : ''}${formatDMS(ap.lat, ap.lon)}</div>
        <div class="apc-scroll">
            <div class="apc-sec"><span class="material-icons-outlined">flight_land</span>${apL('Indgående fly · assistance ved landing', 'Inbound · assistance on arrival')}</div>
            ${rows || `<div class="apc-muted">${apL('Ingen fly på vej hertil lige nu.', 'No aircraft inbound right now.')}</div>`}${more}
            <div class="apc-sec"><span class="material-icons-outlined">call</span>${apL('Kontakter', 'Contacts')}<small>${apL('gemt i denne browser', 'saved in this browser')}</small></div>
            ${contacts}
        </div>
        <div class="apc-actions">
            <button type="button" class="apc-btn apc-primary" onclick="apShowWeather('${ap.code}')"><span class="material-icons-outlined">cloud</span>${apL('Vejr her', 'Weather here')}</button>
        </div>
    </div>`;
}

function openAirportCard(code, at) {
    const ap = AIRPORT_DB.find(a => a.code === code);
    if (!ap || !map) return;
    if (apCard.code !== code) { apCard.editing = false; apCard.assistFor = null; }
    closeAirportCard(true);
    apCard.code = code;
    // A fixed panel on top of everything (a map popup would end up underneath the windows)
    const el = document.createElement('div');
    el.id = 'ap-card'; el.className = 'ap-card';
    el.innerHTML = airportCardHtml(ap);
    el.addEventListener('mousedown', e => e.stopPropagation());
    document.body.appendChild(el);
    apCard.el = el;
    placeAirportCard(ap, at);
    // traffic changes all the time: refresh the numbers (but never while the user is typing)
    clearInterval(apCard.timer);
    apCard.timer = setInterval(() => { if (!apCard.editing) refreshAirportCard(); }, 4000);
}
// desktop: next to the airport, kept inside the window; phones: a sheet above the tab bar (CSS)
function placeAirportCard(ap, at) {
    const el = apCard.el; if (!el || isMobileUI()) return;
    const m = map.getContainer().getBoundingClientRect();
    const pt = at || map.project([ap.lon, ap.lat]);
    const x = m.left + pt.x, y = m.top + pt.y, w = el.offsetWidth, h = el.offsetHeight;
    let left = x + 18, top = y - 40;
    if (left + w > window.innerWidth - 60) left = x - w - 18;          // flip to the left of the airport
    left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
    top = Math.max(m.top + 8, Math.min(window.innerHeight - h - 12, top));
    el.style.left = left + 'px'; el.style.top = top + 'px';
}
function refreshAirportCard() {
    if (!apCard.el || !apCard.code) return;
    const ap = AIRPORT_DB.find(a => a.code === apCard.code); if (!ap) return;
    const sc = apCard.el.querySelector('.apc-scroll'), top = sc ? sc.scrollTop : 0;
    apCard.el.innerHTML = airportCardHtml(ap);
    const sc2 = apCard.el.querySelector('.apc-scroll'); if (sc2) sc2.scrollTop = top;
    keepAirportCardOnScreen();
}
function keepAirportCardOnScreen() {
    const el = apCard.el; if (!el || isMobileUI()) return;
    const r = el.getBoundingClientRect(), minTop = map.getContainer().getBoundingClientRect().top + 8;
    if (r.bottom > window.innerHeight - 12) el.style.top = Math.max(minTop, window.innerHeight - r.height - 12) + 'px';
}
function closeAirportCard(silent) {
    clearInterval(apCard.timer); apCard.timer = 0;
    if (apCard.el) { apCard.el.remove(); apCard.el = null; }
    if (!silent) { apCard.code = null; apCard.editing = false; apCard.assistFor = null; }
}
function editAirportContacts(on) {
    apCard.editing = !!on; refreshAirportCard();
    if (on) setTimeout(() => { const i = apCard.el && apCard.el.querySelector('.apc-form input'); if (i && !isMobileUI()) i.focus(); }, 30);
}
function saveAirportContacts(e) {
    e.preventDefault();
    const fd = new FormData(e.target), rec = {};
    AP_CONTACT_FIELDS.forEach(fl => { const v = String(fd.get(fl.k) || '').trim().slice(0, 40); if (v) rec[fl.k] = v; });
    const note = String(fd.get('note') || '').trim().slice(0, 300); if (note) rec.note = note;
    if (Object.keys(rec).length) apContacts[apCard.code] = rec; else delete apContacts[apCard.code];
    saveApContacts();
    apCard.editing = false; refreshAirportCard();
    showToast(apL('Kontakter gemt for ', 'Contacts saved for ') + apCard.code);
}
function toggleAssistPicker(num) { apCard.assistFor = apCard.assistFor === num ? null : num; refreshAirportCard(); }
function requestAssistance(num, type) {
    const p = activePlaneMarkers[num]; if (!p) return;
    const t = ASSIST_TYPES.find(a => a.k === type);
    if (!t) {
        delete p.assist;
        showToast(apL(`Assistance til ${p.flightNo} annulleret`, `Assistance for ${p.flightNo} cancelled`));
    } else {
        p.assist = { type, at: p.destAirport.code };
        const c = apContacts[p.destAirport.code] || {}, phone = c[type] || c.ops;
        showToast(apL(`${p.destAirport.code}: ${t.da} bestilt til ${p.flightNo} ved landing`, `${p.destAirport.code}: ${t.en} requested for ${p.flightNo} on arrival`) + (phone ? ` · ☎ ${phone}` : ''));
    }
    if (p.el) p.el.classList.toggle('has-assist', !!p.assist);
    apCard.assistFor = null;
    refreshAirportCard();
    if (focusedFlightNum === num && typeof updateFlightFocus === 'function') updateFlightFocus();
}
// called from the animation loop when a flight lands
function assistOnLanding(p) {
    if (!p.assist) return;
    const t = ASSIST_TYPES.find(a => a.k === p.assist.type);
    showToast(apL(`${p.flightNo} er landet i ${p.destAirport.code} – ${t.da.toLowerCase()} står klar`, `${p.flightNo} landed at ${p.destAirport.code} – ${t.en.toLowerCase()} standing by`));
    if (apCard.code === p.destAirport.code) refreshAirportCard();
}
function apSelectFlight(num) { closeAirportCard(); if (typeof focusFlightInLog === 'function') focusFlightInLog(num); }
function apShowWeather(code) { closeAirportCard(); selectAirport(code); }
// Escape closes the card; switching language redraws it
document.addEventListener('keydown', e => { if (e.key === 'Escape' && apCard.el) closeAirportCard(); });
