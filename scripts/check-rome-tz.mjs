#!/usr/bin/env node
/**
 * Lint guard sul fuso orario. Difende due forme, non una.
 *
 * 1. `toLocaleTimeString(...)` / `toLocaleDateString(...)` senza
 *    `timeZone: "Europe/Rome"` esplicito: l'orario mostrato seguirebbe il
 *    fuso del client.
 *
 * 2. `new Date(<stringa>)` usato per confrontare o ordinare eventi. Questa
 *    e' la forma che e' costata di piu': la formattazione rispettava la
 *    policy "ISO naive = UTC" di `toRomeDate`, i confronti no. Una stringa
 *    come "2026-06-21T19:45:00" veniva letta come ora locale, quindi in
 *    Italia d'estate valeva due ore prima di quello che l'app stampava
 *    accanto: il conto alla rovescia e l'evidenziazione della "prossima"
 *    partita non erano d'accordo con l'orario visibile.
 *    Al suo posto vanno usati `toRomeDate` o `getDateTimestamp`.
 *
 * `new Date()` senza argomenti resta ammesso: e' l'istante corrente, non
 * l'interpretazione di una stringa. Ammesso anche `new Date(Date.UTC(...))`,
 * che riceve un numero ed e' la costruzione esplicitamente UTC.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGETS = [
  "src/pages/JuventusPage.tsx",
  "src/pages/Index.tsx",
  "src/pages/Formula1Page.tsx",
  "src/pages/MotoGPPage.tsx",
  "src/pages/SinnerPage.tsx",
  "src/pages/StreamingPage.tsx",
  "src/pages/JuventusMatchPage.tsx",
  "src/pages/CalendarPage.tsx",
];
const TARGET_DIRS = [
  "src/lib",
  "src/components/home",
  "src/components/streaming",
  "src/components/calendar",
  "src/components/highlights",
  "src/components/juventus",
  "src/components/sinner",
];

// Un solo file e' esente, e per una ragione che non si generalizza:
// `dateUtils.ts` **implementa** la policy. E' il posto dove `new Date(stringa)`
// deve stare, perche' e' li' che la stringa viene prima normalizzata a UTC.
// Guardarlo con la regola che esso stesso realizza segnalerebbe come difetto
// la sua unica ragione di esistere.
//
// I file di test sono esclusi perche' costruiscono di proposito date in forme
// scorrette, per verificare che il codice di produzione le regga: sono i casi
// del test, non il comportamento dell'app.
const EXEMPT = [/^src\/lib\/dateUtils\.ts$/, /\.test\.(tsx?|jsx?)$/];

const PATTERN = /\.(toLocaleTimeString|toLocaleDateString)\s*\(/g;
// `new Date(` seguito da qualcosa: vietato. `new Date()` vuoto: permesso.
const RAW_DATE_PATTERN = /new Date\s*\(\s*[^)\s]/g;
// `new Date(Date.UTC(...))` riceve un numero, non una stringa: e' la forma
// esplicitamente UTC, cioe' proprio quella da preferire. Viene tolta dalla
// riga prima del controllo invece di essere esentata con un commento, cosi'
// nessuno impara a spargere `@tz-ignore` su codice corretto. La sostituzione
// e' locale: se sulla stessa riga c'e' anche un `new Date(stringa)`, quello
// resta e viene segnalato.
const SAFE_DATE_UTC = /new Date\s*\(\s*Date\.UTC\s*\(/g;

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(full);
  }
  return out;
}

async function collectFiles() {
  const files = TARGETS.map((p) => path.join(ROOT, p));
  for (const dir of TARGET_DIRS) {
    files.push(...(await walk(path.join(ROOT, dir))));
  }
  return files.filter((full) => {
    const rel = path.relative(ROOT, full).split(path.sep).join("/");
    return !EXEMPT.some((re) => re.test(rel));
  });
}

function findViolations(src) {
  const violations = [];
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    PATTERN.lastIndex = 0;
    if (PATTERN.test(line)) {
      const window = lines.slice(i, Math.min(lines.length, i + 5)).join(" ");
      if (!/timeZone\s*:\s*["']Europe\/Rome["']/.test(window)) {
        violations.push({ line: i + 1, text: line.trim(), kind: "toLocale" });
      }
    }

    const scanned = line.replace(SAFE_DATE_UTC, "");
    RAW_DATE_PATTERN.lastIndex = 0;
    if (RAW_DATE_PATTERN.test(scanned)) {
      // L'esenzione vale sulla riga stessa o su quella prima, come
      // `eslint-disable-next-line`: sulle righe lunghe in coda non si legge.
      const exempt =
        /\/\/\s*@tz-ignore/.test(line) || (i > 0 && /\/\/\s*@tz-ignore/.test(lines[i - 1]));
      if (!exempt) {
        violations.push({ line: i + 1, text: line.trim(), kind: "newDate" });
      }
    }
  }
  return violations;
}

async function main() {
  const files = await collectFiles();
  let hasErrors = false;
  for (const file of files) {
    let src;
    try {
      src = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    const violations = findViolations(src);
    if (violations.length === 0) continue;
    hasErrors = true;
    const rel = path.relative(ROOT, file);
    console.error(`\n[check:tz-juventus] ${rel}`);
    for (const v of violations) {
      const hint =
        v.kind === "newDate"
          ? "new Date(stringa) legge l'ISO come ora locale: usa toRomeDate/getDateTimestamp"
          : 'manca timeZone: "Europe/Rome"';
      console.error(`  L${v.line}: ${v.text}\n        ^ ${hint}`);
    }
  }
  if (hasErrors) {
    console.error(
      "\nUsa formatJuventusDateTime / toRomeDate da @/lib/dateUtils per garantire fuso Europe/Rome.",
    );
    process.exit(1);
  }
  console.log(
    "[check:tz-juventus] OK — nessuna formattazione senza fuso e nessun confronto su new Date(stringa).",
  );
}

main().catch((err) => {
  console.error("[check:tz-juventus] errore inatteso:", err);
  process.exit(2);
});
