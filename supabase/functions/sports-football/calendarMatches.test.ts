import { describe, expect, it } from "vitest";
import { COMPETITION_NAMES, SERIE_A_COMP_ID, extractTeamMatches } from "./calendarMatches.ts";
import { CALENDARIO_TORNEO_IGNOTO, CALENDARIO_WIDGET } from "./calendarMatches.fixture.ts";
import { resolveTeam } from "../_shared/serieATeams.ts";

/**
 * `extractTeamMatches` non aveva nessun test: viveva dentro `index.ts`, che
 * chiama `Deno.serve` a livello di modulo e non si puo' importare. E' anche il
 * punto in cui il punteggio veniva buttato via — `isFinished ? goal : null` —
 * quindi il difetto segnalato dal proprietario stava esattamente nella riga
 * che nessuno poteva osservare.
 */

const NAPOLI = resolveTeam("napoli");

const partiteDelNapoli = () => extractTeamMatches(CALENDARIO_WIDGET, SERIE_A_COMP_ID, {}, NAPOLI);

describe("extractTeamMatches", () => {
  it("tiene solo le partite della squadra chiesta", () => {
    const partite = partiteDelNapoli();
    expect(partite).toHaveLength(3);
    expect(partite.every((m) => m.homeTeam === "Napoli" || m.awayTeam === "Napoli")).toBe(true);
  });

  it("porta il punteggio di una partita finita", () => {
    const finita = partiteDelNapoli().find((m) => m.status === "FullTime");
    expect(finita).toMatchObject({ homeTeam: "Inter", homeScore: 3, awayScore: 2 });
  });

  it("porta il punteggio **anche** mentre si gioca", () => {
    // Il difetto: qui prima arrivavano due `null`, e la partita in corso era
    // indistinguibile da una non ancora giocata.
    const inCorso = partiteDelNapoli().find((m) => m.status === "SecondHalf");
    expect(inCorso).toMatchObject({ homeTeam: "Lazio", homeScore: 2, awayScore: 0 });
  });

  it("non spaccia per 0-0 lo zero che la fonte scrive prima del fischio d'inizio", () => {
    const daGiocare = partiteDelNapoli().find((m) => m.status === "PreMatch");
    expect(daGiocare).toMatchObject({ homeScore: null, awayScore: null });
  });

  it("conserva l'id di Sky, la giornata e gli stemmi", () => {
    const finita = partiteDelNapoli().find((m) => m.status === "FullTime");
    expect(finita).toMatchObject({
      skyMatchId: "2638147",
      matchday: 3,
      competition: "Serie A",
      homeLogo: "https://static.sky.it/inter.png",
      awayLogo: "https://static.sky.it/napoli.png",
    });
    // L'id nostro nasce dallo slug del link quando c'e': e' quello che finisce
    // negli indirizzi condivisibili, e cambiarlo romperebbe i link salvati.
    expect(finita?.id).toBe("2026-giornata-3-inter-napoli");
  });

  it("attacca l'emittente presa per giornata", () => {
    const partite = extractTeamMatches(CALENDARIO_WIDGET, SERIE_A_COMP_ID, { "3": "DAZN" }, NAPOLI);
    expect(partite.find((m) => m.matchday === 3)?.broadcaster).toBe("DAZN");
  });

  it("attacca l'emittente presa per data italiana quando la giornata non basta", () => {
    // Le 13:00 UTC del 13 settembre sono le 15:00 di Roma, stesso giorno.
    const partite = extractTeamMatches(
      CALENDARIO_WIDGET,
      SERIE_A_COMP_ID,
      { "date:2026-09-13": "Sky Sport" },
      NAPOLI,
    );
    expect(partite.find((m) => m.skyMatchId === "2638157")?.broadcaster).toBe("Sky Sport");
  });

  it("non cerca emittenti fuori dalla Serie A", () => {
    const partite = extractTeamMatches(CALENDARIO_WIDGET, "5", { "3": "DAZN" }, NAPOLI);
    expect(partite.every((m) => m.broadcaster === null)).toBe(true);
  });

  it("ricava il nome di un torneo sconosciuto dallo slug del link", () => {
    const partite = extractTeamMatches(CALENDARIO_TORNEO_IGNOTO, "999", {}, NAPOLI);
    expect(partite[0].competition).toBe("Supercoppa Italiana");
  });

  it("sopravvive a un modello vuoto", () => {
    expect(extractTeamMatches({}, SERIE_A_COMP_ID, {}, NAPOLI)).toEqual([]);
  });

  it("conosce il nome delle tre competizioni principali", () => {
    expect(COMPETITION_NAMES[SERIE_A_COMP_ID]).toBe("Serie A");
  });
});
