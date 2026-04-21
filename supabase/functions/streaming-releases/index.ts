// Edge function: streaming-releases
// Restituisce le nuove uscite per provider streaming (Netflix, Prime Video,
// Disney+, HBO Max) usando TMDB API (region IT).
//
// Actions:
//  - new-today: lista uscite tra dateFrom..dateTo (default oggi..oggi+7)
//  - credits:   cast top 10 di un singolo titolo (param type, id)
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

// TMDB watch_provider IDs (region IT)
const PROVIDERS: Record<string, { id: number; label: string; homepage: string }> = {
  netflix: { id: 8, label: "Netflix", homepage: "https://www.netflix.com" },
  prime: { id: 119, label: "Amazon Prime Video", homepage: "https://www.primevideo.com" },
  disney: { id: 337, label: "Disney+", homepage: "https://www.disneyplus.com" },
  hbo: { id: 1899, label: "HBO Max", homepage: "https://www.max.com" },
};

const PROVIDER_KEY_RE = /^(netflix|prime|disney|hbo)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const KIND_RE = /^(movie|tv)$/;
const ID_RE = /^\d{1,9}$/;

type CacheEntry = { at: number; payload: unknown };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;
const CREDITS_TTL_MS = 24 * 60 * 60 * 1000;

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

function normalizeItem(raw: any, kind: "movie" | "tv") {
  const title = kind === "movie" ? raw.title : raw.name;
  const releaseDate = kind === "movie" ? raw.release_date : raw.first_air_date;
  return {
    tmdbId: raw.id,
    type: kind,
    title,
    releaseDate,
    poster: raw.poster_path ? `${TMDB_IMG}${raw.poster_path}` : null,
    overview: raw.overview ?? "",
    voteAverage: typeof raw.vote_average === "number" ? raw.vote_average : null,
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
    const [movies, tv] = await Promise.all([
      tmdbDiscover("movie", providerCfg.id, dateFrom, dateTo, apiKey).catch(() => []),
      tmdbDiscover("tv", providerCfg.id, dateFrom, dateTo, apiKey).catch(() => []),
    ]);

    const items = [
      ...movies.map((m) => normalizeItem(m, "movie")),
      ...tv.map((t) => normalizeItem(t, "tv")),
    ].sort((a, b) => {
      // ordina prima per data crescente, poi per voto decrescente
      const dateCmp = (a.releaseDate ?? "").localeCompare(b.releaseDate ?? "");
      if (dateCmp !== 0) return dateCmp;
      return (b.voteAverage ?? 0) - (a.voteAverage ?? 0);
    });

    const payload = {
      provider,
      providerLabel: providerCfg.label,
      providerHomepage: providerCfg.homepage,
      date: dateFrom,
      dateFrom,
      dateTo,
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
