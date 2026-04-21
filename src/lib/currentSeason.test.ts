import { describe, expect, it } from "vitest";
import {
  getCurrentSinnerSeason,
  getCurrentF1Season,
  getCurrentMotoGPSeason,
  getCurrentJuventusSeason,
} from "./currentSeason";

describe("currentSeason helpers", () => {
  it("Sinner usa l'anno solare corrente", () => {
    expect(getCurrentSinnerSeason(new Date("2026-04-15T12:00:00Z"))).toBe(2026);
    expect(getCurrentSinnerSeason(new Date("2027-01-02T12:00:00Z"))).toBe(2027);
  });

  it("F1 usa l'anno solare corrente", () => {
    expect(getCurrentF1Season(new Date("2026-01-15T12:00:00Z"))).toBe(2026);
    expect(getCurrentF1Season(new Date("2026-12-31T12:00:00Z"))).toBe(2026);
  });

  it("MotoGP usa l'anno solare corrente", () => {
    expect(getCurrentMotoGPSeason(new Date("2026-08-15T12:00:00Z"))).toBe(2026);
  });

  it("Juventus: aprile 2026 -> 2025 (Serie A 2025/26)", () => {
    expect(getCurrentJuventusSeason(new Date("2026-04-15T12:00:00Z"))).toBe(2025);
  });

  it("Juventus: gennaio 2026 -> 2025", () => {
    expect(getCurrentJuventusSeason(new Date("2026-01-10T12:00:00Z"))).toBe(2025);
  });

  it("Juventus: giugno 2026 -> 2025 (stagione finita ma cutoff luglio)", () => {
    expect(getCurrentJuventusSeason(new Date("2026-06-30T12:00:00Z"))).toBe(2025);
  });

  it("Juventus: luglio 2026 -> 2026 (nuova stagione 2026/27)", () => {
    expect(getCurrentJuventusSeason(new Date("2026-07-01T12:00:00Z"))).toBe(2026);
  });

  it("Juventus: settembre 2026 -> 2026", () => {
    expect(getCurrentJuventusSeason(new Date("2026-09-15T12:00:00Z"))).toBe(2026);
  });
});
