#!/usr/bin/env node
/**
 * Lint guard: nelle pagine Juventus / Home / componenti Home vieta
 * l'uso diretto di `toLocaleTimeString(...)` o `toLocaleDateString(...)`
 * senza `timeZone: "Europe/Rome"` esplicito.
 *
 * Suggerisce di centralizzare la formattazione tramite
 * `formatJuventusDateTime` (o gli altri helper di
 * `src/lib/dateUtils.ts`).
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
];
const TARGET_DIRS = [
  "src/components/home",
  "src/components/streaming",
  "src/components/highlights",
];

const PATTERN = /\.(toLocaleTimeString|toLocaleDateString)\s*\(/g;

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
  return files;
}

function findViolations(src) {
  const violations = [];
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!PATTERN.test(line)) {
      PATTERN.lastIndex = 0;
      continue;
    }
    PATTERN.lastIndex = 0;
    const window = lines.slice(i, Math.min(lines.length, i + 5)).join(" ");
    if (!/timeZone\s*:\s*["']Europe\/Rome["']/.test(window)) {
      violations.push({ line: i + 1, text: line.trim() });
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
      console.error(`  L${v.line}: ${v.text}`);
    }
  }
  if (hasErrors) {
    console.error(
      "\nUsa formatJuventusDateTime / toRomeDate da @/lib/dateUtils per garantire fuso Europe/Rome.",
    );
    process.exit(1);
  }
  console.log("[check:tz-juventus] OK — nessun uso non protetto di toLocale*String.");
}

main().catch((err) => {
  console.error("[check:tz-juventus] errore inatteso:", err);
  process.exit(2);
});