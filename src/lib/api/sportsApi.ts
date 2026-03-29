async function callEdgeFunction(functionName: string, params: Record<string, string>) {
  const queryString = new URLSearchParams(params).toString();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const url = `${supabaseUrl}/functions/v1/${functionName}?${queryString}`;
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${anonKey}`,
      "apikey": anonKey,
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
  getCalendar: (season: number) =>
    callEdgeFunction("sports-football", { action: "calendar", season: String(season) }),
  getJuventusInfo: (season: number) =>
    callEdgeFunction("sports-football", { action: "next-match", season: String(season) }),
};

// === Tennis API (ATP scraping) ===
export const tennisApi = {
  getPlayerInfo: () =>
    callEdgeFunction("sports-tennis", { action: "player-info" }),
  getSchedule: (season: number) =>
    callEdgeFunction("sports-tennis", { action: "schedule", season: String(season) }),
  getResults: (season: number) =>
    callEdgeFunction("sports-tennis", { action: "results", season: String(season) }),
};

// === MotoGP API (Official API / scraping) ===
export const motogpApi = {
  getCalendar: (season: number) =>
    callEdgeFunction("sports-motogp", { action: "calendar", season: String(season) }),
  getNextEvent: () =>
    callEdgeFunction("sports-motogp", { action: "next-event", season: String(new Date().getFullYear()) }),
  getStandings: (season: number) =>
    callEdgeFunction("sports-motogp", { action: "standings", season: String(season) }),
};
