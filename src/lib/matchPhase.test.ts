import { describe, expect, it } from "vitest";
import { faseDaStato, matchPhase, matchScore } from "./matchPhase";

/**
 * I casi qui sotto nascono da due schermate: durante Lazio-Milan la card in
 * testa alla pagina squadra diceva «PROSSIMA PARTITA» mentre accanto
 * lampeggiava «IN DIRETTA · da 54m», e il punteggio non si vedeva da nessuna
 * parte. Due componenti montati a tre centimetri di distanza rispondevano alla
 * stessa domanda con due criteri che non si parlavano.
 *
 * `now` e' un parametro e non l'orologio globale: la decisione si prova senza
 * montare niente e senza combattere con i timer.
 */

const ORA = (iso: string) => Date.parse(iso);
const INIZIO = "2026-09-12T16:00:00Z";

describe("faseDaStato", () => {
  it("legge la fase che la fonte dichiara", () => {
    expect(faseDaStato("PreMatch")).toBe("prepartita");
    expect(faseDaStato("FullTime")).toBe("finita");
    expect(faseDaStato("FirstHalf")).toBe("in-corso");
    expect(faseDaStato("HalfTime")).toBe("in-corso");
    expect(faseDaStato("SecondHalf")).toBe("in-corso");
  });

  it("tratta come gioco uno stato mai visto prima", () => {
    // L'elenco enumerato e' quello degli stati di attesa: gli stati di gioco
    // sono troppi per essere elencati, e uno dimenticato nasconderebbe una
    // partita in corso.
    expect(faseDaStato("ExtraTimeFirstHalf")).toBe("in-corso");
    expect(faseDaStato("Penalties")).toBe("in-corso");
  });

  it("resta in silenzio quando la fonte non dice niente", () => {
    expect(faseDaStato(null)).toBeNull();
    expect(faseDaStato(undefined)).toBeNull();
    expect(faseDaStato("")).toBeNull();
  });
});

describe("matchPhase", () => {
  it("prima del calcio d'inizio e' prepartita, e lo dice la fonte", () => {
    const m = { status: "PreMatch", date: INIZIO };
    expect(matchPhase(m, ORA("2026-09-12T15:00:00Z"))).toEqual({
      fase: "prepartita",
      origine: "fonte",
    });
  });

  it("quando la fonte dichiara il gioco, vince la fonte", () => {
    const m = { status: "SecondHalf", date: INIZIO };
    expect(matchPhase(m, ORA("2026-09-12T16:54:00Z"))).toEqual({
      fase: "in-corso",
      origine: "fonte",
    });
  });

  /**
   * Il difetto fotografato dal proprietario. Il widget del calendario puo'
   * restare fermo su `PreMatch` mentre si gioca: se l'unica evidenza fosse la
   * fonte, la card continuerebbe a promettere una partita che e' gia'
   * cominciata da cinquantaquattro minuti.
   */
  it("se il calcio d'inizio e' passato ma la fonte non se n'e' accorta, decide l'orologio", () => {
    const m = { status: "PreMatch", date: INIZIO };
    expect(matchPhase(m, ORA("2026-09-12T16:54:00Z"))).toEqual({
      fase: "in-corso",
      origine: "orologio",
    });
  });

  it("l'orologio non riporta mai indietro una partita che la fonte da' per finita", () => {
    // Una partita sospesa al 20' e' finita, anche se l'orologio direbbe che
    // si sta ancora giocando.
    const m = { status: "FullTime", date: INIZIO };
    expect(matchPhase(m, ORA("2026-09-12T16:20:00Z"))).toEqual({
      fase: "finita",
      origine: "fonte",
    });
  });

  it("l'orologio frena una fonte che annuncia il gioco prima del fischio d'inizio", () => {
    // Una partita non puo' essere in corso prima di cominciare: senza questo
    // freno, uno stato sbagliato a monte accenderebbe «IN DIRETTA» su una
    // partita fra tre mesi.
    const m = { status: "SecondHalf", date: INIZIO };
    expect(matchPhase(m, ORA("2026-09-12T14:00:00Z"))).toEqual({
      fase: "prepartita",
      origine: "orologio",
    });
  });

  it("oltre la finestra presunta una partita mai aggiornata si considera conclusa", () => {
    const m = { status: "PreMatch", date: INIZIO };
    expect(matchPhase(m, ORA("2026-09-12T20:00:00Z"))).toEqual({
      fase: "finita",
      origine: "orologio",
    });
  });

  it("senza stato decide solo l'orologio", () => {
    const m = { date: INIZIO };
    expect(matchPhase(m, ORA("2026-09-12T15:00:00Z")).fase).toBe("prepartita");
    expect(matchPhase(m, ORA("2026-09-12T17:00:00Z")).fase).toBe("in-corso");
    expect(matchPhase(m, ORA("2026-09-12T20:00:00Z")).fase).toBe("finita");
  });

  it("senza data ne' stato non inventa niente: prepartita", () => {
    expect(matchPhase({}, ORA("2026-09-12T17:00:00Z")).fase).toBe("prepartita");
  });

  /**
   * La difesa che e' costata di piu' a questo repository: un ISO senza `Z`
   * viene da un provider che pubblica in UTC, e letto come ora locale sfasa di
   * due ore in estate — abbastanza per dire «in corso» su una partita che
   * comincia fra un'ora e mezza.
   */
  it("legge come UTC un ISO senza fuso", () => {
    const conZ = { status: "PreMatch", date: "2026-09-12T16:00:00Z" };
    const senzaZ = { status: "PreMatch", date: "2026-09-12T16:00:00" };
    const adesso = ORA("2026-09-12T15:30:00Z");
    expect(matchPhase(senzaZ, adesso)).toEqual(matchPhase(conZ, adesso));
  });
});

describe("matchScore", () => {
  it("mostra il punteggio di una partita finita", () => {
    const m = { status: "FullTime", date: INIZIO, homeScore: 2, awayScore: 2 };
    expect(matchScore(m, ORA("2026-09-13T08:00:00Z"))).toEqual({ home: 2, away: 2 });
  });

  it("mostra il punteggio mentre si gioca", () => {
    const m = { status: "SecondHalf", date: INIZIO, homeScore: 2, awayScore: 0 };
    expect(matchScore(m, ORA("2026-09-12T16:54:00Z"))).toEqual({ home: 2, away: 0 });
  });

  it("converte i numeri che la fonte manda come stringhe", () => {
    const m = { status: "FullTime", date: INIZIO, homeScore: "3", awayScore: "0" };
    expect(matchScore(m, ORA("2026-09-13T08:00:00Z"))).toEqual({ home: 3, away: 0 });
  });

  it("non mostra niente prima del fischio d'inizio, nemmeno uno 0-0", () => {
    const m = { status: "PreMatch", date: INIZIO, homeScore: 0, awayScore: 0 };
    expect(matchScore(m, ORA("2026-09-12T15:00:00Z"))).toBeNull();
  });

  /**
   * La regola che tiene insieme tutto: l'orologio decide **l'etichetta**, mai
   * il punteggio. Quando la fonte e' ferma su `PreMatch` a partita iniziata, la
   * card dice «in corso» e non mostra nessun risultato — invece di mostrare
   * uno 0-0 che nessuno ha giocato.
   */
  it("non deduce mai un punteggio dall'orologio", () => {
    const m = { status: "PreMatch", date: INIZIO, homeScore: 0, awayScore: 0 };
    expect(matchScore(m, ORA("2026-09-12T16:54:00Z"))).toBeNull();
  });

  it("non mostra un punteggio annunciato prima del calcio d'inizio", () => {
    const m = { status: "SecondHalf", date: INIZIO, homeScore: 1, awayScore: 0 };
    expect(matchScore(m, ORA("2026-09-12T14:00:00Z"))).toBeNull();
  });

  it("tace se uno dei due numeri manca: un «2 – ?» non e' un risultato parziale", () => {
    const m = { status: "FullTime", date: INIZIO, homeScore: 2, awayScore: null };
    expect(matchScore(m, ORA("2026-09-13T08:00:00Z"))).toBeNull();
  });
});
