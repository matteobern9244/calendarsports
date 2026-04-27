// Edge function: streaming-releases
// Restituisce le nuove uscite per i provider streaming attivi in Italia
// (Netflix, Prime Video, Disney+, HBO Max) usando TMDB API (region IT).
//
// Actions:
//  - new-today: lista uscite per provider tra dateFrom..dateTo, validate
//               1-a-1 con /watch/providers IT (taglio rigoroso storico).
//  - new-italy: catalogo aggregato Italia tra dateFrom..dateTo, generi e
//               loghi provider IT inclusi per ogni titolo. Supporta filtri
//               provider, kind, genreId, sort.
//  - details:   payload one-shot per il dialog (overview, generi, runtime,
//               regista/creators, providers IT + JustWatch link, trailer
//               YouTube, cast top 10).
//  - credits:   legacy, cast top 10 di un singolo titolo (param type, id).
//
// Richiede secret `TMDB_API_KEY`. Senza chiave, la lista risponde con
// `data.items=[]` e `configured=false` cosi' il frontend mostra uno
// stato vuoto informativo.

import {
  buildCorsHeaders,
  checkRateLimit,
  rateLimitResponse,
} from "../_shared/security.ts";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w342";
const TMDB_PROFILE_IMG = "https://image.tmdb.org/t/p/w185";
const TMDB_PROVIDER_LOGO = "https://image.tmdb.org/t/p/w92";

// TMDB watch_provider IDs (region IT)
const PROVIDERS: Record<string, { id: number; label: string; homepage: string }> = {
  netflix: { id: 8, label: "Netflix", homepage: "https://www.netflix.com" },
  prime: { id: 119, label: "Amazon Prime Video", homepage: "https://www.primevideo.com" },
  disney: { id: 337, label: "Disney+", homepage: "https://www.disneyplus.com" },
  hbo: { id: 1899, label: "HBO Max", homepage: "https://www.max.com" },
};

// Mappa inversa: TMDB provider_id -> chiave interna (per riconoscere i
// provider "principali" quando arricchiamo i titoli con /watch/providers).
const TMDB_PROVIDER_ID_TO_KEY: Record<number, string> = Object.fromEntries(
  Object.entries(PROVIDERS).map(([key, cfg]) => [cfg.id, key]),
);

const PROVIDER_KEY_RE = /^(netflix|prime|disney|hbo)$/;
const PROVIDER_FILTER_RE = /^(netflix|prime|disney|hbo|all)$/;
const KIND_FILTER_RE = /^(movie|tv|all)$/;
const SORT_RE = /^(release|popularity)$/;
const GENRE_RE = /^\d{1,6}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const KIND_RE = /^(movie|tv)$/;
const ID_RE = /^\d{1,9}$/;

type CacheEntry = { at: number; payload: unknown };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;
const CREDITS_TTL_MS = 24 * 60 * 60 * 1000;
const DETAILS_TTL_MS = 24 * 60 * 60 * 1000;
const ITEM_PROVIDERS_TTL_MS = 60 * 60 * 1000;
const GENRE_MAP_TTL_MS = 24 * 60 * 60 * 1000;

// Cache dedicate per arricchimenti per-item (riusati su molte query)
type ItemProvidersInfo = {
  flatrate: Array<{ provider_id: number; provider_name: string; logo_path: string | null }>;
  free: Array<{ provider_id: number; provider_name: string; logo_path: string | null }>;
  ads: Array<{ provider_id: number; provider_name: string; logo_path: string | null }>;
  link: string | null;
};
const itemProvidersCache = new Map<string, { at: number; payload: ItemProvidersInfo }>();

type GenreMap = Record<number, string>;
const genreMapCache: { movie?: { at: number; map: GenreMap }; tv?: { at: number; map: GenreMap } } = {};

// Quando la finestra richiesta non produce risultati, ampliamo automaticamente
// la ricerca di N giorni indietro e M giorni in avanti, mantenendo provider e
// regione invariati. TMDB indicizza i titoli streaming per primary_release_date
// (film) / first_air_date (serie), non per data di ingresso sulla piattaforma:
// finestre strette (1-7 giorni) restituiscono spesso 0 risultati anche se il
// catalogo del provider e' attivo.
const WIDEN_BACK_DAYS = 14;
const WIDEN_FWD_DAYS = 30;

function todayRomeISO(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function addDaysISO(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function tmdbDiscover(
  kind: "movie" | "tv",
  providerId: number,
  dateFrom: string,
  dateTo: string,
  apiKey: string,
): Promise<any[]> {
  const dateKey = kind === "movie" ? "primary_release_date" : "first_air_date";
  const url = new URL(`${TMDB_BASE}/discover/${kind}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "it-IT");
  url.searchParams.set("watch_region", "IT");
  url.searchParams.set("with_watch_providers", String(providerId));
  // Filtra solo titoli inclusi nell'abbonamento del provider in IT
  // (esclude buy/rent/ads). TMDB Discover senza questo parametro restituisce
  // anche titoli disponibili solo in noleggio/acquisto sullo stesso provider.
  url.searchParams.set("with_watch_monetization_types", "flatrate");
  url.searchParams.set(`${dateKey}.gte`, dateFrom);
  url.searchParams.set(`${dateKey}.lte`, dateTo);
  url.searchParams.set("sort_by", "popularity.desc");
  url.searchParams.set("include_adult", "false");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB ${kind} ${res.status}`);
  }
  const json = await res.json();
  return Array.isArray(json.results) ? json.results : [];
}

async function tmdbCredits(
  kind: "movie" | "tv",
  id: string,
  apiKey: string,
): Promise<any> {
  const url = new URL(`${TMDB_BASE}/${kind}/${id}/credits`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "it-IT");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB credits ${kind} ${res.status}`);
  return await res.json();
}

// Verifica che il titolo sia effettivamente disponibile in abbonamento (flatrate)
// sul provider richiesto in regione IT al momento della query. TMDB Discover
// puo' restituire match basati su finestre storiche: questa chiamata conferma
// la disponibilita' corrente. Ritorna anche il deep link JustWatch (results.IT.link)
// se presente, da usare come destinazione "Vai a {provider}" sul titolo specifico.
async function tmdbItemProviderInfoIT(
  kind: "movie" | "tv",
  id: number,
  providerId: number,
  apiKey: string,
): Promise<{ available: boolean; deepLink: string | null }> {
  try {
    const info = await tmdbItemProvidersFullIT(kind, id, apiKey);
    const available = info.flatrate.some((p) => p.provider_id === providerId);
    const deepLink = available && info.link ? info.link : null;
    return { available, deepLink };
  } catch (_err) {
    return { available: false, deepLink: null };
  }
}

/**
 * Recupera l'intero blocco /watch/providers IT per un titolo, con cache di
 * 1h. Restituisce flatrate/free/ads + link JustWatch generale del titolo.
 * Usato sia dalla validazione legacy che dall'arricchimento di new-italy
 * e details.
 */
async function tmdbItemProvidersFullIT(
  kind: "movie" | "tv",
  id: number,
  apiKey: string,
): Promise<ItemProvidersInfo> {
  const cacheKey = `${kind}:${id}`;
  const cached = itemProvidersCache.get(cacheKey);
  if (cached && Date.now() - cached.at < ITEM_PROVIDERS_TTL_MS) {
    return cached.payload;
  }
  const empty: ItemProvidersInfo = { flatrate: [], free: [], ads: [], link: null };
  try {
    const url = new URL(`${TMDB_BASE}/${kind}/${id}/watch/providers`);
    url.searchParams.set("api_key", apiKey);
    const res = await fetch(url.toString());
    if (!res.ok) {
      itemProvidersCache.set(cacheKey, { at: Date.now(), payload: empty });
      return empty;
    }
    const json = await res.json();
    const itResults = json?.results?.IT;
    const map = (arr: unknown): ItemProvidersInfo["flatrate"] =>
      Array.isArray(arr)
        ? arr.map((p: any) => ({
            provider_id: p?.provider_id,
            provider_name: p?.provider_name ?? "",
            logo_path: typeof p?.logo_path === "string" ? p.logo_path : null,
          }))
        : [];
    const payload: ItemProvidersInfo = {
      flatrate: map(itResults?.flatrate),
      free: map(itResults?.free),
      ads: map(itResults?.ads),
      link: typeof itResults?.link === "string" && itResults.link.length > 0 ? itResults.link : null,
    };
    itemProvidersCache.set(cacheKey, { at: Date.now(), payload });
    return payload;
  } catch (_err) {
    itemProvidersCache.set(cacheKey, { at: Date.now(), payload: empty });
    return empty;
  }
}

/**
 * Genera la mappa { genreId -> labelItaliana } per movie / tv da TMDB.
 * Cache 24h. Se TMDB non risponde restituiamo una mappa vuota: il titolo
 * mostrerà solo i generi che riusciamo a derivare (nessuno, in quel caso),
 * quindi la riga generi viene semplicemente omessa lato UI.
 */
async function tmdbGenreMap(kind: "movie" | "tv", apiKey: string): Promise<GenreMap> {
  const cached = genreMapCache[kind];
  if (cached && Date.now() - cached.at < GENRE_MAP_TTL_MS) return cached.map;
  try {
    const url = new URL(`${TMDB_BASE}/genre/${kind}/list`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("language", "it-IT");
    const res = await fetch(url.toString());
    if (!res.ok) return {};
    const json = await res.json();
    const map: GenreMap = {};
    if (Array.isArray(json?.genres)) {
      for (const g of json.genres) {
        if (typeof g?.id === "number" && typeof g?.name === "string") {
          map[g.id] = g.name;
        }
      }
    }
    genreMapCache[kind] = { at: Date.now(), map };
    return map;
  } catch (_err) {
    return {};
  }
}

/** Estrae l'anno YYYY da una stringa data ISO (YYYY-MM-DD). */
function yearFromDate(date: string | null | undefined): number | null {
  if (!date || typeof date !== "string") return null;
  const m = date.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

/** Mappa i provider IT (flatrate prioritari) verso il payload compatto UI. */
function compactProviders(info: ItemProvidersInfo) {
  const seen = new Set<number>();
  const out: Array<{ id: number; key: string | null; name: string; logo: string | null; type: "flatrate" | "free" | "ads" }> = [];
  const push = (type: "flatrate" | "free" | "ads", arr: ItemProvidersInfo["flatrate"]) => {
    for (const p of arr) {
      if (!p?.provider_id || seen.has(p.provider_id)) continue;
      seen.add(p.provider_id);
      out.push({
        id: p.provider_id,
        key: TMDB_PROVIDER_ID_TO_KEY[p.provider_id] ?? null,
        name: p.provider_name,
        logo: p.logo_path ? `${TMDB_PROVIDER_LOGO}${p.logo_path}` : null,
        type,
      });
    }
  };
  push("flatrate", info.flatrate);
  push("free", info.free);
  push("ads", info.ads);
  return out;
}

function normalizeItem(raw: any, kind: "movie" | "tv", deepLink: string | null = null) {
  const title = kind === "movie" ? raw.title : raw.name;
  const releaseDate = kind === "movie" ? raw.release_date : raw.first_air_date;
  // Difesa: TMDB_IMG punta gia' a w342, ma se in futuro la base venisse cambiata
  // o arrivasse un percorso piu' grande (w500/original), normalizziamo a w342
  // che e' sufficiente per le card (~150-200px) e il dialog (~180px), anche su retina.
  const rawPoster = raw.poster_path ? `${TMDB_IMG}${raw.poster_path}` : null;
  const poster = rawPoster
    ? rawPoster.replace(/\/t\/p\/(?:w500|w780|original)\//, "/t/p/w342/")
    : null;
  return {
    tmdbId: raw.id,
    type: kind,
    title,
    releaseDate,
    poster,
    overview: raw.overview ?? "",
    voteAverage: typeof raw.vote_average === "number" ? raw.vote_average : null,
    deepLink,
    year: yearFromDate(releaseDate),
    genreIds: Array.isArray(raw.genre_ids) ? raw.genre_ids : [],
    genres: [] as string[],
    availableProviders: [] as ReturnType<typeof compactProviders>,
    justWatchLink: deepLink,
    popularity: typeof raw.popularity === "number" ? raw.popularity : 0,
  };
}

function normalizeCast(raw: any) {
  const cast = Array.isArray(raw?.cast) ? raw.cast.slice(0, 10) : [];
  return cast.map((c: any) => ({
    id: c.id,
    name: c.name,
    character: c.character ?? "",
    profile: c.profile_path ? `${TMDB_PROFILE_IMG}${c.profile_path}` : null,
  }));
}

function jsonResponse(body: unknown, init: ResponseInit, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, { key: "streaming-releases" });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "new-today";

    const apiKey = Deno.env.get("TMDB_API_KEY") ?? "";

    // === ACTION: credits ===
    if (action === "credits") {
      const type = url.searchParams.get("type") ?? "";
      const id = url.searchParams.get("id") ?? "";
      if (!KIND_RE.test(type) || !ID_RE.test(id)) {
        return jsonResponse(
          { success: false, error: "Parametri credits non validi" },
          { status: 400 },
          corsHeaders,
        );
      }
      if (!apiKey) {
        return jsonResponse(
          { success: true, data: { type, id, cast: [], configured: false } },
          {},
          corsHeaders,
        );
      }
      const cacheKey = `credits:${type}:${id}`;
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.at < CREDITS_TTL_MS) {
        return jsonResponse({ success: true, data: cached.payload }, {}, corsHeaders);
      }
      try {
        const raw = await tmdbCredits(type as "movie" | "tv", id, apiKey);
        const payload = {
          type,
          id,
          cast: normalizeCast(raw),
          configured: true,
        };
        cache.set(cacheKey, { at: Date.now(), payload });
        return jsonResponse({ success: true, data: payload }, {}, corsHeaders);
      } catch (err) {
        console.warn("[streaming-releases] credits error", err);
        return jsonResponse(
          { success: true, data: { type, id, cast: [], configured: true } },
          {},
          corsHeaders,
        );
      }
    }

    // === ACTION: new-today (range) ===
    if (action !== "new-today") {
      return jsonResponse(
        { success: false, error: "Azione non supportata" },
        { status: 400 },
        corsHeaders,
      );
    }

    const provider = url.searchParams.get("provider") ?? "";
    if (!PROVIDER_KEY_RE.test(provider)) {
      return jsonResponse(
        { success: false, error: "Provider non valido" },
        { status: 400 },
        corsHeaders,
      );
    }

    const dateFromParam = url.searchParams.get("dateFrom") ?? url.searchParams.get("date") ?? "";
    const dateToParam = url.searchParams.get("dateTo") ?? "";
    const today = todayRomeISO();
    const dateFrom = DATE_RE.test(dateFromParam) ? dateFromParam : today;
    const dateTo = DATE_RE.test(dateToParam) ? dateToParam : dateFrom;

    if (!apiKey) {
      return jsonResponse(
        {
          success: true,
          data: {
            provider,
            providerLabel: PROVIDERS[provider].label,
            providerHomepage: PROVIDERS[provider].homepage,
            date: dateFrom,
            dateFrom,
            dateTo,
            items: [],
            configured: false,
          },
        },
        {},
        corsHeaders,
      );
    }

    const cacheKey = `${provider}:${dateFrom}:${dateTo}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return jsonResponse({ success: true, data: cached.payload }, {}, corsHeaders);
    }

    const providerCfg = PROVIDERS[provider];
    const sortItems = (arr: ReturnType<typeof normalizeItem>[]) =>
      arr.sort((a, b) => {
        // ordina prima per data crescente, poi per voto decrescente
        const dateCmp = (a.releaseDate ?? "").localeCompare(b.releaseDate ?? "");
        if (dateCmp !== 0) return dateCmp;
        return (b.voteAverage ?? 0) - (a.voteAverage ?? 0);
      });

    const fetchWindow = async (from: string, to: string) => {
      const [movies, tv] = await Promise.all([
        tmdbDiscover("movie", providerCfg.id, from, to, apiKey).catch(() => []),
        tmdbDiscover("tv", providerCfg.id, from, to, apiKey).catch(() => []),
      ]);
      const candidates: Array<{ kind: "movie" | "tv"; raw: any }> = [
        ...movies.map((m) => ({ kind: "movie" as const, raw: m })),
        ...tv.map((t) => ({ kind: "tv" as const, raw: t })),
      ];
      // Validazione per-item: tieni solo i titoli effettivamente in
      // abbonamento sul provider richiesto in regione IT, secondo TMDB
      // /watch/providers (results.IT.flatrate include providerId).
      const checks = await Promise.all(
        candidates.map((c) =>
          tmdbItemProviderInfoIT(c.kind, c.raw.id, providerCfg.id, apiKey),
        ),
      );
      const validated = candidates
        .map((c, i) => ({ c, info: checks[i] }))
        .filter(({ info }) => info.available)
        .map(({ c, info }) => normalizeItem(c.raw, c.kind, info.deepLink));
      return sortItems(validated);
    };

    let items = await fetchWindow(dateFrom, dateTo);
    let widenedWindow = false;
    let effectiveFrom = dateFrom;
    let effectiveTo = dateTo;

    // Fallback: se la finestra richiesta e' vuota, ampliamo trasparentemente.
    // Manteniamo provider e regione invariati: rilassiamo solo il range date.
    if (items.length === 0) {
      const widenedFrom = addDaysISO(dateFrom, -WIDEN_BACK_DAYS);
      const widenedTo = addDaysISO(dateTo, WIDEN_FWD_DAYS);
      const widenedItems = await fetchWindow(widenedFrom, widenedTo);
      if (widenedItems.length > 0) {
        items = widenedItems;
        widenedWindow = true;
        effectiveFrom = widenedFrom;
        effectiveTo = widenedTo;
      }
    }

    const payload = {
      provider,
      providerLabel: providerCfg.label,
      providerHomepage: providerCfg.homepage,
      date: dateFrom,
      dateFrom,
      dateTo,
      effectiveFrom,
      effectiveTo,
      widenedWindow,
      items,
      configured: true,
    };
    cache.set(cacheKey, { at: Date.now(), payload });

    return jsonResponse({ success: true, data: payload }, {}, corsHeaders);
  } catch (err) {
    console.error("[streaming-releases]", err);
    return jsonResponse(
      { success: false, error: (err as Error).message },
      { status: 500 },
      corsHeaders,
    );
  }
});
