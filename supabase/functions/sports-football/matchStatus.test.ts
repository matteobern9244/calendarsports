import { describe, expect, it } from "vitest";
import { cominciata, finita, visibleScore } from "./matchStatus.ts";

/**
 * Il difetto che questi test descrivono: il calendario azzerava i punteggi
 * finche' la partita non era `FullTime`, quindi durante i novanta minuti
 * l'app non aveva modo di mostrare il risultato — la card in testa, la riga
 * di calendario e l'intestazione del dettaglio dicevano tutte «—» mentre la
 * partita era 2-0.
 */

const partita = (
  status: string | null | undefined,
  casa: number | null,
  ospite: number | null,
) => ({
  status,
  home: { goal: casa },
  away: { goal: ospite },
});

describe("cominciata", () => {
  it("dice di no prima del fischio d'inizio", () => {
    expect(cominciata("PreMatch")).toBe(false);
  });

  it("dice di no quando lo stato manca del tutto", () => {
    expect(cominciata(null)).toBe(false);
    expect(cominciata(undefined)).toBe(false);
    expect(cominciata("")).toBe(false);
  });

  it("dice di no per una partita rinviata o annullata", () => {
    expect(cominciata("Postponed")).toBe(false);
    expect(cominciata("Cancelled")).toBe(false);
  });

  it("dice di si' per ogni stato di gioco", () => {
    expect(cominciata("FirstHalf")).toBe(true);
    expect(cominciata("HalfTime")).toBe(true);
    expect(cominciata("SecondHalf")).toBe(true);
    expect(cominciata("FullTime")).toBe(true);
  });

  /**
   * La lista enumerata e' quella degli stati che **non** sono gioco, mai il
   * contrario: degli stati di gioco la fonte ne pubblica piu' di quanti se ne
   * possano elencare — recuperi, supplementari, rigori — e dimenticarne uno
   * nasconderebbe il risultato di una partita in corso. Dimenticare invece uno
   * stato di attesa mostrerebbe uno 0-0 falso, che e' l'errore piu' grave: per
   * questo l'elenco corto sta dalla parte dell'attesa.
   */
  it("tratta come gioco uno stato mai visto prima", () => {
    expect(cominciata("ExtraTimeFirstHalf")).toBe(true);
    expect(cominciata("Penalties")).toBe(true);
  });
});

describe("visibleScore", () => {
  it("tace prima del fischio d'inizio, anche se la fonte scrive gia' 0-0", () => {
    // Sky pubblica `goal: 0` sulle partite non giocate. Mostrarlo sarebbe un
    // risultato inventato, non un risultato mancante.
    expect(visibleScore(partita("PreMatch", 0, 0))).toEqual({ homeScore: null, awayScore: null });
  });

  it("mostra il punteggio mentre si gioca", () => {
    expect(visibleScore(partita("SecondHalf", 2, 0))).toEqual({ homeScore: 2, awayScore: 0 });
  });

  it("mostra il punteggio all'intervallo", () => {
    expect(visibleScore(partita("HalfTime", 1, 1))).toEqual({ homeScore: 1, awayScore: 1 });
  });

  it("continua a mostrare il punteggio finale", () => {
    expect(visibleScore(partita("FullTime", 3, 2))).toEqual({ homeScore: 3, awayScore: 2 });
  });

  it("non inventa uno zero quando la fonte tace su un lato", () => {
    expect(visibleScore(partita("FirstHalf", 1, null))).toEqual({
      homeScore: null,
      awayScore: null,
    });
    expect(visibleScore({ status: "FirstHalf" })).toEqual({ homeScore: null, awayScore: null });
  });

  it("sopravvive a una partita senza i due lati", () => {
    expect(visibleScore({ status: "FullTime", home: null, away: null })).toEqual({
      homeScore: null,
      awayScore: null,
    });
  });
});

describe("finita", () => {
  it("riconosce il solo stato che chiude la partita", () => {
    expect(finita("FullTime")).toBe(true);
    expect(finita("SecondHalf")).toBe(false);
    expect(finita("PreMatch")).toBe(false);
    expect(finita(null)).toBe(false);
  });
});
