import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MatchScore from "./MatchScore";

/**
 * Il punteggio era scritto a mano in tre punti — il blocco del dettaglio, la
 * testata della pagina partita e la riga di calendario — con due separatori
 * diversi (`–` nei primi due, `-` nel terzo) e i numeri tabellari solo in due
 * su tre, cosi' la colonna del calendario ballava a ogni riga.
 */
describe("MatchScore", () => {
  it("scrive i due numeri con un separatore solo", () => {
    const { container } = render(<MatchScore score={{ home: 2, away: 0 }} />);
    expect(container.textContent).toContain("2–0");
  });

  /**
   * «2–0» letto da uno screen reader e' «due meno zero», o niente. Il
   * punteggio e' il dato che la pagina esiste per dare: non puo' essere
   * l'unica cosa che non arriva a chi la pagina se la fa leggere.
   */
  it("si fa leggere a parole", () => {
    render(<MatchScore score={{ home: 2, away: 0 }} />);
    expect(screen.getByText("2 a 0")).toBeInTheDocument();
  });

  it("i numeri sono tabellari, cosi' le righe non ballano", () => {
    const { container } = render(<MatchScore score={{ home: 10, away: 1 }} />);
    expect(container.querySelector(".tabular-nums")).not.toBeNull();
  });

  it("senza punteggio mostra quello che il contesto chiede", () => {
    render(<MatchScore score={null} fallback="vs" />);
    expect(screen.getByText("vs")).toBeInTheDocument();
  });

  it("senza punteggio e senza ripiego non scrive niente", () => {
    const { container } = render(<MatchScore score={null} />);
    expect(container.textContent).toBe("");
  });
});
