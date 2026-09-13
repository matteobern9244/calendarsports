import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/sportsApi", () => ({
  footballApi: { getMatchDetail: vi.fn() },
}));

import { footballApi } from "@/lib/api/sportsApi";
import type { FootballMatch, MatchDetail } from "@/lib/api/schemas";
import { resolveTeam, type SerieATeam } from "@/lib/serieATeams";
import MatchHero from "./MatchHero";

/**
 * Il difetto numero due: il risultato c'era, ma bisognava sapere dove
 * cercarlo. Si apriva il dettaglio della partita e poi, dentro, la scheda
 * «Risultato» — la quarta di cinque. Ora sta in cima, sopra le schede, e la
 * scheda non esiste piu'.
 */

const JUVE = resolveTeam("juventus");
const minutiFa = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

const match = (over: Partial<FootballMatch> = {}): FootballMatch => ({
  id: "serie-a-2099-05-17-juventus-vs-napoli",
  skyMatchId: "900003",
  homeTeam: "Juventus",
  awayTeam: "Napoli",
  competition: "Serie A",
  matchday: 36,
  date: "2099-05-17T18:45:00Z",
  broadcaster: "DAZN",
  ...over,
});

const dettaglio = (over: Partial<MatchDetail> = {}): MatchDetail =>
  ({
    status: "FullTime",
    date: "2099-05-17T18:45:00Z",
    venue: "Allianz Stadium",
    competition: "Serie A",
    round: "36",
    referee: "Arbitro M.",
    score: { home: 2, away: 1 },
    predicted: false,
    home: null,
    away: null,
    events: [
      { minute: 12, type: "GOAL", side: "home", player: "MarcatoreCasa" },
      { minute: 77, type: "GOAL", side: "away", player: "MarcatoreOspite" },
      { minute: 88, type: "GOAL", side: "home", player: "AltroCasa" },
    ],
    ...over,
  }) as MatchDetail;

function renderHero(m: FootballMatch, team: SerieATeam = JUVE) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MatchHero team={team} match={m} onRetry={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("MatchHero", () => {
  beforeEach(() => {
    vi.mocked(footballApi.getMatchDetail).mockReset();
    vi.mocked(footballApi.getMatchDetail).mockResolvedValue(dettaglio());
  });

  it("a partita finita mostra risultato, esito, marcatori e arbitro senza aprire niente", async () => {
    renderHero(match({ status: "FullTime", homeScore: 2, awayScore: 1, date: minutiFa(200) }));

    // Punteggio ed esito arrivano dal calendario, che la pagina ha gia' in
    // mano: si vedono subito. Marcatori, stadio e arbitro arrivano dalla
    // richiesta del dettaglio, e vanno attesi.
    expect(screen.getByText("2 a 1")).toBeInTheDocument();
    expect(screen.getByText("Vittoria Juventus")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("MarcatoreCasa")).toBeInTheDocument());
    expect(screen.getByText("12'")).toBeInTheDocument();
    expect(screen.getByText(/Allianz Stadium/)).toBeInTheDocument();
    expect(screen.getByText(/Arbitro M\./)).toBeInTheDocument();
  });

  /**
   * Il punteggio e' un dato, l'esito e' un giudizio: «Sconfitta Juventus» al
   * 39' sarebbe un verdetto che la partita non ha ancora emesso.
   */
  it("mentre si gioca mostra il punteggio ma non dichiara nessun esito", async () => {
    vi.mocked(footballApi.getMatchDetail).mockResolvedValue(
      dettaglio({ status: "SecondHalf", score: { home: 1, away: 2 } }),
    );
    renderHero(match({ status: "SecondHalf", homeScore: 1, awayScore: 2, date: minutiFa(54) }));

    await waitFor(() => expect(screen.getByText("1 a 2")).toBeInTheDocument());
    expect(screen.queryByText(/Vittoria|Sconfitta|Pareggio/)).not.toBeInTheDocument();
  });

  /**
   * Il costo che l'ordine delle schede proteggeva: i widget del dettaglio
   * pesano un centinaio di kilobyte, ed e' il motivo per cui la scheda
   * predefinita era «Anteprima». Prima del fischio d'inizio non c'e' niente da
   * mostrare che il calendario non abbia gia', quindi non si chiede niente.
   */
  it("prima del fischio d'inizio non chiede il dettaglio", async () => {
    renderHero(match({ status: "PreMatch" }));

    expect(screen.getByText("vs")).toBeInTheDocument();
    await waitFor(() => expect(footballApi.getMatchDetail).not.toHaveBeenCalled());
  });

  /**
   * Il calendario e il dettaglio arrivano da due chiamate diverse, e la
   * seconda e' quella che si aggiorna mentre si gioca: se discordano, vince
   * lei.
   */
  it("quando le due fonti discordano vince il dettaglio", async () => {
    vi.mocked(footballApi.getMatchDetail).mockResolvedValue(
      dettaglio({ status: "SecondHalf", score: { home: 3, away: 0 } }),
    );
    renderHero(match({ status: "SecondHalf", homeScore: 1, awayScore: 0, date: minutiFa(54) }));

    await waitFor(() => expect(screen.getByText("3 a 0")).toBeInTheDocument());
  });

  /**
   * Un riquadro d'errore in cima a una pagina che i dati ce li ha sarebbe un
   * guasto inventato: il racconto dell'errore appartiene alle schede, che
   * hanno gia' `DataSection`.
   */
  it("se il dettaglio non risponde tiene quello che il calendario gli ha dato", async () => {
    vi.mocked(footballApi.getMatchDetail).mockRejectedValue(new Error("fonte muta"));
    renderHero(match({ status: "FullTime", homeScore: 2, awayScore: 1, date: minutiFa(200) }));

    await waitFor(() => expect(footballApi.getMatchDetail).toHaveBeenCalled());
    expect(screen.getByText("2 a 1")).toBeInTheDocument();
    expect(screen.queryByText(/non disponibile|Riprova/i)).not.toBeInTheDocument();
  });

  /** Una partita fra due squadre terze, aperta da un'altra pagina: l'esito tace. */
  it("non dichiara un esito se la squadra della pagina non e' in campo", async () => {
    renderHero(
      match({ homeTeam: "Inter", awayTeam: "Napoli", status: "FullTime", date: minutiFa(200) }),
    );

    await waitFor(() => expect(footballApi.getMatchDetail).toHaveBeenCalled());
    expect(screen.queryByText(/Vittoria|Sconfitta|Pareggio/)).not.toBeInTheDocument();
  });

  /**
   * Un punteggio che non si aggiorna e' un punteggio sbagliato dopo dieci
   * minuti, e la pagina non direbbe che e' vecchio. `intervalloLive` decide
   * *quanto*; questo test prova che sia davvero collegato — una regola giusta
   * e non cablata non aggiorna niente.
   */
  it("mentre si gioca richiede di nuovo il dettaglio da solo", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(footballApi.getMatchDetail).mockResolvedValue(
        dettaglio({ status: "SecondHalf", score: { home: 1, away: 0 } }),
      );
      renderHero(match({ status: "SecondHalf", homeScore: 1, awayScore: 0, date: minutiFa(54) }));

      await vi.waitFor(() => expect(footballApi.getMatchDetail).toHaveBeenCalledTimes(1));
      await vi.advanceTimersByTimeAsync(61_000);
      await vi.waitFor(() => expect(footballApi.getMatchDetail).toHaveBeenCalledTimes(2));
    } finally {
      vi.useRealTimers();
    }
  });

  it("a partita finita smette di richiedere", async () => {
    vi.useFakeTimers();
    try {
      renderHero(match({ status: "FullTime", homeScore: 2, awayScore: 1, date: minutiFa(200) }));

      await vi.waitFor(() => expect(footballApi.getMatchDetail).toHaveBeenCalledTimes(1));
      await vi.advanceTimersByTimeAsync(5 * 60_000);
      expect(footballApi.getMatchDetail).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("senza identificativo della fonte non chiede niente e non promette niente", async () => {
    renderHero(
      match({
        skyMatchId: null,
        status: "FullTime",
        homeScore: 2,
        awayScore: 1,
        date: minutiFa(200),
      }),
    );

    expect(screen.getByText("2 a 1")).toBeInTheDocument();
    await waitFor(() => expect(footballApi.getMatchDetail).not.toHaveBeenCalled());
  });
});
