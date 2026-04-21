import { describe, it, expect } from "vitest";
import { formatDuration, formatDurationSpoken } from "./dateUtils";

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
