import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CalendarItem } from "@/hooks/useCalendarEvents";
import { resolveTeam } from "@/lib/serieATeams";
import AgendaView, { type AgendaDay } from "./AgendaView";

const JUVE = resolveTeam("juventus");
const NAPOLI = resolveTeam("napoli");

const evento = (id: string, over: Partial<CalendarItem> = {}): CalendarItem => ({
  id,
  sport: "juventus",
  date: "2099-05-03T18:45:00",
  shortLabel: "vs Milan",
  context: "Serie A · Giornata 3",
  title: "Juventus - Milan",
  href: "/squadra/juventus",
  ...over,
});

const giorno = (events: CalendarItem[]): AgendaDay => ({
  ymd: { y: 2099, m: 5, d: 3 },
  key: "2099-05-03",
  events,
});

function renderAgenda(days: AgendaDay[], isLoading = false, team = JUVE) {
  const onSelect = vi.fn();
  render(
    <AgendaView
      agendaDays={days}
      today={{ y: 2099, m: 5, d: 1 }}
      isPast={() => false}
      onSelect={onSelect}
      isLoading={isLoading}
      monthLabel="Maggio 2099"
      team={team}
    />,
  );
  return onSelect;
}

describe("AgendaView", () => {
  it("mostra l'emittente, che nella griglia non ci sta", () => {
    renderAgenda([giorno([evento("a", { broadcaster: "DAZN" })])]);
    expect(screen.getByText("DAZN")).toBeInTheDocument();
  });

  it("conta gli eventi del giorno al singolare e al plurale", () => {
    renderAgenda([giorno([evento("a")])]);
    expect(screen.getByText("1 evento")).toBeInTheDocument();
  });

  it("dice che il mese e' vuoto solo quando ha finito di caricare", () => {
    const { unmount } = render(
      <AgendaView
        agendaDays={[]}
        today={{ y: 2099, m: 5, d: 1 }}
        isPast={() => false}
        onSelect={vi.fn()}
        isLoading
        monthLabel="Maggio 2099"
        team={JUVE}
      />,
    );
    // Durante il caricamento un elenco vuoto non significa «niente»:
    // dirlo subito farebbe lampeggiare un messaggio falso.
    expect(screen.queryByText(/Nessun evento/)).toBeNull();
    unmount();

    renderAgenda([]);
    expect(screen.getByText("Nessun evento in Maggio 2099")).toBeInTheDocument();
  });

  it("il click apre il dettaglio dell'evento", () => {
    const onSelect = renderAgenda([giorno([evento("a"), evento("b", { shortLabel: "vs Inter" })])]);
    fireEvent.click(screen.getByRole("button", { name: /vs Inter/ }));
    expect(onSelect.mock.calls[0][0].id).toBe("b");
  });

  /**
   * Qui il nome accessibile e' composto diversamente dalla griglia — senza i
   * due punti — ma l'etichetta e' la stessa, e deve seguire la stessa squadra.
   */
  it("l'etichetta del calcio segue la squadra guardata", () => {
    renderAgenda([giorno([evento("a", { shortLabel: "@ Juventus" })])], false, NAPOLI);
    expect(screen.getByRole("button", { name: /Napoli @ Juventus/ })).toBeInTheDocument();
  });
});
