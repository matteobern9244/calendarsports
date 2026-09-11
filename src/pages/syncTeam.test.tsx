import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { SerieATeam } from "@/lib/serieATeams";
import { TEAM_STORAGE_KEY } from "@/contexts/useUserPrefs";

/**
 * Tre pagine mostrano il pulsante «Sincronizza» senza mostrare il calcio:
 * Home, calendario aggregato, streaming. Nessuna delle tre ha una squadra
 * nell'indirizzo, quindi la prendono tutte dalla preferenza — e se una sola
 * restasse su una costante non si romperebbe niente di visibile: il pulsante
 * girerebbe, direbbe «fatto», e scalderebbe la cache di un'altra squadra.
 *
 * E' lo stesso guasto silenzioso che `useSyncAll.test.tsx` sorveglia dal lato
 * dell'hook. Li' si verifica che la squadra ricevuta arrivi fino alle chiavi;
 * qui, che sia quella giusta a partire.
 */
const { ricevute } = vi.hoisted(() => ({
  ricevute: { sync: [] as SerieATeam[], calendario: [] as SerieATeam[] },
}));

vi.mock("@/hooks/useSyncAll", () => ({
  useSyncAll: (team: SerieATeam) => {
    ricevute.sync.push(team);
    return { sync: vi.fn(), syncing: false, syncStep: "", syncProgress: 0, lastSyncAt: null };
  },
}));

vi.mock("@/hooks/useCalendarEvents", () => ({
  useCalendarEvents: (team: SerieATeam) => {
    ricevute.calendario.push(team);
    return { events: [], isLoading: false, isError: false, refetchAll: vi.fn() };
  },
}));

import { AuthProvider } from "@/contexts/AuthContext";
import { UserPrefsProvider } from "@/contexts/UserPrefsContext";
import CalendarPage from "./CalendarPage";
import HomePage from "./Index";
import StreamingPage from "./StreamingPage";

function monta(pagina: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AuthProvider>
          <UserPrefsProvider>{pagina}</UserPrefsProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const PAGINE: ReadonlyArray<[string, ReactNode]> = [
  ["Home", <HomePage key="home" />],
  ["calendario aggregato", <CalendarPage key="cal" />],
  ["streaming", <StreamingPage key="str" />],
];

describe("«Sincronizza» e la squadra scelta", () => {
  beforeEach(() => {
    ricevute.sync = [];
    ricevute.calendario = [];
    window.localStorage.clear();
    window.localStorage.setItem(TEAM_STORAGE_KEY, "napoli");
  });

  for (const [nome, pagina] of PAGINE) {
    it(`${nome}: sincronizza la squadra scelta, non una costante`, () => {
      monta(pagina);

      expect(screen.getByRole("button", { name: /Sincronizza/ })).toBeInTheDocument();
      expect(ricevute.sync.length).toBeGreaterThan(0);
      for (const team of ricevute.sync) {
        expect(team.slug).toBe("napoli");
      }
    });
  }

  /**
   * Sul calendario aggregato le due cose convivono, ed e' li' che la
   * discordanza sarebbe invisibile: la pagina mostrerebbe le partite di una
   * squadra e ne aggiornerebbe un'altra.
   */
  it("sul calendario aggregato le partite mostrate e quelle aggiornate sono le stesse", () => {
    monta(<CalendarPage />);

    expect(ricevute.calendario.length).toBeGreaterThan(0);
    for (const team of ricevute.calendario) {
      expect(team.slug).toBe("napoli");
    }
    expect(new Set(ricevute.sync.map((t) => t.slug))).toEqual(
      new Set(ricevute.calendario.map((t) => t.slug)),
    );
  });
});
