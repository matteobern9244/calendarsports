import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FootballStandingRow } from "@/lib/api/schemas";
import StandingsTable from "./StandingsTable";
import { resolveTeam } from "@/lib/serieATeams";

const JUVE = resolveTeam("juventus");
const MILAN = resolveTeam("milan");

const row = (over: Partial<FootballStandingRow>): FootballStandingRow => ({
  team: "Squadra",
  position: 1,
  played: 5,
  wins: 2,
  draws: 2,
  losses: 1,
  goalDiff: 4,
  points: 8,
  ...over,
});

describe("StandingsTable", () => {
  it("una riga per squadra, con la differenza reti col segno", () => {
    render(
      <StandingsTable
        team={JUVE}
        standings={[
          row({ position: 1, team: "Milan", goalDiff: 5 }),
          row({ position: 2, team: "Juventus", goalDiff: 0 }),
          row({ position: 3, team: "Inter", goalDiff: -2 }),
        ]}
      />,
    );

    expect(screen.getAllByRole("row")).toHaveLength(4); // intestazione + 3
    expect(screen.getByRole("cell", { name: "+5" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "0" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "-2" })).toBeInTheDocument();
  });

  /**
   * La dicitura c'era, ed e' stata tolta su richiesta: l'app non firma piu' in
   * pagina il nome di chi le fornisce i dati. L'onesta' sulle fonti resta un
   * obbligo, ma si assolve nella documentazione (`docs/DATA_SOURCES.md`) e nel
   * campo `meta.dataSource` delle edge function, non addosso a una tabella.
   */
  it("non firma la tabella con il nome della fonte", () => {
    render(<StandingsTable team={JUVE} standings={[row({ team: "Juventus" })]} />);
    expect(screen.queryByText(/Sky Sport/i)).not.toBeInTheDocument();
  });

  it("la riga evidenziata e' quella della squadra scelta, e solo quella", () => {
    render(
      <StandingsTable
        team={JUVE}
        standings={[row({ position: 1, team: "Milan" }), row({ position: 2, team: "Juventus" })]}
      />,
    );

    const juve = screen.getByRole("cell", { name: /Juventus/ }).closest("tr");
    const milan = screen.getByRole("cell", { name: /Milan/ }).closest("tr");
    expect(juve?.className).toContain("border-l-4");
    expect(milan?.className).not.toContain("border-l-4");
  });

  /**
   * La classifica e' la stessa per tutte e venti le squadre — e' il motivo per
   * cui la sua chiave di cache non porta la squadra. Cambia solo quale riga
   * viene evidenziata, e quella e' la squadra della pagina.
   */
  it("su un'altra pagina squadra si illumina un'altra riga", () => {
    render(
      <StandingsTable
        team={MILAN}
        standings={[row({ position: 1, team: "Milan" }), row({ position: 2, team: "Juventus" })]}
      />,
    );

    expect(screen.getByRole("cell", { name: /Milan/ }).closest("tr")?.className).toContain(
      "border-l-4",
    );
    expect(screen.getByRole("cell", { name: /Juventus/ }).closest("tr")?.className).not.toContain(
      "border-l-4",
    );
  });
});
