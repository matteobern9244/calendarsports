import type { Page, Route } from "@playwright/test";
import { FOOTBALL_CALENDAR, FOOTBALL_STANDINGS, calendarForTeam } from "./footballFixtures";

type EndpointName =
  | "sports-f1:calendar"
  | "sports-f1:driver-standings"
  | "sports-f1:constructor-standings"
  | "sports-f1:next-race"
  | "sports-football:calendar"
  | "sports-football:standings"
  | "sports-football:team-squad"
  | "sports-football:lineups"
  | "sports-football:player-stats"
  | "sports-tennis:player-info"
  | "sports-tennis:results"
  | "sports-tennis:schedule"
  | "sports-tennis:next-event"
  | "sports-motogp:calendar"
  | "sports-motogp:standings"
  | "sports-motogp:constructor-standings"
  | "sports-motogp:next-event";

interface MockOptions {
  delayMs?: Partial<Record<EndpointName, number>>;
  fail?: Partial<Record<EndpointName, boolean>>;
}

const payloads: Record<EndpointName, unknown> = {
  "sports-f1:calendar": [
    {
      round: 6,
      raceName: "Gran Premio di Imola",
      circuit: "Autodromo Enzo e Dino Ferrari",
      locality: "Imola",
      country: "Italia",
      date: "2099-05-18",
      time: "13:00:00Z",
      qualifying: { date: "2099-05-17", time: "14:00:00Z" },
    },
    {
      round: 7,
      raceName: "Gran Premio di Monaco",
      circuit: "Circuit de Monaco",
      locality: "Monte Carlo",
      country: "Monaco",
      date: "2099-05-25",
      time: "13:00:00Z",
      qualifying: { date: "2099-05-24", time: "14:00:00Z" },
    },
  ],
  "sports-f1:driver-standings": [
    {
      position: 1,
      points: 88,
      wins: 3,
      driver: "Lando Norris",
      driverCode: "NOR",
      nationality: "British",
      constructor: "McLaren",
      photoUrl: null,
    },
    {
      position: 2,
      points: 72,
      wins: 2,
      driver: "Charles Leclerc",
      driverCode: "LEC",
      nationality: "Monégasque",
      constructor: "Ferrari",
      photoUrl: null,
    },
  ],
  "sports-f1:constructor-standings": [
    {
      position: 1,
      points: 150,
      wins: 5,
      constructor: "McLaren",
      nationality: "British",
      logoUrl: null,
    },
    {
      position: 2,
      points: 132,
      wins: 2,
      constructor: "Ferrari",
      nationality: "Italian",
      logoUrl: null,
    },
  ],
  "sports-f1:next-race": {
    round: 6,
    raceName: "Gran Premio di Imola",
    circuit: "Autodromo Enzo e Dino Ferrari",
    locality: "Imola",
    country: "Italia",
    date: "2099-05-18",
    time: "13:00:00Z",
  },
  "sports-football:calendar": FOOTBALL_CALENDAR,
  // Le statistiche del giocatore. Il mock **non** e' a campi fissi, come non
  // lo e' la fonte: il portiere della fixture ha `SavesMade` e non ha `Goals`,
  // che e' la differenza che l'interfaccia deve saper reggere.
  "sports-football:player-stats": {
    playerId: "184254",
    playerSlug: "guglielmo-vicario",
    competitions: [
      {
        seasonYear: "2026",
        season: "2026/2027",
        competitionId: "21",
        competition: "Serie A",
        stats: { GamesPlayed: 3, TimePlayed: 270, SavesMade: 11, Cleansheets: 1, GoalsConceded: 5 },
        charts: [{ id: "TotalPasses", success: 64, failure: 27 }],
      },
    ],
  },
  "sports-football:standings": FOOTBALL_STANDINGS,
  // La rosa dipende dalla squadra come il calendario: il nome del giocatore e
  // l'allenatore la nominano, cosi' una e2e che apra la scheda Rosa del
  // Napoli e veda un giocatore juventino fallisce invece di passare.
  // Probabili formazioni: gli undici strutturati, la panchina come soli
  // cognomi. Il mock conserva la differenza, perche' e' quella che l'interfaccia
  // deve far vedere.
  "sports-football:lineups": {
    date: "2099-05-05T18:45:00.000Z",
    matchUrl: null,
    home: {
      teamSlug: "milan",
      teamName: "Milan",
      formation: "433",
      logoUrl: null,
      startingLineup: [
        {
          name: "Undici1 J.",
          surname: "Undici1",
          shirtNumber: 1,
          role: "Midfielder",
          playerId: "1",
          photoUrl: "https://static.sky.it/foto/1.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici1/1",
        },
        {
          name: "Undici2 J.",
          surname: "Undici2",
          shirtNumber: 2,
          role: "Midfielder",
          playerId: "2",
          photoUrl: "https://static.sky.it/foto/2.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici2/2",
        },
        {
          name: "Undici3 J.",
          surname: "Undici3",
          shirtNumber: 3,
          role: "Midfielder",
          playerId: "3",
          photoUrl: "https://static.sky.it/foto/3.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici3/3",
        },
        {
          name: "Undici4 J.",
          surname: "Undici4",
          shirtNumber: 4,
          role: "Midfielder",
          playerId: "4",
          photoUrl: "https://static.sky.it/foto/4.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici4/4",
        },
        {
          name: "Undici5 J.",
          surname: "Undici5",
          shirtNumber: 5,
          role: "Midfielder",
          playerId: "5",
          photoUrl: "https://static.sky.it/foto/5.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici5/5",
        },
        {
          name: "Undici6 J.",
          surname: "Undici6",
          shirtNumber: 6,
          role: "Midfielder",
          playerId: "6",
          photoUrl: "https://static.sky.it/foto/6.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici6/6",
        },
        {
          name: "Undici7 J.",
          surname: "Undici7",
          shirtNumber: 7,
          role: "Midfielder",
          playerId: "7",
          photoUrl: "https://static.sky.it/foto/7.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici7/7",
        },
        {
          name: "Undici8 J.",
          surname: "Undici8",
          shirtNumber: 8,
          role: "Midfielder",
          playerId: "8",
          photoUrl: "https://static.sky.it/foto/8.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici8/8",
        },
        {
          name: "Undici9 J.",
          surname: "Undici9",
          shirtNumber: 9,
          role: "Midfielder",
          playerId: "9",
          photoUrl: "https://static.sky.it/foto/9.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici9/9",
        },
        {
          name: "Undici10 J.",
          surname: "Undici10",
          shirtNumber: 10,
          role: "Midfielder",
          playerId: "10",
          photoUrl: "https://static.sky.it/foto/10.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici10/10",
        },
        {
          name: "Undici11 J.",
          surname: "Undici11",
          shirtNumber: 11,
          role: "Midfielder",
          playerId: "11",
          photoUrl: "https://static.sky.it/foto/11.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici11/11",
        },
      ],
      lines: [
        [
          {
            name: "Undici1 J.",
            surname: "Undici1",
            shirtNumber: 1,
            role: "Midfielder",
            playerId: "1",
            photoUrl: "https://static.sky.it/foto/1.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici1/1",
          },
        ],
        [
          {
            name: "Undici2 J.",
            surname: "Undici2",
            shirtNumber: 2,
            role: "Midfielder",
            playerId: "2",
            photoUrl: "https://static.sky.it/foto/2.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici2/2",
          },
          {
            name: "Undici3 J.",
            surname: "Undici3",
            shirtNumber: 3,
            role: "Midfielder",
            playerId: "3",
            photoUrl: "https://static.sky.it/foto/3.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici3/3",
          },
          {
            name: "Undici4 J.",
            surname: "Undici4",
            shirtNumber: 4,
            role: "Midfielder",
            playerId: "4",
            photoUrl: "https://static.sky.it/foto/4.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici4/4",
          },
          {
            name: "Undici5 J.",
            surname: "Undici5",
            shirtNumber: 5,
            role: "Midfielder",
            playerId: "5",
            photoUrl: "https://static.sky.it/foto/5.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici5/5",
          },
        ],
        [
          {
            name: "Undici6 J.",
            surname: "Undici6",
            shirtNumber: 6,
            role: "Midfielder",
            playerId: "6",
            photoUrl: "https://static.sky.it/foto/6.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici6/6",
          },
          {
            name: "Undici7 J.",
            surname: "Undici7",
            shirtNumber: 7,
            role: "Midfielder",
            playerId: "7",
            photoUrl: "https://static.sky.it/foto/7.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici7/7",
          },
          {
            name: "Undici8 J.",
            surname: "Undici8",
            shirtNumber: 8,
            role: "Midfielder",
            playerId: "8",
            photoUrl: "https://static.sky.it/foto/8.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici8/8",
          },
        ],
        [
          {
            name: "Undici9 J.",
            surname: "Undici9",
            shirtNumber: 9,
            role: "Midfielder",
            playerId: "9",
            photoUrl: "https://static.sky.it/foto/9.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici9/9",
          },
          {
            name: "Undici10 J.",
            surname: "Undici10",
            shirtNumber: 10,
            role: "Midfielder",
            playerId: "10",
            photoUrl: "https://static.sky.it/foto/10.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici10/10",
          },
          {
            name: "Undici11 J.",
            surname: "Undici11",
            shirtNumber: 11,
            role: "Midfielder",
            playerId: "11",
            photoUrl: "https://static.sky.it/foto/11.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici11/11",
          },
        ],
      ],
      substitutes: ["PanchinaUno", "PanchinaDue"],
      unavailables: ["IndisponibileUno"],
      disqualifieds: [],
      doubtful: [],
      manager: "Allenatore Juve",
    },
    away: {
      teamSlug: "juventus",
      teamName: "Juventus",
      formation: "4231",
      logoUrl: null,
      startingLineup: [
        {
          name: "Undici1 J.",
          surname: "Undici1",
          shirtNumber: 1,
          role: "Midfielder",
          playerId: "1",
          photoUrl: "https://static.sky.it/foto/1.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici1/1",
        },
        {
          name: "Undici2 J.",
          surname: "Undici2",
          shirtNumber: 2,
          role: "Midfielder",
          playerId: "2",
          photoUrl: "https://static.sky.it/foto/2.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici2/2",
        },
        {
          name: "Undici3 J.",
          surname: "Undici3",
          shirtNumber: 3,
          role: "Midfielder",
          playerId: "3",
          photoUrl: "https://static.sky.it/foto/3.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici3/3",
        },
        {
          name: "Undici4 J.",
          surname: "Undici4",
          shirtNumber: 4,
          role: "Midfielder",
          playerId: "4",
          photoUrl: "https://static.sky.it/foto/4.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici4/4",
        },
        {
          name: "Undici5 J.",
          surname: "Undici5",
          shirtNumber: 5,
          role: "Midfielder",
          playerId: "5",
          photoUrl: "https://static.sky.it/foto/5.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici5/5",
        },
        {
          name: "Undici6 J.",
          surname: "Undici6",
          shirtNumber: 6,
          role: "Midfielder",
          playerId: "6",
          photoUrl: "https://static.sky.it/foto/6.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici6/6",
        },
        {
          name: "Undici7 J.",
          surname: "Undici7",
          shirtNumber: 7,
          role: "Midfielder",
          playerId: "7",
          photoUrl: "https://static.sky.it/foto/7.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici7/7",
        },
        {
          name: "Undici8 J.",
          surname: "Undici8",
          shirtNumber: 8,
          role: "Midfielder",
          playerId: "8",
          photoUrl: "https://static.sky.it/foto/8.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici8/8",
        },
        {
          name: "Undici9 J.",
          surname: "Undici9",
          shirtNumber: 9,
          role: "Midfielder",
          playerId: "9",
          photoUrl: "https://static.sky.it/foto/9.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici9/9",
        },
        {
          name: "Undici10 J.",
          surname: "Undici10",
          shirtNumber: 10,
          role: "Midfielder",
          playerId: "10",
          photoUrl: "https://static.sky.it/foto/10.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici10/10",
        },
        {
          name: "Undici11 J.",
          surname: "Undici11",
          shirtNumber: 11,
          role: "Midfielder",
          playerId: "11",
          photoUrl: "https://static.sky.it/foto/11.png",
          profileUrl: "https://sport.sky.it/calcio/atleti/undici11/11",
        },
      ],
      lines: [
        [
          {
            name: "Undici1 J.",
            surname: "Undici1",
            shirtNumber: 1,
            role: "Midfielder",
            playerId: "1",
            photoUrl: "https://static.sky.it/foto/1.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici1/1",
          },
        ],
        [
          {
            name: "Undici2 J.",
            surname: "Undici2",
            shirtNumber: 2,
            role: "Midfielder",
            playerId: "2",
            photoUrl: "https://static.sky.it/foto/2.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici2/2",
          },
          {
            name: "Undici3 J.",
            surname: "Undici3",
            shirtNumber: 3,
            role: "Midfielder",
            playerId: "3",
            photoUrl: "https://static.sky.it/foto/3.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici3/3",
          },
          {
            name: "Undici4 J.",
            surname: "Undici4",
            shirtNumber: 4,
            role: "Midfielder",
            playerId: "4",
            photoUrl: "https://static.sky.it/foto/4.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici4/4",
          },
          {
            name: "Undici5 J.",
            surname: "Undici5",
            shirtNumber: 5,
            role: "Midfielder",
            playerId: "5",
            photoUrl: "https://static.sky.it/foto/5.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici5/5",
          },
        ],
        [
          {
            name: "Undici6 J.",
            surname: "Undici6",
            shirtNumber: 6,
            role: "Midfielder",
            playerId: "6",
            photoUrl: "https://static.sky.it/foto/6.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici6/6",
          },
          {
            name: "Undici7 J.",
            surname: "Undici7",
            shirtNumber: 7,
            role: "Midfielder",
            playerId: "7",
            photoUrl: "https://static.sky.it/foto/7.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici7/7",
          },
        ],
        [
          {
            name: "Undici8 J.",
            surname: "Undici8",
            shirtNumber: 8,
            role: "Midfielder",
            playerId: "8",
            photoUrl: "https://static.sky.it/foto/8.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici8/8",
          },
          {
            name: "Undici9 J.",
            surname: "Undici9",
            shirtNumber: 9,
            role: "Midfielder",
            playerId: "9",
            photoUrl: "https://static.sky.it/foto/9.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici9/9",
          },
          {
            name: "Undici10 J.",
            surname: "Undici10",
            shirtNumber: 10,
            role: "Midfielder",
            playerId: "10",
            photoUrl: "https://static.sky.it/foto/10.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici10/10",
          },
        ],
        [
          {
            name: "Undici11 J.",
            surname: "Undici11",
            shirtNumber: 11,
            role: "Midfielder",
            playerId: "11",
            photoUrl: "https://static.sky.it/foto/11.png",
            profileUrl: "https://sport.sky.it/calcio/atleti/undici11/11",
          },
        ],
      ],
      substitutes: ["PanchinaUno", "PanchinaDue"],
      unavailables: ["IndisponibileUno"],
      disqualifieds: [],
      doubtful: [],
      manager: "Allenatore Juve",
    },
  },
  "sports-football:team-squad": {
    players: [
      {
        name: "Portiere Juve",
        role: "Portieri",
        shirtNumber: 1,
        countryCode: "ita",
        ageYears: 29,
        heightCm: 190,
        weightKg: 82,
        playerId: "1",
        profileUrl: "https://sport.sky.it/calcio/atleti/portiere-juve/1",
      },
      {
        name: "Difensore Juve",
        role: "Difensori",
        shirtNumber: 4,
        countryCode: "ita",
        ageYears: 27,
        heightCm: 185,
        weightKg: 78,
        playerId: "2",
        profileUrl: null,
      },
    ],
    manager: {
      name: "Allenatore Juve",
      shirtNumber: null,
      countryCode: null,
      ageYears: 60,
      heightCm: null,
      weightKg: null,
      playerId: null,
      profileUrl: null,
    },
    stadium: {
      name: "Stadio della Juventus",
      cityName: "Torino",
      address: "Corso Gaetano Scirea, 50",
      capacity: 45666,
      yearOfConstruction: 2011,
    },
  },
  "sports-tennis:player-info": {
    name: "Jannik Sinner",
    ranking: 2,
    nationality: "Italia",
    birthDate: "2001-08-16",
    age: 24,
    height: "188 cm",
    weight: "76 kg",
    birthPlace: "San Candido, Italia",
    turnedPro: 2018,
    coach: "Darren Cahill / Simone Vagnozzi",
    plays: "Destro",
    seasonRecord: "19-2",
    titles2026: 2,
  },
  "sports-tennis:results": [
    {
      tournament: "Miami Open",
      date: "2099-03-29",
      round: "Finale",
      opponent: "D. Medvedev",
      score: "6-4 6-4",
      result: "V",
      surface: "Hard",
    },
  ],
  "sports-tennis:schedule": [
    {
      name: "Internazionali d'Italia",
      date: "2099-05-06",
      dateEnd: "2099-05-17",
      surface: "Clay",
      location: "Roma, ITA",
      tier: "ATP 1000",
      result: null,
      status: "programmato",
    },
  ],
  "sports-tennis:next-event": {
    name: "Internazionali d'Italia",
    date: "2099-05-06",
    dateEnd: "2099-05-17",
    surface: "Clay",
    location: "Roma, ITA",
    tier: "ATP 1000",
    result: null,
  },
  "sports-motogp:calendar": [
    {
      round: 5,
      name: "GP di Francia",
      location: "Le Mans",
      circuit: "Bugatti Circuit",
      date_start: "2099-05-08",
      date_end: "2099-05-10",
      country: "FR",
      status: "upcoming",
    },
  ],
  "sports-motogp:standings": [
    { position: 1, name: "Bagnaia F.", team: "Ducati Lenovo Team", points: 101, photoUrl: null },
    { position: 2, name: "Marquez M.", team: "Gresini Racing", points: 97, photoUrl: null },
  ],
  "sports-motogp:constructor-standings": [
    // `constructor` (la casa, in minuscolo) e' parte del contratto reale:
    // l'edge function lo ricava dal nome del team e la UI ci prende i
    // colori. Ometterlo faceva passare il mock per un payload che non
    // esiste.
    { position: 1, team: "Ducati Lenovo Team", points: 180, logoUrl: null, constructor: "ducati" },
    { position: 2, team: "Aprilia Racing", points: 149, logoUrl: null, constructor: "aprilia" },
  ],
  "sports-motogp:next-event": {
    round: 5,
    name: "GP di Francia",
    location: "Le Mans",
    circuit: "Bugatti Circuit",
    date_start: "2099-05-08",
    date_end: "2099-05-10",
    country: "FR",
    status: "upcoming",
  },
};

function getEndpointKey(url: URL): EndpointName | null {
  const segments = url.pathname.split("/");
  const functionName = segments[segments.length - 1];
  const action = url.searchParams.get("action");

  if (!functionName || !action) return null;

  const key = `${functionName}:${action}` as EndpointName;
  return key in payloads ? key : null;
}

// Le edge function impaginano solo quando la richiesta porta `page` o
// `pageSize`, e lo fanno con due inviluppi diversi che il frontend deve
// saper leggere entrambi:
//   sports-football:calendar -> { items, total, page, pageSize, totalPages,
//                                 nextUpcomingIndex }   (piatto)
//   sports-tennis:results    -> { items, pagination: {...} }  (annidato)
// Il mock replica il contratto reale: una fixture che restituisce sempre
// l'array nudo nasconde i bug del percorso impaginato, che e' quello che
// l'app usa davvero.
const PAGINATED_ENDPOINTS = new Set<EndpointName>([
  "sports-football:calendar",
  "sports-tennis:results",
]);

function paginate(endpoint: EndpointName, payload: unknown, url: URL): unknown {
  if (!PAGINATED_ENDPOINTS.has(endpoint) || !Array.isArray(payload)) return payload;

  const pageParam = url.searchParams.get("page");
  const pageSizeParam = url.searchParams.get("pageSize");
  if (pageParam === null && pageSizeParam === null) return payload;

  const parsedPageSize = Number.parseInt(pageSizeParam ?? "12", 10);
  const pageSize = Number.isFinite(parsedPageSize) && parsedPageSize > 0 ? parsedPageSize : 12;
  const total = payload.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const parsedPage = Number.parseInt(pageParam ?? "1", 10);
  const page = Number.isFinite(parsedPage) ? Math.min(totalPages, Math.max(1, parsedPage)) : 1;
  const start = (page - 1) * pageSize;
  const items = payload.slice(start, start + pageSize);

  if (endpoint === "sports-tennis:results") {
    return { items, pagination: { page, pageSize, total, totalPages } };
  }

  // Come il backend: primo match non ancora concluso nell'elenco completo.
  const nextUpcomingIndex = (payload as Array<{ status?: string }>).findIndex(
    (m) => m.status !== "FullTime",
  );
  return { items, total, page, pageSize, totalPages, nextUpcomingIndex };
}

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

// Genera un payload streaming-tv minimale per la famiglia richiesta. Per
// RAI e Mediaset includiamo programmi di prima serata su 2 canali ciascuna
// in modo da poter verificare separatori oro tra famiglie e righe per
// canale. Per le altre famiglie ritorniamo programsAvailable=false.
function buildTvPayload(family: string, date: string) {
  if (family === "rai") {
    return {
      family,
      familyLabel: "RAI",
      date,
      channels: [
        {
          id: "rai-1",
          name: "Rai 1",
          logo: null,
          number: 1,
          programs: [
            {
              start: `${date}T19:30:00.000Z`, // 21:30 Europe/Rome
              end: `${date}T20:35:00.000Z`,
              title: "Test Programma RAI 1",
              genre: "Fiction",
            },
          ],
        },
        {
          id: "rai-2",
          name: "Rai 2",
          logo: null,
          number: 2,
          programs: [
            {
              start: `${date}T19:00:00.000Z`, // 21:00 Europe/Rome
              end: `${date}T19:47:00.000Z`,
              title: "Test Programma RAI 2",
              genre: "Telefilm",
            },
          ],
        },
      ],
      programsAvailable: true,
    };
  }
  if (family === "mediaset") {
    return {
      family,
      familyLabel: "Mediaset",
      date,
      channels: [
        {
          id: "canale-5",
          name: "Canale 5",
          logo: null,
          number: 5,
          programs: [
            {
              start: `${date}T19:21:00.000Z`,
              end: `${date}T20:46:00.000Z`,
              title: "Test Programma Canale 5",
              genre: "Fiction",
            },
          ],
        },
      ],
      programsAvailable: true,
    };
  }
  return { family, familyLabel: family, date, channels: [], programsAvailable: false };
}

export async function installSportsApiMocks(page: Page, options: MockOptions = {}) {
  await page.route("**/functions/v1/**", async (route) => {
    const url = new URL(route.request().url());

    // Mock dedicato per streaming-tv (la scheda Stasera in TV in Home).
    if (url.pathname.endsWith("/streaming-tv")) {
      const family = url.searchParams.get("family") ?? "";
      const date = url.searchParams.get("date") ?? "2099-05-01";
      await fulfillJson(route, 200, { success: true, data: buildTvPayload(family, date) });
      return;
    }

    const endpoint = getEndpointKey(url);

    if (!endpoint) {
      await fulfillJson(route, 404, { success: false, error: "Mock endpoint not found" });
      return;
    }

    const delay = options.delayMs?.[endpoint];
    if (delay) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (options.fail?.[endpoint]) {
      await fulfillJson(route, 200, { success: false, error: `Mock failure for ${endpoint}` });
      return;
    }

    // Il calendario calcio e' l'unico endpoint che dipende dalla squadra. Il
    // mock la valida e filtra come la funzione vera: se si limitasse a
    // restituire sempre la stessa fixture, le e2e sul cambio squadra
    // resterebbero verdi anche con il filtro rotto in produzione.
    if (endpoint === "sports-football:calendar") {
      const esito = calendarForTeam(url.searchParams.get("team"));
      if (!esito.ok) {
        await fulfillJson(route, esito.status, { success: false, error: esito.error });
        return;
      }
      await fulfillJson(route, 200, {
        success: true,
        data: paginate(endpoint, esito.matches, url),
        meta: { team: esito.team },
      });
      return;
    }

    await fulfillJson(route, 200, {
      success: true,
      data: paginate(endpoint, payloads[endpoint], url),
    });
  });
}
