import { describe, it, expect, vi, afterEach } from "vitest";
import { f1Api, footballApi } from "./sportsApi";

function respondWith(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callEdgeFunction", () => {
  it("restituisce i dati validati", async () => {
    vi.stubGlobal(
      "fetch",
      respondWith({
        success: true,
        data: [{ position: 1, team: "Juventus", points: 73 }],
      }),
    );
    const standings = await footballApi.getStandings(2026);
    expect(standings[0].team).toBe("Juventus");
  });

  it("propaga l'errore dichiarato dall'edge function", async () => {
    vi.stubGlobal("fetch", respondWith({ success: false, error: "Dati non trovati" }));
    await expect(footballApi.getStandings(2026)).rejects.toThrow("Dati non trovati");
  });

  it("nomina endpoint e campo quando il payload cambia forma", async () => {
    // Il valore aggiunto rispetto a `any` e' tutto qui: senza validazione
    // una gara senza `raceName` arrivava in pagina come `undefined` e il
    // guasto si vedeva solo a schermo.
    vi.stubGlobal("fetch", respondWith({ success: true, data: { round: 6, circuit: "Imola" } }));
    await expect(f1Api.getNextRace()).rejects.toThrow(/sports-f1:next-race/);
    vi.stubGlobal("fetch", respondWith({ success: true, data: { round: 6, circuit: "Imola" } }));
    await expect(f1Api.getNextRace()).rejects.toThrow(/raceName/);
  });

  it("accetta il null esplicito dove l'endpoint lo prevede", async () => {
    vi.stubGlobal("fetch", respondWith({ success: true, data: null }));
    await expect(f1Api.getNextRace()).resolves.toBeNull();
  });

  it("non ritenta gli errori non transitori", async () => {
    const fetchMock = respondWith({}, 404);
    vi.stubGlobal("fetch", fetchMock);
    await expect(footballApi.getStandings(2026)).rejects.toThrow("Errore API: 404");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("footballApi: la squadra viaggia con la richiesta", () => {
  /**
   * Mettere la squadra nella chiave di cache senza metterla nella richiesta
   * sarebbe peggio che non farlo: si creerebbe una voce di cache intestata al
   * Napoli e la si riempirebbe con le partite della Juventus. Nessun errore,
   * nessun caricamento sospeso, solo il calendario sbagliato.
   */
  function urlChiamato(fetchMock: ReturnType<typeof respondWith>): string {
    return String(fetchMock.mock.calls[0][0]);
  }

  it("il calendario chiede la squadra richiesta", async () => {
    const fetchMock = respondWith({ success: true, data: [] });
    vi.stubGlobal("fetch", fetchMock);
    await footballApi.getCalendar("napoli", 2026, 1, 12);
    expect(urlChiamato(fetchMock)).toContain("team=napoli");
  });

  it("la scheda squadra chiede la squadra richiesta", async () => {
    const fetchMock = respondWith({ success: true, data: null });
    vi.stubGlobal("fetch", fetchMock);
    await footballApi.getTeamInfo("lecce", 2026);
    expect(urlChiamato(fetchMock)).toContain("team=lecce");
  });

  it("la classifica non manda la squadra, perché non le serve", async () => {
    const fetchMock = respondWith({ success: true, data: [] });
    vi.stubGlobal("fetch", fetchMock);
    await footballApi.getStandings(2026);
    expect(urlChiamato(fetchMock)).not.toContain("team=");
  });
});
