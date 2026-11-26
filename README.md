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
  airspace-data.js    lukkede luftrum fra EASA (GENERERET af tools/airspace-build.js)
  airspace.js         lukkede luftrum og ruteplanlægning uden om dem
  weather.js          vejrmotor, alle vejrlag, animerede vinde, forklaring, vejrmenu
  map-controls.js     sol/dag-nat, 3D-globus, ringe/radar, centrering
  layout.js           startlayout, mobil-faneblade
  tools.js            animationer, konfliktløsning, sprog, gaver, plader og Tjek plade
  metar.js            vejrsøgning og METAR
  ui.js               vinduer, sidemenu, taster, lyde, talgitter, konfetti
  flights.js          flytyper, flydata, flypanel, højdeprofil, animation, træk/fortryd
  airport-card.js     lufthavnskortet: trafik, assistance ved landing, egne kontakter
  divert.js           omdirigering til ALT1/ALT2 via ACARS (ny rute, ETA og nedstigning)
  game.js             gem/gendan, runder, seneste tal, storskærm
  seasons.js          sæsontilstande og julemanden
  attract.js          attract mode
  caller.js           opråber-skærm
  changelog.js        nyheder: "Nyt siden sidst" på velkomstkortet og kapitlet Nyheder i manualen
  manual.js           manualen (dansk + engelsk)
  mobile.js           mobilens "Mere"-liste
  gadss.js            simulerede GADSS-advarsler
  startup.js          blød scroll og velkomstvindue
tools/build-single.js   samler alt til dist/bingo-watch.html
tools/news-shots.js     tager billederne til nyhederne (img/news/)
tools/airspace-build.js bygger js/airspace-data.js fra EASA's konfliktzone-advarsler
tools/airspace-sources.json  hvilken EASA-advarsel der dækker hvilket luftrum (lukket/advarsel)
.github/workflows/airspace.yml  tjekker EASA hver dag og laver en pull request ved ændringer
img/news/               billeder til nyhederne
tests/run.js            88 automatiske tests i en rigtig browser
tests/net.js            styrer netværket i testene (gemte svar / live / offline)
tests/record.js         henter rigtige svar fra vejrtjenesterne og gemmer dem
tests/fixtures/         de gemte svar (network.json)
```

Filerne er bevidst **almindelige scripts uden build-trin**: de deler ét globalt navnerum og skal indlæses i den rækkefølge, de står i `index.html`.

## Nyheder ("Nyt siden sidst")

Når en bruger kommer tilbage, viser velkomstkortet de opdateringer, de ikke har set endnu (nye brugere ser dem ikke – for dem er alt nyt). Alle nyheder står også i manualen under **Nyheder**.

Ny opdatering? Tilføj en post **øverst** i `CHANGELOG` i `js/changelog.js`:

```js
{ id: '2026-12-01.1',
  da: { t: 'Kort overskrift', p: ['Hvad er nyt – skrevet til spillerne.', 'Højst 3–4 punkter.'] },
  en: { t: 'Short title',     p: ['What is new – written for players.',  'At most 3–4 points.'] } },
```

`id` er datoen plus et løbenummer og skal være "større" end den forrige (testene tjekker det).

**Billede:** tilføj `img: 'img/news/2026-12-01-1.webp'` og en "scene" med samme id i `tools/news-shots.js`, der viser det nye. `npm run news-shots` tager billederne (alle, eller kun ét: `npm run news-shots -- 2026-12-01.1`). Klik på billedet viser det i fuld størrelse.

Kør derefter `npm run build` – billederne bygges også ind i `dist/bingo-watch.html`.

## Lukkede luftrum (EASA)

Ruterne går uden om lukket luftrum efter EU-luftfartsmyndigheden **EASA's konfliktzone-advarsler** (CZIB, <https://www.easa.europa.eu/en/domains/air-operations/czibs>) plus forbuddene i Rusland og Belarus. Spillets fly opfører sig som et europæisk flyselskab.

- **Rød (lukket):** EASA anbefaler ikke at flyve der i nogen højde – ruterne går uden om.
- **Gul (advarsel):** forsigtighed, eller kun lukket under en vis højde – vises på kortet, men fly må krydse i marchhøjde.
- Undtagelser: Den Persiske Bugt er lukket undtagen for at lande og lette, så Dubai, Abu Dhabi og Doha kan stadig bruges.

**Automatisk opdatering:** `.github/workflows/airspace.yml` kører hver dag kl. 05:17 UTC. Hvis EASA's liste har ændret sig, laver den en pull request med de opdaterede zoner og en dansk beskrivelse af ændringerne. Intet kommer ud på siden, før pull requesten er godkendt (merged). Den kan også startes i hånden under fanen **Actions**.

Kræver én indstilling på GitHub: **Settings → Actions → General → Workflow permissions →** sæt flueben i **"Allow GitHub Actions to create and approve pull requests"**.

Ny EASA-advarsel om et område, der ikke er kendt endnu? Pull requesten markerer den som **"NY – kræver handling"**. Tilføj den i `tools/airspace-sources.json` (hvilke FIR'er eller et omrids, og om den er lukket eller advarsel), og kør `npm run airspace`.

Luftrumsgrænserne (FIR) kommer fra [VATSIM vatspy-data-project](https://github.com/vatsimnetwork/vatspy-data-project) under licensen **CC BY-SA 4.0**; de afledte zonedata i `js/airspace-data.js` deles på samme vilkår. Det er et spil – ikke et værktøj til rigtig ruteplanlægning.

## Udvikling

```bash
npm install
npx playwright install chromium   # første gang
npm test                          # kører de 88 tests mod index.html – uden internet
npm run build                     # laver dist/bingo-watch.html
npm run test:single               # bygger og tester den samlede fil
npm run record                    # henter manglende svar fra vejrtjenesterne (sjældent)
npm run test:live                 # tester mod det rigtige internet
npm run airspace                  # henter EASA's liste og bygger js/airspace-data.js
```

### Testene og de gratis vejrtjenester

Appen bruger gratis tjenester (Open-Meteo, RainViewer, aviationweather.gov, GDACS m.fl.), som har grænser for, hvor meget man må hente. Derfor går `npm test` **ikke** på internettet: den afspiller rigtige svar, som er gemt i `tests/fixtures/network.json`. Testene giver samme resultat hver gang og bruger ingen af tjenesternes kvote.

- `npm run record` henter kun de svar, der mangler, og lægger dem til. Kør den, når en tjeneste har ændret sig, eller når der er brug for friske data (`NET_FRESH=1 npm run record` henter alt forfra). Rammer en tjeneste sin grænse, står det i udskriften – kør den bare igen senere.
- `npm run test:live` tester mod det rigtige internet. Brug den sjældent, fx før en større udgivelse.
- Kort-fliser (baggrundskort, radar- og satellitbilleder) gemmes ikke; de er store og skifter hele tiden.

Husk at køre `npm run build` før commit, så `dist/bingo-watch.html` passer med koden.
