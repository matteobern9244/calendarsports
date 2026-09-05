import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CalendarItem } from "@/hooks/useCalendarEvents";
import { buildMonthGrid, ymdKey, type RomeYMD } from "@/lib/calendarGrid";
import MonthGrid from "./MonthGrid";

const GIORNO: RomeYMD = { y: 2099, m: 5, d: 3 };
const OGGI: RomeYMD = { y: 2099, m: 5, d: 1 };

const evento = (id: string, over: Partial<CalendarItem> = {}): CalendarItem => ({
  id,
  sport: "juventus",
  date: "2099-05-03T18:45:00",
  shortLabel: "vs Milan",
  context: "Serie A · Giornata 3",
  title: "Juventus - Milan",
  href: "/juventus",
  ...over,
});

function renderGrid(eventi: CalendarItem[], isPast: (iso: string) => boolean = () => false) {
  const onSelect = vi.fn();
  const onOpenDay = vi.fn();
  render(
    <MonthGrid
      grid={buildMonthGrid(2099, 4)}
      view={GIORNO}
      today={OGGI}
      eventsByDay={new Map([[ymdKey(GIORNO), eventi]])}
      isPast={isPast}
      onSelect={onSelect}
      onOpenDay={onOpenDay}
    />,
  );
  return { onSelect, onOpenDay };
}

describe("MonthGrid", () => {
  it("il nome accessibile e' una frase che dice anche cosa fa il bottone", () => {
    // Letti di fila, gli span davano «20:45 Juventus: vs Milan (Serie A)»
    // senza dire che il bottone apre qualcosa.
    renderGrid([evento("a")]);
    expect(
      screen.getByRole("button", {
        name: "20:45 Juventus: vs Milan (Serie A · Giornata 3). Apri i dettagli",
      }),
    ).toBeInTheDocument();
  });

  it("un evento concluso lo dice, invece di affidarsi al solo barrato", () => {
    // Il `line-through` non arriva a chi usa uno screen reader.
    renderGrid([evento("a")], () => true);
    expect(
      screen.getByRole("button", { name: /, concluso\. Apri i dettagli$/ }),
    ).toBeInTheDocument();
  });

  it("il click apre il dettaglio di quell'evento", () => {
    const { onSelect } = renderGrid([evento("a"), evento("b", { shortLabel: "vs Inter" })]);
    fireEvent.click(screen.getByRole("button", { name: /vs Inter/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].id).toBe("b");
  });

  it("mostra quattro eventi per giorno e conta gli altri", () => {
    const cinque = ["a", "b", "c", "d", "e"].map((id) => evento(id, { shortLabel: `Gara ${id}` }));
    renderGrid(cinque);
    expect(screen.getByRole("button", { name: /Gara d/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Gara e.*Apri i dettagli/ })).toBeNull();
    expect(screen.getByText("+1 altri")).toBeInTheDocument();
  });

  it("«+N altri» chiede l'elenco del giorno, non il quinto evento", () => {
    // Fino al 5 settembre 2026 questo bottone faceva `onSelect(dayEvents[4])`:
    // il testo prometteva gli altri e ne apriva uno solo. Il test che
    // fissava quel comportamento e' questo, riscritto — era li' apposta
    // per obbligare chi correggeva il difetto a passare di qui.
    const cinque = ["a", "b", "c", "d", "e"].map((id) => evento(id, { shortLabel: `Gara ${id}` }));
    const { onSelect, onOpenDay } = renderGrid(cinque);

    fireEvent.click(
      screen.getByRole("button", { name: "+1 altri: mostra tutti i 5 eventi del giorno" }),
    );

    expect(onOpenDay).toHaveBeenCalledTimes(1);
    expect(onOpenDay.mock.calls[0][0]).toEqual(GIORNO);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("i giorni degli altri mesi restano in griglia", () => {
    // Il 1 maggio 2099 e' un venerdi': la prima settimana comincia col 27
    // aprile, e togliere quei giorni spezzerebbe la griglia. Il 27
    // compare quindi due volte, aprile e maggio; se la griglia mostrasse
    // il solo mese corrente ne resterebbe uno.
    renderGrid([]);
    expect(screen.getAllByText("27")).toHaveLength(2);
    expect(screen.getAllByText("30")).toHaveLength(2);
  });
});
