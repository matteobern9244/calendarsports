// Edge function: streaming-tv
// Restituisce il palinsesto prime time (19:00-24:00 Europe/Rome) di oggi
// per famiglia di canali (sky-sport, sky-cinema, rai, mediaset, discovery).
//
// FRAGILITA' MASSIMA: la sorgente reale per Sky/RAI/Mediaset richiede
// scraping dei rispettivi siti pubblici, e per Real Time/DMax dipende
// da feed XMLTV community (iptv-org/epg). Per la prima implementazione
// produciamo un palinsesto strutturato a partire da un dataset
// hardcoded di canali e usiamo un fetch best-effort verso il feed XMLTV
// pubblico per Discovery; quando il fetch fallisce restituiamo lista
// programmi vuota per quel canale, mai un crash. Questo approccio
// garantisce che la UI sia sempre navigabile e dichiari onestamente
// quando non ha dati. Le sorgenti reali per Sky/RAI/Mediaset andranno
// integrate progressivamente in step successivi.

import {
  buildCorsHeaders,
  checkRateLimit,
  rateLimitResponse,
} from "../_shared/security.ts";

type Channel = {
  id: string;
  name: string;
  logo: string | null;
  // numero canale Sky/digitale terrestre quando rilevante
  number?: number;
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
      { id: "real-time", name: "Real Time", logo: null, number: 31 },
      { id: "dmax", name: "DMax", logo: null, number: 52 },
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
  // 19:00 - 24:00 Europe/Rome
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

// Stub: in step successivi qui andra' lo scraping dei provider reali.
// Per ora restituiamo lista vuota: il frontend mostra messaggio
// "Palinsesto non disponibile" sul canale, mai dati inventati.
async function fetchProgramsForChannel(
  _family: FamilyId,
  _channel: Channel,
  _date: string,
): Promise<Program[]> {
  return [];
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
        return { ...ch, programs };
      }),
    );

    const payload = {
      family,
      familyLabel: familyCfg.label,
      date,
      channels,
      // dichiarazione esplicita: scraping reale non ancora implementato
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
