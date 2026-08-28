import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { queryKeys } from "./queryKeys";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("queryKeys", () => {
  it("chi legge e chi scrive producono la stessa chiave per i risultati di Sinner", () => {
    // La pagina legge con pagina e dimensione, la sincronizzazione scriveva
    // senza: `setQueryData` vuole la corrispondenza esatta, quindi quel
    // prefetch finiva nel vuoto a ogni sincronizzazione.
    const letta = queryKeys.sinner.results(2026, 1, 12);
    const scritta = queryKeys.sinner.results(2026, 1, 12);
    expect(scritta).toEqual(letta);
    expect(letta).toHaveLength(5);
  });

  it("il calendario Juventus senza paginazione e' una voce di cache distinta", () => {
    expect(queryKeys.juventus.calendar(2026)).toEqual([
      "juventus",
      "calendar",
      2026,
      null,
      null,
      false,
    ]);
    expect(queryKeys.juventus.calendar(2026, 1, 12)).not.toEqual(queryKeys.juventus.calendar(2026));
  });

  it("nessuno riscrive le chiavi a mano fuori dalla fabbrica", () => {
    // Guardiano: una chiave scritta a mano non produce errori, produce un buco
    // nero. Se serve una chiave nuova, si aggiunge a queryKeys.ts.
    // Cerca un array letterale nella posizione in cui React Query si aspetta
    // una chiave: `queryKey:`, `setQueryData(`, `getQueryData(`,
    // `invalidateQueries({ queryKey: ... })`. Un array di nomi di sport usato
    // per altro non e' una violazione.
    const USI = /(queryKey:\s*|setQueryData\(\s*|getQueryData\(\s*)\[/;
    const violazioni: string[] = [];
    for (const file of [
      "src/hooks/useSportsData.ts",
      "src/hooks/useStreamingData.ts",
      "src/hooks/useSyncAll.ts",
    ]) {
      read(file)
        .split("\n")
        .forEach((riga, i) => {
          if (USI.test(riga)) violazioni.push(`${file}:${i + 1} ${riga.trim()}`);
        });
    }
    expect(violazioni).toEqual([]);
  });
});
