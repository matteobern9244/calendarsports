import { describe, it, expect } from "vitest";
import { formatDuration } from "./dateUtils";

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
