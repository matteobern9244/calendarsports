import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { F1Race, FootballCalendar, MotoGPEvent } from "@/lib/api/schemas";

vi.mock("@/lib/api/sportsApi", () => ({
  f1Api: { getCalendar: vi.fn() },
  motogpApi: { getCalendar: vi.fn() },
  footballApi: { getCalendar: vi.fn() },
}));

import { f1Api, footballApi, motogpApi } from "@/lib/api/sportsApi";
import { resolveTeam } from "@/lib/serieATeams";
import { useCalendarEvents, type CalendarItem } from "./useCalendarEvents";

const JUVE = resolveTeam("juventus");
const NAPOLI = resolveTeam("napoli");

const f1Fixture: F1Race[] = [
  {
    round: 1,
    raceName: "Canadian Grand Prix",
    circuit: "Circuit Gilles Villeneuve",
    locality: "Montreal",
    country: "Canada",
    date: "2026-06-14",
    time: "18:00:00Z",
    firstPractice: { date: "2026-06-12", time: "17:30:00Z" },
  },
];

const motogpFixture: MotoGPEvent[] = [
  {
    round: 3,
    name: "Gran Premio d'Italia",
    circuit: "Mugello",
    date_start: "2026-05-29",
    date_end: "2026-05-31",
    sessions: [{ type: "RAC", label: "Gara", date: "2026-05-31T12:00:00Z" }],
  },
];

const juventusFixture: FootballCalendar = {
  items: [
    {
      id: "football-inter",
      homeTeam: "Juventus",
      awayTeam: "Inter",
      competition: "Serie A",
      matchday: 12,
      date: "2026-11-08T19:45:00Z",
    },
  ],
  total: 1,
  page: 1,
  pageSize: 12,
  totalPages: 1,
  nextUpcomingIndex: 0,
};

/** L'incrocio: la stessa partita vive nel calendario di entrambe. */
const incrocio: FootballCalendar = {
  ...juventusFixture,
  items: [
    {
      id: "serie-a-juventus-napoli",
      homeTeam: "Juventus",
      awayTeam: "Napoli",
      competition: "Serie A",
      matchday: 36,
      date: "2026-11-08T19:45:00Z",
    },
  ],
};

/** Solo le voci di calcio: F1 e MotoGP non dipendono dalla squadra. */
function calcio(events: CalendarItem[]): CalendarItem[] {
  return events.filter((e) => e.sport === "football");
}

function wrapper({ children }: { children: ReactNode }) {
  // `retry: false`: qui non stiamo provando la resilienza del trasporto, e
  // un retry silenzioso trasformerebbe un mock sbagliato in un test lento
  // invece che in un test rosso.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useCalendarEvents", () => {
  beforeEach(() => {
    vi.mocked(f1Api.getCalendar).mockResolvedValue(f1Fixture);
    vi.mocked(motogpApi.getCalendar).mockResolvedValue(motogpFixture);
    vi.mocked(footballApi.getCalendar).mockResolvedValue(juventusFixture);
  });

  it("espande le tre fonti in un unico elenco ordinato per data", async () => {
    const { result } = renderHook(() => useCalendarEvents(JUVE), { wrapper });

    await waitFor(() => expect(result.current.events.length).toBeGreaterThan(0));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const dates = result.current.events.map((e) => e.date);
    expect([...dates].sort()).toEqual(dates);
    expect(result.current.events.map((e) => e.sport)).toContain("f1");
    expect(result.current.events.map((e) => e.sport)).toContain("motogp");
    expect(result.current.events.map((e) => e.sport)).toContain("football");
  });

  /**
   * Il motivo per cui questo hook esiste memoizzato. `CalendarPage` fa
   * scattare un tick ogni 60 secondi per ingrigire gli eventi conclusi:
   * se `events` fosse un array nuovo a ogni render, quel tick
   * invaliderebbe `filteredEvents`, `eventsByDay` e `agendaDays`, cioe'
   * l'espansione, il filtro e l'ordinamento di ~350 eventi, pur non
   * essendo cambiato nessun dato. Le `useMemo` a valle sono scritte
   * assumendo questa stabilita': senza, non memoizzano niente.
   */
  it("restituisce lo stesso array fra due render se i dati non sono cambiati", async () => {
    const { result, rerender } = renderHook(() => useCalendarEvents(JUVE), { wrapper });

    await waitFor(() => expect(result.current.events.length).toBeGreaterThan(0));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const first = result.current.events;
    rerender();
    expect(result.current.events).toBe(first);
  });

  /**
   * La stessa partita compare in due calendari, e nei due ha versi opposti.
   * Finche' la squadra era cablata questa riga era un fatto; ora e' una
   * deduzione che dipende da chi guarda, e sbagliarla non produce nessun
   * errore: produce un «vs» al posto di un «@».
   */
  it("l'avversario e il verso dipendono dalla squadra chiesta", async () => {
    vi.mocked(footballApi.getCalendar).mockResolvedValue(incrocio);

    const juve = renderHook(() => useCalendarEvents(JUVE), { wrapper });
    await waitFor(() => expect(calcio(juve.result.current.events)).toHaveLength(1));
    expect(calcio(juve.result.current.events)[0].shortLabel).toBe("vs Napoli");

    const napoli = renderHook(() => useCalendarEvents(NAPOLI), { wrapper });
    await waitFor(() => expect(calcio(napoli.result.current.events)).toHaveLength(1));
    expect(calcio(napoli.result.current.events)[0].shortLabel).toBe("@ Juventus");
  });

  /**
   * Il link porta nel ramo della squadra da cui si sta guardando: aprire una
   * partita dal calendario aggregato del Napoli e ritrovarsi nella pagina
   * della Juventus e' il modo piu' rapido di perdere il «Torna al calendario».
   */
  it("il link porta nel ramo della squadra chiesta", async () => {
    vi.mocked(footballApi.getCalendar).mockResolvedValue(incrocio);

    const { result } = renderHook(() => useCalendarEvents(NAPOLI), { wrapper });
    await waitFor(() => expect(calcio(result.current.events)).toHaveLength(1));

    expect(calcio(result.current.events)[0].href).toBe(
      "/squadra/napoli/partite/serie-a-juventus-napoli",
    );
  });

  /**
   * Il confronto e' per uguaglianza esatta, mai per sottostringa. La Juventus
   * Next Gen gioca in Serie C e puo' comparire negli elenchi di coppa: con un
   * `includes` il calendario la scambierebbe per la prima squadra in casa, e
   * finirebbe per chiamare «avversario» proprio la Juventus.
   */
  it("una squadra che contiene il nome di un'altra non e' quell'altra", async () => {
    vi.mocked(footballApi.getCalendar).mockResolvedValue({
      ...incrocio,
      items: [{ ...incrocio.items[0], homeTeam: "Juventus Next Gen", awayTeam: "Foggia" }],
    });

    const { result } = renderHook(() => useCalendarEvents(JUVE), { wrapper });
    await waitFor(() => expect(calcio(result.current.events)).toHaveLength(1));

    expect(calcio(result.current.events)[0].shortLabel).toBe("@ Juventus Next Gen");
  });
});
