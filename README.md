# Bingo Watch

Et bankospil med et levende OCC-flykort: hvert trukket tal bliver til et fly, der flyver en realistisk rute mellem 112 lufthavne. Kortet viser også vejrlag, GADSS-advarsler, sæsontilstande (jul, nytår, påske, halloween, fest), storskærm til projektor og en separat opråber-skærm.

Live: <https://jkb-web.github.io/bingo-watch/>

## Brug

- **Online:** åbn GitHub Pages-linket ovenfor.
- **Som én fil:** hent [`dist/bingo-watch.html`](dist/bingo-watch.html) og åbn den i en browser. Den kan sendes, deles eller lægges på en telefon. Kort, skrifttyper og vejrdata hentes stadig fra internettet.
- **Manual:** tryk **?** i topbjælken eller tasten **H** inde i spillet.

## Struktur

```
index.html          sidens opbygning (vinduer, knapper, menuer)
css/style.css       hele designet
js/                 almindelige scripts, indlæst i denne rækkefølge fra index.html:
  state.js            grundtilstand, kortstil, hjælpefunktioner til hentning
  airports.js         de 112 lufthavne
  i18n.js             dansk/engelsk tekst, kaldenavne for tal, sidemenu
  app.js              opstart, kortet og synkronisering af lag
  map.js              rækkeviddecirkler og lufthavne (hover/klik)
  routes.js           realistiske ruter, flyvede spor og rutelag
  weather.js          vejrmotor, alle vejrlag, animerede vinde, forklaring, vejrmenu
  map-controls.js     sol/dag-nat, 3D-globus, ringe/radar, centrering
  layout.js           startlayout, mobil-faneblade
  tools.js            animationer, konfliktløsning, sprog, gaver, plader og Tjek plade
  metar.js            vejrsøgning og METAR
  ui.js               vinduer, sidemenu, taster, lyde, talgitter, konfetti
  flights.js          flytyper, flydata, flypanel, højdeprofil, animation, træk/fortryd
  game.js             gem/gendan, runder, seneste tal, storskærm
  seasons.js          sæsontilstande og julemanden
  attract.js          attract mode
  caller.js           opråber-skærm
  manual.js           manualen (dansk + engelsk)
  mobile.js           mobilens "Mere"-liste
  gadss.js            simulerede GADSS-advarsler
  startup.js          blød scroll og velkomstvindue
tools/build-single.js   samler alt til dist/bingo-watch.html
tests/run.js            49 automatiske tests i en rigtig browser
```

Filerne er bevidst **almindelige scripts uden build-trin**: de deler ét globalt navnerum og skal indlæses i den rækkefølge, de står i `index.html`.

## Udvikling

```bash
npm install
npx playwright install chromium   # første gang
npm test                          # kører de 49 tests mod index.html
npm run build                     # laver dist/bingo-watch.html
npm run test:single               # bygger og tester den samlede fil
```

Husk at køre `npm run build` før commit, så `dist/bingo-watch.html` passer med koden.
