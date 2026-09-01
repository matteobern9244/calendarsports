import { describe, expect, it } from "vitest";
import { allSectionsUnavailable } from "./offlineSections";

/**
 * Il guardiano offline delle pagine sportive: si mostra il fallback solo
 * quando *nessuna* sezione ha dati in cache e *tutte* quelle che tracciano
 * un errore ce l'hanno. Era lo stesso `if` scritto quattro volte con liste
 * diverse, e Sinner aveva un termine in piu' (`!playerInfo`) senza errore
 * accanto: questa funzione lo rappresenta senza appiattirlo.
 */

const err = new Error("rete assente");

describe("allSectionsUnavailable", () => {
  it("e' vero quando ogni sezione e' in errore e senza dati", () => {
    expect(
      allSectionsUnavailable([
        { data: undefined, error: err },
        { data: undefined, error: err },
      ]),
    ).toBe(true);
  });

  it("basta una sezione con dati in cache per restare in pagina", () => {
    // React Query conserva `data` anche quando il refetch fallisce: chi ha
    // gia' visto il calendario deve continuare a vederlo.
    expect(
      allSectionsUnavailable([
        { data: [{ id: 1 }], error: err },
        { data: undefined, error: err },
      ]),
    ).toBe(false);
  });

  it("una sezione senza dati ma non ancora in errore sta ancora caricando", () => {
    // `error` e' `null` finche' la richiesta non e' fallita: non e' un guasto.
    expect(
      allSectionsUnavailable([
        { data: undefined, error: null },
        { data: undefined, error: err },
      ]),
    ).toBe(false);
  });

  it("una sezione che non traccia l'errore conta solo per i dati", () => {
    // E' il caso di `playerInfo` in SinnerPage, che entra nella condizione
    // come `!playerInfo` e basta.
    expect(allSectionsUnavailable([{ data: undefined, error: err }, { data: undefined }])).toBe(
      true,
    );
    expect(allSectionsUnavailable([{ data: undefined, error: err }, { data: { name: "J" } }])).toBe(
      false,
    );
  });

  it("senza sezioni non c'e' niente di guasto", () => {
    expect(allSectionsUnavailable([])).toBe(false);
  });
});
