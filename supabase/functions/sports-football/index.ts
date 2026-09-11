import { buildCorsHeaders, checkRateLimit, rateLimitResponse } from "../_shared/security.ts";
import { buildMatchId, romeDateKeyOf } from "./matchId.ts";
import { parseSquad, type Squad } from "./teamSquad.ts";
import { parseLineups, type Lineups } from "./lineups.ts";
import { buildMatchDetail, parseHero, parseOfficialLineup } from "./matchDetail.ts";
import {
  parsePlayerStats,
  statsPerStagione,
  type StatistichePerCompetizione,
} from "./playerStats.ts";
import { matchesTeam, type SerieATeam } from "../_shared/serieATeams.ts";
import {
  legaMatchInvolvesTeam,
  matchInvolvesTeam,
  pickSeasonId,
  resolveRequestedTeam,
} from "./teamFilter.ts";

const SKY_BASE = "https://sport.sky.it";
const SERIE_A_COMP_ID = "21";
const UCL_COMP_ID = "5";
const COPPA_ITALIA_COMP_ID = "259";
const LEGA_API = "https://api-sdp.legaseriea.it/v1/serie-a/football";

/**
 * Competizioni interrogate per costruire il calendario della squadra.
 *
 * Sky non espone un widget "squadra": ogni torneo ha un id numerico e va
 * letto separatamente. Oltre ai tre tornei principali proviamo una lista di
 * id candidati (competizioni realmente pubblicate da Sky o adiacenti a
 * quelle note) per intercettare automaticamente Supercoppa Italiana,
 * Mondiale per Club, amichevoli e qualunque altro torneo in cui la squadra
 * venga inserita. Gli id non disponibili rispondono 404 e vengono ignorati.
 */
const CORE_COMPETITION_IDS = [SERIE_A_COMP_ID, UCL_COMP_ID, COPPA_ITALIA_COMP_ID];
const EXTRA_COMPETITION_IDS = [
  "4",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "20",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
  "105",
  "106",
  "107",
  "260",
  "261",
];
const ALL_COMPETITION_IDS = [...CORE_COMPETITION_IDS, ...EXTRA_COMPETITION_IDS];

/** Id della Serie A nell'API Lega: stabile, non dipende dalla stagione. */
const LEGA_SERIE_A_COMPETITION_ID =
  "serie-a::Football_Competition::ec93b94f74294dc98ab5bcfd67fc0d88";

const LEGA_HEADERS = {
  accept: "text/plain; x-api-version=1.0",
  Referer: "https://www.legaseriea.it/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

/**
 * Gli id stagione sono immutabili: una volta risolti valgono per tutta la vita
 * dell'isolate. Si memorizzano solo le risposte riuscite, così un guasto
 * temporaneo della Lega non resta congelato fino al prossimo deploy.
 */
const seasonIdCache = new Map<string, string | null>();

/**
 * Chiede alla Lega qual e' l'id della stagione che inizia in `season`.
 *
 * Prima questo dato era una mappa statica scritta a mano, ed era gia'
 * sbagliata: «2026» e «2025» puntavano allo stesso id, quindi il calendario
 * 2026/27 mostrava i telecronisti del 2025/26. Un errore di questo tipo non
 * si manifesta: non c'e' un 404, non c'e' uno spinner, c'e' solo un nome di
 * emittente plausibile e vecchio di un anno.
 */
async function fetchSeasonId(season: string): Promise<string | null> {
  const cached = seasonIdCache.get(season);
  if (cached !== undefined) return cached;

  try {
    const url = `${LEGA_API}/competitions/${encodeURIComponent(LEGA_SERIE_A_COMPETITION_ID)}/seasons?locale=it-IT`;
    const res = await fetch(url, { headers: LEGA_HEADERS });
    if (!res.ok) {
      console.warn(`Lega API seasons error: ${res.status}`);
      return null;
    }
    const seasonId = pickSeasonId(await res.json(), season);
    if (!seasonId) console.warn(`La Lega non espone la stagione ${season}`);
    seasonIdCache.set(season, seasonId);
    return seasonId;
  } catch (e) {
    console.error("Lega API seasons fetch error:", e);
    return null;
  }
}

/**
 * La rosa dalla pagina squadra di Sky.
 *
 * Una pagina che non risponde non e' un errore da propagare: e' una rosa che
 * per ora non c'e'. Chi chiama lo dichiara con `dataSource: "unavailable"`,
 * che e' la verita', invece di un 500 che non lo e'.
 *
 * Lo slug arriva dalla whitelist di `resolveRequestedTeam`, quindi non e'
 * input arbitrario; resta codificato lo stesso, perche' la regola vale per
 * ogni parametro che finisce in una URL a monte, non solo per quelli sospetti.
 */
async function fetchSquad(team: SerieATeam): Promise<Squad> {
  const url = `${SKY_BASE}/calcio/squadre/${encodeURIComponent(team.slug)}/rosa`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!res.ok) {
      console.warn(`Rosa non disponibile per ${team.slug}: ${res.status}`);
      return { players: [], manager: null };
    }
    return parseSquad(await res.text());
  } catch (e) {
    console.error(`Errore nel recupero della rosa di ${team.slug}:`, e);
    return { players: [], manager: null };
  }
}

/**
 * Un widget partita di Sky. Stesso schema di indirizzo dei widget classifica e
 * calendario, con l'id della partita al posto della stagione.
 *
 * Un widget che non risponde non e' un errore da propagare: e' un pezzo di
 * dettaglio che oggi non c'e'. `buildMatchDetail` regge l'assenza di ognuno dei
 * tre, e chi chiama dichiara il degrado.
 */
async function fetchMatchWidget(widget: string, matchId: string): Promise<string | null> {
  const url = `${SKY_BASE}/football/${widget}/${encodeURIComponent(matchId)}/widget.html`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!res.ok) {
      console.warn(`Widget ${widget} non disponibile per ${matchId}: ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    console.error(`Errore nel recupero del widget ${widget} per ${matchId}:`, e);
    return null;
  }
}

/**
 * Le statistiche di un giocatore, dalla sua scheda atleta su Sky.
 *
 * **Servono tutti e due i pezzi dell'indirizzo.** Verificato dal vivo l'11
 * settembre 2026: `/calcio/atleti/{id}` risponde `404`, e cosi'
 * `/calcio/atleti/x/{id}` con lo slug sbagliato. Non c'e' un indirizzo
 * canonico che rediriga, quindi entrambi i valori vengono dalla scheda rosa e
 * devono arrivare qui interi.
 *
 * Entrambi finiscono dentro una URL a monte, quindi passano prima dalla
 * validazione stretta di `resolveRequestedPlayer`: e' la regola del progetto
 * per ogni parametro interpolato, anche quando l'origine e' nostra.
 *
 * Una pagina che non risponde non e' un errore da propagare: e' un giocatore
 * di cui oggi non abbiamo le statistiche. Chi chiama lo dichiara.
 */
async function fetchPlayerStats(
  slug: string,
  id: string,
  season: string,
): Promise<StatistichePerCompetizione[]> {
  const url = `${SKY_BASE}/calcio/atleti/${encodeURIComponent(slug)}/${encodeURIComponent(id)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!res.ok) {
      console.warn(`Scheda atleta non disponibile (${slug}/${id}): ${res.status}`);
      return [];
    }
    return statsPerStagione(parsePlayerStats(await res.text()), season);
  } catch (e) {
    console.error(`Errore nel recupero delle statistiche di ${slug}/${id}:`, e);
    return [];
  }
}

/**
 * Le probabili formazioni della prossima partita della squadra.
 *
 * L'indirizzo e' **per squadra**, non per partita: Sky pubblica
 * `/probabili-formazioni/{slug}` e dentro ci mette la partita che quella
 * squadra deve giocare. L'indirizzo per partita esiste ma serve un'altra cosa
 * — la formazione effettiva — e risponde 404 per una partita inesistente.
 *
 * Come per la rosa, una pagina che non risponde non e' un errore da
 * propagare: sono formazioni che per ora non ci sono.
 */
async function fetchLineups(team: SerieATeam): Promise<Lineups> {
  const url = `${SKY_BASE}/calcio/serie-a/probabili-formazioni/${encodeURIComponent(team.slug)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!res.ok) {
      console.warn(`Probabili formazioni non disponibili per ${team.slug}: ${res.status}`);
      return { date: null, matchUrl: null, home: null, away: null };
    }
    return parseLineups(await res.text());
  } catch (e) {
    console.error(`Errore nel recupero delle formazioni di ${team.slug}:`, e);
    return { date: null, matchUrl: null, home: null, away: null };
  }
}

export interface StadiumInfo {
  name: string;
  cityName: string | null;
  address: string | null;
  /** Manca per alcune squadre: va mostrata solo quando c'e'. */
  capacity: number | null;
  yearOfConstruction: number | null;
}

/**
 * Lo stadio dall'API della Lega, che Sky non da'.
 *
 * L'abbinamento passa da `matchesTeam` e prova **due** campi: la Lega scrive
 * `shortName` e `officialName`, e i due non coincidono sempre con il nome che
 * usa Sky. Con l'uguaglianza esatta su un campo solo, una squadra resterebbe
 * senza stadio senza che niente lo segnali.
 */
async function fetchStadium(season: string, team: SerieATeam): Promise<StadiumInfo | null> {
  const seasonId = await fetchSeasonId(season);
  if (!seasonId) return null;
  try {
    const url = `${LEGA_API}/seasons/${encodeURIComponent(seasonId)}/teams?locale=it-IT`;
    const res = await fetch(url, { headers: LEGA_HEADERS });
    if (!res.ok) {
      console.warn(`Lega API teams error: ${res.status}`);
      return null;
    }
    const body = await res.json();
    const riga = (body?.teams ?? []).find(
      (x: any) => matchesTeam(x?.shortName, team) || matchesTeam(x?.officialName, team),
    );
    const s = riga?.stadium;
    if (!s?.name) return null;
    return {
      name: String(s.name),
      cityName: s.cityName ? String(s.cityName) : null,
      address: s.address ? String(s.address) : null,
      capacity:
        Number.isFinite(Number(s.capacity)) && Number(s.capacity) > 0 ? Number(s.capacity) : null,
      yearOfConstruction:
        Number.isFinite(Number(s.yearOfConstruction)) && Number(s.yearOfConstruction) > 0
          ? Number(s.yearOfConstruction)
          : null,
    };
  } catch (e) {
    console.error("Lega API teams fetch error:", e);
    return null;
  }
}

const COMPETITION_NAMES: Record<string, string> = {
  [SERIE_A_COMP_ID]: "Serie A",
  [UCL_COMP_ID]: "Champions League",
  [COPPA_ITALIA_COMP_ID]: "Coppa Italia",
};

type SkyWidgetResponse = {
  html: string;
  seasonUsed: string;
};

function unescapeHtml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractWidgetModel(html: string): any {
  // Nuovo formato Sky (2026): JSON in <script type="application/json" data-props="true">...</script>
  const scriptMatch =
    html.match(
      /<script[^>]*type=["']application\/json["'][^>]*data-props=["']true["'][^>]*>([\s\S]*?)<\/script>/i,
    ) ||
    html.match(
      /<script[^>]*data-props=["']true["'][^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/i,
    );
  if (scriptMatch) {
    try {
      return JSON.parse(scriptMatch[1]);
    } catch (e) {
      console.error("Failed to parse data-props JSON:", e);
    }
  }
  // Vecchio formato Sky: attributo model='...'/model="..."
  const modelMatch = html.match(/model='([^']*)'/) || html.match(/model="([^"]*)"/);
  if (!modelMatch) {
    console.error(
      "No model/data-props found. HTML length:",
      html.length,
      "First 500 chars:",
      html.substring(0, 500),
    );
    return null;
  }
  try {
    const unescaped = unescapeHtml(modelMatch[1]);
    return JSON.parse(unescaped);
  } catch (e) {
    console.error("Failed to parse model JSON:", e);
    return null;
  }
}

async function fetchSkyWidget(
  buildUrl: (season: string) => string,
  requestedSeason: string,
  allowPreviousSeason = true,
): Promise<SkyWidgetResponse> {
  const parsedSeason = Number.parseInt(requestedSeason, 10);
  const fallbackSeason =
    allowPreviousSeason && Number.isFinite(parsedSeason) ? String(parsedSeason - 1) : null;
  const seasonsToTry = [...new Set([requestedSeason, fallbackSeason].filter(Boolean) as string[])];

  let lastStatus: number | null = null;

  for (const season of seasonsToTry) {
    const widgetUrl = buildUrl(season);
    console.log("Fetching:", widgetUrl);

    const res = await fetch(widgetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });

    if (res.ok) {
      return { html: await res.text(), seasonUsed: season };
    }

    lastStatus = res.status;
    console.warn(`Sky Sport widget unavailable for season ${season}: ${res.status}`);

    if (res.status !== 404) {
      throw new Error(`Sky Sport error: ${res.status}`);
    }
  }

  throw new Error(`Sky Sport error: ${lastStatus ?? 404}`);
}

async function fetchBroadcasterMap(
  season: string,
  team: SerieATeam,
): Promise<Record<string, string>> {
  const seasonId = await fetchSeasonId(season);
  if (!seasonId) return {};

  try {
    const url = `${LEGA_API}/seasons/${encodeURIComponent(seasonId)}/matches?locale=it-IT`;
    console.log("Fetching Lega Serie A broadcasters:", url);

    const res = await fetch(url, { headers: LEGA_HEADERS });

    if (!res.ok) {
      console.warn(`Lega API error: ${res.status}`);
      return {};
    }

    const data = await res.json();
    const matches = data.matches || [];
    const map: Record<string, string> = {};

    for (const m of matches) {
      if (!legaMatchInvolvesTeam(m, team)) continue;

      const broadcasters = m.editorial?.broadcasters;
      if (!broadcasters) continue;

      const parts: string[] = [];
      if (broadcasters.broadcasterNational1) parts.push(broadcasters.broadcasterNational1);
      if (broadcasters.broadcasterNational2) parts.push(broadcasters.broadcasterNational2);
      if (broadcasters.broadcasterNational3) parts.push(broadcasters.broadcasterNational3);

      const broadcasterStr = parts.join(" | ");
      if (!broadcasterStr) continue;

      const matchdayMatch = m.matchSet?.name?.match(/(\d+)/);
      if (matchdayMatch) {
        map[matchdayMatch[1]] = broadcasterStr;
      }

      if (m.matchDateUtc) {
        // Chiave normalizzata sul giorno italiano: "partita di sabato sera"
        // resta sabato anche se l'UTC sfora la mezzanotte.
        const romeDateKey = romeDateKeyOf(m.matchDateUtc);
        if (romeDateKey) {
          map[`date:${romeDateKey}`] = broadcasterStr;
        }
      }
    }

    console.log(`Found broadcaster info for ${Object.keys(map).length} ${team.name} matches`);
    return map;
  } catch (e) {
    console.error("Lega API broadcaster fetch error:", e);
    return {};
  }
}

/**
 * Ricava il nome competizione dallo slug presente nei link partita Sky
 * (es. ".../calcio/supercoppa-italiana/partite/..." -> "Supercoppa Italiana").
 * Serve per i tornei non presenti nella mappa statica.
 */
function competitionNameFromMatches(rounds: any[]): string | null {
  for (const round of rounds || []) {
    for (const matchDay of round?.matchDayList || []) {
      for (const match of matchDay?.matchList || []) {
        const link = String(match?.link || "");
        const m = link.match(/\/calcio\/([^/]+)\/partite\//i);
        if (m) {
          return m[1]
            .split("-")
            .filter(Boolean)
            .map((w) => (w.length <= 2 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
            .join(" ");
        }
      }
    }
  }
  return null;
}

function extractTeamMatches(
  model: any,
  competitionId: string,
  broadcasterMap: Record<string, string>,
  team: SerieATeam,
): any[] {
  const rounds = model.competitionMatchList || [];
  const matches: any[] = [];
  const competitionName =
    COMPETITION_NAMES[competitionId] || competitionNameFromMatches(rounds) || "Altro";

  for (const round of rounds) {
    const roundNum = round.round;
    const matchDayList = round.matchDayList || [];
    for (const matchDay of matchDayList) {
      const matchList = matchDay.matchList || [];
      for (const match of matchList) {
        if (!matchInvolvesTeam(match, team)) continue;
        const homeName = match.home?.name || "";
        const awayName = match.away?.name || "";

        const isFinished = match.status === "FullTime";

        // Broadcaster lookup (only for Serie A)
        let broadcaster: string | null = null;
        if (competitionId === SERIE_A_COMP_ID) {
          if (roundNum && broadcasterMap[String(roundNum)]) {
            broadcaster = broadcasterMap[String(roundNum)];
          } else if (match.date) {
            const dateKey = romeDateKeyOf(match.date);
            broadcaster = (dateKey && broadcasterMap[`date:${dateKey}`]) || null;
          }
        }

        matches.push({
          id: buildMatchId(match, competitionName),
          // L'id **di Sky**, accanto al nostro. Il nostro identifica la partita
          // in modo stabile e leggibile e non cambia; questo e' la chiave con
          // cui si chiedono i widget del dettaglio. Viaggia da qui perche' il
          // widget del calendario ce l'ha gia': senza, per leggere un numero
          // servirebbe scaricare la pagina della partita, 250 KB.
          skyMatchId: typeof match.id === "string" ? match.id : null,
          matchday: roundNum,
          homeTeam: homeName,
          awayTeam: awayName,
          homeLogo: match.home?.logoUrl || null,
          awayLogo: match.away?.logoUrl || null,
          homeScore: isFinished ? match.home?.goal : null,
          awayScore: isFinished ? match.away?.goal : null,
          date: match.date,
          status: match.status,
          competition: competitionName,
          link: match.link || null,
          broadcaster,
        });
      }
    }
  }
  return matches;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, { key: "sports-football" });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const season = url.searchParams.get("season") || "2025";

    // Validate season strictly to prevent URL path injection on upstream APIs
    if (!/^\d{4}$/.test(season)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid season parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // La squadra e' un parametro come la stagione. Assente significa Juventus:
    // i chiamanti gia' in produzione non lo passano e devono continuare a
    // vedere quello che vedevano prima.
    const richiesta = resolveRequestedTeam(url.searchParams.get("team"));
    if (!richiesta.ok) {
      return new Response(JSON.stringify({ success: false, error: richiesta.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const team = richiesta.team;

    let data: any;
    let seasonUsed = season;
    // Alcune azioni non hanno un ripiego di stagione ma possono comunque
    // tornare a mani vuote: devono poterlo dire invece di sembrare «live».
    let dataSourceDegradato: "unavailable" | null = null;
    let calendarMeta: {
      competitionsIncluded: string[];
      competitionsUnavailable: string[];
      competitionsWithoutMatches: string[];
    } | null = null;

    switch (action) {
      case "standings": {
        const response = await fetchSkyWidget(
          (s) => `${SKY_BASE}/football/competition-ranking/${s}/${SERIE_A_COMP_ID}/widget.html`,
          season,
        );
        const html = response.html;
        seasonUsed = response.seasonUsed;
        const model = extractWidgetModel(html);
        if (!model?.rankingLists?.[0]?.teams) {
          throw new Error("Dati classifica non trovati nella pagina Sky Sport");
        }
        data = model.rankingLists[0].teams.map((t: any) => ({
          position: t.position,
          team: t.teamName,
          teamUrl: t.teamUrl,
          logoUrl: t.logoUrl,
          played: t.games,
          wins: t.gamesWon,
          draws: t.gamesDraw,
          losses: t.gamesLost,
          goalsFor: t.goalsScored,
          goalsAgainst: t.goalsConceded,
          goalDiff: t.goalsDifference,
          points: t.points,
          trend: t.trend,
          qualification: t.qualification,
          lastMatches: (t.lastMatchesTrend || []).map((m: any) => ({
            result: m.label,
            home: m.home,
            away: m.away,
          })),
        }));
        break;
      }

      case "calendar": {
        // Tutte le competizioni della squadra nella stagione richiesta.
        // IMPORTANTE: nessun fallback alla stagione precedente, altrimenti i
        // tornei non ancora pubblicati (es. Champions a inizio stagione)
        // riempirebbero il calendario con partite dell'anno scorso.
        const competitionIds = ALL_COMPETITION_IDS;

        const [broadcasterMap, ...skyResponses] = await Promise.all([
          fetchBroadcasterMap(season, team),
          ...competitionIds.map((compId) =>
            fetchSkyWidget(
              (s) => `${SKY_BASE}/football/competition-calendar-results/${s}/${compId}/widget.html`,
              season,
              false,
            ).catch((err) => {
              console.warn(`Failed to fetch competition ${compId}:`, err?.message ?? err);
              return null;
            }),
          ),
        ]);

        const allMatches: any[] = [];
        const competitionsIncluded: string[] = [];
        const competitionsUnavailable: string[] = [];
        // Distinta da `unavailable`: il torneo esiste e risponde, e' la squadra
        // che non ci gioca. Con venti squadre e' il caso normale, non l'errore.
        const competitionsWithoutMatches: string[] = [];

        for (let i = 0; i < competitionIds.length; i++) {
          const compId = competitionIds[i];
          const skyResponse = skyResponses[i];
          if (!skyResponse) {
            if (CORE_COMPETITION_IDS.includes(compId)) {
              competitionsUnavailable.push(COMPETITION_NAMES[compId] || compId);
            }
            continue;
          }
          const model = extractWidgetModel(skyResponse.html);
          if (!model) continue;
          const compMatches = extractTeamMatches(model, compId, broadcasterMap, team);
          if (compMatches.length === 0) {
            if (CORE_COMPETITION_IDS.includes(compId)) {
              const nome = COMPETITION_NAMES[compId] || compId;
              competitionsWithoutMatches.push(nome);
              // Il confronto fra nomi e' per uguaglianza esatta: se la fonte
              // scrivesse la squadra in una forma imprevista, il torneo
              // risponderebbe e il filtro scarterebbe tutto in silenzio.
              console.warn(`${nome} risponde ma non contiene partite di ${team.name}`);
            }
            continue;
          }
          competitionsIncluded.push(compMatches[0].competition);
          allMatches.push(...compMatches);
        }

        // Deduplica per id partita (competizioni sovrapposte / id duplicati).
        const seenIds = new Set<string>();
        for (let i = allMatches.length - 1; i >= 0; i--) {
          const id = String(allMatches[i]?.id ?? "");
          if (id && seenIds.has(id)) allMatches.splice(i, 1);
          else if (id) seenIds.add(id);
        }

        calendarMeta = {
          competitionsIncluded,
          competitionsUnavailable,
          competitionsWithoutMatches,
        };

        // Sort by date
        allMatches.sort((a, b) => {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        // Filtro opzionale "solo prossime": esclude le partite gia' giocate
        // della stagione in corso (restano consultabili senza il parametro).
        if (url.searchParams.get("upcoming") === "1") {
          const now = Date.now();
          const upcoming = allMatches.filter((m) => {
            if (m.status === "FullTime") return false;
            if (!m.date) return true;
            const t = new Date(m.date).getTime();
            return Number.isNaN(t) ? true : t >= now - 3 * 60 * 60 * 1000;
          });
          allMatches.length = 0;
          allMatches.push(...upcoming);
        }

        // Optional pagination (backward compatible: when neither page nor pageSize is
        // provided, return the flat array as before).
        const pageParam = url.searchParams.get("page");
        const pageSizeParam = url.searchParams.get("pageSize");
        if (pageParam !== null || pageSizeParam !== null) {
          const parsedPageSize = Number.parseInt(pageSizeParam ?? "12", 10);
          const parsedPage = Number.parseInt(pageParam ?? "1", 10);
          const pageSize = Number.isFinite(parsedPageSize)
            ? Math.min(50, Math.max(1, parsedPageSize))
            : 12;
          const total = allMatches.length;
          const totalPages = Math.max(1, Math.ceil(total / pageSize));
          const page = Number.isFinite(parsedPage)
            ? Math.min(totalPages, Math.max(1, parsedPage))
            : 1;
          // Global index of the next upcoming (non-finished) match, useful for the UI
          // landing logic. -1 when no upcoming match exists.
          const nextUpcomingIndex = allMatches.findIndex((m) => m.status !== "FullTime");
          const start = (page - 1) * pageSize;
          const items = allMatches.slice(start, start + pageSize);
          data = { items, total, page, pageSize, totalPages, nextUpcomingIndex };
        } else {
          data = allMatches;
        }
        break;
      }

      case "next-match": {
        const response = await fetchSkyWidget(
          (s) => `${SKY_BASE}/football/competition-ranking/${s}/${SERIE_A_COMP_ID}/widget.html`,
          season,
        );
        const html = response.html;
        seasonUsed = response.seasonUsed;
        const model = extractWidgetModel(html);
        if (!model?.rankingLists?.[0]?.teams) {
          throw new Error("Dati non trovati");
        }
        const riga = model.rankingLists[0].teams.find((t: any) => matchesTeam(t.teamName, team));
        if (!riga) console.warn(`${team.name} non compare nella classifica ${season}`);
        data = riga
          ? {
              position: riga.position,
              team: riga.teamName,
              points: riga.points,
              played: riga.games,
              wins: riga.gamesWon,
              draws: riga.gamesDraw,
              losses: riga.gamesLost,
              goalsFor: riga.goalsScored,
              goalsAgainst: riga.goalsConceded,
              goalDiff: riga.goalsDifference,
              logoUrl: riga.logoUrl,
              lastMatches: (riga.lastMatchesTrend || []).map((m: any) => ({
                result: m.label,
                home: m.home,
                away: m.away,
              })),
            }
          : null;
        break;
      }

      case "team-squad": {
        // Due fonti in parallelo: la rosa da Sky, lo stadio dalla Lega.
        // `Promise.all` e non due `await` in fila perche' non dipendono l'una
        // dall'altra, e lo stadio non deve far aspettare la rosa.
        const [rosa, stadium] = await Promise.all([fetchSquad(team), fetchStadium(season, team)]);
        data = { players: rosa.players, manager: rosa.manager, stadium };
        // Una rosa vuota non e' una squadra senza giocatori: e' la fonte che
        // non ha risposto o ha cambiato forma. Dichiararlo qui evita che la
        // pagina mostri un vuoto convincente.
        if (rosa.players.length === 0) dataSourceDegradato = "unavailable";
        break;
      }

      case "match-detail": {
        // L'id arriva dal nostro stesso calendario (`skyMatchId`), non da chi
        // naviga. Si valida lo stesso: la regola vale per ogni parametro che
        // finisce in una URL a monte.
        const matchId = url.searchParams.get("matchId") ?? "";
        if (!/^\d{1,12}$/.test(matchId)) {
          return new Response(
            JSON.stringify({ success: false, error: "Parametro matchId non valido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // I tre widget in parallelo: non dipendono l'uno dall'altro, e le
        // probabili servono solo se la formazione ufficiale non c'e' ancora —
        // ma scoprirlo dopo costerebbe un secondo giro di rete.
        const [heroHtml, lineupHtml, predictedHtml] = await Promise.all([
          fetchMatchWidget("lmp-hero", matchId),
          fetchMatchWidget("lmp-lineup", matchId),
          fetchMatchWidget("lmp-predicted-lineup-details", matchId),
        ]);

        data = buildMatchDetail({
          hero: heroHtml ? parseHero(heroHtml) : null,
          official: lineupHtml ? parseOfficialLineup(lineupHtml) : null,
          predictedHtml,
        });

        // Nessuna formazione e nessun risultato vuol dire che dei tre widget
        // non e' arrivato niente di utile. Puo' succedere per una partita
        // molto lontana, e non e' un guasto: ma la pagina non deve mostrare
        // schede vuote come se fossero la verita' sulla partita.
        if (!data.home && !data.away && data.score === null) dataSourceDegradato = "unavailable";
        break;
      }

      case "player-stats": {
        // I due pezzi dell'indirizzo, validati **prima** di finire in una URL
        // a monte. Vengono dalla nostra scheda rosa, non da chi naviga: la
        // validazione e' difesa in profondita', non diffidenza verso l'utente.
        const slug = url.searchParams.get("playerSlug") ?? "";
        const id = url.searchParams.get("playerId") ?? "";
        if (!/^[a-z0-9-]{1,80}$/.test(slug) || !/^\d{1,12}$/.test(id)) {
          return new Response(
            JSON.stringify({ success: false, error: "Parametri giocatore non validi" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const competizioni = await fetchPlayerStats(slug, id, season);
        data = { playerId: id, playerSlug: slug, competitions: competizioni };
        // Zero competizioni vuol dire che per questa stagione la fonte non
        // pubblica niente per lui — un giocatore appena arrivato, o una scheda
        // che ha cambiato forma. In nessuno dei due casi la pagina deve
        // mostrare una tabella di zeri.
        if (competizioni.length === 0) dataSourceDegradato = "unavailable";
        break;
      }

      case "lineups": {
        const formazioni = await fetchLineups(team);
        data = formazioni;
        // Fuori dal calendario — d'estate, o dopo l'ultima giornata — Sky non
        // pubblica niente. Non e' un guasto, ed e' diverso da «non risponde»:
        // in entrambi i casi pero' la pagina non deve fingere una formazione.
        if (!formazioni.home && !formazioni.away) dataSourceDegradato = "unavailable";
        break;
      }

      default:
        return new Response(
          JSON.stringify({
            error:
              "Azione non valida. Usa: standings, calendar, next-match, team-squad, lineups, player-stats, match-detail",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
    }

    // dataSource:
    //  - "live" se la stagione richiesta e' stata effettivamente servita da Sky;
    //  - "fallback-previous-season" se l'helper ha dovuto ripiegare su season-1.
    const dataSource: "live" | "fallback-previous-season" | "unavailable" =
      dataSourceDegradato ?? (seasonUsed === season ? "live" : "fallback-previous-season");
    const meta = {
      dataSource,
      season: /^\d{4}$/.test(season) ? parseInt(season, 10) : season,
      seasonUsed: /^\d{4}$/.test(seasonUsed) ? parseInt(seasonUsed, 10) : seasonUsed,
      team: team.slug,
      teamName: team.name,
      source: "Sky Sport Italia + Lega Serie A",
      ...(calendarMeta ?? {}),
    };
    return new Response(
      JSON.stringify({
        success: true,
        data,
        meta,
        source: meta.source,
        requestedSeason: season,
        seasonUsed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Football API error:", error);
    return new Response(JSON.stringify({ success: false, error: "Errore interno del server" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
