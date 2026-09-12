import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { FootballMatch } from "@/lib/api/schemas";
import NextMatchCard from "./NextMatchCard";
import { resolveTeam, type SerieATeam } from "@/lib/serieATeams";

const JUVE = resolveTeam("juventus");

const match = (over: Partial<FootballMatch> = {}): FootballMatch => ({
  id: "serie-a-2099-09-13-juventus-vs-milan",
  homeTeam: "Juventus",
  awayTeam: "Milan",
  competition: "Serie A",
  date: "2099-09-13T18:45:00",
  broadcaster: "DAZN | Sky Sport",
  ...over,
});

function renderCard(m: FootballMatch, team: SerieATeam = JUVE) {
  return render(
    <MemoryRouter>
      <NextMatchCard team={team} match={m} onRetry={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("NextMatchCard", () => {
  /**
   * **Le asserzioni su «Juventus vs» / «Inter @» sono state sostituite, non
   * indebolite.** Descrivevano una card che componeva una frase con due
   * squadre su due righe, e quella frase in trasferta diceva l'opposto del
   * dato: «LAZIO @» sopra e «Milan» sotto si legge «Lazio in casa del Milan»,
   * mentre la riga di calendario della stessa partita scriveva «@ Lazio».
   * Il requisito e' cambiato: la card nomina solo l'avversario, con lo stesso
   * prefisso della lista. I casi coperti restano gli stessi — casa, trasferta,
   * punto di vista rovesciato — e se ne aggiungono sulla coppia stemma/nome.
   */
  it("in casa mostra l'avversario e porta al dettaglio della partita", () => {
    renderCard(match());

    expect(screen.getByText("Prossima Partita")).toBeInTheDocument();
    expect(screen.getByText("vs Milan")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Apri dettaglio Juventus vs Milan, Juventus in casa" }),
    ).toHaveAttribute("href", "/squadra/juventus/partite/serie-a-2099-09-13-juventus-vs-milan");
  });

  it("in trasferta dice da chi si gioca", () => {
    renderCard(match({ homeTeam: "Inter", awayTeam: "Juventus" }));

    expect(screen.getByText("@ Inter")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Apri dettaglio Inter vs Juventus, Juventus in trasferta" }),
    ).toBeInTheDocument();
  });

  /**
   * Il cuore del difetto: la card diceva «Milan» in grande accanto allo stemma
   * della Lazio. Chi guardava leggeva un nome e vedeva lo stemma di un altro,
   * e in piu' la frase rovesciava il lato. Ora la squadra della pagina non
   * compare affatto nella card — la nomina il titolo, appena sopra.
   */
  it("nomina soltanto l'avversario, mai la squadra della pagina", () => {
    renderCard(
      match({ homeTeam: "Lazio", awayTeam: "Milan", homeLogo: "lazio.png", awayLogo: "milan.png" }),
      resolveTeam("milan"),
    );

    expect(screen.getByText("@ Lazio")).toBeInTheDocument();
    expect(screen.queryByText("Milan")).not.toBeInTheDocument();
    expect(screen.queryByText("Lazio @")).not.toBeInTheDocument();
  });

  it("lo stemma e' quello dell'avversario, non quello della squadra della pagina", () => {
    renderCard(
      match({ homeTeam: "Lazio", awayTeam: "Milan", homeLogo: "lazio.png", awayLogo: "milan.png" }),
      resolveTeam("milan"),
    );

    expect(screen.getByAltText("Lazio")).toHaveAttribute("src", "lazio.png");
    expect(screen.queryByAltText("Milan")).not.toBeInTheDocument();
  });

  /** Fonte senza logo: iniziali dell'avversario, nella stessa scatola. */
  it("senza logo dalla fonte mostra le iniziali dell'avversario", () => {
    renderCard(match({ homeLogo: null, awayLogo: null }));

    expect(screen.queryByAltText("Milan")).not.toBeInTheDocument();
    const segnaposto = screen.getByText("MI");
    expect(segnaposto.parentElement).toHaveStyle({ width: "48px", height: "48px" });
  });

  /**
   * «@» e «vs» sono segni, e un segno non arriva a chi la pagina se la fa
   * leggere. Il posto giusto e' il nome accessibile del collegamento: un testo
   * nascosto la' dentro non servirebbe, perche' `aria-label` sostituisce il
   * nome calcolato dal sottoalbero.
   */
  it("il lato non resta informazione solo visiva", () => {
    renderCard(match({ homeTeam: "Inter", awayTeam: "Juventus" }));
    expect(screen.getByRole("link", { name: /Juventus in trasferta$/ })).toBeInTheDocument();
  });

  it("un'emittente per chip, separate dalla barra come le scrive la fonte", () => {
    renderCard(match());

    expect(screen.getByText("DAZN")).toBeInTheDocument();
    expect(screen.getByText("Sky Sport")).toBeInTheDocument();
  });

  /**
   * La stessa partita, in cima al calendario dell'altra squadra: l'avversario
   * si scambia e il link porta nel ramo di quella squadra. E' la prova che il
   * punto di vista e' un parametro e non e' rimasto la Juventus.
   */
  it("dal calendario dell'altra squadra l'avversario e il link si rovesciano", () => {
    renderCard(match({ homeTeam: "Juventus", awayTeam: "Napoli" }), resolveTeam("napoli"));

    expect(screen.getByText("@ Juventus")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Apri dettaglio Juventus vs Napoli, Napoli in trasferta" }),
    ).toHaveAttribute("href", "/squadra/napoli/partite/serie-a-2099-09-13-juventus-vs-milan");
  });

  it("l'orario e' in fuso italiano: 18:45 UTC sono le 20:45", () => {
    renderCard(match());

    expect(screen.getByText(/20:45/)).toBeInTheDocument();
  });

  /**
   * Il conto alla rovescia sta **sulla stessa riga** delle emittenti: prima
   * stava sotto, in una colonna, e fra chip e timer restava una fascia vuota
   * che in mobile spingeva tutta la card piu' in basso.
   */
  it("il conto alla rovescia sta nella stessa riga dei chip delle emittenti", () => {
    renderCard(match());
    const timer = screen.getByLabelText("Tempo mancante all'evento");
    const chip = screen.getByText("DAZN");
    expect(timer.parentElement).toBe(chip.parentElement);
    expect(timer.parentElement!.className).toContain("flex-wrap");
  });

  /**
   * Le stelline sono l'icona con cui mezzo web segnala «generato da AI»: qui
   * non c'e' nessuna AI, e un'icona che promette una cosa che non c'e' e'
   * un dato falso come un altro.
   */
  it("non usa l'icona delle stelline, che oggi significa «AI»", () => {
    const { container } = renderCard(match());
    expect(container.querySelector(".lucide-sparkles")).toBeNull();
  });
});
