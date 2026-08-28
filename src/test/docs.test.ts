import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";

/**
 * Guardiano sulla documentazione, non sul codice.
 *
 * Serve perche' la documentazione continua a leggersi bene mentre dice il
 * falso, e il modo in cui te ne accorgi e' che qualcuno la cita in una
 * discussione. Un link a un playbook che non esiste piu' diventa un vicolo
 * cieco proprio nel momento in cui serve, e un AGENTS.md che cresce senza
 * limite smette di essere letto per intero.
 */

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/** Righe massime di AGENTS.md: oltre, il contratto va spostato nei playbook. */
const MAX_AGENTS_LINES = 200;

const PLAYBOOK = [
  "docs/agent-playbook/repository-operations.md",
  "docs/agent-playbook/architecture-and-boundaries.md",
  "docs/agent-playbook/data-sources-and-time.md",
  "docs/agent-playbook/verification-and-change-management.md",
  "docs/agent-playbook/area-entrypoints.md",
];

describe("Documentazione", () => {
  it("AGENTS.md resta abbastanza corto da essere letto tutto", () => {
    const lines = read("AGENTS.md").split("\n").length;
    expect(lines).toBeLessThanOrEqual(MAX_AGENTS_LINES);
  });

  it("ogni playbook citato nella tabella di AGENTS.md esiste davvero", () => {
    const agents = read("AGENTS.md");
    for (const path of PLAYBOOK) {
      expect(agents, `AGENTS.md non instrada verso ${path}`).toContain(path);
      expect(existsSync(join(ROOT, path)), `${path} non esiste`).toBe(true);
    }
  });

  it("ogni playbook rimanda alle regole root", () => {
    for (const path of PLAYBOOK) {
      expect(read(path), `${path} non cita AGENTS.md`).toContain("AGENTS.md");
    }
  });

  it("i link relativi fra documenti puntano a file esistenti", () => {
    const docs = [
      "AGENTS.md",
      "CLAUDE.md",
      ...PLAYBOOK,
      "docs/ARCHITECTURE.md",
      "docs/DATA_SOURCES.md",
      "docs/SECURITY.md",
      "docs/CONTRIBUTING.md",
      "docs/ROADMAP.md",
    ];
    const broken: string[] = [];
    for (const doc of docs) {
      const content = read(doc);
      for (const m of content.matchAll(/\]\((?!https?:)([^)#]+)(?:#[^)]*)?\)/g)) {
        const target = resolve(dirname(join(ROOT, doc)), m[1]);
        if (!existsSync(target)) broken.push(`${doc} -> ${m[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });

  // Il gate e' guardato da `src/test/tooling/gate.test.ts`: qui restava per
  // ragioni storiche, ma questo file parla di documentazione.
});
