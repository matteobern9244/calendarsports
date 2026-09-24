import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Guardiano sul vocabolario dello stato di una partita, che esiste in due
 * copie.
 *
 * Le edge function girano su Deno e vengono impacchettate con il solo
 * contenuto di `supabase/functions/`: un import che risalga dentro `src/`
 * supera il typecheck locale e si rompe al deploy. Da qui le due copie, come
 * gia' per l'elenco delle squadre e per le playlist degli highlights.
 *
 * Due copie che divergono non producono nessun errore. Producono un'app che
 * chiama «in corso» una partita a cui la fonte ha appena dato per finita, o
 * peggio un punteggio che una parte pubblica e l'altra nasconde — e succede
 * soltanto sullo stato appena aggiunto, cioe' quello che nessuno riprova.
 *
 * Il confronto non e' carattere per carattere: i due file fanno cose diverse
 * (uno decide se pubblicare i punteggi, l'altro come chiamare la fase davanti
 * all'utente) e solo l'elenco degli stati deve coincidere.
 */

const ROOT = resolve(import.meta.dirname, "../../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const EDGE = "supabase/functions/sports-football/matchStatus.ts";
const APP = "src/lib/matchPhase.ts";

/** Gli stati elencati come «non ancora cominciata», da entrambe le parti. */
function statiDiAttesa(sorgente: string): string[] {
  const m = /NON_COMINCIATA\s*=\s*new Set\(\[([^\]]*)\]\)/.exec(sorgente);
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]).sort();
}

/** Lo stato che chiude la partita. */
function statoFinale(sorgente: string): string | null {
  const m = /STATO_FINITA\s*=\s*"([^"]+)"/.exec(sorgente);
  return m ? m[1] : null;
}

describe("Specchio del vocabolario dello stato partita", () => {
  it("le due copie esistono", () => {
    expect(existsSync(join(ROOT, EDGE)), `manca \`${EDGE}\``).toBe(true);
    expect(existsSync(join(ROOT, APP)), `manca \`${APP}\``).toBe(true);
  });

  it("elencano gli stessi stati di attesa", () => {
    const edge = statiDiAttesa(read(EDGE));
    const app = statiDiAttesa(read(APP));
    expect(edge.length, `\`${EDGE}\`: elenco non trovato`).toBeGreaterThan(0);
    expect(app, `\`${APP}\` diverge da \`${EDGE}\``).toEqual(edge);
  });

  it("chiamano allo stesso modo la partita finita", () => {
    const edge = statoFinale(read(EDGE));
    expect(edge, `\`${EDGE}\`: stato finale non trovato`).toBeTruthy();
    expect(statoFinale(read(APP)), `\`${APP}\` diverge da \`${EDGE}\``).toBe(edge);
  });

  it("nessuna delle due prova a importare l'altra", () => {
    // Un import fra i due mondi passa il typecheck e si rompe al deploy: le
    // edge function vengono impacchettate con il solo contenuto di
    // `supabase/functions/`, quindi un `src/` risolto in locale la' non esiste.
    //
    // Si guardano le sole righe di import, non il testo del file: i due moduli
    // si **citano** a vicenda nei commenti, ed e' giusto che lo facciano — chi
    // ne apre uno deve sapere che esiste l'altro.
    const importa = (sorgente: string) =>
      sorgente.split("\n").filter((r) => /^\s*import\b/.test(r) || /\bfrom\s+"/.test(r));
    expect(importa(read(EDGE)).join("\n")).not.toContain("src/lib");
    expect(importa(read(APP)).join("\n")).not.toContain("supabase/functions");
  });
});
