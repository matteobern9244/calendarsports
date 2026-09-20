import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "@/lib/router-compat";
import TeamRoute from "./TeamRoute";

function renderAt(path: string, figli = (nome: string) => <p>Pagina di {nome}</p>) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/squadra/:teamSlug" element={<TeamRoute>{(t) => figli(t.name)}</TeamRoute>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TeamRoute", () => {
  it("consegna alla pagina la squadra dello slug, gia' risolta", () => {
    renderAt("/squadra/napoli");
    expect(screen.getByText("Pagina di Napoli")).toBeInTheDocument();
  });

  /**
   * Il caso per cui questo componente esiste. `resolveTeam` e' totale e
   * ripiegherebbe sulla Juventus: la pagina mostrerebbe i bianconeri sotto un
   * indirizzo che dice un'altra cosa, e quell'indirizzo e' condivisibile. Un
   * dato falso presentato come vero e' peggio di una pagina che manca, quindi
   * qui si valida con la forma **stretta** e si risponde 404.
   */
  it("uno slug che non e' una squadra non diventa la Juventus: e' un 404", () => {
    const figli = vi.fn(() => <p>Pagina</p>);
    render(
      <MemoryRouter initialEntries={["/squadra/squadra-inventata"]}>
        <Routes>
          <Route path="/squadra/:teamSlug" element={<TeamRoute>{figli}</TeamRoute>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Pagina non trovata")).toBeInTheDocument();
    expect(figli).not.toHaveBeenCalled();
  });

  /**
   * Gli alias valgono anche nella URL: un link vecchio che dice
   * «internazionale» apre l'Inter invece di un 404. E' `resolveTeamStrict` a
   * saperlo, ed e' il motivo per cui lo slug non si confronta a mano.
   */
  it("un alias della fonte apre comunque la squadra giusta", () => {
    renderAt("/squadra/internazionale");
    expect(screen.getByText("Pagina di Inter")).toBeInTheDocument();
  });
});
