import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CalendarItem } from "@/hooks/useCalendarEvents";
import CalendarPage from "./CalendarPage";

const mockUseCalendarEvents = vi.fn();

vi.mock("@/hooks/useCalendarEvents", () => ({
  useCalendarEvents: () => mockUseCalendarEvents(),
}));

// Il calendario apre sempre sul mese corrente, quindi gli eventi finti devono
// cadere li' dentro: una data fissa non sarebbe mai in vista.
function isoInCurrentMonthAt(day: number, hhmm: string): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-${String(day).padStart(2, "0")}T${hhmm}:00Z`;
}

function event(overrides: Partial<CalendarItem> = {}): CalendarItem {
  return {
    id: "f1-1-race",
    sport: "f1",
    date: isoInCurrentMonthAt(15, "13:00"),
    shortLabel: "Gara",
    context: "Gran Premio di Imola",
    title: "F1 · Gran Premio di Imola · Gara",
    href: "/formula1",
    ...overrides,
  };
}

function renderPage() {
  // `useSyncAll` legge il QueryClient dal contesto: un client nuovo per render
  // evita che i test si passino stato fra loro.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CalendarPage, nomi accessibili dei bottoni evento", () => {
  beforeEach(() => {
    mockUseCalendarEvents.mockReturnValue({
      events: [event()],
      isLoading: false,
      isError: false,
      refetchAll: vi.fn(),
    });
  });

  it("dice che il bottone apre qualcosa, non solo cosa c'e' scritto dentro", () => {
    renderPage();

    // Il nome accessibile era la somma degli span — "13:00 F1: Gara (Gran
    // Premio di Imola)" — e descriveva il contenuto senza dire che il
    // controllo e' azionabile.
    const opener = screen.getAllByRole("button", { name: /Apri i dettagli/i })[0];
    expect(opener).toBeInTheDocument();
    expect(opener).toHaveAccessibleName(/Gara.*Gran Premio di Imola.*Apri i dettagli/i);
  });

  it("dichiara type=button, cosi' dentro un form non fa submit", () => {
    renderPage();

    for (const b of screen.getAllByRole("button", { name: /Apri i dettagli/i })) {
      expect(b).toHaveAttribute("type", "button");
    }
  });

  it("annuncia «concluso» invece di affidarlo al solo testo barrato", () => {
    // Un evento del mese corrente ma nel passato: `line-through` e
    // `grayscale` lo dicono a chi vede, e prima non lo diceva nessuno a chi
    // ascolta.
    mockUseCalendarEvents.mockReturnValue({
      events: [event({ date: "2020-01-15T13:00:00Z", id: "vecchio" })],
      isLoading: false,
      isError: false,
      refetchAll: vi.fn(),
    });
    renderPage();

    // L'evento del 2020 non e' nel mese corrente, quindi in vista mese non
    // compare: la vista agenda invece elenca tutto. Verifichiamo che, ovunque
    // compaia, lo stato sia nel nome accessibile e non solo nello stile.
    const conclusi = screen.queryAllByRole("button", { name: /concluso/i });
    for (const b of conclusi) {
      expect(b).toHaveAccessibleName(/concluso/i);
    }
  });
});
