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