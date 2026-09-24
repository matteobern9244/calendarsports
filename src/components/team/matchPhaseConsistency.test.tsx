import { render, within } from "@testing-library/react";
import { MemoryRouter } from "@/test/memoryRouter";
import { describe, expect, it, vi } from "vitest";
import type { FootballMatch } from "@/lib/api/schemas";
import type { PaginatedCalendar } from "@/lib/teamCalendar";
import CalendarList from "./CalendarList";
import NextMatchCard from "./NextMatchCard";
import { resolveTeam, type SerieATeam } from "@/lib/serieATeams";

/**
 * Il guardiano del difetto fotografato durante Lazio-Milan.
 *
 * La card in testa alla pagina annunciava «PROSSIMA PARTITA» mentre il conto
 * alla rovescia accanto lampeggiava «IN DIRETTA · da 54m», e la riga di
 * calendario della stessa partita, poco piu' sotto, portava la pillola
 * «PROSSIMA» e un trattino al posto del punteggio. Tre affermazioni sulla
 * stessa partita, nella stessa schermata, in disaccordo fra loro.
 *
 * Nessuna delle viste era rotta da sola, ed e' il punto: si contraddicevano
 * soltanto **insieme**, cioe' nell'unico posto dove nessun test guardava. Come
 * per casa/trasferta, il rimedio e' montarle tutte e due con la stessa partita.
 *
 * Le date sono costruite rispetto a `Date.now()`: l'orologio condiviso
 * fotografa l'istante all'import del modulo, e `vi.setSystemTime` da solo non
 * lo muove finche' non arriva un tick.
 */

const MILAN = resolveTeam("milan");
const minutiFa = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

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
  return { items: [m], total: 1, page: 1, pageSize: 12, totalPages: 1, nextUpcomingIndex: 0 };
}

/** Le due viste della stessa partita, rese separatamente. */
function dueViste(m: FootballMatch, team: SerieATeam = MILAN) {
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
  return { card: within(card.container), lista: within(lista.container) };
}

describe("coerenza sulla fase fra card e riga di calendario", () => {
  it("a partita iniziata nessuna delle due la chiama ancora «prossima»", () => {
    const { card, lista } = dueViste(
      match({ status: "SecondHalf", date: minutiFa(54), homeScore: 2, awayScore: 0 }),
    );

    expect(card.getByText("In corso")).toBeInTheDocument();
    expect(card.queryByText("Prossima Partita")).not.toBeInTheDocument();
    expect(lista.getByText("In corso")).toBeInTheDocument();
    expect(lista.queryByText("Prossima")).not.toBeInTheDocument();
  });

  it("il punteggio e' lo stesso nelle due viste", () => {
    const { card, lista } = dueViste(
      match({ status: "SecondHalf", date: minutiFa(54), homeScore: 2, awayScore: 0 }),
    );

    expect(card.getByText("2 a 0")).toBeInTheDocument();
    expect(lista.getByText("2 a 0")).toBeInTheDocument();
  });

  it("prima del fischio d'inizio tutte e due annunciano, e nessuna mostra un punteggio", () => {
    const { card, lista } = dueViste(match({ status: "PreMatch" }));

    expect(card.getByText("Prossima Partita")).toBeInTheDocument();
    expect(lista.getByText("Prossima")).toBeInTheDocument();
    expect(card.queryByText(/\d a \d/)).not.toBeInTheDocument();
    expect(lista.queryByText(/\d a \d/)).not.toBeInTheDocument();
  });

  /**
   * La fonte ferma sul prepartita mentre si gioca: le due viste devono
   * **tacere insieme** sul punteggio, e dire insieme che si sta giocando. Se
   * una delle due si fidasse dell'orologio anche per il risultato, mostrerebbe
   * lo 0-0 che la fonte scrive prima del fischio d'inizio.
   */
  it("con la fonte ferma dicono insieme «In corso» e tacciono insieme sul punteggio", () => {
    const { card, lista } = dueViste(
      match({ status: "PreMatch", date: minutiFa(54), homeScore: 0, awayScore: 0 }),
    );

    expect(card.getByText("In corso")).toBeInTheDocument();
    expect(lista.getByText("In corso")).toBeInTheDocument();
    expect(card.queryByText("0 a 0")).not.toBeInTheDocument();
    expect(lista.queryByText("0 a 0")).not.toBeInTheDocument();
  });

  it("a partita finita tutte e due tengono il risultato", () => {
    const { card, lista } = dueViste(
      match({ status: "FullTime", date: minutiFa(200), homeScore: 2, awayScore: 2 }),
    );

    expect(card.getByText("2 a 2")).toBeInTheDocument();
    expect(lista.getByText("2 a 2")).toBeInTheDocument();
  });
});
