import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * Guardiano sul progetto Supabase a cui parla l'app.
 *
 * Dal 9 ottobre 2026 il backend e' un progetto Supabase personale, non piu'
 * quello di Lovable Cloud. Lovable pero' resta collegato al suo Cloud: rigenera
 * `.env` e i file in `src/integrations/` con l'indirizzo vecchio, e il suo
 * agente puo' riscriverli a ogni modifica. Nessuno di questi guasti produce un
 * errore: l'app continua a funzionare, solo contro il database sbagliato, e il
 * login di chi e' migrato smette di trovare il suo profilo.
 *
 * Per questo il client non legge le variabili `VITE_SUPABASE_*` (sono di
 * Lovable Cloud) e nessun file dell'app nomina il progetto vecchio. I file
 * generati in `src/integrations/` sono esclusi: li possiede Lovable, e l'app
 * non li importa (vedi `no-restricted-imports` in `eslint.config.js`).
 */

const ROOT = resolve(import.meta.dirname, "../../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const PROGETTO_ATTUALE = "jhrpalouxwntkimacqkg";
const PROGETTO_LOVABLE_CLOUD = "jxijruuclgskxlbqittk";

function sorgentiApp(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const percorso = join(dir, nome);
    if (statSync(percorso).isDirectory()) {
      return nome === "integrations" ? [] : sorgentiApp(percorso);
    }
    return /\.(ts|tsx)$/.test(nome) ? [percorso] : [];
  });
}

describe("progetto Supabase dell'app", () => {
  it("il client punta al progetto personale", () => {
    expect(read("src/lib/supabaseClient.ts")).toContain(`https://${PROGETTO_ATTUALE}.supabase.co`);
  });

  it("il client non legge le variabili d'ambiente gestite da Lovable Cloud", () => {
    expect(read("src/lib/supabaseClient.ts")).not.toMatch(/import\.meta\.env\.VITE_SUPABASE_/);
  });

  it("nessun file dell'app nomina il progetto di Lovable Cloud", () => {
    const colpevoli = sorgentiApp(join(ROOT, "src"))
      .filter((f) => !f.endsWith("supabaseProject.test.ts"))
      .filter((f) => readFileSync(f, "utf8").includes(PROGETTO_LOVABLE_CLOUD))
      .map((f) => relative(ROOT, f));
    expect(colpevoli).toEqual([]);
  });

  it("la CLI Supabase e' collegata al progetto personale", () => {
    expect(read("supabase/config.toml")).toMatch(
      new RegExp(`^project_id = "${PROGETTO_ATTUALE}"`, "m"),
    );
  });
});
