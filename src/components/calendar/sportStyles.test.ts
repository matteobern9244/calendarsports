import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveTeam } from "@/lib/serieATeams";
import { sportLabel } from "./sportStyles";

const JUVE = resolveTeam("juventus");
const NAPOLI = resolveTeam("napoli");

describe("sportLabel", () => {
  /**
   * L'etichetta del calcio e' il nome della squadra, non una costante. Un
   * filtro che dice «Juventus» sopra un elenco di partite del Napoli non e'
   * una svista di stile: e' l'unica scritta che dichiara di chi sono quelle
   * partite, e direbbe il falso.
   */
  it("il calcio prende il nome della squadra guardata", () => {
    expect(sportLabel("football", JUVE)).toBe("Juventus");
    expect(sportLabel("football", NAPOLI)).toBe("Napoli");
  });

  it("gli altri sport non dipendono dalla squadra", () => {
    expect(sportLabel("f1", NAPOLI)).toBe("F1");
    expect(sportLabel("motogp", NAPOLI)).toBe("MotoGP");
  });
});

/**
 * I colori non passano da TypeScript: `SPORT_DOT` e `SPORT_BADGE` scrivono
 * `hsl(var(--sport-football))` dentro una stringa di classi, e il valore lo
 * definisce `index.css`. Fra i due file non c'e' nessun legame che il
 * compilatore possa controllare.
 *
 * Sbagliare quel nome non produce un errore: `hsl(var(--niente))` e' una
 * dichiarazione non valida, il browser la scarta, e il pallino dello sport
 * **sparisce**. Nessun avviso in console, nessun test rosso, una legenda muta.
 *
 * E' successo per un soffio in questo commit: la voce del calcio si chiamava
 * `--sport-juventus` in tutti e due i file, e rinominarla in uno solo sarebbe
 * bastato.
 */
describe("token dei colori", () => {
  const ROOT = resolve(import.meta.dirname, "../../..");
  const css = readFileSync(join(ROOT, "src/index.css"), "utf8");
  const stili = readFileSync(join(ROOT, "src/components/calendar/sportStyles.ts"), "utf8");

  it("ogni token usato dal calendario e' definito in index.css", () => {
    const usati = [...new Set([...stili.matchAll(/--sport-[a-z0-9-]+/g)].map((m) => m[0]))];
    expect(usati.length, "nessun token trovato: la ricerca non funziona piu'").toBeGreaterThan(0);
    for (const token of usati) {
      expect(css, `${token} usato da sportStyles.ts ma non definito`).toContain(`${token}:`);
    }
  });

  /**
   * Da quando il calcio segue la squadra, `sportStyles.ts` legge anche
   * `--team-accent` e `--team-accent-text`. Quelle variabili le scrive
   * `TeamPalette` su `<html>` a runtime, ma **devono esistere anche senza**:
   * il ripiego su `:root` in `index.css` e' cio' che tiene in vita il pallino
   * prima che React monti, e in una pagina che `TeamPalette` non raggiungesse.
   */
  it("anche i token della squadra hanno un ripiego in index.css", () => {
    const usati = [...new Set([...stili.matchAll(/--team-[a-z0-9-]+/g)].map((m) => m[0]))];
    expect(usati.length, "il calcio non legge piu' nessun token squadra").toBeGreaterThan(0);
    for (const token of usati) {
      expect(css, `${token} usato da sportStyles.ts ma senza ripiego`).toContain(`${token}:`);
    }
  });

  it("ogni token e' definito sia in chiaro sia in scuro", () => {
    // I due blocchi hanno valori diversi: lo stesso oro su fondo chiaro e su
    // fondo scuro non ha lo stesso contrasto. Definirne uno solo darebbe un
    // colore giusto in un tema e assente nell'altro.
    const usati = [...new Set([...stili.matchAll(/--sport-[a-z0-9-]+/g)].map((m) => m[0]))];
    for (const token of usati) {
      const definizioni = css.match(new RegExp(`${token}:`, "g")) ?? [];
      expect(definizioni, `${token} definito ${definizioni.length} volta/e`).toHaveLength(2);
    }
  });
});
