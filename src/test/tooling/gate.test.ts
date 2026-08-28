import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Guardiano sul gate, non sul codice.
 *
 * Serve perche' un gate si indebolisce sempre nello stesso modo: qualcuno
 * toglie un anello per sbloccarsi, e nessuno se ne accorge finche' non passa
 * in produzione qualcosa che quell'anello fermava. Un controllo che non e'
 * piu' nel gate non fallisce: semplicemente smette di esistere.
 */

const ROOT = resolve(import.meta.dirname, "../../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const pkg = JSON.parse(read("package.json")) as {
  scripts: Record<string, string>;
};

/** Gli anelli che `verify` deve contenere, con il motivo di ciascuno. */
const ANELLI: Array<{ script: string; perche: string }> = [
  { script: "typecheck", perche: "strict e' l'unico controllo sui tipi" },
  { script: "lint", perche: "include Prettier e i divieti di import" },
  { script: "check:italian", perche: "la UI e' in italiano per scelta di prodotto" },
  {
    script: "check:tz-juventus",
    perche: "i confronti fra date sono la classe di bug piu' costosa",
  },
  { script: "test", perche: "unit test dell'app e delle edge function" },
  { script: "build", perche: "il typecheck non vede gli errori di bundling" },
];

describe("Gate di verifica", () => {
  it("il lint fallisce anche sugli avvisi", () => {
    // Senza questo, una regola declassata a `warn` non ferma piu' niente.
    expect(pkg.scripts.lint).toContain("--max-warnings=0");
  });

  it("`verify` contiene tutti i suoi anelli", () => {
    for (const { script, perche } of ANELLI) {
      expect(pkg.scripts.verify, `manca \`${script}\` dal gate: ${perche}`).toContain(
        `bun run ${script}`,
      );
    }
  });

  it("ogni anello citato da `verify` esiste come script", () => {
    const citati = [...pkg.scripts.verify.matchAll(/bun run ([\w:-]+)/g)].map((m) => m[1]);
    expect(citati.length).toBeGreaterThanOrEqual(ANELLI.length);
    for (const nome of citati) {
      expect(pkg.scripts, `\`verify\` chiama \`${nome}\`, che non esiste`).toHaveProperty(nome);
    }
  });

  it("Prettier e' raggiungibile come comando a se'", () => {
    // Serve quando il lint segnala formattazione: `bun run format` e' la
    // risposta, e l'hook format-on-edit ci si appoggia.
    expect(pkg.scripts).toHaveProperty("format");
  });
});

describe("CI", () => {
  const ci = read(".github/workflows/ci.yml");

  it("il job quality lancia il gate locale invece di riscriverlo", () => {
    // Se la CI elencasse i singoli anelli, i due elenchi divergerebbero e uno
    // dei due smetterebbe di essere il gate.
    expect(ci).toMatch(/run:\s*bun run verify/);
  });

  it("la CI non elenca gli anelli uno per uno", () => {
    for (const { script } of ANELLI) {
      if (script === "test") continue; // `test:e2e` e' un job a parte, legittimo
      expect(ci, `la CI ripete \`${script}\`: divergera' da verify`).not.toMatch(
        new RegExp(`run:\\s*bun run ${script.replace(":", "\\:")}\\s*$`, "m"),
      );
    }
  });

  it("i test end-to-end hanno un job dedicato", () => {
    expect(ci).toMatch(/run:\s*bun run test:e2e/);
  });

  it("l'automerge si aggancia al nome vero del workflow CI", () => {
    // `workflow_run` collega per nome: un nome sbagliato non produce un
    // errore, produce un trigger che non scatta mai.
    const nome = ci.match(/^name:\s*(.+)$/m)?.[1].trim();
    expect(nome).toBeTruthy();
    const automerge = read(".github/workflows/enable-pr-automerge.yml");
    const elencati = [...automerge.matchAll(/^\s+- (.+)$/gm)].map((m) => m[1].trim());
    expect(elencati, `l'automerge non ascolta il workflow "${nome}"`).toContain(nome);
  });

  it("il guardiano sul branch sorgente non interpola il nome del branch nello script", () => {
    // Un branch chiamato ad arte eseguirebbe comandi nel runner.
    const guard = read(".github/workflows/guard-main-source.yml");
    const script = guard.slice(guard.indexOf("run: |"));
    expect(script).not.toContain("${{ github.head_ref }}");
    expect(guard).toContain("HEAD_REF: ${{ github.head_ref }}");
  });
});
