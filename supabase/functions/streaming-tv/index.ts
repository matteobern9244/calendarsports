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
  // Se undefined, e' undefined anche superguidatvPath, il canale non ha
  // fonte e ritorna programs=[].
  staseraSlug?: string;
  // Path superguidatv.it (es. "guida-programmi-tv-sky-sport-uno/sky-sport/37").
  // Usato per i canali Sky Sport non coperti da staseraintv.com.
  superguidatvPath?: string;
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

// Slug verificati 2026-04-19 via curl.
// - staseraintv.com: copre RAI, Mediaset, Sky Cinema parziale, Discovery,
//   Sportitalia. Tutti gli slug `sky_sport_*` ritornano 404.
// - superguidatv.it: copre i canali Sky Sport branded con pagine
//   `/programmazione-canale/oggi/<path>/`, formato
//   `HH:MM | Titolo | Categoria (durata')`.
// La UI dichiara onestamente "Palinsesto non disponibile" per i canali
// senza fonte.
const FAMILIES: Record<FamilyId, { label: string; channels: Channel[] }> = {
  "sky-sport": {
    label: "Sport (Sky Sport + canali sport in chiaro)",
    channels: [
      // Sky Sport branded via superguidatv.it (verificato 2026-04-19,
      // ~40 righe HH:MM/giorno con genere "Sport" estratto).
      { id: "sky-sport-uno", name: "Sky Sport Uno", logo: null, number: 201, superguidatvPath: "guida-programmi-tv-sky-sport-uno/sky-sport/37" },
      { id: "sky-sport-calcio", name: "Sky Sport Calcio", logo: null, number: 202, superguidatvPath: "guida-programmi-tv-sky-sport-calcio/sky-sport/572" },
      { id: "sky-sport-tennis", name: "Sky Sport Tennis", logo: null, number: 203, superguidatvPath: "guida-programmi-tv-sky-sport-tennis-hd/sky-sport/598" },
      { id: "sky-sport-f1", name: "Sky Sport F1", logo: null, number: 207, superguidatvPath: "guida-programmi-tv-sky-sport-f1-hd/sky-sport/43" },
      { id: "sky-sport-motogp", name: "Sky Sport MotoGP", logo: null, number: 208, superguidatvPath: "guida-programmi-tv-sky-sport-motogp/sky-sport/44" },
      { id: "sky-sport-arena", name: "Sky Sport Arena", logo: null, number: 204, superguidatvPath: "guida-programmi-tv-sky-sport-arena/sky-sport/38" },
      { id: "sky-sport-golf", name: "Sky Sport Golf", logo: null, number: 209, superguidatvPath: "guida-programmi-tv-sky-sport-golf/sky-sport/573" },
      { id: "sky-sport-max", name: "Sky Sport Max", logo: null, number: 256, superguidatvPath: "guida-programmi-tv-sky-sport-max/sky-sport/1248568499" },
      { id: "sky-sport-basket", name: "Sky Sport Basket", logo: null, number: 205, superguidatvPath: "guida-programmi-tv-sky-sport-basket/sky-sport/40" },
      { id: "sky-sport-24", name: "Sky Sport 24", logo: null, number: 200, superguidatvPath: "guida-programmi-tv-sky-sport24/sky-sport/36" },
      // Verificato 2026-04-19: nessuna pagina pubblica dedicata trovata per Sky Sport Football / Action.
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
export type RichTitle = { title: string; hh?: number; mm?: number };

export function extractRichTitles(html: string): RichTitle[] {
  const rich: RichTitle[] = [];
  const seen = new Set<string>();
  const push = (raw: string, hh?: number, mm?: number) => {
    const t = decodeEntities(raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (!t || t.length < 5) return;
    if (!/[A-Za-zÀ-ÿ]/.test(t)) return;
    const key = `${t}|${hh ?? ""}:${mm ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    rich.push({ title: t, hh, mm });
  };

  // Pattern 1a (NUOVO): blocco "scheda" con orario HH:MM seguito (entro 400
  // char, anche con tag/newline) dal titolo ricco "... (Genere)".
  // Cattura l'orario di inizio per match-by-time quando il prefisso fallisce
  // (es. raw "EV-SP" 20:40 ↔ rich "Calcio - Coppa Italia ... (Sport)").
  const reTimed = /(\d{1,2}):(\d{2})[\s\S]{0,400}?([A-Za-zÀ-ÿ0-9][^<>\r\n]{4,250}\([A-Za-zÀ-ÿ' ]{3,40}\))/g;
  let m: RegExpExecArray | null;
  while ((m = reTimed.exec(html)) !== null) {
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (hh > 27 || mm > 59) continue;
    push(m[3], hh, mm);
  }

  // Pattern 1b: testo con genere fra parentesi a fine stringa, senza orario
  // associato. Mantiene il comportamento attuale (match-by-prefix).
  const re1 = /([A-Za-zÀ-ÿ0-9][^<>\r\n]{4,250}\([A-Za-zÀ-ÿ' ]{3,40}\))/g;
  while ((m = re1.exec(html)) !== null) push(m[1]);

  // Pattern 2: title="..." negli <img> delle schede (fallback senza genere).
  const re2 = /title="([^"]{5,200})"\s*src="\/scheda\//g;
  while ((m = re2.exec(html)) !== null) push(m[1]);

  return rich;
}

// Normalizza per match tollerante: minuscolo, rimuove punteggiatura,
// collassa spazi, rimuove articoli/parole comuni di poco valore.
function normForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function enrichTitle(
  rawUpper: string,
  rich: RichTitle[],
  rawHh?: number,
  rawMm?: number,
): { title: string; genre?: string } {
  if (!rawUpper) return { title: rawUpper };
  const norm = normForMatch(rawUpper);
  const normTokens = norm.split(" ").filter(Boolean);
  // Cerca un titolo "ricco" che condivida un prefisso significativo (>=3 parole
  // o >=15 char) con la riga grezza, ignorando trattini e punteggiatura.
  // Es. raw "Roberta Valente - Notaio in Sorrento - S1E3" matcha rich
  // "Roberta Valente Notaio in Sorrento - Stagione 1 Episodio 3 (Fiction)".
  let best = "";
  for (const cand of rich) {
    const candNorm = normForMatch(cand.title);
    const candTokens = candNorm.split(" ").filter(Boolean);
    // Trova lunghezza prefisso comune di token.
    let common = 0;
    const lim = Math.min(normTokens.length, candTokens.length);
    while (common < lim && normTokens[common] === candTokens[common]) common += 1;
    const commonChars = candTokens.slice(0, common).join(" ").length;
    if ((common >= 3 || commonChars >= 15) && cand.title.length > best.length) {
      best = cand.title;
    }
  }
  // Fallback (NUOVO): se nessun prefisso ha matchato e abbiamo l'orario della
  // riga grezza, cerca un rich title con stesso HH:MM esatto. Risolve il caso
  // di sigle generiche ("EV-SP", "EV-CN") che non condividono token col
  // titolo reale ma sono al medesimo orario.
  if (!best && rawHh !== undefined && rawMm !== undefined) {
    let timeBest = "";
    for (const cand of rich) {
      if (cand.hh !== rawHh || cand.mm !== rawMm) continue;
      if (cand.title.length > timeBest.length) timeBest = cand.title;
    }
    if (timeBest) best = timeBest;
  }
  // Fallback aggiuntivo (NUOVO): placeholder generici tipo "EV-SP" / "EV-CN"
  // / "EV-FILM" non condividono token col titolo reale e spesso il rich title
  // nella scheda non ha un HH:MM nelle vicinanze. Mappa la sigla al genere
  // atteso e prendi l'unico rich title compatibile.
  if (!best) {
    const placeholder = rawUpper.toUpperCase().replace(/\s+/g, "").trim();
    const PLACEHOLDER_TO_GENRE: Record<string, string[]> = {
      "EV-SP": ["Sport", "Calcio", "Tennis", "Motori", "Basket", "Pallavolo", "Pallacanestro", "Rugby", "Volley", "Nuoto", "Ciclismo"],
      "EV-CN": ["Film", "Cinema"],
      "EV-FILM": ["Film", "Cinema"],
      "EV-TV": ["Fiction", "Serie Tv", "Telefilm", "Miniserie"],
    };
    const wanted = PLACEHOLDER_TO_GENRE[placeholder];
    if (wanted) {
      let phBest = "";
      for (const cand of rich) {
        const mm = cand.title.match(/\(([^()]{2,40})\)\s*$/);
        if (!mm) continue;
        const genreCanon = mm[1].trim()
          .toLowerCase()
          .replace(/(^|\s)(\p{L})/gu, (_, p, c) => p + c.toUpperCase());
        if (!wanted.includes(genreCanon)) continue;
        if (cand.title.length > phBest.length) phBest = cand.title;
      }
      if (phBest) best = phBest;
    }
  }
  const source = best || rawUpper
    .toLowerCase()
    .replace(/(^|[\s\-:'"(])(\p{L})/gu, (_, p, c) => p + c.toUpperCase());

  // Estrai genere fra parentesi a fine titolo: "... (Fiction)" / "(Film)" / "(Sport)".
  // Whitelist generi noti per evitare di confondere parentesi descrittive
  // (es. "(Replica)", "(2023)").
  const GENRE_WHITELIST = new Set([
    "Fiction", "Film", "Serie", "Serie Tv", "Serie Tv Drammatica",
    "Telefilm", "Miniserie", "Soap Opera", "Soap",
    "Sport", "Calcio", "Tennis", "Motori", "Formula 1", "Motogp", "Ciclismo",
    "Basket", "Pallavolo", "Pallacanestro", "Rugby", "Volley", "Nuoto",
    "Documentario", "Reality", "Talk Show", "Talkshow", "Show", "Varieta'", "Varieta",
    "Intrattenimento", "Cartoni", "Cartoni Animati", "Animazione",
    "News", "Telegiornale", "Attualita'", "Attualita", "Rubrica",
    "Magazine", "Approfondimento", "Inchiesta", "Meteo",
    "Cucina", "Lifestyle", "Musica", "Quiz", "Cinema", "Game Show",
    "Commedia", "Azione", "Thriller", "Avventura", "Horror", "Romantico",
    "Drammatico", "Biografico", "Storico", "Western", "Fantascienza",
    "Religione", "Educativo", "Cultura", "Viaggi",
  ]);
  // Normalizza varianti note in forma canonica.
  const GENRE_ALIASES: Record<string, string> = {
    "Talkshow": "Talk Show",
    "Varieta": "Varieta'",
  };
  const tryExtractGenre = (s: string): { stripped: string; genre?: string } => {
    const mm = s.match(/\s*\(([^()]{2,40})\)\s*$/);
    if (!mm) return { stripped: s };
    const candidate = mm[1].trim();
    const candidateNorm = candidate
      .toLowerCase()
      .replace(/(^|\s)(\p{L})/gu, (_, p, c) => p + c.toUpperCase());
    if (GENRE_WHITELIST.has(candidateNorm)) {
      const canonical = GENRE_ALIASES[candidateNorm] ?? candidateNorm;
      return { stripped: s.slice(0, mm.index).trim(), genre: canonical };
    }
    return { stripped: s };
  };
  // 1) Tenta sul titolo "ricco" (es. "Racconto di una notte ... (Fiction)").
  let { stripped: title, genre } = tryExtractGenre(source);
  // 2) Fallback: tenta direttamente sul raw uppercase quando il rich block
  // non ha una parentesi finale (es. la riga grezza "RACCONTO ... (FICTION)").
  if (!genre) {
    const rawTry = tryExtractGenre(rawUpper);
    if (rawTry.genre) {
      genre = rawTry.genre;
      // Se il raw conteneva il genere ma il rich no, mantieni il rich come
      // titolo (gia' senza parentesi) o usa il raw strippato se non c'e'
      // alcun rich match.
      if (!best) title = rawTry.stripped
        .toLowerCase()
        .replace(/(^|[\s\-:'"(])(\p{L})/gu, (_, p, c) => p + c.toUpperCase());
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

    const { title: titleEnriched, genre } = enrichTitle(titleRaw, richTitles, hh, mm);

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

// ===== superguidatv.it parser =====
// Pattern verificato 2026-04-19 sulle pagine
// `https://www.superguidatv.it/programmazione-canale/oggi/<path>/`.
// Le righe HH:MM precedono blocchi che contengono il titolo seguito da
// `Categoria (durata')` (es. "Sport (40')", "Calcio (125')").
// Solo "oggi" e' supportato (la fonte non espone domani/ieri in URL stabile).
function parseSuperguidatvHtml(html: string, date: string): Program[] {
  const timeMatches = [...html.matchAll(/<p class="[^"]*sgtv-w-20[^"]*">(\d{1,2}:\d{2})<\/p>/g)];
  const titleMatches = [...html.matchAll(/<p class="[^"]*sgtv-truncate sgtv-text-lg sgtv-leading-tight[^"]*">([^<]+)<\/p>/g)];
  const metaMatches = [...html.matchAll(/<p class="[^"]*sgtv-truncate sgtv-border-l-\[10px\][^"]*">([^<]+)<\/p>/g)];

  const rowCount = Math.min(timeMatches.length, titleMatches.length, metaMatches.length);
  if (rowCount === 0) return [];

  const programs: Program[] = [];
  const seen = new Set<string>();
  let prevStartMs = -1;
  let dayShift = 0;
  for (let i = 0; i < rowCount; i += 1) {
    const [hhStr, mmStr] = timeMatches[i][1].split(":");
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr, 10);
    if (hh > 27 || mm > 59) continue;

    const title = decodeEntities(titleMatches[i][1]).replace(/\s+/g, " ").trim();
    if (!title || title.length < 2) continue;
    if (/^(in\s*onda|ultim['’]ora|prossim[ao])$/i.test(title)) continue;

    const meta = decodeEntities(metaMatches[i][1]).replace(/\s+/g, " ").trim();
    const metaMatch = meta.match(/^(.{3,40}?)\s*\((\d{1,3})['’]?\)$/);
    if (!metaMatch) continue;

    const categoryRaw = metaMatch[1].trim();
    const durationMin = parseInt(metaMatch[2], 10);
    if (durationMin <= 0 || durationMin > 600) continue;

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

    const genre = categoryRaw
      .toLowerCase()
      .replace(/(^|\s)(\p{L})/gu, (_, p, c) => p + c.toUpperCase());

    const endIso = new Date(startMs + durationMin * 60 * 1000).toISOString();
    const key = `${startIso}|${title.slice(0, 50)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    programs.push({ start: startIso, end: endIso, title, genre });
  }
  programs.sort((a, b) => a.start.localeCompare(b.start));
  // Merge ripetizioni adiacenti dello stesso titolo (la fonte spesso ripete).
  const dedup: Program[] = [];
  for (const p of programs) {
    const prev = dedup[dedup.length - 1];
    if (prev && prev.title === p.title &&
        Math.abs(new Date(p.start).getTime() - new Date(prev.end).getTime()) < 5 * 60 * 1000) {
      prev.end = p.end;
      continue;
    }
    dedup.push(p);
  }
  return dedup;
}

async function fetchSuperguidatv(path: string, date: string): Promise<Program[]> {
  const cacheKey = `sg:${path}:${date}`;
  const cached = fetchCache.get(cacheKey);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.programs;

  if (date !== todayRomeISO()) {
    fetchCache.set(cacheKey, { at: Date.now(), programs: [] });
    return [];
  }
  const url = `https://www.superguidatv.it/programmazione-canale/oggi/${path}/`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "it-IT,it;q=0.9",
      },
    });
    if (!res.ok) {
      console.warn("[streaming-tv] superguidatv non-OK", res.status, path);
      fetchCache.set(cacheKey, { at: Date.now(), programs: [] });
      return [];
    }
    const html = await res.text();
    const programs = parseSuperguidatvHtml(html, date);
    console.log("[streaming-tv] superguidatv parsed", path, "programs=", programs.length, "htmlLen=", html.length);
    fetchCache.set(cacheKey, { at: Date.now(), programs });
    return programs;
  } catch (err) {
    console.warn("[streaming-tv] superguidatv fetch error", path, err);
    return [];
  }
}

async function fetchProgramsForChannel(
  channel: Channel,
  date: string,
): Promise<Program[]> {
  if (channel.staseraSlug) return await fetchStasera(channel.staseraSlug, date);
  if (channel.superguidatvPath) return await fetchSuperguidatv(channel.superguidatvPath, date);
  return [];
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
