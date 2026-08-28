import { z } from "zod";
import { SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseClient";
import {
  declaredOnly,
  edgeEnvelopeSchema,
  f1CalendarSchema,
  f1ConstructorStandingsSchema,
  f1DriverStandingsSchema,
  f1LastResultSchema,
  f1NextRaceSchema,
  footballCalendarSchema,
  footballStandingsSchema,
  highlightsSchema,
  juventusInfoSchema,
  motogpCalendarSchema,
  motogpConstructorStandingsSchema,
  motogpNextEventSchema,
  motogpStandingsSchema,
  tennisNextEventSchema,
  tennisPlayerInfoSchema,
  tennisResultsSchema,
  tennisScheduleSchema,
} from "@/lib/api/schemas";
import type {
  CreditsPayload,
  ReleaseDetailsPayload,
  ReleasesItalyPayload,
  ReleasesPayload,
  TvFamilyPayload,
} from "@/lib/api/schemas";

/**
 * Esegue una fetch verso una edge function con retry automatico per errori
 * transitori del runtime Supabase (503/502/504, tipicamente cold start o
 * `SUPABASE_EDGE_RUNTIME_ERROR`). Usa backoff esponenziale con jitter.
 */
const TRANSIENT_STATUSES = new Set([502, 503, 504]);
const MAX_RETRIES = 3;

async function fetchEdgeWithRetry(url: string): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
      });
      if (response.ok) return response;
      // Retry solo su errori transitori del runtime
      if (!TRANSIENT_STATUSES.has(response.status) || attempt === MAX_RETRIES) {
        return response;
      }
      lastError = new Error(`Edge runtime ${response.status}`);
    } catch (err) {
      lastError = err;
      if (attempt === MAX_RETRIES) throw err;
    }
    // Backoff: 300ms, 700ms, 1500ms (+ jitter)
    const delay = 300 * Math.pow(2, attempt) + Math.random() * 200;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw lastError ?? new Error("Edge function unreachable");
}

/**
 * Legge l'inviluppo `{ success, data, error }` comune a tutte le edge
 * function e valida `data` con lo schema dell'endpoint. Lo schema non e'
 * un parametro opzionale di comodo: e' l'unico punto in cui i payload
 * smettono di essere `unknown`, e da qui in poi i tipi delle pagine
 * derivano da li'.
 */
async function callEdgeFunction<S extends z.ZodType>(
  functionName: string,
  params: Record<string, string>,
  schema: S,
): Promise<z.infer<S>> {
  const queryString = new URLSearchParams(params).toString();
  const url = `${SUPABASE_PROJECT_URL}/functions/v1/${functionName}?${queryString}`;
  const response = await fetchEdgeWithRetry(url);

  if (!response.ok) {
    throw new Error(`Errore API: ${response.status}`);
  }

  const envelope = edgeEnvelopeSchema.parse(await response.json());
  if (!envelope.success) {
    throw new Error(envelope.error || "Errore sconosciuto");
  }

  const label = params.action ? `${functionName}:${params.action}` : functionName;
  const parsed = schema.safeParse(envelope.data);
  if (!parsed.success) {
    // Il messaggio nomina il campo: senza percorso, una deriva di forma a
    // monte arriva in pagina come "Errore sconosciuto" e costa un debug.
    throw new Error(`Payload inatteso da ${label}: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

/**
 * Variante che restituisce l'envelope completo (data + meta) per il flusso di
 * sincronizzazione, dove serve sapere se i dati provengono da fonti live o
 * fallback statici. Per le query React Query continua a essere usata
 * `callEdgeFunction` che restituisce solo `data`.
 */
export type EdgeMeta = {
  dataSource?:
    | "live"
    | "static-fallback"
    | "fallback-previous-season"
    | "wikipedia"
    | "wikipedia+curated"
    | "static"
    | "mixed"
    | "unknown";
  season?: number | string;
  source?: string;
  [key: string]: unknown;
};

export async function callEdgeFunctionWithMeta<T = unknown>(
  functionName: string,
  params: Record<string, string>,
): Promise<{ data: T; meta: EdgeMeta }> {
  const queryString = new URLSearchParams(params).toString();
  const url = `${SUPABASE_PROJECT_URL}/functions/v1/${functionName}?${queryString}`;
  const response = await fetchEdgeWithRetry(url);
  if (!response.ok) throw new Error(`Errore API: ${response.status}`);
  const json = await response.json();
  if (!json.success) throw new Error(json.error || "Errore sconosciuto");
  const meta: EdgeMeta = json.meta ?? {
    dataSource: typeof json.source === "string" ? "unknown" : undefined,
    source: json.source,
    season: json.seasonUsed ?? json.requestedSeason,
  };
  return { data: json.data as T, meta };
}

// === F1 API (Jolpica) ===
export const f1Api = {
  getCalendar: (season: number) =>
    callEdgeFunction("sports-f1", { action: "calendar", season: String(season) }, f1CalendarSchema),
  getDriverStandings: (season: number) =>
    callEdgeFunction(
      "sports-f1",
      { action: "driver-standings", season: String(season) },
      f1DriverStandingsSchema,
    ),
  getConstructorStandings: (season: number) =>
    callEdgeFunction(
      "sports-f1",
      { action: "constructor-standings", season: String(season) },
      f1ConstructorStandingsSchema,
    ),
  getNextRace: () => callEdgeFunction("sports-f1", { action: "next-race" }, f1NextRaceSchema),
  getLastResult: (season: number) =>
    callEdgeFunction(
      "sports-f1",
      { action: "last-result", season: String(season) },
      f1LastResultSchema,
    ),
};

// === Football API (Sky Sport Italia scraping) ===
export const footballApi = {
  getStandings: (season: number) =>
    callEdgeFunction(
      "sports-football",
      { action: "standings", season: String(season) },
      footballStandingsSchema,
    ),
  getCalendar: (season: number, page?: number, pageSize?: number, upcomingOnly?: boolean) => {
    const params: Record<string, string> = { action: "calendar", season: String(season) };
    if (page !== undefined) params.page = String(page);
    if (pageSize !== undefined) params.pageSize = String(pageSize);
    if (upcomingOnly) params.upcoming = "1";
    return callEdgeFunction("sports-football", params, footballCalendarSchema);
  },
  getJuventusInfo: (season: number) =>
    callEdgeFunction(
      "sports-football",
      { action: "next-match", season: String(season) },
      juventusInfoSchema,
    ),
};

// === Tennis API (ATP scraping) ===
export const tennisApi = {
  getPlayerInfo: () =>
    callEdgeFunction("sports-tennis", { action: "player-info" }, tennisPlayerInfoSchema),
  getNextEvent: () =>
    callEdgeFunction("sports-tennis", { action: "next-event" }, tennisNextEventSchema),
  getSchedule: (season: number) =>
    callEdgeFunction(
      "sports-tennis",
      { action: "schedule", season: String(season) },
      tennisScheduleSchema,
    ),
  getResults: (season: number, page?: number, pageSize?: number) =>
    callEdgeFunction(
      "sports-tennis",
      {
        action: "results",
        season: String(season),
        ...(page !== undefined ? { page: String(page) } : {}),
        ...(pageSize !== undefined ? { pageSize: String(pageSize) } : {}),
      },
      tennisResultsSchema,
    ),
};

// === Streaming API (TV palinsesto + nuove uscite) ===
export type StreamingFamilyId = "sky-sport" | "sky-cinema" | "rai" | "mediaset" | "discovery";

export type StreamingProviderId = "netflix" | "prime" | "disney" | "hbo";

export const streamingApi = {
  getTvByFamily: (family: StreamingFamilyId, date?: string) =>
    callEdgeFunction(
      "streaming-tv",
      { action: "prime-time", family, ...(date ? { date } : {}) },
      declaredOnly<TvFamilyPayload>(),
    ),
  getReleasesByProvider: (provider: StreamingProviderId, dateFrom?: string, dateTo?: string) =>
    callEdgeFunction(
      "streaming-releases",
      {
        action: "new-today",
        provider,
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
      },
      declaredOnly<ReleasesPayload>(),
    ),
  getReleaseCredits: (type: "movie" | "tv", id: number | string) =>
    callEdgeFunction(
      "streaming-releases",
      { action: "credits", type, id: String(id) },
      declaredOnly<CreditsPayload>(),
    ),
  /**
   * Catalogo aggregato Italia: tutti i titoli con disponibilità in IT
   * (flatrate|free|ads) nella finestra date richiesta. Supporta filtro
   * provider opzionale, kind, sort, genere TMDB.
   */
  getReleasesItaly: (opts: {
    provider?: StreamingProviderId | "all";
    kind?: "movie" | "tv" | "all";
    dateFrom?: string;
    dateTo?: string;
    sort?: "release" | "popularity";
    genreId?: number;
  }) =>
    callEdgeFunction(
      "streaming-releases",
      {
        action: "new-italy",
        ...(opts.provider ? { provider: opts.provider } : {}),
        ...(opts.kind ? { kind: opts.kind } : {}),
        ...(opts.dateFrom ? { dateFrom: opts.dateFrom } : {}),
        ...(opts.dateTo ? { dateTo: opts.dateTo } : {}),
        ...(opts.sort ? { sort: opts.sort } : {}),
        ...(opts.genreId ? { genreId: String(opts.genreId) } : {}),
      },
      declaredOnly<ReleasesItalyPayload>(),
    ),
  /**
   * Dettaglio titolo one-shot (overview, generi, regista/creators, cast,
   * trailer YouTube, providers IT, link JustWatch).
   */
  getReleaseDetails: (type: "movie" | "tv", id: number | string) =>
    callEdgeFunction(
      "streaming-releases",
      { action: "details", type, id: String(id) },
      declaredOnly<ReleaseDetailsPayload>(),
    ),
};

// === MotoGP API (Official API / scraping) ===
export const motogpApi = {
  getCalendar: (season: number) =>
    callEdgeFunction(
      "sports-motogp",
      { action: "calendar", season: String(season) },
      motogpCalendarSchema,
    ),
  getNextEvent: () =>
    callEdgeFunction(
      "sports-motogp",
      { action: "next-event", season: String(new Date().getFullYear()) },
      motogpNextEventSchema,
    ),
  getStandings: (season: number) =>
    callEdgeFunction(
      "sports-motogp",
      { action: "standings", season: String(season) },
      motogpStandingsSchema,
    ),
  getConstructorStandings: (season: number) =>
    callEdgeFunction(
      "sports-motogp",
      { action: "constructor-standings", season: String(season) },
      motogpConstructorStandingsSchema,
    ),
};

// === Highlights API (YouTube RSS) ===
export type HighlightSport = "juventus" | "f1" | "motogp";

export const highlightsApi = {
  list: (sport: HighlightSport, limit = 12) =>
    callEdgeFunction("highlights-youtube", { sport, limit: String(limit) }, highlightsSchema),
};
