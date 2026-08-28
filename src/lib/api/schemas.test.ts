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
