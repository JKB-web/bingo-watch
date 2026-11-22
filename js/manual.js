// Bingo Watch – manual.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// =====================================================================
// MANUAL (in-app help, Danish + English)
// =====================================================================
const K = k => `<kbd>${k}</kbd>`;
const I = i => `<span class="material-icons-outlined mi">${i}</span>`;
const MANUAL = [
    { id: 'start', icon: 'rocket_launch',
      da: { t: 'Kom godt i gang', h: `
        <p>Bingo Watch er en banko-opråber med et levende flykort. Hvert trukket tal bliver til et fly, der letter fra en lufthavn og flyver en realistisk rute hen over kortet.</p>
        <h4>Sådan kører du et spil</h4>
        <ol>
          <li>Vælg <b>Dansk</b> eller <b>English</b> i velkomstvinduet og tryk <b>Bekræft &amp; start</b>.</li>
          <li>Vælg hvad der spilles om øverst i <b>Flight Deck-kontrol</b>: <i>1 række</i>, <i>2 rækker</i> eller <i>Fuld plade</i>.</li>
          <li>Tryk <b>TRÆK NUMMER</b> eller ${K('Mellemrum')}. Tallet ruller, lander og et nyt fly letter.</li>
          <li>Når nogen råber banko: tjek pladen i <b>Tjek plade</b>, tryk <b>BANKO!</b> i topbjælken for fejring, og skift runde.</li>
          <li>Til næste spil trykker du <b>Nyt spil</b> (du bliver spurgt først).</li>
        </ol>
        <div class="tip">${I('tips_and_updates')} Har du en projektor eller et TV: læg hovedskærmen derop, og åbn <b>Opråber-skærmen</b> (${K('O')}) på din egen skærm. Så styrer du spillet derfra.</div>
        <h4>Skærmens dele</h4>
        <ul>
          <li><b>Topbjælken</b>: logo, BANKO!, Nyt spil, UTC-ur, opråber-skærm, sæson, lys/mørk og indstillinger.</li>
          <li><b>Sidemenuen</b> til venstre: åbner og lukker vinduerne (${I('menu')} folder den ud med navne).</li>
          <li><b>Kortet</b> i baggrunden med fly, ruter, lufthavne og vejrlag.</li>
          <li><b>Værktøjslinjen</b> til højre: zoom, globus, ringe, radar, vejrlag og sol.</li>
          <li><b>De runde knapper</b> nederst til højre: fuldskærm, lyd, fortryd og autopilot.</li>
          <li><b>Statistik</b> nederst i midten: trukket, tilbage og flyvetid.</li>
        </ul>` },
      en: { t: 'Getting started', h: `
        <p>Bingo Watch is a bingo caller with a live flight map. Every number drawn becomes an aircraft that takes off from an airport and flies a realistic route across the map.</p>
        <h4>Running a game</h4>
        <ol>
          <li>Choose <b>English</b> or <b>Dansk</b> in the welcome window and press <b>Confirm &amp; launch</b>.</li>
          <li>Choose what is being played for at the top of <b>Flight Deck Control</b>: <i>1 row</i>, <i>2 rows</i> or <i>Full card</i>.</li>
          <li>Press <b>DRAW NUMBER</b> or ${K('Space')}. The number rolls, lands and a new aircraft takes off.</li>
          <li>When someone calls bingo: check the card in <b>Verify Win</b>, press <b>BANKO!</b> in the top bar to celebrate, and change the round.</li>
          <li>For the next game press <b>New Game</b> (you are asked first).</li>
        </ol>
        <div class="tip">${I('tips_and_updates')} With a projector or TV: put the main screen up there and open the <b>caller screen</b> (${K('O')}) on your own monitor to run the game from there.</div>
        <h4>The parts of the screen</h4>
        <ul>
          <li><b>Top bar</b>: logo, BANKO!, New Game, UTC clock, caller screen, season, light/dark and settings.</li>
          <li><b>Side menu</b> on the left: opens and closes the windows (${I('menu')} expands it with names).</li>
          <li><b>The map</b> in the background with aircraft, routes, airports and weather layers.</li>
          <li><b>Toolbar</b> on the right: zoom, globe, rings, radar, weather layers and sun.</li>
          <li><b>Round buttons</b> bottom right: fullscreen, sound, undo and autopilot.</li>
          <li><b>Stats</b> bottom centre: drawn, remaining and flight time.</li>
        </ul>` } },
    { id: 'deck', icon: 'flight_takeoff',
      da: { t: 'Flight Deck – træk tal', h: `
        <ul>
          <li><b>Der spilles om</b>: 1 række, 2 rækker eller Fuld plade. Bruges af <i>Tjek plade</i> og vises på storskærmen.</li>
          <li><b>Det store tal</b> er det senest trukne. Under det står <b>Forrige</b> med de fem tal før, og et kaldenavn for tallet (fx “Den tykke dame”).</li>
          <li><b>TRÆK NUMMER</b> / ${K('Mellemrum')} trækker et tilfældigt tal blandt dem, der er tilbage. Man kan ikke komme til at trække to på én gang, og der trækkes aldrig et tal to gange.</li>
          <li>${I('dvr')} åbner <b>Opråber-skærmen</b>, ${I('tv')} åbner <b>Storskærmen</b>.</li>
        </ul>
        <h4>Autopilot</h4>
        <p>${I('hdr_weak')} eller ${K('A')} trækker automatisk med det interval, du vælger under Indstillinger → Generelt (standard 5 sek.). Tryk igen for at stoppe. Autopilot stopper også, når du trykker BANKO!.</p>
        <h4>Fortryd og fejl</h4>
        <ul>
          <li>${I('undo')} <b>Fortryd</b> fjerner det sidste tal igen – også flyet og linjen i Aktive fly.</li>
          <li>I <b>manuel tilstand</b> kan du fjerne et hvilket som helst tal ved at klikke på det i talgitteret (du bliver spurgt først).</li>
        </ul>
        <h4>Spillet bliver gemt</h4>
        <p>Alt gemmes løbende i browseren: trukne tal, flyvetid, runde, sprog og flyene. Lukker browseren, eller opdaterer nogen siden, kommer spillet tilbage, og flyene er fløjet videre imens.</p>
        <h4>Nyt spil</h4>
        <p><b>Nyt spil</b> i topbjælken eller ${K('R')} nulstiller alt – men først efter du har bekræftet.</p>` },
      en: { t: 'Flight Deck – drawing', h: `
        <ul>
          <li><b>Playing for</b>: 1 row, 2 rows or Full card. Used by <i>Verify Win</i> and shown on the big screen.</li>
          <li><b>The big number</b> is the latest draw. Below it, <b>Previous</b> shows the five before, plus a nickname for the number.</li>
          <li><b>DRAW NUMBER</b> / ${K('Space')} draws a random number from those left. You cannot draw two at once, and a number is never drawn twice.</li>
          <li>${I('dvr')} opens the <b>caller screen</b>, ${I('tv')} opens the <b>big screen</b>.</li>
        </ul>
        <h4>Autopilot</h4>
        <p>${I('hdr_weak')} or ${K('A')} draws automatically at the interval set under Settings → General (default 5 s). Press again to stop. Autopilot also stops when you press BANKO!.</p>
        <h4>Undo and mistakes</h4>
        <ul>
          <li>${I('undo')} <b>Undo</b> removes the last number – including its aircraft and its line in Active Flights.</li>
          <li>In <b>manual mode</b> you can remove any number by clicking it in the number grid (you are asked first).</li>
        </ul>
        <h4>The game is saved</h4>
        <p>Everything is saved in the browser as you go: numbers, flight time, round, language and aircraft. If the browser closes or the page is reloaded, the game comes back and the aircraft have kept flying.</p>
        <h4>New game</h4>
        <p><b>New Game</b> in the top bar or ${K('R')} resets everything – only after you confirm.</p>` } },
    { id: 'grid', icon: 'grid_on',
      da: { t: 'Talgitter og manuel tilstand', h: `
        <p><b>Talgitteret</b> viser 1–90. Trukne tal er markeret, og det seneste er fremhævet med accentfarven.</p>
        <h4>Manuel tilstand (fysiske kugler)</h4>
        <p>Bruger du rigtige kugler, så slå <b>Manuel tilstand</b> til under Indstillinger → Generelt. Klik derefter på tallet i gitteret, når kuglen kommer ud. Klik på et markeret tal for at fjerne det igen.</p>
        <p>Klik ignoreres, mens en automatisk trækning ruller, så der aldrig kommer to tal på én gang.</p>` },
      en: { t: 'Number grid and manual mode', h: `
        <p>The <b>number grid</b> shows 1–90. Drawn numbers are marked and the latest is highlighted in the accent colour.</p>
        <h4>Manual mode (physical balls)</h4>
        <p>If you use real balls, turn on <b>Manual mode</b> under Settings → General. Then click the number in the grid when the ball comes out. Click a marked number to remove it again.</p>
        <p>Clicks are ignored while an automatic draw is rolling, so two numbers never arrive at once.</p>` } },
    { id: 'flights', icon: 'radar',
      da: { t: 'Aktive fly', h: `
        <p>Hvert trukket tal bliver flyet <b>BNGO + tal</b> (fx BNGO24) mellem to af 112 lufthavne verden over.</p>
        <ul>
          <li><b>Listen</b> viser fly, afgangstid (STD), afgang, destination og ankomst (ETA) med en lille fremdriftsbjælke. Landede fly bliver grå.</li>
          <li><b>Klik på en række</b> for detaljer, og for at vælge flyet på kortet.</li>
          <li><b>Søg</b> på flynummer, lufthavn eller by.</li>
          <li><b>Flytyper</b>: hvert fly får en type, der passer til ruten – turboprop og regionaljets på korte ture, mellemjets på mellemdistance og store to- og firemotorers fly på langdistance. Ikonet på kortet viser typen, og flyvehøjde og fart følger den.</li>
          <li>${I('print')} printer en liste over de trukne tal med kaldenavne.</li>
        </ul>` },
      en: { t: 'Active flights', h: `
        <p>Every number drawn becomes flight <b>BNGO + number</b> (e.g. BNGO24) between two of 112 airports worldwide.</p>
        <ul>
          <li><b>The list</b> shows flight, departure time (STD), origin, destination and arrival (ETA) with a small progress bar. Landed flights turn grey.</li>
          <li><b>Click a row</b> for details and to select the aircraft on the map.</li>
          <li><b>Search</b> by flight number, airport or city.</li>
          <li><b>Aircraft types</b>: every flight gets a type that suits the route – turboprops and regional jets on short hops, medium jets on medium range and big twin and four-engine aircraft on long haul. The map icon shows the type, and cruise level and speed follow it.</li>
          <li>${I('print')} prints a list of the drawn numbers with their nicknames.</li>
        </ul>` } },
    { id: 'map', icon: 'public',
      da: { t: 'Kortet', h: `
        <h4>Fly og ruter</h4>
        <ul>
          <li>Den <b>stiplede linje</b> er flyets planlagte rute. Flyet flyver tæt på den, men ikke præcist – som et rigtigt fly, der får genveje og påvirkes af vind.</li>
          <li>Det <b>farvede spor</b> bag flyet viser, hvor det har fløjet. Farven viser højden: lyseblå tæt ved jorden, mørkegrøn i marchhøjde.</li>
          <li><b>Klik på et fly</b> for at vælge det (se “Flypanel og højdeprofil”). Klik et tomt sted på kortet for at fravælge det igen.</li>
        </ul>
        <h4>Lufthavne</h4>
        <p>De små prikker er lufthavne. <b>Hold musen over</b> en prik for navn, antal fly til og fra, og afstand fra den valgte lufthavn. <b>Klik</b> for at skifte til lufthavnen og se vejret derfra i vejrvinduet.</p>
        <h4>Værktøjslinjen til højre</h4>
        <ul>
          <li>${I('add_circle_outline')} ${I('remove_circle_outline')} zoom ind og ud.</li>
          <li>${I('my_location')} centrér på den valgte lufthavn.</li>
          <li>${I('public')} skift mellem 2D-kort og 3D-globus.</li>
          <li>${I('track_changes')} rækkeviddecirkler og lufthavne.</li>
          <li>${I('radar')} nedbørsradar (fra jordbaserede radarer – dækker ikke hele verden, fx næsten ikke Afrika).</li>
          <li>${I('layers')} vejrlag (se “Vejr”).</li>
          <li>${I('wb_sunny')} sol og dag/nat-grænse.</li>
        </ul>
        <p>Træk i kortet for at flytte det, scroll for at zoome. Koordinaterne for musen står nederst til venstre.</p>` },
      en: { t: 'The map', h: `
        <h4>Aircraft and routes</h4>
        <ul>
          <li>The <b>dashed line</b> is the planned route. The aircraft flies close to it but not exactly on it – like a real aircraft getting shortcuts and pushed by the wind.</li>
          <li>The <b>coloured track</b> behind the aircraft shows where it has flown. The colour shows altitude: light blue near the ground, dark green at cruise.</li>
          <li><b>Click an aircraft</b> to select it (see “Flight panel and profile”). Click an empty spot on the map to deselect.</li>
        </ul>
        <h4>Airports</h4>
        <p>The small dots are airports. <b>Hover</b> a dot for its name, flights to and from it, and distance from the selected airport. <b>Click</b> to switch to that airport and see its weather in the weather window.</p>
        <h4>Toolbar on the right</h4>
        <ul>
          <li>${I('add_circle_outline')} ${I('remove_circle_outline')} zoom in and out.</li>
          <li>${I('my_location')} centre on the selected airport.</li>
          <li>${I('public')} switch between the 2D map and the 3D globe.</li>
          <li>${I('track_changes')} range rings and airports.</li>
          <li>${I('radar')} precipitation radar (from ground radars – does not cover the whole world, e.g. hardly any of Africa).</li>
          <li>${I('layers')} weather layers (see “Weather”).</li>
          <li>${I('wb_sunny')} sun and day/night line.</li>
        </ul>
        <p>Drag the map to move it, scroll to zoom. The mouse coordinates are shown bottom left.</p>` } },
    { id: 'focus', icon: 'flight',
      da: { t: 'Flypanel og højdeprofil', h: `
        <p>Når du vælger et fly, åbner et panel i højre side, og en <b>højdeprofil</b> vises i bunden. Kortet og vinduerne rykker til side, så intet dækker hinanden.</p>
        <ul>
          <li><b>Flyvning</b>: ATC ID, registrering, dato, STD, afgang, destination, to alternative lufthavne (ALT1/ALT2) og ruten.</li>
          <li><b>Live</b>: fase (stiger, marchhøjde, daler, landet), afgang, landing, højde, vertikal hastighed, kurs, hastighed, anslået brændstof, squawk, sim-tid, distance tilbage og position.</li>
          <li><b>Højdeprofilen</b>: den stiplede kurve er planen, den farvede er det fløjne. Hold musen over grafen for tid, højde og distance.</li>
          <li><b>Følg fly</b> får kameraet til at følge flyet. Træk i kortet for at slippe det.</li>
          <li><b>Luk</b>, et klik på flyet igen, eller et klik et tomt sted fravælger flyet og zoomer ud igen.</li>
        </ul>
        <p class="note">Flyene er fiktive: registrering, squawk, højdeprofil og brændstof er simuleret.</p>` },
      en: { t: 'Flight panel and profile', h: `
        <p>When you select an aircraft, a panel opens on the right and a <b>vertical profile</b> appears at the bottom. The map and windows move aside so nothing covers anything else.</p>
        <ul>
          <li><b>Flight</b>: ATC ID, registration, date, STD, origin, destination, two alternates (ALT1/ALT2) and the route.</li>
          <li><b>Live</b>: phase (climbing, cruise, descending, landed), takeoff, landing, altitude, vertical speed, track, speed, estimated fuel, squawk, sim time, distance remaining and position.</li>
          <li><b>Vertical profile</b>: the dashed curve is the plan, the coloured one is what has been flown. Hover the chart for time, altitude and distance.</li>
          <li><b>Follow aircraft</b> makes the camera follow it. Drag the map to let go.</li>
          <li><b>Close</b>, clicking the aircraft again, or clicking an empty spot deselects it and zooms back out.</li>
        </ul>
        <p class="note">The aircraft are fictional: registration, squawk, profile and fuel are simulated.</p>` } },
    { id: 'gadss', icon: 'emergency_home',
      da: { t: 'GADSS-advarsler', h: `
        <p>GADSS er ICAO's system til at holde øje med fly, der holder op med at sende deres position. Bingo Watch simulerer det for sjov – sjældent og stille, så det ikke forstyrrer spillet: ca. én gang hvert 4.–5. minut stopper et fly i marchhøjde med at rapportere, og der er aldrig mere end én advarsel ad gangen.</p>
        <ul>
          <li><b>Forsigtighed (gul)</b>: ingen positionsrapport i 10 minutter. Flyet får en svag gul glorie på kortet, og rækken i Aktive fly bliver gul. Ingen lyd. De fleste forsvinder igen her.</li>
          <li><b>Advarsel (rød)</b>: ingen rapport i 15 minutter eller mere. Glorien bliver rød, og der lyder et enkelt blødt signal.</li>
          <li>I <b>højdeprofilen</b> er strækningen siden sidste positionsrapport farvet gul eller rød, og sidste rapport er markeret med en prik.</li>
          <li><b>Advarselsbjælken</b> øverst på kortet viser alle aktive advarsler. Klik på en for at vælge flyet, eller tryk ✓ for at kvittere.</li>
          <li>I <b>flypanelet</b> står advarslen øverst med en <b>Kvittér</b>-knap. Kvitterede advarsler pulserer roligere.</li>
          <li>Når flyet melder sig igen, forsvinder advarslen stille.</li>
        </ul>
        <p>Slå simuleringen fra under Indstillinger → Generelt (eller Mere på mobil). 1 minut i simuleringen svarer til ca. 3 sekunder.</p>` },
      en: { t: 'GADSS warnings', h: `
        <p>GADSS is ICAO's system for keeping track of aircraft that stop sending their position. Bingo Watch simulates it for fun – rarely and quietly, so it does not disturb the game: about once every 4–5 minutes an aircraft in cruise stops reporting, and there is never more than one alert at a time.</p>
        <ul>
          <li><b>Caution (yellow)</b>: no position report for 10 minutes. The aircraft gets a soft yellow glow on the map and its row in Active Flights turns yellow. No sound. Most clear again at this stage.</li>
          <li><b>Warning (red)</b>: no report for 15 minutes or more. The glow turns red and a single soft chime sounds.</li>
          <li>In the <b>vertical profile</b> the stretch since the last position report is shaded yellow or red, and the last report is marked with a dot.</li>
          <li>The <b>alert bar</b> at the top of the map lists every active alert. Click one to select the aircraft, or press ✓ to acknowledge.</li>
          <li>In the <b>flight panel</b> the alert is shown at the top with an <b>Acknowledge</b> button. Acknowledged alerts pulse more calmly.</li>
          <li>When the aircraft reports again, the alert quietly disappears.</li>
        </ul>
        <p>Turn the simulation off under Settings → General (or More on mobile). One simulated minute is about 3 seconds.</p>` } },
    { id: 'weather', icon: 'cloud',
      da: { t: 'Vejr', h: `
        <h4>Vejrvinduet</h4>
        <p>Skriv en by eller en ICAO-kode (fx <i>Odense</i> eller <i>EKOD</i>) og tryk ${I('search')}. Du får vind, temperatur, sigtbarhed, QNH og den rå METAR. Vejret opdateres hvert 10. minut; ${I('refresh')} henter med det samme. Findes der ingen officiel METAR, vises modeldata fra Open-Meteo, tydeligt markeret.</p>
        <h4>Vejrlag på kortet (${I('layers')})</h4>
        <p>Lagene er delt i grupper i menuen. Farvelag får en lille forklaring nederst til venstre.</p>
        <ul>
          <li><b>Vind og højde</b>: <i>Animerede vinde</i> (bevægelige strømlinjer, farvet efter fart – vælg niveau SFC, FL180, FL300 eller FL340), jetstrømme, vindfaner, turbulens i klar luft (CAT) og tropopause.</li>
          <li><b>Skyer og konvektion</b>: samlet skydække, CAPE og lifted index (hvor tordenvejr kan opstå), konvektive skytoppe (anslået højde) og satellitbillede (dagens sidste hele mosaik).</li>
          <li><b>Farer</b>: isdannelse under flyvning, isslag-sandsynlighed, tåge-sandsynlighed, sigtbarhed og støv.</li>
          <li><b>Jordoverflade</b>: lufttryk som isobarer med høj- og lavtryk (H/L), trykændring over 3 timer og temperatur 2 m over jorden.</li>
          <li><b>Advarsler</b>: tropiske cykloner, vulkaner og SIGMET.</li>
        </ul>
        <p class="note">Data kommer fra et groft globalt net (Open-Meteo, NASA GIBS for satellit, Open-Meteo luftkvalitet for støv). Tåge, isslag og skytoppe er beregnet ud fra disse data og er kun vejledende. Kan data ikke hentes, bruges en indbygget model; statuslinjen nederst i menuen fortæller hvilken.</p>` },
      en: { t: 'Weather', h: `
        <h4>The weather window</h4>
        <p>Type a city or an ICAO code (e.g. <i>Odense</i> or <i>EKOD</i>) and press ${I('search')}. You get wind, temperature, visibility, QNH and the raw METAR. Weather refreshes every 10 minutes; ${I('refresh')} fetches now. If there is no official METAR, Open-Meteo model data is shown, clearly marked.</p>
        <h4>Weather layers on the map (${I('layers')})</h4>
        <p>The layers are grouped in the menu. Colour layers get a small legend bottom left.</p>
        <ul>
          <li><b>Wind and altitude</b>: <i>Animated winds</i> (moving streamlines coloured by speed – choose level SFC, FL180, FL300 or FL340), jetstreams, wind barbs, clear air turbulence (CAT) and tropopause.</li>
          <li><b>Cloud and convection</b>: total cloud cover, CAPE and lifted index (where thunderstorms can develop), convective cloud tops (estimated height) and satellite imagery (latest complete daily mosaic).</li>
          <li><b>Hazards</b>: in-flight icing, freezing rain probability, fog probability, visibility and dust.</li>
          <li><b>Surface</b>: mean sea level pressure as isobars with highs and lows (H/L), 3-hour pressure tendency and temperature 2 m above ground.</li>
          <li><b>Warnings</b>: tropical cyclones, volcanoes and SIGMET.</li>
        </ul>
        <p class="note">Data comes from a coarse global grid (Open-Meteo, NASA GIBS for satellite, Open-Meteo air quality for dust). Fog, freezing rain and cloud tops are derived from that data and are guidance only. If data cannot be fetched a built-in model is used; the status line at the bottom of the menu says which.</p>` } },
    { id: 'cards', icon: 'grid_view',
      da: { t: 'Bankoplader og Tjek plade', h: `
        <h4>Pladegenerator</h4>
        <p>Vælg antal spillere og plader pr. spiller, og tryk <b>Generér &amp; print PDF</b>. Hver plade får et ID som <i>3-1</i> (spiller 3, plade 1). Pladerne følger de almindelige regler: 3 rækker × 9 kolonner, 5 tal pr. række, kolonne 1 = 1–9, kolonne 2 = 10–19 … kolonne 9 = 80–90.</p>
        <p class="note">Pladerne gemmes i den browser, der lavede dem. Laver du nye, erstatter de de gamle.</p>
        <h4>Tjek plade</h4>
        <p>Skriv plade-ID'et og tryk <b>Tjek</b> (eller ${K('Enter')}). Pladen scannes, de trukne tal lyser op, og fuldførte rækker bliver grønne. Resultatet bedømmes efter runden:</p>
        <ul>
          <li><b>Gyldig gevinst</b> – pladen har nok rækker til det, der spilles om.</li>
          <li><b>Ikke nok</b> – fx 1 række, når der spilles om 2 rækker.</li>
          <li><b>Ingen gevinst</b> – med antal ramte tal ud af 15.</li>
        </ul>` },
      en: { t: 'Bingo cards and Verify Win', h: `
        <h4>Card generator</h4>
        <p>Choose the number of players and cards per player, and press <b>Generate &amp; print PDF</b>. Each card gets an ID like <i>3-1</i> (player 3, card 1). Cards follow the usual rules: 3 rows × 9 columns, 5 numbers per row, column 1 = 1–9, column 2 = 10–19 … column 9 = 80–90.</p>
        <p class="note">Cards are stored in the browser that created them. Generating new cards replaces the old ones.</p>
        <h4>Verify Win</h4>
        <p>Type the card ID and press <b>Check</b> (or ${K('Enter')}). The card is scanned, drawn numbers light up and complete rows turn green. The result follows the round:</p>
        <ul>
          <li><b>Valid win</b> – the card has enough rows for what is being played for.</li>
          <li><b>Not enough</b> – e.g. 1 row while playing for 2 rows.</li>
          <li><b>No win</b> – with the number of hits out of 15.</li>
        </ul>` } },
    { id: 'extras', icon: 'redeem',
      da: { t: 'Gavefordeling og konfliktløsning', h: `
        <h4>Gavefordeling</h4>
        <p>Skriv antal gaver og tryk <b>Sæt</b> for at fylde puljen. <b>Træk</b> finder et tilfældigt gavenummer, som fjernes fra puljen. Når puljen er tom, står der “Tom – tryk SET”. Der er en pulje til små og en til store gaver.</p>
        <h4>Konfliktløsning</h4>
        <p>Har flere banko på samme tal: skriv antal spillere og tryk <b>Afgør</b>. Et hjul ruller og lander på en vinder.</p>` },
      en: { t: 'Prizes and conflict resolution', h: `
        <h4>Prize distribution</h4>
        <p>Type the number of prizes and press <b>Set</b> to fill the pool. <b>Draw</b> picks a random prize number and removes it from the pool. When the pool is empty it says “Empty – press SET”. There is one pool for small and one for big prizes.</p>
        <h4>Conflict resolution</h4>
        <p>When several players call bingo on the same number: type the number of players and press <b>Resolve</b>. A reel rolls and lands on a winner.</p>` } },
    { id: 'caller', icon: 'dvr',
      da: { t: 'Opråber-skærm', h: `
        <p>Opråber-skærmen er dit eget kontrolpanel, mens hovedskærmen med OCC-kortet vises for salen. Åbn den med ${I('dvr')} i topbjælken, i Flight Deck eller med ${K('O')}, og flyt vinduet over på din egen skærm.</p>
        <ul>
          <li><b>NÆSTE NUMMER</b> (${K('Mellemrum')} / ${K('Enter')}), det aktuelle tal, de seneste fem og hvor mange der er trukket.</li>
          <li>Fortryd (${K('U')}), Autopilot (${K('A')}), BANKO! (${K('B')}) og runde.</li>
          <li><b>Talgitter</b>: klik på et tal for at markere det (til fysiske kugler) – klik igen for at fjerne det.</li>
          <li><b>Tjek plade</b> direkte i vinduet, og <b>Vis på storskærm</b> for at vise tjekket for salen.</li>
          <li>Knapper til <b>Storskærm</b> (${K('P')}) og <b>Attract mode</b>.</li>
        </ul>
        <p class="note">Åbner du Bingo Watch fra GitHub, fortsætter opråber-skærmen af sig selv, hvis hovedskærmen genindlæses. Åbner du filen lokalt, vises knappen <b>Genforbind opråber-skærm</b> – ét klik åbner et nyt vindue. Tillad pop op-vinduer, hvis browseren blokerer dem.</p>` },
      en: { t: 'Caller screen', h: `
        <p>The caller screen is your own control panel while the main screen with the OCC map is shown to the room. Open it with ${I('dvr')} in the top bar, in the Flight Deck or with ${K('O')}, and move the window to your own monitor.</p>
        <ul>
          <li><b>NEXT NUMBER</b> (${K('Space')} / ${K('Enter')}), the current number, the last five and how many are drawn.</li>
          <li>Undo (${K('U')}), Autopilot (${K('A')}), BANKO! (${K('B')}) and the round.</li>
          <li><b>Number grid</b>: click a number to mark it (for physical balls) – click again to remove it.</li>
          <li><b>Verify a card</b> right in the window, and <b>Show on big screen</b> to show the check to the room.</li>
          <li>Buttons for the <b>big screen</b> (${K('P')}) and <b>attract mode</b>.</li>
        </ul>
        <p class="note">When Bingo Watch is opened from GitHub, the caller screen carries on by itself if the main screen is reloaded. When the file is opened locally, a <b>Reconnect caller screen</b> button appears – one click opens a new window. Allow pop-ups if the browser blocks them.</p>` } },
    { id: 'stage', icon: 'tv',
      da: { t: 'Storskærm og attract mode', h: `
        <h4>Storskærm</h4>
        <p>${K('P')} eller ${I('tv')} viser en ren visning til projektor/TV i fuld skærm: et kæmpe tal, kaldenavnet, de seneste tal, hele talgitteret, runden og antal trukne. ${K('Mellemrum')} trækker stadig, ${K('Esc')} lukker.</p>
        <h4>Attract mode</h4>
        <p>Når der ikke sker noget, tager kameraet en rundtur: hele verden, fly i luften, lufthavne og (i juletilstand) julemanden – med en lille infoboks nederst. Vinduerne toner ud, så kun kortet ses.</p>
        <ul>
          <li>Vælg under Indstillinger → Generelt: <i>Fra / efter 2 / 5 / 10 min</i>, eller tryk <b>Start nu</b>.</li>
          <li>Den stopper ved musebevægelse, klik, tast eller når et nyt tal trækkes – også fra opråber-skærmen.</li>
        </ul>` },
      en: { t: 'Big screen and attract mode', h: `
        <h4>Big screen</h4>
        <p>${K('P')} or ${I('tv')} shows a clean full-screen view for a projector/TV: a huge number, its nickname, the last numbers, the whole grid, the round and the count. ${K('Space')} still draws, ${K('Esc')} closes.</p>
        <h4>Attract mode</h4>
        <p>When nothing is happening, the camera takes a tour: the whole world, aircraft in flight, airports and (in Christmas mode) Santa – with a small caption at the bottom. The windows fade out so only the map shows.</p>
        <ul>
          <li>Set it under Settings → General: <i>Off / after 2 / 5 / 10 min</i>, or press <b>Start now</b>.</li>
          <li>It stops on mouse movement, a click, a key or when a new number is drawn – also from the caller screen.</li>
        </ul>` } },
    { id: 'seasons', icon: 'celebration',
      da: { t: 'Sæsontilstande', h: `
        <p>Vælg i sæson-menuen i topbjælken eller under Indstillinger → Udseende. <b>Automatisk</b> vælger efter datoen.</p>
        <ul>
          <li><b>Jul</b> – sne, julelys, nissehue, kanebjælder og <i>Jingle Bells</i> ved BANKO. Julemanden flyver rundt om jorden (live juleaften, ellers en øvetur) – klik på ham for at følge ham.</li>
          <li><b>Nytår</b> – guldglimmer og en midnatsbølge vestpå med fyrværkeri over hver by (live nytårsnat, ellers prøvekørsel).</li>
          <li><b>Påske</b> – blomsterblade, flagranke og 12 påskeæg gemt ved lufthavne. Klik og find dem alle.</li>
          <li><b>Halloween</b> – flagermus og spøgelser på kortet. Klik på dem for “BØH!”.</li>
          <li><b>Fest</b> – balloner og en bannertekst, du selv skriver (fx “Tillykke Jonas 50 år”), i topbjælken og på storskærmen.</li>
        </ul>
        <p>Hver sæson har egne farver, lyde, kaldenavne for udvalgte tal og konfetti.</p>` },
      en: { t: 'Season modes', h: `
        <p>Choose in the season menu in the top bar or under Settings → Visuals. <b>Automatic</b> chooses by date.</p>
        <ul>
          <li><b>Christmas</b> – snow, lights, Santa hat, sleigh bells and <i>Jingle Bells</i> on BANKO. Santa flies around the world (live on Christmas Eve, otherwise a practice run) – click him to follow.</li>
          <li><b>New Year</b> – gold glitter and a midnight wave heading west with fireworks over each city (live on New Year's night, otherwise a rehearsal).</li>
          <li><b>Easter</b> – petals, bunting and 12 Easter eggs hidden near airports. Click to find them all.</li>
          <li><b>Halloween</b> – bats and ghosts on the map. Click them for “BOO!”.</li>
          <li><b>Party</b> – balloons and a banner text of your own (e.g. “Happy 50th, Jonas”) in the top bar and on the big screen.</li>
        </ul>
        <p>Each season has its own colours, sounds, nicknames for selected numbers and confetti.</p>` } },
    { id: 'settings', icon: 'settings',
      da: { t: 'Indstillinger', h: `
        <ul>
          <li><b>Generelt</b>: attract mode, sprog, manuel tilstand, autopilot-interval og <b>Nulstil vindueslayout</b> (${K('L')}).</li>
          <li><b>Lyd</b>: lydstyrke og til/fra for kliklyd, ding-dong og fanfare. ${I('volume_up')} / ${K('M')} slår al lyd fra.</li>
          <li><b>Udseende</b>: sæson, bannertekst, tema (lys, nat, matrix), primær- og accentfarve.</li>
          <li><b>Genveje</b>: oversigt over tasterne.</li>
        </ul>
        <p>${I('dark_mode')} i topbjælken skifter hurtigt mellem lyst og mørkt. Vinduerne kan flyttes i titellinjen og gøres større i hjørnet nederst til højre – de lægger sig pænt på et usynligt gitter.</p>` },
      en: { t: 'Settings', h: `
        <ul>
          <li><b>General</b>: attract mode, language, manual mode, autopilot interval and <b>Reset window layout</b> (${K('L')}).</li>
          <li><b>Audio</b>: volume and on/off for click, chime and fanfare. ${I('volume_up')} / ${K('M')} mutes everything.</li>
          <li><b>Visuals</b>: season, banner text, theme (light, night, matrix), primary and accent colour.</li>
          <li><b>Shortcuts</b>: list of the keys.</li>
        </ul>
        <p>${I('dark_mode')} in the top bar switches quickly between light and dark. Windows can be moved by their title bar and resized from the bottom-right corner – they snap neatly to an invisible grid.</p>` } },
    { id: 'keys', icon: 'keyboard',
      da: { t: 'Tastaturgenveje', h: `
        <table class="keys">
          <tr><td>${K('Mellemrum')}</td><td>Træk næste tal</td></tr>
          <tr><td>${K('A')}</td><td>Autopilot til/fra</td></tr>
          <tr><td>${K('B')}</td><td>BANKO! (fejring)</td></tr>
          <tr><td>${K('M')}</td><td>Lyd til/fra</td></tr>
          <tr><td>${K('R')}</td><td>Nyt spil (med bekræftelse)</td></tr>
          <tr><td>${K('P')}</td><td>Storskærm</td></tr>
          <tr><td>${K('O')}</td><td>Opråber-skærm</td></tr>
          <tr><td>${K('H')}</td><td>Denne manual</td></tr>
          <tr><td>${K('F')}</td><td>Fuldskærm</td></tr>
          <tr><td>${K('L')}</td><td>Nulstil vindueslayout</td></tr>
          <tr><td>${K('Esc')}</td><td>Luk storskærm / manual</td></tr>
        </table>
        <p>På opråber-skærmen: ${K('Mellemrum')}/${K('Enter')} næste, ${K('U')} fortryd, ${K('A')} autopilot, ${K('B')} BANKO!, ${K('P')} storskærm.</p>` },
      en: { t: 'Keyboard shortcuts', h: `
        <table class="keys">
          <tr><td>${K('Space')}</td><td>Draw next number</td></tr>
          <tr><td>${K('A')}</td><td>Autopilot on/off</td></tr>
          <tr><td>${K('B')}</td><td>BANKO! (celebration)</td></tr>
          <tr><td>${K('M')}</td><td>Sound on/off</td></tr>
          <tr><td>${K('R')}</td><td>New game (with confirmation)</td></tr>
          <tr><td>${K('P')}</td><td>Big screen</td></tr>
          <tr><td>${K('O')}</td><td>Caller screen</td></tr>
          <tr><td>${K('H')}</td><td>This manual</td></tr>
          <tr><td>${K('F')}</td><td>Fullscreen</td></tr>
          <tr><td>${K('L')}</td><td>Reset window layout</td></tr>
          <tr><td>${K('Esc')}</td><td>Close big screen / manual</td></tr>
        </table>
        <p>On the caller screen: ${K('Space')}/${K('Enter')} next, ${K('U')} undo, ${K('A')} autopilot, ${K('B')} BANKO!, ${K('P')} big screen.</p>` } },
    { id: 'mobile', icon: 'smartphone',
      da: { t: 'Mobil', h: `
        <p>På en telefon er Bingo Watch forenklet: fanebladene i bunden – <b>Kort, Træk, Tal, Fly, Mere</b> – åbner ét vindue ad gangen i fuld bredde. Tryk på samme fane igen for at komme tilbage til kortet. Under <b>Mere</b> finder du vejr, gaver, tjek plade, konfliktløsning, pladegenerator, indstillinger, autopilot og lyd.</p>` },
      en: { t: 'Mobile', h: `
        <p>On a phone Bingo Watch is simplified: the tabs at the bottom – <b>Map, Draw, Numbers, Flights, More</b> – open one window at a time at full width. Tap the same tab again to return to the map. <b>More</b> holds weather, prizes, verify win, conflict resolution, card generator, settings, autopilot and sound.</p>` } },
    { id: 'help', icon: 'help_outline',
      da: { t: 'Tips og fejlfinding', h: `
        <ul>
          <li><b>Internet</b>: kort, vejr, radar og skrifttyper hentes fra internettet. Selve spillet virker videre, hvis forbindelsen falder ud.</li>
          <li><b>Gemt i browseren</b>: spil, plader og indstillinger ligger i den browser og på den computer, du bruger. En anden computer har sine egne.</li>
          <li><b>Pop op-vinduer</b>: opråber-skærm og print åbner nye vinduer – tillad pop op-vinduer for siden.</li>
          <li><b>Ny version vises ikke</b>: tryk ${K('Ctrl')}+${K('F5')} (Mac: ${K('Cmd')}+${K('Shift')}+${K('R')}).</li>
          <li><b>Vinduerne er rodet</b>: Indstillinger → Generelt → Nulstil vindueslayout, eller ${K('L')}.</li>
          <li><b>Kører det tungt</b>: slå vindfaner og andre vejrlag fra.</li>
          <li><b>Mindre bevægelse</b>: har computeren “reducér bevægelse” slået til, bliver animationer korte og effekter roligere.</li>
        </ul>` },
      en: { t: 'Tips and troubleshooting', h: `
        <ul>
          <li><b>Internet</b>: map, weather, radar and fonts come from the internet. The game itself keeps working if the connection drops.</li>
          <li><b>Stored in the browser</b>: games, cards and settings live in the browser and computer you use. Another computer has its own.</li>
          <li><b>Pop-ups</b>: the caller screen and printing open new windows – allow pop-ups for the page.</li>
          <li><b>New version not showing</b>: press ${K('Ctrl')}+${K('F5')} (Mac: ${K('Cmd')}+${K('Shift')}+${K('R')}).</li>
          <li><b>Windows are messy</b>: Settings → General → Reset window layout, or ${K('L')}.</li>
          <li><b>Running slowly</b>: turn off wind barbs and other weather layers.</li>
          <li><b>Less motion</b>: if the computer has “reduce motion” on, animations are short and effects calmer.</li>
        </ul>` } }
];
let manualSection = 'start';
function renderManual() {
    const lang = currentLang === 'da' ? 'da' : 'en';
    const q = (document.getElementById('manualSearch').value || '').trim().toLowerCase();
    const strip = h => h.replace(/<[^>]+>/g, ' ').toLowerCase();
    const hits = MANUAL.filter(s => !q || s[lang].t.toLowerCase().includes(q) || strip(s[lang].h).includes(q));
    document.getElementById('manualToc').innerHTML = hits.map(s => `<button type="button" class="mt-item${s.id === manualSection && !q ? ' on' : ''}" onclick="showManualSection('${s.id}')">${I(s.icon)}<span>${s[lang].t}</span></button>`).join('')
        || `<div class="mt-empty">${lang === 'da' ? 'Ingen resultater' : 'No results'}</div>`;
    const body = document.getElementById('manualBody');
    const list = q ? hits : MANUAL.filter(s => s.id === manualSection);
    body.innerHTML = list.map(s => `<section id="ms-${s.id}"><h3>${I(s.icon)} ${s[lang].t}</h3>${s[lang].h}</section>`).join('<hr>') || '';
    if (q) body.querySelectorAll('section').forEach(sec => highlightIn(sec, q));
    document.getElementById('manualTitle').textContent = lang === 'da' ? 'Manual' : 'Manual';
    document.getElementById('manualSearch').placeholder = lang === 'da' ? 'Søg i manualen…' : 'Search the manual…';
    const idx = MANUAL.findIndex(s => s.id === manualSection);
    document.getElementById('manualPrev').disabled = !!q || idx <= 0;
    document.getElementById('manualNext').disabled = !!q || idx >= MANUAL.length - 1;
    document.getElementById('manualPrev').textContent = '← ' + (idx > 0 ? MANUAL[idx - 1][lang].t : '');
    document.getElementById('manualNext').textContent = (idx < MANUAL.length - 1 ? MANUAL[idx + 1][lang].t : '') + ' →';
}
function highlightIn(root, q) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => { const i = n.nodeValue.toLowerCase().indexOf(q); if (i < 0 || n.parentNode.closest('.mi')) return;
        const m = document.createElement('mark'); const r = n.splitText(i); r.splitText(q.length); m.textContent = r.nodeValue; r.parentNode.replaceChild(m, r); });
}
function showManualSection(id) { manualSection = id; document.getElementById('manualSearch').value = ''; renderManual(); document.getElementById('manualBody').scrollTop = 0; }
function manualStep(d) { const i = MANUAL.findIndex(s => s.id === manualSection); const n = MANUAL[i + d]; if (n) showManualSection(n.id); }
function openManual(id) {
    if (id) manualSection = id;
    document.body.classList.add('manual-open');
    if (isMobileUI()) mobileSetTab('map');
    renderManual();
    setTimeout(() => document.getElementById('manualSearch').focus({ preventScroll: true }), 50);
}
function closeManual() { document.body.classList.remove('manual-open'); }
