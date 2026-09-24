import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * Guardiano sulla copertura del typecheck, non sui tipi.
 *
 * `tsc -b` controlla soltanto i file che un `include` nomina. Un file fuori da
 * tutti gli `include` non produce un errore: semplicemente nessuno lo
 * controlla, e si scopre quando si rompe altrove. E' cosi' che
 * `supabase/functions/` — codice di produzione, un file TypeScript su sei del
 * repository — e' rimasto senza typecheck, insieme all'intera suite e2e.
 *
 * Il controllo e' statico apposta: lanciare `tsc --listFiles` quattro volte
 * direbbe la verita' esatta, ma costerebbe secondi a ogni giro di gate.
 */

const ROOT = resolve(import.meta.dirname, "../../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/**
 * Toglie i commenti da un JSONC scorrendo i caratteri.
 *
 * Non con una regex: dentro una stringa possono esserci le sequenze `/*` e
 * `//` — un `include` scritto come glob ne contiene entrambe — e una regex le
 * scambia per commenti, spezzando il JSON. La prima versione di questo file
 * faceva esattamente cosi', e il guardiano non falliva: non si caricava
 * proprio, che e' un modo peggiore di rompersi.
 */
export function spogliaCommenti(testo: string): string {
  let out = "";
  let inStringa = false;
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];
    const succ = testo[i + 1];
    if (inStringa) {
      out += c;
      if (c === "\\") {
        out += succ ?? "";
        i++;
      } else if (c === '"') {
        inStringa = false;
      }
      continue;
    }
    if (c === '"') {
      inStringa = true;
      out += c;
    } else if (c === "/" && succ === "/") {
      while (i < testo.length && testo[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && succ === "*") {
      i += 2;
      while (i < testo.length && !(testo[i] === "*" && testo[i + 1] === "/")) i++;
      i++;
    } else {
      out += c;
    }
  }
  return out;
}

function leggiTsconfig(p: string): { include?: string[]; references?: { path: string }[] } {
  return JSON.parse(spogliaCommenti(read(p)));
}

const IGNORATE = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".git",
  "playwright-report",
  "test-results",
  ".lovable",
  "public",
]);

function tuttiITypeScript(dir = ROOT): string[] {
  const out: string[] = [];
  for (const voce of readdirSync(dir)) {
    if (voce.startsWith(".") || IGNORATE.has(voce)) continue;
    const pieno = join(dir, voce);
    if (statSync(pieno).isDirectory()) out.push(...tuttiITypeScript(pieno));
    else if (/\.tsx?$/.test(voce)) out.push(relative(ROOT, pieno));
  }
  return out;
}

/**
 * Si legge dentro i test e non a livello di modulo, cosi' un errore di lettura
 * finisce nel test che ne ha bisogno invece che nella fase di raccolta.
 *
 * Non serve invece un test sulla validita' dei tsconfig: Vite li risolve tutti
 * prima di trasformare qualunque file, quindi un tsconfig malformato — o un
 * riferimento a un file che non esiste — ferma l'intera esecuzione con un
 * `TSCONFIG_ERROR` che nomina gia' file e posizione. Un test del genere non
 * potrebbe fallire mai, e un test che non puo' fallire e' peggio di niente:
 * somiglia a copertura. Verificato provandoli entrambi.
 */
const radice = () => leggiTsconfig("tsconfig.json");
const progetti = () => (radice().references ?? []).map((r) => r.path.replace(/^\.\//, ""));
const inclusi = () => progetti().flatMap((p) => leggiTsconfig(p).include ?? []);

describe("Lettura dei tsconfig", () => {
  it("non scambia per commento un `/*` che sta dentro una stringa", () => {
    // Il caso vero: un `include` scritto come glob. Prima questo faceva
    // esplodere il file in fase di caricamento.
    const jsonc = '{"include": ["e2e/**/*", "src"]}';
    expect(JSON.parse(spogliaCommenti(jsonc)).include).toEqual(["e2e/**/*", "src"]);
  });

  it("toglie davvero i commenti, di entrambe le forme", () => {
    const jsonc = `{
      /* blocco */
      "a": 1, // riga
      "b": "// non e' un commento"
    }`;
    expect(JSON.parse(spogliaCommenti(jsonc))).toEqual({ a: 1, b: "// non e' un commento" });
  });

  it("non si perde su una virgoletta protetta da backslash", () => {
    const jsonc = String.raw`{"a": "vir\"goletta /* finta */", "b": 2}`;
    expect(JSON.parse(spogliaCommenti(jsonc))).toEqual({ a: 'vir"goletta /* finta */', b: 2 });
  });
});

describe("Copertura del typecheck", () => {
  it("la radice non compila niente da sola: delega ai progetti", () => {
    // Se un giorno `tsconfig.json` avesse un `include` proprio, questo
    // guardiano guarderebbe nel posto sbagliato.
    expect(radice().include).toBeUndefined();
    expect(progetti().length).toBeGreaterThan(0);
  });

  it("gli `include` sono percorsi semplici, non glob", () => {
    // Il confronto qui sotto e' per prefisso: con un glob direbbe il falso.
    for (const voce of inclusi()) {
      expect(voce, `\`${voce}\` e' un glob: questo guardiano non sa leggerlo`).not.toMatch(/[*?]/);
    }
  });

  it("ogni file TypeScript del repository sta dentro un progetto", () => {
    const elenco = inclusi();
    const scoperti = tuttiITypeScript().filter(
      (file) => !elenco.some((voce) => file === voce || file.startsWith(`${voce}/`)),
    );
    expect(
      scoperti,
      `questi file non passano da \`tsc -b\`: aggiungili all'\`include\` di un tsconfig, ` +
        `o creane uno nuovo e referenzialo da \`tsconfig.json\``,
    ).toEqual([]);
  });

  it("ogni progetto referenziato esiste e ha un `include`", () => {
    for (const p of progetti()) {
      const cfg = leggiTsconfig(p);
      expect(cfg.include, `\`${p}\` non dichiara \`include\`: non controlla niente`).toBeTruthy();
      expect(cfg.include!.length).toBeGreaterThan(0);
    }
  });
});
