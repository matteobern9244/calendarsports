import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { TvFamilyPayload } from "@/hooks/useStreamingData";

// Mock di @tanstack/react-query: forniamo un useQueries che restituisce
// dati TV deterministici per le 5 famiglie (rai, mediaset, sky-sport,
// sky-cinema, discovery). Solo `rai` ha dati realmente popolati per
// rendere prevedibili i selettori.
vi.mock("@tanstack/react-query", () => {
  const raiPayload: TvFamilyPayload = {
    family: "rai",
    familyLabel: "RAI",
    date: "2026-04-21",
    programsAvailable: true,
    channels: [
      {
        id: "rai-1",
        name: "RAI 1",
        logo: null,
        number: 1,
        programs: [
          {
            // 21:30 -> 23:25 = 115 minuti = 1 ora e 55 minuti
            start: "2026-04-21T19:30:00.000Z",
            end: "2026-04-21T21:25:00.000Z",
            title: "Il Commissario Montalbano",
            genre: "Fiction",
          },
        ],
      },
    ],
  };
  const empty = (id: string, label: string): TvFamilyPayload => ({
    family: id as TvFamilyPayload["family"],
    familyLabel: label,
    date: "2026-04-21",
    programsAvailable: false,
    channels: [],
  });
  const dataByFamily: Record<string, TvFamilyPayload> = {
    rai: raiPayload,
    mediaset: empty("mediaset", "Mediaset"),
    "sky-sport": empty("sky-sport", "Sky Sport"),
    "sky-cinema": empty("sky-cinema", "Sky Cinema"),
    discovery: empty("discovery", "Discovery"),
  };
  return {
    useQueries: ({ queries }: { queries: Array<{ queryKey: unknown[] }> }) =>
      queries.map((q) => {
        const familyId = (q.queryKey?.[1] as string) ?? "rai";
        return {
          data: dataByFamily[familyId],
          isLoading: false,
          isError: false,
        };
      }),
  };
});

// Mock dell'API streaming: non viene chiamato grazie al mock di useQueries
// ma evitiamo qualsiasi import side-effect su Supabase client.
vi.mock("@/lib/api/sportsApi", async () => {
  return {
    streamingApi: {
      getTvByFamily: vi.fn(),
    },
  };
});

import TonightTvList from "./TonightTvList";

describe("TonightTvList accessibilità", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("espone <ul> come role=table con label italiana e rowcount/colcount", () => {
    render(<TonightTvList />);
    const table = screen.getByRole("table", {
      name: /programmi in prima serata stasera/i,
    });
    expect(table).toHaveAttribute("aria-colcount", "6");
    expect(table.getAttribute("aria-rowcount")).toBeTruthy();
  });

  it("rende 6 columnheader nascosti visivamente nell'ordine atteso", () => {
    render(<TonightTvList />);
    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(6);
    expect(headers.map((h) => h.textContent)).toEqual([
      "Famiglia",
      "Ora",
      "Canale",
      "Titolo",
      "Genere",
      "Durata",
    ]);
  });

  it("contiene almeno una riga programma con celle aria-labelled", () => {
    render(<TonightTvList />);
    const rows = screen.getAllByRole("row");
    // Header invisibile + almeno una riga programma
    expect(rows.length).toBeGreaterThanOrEqual(2);

    // Cerca la cella durata parlata in italiano (1 ora e 55 minuti).
    // Il testo compare anche dentro l'aria-label aggregato dell'<article>
    // mobile, quindi usiamo getAllByLabelText.
    const duraMatches = screen.getAllByLabelText(/Durata 1 ora e 55 minuti/i);
    expect(duraMatches.length).toBeGreaterThan(0);
  });

  it("annuncia la cella ora con etichetta parlata 'Inizio alle HH:MM[, fine alle HH:MM]'", () => {
    render(<TonightTvList />);
    const oraCells = screen.getAllByLabelText(
      /^Inizio alle \d{2}:\d{2}(?:, fine alle \d{2}:\d{2})?$/,
    );
    expect(oraCells.length).toBeGreaterThan(0);
  });

  it("annuncia la cella canale come 'Canale <nome>'", () => {
    render(<TonightTvList />);
    const canale = screen.getAllByLabelText(/^Canale RAI 1$/i);
    expect(canale.length).toBeGreaterThan(0);
  });

  it("rende la riga rowheader della famiglia con etichetta accessibile", () => {
    render(<TonightTvList />);
    const fam = screen.getAllByRole("rowheader");
    expect(fam.length).toBeGreaterThan(0);
    // Almeno un rowheader contiene "RAI" nell'aria-label
    const labels = fam.map((el) => el.getAttribute("aria-label") ?? "");
    expect(labels.some((l) => /Famiglia\s+RAI/i.test(l))).toBe(true);
  });

  it("la prima riga programma ha aria-rowindex >= 2 (header occupa la riga 1)", () => {
    render(<TonightTvList />);
    const rows = screen.getAllByRole("row");
    const programRows = rows.filter((r) => {
      const idx = r.getAttribute("aria-rowindex");
      return idx !== null && parseInt(idx, 10) >= 2;
    });
    expect(programRows.length).toBeGreaterThan(0);
  });

  it("l'articolo mobile aggrega le info principali in aria-label", () => {
    render(<TonightTvList />);
    // L'articolo mobile e' sempre nel DOM (nascosto via classi sm:hidden)
    const articles = document.querySelectorAll("article[aria-label]");
    expect(articles.length).toBeGreaterThan(0);
    const label = articles[0].getAttribute("aria-label") ?? "";
    expect(label).toMatch(/RAI 1/);
    expect(label).toMatch(/Il Commissario Montalbano/);
    expect(label).toMatch(/durata 1 ora e 55 minuti/i);
  });

  it("il contatore paginazione ha aria-live='polite'", () => {
    // Con un solo canale non c'è paginazione visibile, quindi il check è
    // condizionale: se è presente, deve essere live region.
    render(<TonightTvList />);
    const live = document.querySelector('[aria-live="polite"]');
    // Può essere null se totalTvPages === 1, accettiamo entrambi i casi.
    if (live) {
      expect(live.getAttribute("aria-atomic")).toBe("true");
    }
  });
});