import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { TvFamilyPayload } from "@/hooks/useStreamingData";

// ---------------------------------------------------------------------------
// Test dell'algoritmo di overlap della scheda "Stasera in TV".
//
// Verifica che un programma compaia quando il suo intervallo
// [start, end) si sovrappone alla finestra di prima serata
// [21:00, 23:00) Europe/Rome, e che venga escluso quando non c'e'
// alcuna sovrapposizione. Copre i casi limite richiesti:
//   - inizio 20:30 e fine dopo le 23 (kickoff anticipato lungo)
//   - inizio 22:55 e fine 23:50 (programma a cavallo della fine
//     finestra)
//   - programma che attraversa la mezzanotte (22:30 -> 00:30)
//   - programmi totalmente fuori finestra (es. 19:00 -> 20:00 o
//     23:00 -> 00:30) che NON devono comparire.
// ---------------------------------------------------------------------------

type ProgramFixture = { start: string; end: string; title: string; genre?: string };
type ChannelFixture = { id: string; name: string; number?: number; programs: ProgramFixture[] };
type FamilyFixtures = Partial<Record<TvFamilyPayload["family"], ChannelFixture[]>>;

declare global {
  // eslint-disable-next-line no-var
  var __TONIGHT_TV_FIXTURES__: FamilyFixtures | undefined;
}

function setFixtures(fx: FamilyFixtures) {
  globalThis.__TONIGHT_TV_FIXTURES__ = fx;
}

vi.mock("@tanstack/react-query", () => {
  const buildPayload = (
    family: TvFamilyPayload["family"],
    label: string,
  ): TvFamilyPayload => {
    const channels = globalThis.__TONIGHT_TV_FIXTURES__?.[family] ?? [];
    return {
      family,
      familyLabel: label,
      date: "2026-04-21",
      programsAvailable: channels.length > 0,
      channels: channels.map((c) => ({
        id: c.id,
        name: c.name,
        logo: null,
        number: c.number,
        programs: c.programs,
      })),
    };
  };
  const labelByFamily: Record<string, string> = {
    rai: "RAI",
    mediaset: "Mediaset",
    "sky-sport": "Sky Sport",
    "sky-cinema": "Sky Cinema",
    discovery: "Discovery",
  };
  return {
    useQueries: ({ queries }: { queries: Array<{ queryKey: unknown[] }> }) =>
      queries.map((q) => {
        const familyId = (q.queryKey?.[1] as string) ?? "rai";
        return {
          data: buildPayload(
            familyId as TvFamilyPayload["family"],
            labelByFamily[familyId] ?? familyId,
          ),
          isLoading: false,
          isError: false,
        };
      }),
  };
});

vi.mock("@/lib/api/sportsApi", async () => ({
  streamingApi: { getTvByFamily: vi.fn() },
}));

import TonightTvList from "./TonightTvList";

// Helper: gli ISO sono in UTC ma corrispondono agli orari Europe/Rome
// indicati nel commento (21 aprile 2026, CEST = UTC+2).
const program = (
  startUtc: string,
  endUtc: string,
  title: string,
): ProgramFixture => ({ start: startUtc, end: endUtc, title });

describe("TonightTvList - algoritmo di overlap prima serata", () => {
  beforeEach(() => {
    setFixtures({});
    vi.clearAllMocks();
  });

  it("mostra un programma 20:30 -> 23:15 Rome (kickoff anticipato lungo)", () => {
    setFixtures({
      rai: [
        {
          id: "rai-1",
          name: "RAI 1",
          number: 1,
          programs: [
            // 20:30 -> 23:15 Europe/Rome
            program("2026-04-21T18:30:00Z", "2026-04-21T21:15:00Z", "Maratona Sportiva"),
          ],
        },
      ],
    });
    render(<TonightTvList />);
    expect(screen.getAllByText("Maratona Sportiva").length).toBeGreaterThan(0);
    // L'orario reale di inizio (20:30) deve essere mostrato anche se
    // anteriore alla fascia, perche' il programma e' ancora in onda.
    expect(screen.getAllByLabelText("Inizio alle 20:30").length).toBeGreaterThan(0);
  });

  it("mostra un programma 22:55 -> 23:50 Rome (inizia in fascia, finisce dopo le 23)", () => {
    setFixtures({
      rai: [
        {
          id: "rai-1",
          name: "RAI 1",
          number: 1,
          programs: [
            program("2026-04-21T20:55:00Z", "2026-04-21T21:50:00Z", "Speciale Tg1 Notte"),
          ],
        },
      ],
    });
    render(<TonightTvList />);
    expect(screen.getAllByText("Speciale Tg1 Notte").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Inizio alle 22:55").length).toBeGreaterThan(0);
  });

  it("mostra un programma che attraversa la mezzanotte (22:30 -> 00:30)", () => {
    setFixtures({
      mediaset: [
        {
          id: "canale-5",
          name: "Canale 5",
          number: 5,
          programs: [
            // 22:30 -> 00:30 Europe/Rome: inizia in fascia e attraversa
            // la mezzanotte. Overlap con [21:00, 23:00) = 30 min.
            program("2026-04-21T20:30:00Z", "2026-04-21T22:30:00Z", "X-Style Night"),
          ],
        },
      ],
    });
    render(<TonightTvList />);
    expect(screen.getAllByText("X-Style Night").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Inizio alle 22:30").length).toBeGreaterThan(0);
  });

  it("NON mostra 19:00 -> 20:00 Rome (interamente prima della fascia)", () => {
    setFixtures({
      rai: [
        {
          id: "rai-1",
          name: "RAI 1",
          number: 1,
          programs: [
            program("2026-04-21T17:00:00Z", "2026-04-21T18:00:00Z", "Reazione a Catena"),
          ],
        },
      ],
    });
    render(<TonightTvList />);
    expect(screen.queryAllByText("Reazione a Catena")).toHaveLength(0);
  });

  it("NON mostra 18:30 -> 20:55 Rome (finisce prima delle 21:00)", () => {
    setFixtures({
      rai: [
        {
          id: "rai-1",
          name: "RAI 1",
          number: 1,
          programs: [
            program("2026-04-21T16:30:00Z", "2026-04-21T18:55:00Z", "Pre-Serata Lunga"),
          ],
        },
      ],
    });
    render(<TonightTvList />);
    expect(screen.queryAllByText("Pre-Serata Lunga")).toHaveLength(0);
  });

  it("NON mostra 23:00 -> 00:30 Rome (inizia esattamente alla fine della fascia, escluso half-open)", () => {
    setFixtures({
      rai: [
        {
          id: "rai-1",
          name: "RAI 1",
          number: 1,
          programs: [
            program("2026-04-21T21:00:00Z", "2026-04-21T22:30:00Z", "Porta a Porta"),
          ],
        },
      ],
    });
    render(<TonightTvList />);
    expect(screen.queryAllByText("Porta a Porta")).toHaveLength(0);
  });

  it("preferisce il programma con maggior overlap quando un canale ne ha piu' di uno in fascia", () => {
    setFixtures({
      mediaset: [
        {
          id: "canale-5",
          name: "Canale 5",
          number: 5,
          programs: [
            // 20:40 -> 22:50 Rome: overlap 110 min con [21:00, 23:00)
            program("2026-04-21T18:40:00Z", "2026-04-21T20:50:00Z", "Coppa Italia"),
            // 22:55 -> 23:30 Rome: overlap 5 min
            program("2026-04-21T20:55:00Z", "2026-04-21T21:30:00Z", "Tg5 Notte"),
          ],
        },
      ],
    });
    render(<TonightTvList />);
    expect(screen.getAllByText("Coppa Italia").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("Tg5 Notte")).toHaveLength(0);
  });
});
