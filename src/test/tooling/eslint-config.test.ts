import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Guardiano sulla configurazione ESLint.
 *
 * Un blocco `files:` che punta a una cartella rinominata non e' un errore:
 * semplicemente non trova mai niente, e le regole che contiene smettono di
 * essere applicate in silenzio. E' lo stesso guasto della directory
 * `supabase/functions/` rimasta fuori dal lint per mesi.
 */

const ROOT = resolve(import.meta.dirname, "../../..");
const config = readFileSync(join(ROOT, "eslint.config.js"), "utf8");

/** Prefisso letterale di un glob, cioe' la parte che deve esistere su disco. */
function prefissoLetterale(glob: string): string {
  const taglio = glob.search(/[*{]/);
  const parte = taglio === -1 ? glob : glob.slice(0, taglio);
  return parte.replace(/\/+$/, "");
}

/** I glob dei blocchi `files:`. Gli `ignores:` restano fuori di proposito:
 *  citano artefatti di build (`dist`, `test-results`) che su un checkout
 *  pulito non esistono, ed e' giusto cosi'. */
function globDeiBlocchiFiles(): string[] {
  const globs: string[] = [];
  for (const blocco of config.matchAll(/files:\s*\[([^\]]*)\]/g)) {
    for (const stringa of blocco[1].matchAll(/"([^"]+)"/g)) globs.push(stringa[1]);
  }
  return globs;
}

describe("Configurazione ESLint", () => {
  it("ogni percorso citato in un blocco `files:` esiste", () => {
    const globs = globDeiBlocchiFiles();
    expect(globs.length).toBeGreaterThan(0);
    for (const glob of globs) {
      const prefisso = prefissoLetterale(glob);
      if (!prefisso) continue; // `*.config.{js,ts}` e simili: nessun prefisso da verificare
      expect(
        existsSync(join(ROOT, prefisso)),
        `${glob} punta a "${prefisso}", che non esiste`,
      ).toBe(true);
    }
  });

  it("le aree che erano rimaste scoperte sono coperte", () => {
    // Prima dell'audit, lint girava solo su `src/**`: script di verifica,
    // test e2e ed edge function non erano analizzati da nessuna regola.
    for (const area of ["scripts/", "e2e/", "supabase/functions/"]) {
      expect(
        globDeiBlocchiFiles().some((g) => g.startsWith(area)),
        `${area} non e' lintata`,
      ).toBe(true);
    }
  });

  it("Prettier resta l'ultimo elemento della flat config", () => {
    // Se non e' ultimo, le regole di stile che dovrebbe spegnere tornano
    // attive e litigano con lui.
    const esportazione = config.slice(config.indexOf("export default"));
    const ultimo = esportazione.trimEnd().replace(/\);?$/, "").trimEnd().split("\n").pop()?.trim();
    expect(ultimo?.replace(/,$/, "")).toBe("prettierRecommended");
  });

  it("il divieto di importare il client Supabase generato resta attivo", () => {
    // E' il guardrail che impedisce le richieste che rispondono HTML con
    // stato 200 e lasciano React Query in caricamento per sempre.
    expect(config).toContain("no-restricted-imports");
    expect(config).toContain("integrations/supabase/client");
  });

  it("le regole spente dichiarano perche'", () => {
    // Una regola spenta senza motivo si riaccende per sbaglio o non si
    // riaccende mai: in entrambi i casi nessuno sa decidere.
    for (const spenta of config.matchAll(/^\s*"([\w@/-]+)":\s*"off"/gm)) {
      const indice = config.indexOf(spenta[0]);
      const precedenti = config.slice(0, indice).split("\n").slice(-6).join("\n");
      expect(precedenti, `la regola ${spenta[1]} e' spenta senza motivazione`).toMatch(/\/\/|\*/);
    }
  });
});
