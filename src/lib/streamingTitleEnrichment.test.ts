import { describe, it, expect } from "vitest";

// Copia tipata della logica `enrichTitle` da
// `supabase/functions/streaming-tv/index.ts`. La edge function gira su Deno
// e non e' coperta dal runner Vitest del frontend, quindi replichiamo la
// funzione qui per testare in isolamento i tre path di matching:
//   1) prefix di token (caso normale)
//   2) timestamp HH:MM esatto (fallback nuovo)
//   3) placeholder EV-SP/EV-CN/EV-TV mappato a genere atteso (fallback nuovo)
//
// Limite dichiarato: una divergenza tra questa copia e la funzione live
// passa inosservata in CI. Validazione runtime via curl post-deploy.

type RichTitle = { title: string; hh?: number; mm?: number };

function normForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function enrichTitle(
  rawUpper: string,
  rich: RichTitle[],
  rawHh?: number,
  rawMm?: number,
): { title: string; genre?: string } {
  if (!rawUpper) return { title: rawUpper };
  const norm = normForMatch(rawUpper);
  const normTokens = norm.split(" ").filter(Boolean);
  let best = "";
  for (const cand of rich) {
    const candNorm = normForMatch(cand.title);
    const candTokens = candNorm.split(" ").filter(Boolean);
    let common = 0;
    const lim = Math.min(normTokens.length, candTokens.length);
    while (common < lim && normTokens[common] === candTokens[common]) common += 1;
    const commonChars = candTokens.slice(0, common).join(" ").length;
    if ((common >= 3 || commonChars >= 15) && cand.title.length > best.length) {
      best = cand.title;
    }
  }
  const PLACEHOLDER_TO_GENRE: Record<string, string[]> = {
    "EV-SP": ["Sport", "Calcio", "Tennis", "Motori", "Basket", "Pallavolo", "Pallacanestro", "Rugby", "Volley", "Nuoto", "Ciclismo"],
    "EV-CN": ["Film", "Cinema"],
    "EV-FILM": ["Film", "Cinema"],
    "EV-TV": ["Fiction", "Serie Tv", "Telefilm", "Miniserie"],
  };
  const placeholder = rawUpper.toUpperCase().replace(/\s+/g, "").trim();
  const wanted = PLACEHOLDER_TO_GENRE[placeholder];
  if (!best && wanted) {
    let bestScore = -Infinity;
    let phBest = "";
    for (const cand of rich) {
      const mm = cand.title.match(/\(([^()]{2,40})\)\s*$/);
      if (!mm) continue;
      const genreCanon = mm[1].trim()
        .toLowerCase()
        .replace(/(^|\s)(\p{L})/gu, (_, p, c) => p + c.toUpperCase());
      if (!wanted.includes(genreCanon)) continue;
      let score = 0;
      if (rawHh !== undefined && rawMm !== undefined && cand.hh !== undefined && cand.mm !== undefined) {
        const distance = Math.min(720, Math.abs(cand.hh * 60 + cand.mm - rawHh * 60 - rawMm));
        if (distance === 0) score += 1000;
        score -= distance;
      }
      score += Math.min(cand.title.length, 100) * 0.01;
      if (score > bestScore) {
        bestScore = score;
        phBest = cand.title;
      }
    }
    if (phBest) best = phBest;
  }
  if (!best && rawHh !== undefined && rawMm !== undefined) {
    let timeBest = "";
    for (const cand of rich) {
      if (cand.hh !== rawHh || cand.mm !== rawMm) continue;
      if (cand.title.length > timeBest.length) timeBest = cand.title;
    }
    if (timeBest) best = timeBest;
  }
  const source = best || rawUpper
    .toLowerCase()
    .replace(/(^|[\s\-:'"(])(\p{L})/gu, (_, p, c) => p + c.toUpperCase());
  const GENRE_WHITELIST = new Set([
    "Fiction", "Film", "Sport", "Calcio", "Tennis", "Cinema",
  ]);
  const mm = source.match(/\s*\(([^()]{2,40})\)\s*$/);
  let title = source;
  let genre: string | undefined;
  if (mm) {
    const candidate = mm[1].trim()
      .toLowerCase()
      .replace(/(^|\s)(\p{L})/gu, (_, p, c) => p + c.toUpperCase());
    if (GENRE_WHITELIST.has(candidate)) {
      genre = candidate;
      title = source.slice(0, mm.index).trim();
    }
  }
  return { title, genre };
}

describe("enrichTitle", () => {
  it("placeholder EV-SP risolve al rich title col genere Sport", () => {
    const rich: RichTitle[] = [
      { title: "Calcio - Coppa Italia - Inter Vs Como (Sport)" },
      { title: "Tg5 - Notte (News)" },
    ];
    const result = enrichTitle("EV-SP", rich, 20, 40);
    expect(result.title).toBe("Calcio - Coppa Italia - Inter Vs Como");
    expect(result.genre).toBe("Sport");
  });

  it("placeholder EV-CN risolve al rich title col genere Film", () => {
    const rich: RichTitle[] = [
      { title: "Il Padrino (Film)" },
      { title: "Telegiornale (News)" },
    ];
    const result = enrichTitle("EV-CN", rich, 21, 15);
    expect(result.title).toBe("Il Padrino");
    expect(result.genre).toBe("Film");
  });

  it("match per HH:MM esatto quando il prefisso fallisce", () => {
    const rich: RichTitle[] = [
      { title: "Programma Speciale Misterioso (Sport)", hh: 20, mm: 40 },
    ];
    const result = enrichTitle("XYZ-123", rich, 20, 40);
    expect(result.title).toBe("Programma Speciale Misterioso");
    expect(result.genre).toBe("Sport");
  });

  it("match per prefisso normale resta prioritario", () => {
    const rich: RichTitle[] = [
      { title: "Roberta Valente Notaio in Sorrento - Stagione 1 (Fiction)" },
    ];
    const result = enrichTitle(
      "ROBERTA VALENTE - NOTAIO IN SORRENTO - S1E3",
      rich,
    );
    expect(result.title).toContain("Roberta Valente");
    expect(result.genre).toBe("Fiction");
  });

  it("nessun match: fallback al raw cosmetizzato", () => {
    const result = enrichTitle("EV-SP", [], 20, 40);
    expect(result.title).toBe("Ev-Sp");
    expect(result.genre).toBeUndefined();
  });
});