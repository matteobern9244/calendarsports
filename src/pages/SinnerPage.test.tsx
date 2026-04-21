import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SinnerPage from "./SinnerPage";

const mockUseSinnerInfo = vi.fn();
const mockUseSinnerResults = vi.fn();
const mockUseSinnerSchedule = vi.fn();

vi.mock("@/hooks/useSportsData", () => ({
  useSinnerInfo: () => mockUseSinnerInfo(),
  useSinnerResults: () => mockUseSinnerResults(),
  useSinnerSchedule: () => mockUseSinnerSchedule(),
}));

describe("SinnerPage", () => {
  beforeEach(() => {
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

    expect(screen.getByText("Caricamento risultati...")).toBeInTheDocument();
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
