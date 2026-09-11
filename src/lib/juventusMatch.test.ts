import { describe, expect, it } from "vitest";
import type { FootballMatch } from "@/lib/api/schemas";
import { formatGoalDiff, matchResult, matchSide } from "./juventusMatch";
import { resolveTeam } from "@/lib/serieATeams";

/**
 * Chi e' l'avversario, se si gioca in casa, se si ha vinto: tre deduzioni
 * ripetute in quattro punti della pagina, tutte a partire dai nomi delle
 * squadre come li scrive Sky Sport. Sbagliarle mostra il logo sbagliato o una
 * «V» su una sconfitta, e nessun test lo vedrebbe.
 *
 * Il punto di vista e' un **parametro**, non la Juventus: la stessa partita
 * vista dal calendario del Napoli ha l'avversario dall'altra parte e il
 * risultato rovesciato.
 */

const JUVE = resolveTeam("juventus");
const NAPOLI = resolveTeam("napoli");

const match = (over: Partial<FootballMatch> = {}): FootballMatch => ({
  id: "serie-a-2026-09-13-juventus-vs-milan",
  homeTeam: "Juventus",
  awayTeam: "Milan",
  competition: "Serie A",
  ...over,
});

describe("matchSide", () => {
  it("in casa: l'avversario e' la squadra ospite, col suo logo", () => {
    expect(matchSide(match({ homeLogo: "juve.png", awayLogo: "milan.png" }), JUVE)).toEqual({
      isHome: true,
      opponent: "Milan",
      opponentLogo: "milan.png",
    });
  });

  it("in trasferta: l'avversario e' la squadra di casa", () => {
    expect(
      matchSide(
        match({ homeTeam: "Inter", awayTeam: "Juventus", homeLogo: "inter.png", awayLogo: null }),
        JUVE,
      ),
    ).toEqual({ isHome: false, opponent: "Inter", opponentLogo: "inter.png" });
  });

  /**
   * La stessa partita, guardata dall'altro calendario. E' il caso che rende
   * la squadra un parametro invece di una costante: senza, la pagina del
   * Napoli chiamerebbe «avversario» il Napoli stesso.
   */
  it("la stessa partita cambia lato a seconda di chi la guarda", () => {
    const scontro = match({ homeTeam: "Juventus", awayTeam: "Napoli", awayLogo: "napoli.png" });
    expect(matchSide(scontro, JUVE).opponent).toBe("Napoli");
    expect(matchSide(scontro, NAPOLI)).toEqual({
      isHome: false,
      opponent: "Juventus",
      opponentLogo: undefined,
    });
  });

  /**
   * Il confronto e' per uguaglianza esatta sul nome normalizzato, mai per
   * sottostringa. Il caso non e' inventato: la Juventus Next Gen gioca in
   * Serie C e puo' comparire negli elenchi di coppa. Un `includes("juventus")`
   * direbbe che in casa c'e' la prima squadra, e la pagina finirebbe per
   * chiamare «avversario» la Juventus stessa.
   */
  it("una squadra che si chiama quasi come quella scelta non e' quella scelta", () => {
    const coppa = match({ homeTeam: "Juventus Next Gen", awayTeam: "Juventus" });
    expect(matchSide(coppa, JUVE)).toMatchObject({
      isHome: false,
      opponent: "Juventus Next Gen",
    });
  });
});

describe("matchResult", () => {
  it("e' V, S o P solo a partita finita", () => {
    expect(matchResult(match({ status: "FullTime", homeScore: 2, awayScore: 1 }), JUVE)).toBe("V");
    expect(matchResult(match({ status: "FullTime", homeScore: 0, awayScore: 3 }), JUVE)).toBe("S");
    expect(matchResult(match({ status: "FullTime", homeScore: 1, awayScore: 1 }), JUVE)).toBe("P");
    expect(
      matchResult(match({ status: "Scheduled", homeScore: 2, awayScore: 1 }), JUVE),
    ).toBeNull();
  });

  it("guarda i gol dalla parte giusta anche in trasferta", () => {
    expect(
      matchResult(
        match({
          homeTeam: "Inter",
          awayTeam: "Juventus",
          status: "FullTime",
          homeScore: 0,
          awayScore: 2,
        }),
        JUVE,
      ),
    ).toBe("V");
  });

  /** Una vittoria per una e' una sconfitta per l'altra: stesso tabellino. */
  it("lo stesso tabellino e' V per una squadra e S per l'altra", () => {
    const finita = match({
      homeTeam: "Juventus",
      awayTeam: "Napoli",
      status: "FullTime",
      homeScore: 2,
      awayScore: 1,
    });
    expect(matchResult(finita, JUVE)).toBe("V");
    expect(matchResult(finita, NAPOLI)).toBe("S");
  });

  it("i punteggi come stringhe contano come numeri", () => {
    expect(matchResult(match({ status: "FullTime", homeScore: "3", awayScore: "0" }), JUVE)).toBe(
      "V",
    );
  });

  it("un punteggio mancante non produce un risultato inventato", () => {
    expect(
      matchResult(match({ status: "FullTime", homeScore: 2, awayScore: null }), JUVE),
    ).toBeNull();
    expect(matchResult(match({ status: "FullTime" }), JUVE)).toBeNull();
  });
});

describe("formatGoalDiff", () => {
  it("mette il segno solo davanti alle differenze positive", () => {
    expect(formatGoalDiff(7)).toBe("+7");
    expect(formatGoalDiff(0)).toBe(0);
    expect(formatGoalDiff(-3)).toBe(-3);
    expect(formatGoalDiff(null)).toBeNull();
  });
});
