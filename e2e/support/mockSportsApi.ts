import type { Page, Route } from "@playwright/test";

type EndpointName =
  | "sports-f1:calendar"
  | "sports-f1:driver-standings"
  | "sports-f1:constructor-standings"
  | "sports-f1:next-race"
  | "sports-football:calendar"
  | "sports-football:standings"
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
    { position: 1, points: 150, wins: 5, constructor: "McLaren", nationality: "British", logoUrl: null },
    { position: 2, points: 132, wins: 2, constructor: "Ferrari", nationality: "Italian", logoUrl: null },
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
  "sports-football:calendar": [
    {
      matchday: 34,
      homeTeam: "Juventus",
      awayTeam: "Milan",
      homeLogo: null,
      awayLogo: null,
      homeScore: null,
      awayScore: null,
      date: "2099-04-26T18:45:00Z",
      status: "Scheduled",
      competition: "Serie A",
      link: null,
      broadcaster: "DAZN | Sky Sport",
    },
    {
      matchday: 35,
      homeTeam: "Inter",
      awayTeam: "Juventus",
      homeLogo: null,
      awayLogo: null,
      homeScore: null,
      awayScore: null,
      date: "2099-05-03T18:45:00Z",
      status: "Scheduled",
      competition: "Champions League",
      link: null,
      broadcaster: null,
    },
  ],
  "sports-football:standings": [
    {
      position: 1,
      team: "Juventus",
      teamUrl: "/juventus",
      logoUrl: null,
      played: 33,
      wins: 22,
      draws: 7,
      losses: 4,
      goalsFor: 61,
      goalsAgainst: 28,
      goalDiff: 33,
      points: 73,
      trend: [],
      qualification: "UCL",
      lastMatches: [],
    },
    {
      position: 2,
      team: "Milan",
      teamUrl: "/milan",
      logoUrl: null,
      played: 33,
      wins: 21,
      draws: 6,
      losses: 6,
      goalsFor: 58,
      goalsAgainst: 30,
      goalDiff: 28,
      points: 69,
      trend: [],
      qualification: "UCL",
      lastMatches: [],
    },
  ],
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
    { position: 1, team: "Ducati Lenovo Team", points: 180, logoUrl: null },
    { position: 2, team: "Aprilia Racing", points: 149, logoUrl: null },
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

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function installSportsApiMocks(page: Page, options: MockOptions = {}) {
  await page.route("**/functions/v1/**", async (route) => {
    const url = new URL(route.request().url());
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

    await fulfillJson(route, 200, { success: true, data: payloads[endpoint] });
  });
}
