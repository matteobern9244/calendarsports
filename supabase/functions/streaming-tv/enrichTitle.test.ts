import { describe, it, expect } from "vitest";
import { enrichTitle, type RichTitle } from "./enrichTitle.ts";

// Questi test ricopiavano `enrichTitle` dentro il file, e il commento in
// testa lo ammetteva: "una divergenza tra questa copia e la funzione live
// passa inosservata in CI". La copia esisteva perche' importare `index.ts`
// avrebbe fatto partire `Deno.serve`, e perche' il runner non raccoglieva
// `supabase/functions/`. Nessuna delle due cose e' piu' vera: la funzione sta
// in un modulo suo e questo test importa quella di produzione.

describe("enrichTitle", () => {
  it("placeholder EV-SP risolve al rich title col genere Sport", () => {
    const rich: RichTitle[] = [
      { title: "Calcio - Coppa Italia - Inter Vs Como (Sport)" },
      { title: "Tg5 - Notte (News)" },
    ];
    const result = enrichTitle("EV-SP", rich, 20, 40);
    expect(result.title).toBe("Calcio - Coppa Italia - Inter Vs Como");
    expect(result.genre).toBe("Sport");
  });

  it("placeholder EV-CN risolve al rich title col genere Film", () => {
    const rich: RichTitle[] = [{ title: "Il Padrino (Film)" }, { title: "Telegiornale (News)" }];
    const result = enrichTitle("EV-CN", rich, 21, 15);
    expect(result.title).toBe("Il Padrino");
    expect(result.genre).toBe("Film");
  });

  it("match per HH:MM esatto quando il prefisso fallisce", () => {
    const rich: RichTitle[] = [{ title: "Programma Speciale Misterioso (Sport)", hh: 20, mm: 40 }];
    const result = enrichTitle("XYZ-123", rich, 20, 40);
    expect(result.title).toBe("Programma Speciale Misterioso");
    expect(result.genre).toBe("Sport");
  });

  it("match per prefisso normale resta prioritario", () => {
    const rich: RichTitle[] = [
      { title: "Roberta Valente Notaio in Sorrento - Stagione 1 (Fiction)" },
    ];
    const result = enrichTitle("ROBERTA VALENTE - NOTAIO IN SORRENTO - S1E3", rich);
    expect(result.title).toContain("Roberta Valente");
    expect(result.genre).toBe("Fiction");
  });

  it("nessun match: fallback al raw cosmetizzato", () => {
    const result = enrichTitle("EV-SP", [], 20, 40);
    expect(result.title).toBe("Ev-Sp");
    expect(result.genre).toBeUndefined();
  });

  it("EV-SP con piu' candidati Sport: vince quello piu' vicino in tempo", () => {
    const rich: RichTitle[] = [
      { title: "Calcio - Coppa Italia - Inter Vs Como (Sport)", hh: 20, mm: 40 },
      { title: "Calcio Highlights Notte (Sport)", hh: 23, mm: 0 },
    ];
    const result = enrichTitle("EV-SP", rich, 20, 40);
    expect(result.title).toBe("Calcio - Coppa Italia - Inter Vs Como");
    expect(result.genre).toBe("Sport");
  });

  it("EV-SP con orario uguale ma generi diversi: filtro genere scarta News", () => {
    const rich: RichTitle[] = [
      { title: "Anteprima Tg5 (News)", hh: 20, mm: 40 },
      { title: "Calcio - Coppa Italia (Sport)", hh: 20, mm: 40 },
    ];
    const result = enrichTitle("EV-SP", rich, 20, 40);
    expect(result.title).toBe("Calcio - Coppa Italia");
    expect(result.genre).toBe("Sport");
  });

  it("EV-SP senza orario: lengthBonus tiebreaker sceglie il titolo piu' lungo", () => {
    const rich: RichTitle[] = [
      { title: "Calcio (Sport)" },
      { title: "Calcio - Coppa Italia - Inter Vs Como (Sport)" },
    ];
    const result = enrichTitle("EV-SP", rich);
    expect(result.title).toBe("Calcio - Coppa Italia - Inter Vs Como");
    expect(result.genre).toBe("Sport");
  });

  it("EV-SP senza candidati di genere atteso: safety net match per orario", () => {
    const rich: RichTitle[] = [{ title: "Tg5 - Notte (News)", hh: 20, mm: 40 }];
    const result = enrichTitle("EV-SP", rich, 20, 40);
    // Cio' che conta e' che il safety net abbia selezionato il rich title per
    // orario esatto invece di cadere sul raw cosmetizzato "Ev-Sp".
    //
    // L'asserzione qui diceva `"Tg5 - Notte (News)"` con `genre` undefined,
    // e il commento lo motivava con "News non e' nella whitelist locale
    // ridotta del test": la copia nel file di test aveva sei generi, la
    // funzione vera ne ha decine, News compreso. Contro la funzione vera il
    // genere viene estratto, ed e' il comportamento voluto.
    expect(result.title).toBe("Tg5 - Notte");
    expect(result.genre).toBe("News");
  });
});
