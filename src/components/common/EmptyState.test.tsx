import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  /**
   * L'icona e' centrata dal contenitore; il testo lo era solo finche' stava
   * su una riga. «Formazioni non ancora pubblicate: i club le comunicano poco
   * prima del fischio d'inizio.» in mobile va a capo, e un paragrafo a due
   * righe senza `text-center` si allinea a sinistra sotto un'icona centrata.
   */
  it("centra anche un messaggio che va a capo", () => {
    render(
      <EmptyState message="Formazioni non ancora pubblicate: i club le comunicano poco prima del fischio d'inizio." />,
    );
    expect(screen.getByText(/Formazioni non ancora/).className).toContain("text-center");
  });
});
