import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  formatHour,
  readFilters,
  writeFilters,
  type StreamingFilters,
} from "./streamingFilters";

const read = (qs: string) => readFilters(new URLSearchParams(qs));
const write = (f: StreamingFilters) => writeFilters(f).toString();

describe("readFilters", () => {
  it("legge lo stato scritto nell'indirizzo", () => {
    expect(read("tab=tv&family=mediaset&page=3")).toMatchObject({
      tab: "tv",
      family: "mediaset",
      page: 3,
    });
    expect(read("tab=releases&sort=popularity&genre=35&range=90d&kind=movie")).toMatchObject({
      tab: "releases",
      sort: "popularity",
      genre: 35,
      range: "90d",
      kind: "movie",
    });
  });

  it("ripiega sui default davanti a un valore che non esiste", () => {
    // Sono parametri che chiunque puo' scrivere a mano nella barra degli
    // indirizzi: devono produrre una pagina valida, non uno stato impossibile.
    expect(read("tab=inventata&family=telecapri&range=99d&kind=musical&sort=a-caso")).toEqual(
      DEFAULT_FILTERS,
    );
  });

  it("non si fa dare una pagina zero, negativa o non numerica", () => {
    expect(read("page=0").page).toBe(1);
    expect(read("page=-4").page).toBe(1);
    expect(read("page=abc").page).toBe(1);
    expect(read("page=2.9").page).toBe(2);
  });

  it("accetta come genere solo cifre, perche' finisce in una query TMDB", () => {
    expect(read("genre=35").genre).toBe(35);
    expect(read("genre=35a").genre).toBeNull();
    expect(read("genre=-1").genre).toBeNull();
    expect(read("genre=").genre).toBeNull();
  });
});

describe("writeFilters", () => {
  it("scrive solo i filtri della scheda in vista", () => {
    // Con la scheda TV i filtri delle uscite non hanno senso, e scriverli
    // produrrebbe indirizzi che dichiarano uno stato che non si vede.
    const tv = write({ ...DEFAULT_FILTERS, tab: "tv", family: "sky-sport", genre: 35 });
    expect(tv).toContain("family=sky-sport");
    expect(tv).not.toContain("genre");

    const releases = write({ ...DEFAULT_FILTERS, tab: "releases", genre: 35, family: "sky-sport" });
    expect(releases).toContain("genre=35");
    expect(releases).not.toContain("family");
  });

  it("tace sui valori di default, cosi' l'indirizzo resta corto", () => {
    expect(write({ ...DEFAULT_FILTERS, tab: "releases" })).toBe("tab=releases");
  });
});

describe("readFilters e writeFilters sono l'una l'inversa dell'altra", () => {
  // E' la proprieta' che conta davvero: un link condiviso deve riportare
  // esattamente allo stato che chi l'ha copiato stava guardando.
  const cases: StreamingFilters[] = [
    { ...DEFAULT_FILTERS },
    { ...DEFAULT_FILTERS, tab: "tv", family: "discovery", page: 4 },
    {
      ...DEFAULT_FILTERS,
      tab: "releases",
      range: "90d",
      kind: "tv",
      sort: "popularity",
      genre: 878,
      italyProvider: "netflix",
      page: 2,
    },
  ];

  for (const original of cases) {
    it(`torna identico: ${write(original) || "(indirizzo vuoto)"}`, () => {
      const roundTripped = readFilters(writeFilters(original));
      // I filtri dell'altra scheda non vengono scritti, quindi tornano ai
      // default: il confronto e' sui campi che quella scheda usa davvero.
      const relevant =
        original.tab === "tv"
          ? (["tab", "family", "page"] as const)
          : (["tab", "range", "kind", "sort", "genre", "italyProvider", "page"] as const);
      for (const key of relevant) {
        expect(roundTripped[key]).toEqual(original[key]);
      }
    });
  }
});

describe("formatHour", () => {
  it("formatta in ora di Roma, e legge un ISO senza Z come UTC", () => {
    expect(formatHour("2026-04-21T19:30:00.000Z")).toBe("21:30");
    // Senza `Z` vale UTC lo stesso: e' la policy di tutta l'app.
    expect(formatHour("2026-04-21T19:30:00")).toBe("21:30");
  });

  it("restituisce un trattino invece di 'Invalid Date'", () => {
    expect(formatHour("non una data")).toBe("—");
    expect(formatHour("")).toBe("—");
  });
});
