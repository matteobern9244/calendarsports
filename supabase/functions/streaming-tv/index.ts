// Edge function: streaming-tv
// Restituisce il palinsesto prime time (19:00-24:00 Europe/Rome) di oggi
// per famiglia di canali (sky-sport, sky-cinema, rai, mediaset, discovery).
//
// FRAGILITA' DICHIARATA: scraping diretto delle pagine pubbliche di
// www.staseraintv.com (struttura HTML soggetta a cambio senza preavviso).
// Pattern verificato 2026-04-19: ogni pagina canale contiene un blocco
// con righe `HH:MM - Titolo<br>` complete del palinsesto giornaliero.
// Mai dati inventati: se lo scraping fallisce o un canale non e' coperto
// dalla fonte (es. Sky Sport non e' presente su staseraintv.com),
// `programs=[]` e la UI dichiara stato "non disponibile".

import {
  buildCorsHeaders,
  checkRateLimit,
  rateLimitResponse,
} from "../_shared/security.ts";

type Channel = {
  id: string;
  name: string;
  logo: string | null;
  number?: number;
  // Slug staseraintv.com per scraping (es. "rai1", "canale5", "sky_uno").
  // Se undefined il canale non ha fonte e ritorna programs=[].
  staseraSlug?: string;
};

type Program = {
  start: string; // ISO
  end: string;   // ISO
  title: string;
  genre?: string;
  description?: string;
};

type FamilyId = "sky-sport" | "sky-cinema" | "rai" | "mediaset" | "discovery";

const FAMILY_RE = /^(sky-sport|sky-cinema|rai|mediaset|discovery)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Slug verificati 2026-04-19 via curl su staseraintv.com.
// Sky Sport NON e' coperto dalla fonte: tutti gli slug `sky_sport_*` ritornano
// 404. Lasciamo i canali nella whitelist senza staseraSlug -> programs=[],
// la UI dichiara onestamente "Palinsesto non disponibile".
const FAMILIES: Record<FamilyId, { label: string; channels: Channel[] }> = {
  "sky-sport": {
    label: "Sky Sport (Now TV)",
    channels: [
      { id: "sky-sport-uno", name: "Sky Sport Uno", logo: null, number: 201 },
      { id: "sky-sport-calcio", name: "Sky Sport Calcio", logo: null, number: 202 },
      { id: "sky-sport-tennis", name: "Sky Sport Tennis", logo: null, number: 203 },
      { id: "sky-sport-f1", name: "Sky Sport F1", logo: null, number: 207 },
      { id: "sky-sport-motogp", name: "Sky Sport MotoGP", logo: null, number: 208 },
      { id: "sky-sport-arena", name: "Sky Sport Arena", logo: null, number: 204 },
      { id: "sky-sport-football", name: "Sky Sport Football", logo: null, number: 205 },
      { id: "sky-sport-action", name: "Sky Sport Action", logo: null, number: 206 },
      { id: "sky-sport-golf", name: "Sky Sport Golf", logo: null, number: 209 },
      { id: "sky-sport-max", name: "Sky Sport Max", logo: null, number: 256 },
      { id: "sky-sport-24", name: "Sky Sport 24", logo: null, number: 200 },
    ],
  },
  "sky-cinema": {
    label: "Sky Cinema (Now TV)",
    channels: [
      { id: "sky-cinema-uno", name: "Sky Cinema Uno", logo: null, number: 301, staseraSlug: "sky_cinema1" },
      { id: "sky-cinema-collection", name: "Sky Cinema Collection", logo: null, number: 303, staseraSlug: "sky_cinema_collection" },
      { id: "sky-cinema-family", name: "Sky Cinema Family", logo: null, number: 304, staseraSlug: "sky_cinema_family" },
      { id: "sky-cinema-action", name: "Sky Cinema Action", logo: null, number: 305, staseraSlug: "sky_cinema_action" },
      { id: "sky-cinema-romance", name: "Sky Cinema Romance", logo: null, number: 307, staseraSlug: "sky_cinema_romance" },
      // Non coperti dalla fonte:
      { id: "sky-cinema-due", name: "Sky Cinema Due", logo: null, number: 302 },
      { id: "sky-cinema-suspense", name: "Sky Cinema Suspense", logo: null, number: 306 },
      { id: "sky-cinema-drama", name: "Sky Cinema Drama", logo: null, number: 308 },
      { id: "sky-cinema-comedy", name: "Sky Cinema Comedy", logo: null, number: 309 },
    ],
  },
  rai: {
    label: "RAI",
    channels: [
      { id: "rai-1", name: "Rai 1", logo: null, number: 1, staseraSlug: "rai1" },
      { id: "rai-2", name: "Rai 2", logo: null, number: 2, staseraSlug: "rai2" },
      { id: "rai-3", name: "Rai 3", logo: null, number: 3, staseraSlug: "rai3" },
      { id: "rai-4", name: "Rai 4", logo: null, number: 21, staseraSlug: "rai4" },
      { id: "rai-5", name: "Rai 5", logo: null, number: 23, staseraSlug: "rai5" },
      { id: "rai-movie", name: "Rai Movie", logo: null, number: 24, staseraSlug: "raimovie" },
      { id: "rai-premium", name: "Rai Premium", logo: null, number: 25, staseraSlug: "rai_premium" },
      { id: "rai-gulp", name: "Rai Gulp", logo: null, number: 42, staseraSlug: "rai_gulp" },
      { id: "rai-yoyo", name: "Rai Yoyo", logo: null, number: 43, staseraSlug: "rai_yoyo" },
      { id: "rai-storia", name: "Rai Storia", logo: null, number: 54, staseraSlug: "rai_storia" },
      { id: "rai-scuola", name: "Rai Scuola", logo: null, number: 57, staseraSlug: "rai_scuola" },
      { id: "rai-sport", name: "Rai Sport +HD", logo: null, number: 58, staseraSlug: "rai_sport_hd" },
    ],
  },
  mediaset: {
    label: "Mediaset",
    channels: [
      { id: "canale-5", name: "Canale 5", logo: null, number: 5, staseraSlug: "canale5" },
      { id: "italia-1", name: "Italia 1", logo: null, number: 6, staseraSlug: "italia1" },
      { id: "rete-4", name: "Rete 4", logo: null, number: 4, staseraSlug: "rete4" },
      { id: "iris", name: "Iris", logo: null, number: 22, staseraSlug: "iris" },
      { id: "20", name: "20 Mediaset", logo: null, number: 20, staseraSlug: "canale20mediaset" },
      { id: "la5", name: "La5", logo: null, number: 30, staseraSlug: "la5" },
      { id: "cine34", name: "Cine34", logo: null, number: 34, staseraSlug: "cine34" },
      { id: "italia-2", name: "Italia 2", logo: null, number: 66, staseraSlug: "italia2" },
      { id: "boing", name: "Boing", logo: null, number: 40, staseraSlug: "boing" },
      { id: "cartoonito", name: "Cartoonito", logo: null, number: 46, staseraSlug: "cartoonito" },
      { id: "top-crime", name: "Top Crime", logo: null, number: 39, staseraSlug: "topcrime" },
      { id: "focus", name: "Focus", logo: null, number: 35, staseraSlug: "focustv" },
      { id: "mediaset-extra", name: "Mediaset Extra", logo: null, number: 55, staseraSlug: "mediaset_extra" },
    ],
  },
  discovery: {
    label: "Discovery (Real Time + DMax + Nove)",
    channels: [
      { id: "real-time", name: "Real Time", logo: null, number: 31, staseraSlug: "realtime" },
      { id: "dmax", name: "DMax", logo: null, number: 52, staseraSlug: "dmax" },
      { id: "nove", name: "Nove", logo: null, number: 9, staseraSlug: "nove" },
      { id: "discovery-channel", name: "Discovery Channel", logo: null, number: 401, staseraSlug: "discovery_channel" },
      { id: "discovery-turbo", name: "Discovery Turbo", logo: null, number: 402, staseraSlug: "discovery_turbo" },
      { id: "food-network", name: "Food Network", logo: null, number: 33, staseraSlug: "food_network" },
      { id: "hgtv", name: "HGTV", logo: null, number: 56, staseraSlug: "hgtv" },
      { id: "giallo", name: "Giallo", logo: null, number: 38, staseraSlug: "giallotv" },
      { id: "k2", name: "K2", logo: null, number: 41, staseraSlug: "k2" },
      { id: "frisbee", name: "Frisbee", logo: null, number: 44, staseraSlug: "frisbee" },
    ],
  },
};

function todayRomeISO(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function isPrimeTime(iso: string): boolean {
  const fmt = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [hh] = fmt.format(new Date(iso)).split(":");
  const h = parseInt(hh, 10);
  return h >= 19 && h < 24;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, "&");
}

// Costruisce ISO timestamp partendo da YYYY-MM-DD + HH:MM (Europe/Rome).
// Europe/Rome ha DST: usiamo l'offset corrente del giorno.
function buildRomeIso(date: string, hh: number, mm: number): string {
  const probe = new Date(`${date}T12:00:00Z`);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    timeZoneName: "shortOffset",
  });
  const parts = fmt.formatToParts(probe);
  const off = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const m = off.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const sign = m && m[1] === "-" ? -1 : 1;
  const offH = m ? parseInt(m[2], 10) : 1;
  const offM = m && m[3] ? parseInt(m[3], 10) : 0;
  const offMin = sign * (offH * 60 + offM);
  const utcMs = Date.UTC(
    parseInt(date.slice(0, 4), 10),
    parseInt(date.slice(5, 7), 10) - 1,
    parseInt(date.slice(8, 10), 10),
    hh,
    mm,
    0,
  ) - offMin * 60 * 1000;
  return new Date(utcMs).toISOString();
}

// Estrae i programmi dalla pagina staseraintv.com di un canale.
// Pattern verificato 2026-04-19: il blocco palinsesto giornaliero contiene
// righe formato `HH:MM - Titolo<br>` (separate da newline o tag <br>).
// Esempio:
//   06:00 - RaiNews24<br>07:00 - TG 1<br>21:30 - Roberta Valente...<br>
//
// Limite della fonte: nelle righe HH:MM il titolo e' spesso troncato in
// MAIUSCOLO (es. "RACCONTO DI UNA NOTTE"). La forma estesa
// (es. "Racconto di una notte - Stagione 1 Episodio 4 (Fiction)") compare
// invece nei blocchi "scheda" della stessa pagina, in case-mista.
// Estraiamo entrambi e arricchiamo per match di prefisso uppercase.
function extractRichTitles(html: string): string[] {
  const rich: string[] = [];
  // Pattern 1: testo libero seguito da link a /scheda/.../<slug>.html.
  // Esempio: "Racconto di una notte - Stagione 1 Episodio 4 (Fiction)"
  // appare come testo prima di <a href="/scheda/...">.
  const re1 = /([A-ZÀ-Ý][^\n<>]{4,200}?)(?=\s*<a\s+href="\/scheda\/)/g;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(html)) !== null) {
    const t = decodeEntities(m[1].replace(/\s+/g, " ").trim());
    if (t && t.length >= 5) rich.push(t);
  }
  // Pattern 2: title="..." negli <img> delle schede (fallback).
  const re2 = /title="([^"]{5,200})"\s*src="\/scheda\//g;
  while ((m = re2.exec(html)) !== null) {
    const t = decodeEntities(m[1].replace(/\s+/g, " ").trim());
    if (t) rich.push(t);
  }
  return rich;
}

function enrichTitle(rawUpper: string, rich: string[]): { title: string; genre?: string } {
  if (!rawUpper) return { title: rawUpper };
  const norm = rawUpper.toUpperCase().replace(/\s+/g, " ").trim();
  // Cerca un titolo "ricco" che inizi con lo stesso prefisso (case-insensitive).
  // Preferisci il match piu' lungo.
  let best = "";
  for (const cand of rich) {
    const candUpper = cand.toUpperCase();
    if (candUpper.startsWith(norm) || norm.startsWith(candUpper.split(" - ")[0].toUpperCase())) {
      if (cand.length > best.length) best = cand;
    }
  }
  const source = best || rawUpper
    .toLowerCase()
    .replace(/(^|[\s\-:'"(])(\p{L})/gu, (_, p, c) => p + c.toUpperCase());

  // Estrai genere fra parentesi a fine titolo: "... (Fiction)" / "(Film)" / "(Sport)".
  // Whitelist generi noti per evitare di confondere parentesi descrittive
  // (es. "(Replica)", "(2023)").
  const GENRE_WHITELIST = new Set([
    "Fiction", "Film", "Serie Tv", "Serie Tv Drammatica",
    "Sport", "Calcio", "Tennis", "Motori", "Formula 1", "Motogp",
    "Documentario", "Reality", "Talk Show", "Show", "Varieta'", "Varieta",
    "Intrattenimento", "Cartoni", "Cartoni Animati", "Animazione",
    "News", "Telegiornale", "Attualita'", "Attualita",
    "Cucina", "Lifestyle", "Musica", "Quiz", "Cinema",
    "Commedia", "Azione", "Thriller", "Avventura", "Horror", "Romantico",
    "Drammatico", "Biografico", "Storico", "Western", "Fantascienza",
  ]);
  let title = source;
  let genre: string | undefined;
  const genreMatch = title.match(/\s*\(([^()]{2,40})\)\s*$/);
  if (genreMatch) {
    const candidate = genreMatch[1].trim();
    const candidateNorm = candidate
      .toLowerCase()
      .replace(/(^|\s)(\p{L})/gu, (_, p, c) => p + c.toUpperCase());
    if (GENRE_WHITELIST.has(candidateNorm)) {
      genre = candidateNorm;
      title = title.slice(0, genreMatch.index).trim();
    }
  }
  return { title, genre };
}

function parseStaseraintvHtml(html: string, date: string): Program[] {
  const richTitles = extractRichTitles(html);
  // Estrai tutti i match HH:MM - Title fino al prossimo <br> o newline.
  const re = /(\d{1,2}):(\d{2})\s*-\s*([^<\r\n]+?)(?=<br|\r|\n|<\/h|<\/d|$)/g;
  const programs: Program[] = [];
  let m: RegExpExecArray | null;
  let prevStartMs = -1;
  let dayShift = 0;
  const seen = new Set<string>();

  while ((m = re.exec(html)) !== null) {
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (hh > 27 || mm > 59) continue;

    let titleRaw = m[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    titleRaw = decodeEntities(titleRaw);
    if (!titleRaw || titleRaw.length < 2) continue;
    if (/^(continua|stagione|episodio)$/i.test(titleRaw)) continue;

    const baseDate = new Date(`${date}T00:00:00Z`);
    if (dayShift > 0) baseDate.setUTCDate(baseDate.getUTCDate() + dayShift);
    let dateForRow = baseDate.toISOString().slice(0, 10);
    let startIso = buildRomeIso(dateForRow, hh, mm);
    let startMs = new Date(startIso).getTime();
    if (prevStartMs > 0 && startMs < prevStartMs - 30 * 60 * 1000) {
      dayShift += 1;
      const shifted = new Date(`${date}T00:00:00Z`);
      shifted.setUTCDate(shifted.getUTCDate() + dayShift);
      dateForRow = shifted.toISOString().slice(0, 10);
      startIso = buildRomeIso(dateForRow, hh, mm);
      startMs = new Date(startIso).getTime();
    }
    prevStartMs = startMs;

    const { title: titleEnriched, genre } = enrichTitle(titleRaw, richTitles);

    const key = `${startIso}|${titleEnriched.slice(0, 50)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    programs.push({
      start: startIso,
      end: startIso,
      title: titleEnriched,
      ...(genre ? { genre } : {}),
    });
  }

  programs.sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 0; i < programs.length - 1; i += 1) {
    programs[i].end = programs[i + 1].start;
  }
  if (programs.length > 0) {
    const last = programs[programs.length - 1];
    last.end = new Date(new Date(last.start).getTime() + 30 * 60 * 1000)
      .toISOString();
  }
  return programs;
}

// Cache 1h per (slug, date)
type CacheEntry = { at: number; programs: Program[] };
const fetchCache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 60 * 1000;

async function fetchStasera(slug: string, date: string): Promise<Program[]> {
  const cacheKey = `${slug}:${date}`;
  const cached = fetchCache.get(cacheKey);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.programs;

  // staseraintv.com ha solo 3 endpoint temporali per canale:
  //   ieri, oggi (programmi_stasera_), domani (programmi_domani_).
  // Per data arbitraria fuori da questa finestra ritorniamo [].
  const today = todayRomeISO();
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);
  const yesterday = new Date(`${today}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayIso = yesterday.toISOString().slice(0, 10);

  let prefix = "programmi_stasera_";
  if (date === tomorrowIso) prefix = "programmi_domani_";
  else if (date === yesterdayIso) prefix = "programmi_ieri_";
  else if (date !== today) {
    // fuori finestra
    fetchCache.set(cacheKey, { at: Date.now(), programs: [] });
    return [];
  }

  const url = `https://www.staseraintv.com/${prefix}${slug}.html`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CalendarSports/1.0; +https://calendarsports.lovable.app)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "it-IT,it;q=0.9",
      },
    });
    if (!res.ok) {
      console.warn("[streaming-tv] staseraintv non-OK", res.status, slug);
      fetchCache.set(cacheKey, { at: Date.now(), programs: [] });
      return [];
    }
    const html = await res.text();
    const programs = parseStaseraintvHtml(html, date);
    fetchCache.set(cacheKey, { at: Date.now(), programs });
    return programs;
  } catch (err) {
    console.warn("[streaming-tv] staseraintv fetch error", slug, err);
    return [];
  }
}

async function fetchProgramsForChannel(
  channel: Channel,
  date: string,
): Promise<Program[]> {
  if (!channel.staseraSlug) return [];
  return await fetchStasera(channel.staseraSlug, date);
}

// Limita la concorrenza per non hammerare staseraintv.com.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, { key: "streaming-tv" });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "prime-time";
    const family = url.searchParams.get("family") ?? "";
    const dateParam = url.searchParams.get("date") ?? "";

    if (action !== "prime-time") {
      return new Response(
        JSON.stringify({ success: false, error: "Azione non supportata" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!FAMILY_RE.test(family)) {
      return new Response(
        JSON.stringify({ success: false, error: "Famiglia canali non valida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const date = DATE_RE.test(dateParam) ? dateParam : todayRomeISO();
    const familyCfg = FAMILIES[family as FamilyId];

    const channels = await mapWithConcurrency(familyCfg.channels, 5, async (ch) => {
      const programs = await fetchProgramsForChannel(ch, date)
        .then((list) => list.filter((p) => isPrimeTime(p.start)))
        .catch(() => [] as Program[]);
      return {
        id: ch.id,
        name: ch.name,
        logo: ch.logo,
        number: ch.number,
        programs,
      };
    });

    const payload = {
      family,
      familyLabel: familyCfg.label,
      date,
      channels,
      programsAvailable: channels.some((c) => c.programs.length > 0),
    };

    return new Response(
      JSON.stringify({ success: true, data: payload }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[streaming-tv]", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
