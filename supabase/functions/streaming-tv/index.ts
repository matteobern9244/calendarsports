// Edge function: streaming-tv
// Restituisce il palinsesto prime time (19:00-24:00 Europe/Rome) di oggi
// per famiglia di canali (sky-sport, sky-cinema, rai, mediaset, discovery).
//
// FRAGILITA' MASSIMA: per Real Time/DMax facciamo scraping diretto delle
// pagine pubbliche di www.guida.tv (struttura HTML soggetta a cambio
// senza preavviso). I feed XMLTV community di iptv-org NON sono
// distribuiti come file statici: vanno generati con un grabber, quindi
// non li possiamo consumare a runtime. Sky/RAI/Mediaset restano stub
// vuoti: i canali sono elencati come navigazione, ma `programsAvailable
// =false` viene dichiarato cosi' la UI mostra uno stato onesto. Mai
// dati inventati: se lo scraping fallisce, programs=[].

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
  // Path guida.tv (es. "82847384/real-time") per scraping Discovery
  guidatvPath?: string;
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
      { id: "sky-cinema-uno", name: "Sky Cinema Uno", logo: null, number: 301 },
      { id: "sky-cinema-due", name: "Sky Cinema Due", logo: null, number: 302 },
      { id: "sky-cinema-collection", name: "Sky Cinema Collection", logo: null, number: 303 },
      { id: "sky-cinema-family", name: "Sky Cinema Family", logo: null, number: 304 },
      { id: "sky-cinema-action", name: "Sky Cinema Action", logo: null, number: 305 },
      { id: "sky-cinema-suspense", name: "Sky Cinema Suspense", logo: null, number: 306 },
      { id: "sky-cinema-romance", name: "Sky Cinema Romance", logo: null, number: 307 },
      { id: "sky-cinema-drama", name: "Sky Cinema Drama", logo: null, number: 308 },
      { id: "sky-cinema-comedy", name: "Sky Cinema Comedy", logo: null, number: 309 },
      { id: "sky-cinema-uno-plus24", name: "Sky Cinema Uno +24", logo: null, number: 310 },
      { id: "sky-cinema-due-plus24", name: "Sky Cinema Due +24", logo: null, number: 311 },
    ],
  },
  rai: {
    label: "RAI",
    channels: [
      { id: "rai-1", name: "Rai 1", logo: null, number: 1 },
      { id: "rai-2", name: "Rai 2", logo: null, number: 2 },
      { id: "rai-3", name: "Rai 3", logo: null, number: 3 },
      { id: "rai-4", name: "Rai 4", logo: null, number: 21 },
      { id: "rai-5", name: "Rai 5", logo: null, number: 23 },
      { id: "rai-movie", name: "Rai Movie", logo: null, number: 24 },
      { id: "rai-premium", name: "Rai Premium", logo: null, number: 25 },
      { id: "rai-gulp", name: "Rai Gulp", logo: null, number: 42 },
      { id: "rai-yoyo", name: "Rai Yoyo", logo: null, number: 43 },
      { id: "rai-storia", name: "Rai Storia", logo: null, number: 54 },
      { id: "rai-scuola", name: "Rai Scuola", logo: null, number: 57 },
      { id: "rai-news24", name: "Rai News 24", logo: null, number: 48 },
      { id: "rai-sport", name: "Rai Sport", logo: null, number: 58 },
      { id: "rai-sport-plus", name: "Rai Sport +", logo: null, number: 58 },
    ],
  },
  mediaset: {
    label: "Mediaset",
    channels: [
      { id: "canale-5", name: "Canale 5", logo: null, number: 5 },
      { id: "italia-1", name: "Italia 1", logo: null, number: 6 },
      { id: "rete-4", name: "Rete 4", logo: null, number: 4 },
      { id: "iris", name: "Iris", logo: null, number: 22 },
      { id: "20", name: "20", logo: null, number: 20 },
      { id: "la5", name: "La5", logo: null, number: 30 },
      { id: "cine34", name: "Cine34", logo: null, number: 34 },
      { id: "tgcom24", name: "TGcom24", logo: null, number: 51 },
      { id: "italia-2", name: "Italia 2", logo: null, number: 66 },
      { id: "boing", name: "Boing", logo: null, number: 40 },
      { id: "cartoonito", name: "Cartoonito", logo: null, number: 46 },
      { id: "top-crime", name: "Top Crime", logo: null, number: 39 },
      { id: "focus", name: "Focus", logo: null, number: 35 },
    ],
  },
  discovery: {
    label: "Discovery (Real Time + DMax)",
    channels: [
      {
        id: "real-time",
        name: "Real Time",
        logo: null,
        number: 31,
        guidatvPath: "82847384/real-time",
      },
      {
        id: "dmax",
        name: "DMax",
        logo: null,
        number: 52,
        guidatvPath: "68776588/dmax-italia",
      },
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
// Europe/Rome ha DST: usiamo l'offset corrente del giorno (CET +0100 / CEST +0200).
function buildRomeIso(date: string, hh: number, mm: number): string {
  // Probe: crea data alle 12:00 UTC del giorno e calcola offset Europe/Rome
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
  // hh:mm Rome -> UTC ms
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

// Estrae i programmi dalla pagina guida.tv di un canale.
// Pattern (verificato 2026-04-19):
//   <tr><td width="110"><h5 class="thin">HH:MM</h5></td>
//   <td><h5 class="thin"><a href="...">TITOLO</a></h5>
//   <h6>... <i>info</i></h6></td></tr>
function parseGuidatvHtml(html: string, date: string): Program[] {
  const programs: Program[] = [];
  const rowRe =
    /<tr>\s*<td[^>]*>\s*<h5[^>]*class="thin"[^>]*>\s*(\d{1,2}):(\d{2})\s*<\/h5>\s*<\/td>\s*<td[^>]*>\s*<h5[^>]*class="thin"[^>]*>([\s\S]*?)<\/h5>([\s\S]*?)<\/td>\s*<\/tr>/g;
  let m: RegExpExecArray | null;
  let prevStartMs = -1;
  let dayShift = 0;
  while ((m = rowRe.exec(html)) !== null) {
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (hh > 27 || mm > 59) continue;
    // Il palinsesto puo' iniziare prima delle 06:00 del giorno successivo
    // (notte). Quando l'orario "torna indietro" rispetto al precedente,
    // shift di +1 giorno.
    const baseDate = new Date(`${date}T00:00:00Z`);
    if (dayShift > 0) baseDate.setUTCDate(baseDate.getUTCDate() + dayShift);
    let dateForRow = baseDate.toISOString().slice(0, 10);
    let startIso = buildRomeIso(dateForRow, hh, mm);
    let startMs = new Date(startIso).getTime();
    if (prevStartMs > 0 && startMs < prevStartMs) {
      dayShift += 1;
      const shifted = new Date(`${date}T00:00:00Z`);
      shifted.setUTCDate(shifted.getUTCDate() + dayShift);
      dateForRow = shifted.toISOString().slice(0, 10);
      startIso = buildRomeIso(dateForRow, hh, mm);
      startMs = new Date(startIso).getTime();
    }
    prevStartMs = startMs;

    const titleHtml = m[3];
    const extraHtml = m[4];
    // estrai testo del link / del h5
    const linkMatch = titleHtml.match(/<a[^>]*>([\s\S]*?)<\/a>/);
    const titleRaw = (linkMatch ? linkMatch[1] : titleHtml)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const title = decodeEntities(titleRaw) || "(senza titolo)";

    // info aggiuntiva dal <h6><i>...</i></h6>
    const infoMatch = extraHtml.match(/<i[^>]*>([\s\S]*?)<\/i>/);
    const info = infoMatch
      ? decodeEntities(
          infoMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        )
      : undefined;

    programs.push({
      start: startIso,
      end: startIso, // chiuso sotto con start del prossimo
      title,
      description: info,
    });
  }
  // chiudi end con start del successivo (default +30m sull'ultimo)
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

// Cache 1h per (channel,date)
type CacheEntry = { at: number; programs: Program[] };
const guidatvCache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 60 * 1000;

async function fetchGuidatv(
  guidatvPath: string,
  date: string,
): Promise<Program[]> {
  const cacheKey = `${guidatvPath}:${date}`;
  const cached = guidatvCache.get(cacheKey);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.programs;

  const url = `https://www.guida.tv/programmi-tv/palinsesto/canale/${guidatvPath}.html?dt=${date}`;
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
      console.warn("[streaming-tv] guida.tv non-OK", res.status, guidatvPath);
      return [];
    }
    const html = await res.text();
    const programs = parseGuidatvHtml(html, date);
    guidatvCache.set(cacheKey, { at: Date.now(), programs });
    return programs;
  } catch (err) {
    console.warn("[streaming-tv] guida.tv fetch error", guidatvPath, err);
    return [];
  }
}

async function fetchProgramsForChannel(
  family: FamilyId,
  channel: Channel,
  date: string,
): Promise<Program[]> {
  if (family !== "discovery" || !channel.guidatvPath) return [];
  return await fetchGuidatv(channel.guidatvPath, date);
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

    const channels = await Promise.all(
      familyCfg.channels.map(async (ch) => {
        const programs = await fetchProgramsForChannel(family as FamilyId, ch, date)
          .then((list) => list.filter((p) => isPrimeTime(p.start)))
          .catch(() => [] as Program[]);
        // Espone solo i campi per il frontend (no guidatvPath/xmltvId)
        return {
          id: ch.id,
          name: ch.name,
          logo: ch.logo,
          number: ch.number,
          programs,
        };
      }),
    );

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
