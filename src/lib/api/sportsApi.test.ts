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
