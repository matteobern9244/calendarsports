import { describe, expect, it } from "vitest";
import { MAX_LEAD_MINUTES, hasReachedHorizon, notificationHorizonMs } from "./calendarWindow.ts";

const NOW = Date.UTC(2026, 8, 5, 21, 0, 0); // 5 settembre 2026, 21:00 UTC
const WINDOW_MS = 6 * 60 * 1000;
const ORA = 60 * 60 * 1000;

function partita(iso: string) {
  return { date: iso };
}

describe("notificationHorizonMs", () => {
  it("si ferma al preavviso piu' lungo, piu' la finestra di invio", () => {
    // Oltre `now + 1440 min` nessun evento puo' essere dovuto: la condizione
    // di invio e' `t <= now + preavviso`, e 1440 e' il massimo che
    // `push-subscribe` accetta.
    expect(notificationHorizonMs(NOW, WINDOW_MS)).toBe(
      NOW + MAX_LEAD_MINUTES * 60 * 1000 + WINDOW_MS,
    );
  });

  it("il preavviso massimo e' quello che la validazione a monte consente", () => {
    // Se qualcuno allargasse `VALID_LEAD_TIMES` in `push-subscribe` senza
    // toccare questa costante, l'impaginazione si fermerebbe troppo presto e
    // le notifiche a preavviso lungo sparirebbero in silenzio.
    expect(MAX_LEAD_MINUTES).toBe(1440);
  });
});

describe("hasReachedHorizon", () => {
  it("si ferma quando l'ultima partita della pagina supera l'orizzonte", () => {
    const items = [partita("2026-09-06T18:45:00.000Z"), partita("2026-11-05T20:00:00.000Z")];
    expect(hasReachedHorizon(items, notificationHorizonMs(NOW, WINDOW_MS))).toBe(true);
  });

  it("continua quando la pagina finisce prima dell'orizzonte", () => {
    const items = [
      partita(new Date(NOW + ORA).toISOString()),
      partita(new Date(NOW + 2 * ORA).toISOString()),
    ];
    expect(hasReachedHorizon(items, notificationHorizonMs(NOW, WINDOW_MS))).toBe(false);
  });

  it("una pagina vuota chiude il ciclo: non c'e' altro da leggere", () => {
    expect(hasReachedHorizon([], notificationHorizonMs(NOW, WINDOW_MS))).toBe(true);
  });

  it("una pagina senza date valide non autorizza a fermarsi", () => {
    // Meglio una chiamata in piu' che una notifica persa: se non riusciamo a
    // leggere nessuna data non sappiamo dove siamo nel calendario.
    const items = [{ date: undefined }, { date: "non-una-data" }];
    expect(hasReachedHorizon(items, notificationHorizonMs(NOW, WINDOW_MS))).toBe(false);
  });

  it("ignora le date illeggibili in coda e guarda l'ultima valida", () => {
    const items = [partita("2026-11-05T20:00:00.000Z"), { date: "non-una-data" }];
    expect(hasReachedHorizon(items, notificationHorizonMs(NOW, WINDOW_MS))).toBe(true);
  });

  it("un ISO senza Z vale UTC, come ovunque nel progetto", () => {
    // La stessa data scritta con e senza `Z` deve dare la stessa decisione.
    const conZ = [partita("2026-11-05T20:00:00.000Z")];
    const senzaZ = [partita("2026-11-05T20:00:00.000")];
    const orizzonte = notificationHorizonMs(NOW, WINDOW_MS);
    expect(hasReachedHorizon(senzaZ, orizzonte)).toBe(hasReachedHorizon(conZ, orizzonte));
  });
});
