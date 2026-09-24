import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { APP_VERSION } from "@/lib/version";

/**
 * La versione vive in **due posti** che nessuno tiene insieme: `package.json`,
 * che e' quello che il mondo esterno legge, e `src/lib/version.ts`, che e'
 * quello mostrato dentro l'app.
 *
 * Divergere non produce un errore: produce un'app che dichiara a chi la usa
 * una versione diversa da quella che ha. E' gia' successo — il bump a 2.10.0
 * e' atterrato dentro un commit chiamato «Work in progress», senza sezione di
 * changelog e senza nota di rilascio, e nessun controllo se n'e' accorto.
 */
const ROOT = resolve(import.meta.dirname, "../../..");

describe("versione", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { version: string };
  const changelog = readFileSync(join(ROOT, "changelog.md"), "utf8");
  const readme = readFileSync(join(ROOT, "README.md"), "utf8");

  it("package.json e l'app dichiarano lo stesso numero", () => {
    expect(APP_VERSION, "src/lib/version.ts diverge da package.json").toBe(pkg.version);
  });

  it("la versione corrente ha la sua sezione nel changelog", () => {
    // Un bump senza changelog e' un rilascio di cui non resta traccia: fra sei
    // mesi nessuno sa piu' cosa conteneva.
    expect(changelog, `manca la sezione ## [${APP_VERSION}] in changelog.md`).toContain(
      `## [${APP_VERSION}]`,
    );
  });

  it("il README non dichiara una versione diversa", () => {
    // Era rimasto fermo alla 2.3.6 mentre l'app era alla 2.10.0: sei rilasci
    // di distanza, in una riga che si presenta come un fatto.
    const dichiarata = /Versione repository corrente: `([^`]+)`/.exec(readme)?.[1];
    expect(dichiarata, "riga «Versione repository corrente» non trovata nel README").toBeDefined();
    expect(dichiarata).toBe(APP_VERSION);
  });

  it("il numero ha la forma di una versione semantica", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
