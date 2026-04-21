#!/usr/bin/env node
/**
 * check-italian-ui.mjs
 *
 * Guard CI lingua italiana.
 * Fallisce con exit 1 se trova stringhe utente in inglese in src/ (escluse
 * cartelle UI shadcn rigenerabili e file di test).
 *
 * Limiti dichiarati:
 *  - src/components/ui/* è escluso (shadcn rigenerabile). Le traduzioni
 *    manuali di quei file vanno mantenute con cura: future rigenerazioni
 *    da CLI shadcn re-introducono inglese, ma non vogliamo rompere il
 *    workflow di rigenerazione.
 *  - File *.test.* e *.spec.* esclusi.
 *  - Commenti // e /* *​/ vengono strippati prima del match.
 *  - Solo regex JSX-text e attributi UI vengono analizzati: non è un
 *    parser AST completo, ma copre il 95% dei casi reali.
 *
 * Allowlist:
 *  - Parole consentite (brand, sigle, nomi propri).
 *  - File con commento `// @lingua-ignore-file` in testa vengono saltati.
 *  - Singole righe con `// @lingua-ignore` a fine riga vengono saltate.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "src");

const EXCLUDE_DIRS = new Set([
  join("src", "components", "ui"),
]);

const EXCLUDE_FILE_PATTERNS = [
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
  /\.d\.ts$/,
];

/**
 * Parole consentite (case-insensitive su parola intera).
 * Brand, nomi propri, sigle tecniche, eccezioni autorizzate.
 */
const ALLOWLIST_WORDS = new Set(
  [
    // Eccezioni esplicite
    "STREAMING",
    "CALENDAR",
    "EVENTS",
    // Sigle tecniche
    "ATP",
    "WTA",
    "GP",
    "PL1",
    "PL2",
    "PL3",
    "Q",
    "TMDB",
    "RAI",
    "Pos",
    "Pts",
    "Qual",
    "Sprint",
    "DR",
    "JS",
    "Info",
    "ID",
    "URL",
    "API",
    "UI",
    "PWA",
    "TV",
    "OK",
    "DNF",
    "DSQ",
    "DNS",
    "DNQ",
    "DOB",
    // Brand / provider
    "Sky",
    "Sport",
    "Netflix",
    "Prime",
    "Video",
    "Disney",
    "Plus",
    "HBO",
    "Max",
    "Mediaset",
    "Discovery",
    "DAZN",
    "NOW",
    "Apple",
    "YouTube",
    "Twitch",
    "Wikipedia",
    "GitHub",
    "Lovable",
    "Supabase",
    "Vercel",
    "Google",
    // Atleti / squadre / competizioni (parti spesso in inglese ufficiali)
    "Juventus",
    "Sinner",
    "Jannik",
    "Formula",
    "MotoGP",
    "Roland",
    "Garros",
    "Wimbledon",
    "Open",
    "Australian",
    "US",
    "Finals",
    "Grand",
    "Slam",
    "Tour",
    "Cup",
    "League",
    "Champions",
    "Europa",
    "Conference",
    "Serie",
    "Coppa",
    "Italia",
    "Of",
    // Formati tempo brevi accettati
    "AM",
    "PM",
    // termini accettati nell'uso italiano corrente
    // - "Home": usato come label nav nell'italiano corrente (es. "Torna alla Home")
    // - "Sport": termine entrato nell'uso italiano comune
    // - "Open": nome proprio di tornei (Australian Open, US Open, Madrid Open)
    "Home",
  ].map((w) => w.toLowerCase()),
);

/**
 * Dizionario euristico di parole inglesi che NON devono apparire come UI.
 * Match case-insensitive su parola intera.
 */
const FORBIDDEN_WORDS = new Set(
  [
    "Loading",
    "Error",
    "Close",
    "Next",
    "Previous",
    "Submit",
    "Cancel",
    "Save",
    "Delete",
    "Edit",
    "Search",
    "Back",
    "More",
    "Less",
    "Show",
    "Hide",
    "Toggle",
    "Select",
    "Choose",
    "Page",
    "Found",
    "Return",
    "Click",
    "Settings",
    "Profile",
    "Logout",
    "Login",
    "Welcome",
    "Best",
    "Live",
    "Upcoming",
    "Today",
    "Tomorrow",
    "Yesterday",
    "Week",
    "Month",
    "Year",
    "Date",
    "Time",
    "Yes",
    "Continue",
    "Confirm",
    "Sidebar",
    "Menu",
    "Dialog",
    "Modal",
    "Button",
    "Link",
    "Tab",
    "Section",
    "Header",
    "Footer",
    "Sign",
    "Username",
    "Password",
    "Email",
    "Forgot",
    "Remember",
    "Reload",
    "Retry",
    "Refresh",
    "Update",
    "Updating",
    "Updated",
    "Failed",
    "Success",
    "Pending",
    "Done",
    "Skip",
    "Start",
    "Stop",
    "Pause",
    "Play",
    "Watch",
    "Read",
    "Write",
    "View",
    "Hidden",
    "Visible",
    "Enable",
    "Disable",
    "Enabled",
    "Disabled",
    "Add",
    "Remove",
    "Create",
    "New",
    "All",
    "None",
    "Filter",
    "Sort",
    "Order",
    "Group",
    "Item",
    "Items",
    "List",
    "Card",
    "Row",
    "Column",
    "Table",
    "Chart",
    "Loading...",
  ].map((w) => w.toLowerCase()),
);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full);
    if ([...EXCLUDE_DIRS].some((d) => rel === d || rel.startsWith(d + sep))) {
      continue;
    }
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      if (EXCLUDE_FILE_PATTERNS.some((p) => p.test(entry))) continue;
      out.push(full);
    }
  }
  return out;
}

function stripComments(src) {
  // strip /* ... */
  let out = src.replace(/\/\*[\s\S]*?\*\//g, "");
  // strip // ... to end of line
  out = out.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
  return out;
}

function lineOf(src, index) {
  return src.slice(0, index).split("\n").length;
}

/**
 * Estrae candidati testuali da un file:
 *  - testo JSX tra > e < (no { interpolation, no tag annidato)
 *  - valori di attributi UI: aria-label, aria-description,
 *    aria-describedby (se string literal), placeholder, title, alt
 */
function extractCandidates(src) {
  const candidates = [];

  // JSX text: estrae testo tra > e < scartando frammenti che sembrano
  // codice TypeScript (generics, espressioni, ecc.). Euristica:
  //  - deve contenere almeno una lettera
  //  - non deve contenere caratteri tipici del codice: ; = ( ) [ ] { }
  //    | & ` $ < > " ' \
  //  - non deve essere un identificatore tipo "MyType<X" residuo
  const jsxText = />([^<>{}]+)</g;
  for (const m of src.matchAll(jsxText)) {
    const value = m[1].trim();
    if (!value) continue;
    if (!/[A-Za-zÀ-ÿ]/.test(value)) continue;
    if (/[;=()\[\]{}|&`$"\\]/.test(value)) continue;
    // scarta frammenti che iniziano con minuscola+lettere senza spazi e
    // sembrano identificatori (es. "currentYear", "props")
    if (!/\s/.test(value) && /^[a-z][A-Za-z0-9_]*$/.test(value)) continue;
    candidates.push({ kind: "jsx-text", value, index: m.index });
  }

  // attributi UI
  const attr =
    /\b(aria-label|aria-description|aria-describedby|aria-roledescription|aria-valuetext|placeholder|title|alt|subtitle|description)\s*=\s*"([^"]+)"/g;
  for (const m of src.matchAll(attr)) {
    candidates.push({
      kind: `attr:${m[1]}`,
      value: m[2].trim(),
      index: m.index,
    });
  }

  // toast/sonner: toast("..."), toast.success("..."), toast.error("..."),
  // toast.info("..."), toast.warning("..."), toast.message("..."),
  // toast.loading("...")
  const toastPattern =
    /\btoast(?:\.(?:success|error|info|warning|message|loading))?\(\s*"([^"]+)"/g;
  for (const m of src.matchAll(toastPattern)) {
    candidates.push({
      kind: "toast-message",
      value: m[1].trim(),
      index: m.index,
    });
  }

  // document.title = "..."
  const docTitlePattern = /\bdocument\.title\s*=\s*"([^"]+)"/g;
  for (const m of src.matchAll(docTitlePattern)) {
    candidates.push({
      kind: "document-title",
      value: m[1].trim(),
      index: m.index,
    });
  }

  // document.title = `...` (template literal). Cattura solo la parte
  // statica iniziale prima di eventuali interpolazioni ${...}.
  const docTitleTemplatePattern = /\bdocument\.title\s*=\s*`([^`${]+)`?/g;
  for (const m of src.matchAll(docTitleTemplatePattern)) {
    const value = m[1].trim();
    if (!value) continue;
    candidates.push({
      kind: "document-title",
      value,
      index: m.index,
    });
  }

  // Titoli modali Radix/shadcn: <DialogTitle>...</DialogTitle> e simili.
  const dialogTitleTagPattern =
    /<(DialogTitle|AlertDialogTitle|SheetTitle|DrawerTitle|SidebarTitle)\b[^>]*>([^<>{}]+)</g;
  for (const m of src.matchAll(dialogTitleTagPattern)) {
    const value = m[2].trim();
    if (!value) continue;
    if (!/[A-Za-zÀ-ÿ]/.test(value)) continue;
    candidates.push({
      kind: `dialog-title:${m[1]}`,
      value,
      index: m.index,
    });
  }

  // Prop title="..." su componenti che contengono Dialog/Modal/Sheet/Drawer
  // nel nome (es. <ConfirmDialog title="...">).
  const dialogTitlePropPattern =
    /<(\w*(?:Dialog|Modal|Sheet|Drawer)\w*)\b[^>]*\btitle\s*=\s*"([^"]+)"/g;
  for (const m of src.matchAll(dialogTitlePropPattern)) {
    candidates.push({
      kind: `dialog-title-prop:${m[1]}`,
      value: m[2].trim(),
      index: m.index,
    });
  }

  return candidates;
}

function isAsciiOnly(s) {
  return /^[\x00-\x7F]*$/.test(s);
}

function tokens(value) {
  return value
    .split(/[^A-Za-zÀ-ÿ']+/)
    .filter((t) => t.length > 1);
}

function checkValue(value) {
  // Salta se troppo corto o solo simboli/numeri
  if (!value || value.length < 2) return null;
  // Salta se contiene template/expression syntax residua
  if (/[{}$`]/.test(value)) return null;

  const toks = tokens(value);
  if (toks.length === 0) return null;

  // Trova parole proibite non coperte da allowlist
  const offending = [];
  for (const t of toks) {
    const low = t.toLowerCase();
    if (FORBIDDEN_WORDS.has(low) && !ALLOWLIST_WORDS.has(low)) {
      offending.push(t);
    }
  }
  if (offending.length === 0) return null;
  return offending;
}

function main() {
  const files = walk(SRC);
  const violations = [];

  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    if (raw.includes("@lingua-ignore-file")) continue;

    const stripped = stripComments(raw);
    const lines = raw.split("\n");
    const candidates = extractCandidates(stripped);

    for (const c of candidates) {
      const offending = checkValue(c.value);
      if (!offending) continue;
      const line = lineOf(stripped, c.index);
      // skip riga con marker
      const rawLine = lines[line - 1] || "";
      if (rawLine.includes("@lingua-ignore")) continue;

      violations.push({
        file: relative(ROOT, file),
        line,
        kind: c.kind,
        value: c.value,
        offending,
      });
    }
  }

  if (violations.length === 0) {
    console.log("✓ check-italian-ui: 0 violazioni. UI italiana ok.");
    process.exit(0);
  }

  console.error("scripts/check-italian-ui.mjs");
  for (const v of violations) {
    let prefix = v.kind;
    if (v.kind === "document-title") {
      prefix = "TITOLO PAGINA (document.title)";
    } else if (v.kind.startsWith("dialog-title-prop:")) {
      const tag = v.kind.slice("dialog-title-prop:".length);
      prefix = `TITOLO MODALE (prop title su <${tag}>)`;
    } else if (v.kind.startsWith("dialog-title:")) {
      const tag = v.kind.slice("dialog-title:".length);
      prefix = `TITOLO MODALE (<${tag}>)`;
    }
    console.error(
      `✗ ${v.file}:${v.line} — ${prefix} contiene parole EN [${v.offending.join(", ")}]: "${v.value}"`,
    );
  }
  console.error(
    "→ Traduci in italiano oppure aggiorna l'allowlist in scripts/check-italian-ui.mjs (motivo nel changelog).",
  );
  console.error(`Trovate ${violations.length} violazioni. Build fallito.`);
  process.exit(1);
}

main();