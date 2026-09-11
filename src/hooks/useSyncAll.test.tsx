import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryKeys } from "@/lib/queryKeys";
import { getCurrentJuventusSeason } from "@/lib/currentSeason";

/**
 * «Sincronizza» non chiama gli hook: chiama le edge function e scrive il
 * risultato in cache con `setQueryData`. Il legame con quello che l'utente
 * vedra' e' quindi **soltanto la chiave**, e una chiave sbagliata non produce
 * un errore: produce un pulsante che gira, dice «fatto», e non cambia niente.
 *
 * Da quando la squadra fa parte della chiave, quel legame ha un modo in piu'
 * di rompersi: basta che la pagina e la sincronizzazione ricevano due squadre
 * diverse.
 */
const { chiamaEdge, calendario } = vi.hoisted(() => ({
  chiamaEdge: vi.fn<(fn: string, params: Record<string, string>) => Promise<unknown>>(),
  calendario: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

const PAGINA = { items: [{ id: "x" }], total: 1, page: 1, pageSize: 12, totalPages: 1 };

vi.mock("@/lib/api/sportsApi", () => ({
  callEdgeFunctionWithMeta: (fn: string, params: Record<string, string>) =>
    chiamaEdge(fn, params).then((data) => ({ data, meta: { dataSource: "live" } })),
  footballApi: {
    getCalendar: (...args: unknown[]) => calendario(...args),
    getStandings: () => Promise.resolve([]),
    getTeamInfo: () => Promise.resolve({}),
  },
  f1Api: { getCalendar: () => Promise.resolve([]) },
  motogpApi: { getCalendar: () => Promise.resolve([]) },
  streamingApi: {
    getTvByFamily: () => Promise.resolve([]),
    getReleasesItaly: () => Promise.resolve([]),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";
import { useSyncAll } from "./useSyncAll";
import { useCalendarEvents } from "./useCalendarEvents";
import { resolveTeam } from "@/lib/serieATeams";

const JUVE = resolveTeam("juventus");
const NAPOLI = resolveTeam("napoli");

const STAGIONE = getCurrentJuventusSeason();

type Ambiente = ReturnType<typeof ambiente>;

function ambiente() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

/** I parametri con cui la sincronizzazione ha chiesto il calendario. */
function richiesteCalendario() {
  return chiamaEdge.mock.calls
    .filter(([fn, params]) => fn === "sports-football" && params.action === "calendar")
    .map(([, params]) => params);
}

/** Preme «Sincronizza» per il Napoli e aspetta che abbia finito. */
async function sincronizza({ wrapper }: Ambiente) {
  const { result } = renderHook(() => useSyncAll(NAPOLI), { wrapper });
  await result.current.sync();
  await waitFor(() => expect(result.current.syncing).toBe(false));
}

describe("useSyncAll", () => {
  beforeEach(() => {
    chiamaEdge.mockReset();
    calendario.mockReset();
    vi.mocked(toast.loading).mockClear();
    chiamaEdge.mockResolvedValue(PAGINA);
    calendario.mockResolvedValue(PAGINA);
  });

  it("scrive il calendario nella chiave che la pagina legge, per la squadra chiesta", async () => {
    const amb = ambiente();
    await sincronizza(amb);

    // La stessa chiave che `useJuventusCalendar(team, season, 1, 12, false)`
    // andra' a leggere: se qui cambiasse l'ordine degli elementi, la
    // sincronizzazione riempirebbe una voce che nessuno apre.
    expect(
      amb.client.getQueryData(queryKeys.juventus.calendar("napoli", STAGIONE, 1, 12, false)),
    ).toEqual(PAGINA);
    expect(amb.client.getQueryData(queryKeys.juventus.info("napoli", STAGIONE))).toBeDefined();
  });

  it("la richiesta porta la stessa squadra della chiave", async () => {
    // Una chiave intestata al Napoli riempita con le partite della Juventus
    // non e' un caso di scuola: e' cio' che succede se il `team` finisce
    // nella chiave ma non nei parametri.
    const amb = ambiente();
    await sincronizza(amb);

    const richieste = richiesteCalendario();
    expect(richieste.length).toBeGreaterThan(0);
    for (const params of richieste) {
      expect(params.team, JSON.stringify(params)).toBe("napoli");
    }
  });

  it("non scalda la cache di un'altra squadra", async () => {
    const amb = ambiente();
    await sincronizza(amb);

    expect(
      amb.client.getQueryData(queryKeys.juventus.calendar("juventus", STAGIONE, 1, 12, false)),
      "la Juventus non e' stata chiesta",
    ).toBeUndefined();
  });

  it("la classifica resta condivisa fra tutte le squadre", async () => {
    // Il payload della classifica e' identico per tutte e venti: se la
    // squadra entrasse nella sua chiave, ogni cambio squadra ricomincerebbe
    // da un caricamento per mostrare le stesse righe.
    const amb = ambiente();
    await sincronizza(amb);

    expect(amb.client.getQueryData(queryKeys.juventus.standings(STAGIONE))).toBeDefined();
    const classifica = chiamaEdge.mock.calls.find(
      ([fn, params]) => fn === "sports-football" && params.action === "standings",
    );
    expect(classifica?.[1]).not.toHaveProperty("team");
  });

  it("il calendario aggregato riusa quello che la sincronizzazione ha scaldato", async () => {
    // E' il contratto dichiarato da `useCalendarEvents`: le stesse chiavi
    // delle pagine sport, quindi «Sincronizza» aggiorna anche /calendario
    // senza che quella pagina sappia che e' successo. Regge solo finche' le
    // due parti parlano della stessa squadra.
    const amb = ambiente();
    await sincronizza(amb);

    calendario.mockClear();
    renderHook(() => useCalendarEvents(NAPOLI), { wrapper: amb.wrapper });

    await waitFor(() =>
      expect(amb.client.getQueryData(queryKeys.f1.calendar(STAGIONE))).toBeDefined(),
    );
    const primePagine = calendario.mock.calls.filter(([, , page]) => page === 1);
    expect(primePagine, "la prima pagina era gia' in cache").toHaveLength(0);
  });

  it("con un'altra squadra il calendario aggregato riparte da capo", async () => {
    // Il rovescio del test precedente: se la chiave non distinguesse le
    // squadre, /calendario mostrerebbe le partite del Napoli intestate alla
    // Juventus.
    const amb = ambiente();
    await sincronizza(amb);

    calendario.mockClear();
    renderHook(() => useCalendarEvents(JUVE), { wrapper: amb.wrapper });

    await waitFor(() =>
      expect(calendario.mock.calls.filter(([team]) => team === "juventus").length).toBeGreaterThan(
        0,
      ),
    );
  });

  /**
   * Anche quello che «Sincronizza» **dice** e' intestato a una squadra. I
   * passi scorrono in un toast — «Aggiorno Juventus 2026/27...» — e restare
   * fermi sulla Juventus mentre si aggiorna il Napoli non romperebbe niente:
   * mostrerebbe soltanto una riga falsa a chi la legge.
   */
  it("i passi mostrati nominano la squadra chiesta", async () => {
    const amb = ambiente();
    await sincronizza(amb);

    const messaggi = vi.mocked(toast.loading).mock.calls.map(([testo]) => String(testo));
    expect(messaggi.some((m) => m.includes("Napoli"))).toBe(true);
    expect(messaggi.filter((m) => m.includes("Juventus"))).toEqual([]);
  });
});
