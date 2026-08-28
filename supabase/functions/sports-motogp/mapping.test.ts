import { describe, expect, it } from "vitest";
import {
  MOTOGP_EVENT_TIMEZONE_BY_COUNTRY,
  italianizeGpName,
  localWallTimeToUtcIso,
} from "./mapping.ts";

// I test precedenti installavano un mock di `fetch` e poi verificavano che il
// mock restituisse le proprie fixture: nessuna asserzione toccava il codice di
// produzione. Uno di essi si chiamava "italianizeGpName mappa correttamente i
// nomi noti" senza mai chiamare `italianizeGpName`. Questi la chiamano.

describe("italianizeGpName", () => {
  it("riconosce il nome del GP dopo aver tolto il prefisso inglese", () => {
    expect(italianizeGpName("GRAND PRIX OF SPAIN", "Spain")).toBe("GP di Spagna");
    expect(italianizeGpName("GRAND PRIX OF THAILAND", "Thailand")).toBe("GP della Thailandia");
  });

  it("regge le preposizioni non inglesi usate da Pulselive", () => {
    expect(italianizeGpName("GRAND PRIX DE FRANCE", "France")).toBe("GP di Francia");
    expect(italianizeGpName("GRAND PRIX DEL BRAZIL", "Brazil")).toBe("GP del Brasile");
  });

  it("regge l'articolo nei nomi composti", () => {
    expect(italianizeGpName("GRAND PRIX OF THE NETHERLANDS", "Netherlands")).toBe("GP d'Olanda");
    expect(italianizeGpName("GRAND PRIX OF THE UNITED STATES", "United States")).toBe(
      "GP delle Americhe",
    );
  });

  it("ripiega sul paese quando il nome dell'evento non e' in tabella", () => {
    // Il nome del circuito non e' una chiave nota: deve salvarlo il paese.
    expect(italianizeGpName("GRAND PRIX OF MISANO", "San Marino")).toBe("GP di San Marino");
  });

  it("compone un nome leggibile quando non conosce ne' l'evento ne' il paese", () => {
    // Mai inventare: se la fonte porta un GP nuovo, il nome resta il suo.
    expect(italianizeGpName("GRAND PRIX OF KAZAKHSTAN", "Kazakhstan")).toBe("GP di Kazakhstan");
  });

  it("non distingue maiuscole e spazi ai bordi", () => {
    expect(italianizeGpName("  grand prix of italy  ", "Italy")).toBe("GP d'Italia");
  });
});

describe("localWallTimeToUtcIso", () => {
  it("converte l'ora del circuito in UTC durante l'ora legale europea", () => {
    // Jerez, 26 aprile: Madrid e' CEST (+2), quindi le 14:00 in pista sono
    // le 12:00 UTC.
    expect(localWallTimeToUtcIso("2026-04-26T14:00", "Europe/Madrid")).toBe(
      "2026-04-26T12:00:00.000Z",
    );
  });

  it("converte un fuso senza ora legale", () => {
    // Buriram, Asia/Bangkok e' +7 tutto l'anno.
    expect(localWallTimeToUtcIso("2026-03-01T15:00", "Asia/Bangkok")).toBe(
      "2026-03-01T08:00:00.000Z",
    );
  });

  it("converte un fuso dell'emisfero sud, dove l'ora legale e' invertita", () => {
    // Phillip Island, 18 ottobre: Melbourne e' gia' in AEDT (+11).
    expect(localWallTimeToUtcIso("2026-10-18T14:00", "Australia/Melbourne")).toBe(
      "2026-10-18T03:00:00.000Z",
    );
  });

  it("converte un fuso a ovest di Greenwich", () => {
    // Austin, 12 aprile: America/Chicago e' CDT (-5).
    expect(localWallTimeToUtcIso("2026-04-12T14:00", "America/Chicago")).toBe(
      "2026-04-12T19:00:00.000Z",
    );
  });

  it("resta corretto a cavallo del cambio d'ora", () => {
    // Il 29 marzo 2026 la Spagna passa da CET a CEST alle 02:00 locali.
    // Un'ora prima e un'ora dopo il salto hanno offset diversi, ed e' il
    // secondo passaggio dell'algoritmo a farlo tornare.
    expect(localWallTimeToUtcIso("2026-03-29T01:00", "Europe/Madrid")).toBe(
      "2026-03-29T00:00:00.000Z",
    );
    expect(localWallTimeToUtcIso("2026-03-29T03:00", "Europe/Madrid")).toBe(
      "2026-03-29T01:00:00.000Z",
    );
  });

  it("accetta anche i secondi", () => {
    expect(localWallTimeToUtcIso("2026-04-26T14:30:45", "Europe/Madrid")).toBe(
      "2026-04-26T12:30:45.000Z",
    );
  });

  it("restituisce l'input invariato se non e' un orario riconoscibile", () => {
    // Meglio propagare il valore della fonte che inventare una data.
    expect(localWallTimeToUtcIso("", "Europe/Rome")).toBe("");
    expect(localWallTimeToUtcIso("da definire", "Europe/Rome")).toBe("da definire");
  });

  it("torna all'ora di partenza se riformattato nel fuso del circuito", () => {
    // Proprieta' generale, indipendente dagli offset scritti a mano sopra.
    const wall = "2026-06-21T14:15";
    for (const timeZone of Object.values(MOTOGP_EVENT_TIMEZONE_BY_COUNTRY)) {
      const utc = localWallTimeToUtcIso(wall, timeZone);
      const back = new Intl.DateTimeFormat("sv-SE", {
        timeZone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(utc));
      expect(`${back.replace(" ", "T")}`).toBe(wall);
    }
  });
});

describe("MOTOGP_EVENT_TIMEZONE_BY_COUNTRY", () => {
  it("usa identificatori IANA che Intl sa risolvere", () => {
    // Un fuso scritto male non solleva: `Intl` lo rifiuta e la conversione
    // salterebbe silenziosamente su UTC.
    for (const [iso, timeZone] of Object.entries(MOTOGP_EVENT_TIMEZONE_BY_COUNTRY)) {
      expect(() => new Intl.DateTimeFormat("en-US", { timeZone }), iso).not.toThrow();
    }
  });

  it("manda San Marino e Italia sullo stesso fuso", () => {
    expect(MOTOGP_EVENT_TIMEZONE_BY_COUNTRY.SM).toBe(MOTOGP_EVENT_TIMEZONE_BY_COUNTRY.IT);
  });
});
