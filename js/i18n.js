// Bingo Watch – i18n.js
// Plain script (not a module): all files share one global scope and are loaded in order from index.html.

// --- TRANSLATION DATA ---
const translations = {
    da: {
        flightDeck: "Flight Deck-kontrol", systemReady: "Klar til første træk", drawBtn: "Træk nummer", settings: "Indstillinger",
        tabGeneral: "Generelt", tabAudio: "Lyd", tabVisual: "Udseende", tabShortcuts: "Genveje",
        language: "Sprog", manualMode: "Manuel tilstand (klik på tal)", apInterval: "Autopilot-interval (sek.)", resetLayout: "Nulstil vindueslayout",
        volume: "Lydstyrke", soundClick: "Kliklyd", soundChime: "Ding-dong", soundFanfare: "Bankofanfare", soundTcas: "TCAS-alarm",
        theme: "Tema", colPrimary: "Primærfarve", colAccent: "Accentfarve", resetColors: "Nulstil farver",
        keyDraw: "Træk nummer", keySound: "Lyd", navGrid: "Talgitter",
        wxWind: "VIND", wxTemp: "TEMP", wxVis: "SIGT",
        weatherTitle: "Vejr", wxMenuTitle: "Vejrlag", wxRefresh: "Opdatér live-data",
        tipRadar: "Live nedbørsradar (RainViewer)", tipWxMenu: "Vejrlag", tipSun: "Sol / dag-nat-terminator", tipZoomIn: "Zoom ind (+)", tipZoomOut: "Zoom ud (−)",
        tipCenter: "Centrér på lufthavn", tipGlobe: "3D globus / 2D kort", tipRings: "OCC-rækkeviddecirkler og waypoints",
        phFlights: "Søg efter fly...", phWx: "By eller ICAO (fx Odense)", phCard: "Plade-ID",
        tieTitle: "Konfliktløsning", tiePlayers: "Spillere i dødt løb", tieBtn: "AFGØR", btnCheck: "TJEK", btnClr: "RYD",
        lblOrigin: "Afgang", lblDest: "Destination", lblSpeed: "Hastighed / flyveniveau", lblHdg: "Kurs", lblRem: "Resterende distance", stInFlight: "I LUFTEN", stLanded: "LANDET",
        tracking: "FØLGER",
        brTitle: "Flight deck-orientering", brWelcomeH: "Velkommen, controller",
        brWelcomeP1: "Du har nu kommandoen over <strong>BINGO WATCH</strong>. Din mission er at guide passagererne sikkert gennem luftrummet (tallene 1-90) til landing (BANKO).",
        brWelcomeP2: "Baggrunden viser et monokromt <strong>OCC taktisk radarkort</strong> (2D / 3D globus, rækkeviddecirkler, flyruter og ni live vejrlag: <strong>jetstrømme, vindfaner, skyområder, CAT, tropopause, isdannelse, tropiske cykloner, vulkaner &amp; SIGMET</strong> samt RainViewer-radar).",
        brInstrH: "Instrumentoversigt",
        brI1T: "Talgitter og log", brI1P: "Visuel oversigt over alle trukne tal og den historiske flyvelog.",
        brI2T: "Pladegenerator", brI2P: "Print nye flyveplaner (bankoplader) til hele holdet.",
        brI3T: "Tjek gevinst", brI3P: "Indtast plade-ID for automatisk at validere en bankomelding.",
        brI4T: "Gavefordeling", brI4P: "Administrér gaver og træk tilfældige vindere til sidegevinster.",
        brI5T: "Live vejr og OCC", brI5P: "Skift 3D globus, sol / dag-nat, rækkeviddecirkler og menuen Vejrlag i højre værktøjslinje.",
        brI6T: "Konfliktløsning", brI6P: "Afgør «dødt løb» mellem spillere med tilfældigt udtræk.",
        brKeysH: "Cockpit-kontroller (genveje)",
        brK1: "Træk næste nummer", brK2: "Banko (fejring)", brK3: "Autopilot (auto-træk)", brK4: "Lyd til / fra", brK5: "Nulstil system", brK6: "Fuldskærm",
        brStatus: "Live vejr", brLaunch: "Start spillet",
        thFlight: "Fly", thDep: "AFG", thDest: "DEST", tieShort: "Konfliktløsning", mMute: "Lyd fra/til", keyBanko: "Banko", keyReset: "Nulstil", ttAutoUpd: "Opdateres automatisk hvert 10. min", ttWxRefresh: "Opdatér vejrdata nu", ttSearch: "Søg", ttPrint: "Print flyvelog", ttRelease: "Slip kameraet", ttFull: "Fuldskærm (F)", ttMute: "Lyd fra/til (M)", ttUndo: "Fortryd", ttAuto: "Autopilot (A)", ttTheme: "Skift lys / mørk tilstand", ttSettings: "Indstillinger", thLight: "OCC Taktisk lys", thNight: "OCC Taktisk nat", thMatrix: "OCC Matrix-radar", roundLabel: "Der spilles om", round1: "1 række", round2: "2 rækker", round3: "Fuld plade", ttStage: "Storskærm (P)", ttStageClose: "Luk (Esc)", xmasMode: "Juletilstand", ttXmas: "Juletilstand (julemand, sne og julelyde)", seasonMode: "Sæson", seasonNone: "Fra", seasonAuto: "Automatisk (efter dato)", seasonXmas: "Jul", seasonNewyear: "Nytår", seasonEaster: "Påske", seasonHalloween: "Halloween", seasonParty: "Fest / fødselsdag", partyText: "Bannertekst", ttSeason: "Sæsontilstand", attractLabel: "Attract mode", attractOff: "Fra", attract2: "Efter 2 min", attract5: "Efter 5 min", attract10: "Efter 10 min", attractNow: "Start nu", ttCaller: "Opråber-skærm (O)", manualLabel: "Manual", ttManual: "Manual (H)", tipStage: "Storskærm", keyFull: "Fuldskærm", mUndo: "Fortryd", gadssLabel: "GADSS-simulering", mMap: "Kort", mDraw: "Træk", mGrid: "Tal", mFlights: "Fly", mMore: "Mere", flightLog: "Aktive fly", statsTitle: "Missionsstatistik", statDrawn: "Trukket", statRemain: "Tilbage", statTime: "Flyvetid", statPrev: "Forrige",
        newGame: "Nyt spil", bankoMsg: "BANKO!",
        prizeTitle: "Gavefordeling", prizeSmall: "Små gaver", prizeBig: "Store gaver", btnSet: "SÆT", btnDrawSmall: "TRÆK", btnDrawBig: "TRÆK",
        lingoDefault: "Waypoint bekræftet",
        genTitle: "Pladegenerator", genPlayers: "Antal spillere", genCards: "Plader pr. spiller", genPrint: "GENERÉR & PRINT PDF",
        verifyTitle: "Tjek plade", verifyBtn: "Tjek"
    },
    en: {
        flightDeck: "Flight Deck Control", systemReady: "Ready for the first draw", drawBtn: "Draw number", settings: "Settings",
        tabGeneral: "General", tabAudio: "Audio", tabVisual: "Visuals", tabShortcuts: "Shortcuts",
        language: "Language", manualMode: "Manual Mode (Click #)", apInterval: "AP Interval (Sec)", resetLayout: "Reset Window Layout",
        volume: "Volume", soundClick: "Click Sound", soundChime: "Ding-Dong", soundFanfare: "Bingo Fanfare", soundTcas: "TCAS Alert",
        theme: "Theme Preset", colPrimary: "Primary Color", colAccent: "Accent Color", resetColors: "Reset Colors",
        keyDraw: "Draw Number", keySound: "Sound", navGrid: "Navigation Grid",
        wxWind: "WIND", wxTemp: "TEMP", wxVis: "VISIBILITY",
        weatherTitle: "Weather", wxMenuTitle: "Weather Layers", wxRefresh: "Refresh live data",
        tipRadar: "Live Precipitation Radar (RainViewer)", tipWxMenu: "Weather Layers", tipSun: "Sun / Day-Night Terminator", tipZoomIn: "Zoom In (+)", tipZoomOut: "Zoom Out (-)",
        tipCenter: "Center on Airport", tipGlobe: "3D Globe / 2D Map", tipRings: "OCC Tactical Range Rings & Waypoints",
        phFlights: "Search flights", phWx: "City or ICAO (e.g. Odense)", phCard: "Card ID",
        tieTitle: "Conflict Resolution", tiePlayers: "Players in Dead Heat", tieBtn: "RESOLVE", btnCheck: "CHECK", btnClr: "CLR",
        lblOrigin: "Origin", lblDest: "Destination", lblSpeed: "Speed / Flight Level", lblHdg: "Track Heading", lblRem: "Remaining Distance", stInFlight: "IN FLIGHT", stLanded: "LANDED",
        tracking: "TRACKING",
        brTitle: "Flight deck briefing", brWelcomeH: "Welcome, controller",
        brWelcomeP1: "You are now in command of <strong>BINGO WATCH</strong>. Your mission is to guide passengers safely through the airspace (numbers 1-90) until landing (BINGO).",
        brWelcomeP2: "The background features a monochrome <strong>OCC Tactical Radar Map</strong> (2D / 3D Globe, range rings, flight tracks and nine live weather layers: <strong>Jetstreams, Wind barbs, Cloud areas, CAT, Tropopause, Icing, Tropical cyclones, Volcanoes &amp; SIGMET</strong>, plus RainViewer radar).",
        brInstrH: "Instruments",
        brI1T: "Number grid and log", brI1P: "Visual tracking of all drawn numbers and historical flight log.",
        brI2T: "Card generator", brI2P: "Print new flight plans (bingo cards) for the entire crew.",
        brI3T: "Verify win", brI3P: "Enter Card ID to automatically validate a claimed Bingo.",
        brI4T: "Prize draw", brI4P: "Manage inventory and randomly draw winners for side prizes.",
        brI5T: "Live weather and OCC", brI5P: "Toggle 3D Globe, sun / day-night, range rings and the Weather Layers menu on the right toolbar.",
        brI6T: "Tie-breaker", brI6P: "Resolve \"dead heat\" tie-breaker situations between players.",
        brKeysH: "Cockpit shortcuts",
        brK1: "Draw next number", brK2: "Bingo celebration", brK3: "Autopilot (auto-draw)", brK4: "Mute", brK5: "Reset", brK6: "Fullscreen",
        brStatus: "Live weather", brLaunch: "Start the game",
        thFlight: "Flight", thDep: "DEP", thDest: "DEST", tieShort: "Conflict Res.", mMute: "Mute", keyBanko: "Banko", keyReset: "Reset", ttAutoUpd: "Auto-updates every 10 min", ttWxRefresh: "Refresh weather data now", ttSearch: "Search", ttPrint: "Print flight log", ttRelease: "Release camera", ttFull: "Fullscreen (F)", ttMute: "Mute / unmute (M)", ttUndo: "Undo", ttAuto: "Autopilot (A)", ttTheme: "Switch light / dark mode", ttSettings: "Settings", thLight: "OCC Tactical Light", thNight: "OCC Tactical Night", thMatrix: "OCC Matrix Radar", roundLabel: "Playing for", round1: "1 row", round2: "2 rows", round3: "Full card", ttStage: "Big screen (P)", ttStageClose: "Close (Esc)", xmasMode: "Christmas mode", ttXmas: "Christmas mode (Santa, snow and sleigh bells)", seasonMode: "Season", seasonNone: "Off", seasonAuto: "Automatic (by date)", seasonXmas: "Christmas", seasonNewyear: "New Year", seasonEaster: "Easter", seasonHalloween: "Halloween", seasonParty: "Party / birthday", partyText: "Banner text", ttSeason: "Season mode", attractLabel: "Attract mode", attractOff: "Off", attract2: "After 2 min", attract5: "After 5 min", attract10: "After 10 min", attractNow: "Start now", ttCaller: "Caller screen (O)", manualLabel: "Manual", ttManual: "Manual (H)", tipStage: "Big screen", keyFull: "Fullscreen", mUndo: "Undo", gadssLabel: "GADSS simulation", mMap: "Map", mDraw: "Draw", mGrid: "Numbers", mFlights: "Flights", mMore: "More", flightLog: "Active Flights", statsTitle: "Mission Stats", statDrawn: "Drawn", statRemain: "Remain", statTime: "Flight Time", statPrev: "Previous",
        newGame: "New game", bankoMsg: "BINGO!",
        prizeTitle: "Prize Distribution", prizeSmall: "Small Prizes", prizeBig: "Big Prizes", btnSet: "SET", btnDrawSmall: "DRAW", btnDrawBig: "DRAW",
        lingoDefault: "Waypoint confirmed",
        genTitle: "Card Generator", genPlayers: "Number of Players", genCards: "Cards per Player", genPrint: "GENERATE & PRINT PDF",
        verifyTitle: "Verify Win", verifyBtn: "Check"
    }
};

const bingoLingoData = {
    da: {
        1: "Den ensomme", 2: "Næstkommanderende", 3: "Røvballerne", 8: "Den tykke dame",
        11: "To tynde drenge", 13: "Det uheldige tal", 18: "Et umage par", 19: "Nimmer Nutten",
        22: "Vilde svaner", 24: "Juleaften", 25: "Engelsk Jul", 27: "Dronning Ingrid",
        40: "Smør", 66: "De lange tasker", 68: "Hippie-tallet", 69: "Det frækkeste tal",
        77: "To drenge med brækket hals", 88: "To tykke damer", 90: "Gamle Ole"
    },
    en: {
        1: "Kelly's Eye", 2: "One Little Duck", 3: "Cup of Tea", 8: "Garden Gate",
        11: "Legs Eleven", 13: "Unlucky for Some", 18: "Coming of Age", 19: "Goodbye Teens",
        22: "Two Little Ducks", 24: "Two Dozen", 25: "Duck and Dive", 27: "Gateway to Heaven",
        40: "Life Begins", 66: "Clickety Click", 68: "Saving Grace", 69: "Meal for Two",
        77: "Sunset Strip", 88: "Two Fat Ladies", 90: "Top of the Shop"
    }
};

const defaultDockItems = [
    { id: 'panel-log', icon: 'radar', label: 'Active Flights' },
    { id: 'panel-control', icon: 'flight_takeoff', label: 'Flight Deck' },
    { id: 'panel-grid', icon: 'grid_on', label: 'Navigation' },
    { id: 'panel-metar', icon: 'cloud', label: 'Weather' },
    { id: 'panel-prizes', icon: 'redeem', label: 'Prizes' },
    { id: 'panel-gen', icon: 'grid_view', label: 'Card Gen' },
    { id: 'panel-verify', icon: 'verified', label: 'Verify Win' },
    { id: 'panel-tie', icon: 'gavel', label: 'Conflict Res' },
    { id: 'panel-settings', icon: 'settings', label: 'Settings' },
    { id: 'manual', icon: 'menu_book', label: 'Manual' }
];
