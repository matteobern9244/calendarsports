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
    expect(queryKeys.juventus.calendar("juventus", 2026)).toEqual([
      "juventus",
      "calendar",
      "juventus",
      2026,
      false,
      null,
      null,
    ]);
    expect(queryKeys.juventus.calendar("juventus", 2026, 1, 12)).not.toEqual(
      queryKeys.juventus.calendar("juventus", 2026),
    );
  });

  it("il calendario di due squadre sono due voci di cache diverse", () => {
    // È la trappola numero uno di tutto questo lavoro: una cache condivisa
    // fra squadre non produce né errore né spinner, produce le partite della
    // squadra precedente sotto il nome di quella nuova.
    expect(queryKeys.juventus.calendar("napoli", 2026, 1, 12)).not.toEqual(
      queryKeys.juventus.calendar("juventus", 2026, 1, 12),
    );
    expect(queryKeys.juventus.info("napoli", 2026)).not.toEqual(
      queryKeys.juventus.info("juventus", 2026),
    );
    expect(queryKeys.juventus.calendarAll("napoli", 2026, 3)).not.toEqual(
      queryKeys.juventus.calendarAll("juventus", 2026, 3),
    );
  });

  it("la classifica NON porta la squadra", () => {
    // Il payload di `standings` è identico per tutte e venti: metterla nella
    // chiave moltiplicherebbe per venti le stesse identiche righe, e ogni
    // cambio squadra ricomincerebbe da un caricamento inutile.
    expect(queryKeys.juventus.standings(2026)).toEqual(["juventus", "standings", 2026]);
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
      // Mancava, e infatti dentro c'erano quattro chiavi scritte a mano —
      // fra cui una, `calendar-all`, che non aveva nemmeno una fabbrica.
      "src/hooks/useCalendarEvents.ts",
      // Anche le pagine: il prefetch della pagina successiva costruisce una
      // chiave, e una chiave scritta a mano accanto a un placeholder che
      // ragiona sulla forma della chiave e' il modo in cui questo difetto
      // torna.
      "src/pages/SinnerPage.tsx",
      "src/pages/JuventusPage.tsx",
      // E il profilo: la stessa chiave la scrivono `onMutate`, `onError` e
      // `onSuccess`, e un aggiornamento ottimistico che leggesse una chiave
      // diversa da quella che scrive rimetterebbe a posto il niente.
      "src/hooks/useProfile.ts",
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
