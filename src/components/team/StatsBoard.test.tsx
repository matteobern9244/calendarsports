import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveTeam } from "@/lib/serieATeams";
import type { FootballMatch, FootballStandingRow } from "@/lib/api/schemas";
import StatsBoard from "./StatsBoard";

const JUVE = resolveTeam("juventus");

const CLASSIFICA: FootballStandingRow[] = [
  {
    position: 1,
    team: "Napoli",
    played: 3,
    wins: 3,
    draws: 0,
    losses: 0,
    goalsFor: 9,
    goalsAgainst: 1,
    goalDiff: 8,
    points: 9,
  },
  {
    position: 5,
    team: "Juventus",
    played: 3,
    wins: 1,
    draws: 1,
    losses: 1,
    goalsFor: 2,
    goalsAgainst: 5,
    goalDiff: -3,
    points: 4,
  },
];

const CALENDARIO: FootballMatch[] = [
  {
    id: "a",
    matchday: 1,
    homeTeam: "Juventus",
    awayTeam: "Napoli",
    homeScore: 2,
    awayScore: 1,
    date: "2026-09-01T18:45:00Z",
    status: "FullTime",
    competition: "Serie A",
  },
  {
    id: "b",
    matchday: 2,
    homeTeam: "Milan",
    awayTeam: "Juventus",
    homeScore: 0,
    awayScore: 0,
    date: "2026-09-08T18:45:00Z",
    status: "FullTime",
    competition: "Serie A",
  },
  {
    id: "c",
    matchday: 3,
    homeTeam: "Juventus",
    awayTeam: "Inter",
    homeScore: 0,
    awayScore: 4,
    date: "2026-09-15T18:45:00Z",
    status: "FullTime",
    competition: "Serie A",
  },
  {
    // Una goleada in coppa non deve spostare ne' i punti ne' l'andamento.
    id: "d",
    matchday: 1,
    homeTeam: "Juventus",
    awayTeam: "Lecce",
    homeScore: 5,
    awayScore: 0,
    date: "2026-09-18T18:45:00Z",
    status: "FullTime",
    competition: "Coppa Italia",
  },
];

describe("StatsBoard", () => {
  it("mostra i totali della classifica, non una somma nostra", () => {
    render(<StatsBoard team={JUVE} standings={CLASSIFICA} matches={CALENDARIO} />);
    expect(screen.getByText("5º")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("-3")).toBeInTheDocument();
  });

  it("confronta la squadra con la media del campionato, non con una soglia fissa", () => {
    render(<StatsBoard team={JUVE} standings={CLASSIFICA} matches={CALENDARIO} />);
    // Sei partite in due, tredici punti: 2,17 di media.
    expect(screen.getAllByText(/Media del campionato 2,17/).length).toBeGreaterThan(0);
  });

  it("l'andamento conta i punti di campionato e ignora la coppa", () => {
    render(<StatsBoard team={JUVE} standings={CLASSIFICA} matches={CALENDARIO} />);
    expect(screen.getByText(/4 punti/)).toBeInTheDocument();
    expect(screen.getByText(/dopo 3 partite di campionato/)).toBeInTheDocument();
  });

  it("separa casa e trasferta", () => {
    render(<StatsBoard team={JUVE} standings={CLASSIFICA} matches={CALENDARIO} />);
    const sezione = screen.getByText("Casa e trasferta").closest("section")!;
    const casa = within(sezione).getByText("In casa").parentElement!;
    const fuori = within(sezione).getByText("In trasferta").parentElement!;
    expect(within(casa).getByText("1V · 0N · 1S")).toBeInTheDocument();
    expect(within(fuori).getByText("0V · 1N · 0S")).toBeInTheDocument();
  });

  it("«sopra la media» e' un merito nei gol fatti e un difetto in quelli subiti", () => {
    // Una squadra sopra la media in tutto e tre: piu' punti, piu' gol fatti e
    // — la riga che conta — piu' gol subiti.
    const classifica: FootballStandingRow[] = [
      {
        position: 1,
        team: "Juventus",
        played: 2,
        wins: 2,
        draws: 0,
        losses: 0,
        goalsFor: 8,
        goalsAgainst: 6,
        goalDiff: 2,
        points: 6,
      },
      {
        position: 2,
        team: "Napoli",
        played: 2,
        wins: 0,
        draws: 0,
        losses: 2,
        goalsFor: 1,
        goalsAgainst: 3,
        goalDiff: -2,
        points: 0,
      },
    ];
    render(<StatsBoard team={JUVE} standings={classifica} matches={[]} />);

    const verde = (etichetta: string) => {
      const riga = screen.getByText(etichetta).closest("li")!;
      return within(riga).getByText(/la media\)/).className;
    };

    expect(verde("Punti a partita")).toContain("text-success");
    expect(verde("Gol fatti a partita")).toContain("text-success");
    // Piu' gol subiti della media non e' una buona notizia, e non va scritto
    // con il colore con cui si scrivono le buone notizie.
    expect(verde("Gol subiti a partita")).not.toContain("text-success");
    // E deve dirlo con un colore suo: fino al 12 settembre 2026 la cattiva
    // notizia era grigia come il testo intorno, e a colpo d'occhio si vedeva
    // «verde» su una riga e niente sull'altra. Chi ha segnalato il difetto
    // l'ha letto come «verde per entrambi»: il grigio non era un segnale.
    expect(verde("Gol subiti a partita")).toContain("text-destructive");
  });

  /**
   * Le due diciture sulle fonti — «Totali dalla classifica di Sky Sport...» e il
   * paragrafo su API-Football — sono state tolte su richiesta. Resta invece la
   * nota su casa e trasferta: quella non attribuisce niente a nessuno, dice
   * cosa significano i numeri che le stanno sopra.
   */
  it("non attribuisce i numeri a una fonte in pagina", () => {
    render(<StatsBoard team={JUVE} standings={CLASSIFICA} matches={CALENDARIO} />);

    expect(screen.queryByText(/Sky Sport/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/API-Football/i)).not.toBeInTheDocument();
    expect(screen.getByText(/coppe e Champions non danno punti/i)).toBeInTheDocument();
  });

  it("una squadra assente dalla classifica lo dice invece di mostrare zeri", () => {
    render(<StatsBoard team={resolveTeam("venezia")} standings={CLASSIFICA} matches={[]} />);
    expect(screen.getByText(/non compare nella classifica/)).toBeInTheDocument();
    expect(screen.queryByText("Andamento punti")).not.toBeInTheDocument();
  });

  it("senza partite giocate non disegna un andamento finto", () => {
    render(<StatsBoard team={JUVE} standings={CLASSIFICA} matches={[]} />);
    expect(screen.getAllByText(/Nessuna partita di campionato giocata/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Casa e trasferta")).not.toBeInTheDocument();
  });
});
