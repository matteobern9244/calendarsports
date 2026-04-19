// Edge function: streaming-releases
// Restituisce le nuove uscite del giorno per provider streaming (Netflix,
// Prime Video, Disney+, HBO Max) usando TMDB API (region IT).
//
// Fonte: TMDB /discover/movie + /discover/tv con filtro
// `with_watch_providers` + `watch_region=IT` + data corrente Europe/Rome.
// Richiede secret `TMDB_API_KEY`. Senza chiave, la funzione risponde
// success=true con `data.items=[]` e `configured=false` cosi' il
// frontend puo' mostrare uno stato vuoto informativo.
//
// FRAGILITA': dipende da disponibilita' TMDB e correttezza dei
// `watch_provider` IDs lato TMDB. I dati possono essere parziali.

import {
  buildCorsHeaders,
  checkRateLimit,
  rateLimitResponse,
} from "../_shared/security.ts";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

// TMDB watch_provider IDs (region IT)
const PROVIDERS: Record<string, { id: number; label: string }> = {
  netflix: { id: 8, label: "Netflix" },
  prime: { id: 119, label: "Amazon Prime Video" },
  disney: { id: 337, label: "Disney+" },
  hbo: { id: 1899, label: "HBO Max" },
};

const PROVIDER_KEY_RE = /^(netflix|prime|disney|hbo)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Cache in-memory per provider (1h)
type CacheEntry = { at: number; payload: unknown };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function todayRomeISO(): string {
  // YYYY-MM-DD nella timezone Europe/Rome
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

async function tmdbDiscover(
  kind: "movie" | "tv",
  providerId: number,
  date: string,
  apiKey: string,
): Promise<any[]> {
  const dateKey = kind === "movie" ? "primary_release_date" : "first_air_date";
  const url = new URL(`${TMDB_BASE}/discover/${kind}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "it-IT");
  url.searchParams.set("watch_region", "IT");
  url.searchParams.set("with_watch_providers", String(providerId));
  url.searchParams.set(`${dateKey}.gte`, date);
  url.searchParams.set(`${dateKey}.lte`, date);
  url.searchParams.set("sort_by", "popularity.desc");
  url.searchParams.set("include_adult", "false");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB ${kind} ${res.status}`);
  }
  const json = await res.json();
  return Array.isArray(json.results) ? json.results : [];
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
    const provider = url.searchParams.get("provider") ?? "";
    const dateParam = url.searchParams.get("date") ?? "";

    if (action !== "new-today") {
      return new Response(
        JSON.stringify({ success: false, error: "Azione non supportata" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!PROVIDER_KEY_RE.test(provider)) {
      return new Response(
        JSON.stringify({ success: false, error: "Provider non valido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const date = DATE_RE.test(dateParam) ? dateParam : todayRomeISO();

    const apiKey = Deno.env.get("TMDB_API_KEY") ?? "";
    if (!apiKey) {
      // Risposta strutturata: il frontend mostra EmptyState informativo.
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            provider,
            providerLabel: PROVIDERS[provider].label,
            date,
            items: [],
            configured: false,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cacheKey = `${provider}:${date}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return new Response(
        JSON.stringify({ success: true, data: cached.payload }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const providerCfg = PROVIDERS[provider];
    const [movies, tv] = await Promise.all([
      tmdbDiscover("movie", providerCfg.id, date, apiKey).catch(() => []),
      tmdbDiscover("tv", providerCfg.id, date, apiKey).catch(() => []),
    ]);

    const items = [
      ...movies.map((m) => normalizeItem(m, "movie")),
      ...tv.map((t) => normalizeItem(t, "tv")),
    ].sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0));

    const payload = {
      provider,
      providerLabel: providerCfg.label,
      date,
      items,
      configured: true,
    };
    cache.set(cacheKey, { at: Date.now(), payload });

    return new Response(
      JSON.stringify({ success: true, data: payload }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[streaming-releases]", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
