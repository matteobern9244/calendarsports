import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { FootballMatch } from "@/lib/api/schemas";
import NextMatchCard from "./NextMatchCard";
import { resolveTeam, type SerieATeam } from "@/lib/serieATeams";

const JUVE = resolveTeam("juventus");

const match = (over: Partial<FootballMatch> = {}): FootballMatch => ({
  id: "serie-a-2099-09-13-juventus-vs-milan",
  homeTeam: "Juventus",
  awayTeam: "Milan",
  competition: "Serie A",
  date: "2099-09-13T18:45:00",
  broadcaster: "DAZN | Sky Sport",
  ...over,
});

function renderCard(m: FootballMatch, team: SerieATeam = JUVE) {
  return render(
    <MemoryRouter>
      <NextMatchCard team={team} match={m} onRetry={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("NextMatchCard", () => {
  it("in casa mostra l'avversario e porta al dettaglio della partita", () => {
    renderCard(match());

    expect(screen.getByText("Prossima Partita")).toBeInTheDocument();
    expect(screen.getByText("Juventus vs")).toBeInTheDocument();
    expect(screen.getByText("Milan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Apri dettaglio Juventus vs Milan" })).toHaveAttribute(
      "href",
      "/squadra/juventus/partite/serie-a-2099-09-13-juventus-vs-milan",
    );
  });

  it("in trasferta dice da chi si gioca", () => {
    renderCard(match({ homeTeam: "Inter", awayTeam: "Juventus" }));

    expect(screen.getByText("Inter @")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Apri dettaglio Inter vs Juventus" }),
    ).toBeInTheDocument();
  });

  it("un'emittente per chip, separate dalla barra come le scrive la fonte", () => {
    renderCard(match());

    expect(screen.getByText("DAZN")).toBeInTheDocument();
    expect(screen.getByText("Sky Sport")).toBeInTheDocument();
  });

  /**
   * La stessa partita, in cima al calendario dell'altra squadra: l'avversario
   * si scambia e il link porta nel ramo di quella squadra. E' la prova che il
   * punto di vista e' un parametro e non e' rimasto la Juventus.
   */
  it("dal calendario dell'altra squadra l'avversario e il link si rovesciano", () => {
    renderCard(match({ homeTeam: "Juventus", awayTeam: "Napoli" }), resolveTeam("napoli"));

    expect(screen.getByText("Juventus @")).toBeInTheDocument();
    expect(screen.getByText("Napoli")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Apri dettaglio Juventus vs Napoli" })).toHaveAttribute(
      "href",
      "/squadra/napoli/partite/serie-a-2099-09-13-juventus-vs-milan",
    );
  });

  it("l'orario e' in fuso italiano: 18:45 UTC sono le 20:45", () => {
    renderCard(match());

    expect(screen.getByText(/20:45/)).toBeInTheDocument();
  });
});
