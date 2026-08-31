import { describe, expect, it } from "vitest";
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  buildMonthGrid,
  formatDayHeaderIT,
  romeDayKey,
  romeHHMM,
  toRomeYMD,
  ymdKey,
} from "./calendarGrid";

describe("buildMonthGrid", () => {
  it("rende sei settimane da sette giorni, sempre", () => {
    // Sei righe fisse e non variabili: un mese che ne richiede cinque e uno
    // che ne richiede sei non devono far saltare l'altezza della griglia.
    for (const [y, m] of [
      [2026, 0],
      [2026, 1],
      [2026, 8],
      [2024, 1],
    ] as const) {
      const grid = buildMonthGrid(y, m);
      expect(grid).toHaveLength(6);
      for (const week of grid) expect(week).toHaveLength(7);
    }
  });

  it("comincia di lunedi', come le etichette della testata", () => {
    // `getUTCDay()` conta da domenica; la griglia italiana parte da lunedi'.
    // E' la conversione piu' facile da sbagliare di un giorno.
    expect(WEEKDAY_LABELS[0]).toBe("LUN");
    // 1 settembre 2026 e' un martedi': la griglia deve aprirsi con lunedi' 31.
    const grid = buildMonthGrid(2026, 8);
    expect(grid[0][0]).toEqual({ y: 2026, m: 8, d: 31 });
    expect(grid[0][1]).toEqual({ y: 2026, m: 9, d: 1 });
  });

  it("quando il mese comincia di lunedi' non antepone una settimana vuota", () => {
    // 1 giugno 2026 e' un lunedi': la prima cella e' il primo del mese, non
    // il 25 maggio.
    expect(buildMonthGrid(2026, 5)[0][0]).toEqual({ y: 2026, m: 6, d: 1 });
  });

  it("regge il cambio d'anno in coda e in testa", () => {
    const dicembre = buildMonthGrid(2026, 11);
    const ultimaCella = dicembre[dicembre.length - 1][6];
    expect(ultimaCella.y).toBe(2027);

    const gennaio = buildMonthGrid(2026, 0);
    expect(gennaio[0][0].y).toBe(2025);
  });

  it("conosce il 29 febbraio degli anni bisestili", () => {
    const giorni = buildMonthGrid(2024, 1).flat();
    expect(giorni).toContainEqual({ y: 2024, m: 2, d: 29 });
    expect(buildMonthGrid(2026, 1).flat()).not.toContainEqual({ y: 2026, m: 2, d: 29 });
  });

  it("non salta e non ripete nessun giorno", () => {
    // Ogni cella dev'essere il giorno successivo alla precedente: e' la
    // proprieta' che coglierebbe un errore di aritmetica su fusi o ore legali.
    const giorni = buildMonthGrid(2026, 2).flat(); // marzo, con il cambio ora
    for (let i = 1; i < giorni.length; i++) {
      const prev = Date.UTC(giorni[i - 1].y, giorni[i - 1].m - 1, giorni[i - 1].d);
      const cur = Date.UTC(giorni[i].y, giorni[i].m - 1, giorni[i].d);
      expect(cur - prev).toBe(24 * 60 * 60 * 1000);
    }
  });
});

describe("chiavi e formattazione", () => {
  it("ymdKey impagina con lo zero davanti", () => {
    expect(ymdKey({ y: 2026, m: 3, d: 7 })).toBe("2026-03-07");
    expect(ymdKey({ y: 2026, m: 12, d: 25 })).toBe("2026-12-25");
  });

  it("romeDayKey mette l'evento nel giorno italiano, non in quello UTC", () => {
    // 22:30 UTC del 20 giugno e' gia' il 21 giugno a Roma (UTC+2 d'estate).
    // Sbagliarlo sposta l'evento di un giorno nella griglia.
    expect(romeDayKey("2026-06-20T22:30:00Z")).toBe("2026-06-21");
    // D'inverno l'offset scende a +1, quindi il confine si sposta di un'ora:
    // le 23:30 UTC sono gia' le 00:30 del 21, le 22:30 ancora il 20.
    expect(romeDayKey("2026-12-20T23:30:00Z")).toBe("2026-12-21");
    expect(romeDayKey("2026-12-20T22:30:00Z")).toBe("2026-12-20");
  });

  it("romeDayKey restituisce null su una data illeggibile", () => {
    expect(romeDayKey("non una data")).toBeNull();
    expect(romeDayKey("")).toBeNull();
  });

  it("romeHHMM dice l'ora di Roma", () => {
    expect(romeHHMM("2026-06-20T19:00:00Z")).toBe("21:00"); // ora legale
    expect(romeHHMM("2026-12-20T19:00:00Z")).toBe("20:00"); // ora solare
    expect(romeHHMM("non una data")).toBe("");
  });

  it("toRomeYMD legge la data nel fuso italiano", () => {
    expect(toRomeYMD(new Date(Date.UTC(2026, 5, 20, 22, 30)))).toEqual({ y: 2026, m: 6, d: 21 });
  });

  it("formatDayHeaderIT scrive la testata in italiano", () => {
    const testata = formatDayHeaderIT({ y: 2026, m: 6, d: 21 });
    expect(testata.toLowerCase()).toContain("giugno");
    expect(MONTH_LABELS).toHaveLength(12);
  });
});
