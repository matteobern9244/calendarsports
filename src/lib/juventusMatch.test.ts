import { describe, expect, it } from "vitest";
import type { FootballMatch } from "@/lib/api/schemas";
import { formatGoalDiff, isJuventus, matchResult, matchSide } from "./juventusMatch";

/**
 * Chi e' l'avversario, se la Juventus gioca in casa, se ha vinto: tre
 * deduzioni ripetute in quattro punti della pagina, tutte a partire dai
 * nomi delle squadre come li scrive Sky Sport. Sbagliarle mostra il logo
 * sbagliato o una «V» su una sconfitta, e nessun test lo vedrebbe.
 */

const match = (over: Partial<FootballMatch> = {}): FootballMatch => ({
  id: "serie-a-2026-09-13-juventus-vs-milan",
  homeTeam: "Juventus",
  awayTeam: "Milan",
  competition: "Serie A",
  ...over,
});

describe("isJuventus", () => {
  it("riconosce la squadra a prescindere da maiuscole e suffissi", () => {
    expect(isJuventus("Juventus")).toBe(true);
    expect(isJuventus("JUVENTUS FC")).toBe(true);
    expect(isJuventus("Milan")).toBe(false);
  });

  it("un nome mancante non e' la Juventus", () => {
    expect(isJuventus(undefined)).toBe(false);
    expect(isJuventus(null)).toBe(false);
    expect(isJuventus("")).toBe(false);
  });
});

describe("matchSide", () => {
  it("in casa: l'avversario e' la squadra ospite, col suo logo", () => {
    expect(matchSide(match({ homeLogo: "juve.png", awayLogo: "milan.png" }))).toEqual({
      isJuveHome: true,
      opponent: "Milan",
      opponentLogo: "milan.png",
    });
  });

  it("in trasferta: l'avversario e' la squadra di casa", () => {
    expect(
      matchSide(
        match({ homeTeam: "Inter", awayTeam: "Juventus", homeLogo: "inter.png", awayLogo: null }),
      ),
    ).toEqual({ isJuveHome: false, opponent: "Inter", opponentLogo: "inter.png" });
  });
});

describe("matchResult", () => {
  it("e' V, S o P solo a partita finita", () => {
    expect(matchResult(match({ status: "FullTime", homeScore: 2, awayScore: 1 }))).toBe("V");
    expect(matchResult(match({ status: "FullTime", homeScore: 0, awayScore: 3 }))).toBe("S");
    expect(matchResult(match({ status: "FullTime", homeScore: 1, awayScore: 1 }))).toBe("P");
    expect(matchResult(match({ status: "Scheduled", homeScore: 2, awayScore: 1 }))).toBeNull();
  });

  it("guarda i gol dalla parte giusta anche in trasferta", () => {
    expect(
      matchResult(
        match({
          homeTeam: "Inter",
          awayTeam: "Juventus",
          status: "FullTime",
          homeScore: 0,
          awayScore: 1,
        }),
      ),
    ).toBe("V");
  });

  it("accetta i punteggi come stringhe, che e' come arrivano dallo scraping", () => {
    expect(matchResult(match({ status: "FullTime", homeScore: "3", awayScore: "0" }))).toBe("V");
  });

  it("senza un punteggio non inventa un esito", () => {
    expect(matchResult(match({ status: "FullTime", homeScore: 2, awayScore: null }))).toBeNull();
    expect(matchResult(match({ status: "FullTime" }))).toBeNull();
  });
});

describe("formatGoalDiff", () => {
  it("mette il segno piu' davanti alla differenza reti positiva", () => {
    expect(formatGoalDiff(5)).toBe("+5");
    expect(formatGoalDiff("7")).toBe("+7");
  });

  it("lascia zero e negativi come sono", () => {
    expect(formatGoalDiff(0)).toBe(0);
    expect(formatGoalDiff(-3)).toBe(-3);
  });

  it("un valore assente resta assente", () => {
    expect(formatGoalDiff(null)).toBeNull();
    expect(formatGoalDiff(undefined)).toBeNull();
  });
});
