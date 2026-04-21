import { describe, it, expect } from "vitest";
import { formatDuration, formatDurationSpoken, toRomeDate, formatJuventusDateTime } from "./dateUtils";

describe("formatDuration", () => {
  describe("valori invalidi -> stringa vuota", () => {
    it("ritorna '' per 0", () => {
      expect(formatDuration(0)).toBe("");
    });
    it("ritorna '' per durata negativa", () => {
      expect(formatDuration(-15)).toBe("");
    });
    it("ritorna '' per NaN", () => {
      expect(formatDuration(Number.NaN)).toBe("");
    });
    it("ritorna '' per Infinity", () => {
      expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("");
      expect(formatDuration(Number.NEGATIVE_INFINITY)).toBe("");
    });
  });

  describe("durate sotto l'ora -> minuti", () => {
    it("formatta 1 minuto", () => {
      expect(formatDuration(1)).toBe("1 min");
    });
    it("formatta 45 minuti", () => {
      expect(formatDuration(45)).toBe("45 min");
    });
    it("formatta 59 minuti (limite)", () => {
      expect(formatDuration(59)).toBe("59 min");
    });
  });

  describe("durate intere in ore -> solo ore", () => {
    it("formatta 60 minuti come '1h' esatto", () => {
      expect(formatDuration(60)).toBe("1h");
    });
    it("formatta 120 minuti come '2h' esatto", () => {
      expect(formatDuration(120)).toBe("2h");
    });
    it("formatta 180 minuti come '3h' esatto", () => {
      expect(formatDuration(180)).toBe("3h");
    });
  });

  describe("durate miste ore + minuti", () => {
    it("formatta 85 minuti come '1h 25 min'", () => {
      expect(formatDuration(85)).toBe("1h 25 min");
    });
    it("formatta 90 minuti come '1h 30 min'", () => {
      expect(formatDuration(90)).toBe("1h 30 min");
    });
    it("formatta 125 minuti come '2h 5 min'", () => {
      expect(formatDuration(125)).toBe("2h 5 min");
    });
  });

  describe("valori frazionari -> arrotondamento", () => {
    it("arrotonda 44.4 a 44 min", () => {
      expect(formatDuration(44.4)).toBe("44 min");
    });
    it("arrotonda 59.6 a 60 -> '1h'", () => {
      expect(formatDuration(59.6)).toBe("1h");
    });
  });
});

describe("formatDurationSpoken", () => {
  it("ritorna '' per 0", () => {
    expect(formatDurationSpoken(0)).toBe("");
  });
  it("ritorna '' per valori negativi", () => {
    expect(formatDurationSpoken(-5)).toBe("");
  });
  it("ritorna '' per NaN", () => {
    expect(formatDurationSpoken(Number.NaN)).toBe("");
  });
  it("usa singolare per 1 minuto", () => {
    expect(formatDurationSpoken(1)).toBe("1 minuto");
  });
  it("usa plurale per 45 minuti", () => {
    expect(formatDurationSpoken(45)).toBe("45 minuti");
  });
  it("usa singolare per 1 ora esatta (60 min)", () => {
    expect(formatDurationSpoken(60)).toBe("1 ora");
  });
  it("usa plurale per 2 ore esatte (120 min)", () => {
    expect(formatDurationSpoken(120)).toBe("2 ore");
  });
  it("compone ore e minuti (65 min)", () => {
    expect(formatDurationSpoken(65)).toBe("1 ora e 5 minuti");
  });
  it("compone ore e minuti (90 min)", () => {
    expect(formatDurationSpoken(90)).toBe("1 ora e 30 minuti");
  });
  it("compone ore e minuti (125 min)", () => {
    expect(formatDurationSpoken(125)).toBe("2 ore e 5 minuti");
  });
  it("usa singolare minuto in composizione (61 min)", () => {
    expect(formatDurationSpoken(61)).toBe("1 ora e 1 minuto");
  });
});

describe("toRomeDate", () => {
  it("accetta ISO con Z", () => {
    const d = toRomeDate("2026-04-21T19:45:00Z");
    expect(d).toBeInstanceOf(Date);
    expect(d!.toISOString()).toBe("2026-04-21T19:45:00.000Z");
  });
  it("accetta ISO con offset +01:00", () => {
    const d = toRomeDate("2026-04-21T20:45:00+01:00");
    expect(d).toBeInstanceOf(Date);
    expect(d!.toISOString()).toBe("2026-04-21T19:45:00.000Z");
  });
  it("tratta stringa naive come UTC", () => {
    const naive = toRomeDate("2026-04-21T19:45:00");
    const z = toRomeDate("2026-04-21T19:45:00Z");
    expect(naive).toBeInstanceOf(Date);
    expect(naive!.getTime()).toBe(z!.getTime());
  });
  it("ritorna null per input vuoti o invalidi", () => {
    expect(toRomeDate("")).toBeNull();
    expect(toRomeDate(null)).toBeNull();
    expect(toRomeDate(undefined)).toBeNull();
    expect(toRomeDate("non-una-data")).toBeNull();
  });
  it("accetta oggetti Date validi", () => {
    const orig = new Date("2026-04-21T19:45:00Z");
    expect(toRomeDate(orig)).toBe(orig);
  });
});

describe("formatJuventusDateTime", () => {
  it("formatta in ora Roma (estate, UTC+2)", () => {
    const result = formatJuventusDateTime("2026-04-21T19:45:00Z");
    expect(result).toEqual({ date: "21/04/2026", time: "21:45", full: "21/04/2026 21:45" });
  });
  it("formatta in ora Roma (inverno, UTC+1)", () => {
    const result = formatJuventusDateTime("2026-01-15T19:45:00Z");
    expect(result.time).toBe("20:45");
    expect(result.date).toBe("15/01/2026");
  });
  it("naive senza offset = stesso risultato della Z", () => {
    const naive = formatJuventusDateTime("2026-04-21T19:45:00");
    const z = formatJuventusDateTime("2026-04-21T19:45:00Z");
    expect(naive).toEqual(z);
  });
  it("ritorna placeholder per input nullo", () => {
    expect(formatJuventusDateTime(null)).toEqual({ date: "—", time: "", full: "—" });
    expect(formatJuventusDateTime(undefined)).toEqual({ date: "—", time: "", full: "—" });
    expect(formatJuventusDateTime("")).toEqual({ date: "—", time: "", full: "—" });
  });
  it("gestisce edge case mezzanotte UTC -> giorno dopo a Roma", () => {
    const result = formatJuventusDateTime("2026-04-21T23:30:00Z");
    expect(result.date).toBe("2026-04-22".split("-").reverse().join("/"));
    expect(result.time).toBe("01:30");
  });
});
