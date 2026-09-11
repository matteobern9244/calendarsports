import { describe, expect, it } from "vitest";
import {
  andamentoPunti,
  formaRecente,
  kpiSquadra,
  mediaCampionato,
  partiteDiCampionato,
  ripartizioneCasaTrasferta,
} from "@/lib/teamStats";
import { resolveTeamStrict } from "@/lib/serieATeams";
import type { FootballMatch, FootballStandingRow } from "@/lib/api/schemas";

const juventus = resolveTeamStrict("juventus")!;
const napoli = resolveTeamStrict("napoli")!;

function riga(over: Partial<FootballStandingRow> & { team: string }): FootballStandingRow {
  return {
    position: 1,
    played: 10,
    wins: 5,
    draws: 3,
    losses: 2,
    goalsFor: 15,
    goalsAgainst: 10,
    goalDiff: 5,
    points: 18,
    ...over,
  };
}

function partita(over: Partial<FootballMatch> & { id: string }): FootballMatch {
  return {
    homeTeam: "Juventus",
    awayTeam: "Napoli",
    homeScore: null,
    awayScore: null,
    date: "2026-09-01T18:45:00Z",
    status: "FullTime",
    competition: "Serie A",
    matchday: 1,
    ...over,
  };
}

describe("kpiSquadra", () => {
  it("trova la riga della squadra e ne ricava le medie", () => {
    const kpi = kpiSquadra(
      [riga({ team: "Napoli", position: 1 }), riga({ team: "Juventus", position: 4, points: 20 })],
      juventus,
    );
    expect(kpi?.position).toBe(4);
    expect(kpi?.points).toBe(20);
    expect(kpi?.pointsPerMatch).toBeCloseTo(2);
    expect(kpi?.goalsForPerMatch).toBeCloseTo(1.5);
    expect(kpi?.winRate).toBeCloseTo(0.5);
  });

  it("legge i numeri anche quando la fonte li scrive come stringhe", () => {
    const kpi = kpiSquadra([riga({ team: "Juventus", points: "20", played: "10" })], juventus);
    expect(kpi?.points).toBe(20);
    expect(kpi?.pointsPerMatch).toBeCloseTo(2);
  });

  it("non confonde la Juventus con la Juventus Next Gen", () => {
    expect(kpiSquadra([riga({ team: "Juventus Next Gen" })], juventus)).toBeNull();
  });

  it("con zero partite giocate non divide per zero: le medie sono nulle", () => {
    const kpi = kpiSquadra([riga({ team: "Juventus", played: 0, points: 0 })], juventus);
    expect(kpi?.pointsPerMatch).toBeNull();
    expect(kpi?.winRate).toBeNull();
  });
});

describe("mediaCampionato", () => {
  it("media su tutte le squadre, non sulla sola richiesta", () => {
    const media = mediaCampionato([
      riga({ team: "Juventus", played: 10, points: 30, goalsFor: 20, goalsAgainst: 5 }),
      riga({ team: "Napoli", played: 10, points: 10, goalsFor: 10, goalsAgainst: 15 }),
    ]);
    expect(media?.pointsPerMatch).toBeCloseTo(2);
    expect(media?.goalsForPerMatch).toBeCloseTo(1.5);
  });

  it("una classifica vuota non ha una media", () => {
    expect(mediaCampionato([])).toBeNull();
  });
});

describe("partiteDiCampionato", () => {
  const calendario: FootballMatch[] = [
    partita({ id: "a", homeTeam: "Juventus", awayTeam: "Napoli", homeScore: 2, awayScore: 1 }),
    partita({
      id: "b",
      homeTeam: "Milan",
      awayTeam: "Juventus",
      homeScore: 3,
      awayScore: 3,
      matchday: 2,
    }),
    partita({
      id: "c",
      homeTeam: "Juventus",
      awayTeam: "Inter",
      homeScore: 0,
      awayScore: 1,
      matchday: 3,
    }),
    // Coppa: si gioca, ma non da' punti in campionato.
    partita({
      id: "d",
      competition: "Coppa Italia",
      homeTeam: "Juventus",
      awayTeam: "Lecce",
      homeScore: 4,
      awayScore: 0,
      matchday: 1,
    }),
    // Ancora da giocare.
    partita({ id: "e", homeTeam: "Roma", awayTeam: "Juventus", status: "Scheduled", matchday: 4 }),
  ];

  it("tiene solo la Serie A gia' giocata", () => {
    const giocate = partiteDiCampionato(calendario, juventus);
    expect(giocate.map((m) => m.opponent)).toEqual(["Napoli", "Milan", "Inter"]);
  });

  it("sa da che parte sta la squadra e quindi chi ha vinto", () => {
    const giocate = partiteDiCampionato(calendario, juventus);
    expect(giocate[0]).toMatchObject({ home: true, goalsFor: 2, goalsAgainst: 1, esito: "V" });
    expect(giocate[1]).toMatchObject({ home: false, goalsFor: 3, goalsAgainst: 3, esito: "N" });
    expect(giocate[2]).toMatchObject({ home: true, goalsFor: 0, goalsAgainst: 1, esito: "S" });
  });

  it("la stessa partita letta dall'altra squadra si ribalta", () => {
    const giocate = partiteDiCampionato(calendario, napoli);
    expect(giocate).toHaveLength(1);
    expect(giocate[0]).toMatchObject({ home: false, goalsFor: 1, goalsAgainst: 2, esito: "S" });
  });

  it("scarta una partita che non nomina la squadra invece di indovinare", () => {
    const estranea = [
      partita({ id: "x", homeTeam: "Milan", awayTeam: "Inter", homeScore: 1, awayScore: 0 }),
    ];
    expect(partiteDiCampionato(estranea, juventus)).toEqual([]);
  });

  it("ordina per giornata anche se la fonte le consegna mescolate", () => {
    const mescolate = [calendario[2], calendario[0], calendario[1]];
    expect(partiteDiCampionato(mescolate, juventus).map((m) => m.matchday)).toEqual([1, 2, 3]);
  });
});

describe("andamentoPunti", () => {
  it("accumula i punti partita dopo partita", () => {
    const giocate = partiteDiCampionato(
      [
        partita({ id: "a", homeTeam: "Juventus", awayTeam: "Napoli", homeScore: 2, awayScore: 1 }),
        partita({
          id: "b",
          homeTeam: "Milan",
          awayTeam: "Juventus",
          homeScore: 3,
          awayScore: 3,
          matchday: 2,
        }),
        partita({
          id: "c",
          homeTeam: "Juventus",
          awayTeam: "Inter",
          homeScore: 0,
          awayScore: 1,
          matchday: 3,
        }),
      ],
      juventus,
    );
    expect(andamentoPunti(giocate).map((p) => p.cumulati)).toEqual([3, 4, 4]);
  });

  it("senza partite giocate non c'e' andamento", () => {
    expect(andamentoPunti([])).toEqual([]);
  });
});

describe("ripartizioneCasaTrasferta", () => {
  it("separa i due conti", () => {
    const giocate = partiteDiCampionato(
      [
        partita({ id: "a", homeTeam: "Juventus", awayTeam: "Napoli", homeScore: 2, awayScore: 1 }),
        partita({
          id: "b",
          homeTeam: "Milan",
          awayTeam: "Juventus",
          homeScore: 3,
          awayScore: 0,
          matchday: 2,
        }),
      ],
      juventus,
    );
    const { casa, trasferta } = ripartizioneCasaTrasferta(giocate);
    expect(casa).toMatchObject({ played: 1, wins: 1, points: 3, goalsFor: 2, goalsAgainst: 1 });
    expect(trasferta).toMatchObject({
      played: 1,
      losses: 1,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 3,
    });
  });
});

describe("formaRecente", () => {
  it("prende le ultime, non le prime", () => {
    const giocate = partiteDiCampionato(
      [
        partita({ id: "a", homeTeam: "Juventus", awayTeam: "Napoli", homeScore: 2, awayScore: 1 }),
        partita({
          id: "b",
          homeTeam: "Milan",
          awayTeam: "Juventus",
          homeScore: 3,
          awayScore: 3,
          matchday: 2,
        }),
        partita({
          id: "c",
          homeTeam: "Juventus",
          awayTeam: "Inter",
          homeScore: 0,
          awayScore: 1,
          matchday: 3,
        }),
      ],
      juventus,
    );
    expect(formaRecente(giocate, 2).map((m) => m.esito)).toEqual(["N", "S"]);
  });
});
