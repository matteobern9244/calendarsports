/**
 * Schemi del confine API: descrivono i payload che le edge function
 * restituiscono, e sono la sola fonte dei tipi usati dalle pagine.
 *
 * Prima di questo file `callEdgeFunction` restituiva `any`. Non era solo
 * l'assenza di un tipo: `any` e' assegnabile a qualunque cosa, quindi
 * rendeva non verificate anche le annotazioni scritte a mano a valle
 * (`useQuery<TvFamilyPayload>` typava senza controllare niente) e lasciava
 * compilare letture di campi che nessuna edge function produce.
 *
 * ## Quanto sono severi questi schemi
 *
 * I produttori sono le nostre edge function, ma le fonti a monte sono
 * scraping (Sky Sport, Wikipedia, Pulselive): la deriva di forma non e'
 * un'ipotesi teorica. La policy percio' e':
 *
 * - **oggetti aperti** (`looseObject`): i campi sconosciuti passano intatti
 *   invece di essere silenziosamente rimossi;
 * - **obbligatorio solo cio' che la UI non sa disegnare senza**; tutto il
 *   resto e' `nullish()`, senza inventare valori di comodo (e' la stessa
 *   regola che vale nelle edge function: mai dati sintetici);
 * - **liste tolleranti a livello di elemento** (`tolerantArray`): una gara
 *   malformata non deve svuotare l'intero calendario. E' la difesa piu'
 *   vicina al comportamento precedente, dove un elemento rotto rendeva
 *   celle vuote senza far cadere la pagina.
 */
import { z } from "zod";
// Solo tipo: `sportsApi` importa questo modulo a runtime, quindi un import
// di valore in senso inverso creerebbe un ciclo. `import type` viene
// cancellato in compilazione e il ciclo non esiste.
import type { StreamingFamilyId, StreamingProviderId } from "@/lib/api/sportsApi";

/**
 * Numero che a monte nessuno ha coerciso: le edge function ricopiano i
 * valori dei widget Sky cosi' come arrivano. Accettare anche la stringa
 * costa un'unione nel tipo e salva la riga dallo scarto; il rendering la
 * tratta comunque come testo.
 */
const scrapedNumber = z.union([z.number(), z.string()]);

/**
 * Protegge un campo il cui nome esiste gia' su `Object.prototype`.
 *
 * zod legge i campi con `value[key]`, che attraversa la catena dei
 * prototipi: su un oggetto uscito da `JSON.parse` la chiave `constructor`
 * risulta sempre presente e vale una funzione. Un campo opzionale con quel
 * nome quindi non e' mai davvero opzionale, e l'elemento viene scartato.
 * Qui il valore ereditato viene trattato per quello che e': assenza di dato.
 */
function prototypeSafe<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (typeof value === "function" ? undefined : value), schema);
}

/**
 * Riporta a numero un valore `scrapedNumber`, oppure `null` se non lo e'.
 * Serve prima di qualunque confronto: con `any` `"2" > "10"` era `true`
 * (confronto fra stringhe) e nessuno se ne accorgeva.
 */
export function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Lista che scarta gli elementi non conformi invece di far fallire l'intero
 * payload. Lo scarto e' rumoroso di proposito: se una fonte cambia forma
 * vogliamo vederlo in console, non dedurlo da una pagina mezza vuota.
 */
export function tolerantArray<T>(item: z.ZodType<T>, label: string) {
  return z.array(z.unknown()).transform((raw) => {
    const kept: T[] = [];
    let dropped = 0;
    for (const element of raw) {
      const parsed = item.safeParse(element);
      if (parsed.success) kept.push(parsed.data);
      else dropped++;
    }
    if (dropped > 0) {
      console.warn(`[api] ${label}: ${dropped} elementi su ${raw.length} scartati dal confine`);
    }
    return kept;
  });
}

/**
 * Forma dichiarata a mano e **non verificata** a runtime: passa tutto e si
 * limita a tipizzare. Serve solo dove un confine non ha ancora il suo schema,
 * ed e' il residuo esplicito di cio' che prima faceva `any` ovunque in modo
 * invisibile. Cercare le occorrenze di `declaredOnly` da' il debito residuo.
 */
export function declaredOnly<T>() {
  return z.custom<T>(() => true);
}

/** Inviluppo comune a tutte le edge function. */
export const edgeEnvelopeSchema = z.looseObject({
  success: z.boolean().optional(),
  error: z.string().optional(),
  // Opzionale di proposito: quando l'edge function fallisce risponde
  // `{ success: false, error }` senza `data`, e in zod 4 una chiave
  // `unknown` mancante fa fallire l'oggetto. Senza `optional()` il
  // messaggio d'errore vero verrebbe coperto da un errore di schema.
  data: z.unknown().optional(),
  meta: z.looseObject({}).optional(),
});

// === F1 (Jolpica) ===

/** Sessione di weekend: Jolpica la serve come `{ date, time }` grezzo. */
const f1SessionSchema = z.looseObject({
  date: z.string().nullish(),
  time: z.string().nullish(),
});

/**
 * `round` e' `parseInt(r.round)`: quando la fonte non lo espone il risultato
 * e' `NaN`, che `JSON.stringify` serializza come `null`. Lo schema lo dice.
 */
export const f1RaceSchema = z.looseObject({
  round: z.number().nullish(),
  raceName: z.string(),
  circuit: z.string(),
  locality: z.string(),
  country: z.string(),
  date: z.string(),
  time: z.string().nullish(),
  firstPractice: f1SessionSchema.nullish(),
  secondPractice: f1SessionSchema.nullish(),
  thirdPractice: f1SessionSchema.nullish(),
  qualifying: f1SessionSchema.nullish(),
  sprintQualifying: f1SessionSchema.nullish(),
  sprint: f1SessionSchema.nullish(),
});

export const f1DriverRowSchema = z.looseObject({
  position: z.number().nullish(),
  points: z.number().nullish(),
  wins: z.number().nullish(),
  driver: z.string(),
  driverCode: z.string(),
  nationality: z.string(),
  constructor: prototypeSafe(z.string()),
  photoUrl: z.string().nullish(),
});

export const f1ConstructorRowSchema = z.looseObject({
  position: z.number().nullish(),
  points: z.number().nullish(),
  wins: z.number().nullish(),
  constructor: prototypeSafe(z.string()),
  nationality: z.string(),
  logoUrl: z.string().nullish(),
});

export const f1LastResultSchema = z
  .looseObject({
    raceName: z.string(),
    round: z.number().nullish(),
    date: z.string(),
    circuit: z.string(),
    results: z.array(
      z.looseObject({
        position: z.number().nullish(),
        driver: z.string(),
        constructor: z.string(),
        time: z.string(),
        points: z.number().nullish(),
      }),
    ),
  })
  .nullable();

export type F1Race = z.infer<typeof f1RaceSchema>;
export type F1DriverStanding = z.infer<typeof f1DriverRowSchema>;
export type F1ConstructorStanding = z.infer<typeof f1ConstructorRowSchema>;
export type F1LastResult = z.infer<typeof f1LastResultSchema>;

// === Football (widget Sky Sport) ===

/**
 * `homeScore`/`awayScore` arrivano da `match.home?.goal` senza conversione:
 * il widget Sky li serve come numero, ma nulla nel percorso lo garantisce.
 */
export const footballMatchSchema = z.looseObject({
  id: z.string(),
  matchday: scrapedNumber.nullish(),
  homeTeam: z.string(),
  awayTeam: z.string(),
  homeLogo: z.string().nullish(),
  awayLogo: z.string().nullish(),
  homeScore: scrapedNumber.nullish(),
  awayScore: scrapedNumber.nullish(),
  date: z.string().nullish(),
  status: z.string().nullish(),
  competition: z.string(),
  link: z.string().nullish(),
  broadcaster: z.string().nullish(),
});

const footballLastMatchSchema = z.looseObject({
  result: z.string().nullish(),
  home: z.unknown().nullish(),
  away: z.unknown().nullish(),
});

export const footballStandingRowSchema = z.looseObject({
  position: scrapedNumber.nullish(),
  team: z.string(),
  teamUrl: z.string().nullish(),
  logoUrl: z.string().nullish(),
  played: scrapedNumber.nullish(),
  wins: scrapedNumber.nullish(),
  draws: scrapedNumber.nullish(),
  losses: scrapedNumber.nullish(),
  goalsFor: scrapedNumber.nullish(),
  goalsAgainst: scrapedNumber.nullish(),
  goalDiff: scrapedNumber.nullish(),
  points: scrapedNumber.nullish(),
  trend: z.unknown().nullish(),
  qualification: z.string().nullish(),
  lastMatches: z.array(footballLastMatchSchema).nullish(),
});

export const juventusInfoSchema = z
  .looseObject({
    position: scrapedNumber.nullish(),
    team: z.string(),
    points: scrapedNumber.nullish(),
    played: scrapedNumber.nullish(),
    wins: scrapedNumber.nullish(),
    draws: scrapedNumber.nullish(),
    losses: scrapedNumber.nullish(),
    goalsFor: scrapedNumber.nullish(),
    goalsAgainst: scrapedNumber.nullish(),
    goalDiff: scrapedNumber.nullish(),
    logoUrl: z.string().nullish(),
    lastMatches: z.array(footballLastMatchSchema).nullish(),
  })
  .nullable();

/**
 * Il calendario Juventus ha due forme, e il frontend le incontra entrambe:
 * array nudo senza `page`/`pageSize`, inviluppo piatto con la paginazione
 * altrimenti. I contatori dell'inviluppo li calcola la nostra edge function,
 * quindi li' i numeri sono numeri davvero.
 */
export const footballCalendarSchema = z.union([
  tolerantArray(footballMatchSchema, "sports-football:calendar"),
  z.looseObject({
    items: tolerantArray(footballMatchSchema, "sports-football:calendar.items"),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
    nextUpcomingIndex: z.number(),
  }),
]);

export type FootballMatch = z.infer<typeof footballMatchSchema>;
export type FootballStandingRow = z.infer<typeof footballStandingRowSchema>;
export type JuventusInfo = z.infer<typeof juventusInfoSchema>;
export type FootballCalendar = z.infer<typeof footballCalendarSchema>;

/**
 * Le due forme del calendario si leggono con questi due selettori invece
 * che con un cast: `matchesOf` da' le partite in entrambi i casi,
 * `paginatedCalendarOf` da' l'inviluppo solo quando esiste davvero.
 * Prima erano un `as PaginatedCalendar` in una pagina e una funzione
 * `unknown -> any[]` in un'altra, cioe' due bugie diverse sullo stesso dato.
 */
export function matchesOf(calendar: FootballCalendar | undefined): FootballMatch[] {
  if (!calendar) return [];
  return Array.isArray(calendar) ? calendar : calendar.items;
}

export function paginatedCalendarOf(calendar: FootballCalendar | undefined) {
  return calendar && !Array.isArray(calendar) ? calendar : undefined;
}

// === Tennis (Wikipedia) ===

const slamResultSchema = z.looseObject({
  best: z.string().nullish(),
  years: z.array(z.number()),
  raw: z.string(),
});

export const tennisPlayerInfoSchema = z.looseObject({
  name: z.string(),
  ranking: z.number().nullish(),
  rankingDate: z.string().nullish(),
  careerHigh: z.number().nullish(),
  careerHighDate: z.string().nullish(),
  nationality: z.string().nullish(),
  country: z.string().nullish(),
  birthDate: z.string().nullish(),
  birthPlace: z.string().nullish(),
  height: z.string().nullish(),
  weight: z.string().nullish(),
  plays: z.string().nullish(),
  coach: z.string().nullish(),
  turnedPro: z.number().nullish(),
  careerRecord: z.string().nullish(),
  careerTitles: z.number().nullish(),
  prizeMoney: z.string().nullish(),
  seasonRecord: z.string().nullish(),
  seasonTitles: z.number().nullish(),
  slamResults: z
    .looseObject({
      australianOpen: slamResultSchema.nullish(),
      rolandGarros: slamResultSchema.nullish(),
      wimbledon: slamResultSchema.nullish(),
      usOpen: slamResultSchema.nullish(),
      tourFinals: slamResultSchema.nullish(),
    })
    .nullish(),
  statsUpdatedAt: z.string().nullish(),
  photoUrl: z.string().nullish(),
  source: z.string().nullish(),
});

export const tennisTournamentSchema = z.looseObject({
  name: z.string(),
  date: z.string(),
  dateEnd: z.string().nullish(),
  surface: z.string().nullish(),
  location: z.string().nullish(),
  tier: z.string().nullish(),
  status: z.string().nullish(),
  result: z.string().nullish(),
});

export const tennisMatchSchema = z.looseObject({
  tournament: z.string(),
  tournamentSlug: z.string().nullish(),
  date: z.string(),
  dateEnd: z.string().nullish(),
  surface: z.string().nullish(),
  location: z.string().nullish(),
  tier: z.string().nullish(),
  round: z.string().nullish(),
  opponent: z.string().nullish(),
  opponentRank: z.number().nullish(),
  score: z.string().nullish(),
  result: z.string().nullish(),
});

/**
 * `results` impagina con un inviluppo annidato, diverso da quello piatto del
 * calendario Juventus. La forma ad array resta accettata: e' quella che
 * restituisce la stagione senza dati e quella che puo' arrivare da una cache
 * scritta prima dell'introduzione della paginazione.
 */
export const tennisResultsSchema = z.union([
  tolerantArray(tennisMatchSchema, "sports-tennis:results"),
  z.looseObject({
    items: tolerantArray(tennisMatchSchema, "sports-tennis:results.items"),
    pagination: z.looseObject({
      page: z.number(),
      pageSize: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  }),
]);

export type TennisPlayerInfo = z.infer<typeof tennisPlayerInfoSchema>;
export type TennisTournament = z.infer<typeof tennisTournamentSchema>;
export type TennisMatch = z.infer<typeof tennisMatchSchema>;
export type TennisResults = z.infer<typeof tennisResultsSchema>;

// === MotoGP (Pulselive + Sky) ===

export const motogpSessionSchema = z.looseObject({
  type: z.string(),
  number: z.number().nullish(),
  label: z.string(),
  date: z.string(),
});

export const motogpEventSchema = z.looseObject({
  id: z.string().nullish(),
  round: z.number(),
  name: z.string(),
  location: z.string().nullish(),
  circuit: z.string().nullish(),
  date_start: z.string(),
  date_end: z.string(),
  country: z.string().nullish(),
  status: z.string().nullish(),
  sessions: z.array(motogpSessionSchema).nullish(),
});

export const motogpRiderRowSchema = z.looseObject({
  position: z.number(),
  name: z.string(),
  team: z.string().nullish(),
  points: z.number(),
  photoUrl: z.string().nullish(),
  number: z.number().nullish(),
  nationality: z.string().nullish(),
  teamLogoUrl: z.string().nullish(),
});

export const motogpConstructorRowSchema = z.looseObject({
  position: z.number(),
  team: z.string(),
  points: z.number(),
  logoUrl: z.string().nullish(),
  constructor: prototypeSafe(z.string().nullish()),
});

export type MotoGPSession = z.infer<typeof motogpSessionSchema>;
export type MotoGPEvent = z.infer<typeof motogpEventSchema>;
export type MotoGPRiderStanding = z.infer<typeof motogpRiderRowSchema>;
export type MotoGPConstructorStanding = z.infer<typeof motogpConstructorRowSchema>;

// === Highlights (RSS YouTube) ===

export const highlightItemSchema = z.looseObject({
  videoId: z.string(),
  title: z.string(),
  publishedAt: z.string(),
  source: z.string(),
  url: z.string(),
  thumbnailUrl: z.string(),
});

export type HighlightItem = z.infer<typeof highlightItemSchema>;

// === Schemi per endpoint ===
//
// Costruiti una volta sola, a livello di modulo: `tolerantArray` produce un
// nuovo schema a ogni chiamata, e ricrearlo a ogni fetch sarebbe lavoro
// buttato. Qui si legge anche, in un colpo d'occhio, quale forma ha ogni
// azione: quali sono liste, quali possono essere `null`.

export const f1CalendarSchema = tolerantArray(f1RaceSchema, "sports-f1:calendar");
export const f1DriverStandingsSchema = tolerantArray(
  f1DriverRowSchema,
  "sports-f1:driver-standings",
);
export const f1ConstructorStandingsSchema = tolerantArray(
  f1ConstructorRowSchema,
  "sports-f1:constructor-standings",
);
export const f1NextRaceSchema = f1RaceSchema.nullable();

export const footballStandingsSchema = tolerantArray(
  footballStandingRowSchema,
  "sports-football:standings",
);

export const tennisScheduleSchema = tolerantArray(tennisTournamentSchema, "sports-tennis:schedule");
export const tennisNextEventSchema = tennisTournamentSchema.nullable();

export const motogpCalendarSchema = tolerantArray(motogpEventSchema, "sports-motogp:calendar");
export const motogpStandingsSchema = tolerantArray(motogpRiderRowSchema, "sports-motogp:standings");
export const motogpConstructorStandingsSchema = tolerantArray(
  motogpConstructorRowSchema,
  "sports-motogp:constructor-standings",
);
export const motogpNextEventSchema = motogpEventSchema.nullable();

export const highlightsSchema = tolerantArray(highlightItemSchema, "highlights-youtube");

// === Streaming (TMDB + palinsesti) ===
//
// Questi payload non hanno ancora uno schema: le forme qui sotto sono
// dichiarate a mano e passano al confine tramite `declaredOnly`, cioe'
// senza nessun controllo a runtime. E' lo stesso grado di garanzia di
// prima, ma dichiarato invece che nascosto dentro `any`.

export interface TvProgram {
  start: string;
  /**
   * Opzionale perche' la fonte non sempre lo comunica, ed e' il codice a
   * saperlo: `combineTvHighlights` fa `Boolean(p.end)` e in mancanza non
   * mostra nessuna durata, invece di inventarne una. Il tipo lo dichiarava
   * obbligatorio, cioe' prometteva al chiamante qualcosa che il payload non
   * garantisce — ed essendo `declaredOnly`, senza validazione a runtime,
   * nessuno lo avrebbe smentito.
   */
  end?: string;
  title: string;
  genre?: string;
  description?: string;
}

export interface TvChannel {
  id: string;
  name: string;
  logo: string | null;
  number?: number;
  programs: TvProgram[];
}

export interface TvFamilyPayload {
  family: StreamingFamilyId;
  familyLabel: string;
  date: string;
  channels: TvChannel[];
  programsAvailable: boolean;
}

export interface AvailableProvider {
  id: number;
  key: StreamingProviderId | string | null;
  name: string;
  logo: string | null;
  type: "flatrate" | "free" | "ads";
}

export interface ReleaseItem {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  releaseDate: string;
  poster: string | null;
  overview: string;
  voteAverage: number | null;
  deepLink: string | null;
  /** Anno YYYY estratto dalla release date, null se mancante. */
  year?: number | null;
  /** Generi TMDB localizzati in italiano (label testuali). */
  genres?: string[];
  /** Provider IT disponibili (flatrate/free/ads), max ~5. */
  availableProviders?: AvailableProvider[];
  /** Link JustWatch generale del titolo (results.IT.link da TMDB). */
  justWatchLink?: string | null;
  /** Popolarità TMDB grezza (per ordinamento client lato vista). */
  popularity?: number;
}

export interface ReleasesPayload {
  provider: StreamingProviderId;
  providerLabel: string;
  providerHomepage?: string;
  date: string;
  dateFrom: string;
  dateTo: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  widenedWindow?: boolean;
  items: ReleaseItem[];
  configured: boolean;
}

export interface ReleasesItalyPayload {
  region: "IT";
  dateFrom: string;
  dateTo: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  widenedWindow?: boolean;
  /** True quando la finestra date non ha prodotto risultati e il backend
   *  ripiega sulle uscite più recenti del provider (senza vincolo data). */
  fallbackRecent?: boolean;
  provider: StreamingProviderId | null;
  kind: "movie" | "tv" | "all";
  sort: "release" | "popularity";
  genreId: number | null;
  items: ReleaseItem[];
  configured: boolean;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile: string | null;
}

export interface CreditsPayload {
  type: "movie" | "tv";
  id: string;
  cast: CastMember[];
  configured: boolean;
}

export interface ReleaseDetailsPayload {
  type: "movie" | "tv";
  id: string;
  title: string;
  originalTitle: string | null;
  releaseDate: string;
  year: number | null;
  poster: string | null;
  backdrop: string | null;
  overview: string;
  voteAverage: number | null;
  voteCount: number;
  runtime: number | null;
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  genres: string[];
  directors: string[];
  creators: string[];
  cast: CastMember[];
  trailerYouTubeKey: string | null;
  availableProviders: AvailableProvider[];
  justWatchLink: string | null;
  configured: boolean;
}
