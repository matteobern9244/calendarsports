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
 *
 * ## Copertura
 *
 * Tutti i confini hanno il loro schema. Fino a poco fa `streaming-tv` e
 * `streaming-releases` passavano da un `declaredOnly` che tipizzava senza
 * controllare: quel varco e' stato chiuso e la funzione rimossa, perche' un
 * passa-tutto lasciato in giro e' l'attrezzo che il prossimo confine
 * riprende in mano. Un confine nuovo si apre con il suo schema, ricavato da
 * cio' che la edge function costruisce davvero.
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
// Questi schemi sono ricavati da cio' che `streaming-tv` e
// `streaming-releases` costruiscono davvero, non dalle interfacce che li
// precedevano: quelle erano scritte a mano, non verificate a runtime, e su
// due punti erano gia' in ritardo sul codice.
//
// - `normalizeItem` produce anche `genreIds`, che nessuna interfaccia
//   nominava. `looseObject` lo lascia passare invece di toglierlo.
// - Il ramo senza chiave TMDB di `details` risponde `{ type, id,
//   configured: false }` e basta. L'interfaccia ne dichiarava una ventina
//   obbligatori: uno schema ricavato da lei avrebbe rifiutato una risposta
//   legittima e rotto un caso che oggi degrada bene.

/**
 * Le famiglie e i provider sono validati a monte da `FAMILY_RE` e
 * `PROVIDER_FILTER_RE`: un valore fuori elenco non arriva mai. Il
 * `satisfies` lega l'elenco all'unione dichiarata in `sportsApi`, cosi'
 * aggiungerne uno da una parte sola non compila.
 */
const streamingFamilySchema = z.enum([
  "sky-sport",
  "sky-cinema",
  "rai",
  "mediaset",
  "discovery",
] as const satisfies readonly StreamingFamilyId[]);

const streamingProviderSchema = z.enum([
  "netflix",
  "prime",
  "disney",
  "hbo",
] as const satisfies readonly StreamingProviderId[]);

/**
 * `end` e' nullish perche' la fonte non sempre lo comunica, ed e' il codice
 * a saperlo: `combineTvHighlights` fa `Boolean(p.end)` e in mancanza non
 * mostra nessuna durata invece di inventarne una.
 */
export const tvProgramSchema = z.looseObject({
  start: z.string(),
  end: z.string().nullish(),
  title: z.string(),
  genre: z.string().nullish(),
  description: z.string().nullish(),
});

/**
 * `number` manca del tutto per i canali senza posizione LCN: la edge
 * function scrive `number: ch.number`, e `JSON.stringify` toglie la chiave
 * quando il valore e' `undefined`.
 */
export const tvChannelSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  logo: z.string().nullish(),
  number: z.number().nullish(),
  programs: tolerantArray(tvProgramSchema, "streaming-tv:programs"),
});

export const tvFamilySchema = z.looseObject({
  family: streamingFamilySchema,
  familyLabel: z.string(),
  date: z.string(),
  channels: tolerantArray(tvChannelSchema, "streaming-tv:channels"),
  programsAvailable: z.boolean(),
});

/** `key` e' `TMDB_PROVIDER_ID_TO_KEY[id] ?? null`: non e' detto sia dei nostri. */
export const availableProviderSchema = z.looseObject({
  id: z.number(),
  key: z.string().nullish(),
  name: z.string(),
  logo: z.string().nullish(),
  type: z.enum(["flatrate", "free", "ads"]),
});

/**
 * Obbligatori solo i tre campi senza i quali la card non si disegna:
 * `tmdbId` (identita' e chiave di lista), `type` e `title`. `releaseDate`
 * no — TMDB lo omette per le serie senza data di prima messa in onda, e la
 * UI lo tratta gia' come facoltativo.
 */
export const releaseItemSchema = z.looseObject({
  tmdbId: z.number(),
  type: z.enum(["movie", "tv"]),
  title: z.string(),
  releaseDate: z.string().nullish(),
  poster: z.string().nullish(),
  overview: z.string().nullish(),
  voteAverage: z.number().nullish(),
  deepLink: z.string().nullish(),
  year: z.number().nullish(),
  genres: z.array(z.string()).nullish(),
  availableProviders: z.array(availableProviderSchema).nullish(),
  justWatchLink: z.string().nullish(),
  popularity: z.number().nullish(),
});

/**
 * `effectiveFrom`, `effectiveTo` e `widenedWindow` esistono solo quando la
 * finestra e' stata allargata: il ramo senza chiave TMDB non li scrive.
 */
export const releasesSchema = z.looseObject({
  provider: streamingProviderSchema,
  providerLabel: z.string(),
  providerHomepage: z.string().nullish(),
  date: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
  effectiveFrom: z.string().nullish(),
  effectiveTo: z.string().nullish(),
  widenedWindow: z.boolean().nullish(),
  items: tolerantArray(releaseItemSchema, "streaming-releases:new-today"),
  configured: z.boolean(),
});

/**
 * `provider` e' `null` quando il filtro vale «tutti»; `fallbackRecent` dice
 * che la finestra date non ha prodotto niente e il backend ha ripiegato
 * sulle uscite piu' recenti.
 */
export const releasesItalySchema = z.looseObject({
  region: z.literal("IT"),
  dateFrom: z.string(),
  dateTo: z.string(),
  effectiveFrom: z.string().nullish(),
  effectiveTo: z.string().nullish(),
  widenedWindow: z.boolean().nullish(),
  fallbackRecent: z.boolean().nullish(),
  provider: streamingProviderSchema.nullable(),
  kind: z.enum(["movie", "tv", "all"]),
  sort: z.enum(["release", "popularity"]),
  genreId: z.number().nullable(),
  items: tolerantArray(releaseItemSchema, "streaming-releases:new-italy"),
  configured: z.boolean(),
});

export const castMemberSchema = z.looseObject({
  id: z.number(),
  name: z.string(),
  character: z.string().nullish(),
  profile: z.string().nullish(),
});

export const creditsSchema = z.looseObject({
  type: z.enum(["movie", "tv"]),
  id: z.string(),
  cast: tolerantArray(castMemberSchema, "streaming-releases:credits"),
  configured: z.boolean(),
});

/**
 * Solo `type`, `id` e `configured` sono garantiti: senza chiave TMDB la
 * edge function risponde quei tre campi e nient'altro. Il dialog lo sa
 * gia' — legge ogni campo con `?.` e ripiega sull'item della lista — ma il
 * tipo prometteva il contrario.
 */
export const releaseDetailsSchema = z.looseObject({
  type: z.enum(["movie", "tv"]),
  id: z.string(),
  configured: z.boolean(),
  title: z.string().nullish(),
  originalTitle: z.string().nullish(),
  releaseDate: z.string().nullish(),
  year: z.number().nullish(),
  poster: z.string().nullish(),
  backdrop: z.string().nullish(),
  overview: z.string().nullish(),
  voteAverage: z.number().nullish(),
  voteCount: z.number().nullish(),
  runtime: z.number().nullish(),
  numberOfSeasons: z.number().nullish(),
  numberOfEpisodes: z.number().nullish(),
  genres: z.array(z.string()).nullish(),
  directors: z.array(z.string()).nullish(),
  creators: z.array(z.string()).nullish(),
  cast: z.array(castMemberSchema).nullish(),
  trailerYouTubeKey: z.string().nullish(),
  availableProviders: z.array(availableProviderSchema).nullish(),
  justWatchLink: z.string().nullish(),
});

export type TvProgram = z.infer<typeof tvProgramSchema>;
export type TvChannel = z.infer<typeof tvChannelSchema>;
export type TvFamilyPayload = z.infer<typeof tvFamilySchema>;
export type AvailableProvider = z.infer<typeof availableProviderSchema>;
export type ReleaseItem = z.infer<typeof releaseItemSchema>;
export type ReleasesPayload = z.infer<typeof releasesSchema>;
export type ReleasesItalyPayload = z.infer<typeof releasesItalySchema>;
export type CastMember = z.infer<typeof castMemberSchema>;
export type CreditsPayload = z.infer<typeof creditsSchema>;
export type ReleaseDetailsPayload = z.infer<typeof releaseDetailsSchema>;
