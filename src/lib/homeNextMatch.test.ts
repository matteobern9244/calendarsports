import { describe, expect, it } from "vitest";
import type { FootballMatch } from "@/lib/api/schemas";
import { partitaInEvidenza } from "./homeNextMatch";

/**
 * La home saltava la partita che si stava giocando.
 *
 * Il predicato pretendeva `getDateTimestamp(m.date) > now`, cioe' «comincia
 * nel futuro»: al minuto del fischio d'inizio la partita usciva dall'elenco e
 * al suo posto compariva quella della settimana dopo. Nessun errore, nessun
 * caricamento infinito — solo l'evento piu' importante del momento che
 * spariva dalla prima schermata dell'app.
 */

const ORA = (iso: string) => Date.parse(iso);

const partita = (over: Partial<FootballMatch> = {}): FootballMatch => ({
  id: "x",
  homeTeam: "Lazio",
  awayTeam: "Milan",
  competition: "Serie A",
  date: "2026-09-12T16:00:00Z",
  ...over,
});

describe("partitaInEvidenza", () => {
  it("tiene in evidenza la partita che si sta giocando", () => {
    const inCorso = partita({ id: "in-corso", status: "SecondHalf" });
    const dopo = partita({ id: "dopo", date: "2026-09-19T16:00:00Z", status: "PreMatch" });

    expect(partitaInEvidenza([dopo, inCorso], ORA("2026-09-12T16:54:00Z"))?.id).toBe("in-corso");
  });

  it("la preferisce anche quando la fonte e' ferma sul prepartita", () => {
    const inCorso = partita({ id: "in-corso", status: "PreMatch" });
    const dopo = partita({ id: "dopo", date: "2026-09-19T16:00:00Z", status: "PreMatch" });

    expect(partitaInEvidenza([dopo, inCorso], ORA("2026-09-12T16:54:00Z"))?.id).toBe("in-corso");
  });

  it("fuori dalla partita sceglie la prossima in ordine di data", () => {
    const prima = partita({ id: "prima", status: "PreMatch" });
    const dopo = partita({ id: "dopo", date: "2026-09-19T16:00:00Z", status: "PreMatch" });

    expect(partitaInEvidenza([dopo, prima], ORA("2026-09-10T10:00:00Z"))?.id).toBe("prima");
  });

  it("non torna mai su una partita finita", () => {
    const finita = partita({ id: "finita", status: "FullTime" });

    expect(partitaInEvidenza([finita], ORA("2026-09-12T20:00:00Z"))).toBeNull();
  });

  it("scarta le partite senza data: non saprebbe dove metterle", () => {
    expect(partitaInEvidenza([partita({ date: null })], ORA("2026-09-10T10:00:00Z"))).toBeNull();
  });

  it("senza partite non inventa niente", () => {
    expect(partitaInEvidenza([], ORA("2026-09-10T10:00:00Z"))).toBeNull();
    expect(partitaInEvidenza(undefined, ORA("2026-09-10T10:00:00Z"))).toBeNull();
  });
});
