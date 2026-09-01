import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FootballStandingRow } from "@/lib/api/schemas";
import StandingsTable from "./StandingsTable";

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

  it("dichiara la fonte, perche' e' scraping e non un'API ufficiale", () => {
    render(<StandingsTable standings={[row({ team: "Juventus" })]} />);
    expect(screen.getByText("Fonte: Sky Sport Italia")).toBeInTheDocument();
  });

  it("la riga della Juventus e' quella evidenziata, e solo quella", () => {
    render(
      <StandingsTable
        standings={[row({ position: 1, team: "Milan" }), row({ position: 2, team: "Juventus" })]}
      />,
    );

    const juve = screen.getByRole("cell", { name: /Juventus/ }).closest("tr");
    const milan = screen.getByRole("cell", { name: /Milan/ }).closest("tr");
    expect(juve?.className).toContain("border-l-4");
    expect(milan?.className).not.toContain("border-l-4");
  });
});
