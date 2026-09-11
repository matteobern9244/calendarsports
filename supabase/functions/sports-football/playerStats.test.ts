import { describe, expect, it } from "vitest";
import { parsePlayerStats, statsPerStagione } from "./playerStats.ts";
import {
  DIFENSORE_HTML,
  PORTIERE_HTML,
  SENZA_BLOCCO_HTML,
  SENZA_STATISTICHE_HTML,
} from "./playerStats.fixture.ts";

describe("parsePlayerStats", () => {
  it("legge la Serie A del giocatore di movimento", () => {
    const voci = parsePlayerStats(DIFENSORE_HTML);
    const serieA = voci.find((v) => v.competitionId === "21")!;
    expect(serieA.seasonYear).toBe("2026");
    expect(serieA.season).toBe("2026/2027");
    expect(serieA.competition).toBe("Serie A");
    expect(serieA.stats.GamesPlayed).toBe(3);
    expect(serieA.stats.Starts).toBe(3);
    expect(serieA.stats.TimePlayed).toBe(270);
    expect(serieA.stats.Recoveries).toBe(10);
  });

  /**
   * Il caso che giustifica due fixture. Un portiere non ha `Starts` ne'
   * `Goals`: se il parser li riempisse di zeri, la pagina direbbe che il
   * portiere non e' mai partito titolare — un numero falso al posto di
   * un'assenza vera.
   */
  it("il portiere ha le sue statistiche, e non ha quelle che non gli appartengono", () => {
    const serieA = parsePlayerStats(PORTIERE_HTML).find((v) => v.competitionId === "21")!;
    expect(serieA.stats.SavesMade).toBe(11);
    expect(serieA.stats.Cleansheets).toBe(1);
    expect(serieA.stats.GoalsConceded).toBe(5);
    expect(serieA.stats.Starts).toBeUndefined();
    expect(serieA.stats.Goals).toBeUndefined();
    expect(serieA.stats.Assists).toBeUndefined();
  });

  it("i grafici riusciti/sbagliati restano coppie, non diventano un totale", () => {
    const serieA = parsePlayerStats(DIFENSORE_HTML).find((v) => v.competitionId === "21")!;
    const passaggi = serieA.charts.find((c) => c.id === "TotalPasses")!;
    expect(passaggi).toEqual({ id: "TotalPasses", success: 165, failure: 23 });
    // Il portiere ha un grafico solo: nessuno deve aspettarsene tre.
    const portiere = parsePlayerStats(PORTIERE_HTML).find((v) => v.competitionId === "21")!;
    expect(portiere.charts).toHaveLength(1);
  });

  it("tiene tutte le competizioni, ognuna con il suo id", () => {
    const voci = parsePlayerStats(PORTIERE_HTML);
    expect(voci.map((v) => v.competitionId)).toContain("5");
    expect(voci.find((v) => v.competitionId === "5")!.competition).toBe("Champions League");
  });

  it("una scheda senza statistiche non e' un errore: e' un elenco vuoto", () => {
    expect(parsePlayerStats(SENZA_STATISTICHE_HTML)).toEqual([]);
  });

  it("una pagina senza il blocco JSON non fa esplodere niente", () => {
    expect(parsePlayerStats(SENZA_BLOCCO_HTML)).toEqual([]);
  });
});

describe("statsPerStagione", () => {
  it("tiene solo la stagione chiesta e mette la Serie A per prima", () => {
    const voci = statsPerStagione(parsePlayerStats(PORTIERE_HTML), "2026");
    expect(voci.map((v) => v.competition)).toEqual(["Serie A", "Champions League"]);
  });

  /**
   * Il ritaglio del portiere contiene anche gli Europei 2024. Mostrarli sotto
   * il titolo della stagione in corso sarebbe un dato vecchio spacciato per
   * attuale: la regola che `AGENTS.md` mette prima di tutte.
   */
  it("scarta le stagioni che non sono quella chiesta", () => {
    const voci = statsPerStagione(parsePlayerStats(PORTIERE_HTML), "2026");
    expect(voci.every((v) => v.seasonYear === "2026")).toBe(true);
    expect(statsPerStagione(parsePlayerStats(PORTIERE_HTML), "2099")).toEqual([]);
  });
});
