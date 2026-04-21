import { describe, it, expect } from "vitest";
import {
  toRomeDate,
  formatDateIT,
  formatTimeIT,
  formatDateTimeIT,
  formatJuventusDateTime,
  getEventStatus,
} from "./dateUtils";

/**
 * Test di coerenza oraria: tutti gli helper di formattazione devono
 * trattare gli ISO "naive" (senza `Z` e senza offset) come UTC e
 * presentare l'output sempre in fuso `Europe/Rome`. Senza questa
 * policy condivisa il client interpreterebbe la stringa come ora
 * locale, con drift visibile per utenti fuori dal fuso italiano e
 * sui cambi DST.
 */
describe("Coerenza timezone Europe/Rome tra gli helper", () => {
  const naive = "2026-04-21T19:45:00";
  const withZ = "2026-04-21T19:45:00Z";
  const withOffset = "2026-04-21T20:45:00+01:00";

  it("toRomeDate tratta naive come UTC (stesso istante di Z)", () => {
    expect(toRomeDate(naive)?.getTime()).toBe(toRomeDate(withZ)?.getTime());
  });

  it("toRomeDate riconosce gli offset espliciti senza alterarli", () => {
    // 20:45 +01:00 = 19:45 UTC
    expect(toRomeDate(withOffset)?.toISOString()).toBe("2026-04-21T19:45:00.000Z");
  });

  it("formatDateIT, formatTimeIT, formatDateTimeIT, formatJuventusDateTime concordano in estate (CEST, UTC+2)", () => {
    expect(formatDateIT(naive)).toBe("21/04/2026");
    // 19:45 UTC -> 21:45 Europe/Rome (DST attivo)
    expect(formatTimeIT("19:45:00", "2026-04-21")).toBe("21:45");
    expect(formatDateTimeIT(naive)).toBe("21/04/2026 21:45");
    expect(formatJuventusDateTime(naive)).toEqual({
      date: "21/04/2026",
      time: "21:45",
      full: "21/04/2026 21:45",
    });
  });

  it("formattazione coerente in inverno (CET, UTC+1)", () => {
    const winter = "2026-01-15T19:45:00";
    expect(formatDateIT(winter)).toBe("15/01/2026");
    // 19:45 UTC -> 20:45 Europe/Rome (no DST)
    expect(formatTimeIT("19:45:00", "2026-01-15")).toBe("20:45");
    expect(formatDateTimeIT(winter)).toBe("15/01/2026 20:45");
    expect(formatJuventusDateTime(winter).time).toBe("20:45");
  });

  it("naive e Z producono lo stesso output formattato", () => {
    expect(formatDateTimeIT(naive)).toBe(formatDateTimeIT(withZ));
    expect(formatJuventusDateTime(naive)).toEqual(formatJuventusDateTime(withZ));
  });

  it("edge case mezzanotte UTC -> giorno successivo a Roma", () => {
    // 23:30 UTC del 21 aprile = 01:30 del 22 aprile a Roma (CEST)
    const lateUtc = "2026-04-21T23:30:00Z";
    expect(formatJuventusDateTime(lateUtc)).toEqual({
      date: "22/04/2026",
      time: "01:30",
      full: "22/04/2026 01:30",
    });
    expect(formatDateTimeIT(lateUtc)).toBe("22/04/2026 01:30");
    expect(formatDateIT(lateUtc)).toBe("22/04/2026");
  });

  it("getEventStatus tratta naive ISO come UTC (no drift locale)", () => {
    // Evento ampiamente nel futuro: deve risultare "prossimo" sia con
    // naive che con Z, perche' rappresentano lo stesso istante.
    const futureNaive = "2099-04-21T19:45:00";
    const futureZ = "2099-04-21T19:45:00Z";
    expect(getEventStatus(futureNaive)).toBe("prossimo");
    expect(getEventStatus(futureZ)).toBe("prossimo");
    // Evento ampiamente passato.
    expect(getEventStatus("2000-01-01T12:00:00")).toBe("completato");
    expect(getEventStatus("2000-01-01T12:00:00Z")).toBe("completato");
  });

  it("formatTimeIT applica naive=UTC anche quando manca dateStr", () => {
    // Senza data, il fallback interno è 2026-01-01 (CET): 19:45 UTC -> 20:45 Roma.
    expect(formatTimeIT("19:45:00")).toBe("20:45");
  });

  it("input invalidi: stringa vuota / null -> output difensivo", () => {
    expect(toRomeDate("")).toBeNull();
    expect(toRomeDate(null)).toBeNull();
    expect(formatJuventusDateTime("")).toEqual({ date: "—", time: "", full: "—" });
    expect(formatTimeIT("")).toBe("");
    expect(formatTimeIT(null)).toBe("");
  });
});
