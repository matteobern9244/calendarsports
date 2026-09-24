import { render, within } from "@testing-library/react";
import { MemoryRouter } from "@/test/memoryRouter";
import { describe, expect, it, vi } from "vitest";
import type { FootballMatch } from "@/lib/api/schemas";
import type { PaginatedCalendar } from "@/lib/teamCalendar";
import CalendarList from "./CalendarList";
import NextMatchCard from "./NextMatchCard";
import { resolveTeam, type SerieATeam } from "@/lib/serieATeams";

/**
 * Il guardiano del difetto che ha motivato questo lavoro.
 *
 * La stessa partita era descritta in due modi opposti nella stessa schermata:
 * la riga di calendario scriveva «@ Lazio» (Milan in trasferta) e la card
 * della prossima partita, tre centimetri piu' su, «LAZIO @ / Milan», che si
 * legge «Lazio in casa del Milan». Nessuna delle due viste era rotta da sola:
 * erano due letterali scritti a mano in due componenti, e uno dei due era al
 * contrario.
 *
 * Per questo il test non guarda una vista: le monta **tutte e due** con la
 * stessa partita e pretende che dicano la stessa cosa. Le viste vengono
 * renderizzate separatamente di proposito — insieme, lo stesso testo
 * comparirebbe due volte e la ricerca sarebbe ambigua invece che significativa.
 */

const MILAN = resolveTeam("milan");

const match = (over: Partial<FootballMatch> = {}): FootballMatch => ({
  id: "serie-a-2099-09-12-lazio-vs-milan",
  homeTeam: "Lazio",
  awayTeam: "Milan",
  competition: "Serie A",
  matchday: 4,
  date: "2099-09-12T16:00:00",
  ...over,
});

function calendar(m: FootballMatch): PaginatedCalendar {
  return {
    items: [m],
    total: 1,
    page: 1,
    pageSize: 12,
    totalPages: 1,
    nextUpcomingIndex: 0,
  };
}

/** Il lato come lo scrive la card, e come lo scrive la riga di calendario. */
function latoNelleDueViste(m: FootballMatch, team: SerieATeam = MILAN) {
  const card = render(
    <MemoryRouter>
      <NextMatchCard team={team} match={m} onRetry={vi.fn()} />
    </MemoryRouter>,
  );
  const lista = render(
    <MemoryRouter>
      <CalendarList
        team={team}
        calendar={calendar(m)}
        upcomingOnly
        onChangeFilter={vi.fn()}
        onGoToPage={vi.fn()}
      />
    </MemoryRouter>,
  );
  return {
    card: within(card.container).getByRole("link").getAttribute("aria-label"),
    cardTesto: within(card.container).getByText(/^(vs|@) /).textContent,
    listaTesto: within(lista.container).getByText(/^(vs|@) /).textContent,
  };
}

describe("coerenza casa/trasferta fra card e lista", () => {
  it("in trasferta le due viste dicono la stessa cosa", () => {
    const viste = latoNelleDueViste(match());

    expect(viste.cardTesto).toBe("@ Lazio");
    expect(viste.listaTesto).toBe("@ Lazio");
    expect(viste.card).toContain("Milan in trasferta");
  });

  it("in casa le due viste dicono la stessa cosa", () => {
    const viste = latoNelleDueViste(match({ homeTeam: "Milan", awayTeam: "Lazio" }));

    expect(viste.cardTesto).toBe("vs Lazio");
    expect(viste.listaTesto).toBe("vs Lazio");
    expect(viste.card).toContain("Milan in casa");
  });

  /** Lo stesso incontro dall'altro calendario: entrambe si rovesciano insieme. */
  it("cambiando punto di vista si rovesciano tutte e due", () => {
    const viste = latoNelleDueViste(match(), resolveTeam("lazio"));

    expect(viste.cardTesto).toBe("vs Milan");
    expect(viste.listaTesto).toBe("vs Milan");
  });
});
