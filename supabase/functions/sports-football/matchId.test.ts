import { describe, expect, it } from "vitest";
import { buildMatchId, romeDateKeyOf, slugify } from "./matchId.ts";

// Prima questi test ricopiavano a mano `romeDateKeyOf`, `slugify` e
// `buildMatchId` dentro il file, e giravano sotto `Deno.test` — che nessuno
// eseguiva. Potevano quindi restare verdi mentre la funzione vera cambiava.
// Ora importano il modulo di produzione e girano nel gate.

describe("romeDateKeyOf", () => {
  it("tiene una sera d'estate nello stesso giorno italiano", () => {
    expect(romeDateKeyOf("2026-04-21T19:45:00Z")).toBe("2026-04-21");
  });

  it("sposta al giorno dopo quando l'UTC sfora la mezzanotte di Roma", () => {
    // 23:30 UTC del 21/04 sono le 01:30 del 22/04 a Roma. Con la chiave
    // calcolata in UTC il lookup del broadcaster falliva.
    expect(romeDateKeyOf("2026-04-21T23:30:00Z")).toBe("2026-04-22");
  });

  it("tratta un ISO senza offset come UTC", () => {
    expect(romeDateKeyOf("2026-04-21T23:30:00")).toBe(romeDateKeyOf("2026-04-21T23:30:00Z"));
  });

  it("rispetta un offset esplicito invece di riscriverlo", () => {
    // 01:30 del 22/04 con offset +02:00 e' gia' ora di Roma.
    expect(romeDateKeyOf("2026-04-22T01:30:00+02:00")).toBe("2026-04-22");
  });

  it("distingue ora legale e ora solare", () => {
    // A gennaio Roma e' UTC+1: le 23:30 UTC restano il 15.
    expect(romeDateKeyOf("2026-01-15T23:30:00Z")).toBe("2026-01-16");
    expect(romeDateKeyOf("2026-01-15T22:30:00Z")).toBe("2026-01-15");
  });

  it("ritorna null sugli input che non sono date", () => {
    expect(romeDateKeyOf(null)).toBeNull();
    expect(romeDateKeyOf(undefined)).toBeNull();
    expect(romeDateKeyOf("")).toBeNull();
    expect(romeDateKeyOf("xxx")).toBeNull();
  });
});

describe("slugify", () => {
  it("toglie accenti e punteggiatura", () => {
    expect(slugify("Atlético Madrid")).toBe("atletico-madrid");
    expect(slugify("Inter - Milan!")).toBe("inter-milan");
  });

  it("non lascia trattini agli estremi", () => {
    expect(slugify("  Roma  ")).toBe("roma");
    expect(slugify("---Lazio---")).toBe("lazio");
  });

  it("regge input vuoti senza sollevare", () => {
    expect(slugify("")).toBe("");
  });
});

describe("buildMatchId", () => {
  const skyLink =
    "https://sport.sky.it/calcio/serie-a/partite/2025/giornata-1/juventus-parma/risultato-gol";

  it("preferisce lo slug dell'URL Sky quando c'e'", () => {
    expect(
      buildMatchId(
        { link: skyLink, home: { name: "Juventus" }, away: { name: "Parma" } },
        "Serie A",
      ),
    ).toBe("2025-giornata-1-juventus-parma");
  });

  it("compone un id deterministico quando il link manca", () => {
    expect(
      buildMatchId(
        {
          link: null,
          home: { name: "Juventus" },
          away: { name: "Parma" },
          date: "2025-08-24T18:30:00Z",
        },
        "Serie A",
      ),
    ).toBe("serie-a-2025-08-24-juventus-vs-parma");
  });

  it("regge gli slug di squadre composte", () => {
    expect(
      buildMatchId(
        {
          link:
            "https://sport.sky.it/calcio/champions-league/partite/2025/" +
            "girone-fase-campionato/juventus-borussia-dortmund/risultato-gol",
          home: { name: "Juventus" },
          away: { name: "Borussia Dortmund" },
        },
        "Champions League",
      ),
    ).toBe("2025-girone-fase-campionato-juventus-borussia-dortmund");
  });

  it("dà id diversi a partite diverse", () => {
    const andata = buildMatchId({ link: skyLink }, "Serie A");
    const ritorno = buildMatchId(
      {
        link:
          "https://sport.sky.it/calcio/serie-a/partite/2025/giornata-2/" +
          "genoa-juventus/risultato-gol",
      },
      "Serie A",
    );
    expect(andata).not.toBe(ritorno);
  });

  it("usa la data italiana anche nel fallback, non quella UTC", () => {
    // 23:30 UTC del 21/04 e' il 22/04 a Roma: l'id deve dire 22.
    expect(
      buildMatchId(
        {
          link: null,
          home: { name: "Juventus" },
          away: { name: "Parma" },
          date: "2026-04-21T23:30:00Z",
        },
        "Serie A",
      ),
    ).toBe("serie-a-2026-04-22-juventus-vs-parma");
  });

  it("scrive `unknown` invece di inventare una data quando manca", () => {
    expect(
      buildMatchId({ link: null, home: { name: "Juventus" }, away: { name: "Parma" } }, "Serie A"),
    ).toBe("serie-a-unknown-juventus-vs-parma");
  });
});
