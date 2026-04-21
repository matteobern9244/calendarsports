// Test Deno per la normalizzazione "data Roma" usata nel lookup
// broadcaster di Juventus. Verifica l'edge case mezzanotte UTC.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const ROME_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function romeDateKeyOf(input: string | null | undefined): string | null {
  if (!input) return null;
  let normalized = input;
  if (typeof input === "string" && /T\d{2}:\d{2}/.test(input) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(input)) {
    normalized = `${input}Z`;
  }
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return ROME_DATE_FMT.format(d);
}

Deno.test("romeDateKeyOf: orario sera estivo resta nello stesso giorno italiano", () => {
  assertEquals(romeDateKeyOf("2026-04-21T19:45:00Z"), "2026-04-21");
});

Deno.test("romeDateKeyOf: notte UTC sfora la mezzanotte italiana", () => {
  // 23:30 UTC del 21/04 = 01:30 Roma del 22/04. Con il vecchio
  // codice la chiave era 2026-04-21 e il lookup falliva.
  assertEquals(romeDateKeyOf("2026-04-21T23:30:00Z"), "2026-04-22");
});

Deno.test("romeDateKeyOf: stringa naive trattata come UTC", () => {
  assertEquals(
    romeDateKeyOf("2026-04-21T23:30:00"),
    romeDateKeyOf("2026-04-21T23:30:00Z"),
  );
});

Deno.test("romeDateKeyOf: input invalidi/null", () => {
  assertEquals(romeDateKeyOf(null), null);
  assertEquals(romeDateKeyOf(""), null);
  assertEquals(romeDateKeyOf("xxx"), null);
});

Deno.test("lookup broadcaster con chiave Roma (cross-midnight)", () => {
  const matchDateUtc = "2026-04-21T23:30:00Z";
  const broadcasterMap: Record<string, string> = {};
  const legaKey = romeDateKeyOf(matchDateUtc)!;
  broadcasterMap[`date:${legaKey}`] = "DAZN | Sky";

  const skyKey = romeDateKeyOf(matchDateUtc)!;
  const broadcaster = broadcasterMap[`date:${skyKey}`] || null;
  assertEquals(broadcaster, "DAZN | Sky");
});

// === buildMatchId ===
// Replica della logica presente in supabase/functions/sports-football/index.ts.
// Test isolato per evitare side-effect di import del modulo edge (Deno.serve).
function slugify(input: string): string {
  return String(input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildMatchId(match: any, competitionName: string): string {
  if (match?.link) {
    const m = String(match.link).match(/partite\/(\d{4})\/([^/]+)\/([^/]+)/i);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`.toLowerCase();
  }
  const home = slugify(match?.home?.name || "");
  const away = slugify(match?.away?.name || "");
  const dateKey = romeDateKeyOf(match?.date) ?? "unknown";
  const comp = slugify(competitionName);
  return `${comp}-${dateKey}-${home}-vs-${away}`;
}

Deno.test("buildMatchId: slug derivato dall'URL Sky", () => {
  const id = buildMatchId(
    {
      link:
        "https://sport.sky.it/calcio/serie-a/partite/2025/giornata-1/juventus-parma/risultato-gol",
      home: { name: "Juventus" },
      away: { name: "Parma" },
      date: "2025-08-24T18:30:00Z",
    },
    "Serie A",
  );
  assertEquals(id, "2025-giornata-1-juventus-parma");
});

Deno.test("buildMatchId: fallback deterministico senza link", () => {
  const id = buildMatchId(
    {
      link: null,
      home: { name: "Juventus" },
      away: { name: "Parma" },
      date: "2025-08-24T18:30:00Z",
    },
    "Serie A",
  );
  assertEquals(id, "serie-a-2025-08-24-juventus-vs-parma");
});

Deno.test("buildMatchId: id univoci per partite diverse", () => {
  const a = buildMatchId(
    {
      link:
        "https://sport.sky.it/calcio/serie-a/partite/2025/giornata-1/juventus-parma/risultato-gol",
      home: { name: "Juventus" },
      away: { name: "Parma" },
      date: "2025-08-24T18:30:00Z",
    },
    "Serie A",
  );
  const b = buildMatchId(
    {
      link:
        "https://sport.sky.it/calcio/serie-a/partite/2025/giornata-2/genoa-juventus/risultato-gol",
      home: { name: "Genoa" },
      away: { name: "Juventus" },
      date: "2025-08-31T18:30:00Z",
    },
    "Serie A",
  );
  assertEquals(a !== b, true);
});

Deno.test("buildMatchId: link Sky con slug squadre composte", () => {
  const id = buildMatchId(
    {
      link:
        "https://sport.sky.it/calcio/champions-league/partite/2025/girone-fase-campionato/juventus-borussia-dortmund/risultato-gol",
      home: { name: "Juventus" },
      away: { name: "Borussia Dortmund" },
      date: "2025-09-16T19:00:00Z",
    },
    "Champions League",
  );
  assertEquals(id, "2025-girone-fase-campionato-juventus-borussia-dortmund");
});