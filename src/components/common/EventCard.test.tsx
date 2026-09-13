import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EventCard from "./EventCard";

/**
 * La card della Home dice due cose sullo stato dell'evento: la pillola dorata
 * «Prossimo» in alto a sinistra e il badge «IN DIRETTA» in alto a destra.
 * Erano indipendenti, quindi potevano accendersi insieme — lo stesso difetto
 * della pagina squadra, su un'altra pagina.
 */
describe("EventCard", () => {
  it("non annuncia come prossimo un evento che e' in diretta", () => {
    render(
      <EventCard sport="Calcio" title="vs Lazio" date="12/09/2026" status="in_corso" highlight />,
    );

    expect(screen.getByText("IN DIRETTA")).toBeInTheDocument();
    expect(screen.queryByText("Prossimo")).not.toBeInTheDocument();
  });

  it("l'evento in evidenza che deve ancora cominciare resta annunciato", () => {
    render(<EventCard sport="Calcio" title="vs Lazio" date="19/09/2026" highlight />);

    expect(screen.getByText("Prossimo")).toBeInTheDocument();
  });

  /**
   * Una fonte che dichiara «in corso» sa qualcosa che l'orologio non sa: i
   * supplementari, un ritardo, una sospensione. La stima dei tre ori non deve
   * poterla smentire.
   */
  it("una fonte che dichiara il gioco batte la stima dell'orologio", () => {
    // Cominciato quattro ore fa: la finestra presunta e' scaduta.
    const quattroOreFa = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    render(
      <EventCard
        sport="Calcio"
        title="vs Lazio"
        date="12/09/2026"
        startDate={quattroOreFa}
        status="in_corso"
      />,
    );

    expect(screen.getByText("IN DIRETTA")).toBeInTheDocument();
    expect(screen.queryByText("Completato")).not.toBeInTheDocument();
  });
});
