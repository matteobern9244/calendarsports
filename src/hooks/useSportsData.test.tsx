import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { FootballCalendar } from "@/lib/api/schemas";

vi.mock("@/lib/api/sportsApi", () => ({
  f1Api: {},
  footballApi: { getCalendar: vi.fn() },
  tennisApi: {},
  motogpApi: {},
  highlightsApi: {},
}));

import { footballApi } from "@/lib/api/sportsApi";
import { useJuventusCalendar } from "./useSportsData";

function calendario(casa: string, pagina = 1): FootballCalendar {
  return {
    items: [
      {
        id: `${casa.toLowerCase()}-${pagina}`,
        homeTeam: casa,
        awayTeam: "Lazio",
        competition: "Serie A",
        matchday: pagina,
        date: "2026-11-08T19:45:00Z",
      },
    ],
    total: 24,
    page: pagina,
    pageSize: 12,
    totalPages: 2,
    nextUpcomingIndex: 0,
  };
}

/** Il primo `items[0].homeTeam`, o `null` se la query non ha dati. */
function squadraInVista(data: FootballCalendar | undefined): string | null {
  if (!data || Array.isArray(data)) return null;
  return data.items[0]?.homeTeam ?? null;
}

/**
 * Un solo `QueryClient` per tutto il test: il `wrapper` di
 * `useCalendarEvents.test.tsx` ne costruisce uno nuovo a ogni render, e con
 * una cache che riparte da zero il placeholder non avrebbe mai niente in
 * mano — il test passerebbe senza provare niente.
 */
function creaWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** Sospende la prossima risposta e restituisce la funzione per sbloccarla. */
function rispostaSospesa() {
  let sblocca: (c: FootballCalendar) => void = () => {};
  vi.mocked(footballApi.getCalendar).mockImplementation(
    () =>
      new Promise<FootballCalendar>((res) => {
        sblocca = res;
      }),
  );
  return (c: FootballCalendar) => sblocca(c);
}

describe("useJuventusCalendar", () => {
  beforeEach(() => {
    vi.mocked(footballApi.getCalendar).mockReset();
  });

  it("al cambio squadra non mostra le partite di quella precedente", async () => {
    // La trappola numero uno di tutto questo lavoro: non produce ne' errore
    // ne' spinner, produce le partite della squadra precedente sotto il nome
    // di quella nuova.
    vi.mocked(footballApi.getCalendar).mockResolvedValue(calendario("Juventus"));
    const { result, rerender } = renderHook(({ team }) => useJuventusCalendar(team, 2026, 1, 12), {
      wrapper: creaWrapper(),
      initialProps: { team: "juventus" },
    });

    await waitFor(() => expect(squadraInVista(result.current.data)).toBe("Juventus"));

    // La seconda risposta resta sospesa: quello e' l'istante in cui il
    // placeholder decide cosa mettere in pagina, e senza sospenderla non lo
    // vedremmo mai.
    const sblocca = rispostaSospesa();
    rerender({ team: "napoli" });

    expect(squadraInVista(result.current.data)).toBeNull();
    expect(result.current.isPlaceholderData).toBe(false);

    sblocca(calendario("Napoli"));
    await waitFor(() => expect(squadraInVista(result.current.data)).toBe("Napoli"));
  });

  it("al cambio pagina tiene in vista la pagina precedente", async () => {
    // Il rovescio del test sopra: il placeholder serve a questo, e una
    // correzione che lo spegnesse e basta passerebbe il test precedente
    // rompendo la paginazione senza che niente lo dica.
    vi.mocked(footballApi.getCalendar).mockResolvedValue(calendario("Juventus", 1));
    const { result, rerender } = renderHook(
      ({ page }) => useJuventusCalendar("juventus", 2026, page, 12),
      { wrapper: creaWrapper(), initialProps: { page: 1 } },
    );

    await waitFor(() => expect(squadraInVista(result.current.data)).toBe("Juventus"));

    const sblocca = rispostaSospesa();
    rerender({ page: 2 });

    expect(squadraInVista(result.current.data)).toBe("Juventus");
    expect(result.current.isPlaceholderData).toBe(true);

    sblocca(calendario("Juventus", 2));
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
  });

  it("al cambio filtro non mostra le partite dell'altro filtro", async () => {
    // «Prossime» e «Tutte» sono due liste diverse: il placeholder che le
    // attraversa mostra per un istante partite gia' giocate sotto
    // l'intestazione delle prossime.
    vi.mocked(footballApi.getCalendar).mockResolvedValue(calendario("Juventus"));
    const { result, rerender } = renderHook(
      ({ upcoming }) => useJuventusCalendar("juventus", 2026, 1, 12, upcoming),
      { wrapper: creaWrapper(), initialProps: { upcoming: true } },
    );

    await waitFor(() => expect(squadraInVista(result.current.data)).toBe("Juventus"));

    rispostaSospesa();
    rerender({ upcoming: false });

    expect(result.current.isPlaceholderData).toBe(false);
  });
});
