import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { FootballMatch } from "@/lib/api/schemas";
import type { PaginatedCalendar } from "@/lib/teamCalendar";
import CalendarList from "./CalendarList";
import { resolveTeam, type SerieATeam } from "@/lib/serieATeams";

const JUVE = resolveTeam("juventus");

const match = (id: string, over: Partial<FootballMatch> = {}): FootballMatch => ({
  id,
  homeTeam: "Juventus",
  awayTeam: "Milan",
  competition: "Serie A",
  matchday: 3,
  date: "2099-09-13T18:45:00",
  ...over,
});

function calendar(over: Partial<PaginatedCalendar> = {}): PaginatedCalendar {
  return {
    items: [match("a"), match("b", { awayTeam: "Inter" })],
    total: 2,
    page: 1,
    pageSize: 12,
    totalPages: 1,
    nextUpcomingIndex: 0,
    ...over,
  };
}

function renderList(cal: PaginatedCalendar, upcomingOnly = true, team: SerieATeam = JUVE) {
  const onChangeFilter = vi.fn();
  const onGoToPage = vi.fn();
  render(
    <MemoryRouter>
      <CalendarList
        team={team}
        calendar={cal}
        upcomingOnly={upcomingOnly}
        onChangeFilter={onChangeFilter}
        onGoToPage={onGoToPage}
      />
    </MemoryRouter>,
  );
  return { onChangeFilter, onGoToPage };
}

describe("CalendarList", () => {
  it("dice quali partite sta mostrando e le rende come link al dettaglio", () => {
    renderList(calendar());

    expect(screen.getByText("Partite 1–2 di 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Apri dettaglio Juventus vs Milan" })).toHaveAttribute(
      "href",
      "/squadra/juventus/partite/a",
    );
    expect(
      screen.getByRole("link", { name: "Apri dettaglio Juventus vs Inter" }),
    ).toBeInTheDocument();
  });

  /**
   * Lo stesso calendario letto dall'altra squadra: «vs» diventa «@», e i link
   * restano nel ramo della squadra da cui si sta guardando.
   */
  it("dall'altra squadra la partita cambia lato e il link cambia ramo", () => {
    renderList(
      calendar({ items: [match("a", { homeTeam: "Juventus", awayTeam: "Napoli" })], total: 1 }),
      true,
      resolveTeam("napoli"),
    );

    expect(screen.getByText("@ Juventus")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Apri dettaglio Juventus vs Napoli" })).toHaveAttribute(
      "href",
      "/squadra/napoli/partite/a",
    );
  });

  it("evidenzia come «Prossima» solo la partita indicata dal server", () => {
    renderList(calendar({ nextUpcomingIndex: 1 }));

    const prossima = screen.getByText("Prossima").closest("a");
    expect(prossima).toHaveAttribute("aria-label", "Apri dettaglio Juventus vs Inter");
  });

  it("il filtro Prossime/Tutte riflette lo stato e chiama il cambio", () => {
    const props = renderList(calendar(), true);

    expect(screen.getByRole("button", { name: "Prossime" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Tutte" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Tutte" }));
    expect(props.onChangeFilter).toHaveBeenCalledWith(false);
  });

  it("con una pagina sola non mostra la paginazione", () => {
    renderList(calendar());
    expect(screen.queryByRole("navigation", { name: "paginazione" })).not.toBeInTheDocument();
  });

  it("con piu' pagine chiede di cambiare pagina, e non oltre i bordi", () => {
    const props = renderList(calendar({ page: 1, total: 30, totalPages: 3 }));

    expect(screen.getByText("Pagina 1 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "2" }));
    expect(props.onGoToPage).toHaveBeenCalledWith(2);

    props.onGoToPage.mockClear();
    fireEvent.click(screen.getByRole("link", { name: "Vai alla pagina precedente" }));
    expect(props.onGoToPage).not.toHaveBeenCalled();
  });

  it("mostra il risultato a partita finita, con l'esito dal punto di vista bianconero", () => {
    renderList(
      calendar({
        items: [
          match("x", {
            homeTeam: "Inter",
            awayTeam: "Juventus",
            status: "FullTime",
            homeScore: 0,
            awayScore: 2,
          }),
        ],
        total: 1,
      }),
    );

    expect(screen.getByText("0 - 2")).toBeInTheDocument();
    expect(screen.getByText("V")).toBeInTheDocument();
  });
});
