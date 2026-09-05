import { describe, it, expect, vi, afterEach } from "vitest";
import { z } from "zod";
import {
  f1RaceSchema,
  footballCalendarSchema,
  footballMatchSchema,
  matchesOf,
  motogpConstructorStandingsSchema,
  paginatedCalendarOf,
  tennisResultsSchema,
  toNumber,
  tolerantArray,
  tvFamilySchema,
  releasesSchema,
  releasesItalySchema,
  creditsSchema,
  releaseDetailsSchema,
} from "./schemas";

const match = (id: string) => ({
  id,
  homeTeam: "Juventus",
  awayTeam: "Milan",
  competition: "Serie A",
  date: "2099-04-26T18:45:00Z",
  status: "Scheduled",
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toNumber", () => {
  it("accetta numeri e stringhe numeriche", () => {
    expect(toNumber(3)).toBe(3);
    expect(toNumber(0)).toBe(0);
    expect(toNumber("3")).toBe(3);
    expect(toNumber(" 12 ")).toBe(12);
    expect(toNumber("-1")).toBe(-1);
  });

  it("rifiuta tutto cio' che non e' un numero, invece di produrre 0", () => {
    // `Number("")` vale 0: se `toNumber` si limitasse a delegare,
    // un campo vuoto diventerebbe una differenza reti pari a zero.
    expect(toNumber("")).toBeNull();
    expect(toNumber("   ")).toBeNull();
    expect(toNumber("due")).toBeNull();
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
    expect(toNumber(Number.NaN)).toBeNull();
    expect(toNumber(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("rende confrontabili i punteggi che arrivano come stringa", () => {
    // Il confronto diretto fra stringhe direbbe che "2" e' maggiore di
    // "10": e' il bug che `any` teneva nascosto nel calcolo di V/S/P.
    expect("2" > "10").toBe(true);
    expect(toNumber("2")! > toNumber("10")!).toBe(false);
  });
});

describe("tolerantArray", () => {
  const schema = tolerantArray(z.looseObject({ a: z.string() }), "test:endpoint");

  it("tiene gli elementi validi e scarta solo quelli rotti", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(schema.parse([{ a: "uno" }, { a: 2 }, { a: "tre" }])).toEqual([
      { a: "uno" },
      { a: "tre" },
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("test:endpoint");
    expect(warn.mock.calls[0][0]).toContain("1 elementi su 3");
  });

  it("non avvisa quando non scarta niente", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(schema.parse([{ a: "uno" }])).toEqual([{ a: "uno" }]);
    expect(schema.parse([])).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("fallisce solo se il payload non e' una lista", () => {
    expect(() => schema.parse({ items: [] })).toThrow();
  });
});

describe("forma dei payload", () => {
  it("conserva i campi che lo schema non nomina", () => {
    // `looseObject` e non `object`: uno schema che spoglia i campi
    // sconosciuti li farebbe sparire senza che nessuno se ne accorga.
    const parsed = footballMatchSchema.parse({ ...match("x"), campoNuovo: 42 });
    expect(parsed.campoNuovo).toBe(42);
  });

  it("accetta il `round` nullo delle gare F1", () => {
    // `parseInt` senza numero da' NaN, che JSON serializza come null.
    const parsed = f1RaceSchema.parse({
      round: null,
      raceName: "GP",
      circuit: "",
      locality: "",
      country: "",
      date: "2099-05-18",
    });
    expect(parsed.round).toBeNull();
  });
});

describe("le due forme del calendario Juventus", () => {
  const envelope = {
    items: [match("a")],
    total: 1,
    page: 1,
    pageSize: 12,
    totalPages: 1,
    nextUpcomingIndex: 0,
  };

  it("accetta l'array nudo e l'inviluppo impaginato", () => {
    expect(footballCalendarSchema.parse([match("a")])).toHaveLength(1);
    expect(footballCalendarSchema.parse(envelope)).toMatchObject({ total: 1 });
  });

  it("matchesOf da' le partite in entrambi i casi", () => {
    expect(matchesOf([match("a"), match("b")])).toHaveLength(2);
    expect(matchesOf(envelope)).toHaveLength(1);
    expect(matchesOf(undefined)).toEqual([]);
  });

  it("paginatedCalendarOf esiste solo quando la paginazione esiste", () => {
    expect(paginatedCalendarOf(envelope)?.page).toBe(1);
    expect(paginatedCalendarOf([match("a")])).toBeUndefined();
    expect(paginatedCalendarOf(undefined)).toBeUndefined();
  });
});

describe("le due forme dei risultati Sinner", () => {
  it("accetta l'array nudo e l'inviluppo annidato", () => {
    const row = { tournament: "Miami Open", date: "2099-03-29" };
    expect(tennisResultsSchema.parse([row])).toHaveLength(1);
    const parsed = tennisResultsSchema.parse({
      items: [row],
      pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    });
    expect(Array.isArray(parsed) ? null : parsed.pagination.total).toBe(1);
  });
});

describe("campi che portano il nome di un membro di Object.prototype", () => {
  // `JSON.parse` non produce mai un oggetto senza prototipo, quindi la
  // fixture deve nascere davvero da una stringa: costruirla a mano con un
  // literal darebbe lo stesso risultato solo per caso.
  const parse = (json: string) => motogpConstructorStandingsSchema.parse(JSON.parse(json));

  it("non scarta la riga quando `constructor` manca", () => {
    const rows = parse('[{ "position": 1, "team": "Ducati Lenovo Team", "points": 180 }]');
    expect(rows).toHaveLength(1);
    expect(rows[0].team).toBe("Ducati Lenovo Team");
  });

  it("legge il `constructor` vero quando la fonte lo manda", () => {
    const rows = parse(
      '[{ "position": 1, "team": "Ducati Lenovo Team", "points": 180, "constructor": "ducati" }]',
    );
    expect(rows[0].constructor).toBe("ducati");
  });
});

// === Confine streaming ===
//
// I payload qui sotto sono ricopiati da cio' che le edge function
// costruiscono davvero — `supabase/functions/streaming-tv/index.ts:697` e i
// quattro `payload` di `supabase/functions/streaming-releases/index.ts` — e
// non dalle interfacce del frontend, che su due punti erano in ritardo sul
// codice.

describe("il confine di streaming-tv", () => {
  const program = {
    start: "2099-05-05T19:25:00",
    end: "2099-05-05T21:15:00",
    title: "Un film qualunque",
    genre: "Film",
    description: "Trama.",
  };
  const payload = {
    family: "rai",
    familyLabel: "RAI (generalisti)",
    date: "2099-05-05",
    channels: [{ id: "rai-1", name: "Rai 1", logo: null, number: 1, programs: [program] }],
    programsAvailable: true,
  };

  it("accetta il palinsesto di prima serata e conserva i campi non nominati", () => {
    const parsed = tvFamilySchema.parse({ ...payload, fonte: "staseraintv" });
    expect(parsed.channels[0].programs[0].title).toBe("Un film qualunque");
    expect(parsed.fonte).toBe("staseraintv");
  });

  it("accetta il canale senza numero, che `JSON.stringify` toglie dal payload", () => {
    // La edge function scrive `number: ch.number`, e per i canali che non
    // hanno una posizione LCN quel campo non arriva affatto.
    const senzaNumero = {
      ...payload,
      channels: [{ id: "rai-3", name: "Rai 3", logo: null, programs: [] }],
    };
    expect(tvFamilySchema.parse(senzaNumero).channels[0].number).toBeUndefined();
  });

  it("scarta il programma malformato invece di svuotare il canale", () => {
    // E' il livello dove lo scraping si rompe davvero: una riga HH:MM
    // illeggibile non deve costare l'intero palinsesto del canale.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const parsed = tvFamilySchema.parse({
      ...payload,
      channels: [{ ...payload.channels[0], programs: [{ start: "2099-05-05T19:25:00" }, program] }],
    });
    expect(parsed.channels[0].programs).toHaveLength(1);
    expect(parsed.channels[0].programs[0].title).toBe("Un film qualunque");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("scarta il canale malformato invece di svuotare la famiglia", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const parsed = tvFamilySchema.parse({
      ...payload,
      channels: [{ id: 404, name: "Rotto", logo: null, programs: [] }, payload.channels[0]],
    });
    expect(parsed.channels).toHaveLength(1);
    expect(parsed.channels[0].id).toBe("rai-1");
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("il confine di streaming-releases", () => {
  const item = {
    tmdbId: 1234,
    type: "movie",
    title: "Titolo",
    releaseDate: "2099-05-01",
    poster: null,
    overview: "",
    voteAverage: 7.5,
    deepLink: null,
    year: 2099,
    genreIds: [28, 12],
    genres: ["Azione"],
    availableProviders: [],
    justWatchLink: null,
    popularity: 3.2,
  };

  it("conserva `genreIds`, che l'interfaccia scritta a mano non nominava", () => {
    // `normalizeItem` lo produce a ogni elemento: uno schema che spoglia i
    // campi sconosciuti lo farebbe sparire in silenzio.
    const parsed = releasesSchema.parse({
      provider: "netflix",
      providerLabel: "Netflix",
      date: "2099-05-05",
      dateFrom: "2099-05-05",
      dateTo: "2099-05-05",
      items: [item],
      configured: true,
    });
    expect(parsed.items[0].genreIds).toEqual([28, 12]);
  });

  it("accetta la risposta senza chiave TMDB, che omette la finestra effettiva", () => {
    // Ramo `!apiKey`: niente `effectiveFrom`, `effectiveTo`, `widenedWindow`.
    const parsed = releasesSchema.parse({
      provider: "prime",
      providerLabel: "Prime Video",
      providerHomepage: "https://www.primevideo.com",
      date: "2099-05-05",
      dateFrom: "2099-05-05",
      dateTo: "2099-05-05",
      items: [],
      configured: false,
    });
    expect(parsed.configured).toBe(false);
    expect(parsed.widenedWindow).toBeUndefined();
  });

  it("accetta il catalogo Italia degradato, con provider nullo", () => {
    const parsed = releasesItalySchema.parse({
      region: "IT",
      dateFrom: "2099-04-05",
      dateTo: "2099-07-04",
      provider: null,
      kind: "all",
      sort: "release",
      genreId: null,
      items: [],
      configured: false,
    });
    expect(parsed.provider).toBeNull();
    expect(parsed.fallbackRecent).toBeUndefined();
  });

  it("scarta il titolo senza `title` invece di svuotare il catalogo", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const parsed = releasesItalySchema.parse({
      region: "IT",
      dateFrom: "2099-04-05",
      dateTo: "2099-07-04",
      provider: "netflix",
      kind: "all",
      sort: "release",
      genreId: null,
      items: [{ tmdbId: 7, type: "tv" }, item],
      configured: true,
    });
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].tmdbId).toBe(1234);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("accetta il cast vuoto delle due risposte degradate di `credits`", () => {
    const parsed = creditsSchema.parse({ type: "movie", id: "1234", cast: [], configured: false });
    expect(parsed.cast).toEqual([]);
  });

  it("accetta il dettaglio degradato `{ type, id, configured: false }`", () => {
    // Senza chiave TMDB la edge function risponde solo questi tre campi.
    // L'interfaccia scritta a mano ne dichiarava una ventina obbligatori:
    // uno schema ricavato da lei rifiuterebbe una risposta legittima, e il
    // dialog — che legge tutto con `?.` e ripiega sull'item di lista —
    // smetterebbe di aprirsi invece di degradare.
    const parsed = releaseDetailsSchema.parse({ type: "tv", id: "99", configured: false });
    expect(parsed.title).toBeUndefined();
    expect(parsed.cast).toBeUndefined();
    expect(parsed.configured).toBe(false);
  });
});
