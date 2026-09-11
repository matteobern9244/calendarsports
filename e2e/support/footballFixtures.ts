/**
 * Fixture del calcio per le e2e, e il filtro che le serve.
 *
 * Vive in un modulo separato da `mockSportsApi.ts` per due motivi. Il primo e'
 * che senza `@playwright/test` fra gli import puo' essere caricato dal gate
 * normale: `src/test/e2eFootballFixtures.test.ts` lo importa e verifica che si
 * comporti come la edge function vera. Il secondo e' che la squadra e' ormai
 * un parametro, e un mock che lo ignorasse renderebbe verdi le e2e di tutta la
 * funzione «cambia squadra» senza che nessuna squadra cambi.
 *
 * La whitelist e il confronto fra nomi arrivano da `src/lib/serieATeams.ts`,
 * non da una copia locale: un elenco di slug scritto qui non conoscerebbe gli
 * alias, e il mock accetterebbe o rifiuterebbe squadre diverse da quelle che
 * accetta la produzione.
 */

import { DEFAULT_TEAM, matchesTeam, resolveTeamStrict } from "../../src/lib/serieATeams";

export interface MockMatch {
  id: string;
  /** L'id con cui Sky identifica la partita: la chiave del dettaglio. */
  skyMatchId: string | null;
  matchday: number;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string | null;
  awayLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  date: string;
  status: string;
  competition: string;
  link: string | null;
  broadcaster: string | null;
}

/**
 * Le partite di almeno due squadre, con una in comune.
 *
 * La partita condivisa e' la parte che conta: filtrare non e' spartire un
 * elenco in gruppi disgiunti, e uno Juventus-Napoli deve comparire in
 * entrambi i calendari. Una fixture senza incroci lascerebbe passare un
 * filtro che assegna ogni partita a una squadra sola.
 */
export const FOOTBALL_CALENDAR: MockMatch[] = [
  {
    id: "serie-a-2099-04-26-juventus-vs-milan",
    skyMatchId: "900001",
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
    id: "champions-league-2099-05-03-inter-vs-juventus",
    skyMatchId: null,
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
  {
    // L'incrocio: compare sia per la Juventus sia per il Napoli.
    id: "serie-a-2099-05-17-juventus-vs-napoli",
    skyMatchId: "900003",
    matchday: 36,
    homeTeam: "Juventus",
    awayTeam: "Napoli",
    homeLogo: null,
    awayLogo: null,
    homeScore: null,
    awayScore: null,
    date: "2099-05-17T18:45:00Z",
    status: "Scheduled",
    competition: "Serie A",
    link: null,
    broadcaster: "DAZN",
  },
  {
    // Solo Napoli: senza questa, i due calendari sarebbero uno sottoinsieme
    // dell'altro e il test non distinguerebbe un filtro da un troncamento.
    id: "serie-a-2099-05-24-napoli-vs-lazio",
    skyMatchId: "900004",
    matchday: 37,
    homeTeam: "Napoli",
    awayTeam: "Lazio",
    homeLogo: null,
    awayLogo: null,
    homeScore: null,
    awayScore: null,
    date: "2099-05-24T18:45:00Z",
    status: "Scheduled",
    competition: "Serie A",
    link: null,
    broadcaster: "Sky Sport",
  },
];

interface MockStandingRow {
  position: number;
  team: string;
  teamUrl: string;
  logoUrl: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  trend: unknown[];
  qualification: string;
  lastMatches: unknown[];
}

/**
 * La classifica non prende il parametro `team`: il payload e' identico per
 * tutte e venti le squadre, ed e' il motivo per cui la sua query key non porta
 * la squadra.
 *
 * `teamUrl` e' assoluto. Prima era `/juventus`, un percorso relativo che nella
 * realta' non esiste: Sky pubblica URL assoluti verso il proprio sito, e una
 * fixture che ne pubblica un'altra forma descrive un backend immaginario.
 */
export const FOOTBALL_STANDINGS: MockStandingRow[] = [
  {
    position: 1,
    team: "Juventus",
    teamUrl: "https://sport.sky.it/calcio/squadre/juventus/news",
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
    teamUrl: "https://sport.sky.it/calcio/squadre/milan/news",
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
  {
    position: 3,
    team: "Napoli",
    teamUrl: "https://sport.sky.it/calcio/squadre/napoli/news",
    logoUrl: null,
    played: 33,
    wins: 20,
    draws: 7,
    losses: 6,
    goalsFor: 55,
    goalsAgainst: 31,
    goalDiff: 24,
    points: 67,
    trend: [],
    qualification: "UCL",
    lastMatches: [],
  },
];

export type CalendarResult =
  { ok: true; team: string; matches: MockMatch[] } | { ok: false; status: 400; error: string };

/** Le squadre che compaiono almeno una volta nella fixture. */
export function teamsInFixture(): string[] {
  const nomi = new Set<string>();
  for (const m of FOOTBALL_CALENDAR) {
    nomi.add(m.homeTeam);
    nomi.add(m.awayTeam);
  }
  return [...nomi];
}

/**
 * Il calendario di una squadra, con la stessa politica della edge function:
 * parametro assente significa Juventus, valore fuori elenco significa 400.
 *
 * Le due copie di questa politica — qui e in `teamFilter.ts` — sono tenute
 * allineate da un test del gate, perche' Playwright non puo' caricare il
 * modulo Deno a runtime e una duplicazione non sorvegliata diverge in
 * silenzio.
 */
export function calendarForTeam(raw: string | null | undefined): CalendarResult {
  if (raw === null || raw === undefined || raw === "") {
    return { ok: true, team: DEFAULT_TEAM.slug, matches: matchesOf(DEFAULT_TEAM.name) };
  }
  const team = resolveTeamStrict(raw);
  if (!team) {
    return { ok: false, status: 400, error: `Squadra sconosciuta: ${raw}` };
  }
  return { ok: true, team: team.slug, matches: matchesOf(team.name) };
}

function matchesOf(nome: string): MockMatch[] {
  const team = resolveTeamStrict(nome);
  if (!team) return [];
  return FOOTBALL_CALENDAR.filter(
    (m) => matchesTeam(m.homeTeam, team) || matchesTeam(m.awayTeam, team),
  );
}
