import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Guardiano sul guardiano del fuso orario.
 *
 * `scripts/check-rome-tz.mjs` analizza una lista di file scritta a mano. Una
 * pagina nuova che manipola date non viola nessuna regola: semplicemente non
 * viene guardata, e il controllo resta verde mentre il buco si allarga.
 * E' successo davvero con `CalendarPage.tsx`, aggiunta alla lista solo
 * durante l'audit.
 */

const ROOT = resolve(import.meta.dirname, "../../..");
const script = readFileSync(join(ROOT, "scripts/check-rome-tz.mjs"), "utf8");

/** Forme che rendono una pagina interessante per il guardiano del fuso. */
const USA_DATE = /toLocale(Time|Date)String|new Date\s*\(/;

function listaSorvegliata(): string[] {
  const blocco = script.match(/const TARGETS = \[([^\]]*)\]/)?.[1] ?? "";
  return [...blocco.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function pagineConDate(): string[] {
  return readdirSync(join(ROOT, "src/pages"))
    .filter((nome) => nome.endsWith(".tsx") && !nome.includes(".test."))
    .map((nome) => `src/pages/${nome}`)
    .filter((rel) => USA_DATE.test(readFileSync(join(ROOT, rel), "utf8")));
}

function cartelleSorvegliate(): string[] {
  const blocco = script.match(/const TARGET_DIRS = \[([^\]]*)\]/)?.[1] ?? "";
  return [...blocco.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** Le cartelle di componenti in cui almeno un file di produzione manipola date. */
function cartelleComponentiConDate(): string[] {
  const base = join(ROOT, "src/components");
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "ui") // shadcn: generati, non nostri
    .map((e) => e.name)
    .filter((dir) =>
      readdirSync(join(base, dir))
        .filter((nome) => /\.tsx?$/.test(nome) && !nome.includes(".test."))
        .some((nome) => USA_DATE.test(readFileSync(join(base, dir, nome), "utf8"))),
    )
    .map((dir) => `src/components/${dir}`);
}

describe("Copertura del guardiano sul fuso", () => {
  it("ogni pagina che manipola date e' nella lista sorvegliata", () => {
    const sorvegliate = listaSorvegliata();
    for (const pagina of pagineConDate()) {
      expect(
        sorvegliate,
        `${pagina} usa date ma non e' in TARGETS di scripts/check-rome-tz.mjs`,
      ).toContain(pagina);
    }
  });

  it("la lista non cita file che non esistono piu'", () => {
    const esistenti = new Set(
      readdirSync(join(ROOT, "src/pages")).map((nome) => `src/pages/${nome}`),
    );
    for (const sorvegliata of listaSorvegliata()) {
      expect(esistenti, `TARGETS cita ${sorvegliata}, che non esiste`).toContain(sorvegliata);
    }
  });

  it("ogni cartella di componenti che manipola date e' fra quelle sorvegliate", () => {
    // Le cartelle si aggiungono a mano a TARGET_DIRS, e una cartella nuova
    // nasce scoperta: `src/components/juventus` e' nata cosi' durante il
    // refactoring, e `src/components/sinner` era scoperta da mesi con un
    // `new Date(stringa)` dentro.
    const sorvegliate = cartelleSorvegliate();
    for (const cartella of cartelleComponentiConDate()) {
      expect(
        sorvegliate,
        `${cartella} manipola date ma non e' in TARGET_DIRS di scripts/check-rome-tz.mjs`,
      ).toContain(cartella);
    }
  });

  it("guarda anche src/lib, non solo le pagine e tre cartelle di componenti", () => {
    // La logica sulle date migra volentieri dalle pagine a `src/lib`, ed e'
    // giusto che lo faccia: e' li' che si testa senza montare un componente.
    // Se il guardiano non la segue, il refactor che la sposta la toglie di
    // fatto dal controllo, e il controllo resta verde.
    const dirs = script.match(/const TARGET_DIRS = \[([^\]]*)\]/)?.[1] ?? "";
    expect(dirs).toContain('"src/lib"');
  });

  it("l'esenzione resta su dateUtils e sui test, e non si allarga", () => {
    // `dateUtils.ts` e' esente perche' *implementa* la policy: e' il posto
    // dove `new Date(stringa)` deve stare. E' una ragione che non si
    // generalizza, quindi la lista non deve crescere in silenzio.
    const blocco = script.match(/const EXEMPT = \[([^\]]*)\]/)?.[1] ?? "";
    const voci = blocco.split(",").filter((v) => v.trim().length > 0);
    expect(voci).toHaveLength(2);
    expect(blocco).toContain("dateUtils");
    expect(blocco).toContain("test");
  });

  it("il guardiano ammette la costruzione esplicitamente UTC", () => {
    // `new Date(Date.UTC(...))` riceve un numero: e' la forma corretta, e
    // segnalarla insegnerebbe a spargere `@tz-ignore` su codice giusto.
    expect(script).toContain("SAFE_DATE_UTC");
  });

  it("il guardiano continua a vietare `new Date(stringa)`", () => {
    // L'esenzione sopra non deve essere diventata un permesso generale.
    expect(script).toContain("RAW_DATE_PATTERN");
    expect(script).toMatch(/RAW_DATE_PATTERN\.test\(scanned\)/);
  });
});
