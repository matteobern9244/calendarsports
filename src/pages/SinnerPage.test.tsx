import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import SinnerPage from "./SinnerPage";

const mockUseSinnerInfo = vi.fn();
const mockUseSinnerResults = vi.fn();
const mockUseSinnerSchedule = vi.fn();

vi.mock("@/hooks/useSportsData", () => ({
  useSinnerInfo: () => mockUseSinnerInfo(),
  useSinnerResults: () => mockUseSinnerResults(),
  useSinnerSchedule: () => mockUseSinnerSchedule(),
}));

// Wrapper minimo per fornire il QueryClient richiesto dal prefetch
// della pagina successiva (`useQueryClient` interno alla pagina). Un
// nuovo client per render evita cross-talk fra test.
function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

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

    renderWithClient(<SinnerPage />);

    expect(screen.getByText("Caricamento risultati...")).toBeInTheDocument();
  });

  it("renders the error state for results", () => {
    mockUseSinnerResults.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("boom"),
      refetch: vi.fn(),
    });

    renderWithClient(<SinnerPage />);

    expect(
      screen.getByText(/Risultati stagione \d{4} non disponibili/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Riprova/i })).toBeInTheDocument();
  });

  it("renders pagination controls when results payload includes pagination metadata", () => {
    mockUseSinnerResults.mockReturnValue({
      data: {
        items: [
          {
            tournament: "Australian Open",
            date: "2026-01-22",
            opponent: "Carlos Alcaraz",
            opponentRank: 1,
            round: "F",
            surface: "Hard",
            result: "V",
            score: "6-3 6-4 6-2",
          },
        ],
        pagination: { page: 1, pageSize: 12, total: 30, totalPages: 3 },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithClient(<SinnerPage />);

    const nav = screen.getByRole("navigation", { name: /Paginazione risultati/i });
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveTextContent(/Pagina 1 \/ 3 · 30 risultati/i);
    expect(
      screen.getByRole("button", { name: /Pagina precedente dei risultati/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Pagina successiva dei risultati/i }),
    ).not.toBeDisabled();
  });

  it("hides pagination controls when there is only one page", () => {
    mockUseSinnerResults.mockReturnValue({
      data: {
        items: [
          {
            tournament: "Davis Cup",
            date: "2026-11-22",
            opponent: "John Doe",
            opponentRank: 50,
            round: "RR",
            surface: "Hard (Indoor)",
            result: "V",
            score: "6-2 6-3",
          },
        ],
        pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithClient(<SinnerPage />);

    expect(
      screen.queryByRole("navigation", { name: /Paginazione risultati/i }),
    ).not.toBeInTheDocument();
  });

  it("still renders the legacy array shape (backwards compatibility)", () => {
    mockUseSinnerResults.mockReturnValue({
      data: [
        {
          tournament: "Roland Garros",
          date: "2026-06-07",
          opponent: "Daniil Medvedev",
          opponentRank: 4,
          round: "F",
          surface: "Clay",
          result: "V",
          score: "6-4 7-5 6-2",
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithClient(<SinnerPage />);

    expect(screen.getByText(/vs\. Daniil Medvedev/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: /Paginazione risultati/i }),
    ).not.toBeInTheDocument();
  });
});
