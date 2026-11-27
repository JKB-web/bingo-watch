// Bingo Watch – changelog.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// =====================================================================
// WHAT'S NEW
// Newest first. Add a new entry at the top when you publish an update:
//   id    'YYYY-MM-DD.n' – must sort after every older id (n = 1, 2 … for several on one day)
//   date  optional date to show, if it differs from the id
//   img   optional picture (made with `node tools/news-shots.js`, see that file)
//   da/en title + a few short points, written for players, not developers
// Returning visitors see the entries they have not seen yet at the top of the welcome card;
// the manual chapter "Nyheder / What's new" lists them all.
// =====================================================================
const CHANGELOG = [
    { id: '2026-11-27.4', date: '2026-11-26', img: 'img/news/2026-11-27-4.webp',
      da: { t: 'Kabine og last', p: [
          'Vælg et fly: passagerfly viser kabinen set oppefra med klasser og optagne sæder, antal passagerer og besætning.',
          'Ca. hvert femte store fly er nu et fragtfly (fx 777F og 747-8F). Det viser pallerne på lastdækket, hvad de indeholder, vægten og tyngdepunktet.',
          'Tryk på tegningen for at se den stort. Det store tal bruger nu en skrifttype uden prik i nullet.'] },
      en: { t: 'Cabin and cargo', p: [
          'Select an aircraft: passenger flights show the cabin from above with classes and taken seats, passengers and crew.',
          'About one in five big aircraft is now a freighter (e.g. 777F and 747-8F). It shows the pallets on the main deck, their contents, the weight and the centre of gravity.',
          'Tap the drawing to see it large. The big number now uses a typeface without a dot in the zero.'] } },
    { id: '2026-11-27.3', date: '2026-11-26', img: 'img/news/2026-11-27-3.webp',
      da: { t: 'Omdirigér fly med ACARS', p: [
          'Tryk <b>Omdirigér</b> ved ALT1 eller ALT2 i flypanelet, og bekræft: flyet får en ACARS-besked, besætningen svarer WILCO, og flyet drejer mod den alternative lufthavn.',
          'Tryk på en lufthavn i flypanelet for at se lufthavnskortet.',
          'Ruter og spor vises nu kun for det valgte fly, så kortet er roligt – også med 90 fly i luften.'] },
      en: { t: 'Divert aircraft via ACARS', p: [
          'Tap <b>Divert</b> next to ALT1 or ALT2 in the flight panel and confirm: the aircraft gets an ACARS message, the crew answers WILCO and turns towards the alternate.',
          'Tap an airport in the flight panel to see the airport card.',
          'Routes and tracks are now only shown for the selected flight, so the map stays calm – even with 90 aircraft airborne.'] } },
    { id: '2026-11-27.2', date: '2026-11-26', img: 'img/news/2026-11-27-2.webp',
      da: { t: 'GADSS og landede fly', p: [
          'En rød GADSS-advarsel får nu en tydelig puls fra cirklen om flyet.',
          'Når en GADSS-hændelse er overstået, bliver den stående i højdeprofilen: gul, hvor positionsrapporten var forsinket, og rød, hvor det var en advarsel.',
          'Landede fly fjerner deres spor fra kortet, så kortet ikke bliver rodet. Vælg flyet for at se det igen.'] },
      en: { t: 'GADSS and landed flights', p: [
          'A red GADSS warning now pulses clearly from the circle round the aircraft.',
          'When a GADSS event is over it stays on the vertical profile: yellow where the position report was overdue, red where it was a warning.',
          'Landed flights remove their track from the map, so it does not get cluttered. Select the flight to see it again.'] } },
    { id: '2026-11-27.1', date: '2026-11-26', img: 'img/news/2026-11-27-1.webp',
      da: { t: 'Realistiske ruter uden om konfliktzoner', p: [
          'Flyene følger ruten i lige stykker med bløde sving – ingen slingren.',
          'Som rigtige fly får de indimellem en genvej eller flyver en kort omvej uden om vejr.',
          'Følger du et fly på det flade kort, glider kortet nu jævnt under flyet i stedet for at hoppe.',
          'Ruterne går uden om lukket luftrum efter EU-luftfartsmyndigheden EASA’s konfliktzone-advarsler – fx Rusland, Belarus, Ukraine, Iran, Irak, Syrien, Sudan og Den Persiske Bugt. Europa–Asien går via Kaukasus eller syd om.',
          'Nyt vejrlag: <b>Lukkede luftrum (EASA)</b> under Advarsler. Rød = lukket, gul = advarsel (fx kun lukket i lav højde). Klik på en zone for EASA’s advarsel. Zonerne opdateres, når EASA ændrer dem.'] },
      en: { t: 'Realistic routes around conflict zones', p: [
          'Aircraft follow the route in straight legs with smooth turns – no weaving.',
          'Like real flights they sometimes get a shortcut or fly a short detour round weather.',
          'When you follow an aircraft on the flat map, the map now glides smoothly under it instead of jumping.',
          'Routes avoid closed airspace according to the conflict zone bulletins of the EU aviation agency EASA – e.g. Russia, Belarus, Ukraine, Iran, Iraq, Syria, Sudan and the Persian Gulf. Europe–Asia goes via the Caucasus or further south.',
          'New weather layer: <b>Closed airspace (EASA)</b> under Warnings. Red = closed, amber = caution (e.g. closed only at low level). Click a zone for EASA’s bulletin. The zones are updated when EASA changes them.'] } },
    { id: '2026-11-26.2', img: 'img/news/2026-11-26-2.webp',
      da: { t: 'Nyheder på velkomstkortet', p: [
          'Når du kommer tilbage, kan du nu se her på velkomstkortet, hvad der er nyt siden sidst.',
          'Alle nyheder står også i manualen under <b>Nyheder</b>.'] },
      en: { t: 'Updates on the welcome card', p: [
          'When you come back, the welcome card now shows what has changed since your last visit.',
          'All updates are also listed in the manual under <b>What’s new</b>.'] } },
    { id: '2026-11-26.1', img: 'img/news/2026-11-26-1.webp',
      da: { t: 'Roligere design', p: [
          'Flade, tydelige knapper og et roligere BANKO-skilt.',
          'Det store tal bruger en tydeligere skrifttype.',
          'I mørkt tema er knapperne nu lyse og tydelige.'] },
      en: { t: 'Calmer design', p: [
          'Flat, clear buttons and a calmer BINGO sign.',
          'The big number uses a clearer typeface.',
          'In the dark theme the buttons are now light and easy to see.'] } },
    { id: '2026-11-23.2', img: 'img/news/2026-11-23-2.webp',
      da: { t: 'Lufthavnskort', p: [
          'Klik på en lufthavn: se fly i luften derfra, fly på vej ind med ETA og landede fly.',
          'Bestil (simuleret) assistance ved landing, fx ambulance, PRM eller teknikker.',
          'Gem dine egne kontakter pr. lufthavn og ring direkte op.',
          'Det fulgte fly hopper ikke længere på kortet.'] },
      en: { t: 'Airport card', p: [
          'Click an airport: see flights airborne from it, inbound flights with ETA and landed flights.',
          'Request (simulated) assistance on arrival, e.g. ambulance, PRM or technician.',
          'Save your own contacts per airport and call them directly.',
          'The followed aircraft no longer appears to hop on the map.'] } },
    { id: '2026-11-23.1', img: 'img/news/2026-11-23-1.webp',
      da: { t: 'Bedre vejr på kortet', p: [
          'Jetstrømmene tegnes som glatte linjer med rigtige vinddata.',
          'Nedbørsradar (RainViewer) ligger nu i menuen Vejrlag.',
          'Animerede vinde følger krumningen på 3D-globussen.',
          'Tropiske cykloner vises igen, og ikonet står fast på cyklonen.',
          'På mobil hopper listen "Mere" ikke længere op i toppen.'] },
      en: { t: 'Better weather on the map', p: [
          'Jetstreams are drawn as smooth lines from real wind data.',
          'Precipitation radar (RainViewer) is now in the Weather layers menu.',
          'Animated winds follow the curve of the 3D globe.',
          'Tropical cyclones show again, and the icon stays on the cyclone.',
          'On phones the "More" list no longer jumps to the top.'] } },
    { id: '2026-11-22.1', img: 'img/news/2026-11-22-1.webp',
      da: { t: 'Flytyper, GADSS og nye vejrlag', p: [
          'Hvert fly får en type, der passer til ruten, med eget ikon, højde og fart.',
          'Simulerede GADSS-advarsler, når et fly ikke har meldt position – også i højdeprofilen.',
          'Mange nye vejrlag: animerede vinde, CAPE, skydække, tåge, isslag, lufttryk, temperatur, satellit m.fl.'] },
      en: { t: 'Aircraft types, GADSS and new weather layers', p: [
          'Every flight gets a type that suits the route, with its own icon, cruise level and speed.',
          'Simulated GADSS alerts when an aircraft has not reported its position – also in the vertical profile.',
          'Many new weather layers: animated winds, CAPE, cloud cover, fog, freezing rain, pressure, temperature, satellite and more.'] } },
    { id: '2026-11-21.1', img: 'img/news/2026-11-21-1.webp',
      da: { t: 'Mobil og kamera', p: [
          'En enklere mobilversion med faner i bunden – både stående og liggende.',
          'Kameraet glider blødt hen til et fly, når du vælger det.'] },
      en: { t: 'Phones and camera', p: [
          'A simpler phone version with tabs at the bottom – portrait and landscape.',
          'The camera glides smoothly to an aircraft when you select it.'] } },
    { id: '2026-11-20.1', img: 'img/news/2026-11-20-1.webp',
      da: { t: 'Manual og ruter', p: [
          'Manual i appen på dansk og engelsk (tryk <b>?</b> eller tasten <b>H</b>).',
          'Klikbare lufthavne og realistiske planlagte ruter.'] },
      en: { t: 'Manual and routes', p: [
          'In-app manual in Danish and English (press <b>?</b> or the <b>H</b> key).',
          'Clickable airports and realistic planned routes.'] } }
];
const CHANGELOG_KEY = 'bingoSeenChangelog';

function changelogSeen() { try { return localStorage.getItem(CHANGELOG_KEY); } catch (e) { return null; } }
function markChangelogSeen() { try { localStorage.setItem(CHANGELOG_KEY, CHANGELOG[0].id); } catch (e) {} }
// Visitors from before this feature have no "seen" mark yet; we recognise them by anything else Bingo Watch
// has saved in this browser (game, settings, weather cache …). Checked once, before this visit saves anything.
const CHANGELOG_RETURNING = (() => { try { return Object.keys(localStorage).some(k => k.startsWith('bingo') && k !== CHANGELOG_KEY); } catch (e) { return false; } })();
// Entries the visitor has not seen. A first-time visitor gets none: to them everything is new.
function unseenChangelog() {
    const seen = changelogSeen();
    if (seen) return CHANGELOG.filter(e => e.id > seen);
    return CHANGELOG_RETURNING ? CHANGELOG : [];
}
function changelogDate(e) {
    const [y, m, d] = (e.date || e.id).slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(currentLang === 'da' ? 'da-DK' : 'en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
}
function changelogEntryHtml(e) {
    const L = e[currentLang === 'da' ? 'da' : 'en'], da = currentLang === 'da';
    const pic = e.img ? `<button type="button" class="news-thumb" onclick="openNewsImage('${e.id}')" aria-label="${da ? 'Vis billede' : 'Show picture'}: ${L.t}">` +
        `<img src="${e.img}" alt="${L.t}" loading="lazy" onerror="this.parentNode.remove()"></button>` : '';
    return `<div class="news-entry${e.img ? ' has-pic' : ''}"><div class="news-text"><div class="news-head"><b>${L.t}</b><span class="news-date">${changelogDate(e)}</span></div>` +
        `<ul>${L.p.map(x => `<li>${x}</li>`).join('')}</ul></div>${pic}</div>`;
}
// Full-size picture on top of everything; click anywhere or press Esc to close.
function openNewsImage(id) {
    const e = CHANGELOG.find(x => x.id === id); if (!e || !e.img) return;
    const L = e[currentLang === 'da' ? 'da' : 'en'];
    closeNewsImage();
    const box = document.createElement('div');
    box.id = 'news-lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', L.t);
    box.innerHTML = `<figure><img src="${e.img}" alt="${L.t}"><figcaption>${L.t} · ${changelogDate(e)}</figcaption></figure>`;
    box.addEventListener('click', closeNewsImage);
    document.body.appendChild(box);
}
function closeNewsImage() { const b = document.getElementById('news-lightbox'); if (b) b.remove(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('news-lightbox')) { e.stopImmediatePropagation(); closeNewsImage(); } }, true);
// "New since last time" block at the top of the welcome card (only for returning visitors with unseen entries).
const newsMax = () => (window.innerWidth < 900 ? 2 : 3);   // phones: keep the welcome card short
function renderBriefingNews() {
    const box = document.getElementById('briefingNews'); if (!box) return;
    const list = unseenChangelog(), da = currentLang === 'da';
    document.body.classList.toggle('has-news', list.length > 0);
    if (!list.length) { box.hidden = true; box.innerHTML = ''; return; }
    const max = newsMax(), more = list.length > max ? list.length - max : 0;
    box.hidden = false;
    box.innerHTML = `<div class="briefing-h3 news-title"><span class="material-icons-outlined">new_releases</span>${da ? 'Nyt siden sidst' : 'New since your last visit'}</div>` +
        list.slice(0, max).map(changelogEntryHtml).join('') +
        `<button type="button" class="news-all" onclick="openManual('news')">${more ? (da ? `+ ${more} mere – se alle nyheder` : `+ ${more} more – see all updates`) : (da ? 'Se alle nyheder' : 'See all updates')} ›</button>`;
    if (typeof fitBriefingCard === 'function') fitBriefingCard();
}
// Manual chapter body (all entries).
function changelogManualHtml(lang) {
    const keep = currentLang; currentLang = lang;
    const h = CHANGELOG.map(changelogEntryHtml).join('');
    currentLang = keep;
    return `<p>${lang === 'da' ? 'De seneste opdateringer af Bingo Watch, nyeste først.' : 'The latest updates to Bingo Watch, newest first.'}</p><div class="news-list">${h}</div>`;
}
