import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Guardiano sullo specchio Deno dell'elenco squadre.
 *
 * Le edge function girano su Deno e vengono caricate con il solo contenuto di
 * `supabase/functions/`: un import che risalga dentro `src/` supera il
 * typecheck locale e si rompe al deploy. Da qui le due copie.
 *
 * Due copie che divergono non producono un errore, producono una tendina che
 * offre una squadra che l'edge function rifiuta con 400 — e succede soltanto
 * sulla squadra appena aggiunta, cioe' quella che nessuno riprova.
 */

const ROOT = resolve(import.meta.dirname, "../../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const SORGENTE = "src/lib/serieATeams.ts";
const SPECCHIO = "supabase/functions/_shared/serieATeams.ts";
const COMANDO = "bun run sync:teams";

describe("Specchio Deno dell'elenco squadre", () => {
  it("lo specchio esiste", () => {
    expect(existsSync(join(ROOT, SPECCHIO)), `manca \`${SPECCHIO}\`: lancia \`${COMANDO}\``).toBe(
      true,
    );
  });

  it("lo specchio e' la sorgente, carattere per carattere", () => {
    const sorgente = read(SORGENTE);
    const specchio = read(SPECCHIO);
    // L'intestazione e' l'unica differenza ammessa: dice a chi apre il file
    // sbagliato che le sue modifiche verranno sovrascritte.
    const corpo = specchio.slice(specchio.indexOf("/**", specchio.indexOf("*/")));
    expect(corpo, `\`${SPECCHIO}\` e' divergente: lancia \`${COMANDO}\``).toBe(sorgente);
  });

  it("l'intestazione dello specchio dice da dove arriva e come rigenerarlo", () => {
    const specchio = read(SPECCHIO);
    const intestazione = specchio.slice(0, specchio.indexOf("*/"));
    expect(intestazione).toContain(SORGENTE);
    expect(intestazione).toContain(COMANDO);
  });

  it("il comando di rigenerazione esiste", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts, `il messaggio del guardiano cita \`${COMANDO}\``).toHaveProperty(
      "sync:teams",
    );
    expect(existsSync(join(ROOT, "scripts/sync-serie-a-teams.mjs"))).toBe(true);
  });
});
