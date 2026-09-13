import { describe, expect, it } from "vitest";
import { INTERVALLO_LIVE_MS, INTERVALLO_LIVE_RISPARMIO_MS, intervalloLive } from "./liveRefresh";

/**
 * Un punteggio che non si aggiorna e' un punteggio sbagliato dopo dieci
 * minuti: la pagina lo mostrerebbe fermo al momento in cui e' stata aperta,
 * senza dire che e' vecchio.
 */
describe("intervalloLive", () => {
  it("aggiorna solo mentre si gioca", () => {
    expect(intervalloLive("prepartita", "realtime")).toBe(false);
    expect(intervalloLive("finita", "realtime")).toBe(false);
  });

  it("mentre si gioca chiede di nuovo al minuto", () => {
    expect(intervalloLive("in-corso", "realtime")).toBe(INTERVALLO_LIVE_MS);
  });

  /**
   * Chi ha scelto il risparmio ha chiesto meno consumo, e una richiesta di
   * rete costa piu' di un tick di orologio: ignorarlo qui vorrebbe dire
   * rispettare la preferenza solo dove si vede.
   */
  it("chi ha scelto il risparmio ne riceve meno", () => {
    expect(intervalloLive("in-corso", "saver")).toBe(INTERVALLO_LIVE_RISPARMIO_MS);
    expect(INTERVALLO_LIVE_RISPARMIO_MS).toBeGreaterThan(INTERVALLO_LIVE_MS);
  });
});
