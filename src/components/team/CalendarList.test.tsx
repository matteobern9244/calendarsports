import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "@/lib/router-compat";
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
  const view = render(
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
  return { onChangeFilter, onGoToPage, ...view };
}

describe("CalendarList", () => {
  it("dice quali partite sta mostrando e le rende come link al dettaglio", () => {
    renderList(calendar());

    expect(screen.getByText("Partite 1–2 di 2")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Apri dettaglio Juventus vs Milan, Juventus in casa" }),
    ).toHaveAttribute("href", "/squadra/juventus/partite/a");
    expect(
      screen.getByRole("link", { name: "Apri dettaglio Juventus vs Inter, Juventus in casa" }),
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
    expect(
      screen.getByRole("link", { name: "Apri dettaglio Juventus vs Napoli, Napoli in trasferta" }),
    ).toHaveAttribute("href", "/squadra/napoli/partite/a");
  });

  it("evidenzia come «Prossima» solo la partita indicata dal server", () => {
    renderList(calendar({ nextUpcomingIndex: 1 }));

    const prossima = screen.getByText("Prossima").closest("a");
    expect(prossima).toHaveAttribute(
      "aria-label",
      "Apri dettaglio Juventus vs Inter, Juventus in casa",
    );
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

  /**
   * Prima lo stemma precedeva il nome, e «[stemma Lecce] vs Lecce» si leggeva
   * come il Lecce contro se' stesso. L'ordine nel DOM e' l'unica cosa che jsdom
   * puo' misurare — il resto (troncamento, allineamento) va guardato — ma e'
   * esattamente cio' che era sbagliato.
   */
  it("lo stemma dell'avversario segue il nome, e la colonna della giornata resta nuda", () => {
    const { container } = renderList(
      calendar({ items: [match("a", { awayLogo: "milan.png" })], total: 1 }),
    );

    const nome = screen.getByText("vs Milan");
    const stemma = screen.getByAltText("Milan");
    // Node.DOCUMENT_POSITION_FOLLOWING: lo stemma viene dopo il nome.
    expect(nome.compareDocumentPosition(stemma) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const giornata = screen.getByText("G3");
    expect(giornata.closest("div")?.querySelector("img")).toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  /** Senza logo dalla fonte resta una scatola della stessa misura. */
  it("uno stemma mancante diventa iniziali, non spazio vuoto", () => {
    renderList(calendar({ items: [match("a", { awayLogo: null })], total: 1 }));

    expect(screen.queryByAltText("Milan")).not.toBeInTheDocument();
    expect(screen.getByText("MI").parentElement).toHaveStyle({ width: "24px", height: "24px" });
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

    /*
      Il separatore cambiato non e' un test indebolito, e' un requisito
      cambiato: il punteggio si scriveva a mano in tre punti con due segni
      diversi — il trattino lungo nel dettaglio e nella testata, quello corto
      qui — e ora lo scrive `MatchScore`, con un segno solo.

      E si aggiunge l'asserzione che mancava: «0–2» per uno screen reader e'
      «zero meno due», o niente. Il punteggio e' il dato per cui si apre la
      pagina, e non puo' essere l'unico che non arriva a chi la pagina se la fa
      leggere.
    */
    // I tre pezzi stanno in nodi separati, come in ogni punteggio: si guarda
    // il testo composto del blocco, non un nodo solo.
    const leggibile = screen.getByText("0 a 2");
    expect(leggibile.parentElement?.textContent).toContain("0–2");
    expect(screen.getByText("V")).toBeInTheDocument();
  });
});
