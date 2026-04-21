import { SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseClient";

async function callEdgeFunction(functionName: string, params: Record<string, string>) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${SUPABASE_PROJECT_URL}/functions/v1/${functionName}?${queryString}`;
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Errore API: ${response.status}`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.error || "Errore sconosciuto");
  }

  return json.data;
}

/**
 * Variante che restituisce l'envelope completo (data + meta) per il flusso di
 * sincronizzazione, dove serve sapere se i dati provengono da fonti live o
 * fallback statici. Per le query React Query continua a essere usata
 * `callEdgeFunction` che restituisce solo `data`.
 */
export type EdgeMeta = {
  dataSource?: "live" | "static-fallback" | "fallback-previous-season" | "wikipedia" | "wikipedia+curated" | "static" | "mixed" | "unknown";
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
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
  });
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
    callEdgeFunction("sports-f1", { action: "calendar", season: String(season) }),
  getDriverStandings: (season: number) =>
    callEdgeFunction("sports-f1", { action: "driver-standings", season: String(season) }),
  getConstructorStandings: (season: number) =>
    callEdgeFunction("sports-f1", { action: "constructor-standings", season: String(season) }),
  getNextRace: () =>
    callEdgeFunction("sports-f1", { action: "next-race" }),
  getLastResult: (season: number) =>
    callEdgeFunction("sports-f1", { action: "last-result", season: String(season) }),
};

// === Football API (Sky Sport Italia scraping) ===
export const footballApi = {
  getStandings: (season: number) =>
    callEdgeFunction("sports-football", { action: "standings", season: String(season) }),
  getCalendar: (season: number, page?: number, pageSize?: number) => {
    const params: Record<string, string> = { action: "calendar", season: String(season) };
    if (page !== undefined) params.page = String(page);
    if (pageSize !== undefined) params.pageSize = String(pageSize);
    return callEdgeFunction("sports-football", params);
  },
  getJuventusInfo: (season: number) =>
    callEdgeFunction("sports-football", { action: "next-match", season: String(season) }),
};

// === Tennis API (ATP scraping) ===
export const tennisApi = {
  getPlayerInfo: () =>
    callEdgeFunction("sports-tennis", { action: "player-info" }),
  getNextEvent: () =>
    callEdgeFunction("sports-tennis", { action: "next-event" }),
  getSchedule: (season: number) =>
    callEdgeFunction("sports-tennis", { action: "schedule", season: String(season) }),
  getResults: (season: number, page?: number, pageSize?: number) =>
    callEdgeFunction("sports-tennis", {
      action: "results",
      season: String(season),
      ...(page !== undefined ? { page: String(page) } : {}),
      ...(pageSize !== undefined ? { pageSize: String(pageSize) } : {}),
    }),
};

// === Streaming API (TV palinsesto + nuove uscite) ===
export type StreamingFamilyId =
  | "sky-sport"
  | "sky-cinema"
  | "rai"
  | "mediaset"
  | "discovery";

export type StreamingProviderId = "netflix" | "prime" | "disney" | "hbo";

export const streamingApi = {
  getTvByFamily: (family: StreamingFamilyId, date?: string) =>
    callEdgeFunction("streaming-tv", {
      action: "prime-time",
      family,
      ...(date ? { date } : {}),
    }),
  getReleasesByProvider: (
    provider: StreamingProviderId,
    dateFrom?: string,
    dateTo?: string,
  ) =>
    callEdgeFunction("streaming-releases", {
      action: "new-today",
      provider,
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    }),
  getReleaseCredits: (type: "movie" | "tv", id: number | string) =>
    callEdgeFunction("streaming-releases", {
      action: "credits",
      type,
      id: String(id),
    }),
};

// === MotoGP API (Official API / scraping) ===
export const motogpApi = {
  getCalendar: (season: number) =>
    callEdgeFunction("sports-motogp", { action: "calendar", season: String(season) }),
  getNextEvent: () =>
    callEdgeFunction("sports-motogp", { action: "next-event", season: String(new Date().getFullYear()) }),
  getStandings: (season: number) =>
    callEdgeFunction("sports-motogp", { action: "standings", season: String(season) }),
  getConstructorStandings: (season: number) =>
    callEdgeFunction("sports-motogp", { action: "constructor-standings", season: String(season) }),
};

// === Highlights API (YouTube RSS) ===
export type HighlightSport = "juventus" | "f1" | "motogp";

export const highlightsApi = {
  list: (sport: HighlightSport, limit = 12) =>
    callEdgeFunction("highlights-youtube", { sport, limit: String(limit) }),
};
