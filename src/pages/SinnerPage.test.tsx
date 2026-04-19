import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SinnerPage from "./SinnerPage";

const mockSetSeason = vi.fn();
const mockUseSinnerInfo = vi.fn();
const mockUseSinnerResults = vi.fn();
const mockUseSinnerSchedule = vi.fn();

vi.mock("@/hooks/useSeasonPreferences", () => ({
  useSeasonPreferences: () => ({
    seasons: { sinner: 2026, juventus: 2026, f1: 2026, motogp: 2026 },
    setSeason: mockSetSeason,
  }),
}));

vi.mock("@/hooks/useSportsData", () => ({
  useSinnerInfo: () => mockUseSinnerInfo(),
  useSinnerResults: () => mockUseSinnerResults(),
  useSinnerSchedule: () => mockUseSinnerSchedule(),
}));

describe("SinnerPage", () => {
  beforeEach(() => {
    mockSetSeason.mockReset();
    mockUseSinnerInfo.mockReturnValue({
      data: {
        name: "Jannik Sinner",
        ranking: 2,
        nationality: "Italia",
        height: "188 cm",
        weight: "76 kg",
        birthPlace: "San Candido, Italia",
      },
    });
    mockUseSinnerSchedule.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders the loading state for results", () => {
    mockUseSinnerResults.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<SinnerPage />);

    expect(screen.getByText("Caricamento risultati da ATP Tour...")).toBeInTheDocument();
  });

  it("renders the error state for results", () => {
    mockUseSinnerResults.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("boom"),
      refetch: vi.fn(),
    });

    render(<SinnerPage />);

    expect(screen.getByText("Errore nel caricamento dei risultati")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Riprova" })).toBeInTheDocument();
  });
});
