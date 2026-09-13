import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MatchPhaseBadge from "./MatchPhaseBadge";

/**
 * L'etichetta della fase vive in un componente solo perche' la dicono tre
 * viste — la card in testa, la riga di calendario, la testata del dettaglio —
 * e finche' ognuna se la scriveva da sola potevano contraddirsi nella stessa
 * schermata. E' esattamente quello che e' successo.
 */
describe("MatchPhaseBadge", () => {
  it("prima della partita annuncia la prossima", () => {
    render(<MatchPhaseBadge fase="prepartita" />);
    expect(screen.getByText("Prossima Partita")).toBeInTheDocument();
  });

  it("durante la partita dice che si sta giocando", () => {
    render(<MatchPhaseBadge fase="in-corso" />);
    expect(screen.getByText("In corso")).toBeInTheDocument();
    expect(screen.queryByText("Prossima Partita")).not.toBeInTheDocument();
  });

  it("a partita finita lo dice, senza piu' pulsare", () => {
    const { container } = render(<MatchPhaseBadge fase="finita" />);
    expect(screen.getByText("Terminata")).toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).toBeNull();
  });

  it("mentre si gioca il pallino pulsa", () => {
    const { container } = render(<MatchPhaseBadge fase="in-corso" />);
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });
});
