import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { resolveTeam, type SerieATeam } from "@/lib/serieATeams";
import Header from "./Header";

const NAPOLI = resolveTeam("napoli");

const { preferenze } = vi.hoisted(() => ({
  preferenze: { squadra: null as SerieATeam | null },
}));

vi.mock("@/contexts/useUserPrefs", async (originale) => {
  const vero = await originale<typeof import("@/contexts/useUserPrefs")>();
  return {
    ...vero,
    useUserPrefs: () => ({
      favoriteTeam: preferenze.squadra,
      sections: vero.DEFAULT_SECTIONS,
    }),
  };
});

vi.mock("@/contexts/usePreferencesPanel", () => ({
  usePreferencesPanel: () => ({ open: false, setOpen: vi.fn(), toggle: vi.fn() }),
}));

/** L'intestazione su un dato indirizzo, con una data squadra preferita. */
function intestazione(indirizzo: string, squadra: SerieATeam = NAPOLI) {
  preferenze.squadra = squadra;
  render(
    <MemoryRouter initialEntries={[indirizzo]}>
      <Header />
    </MemoryRouter>,
  );
  // Il menu desktop e quello mobile rendono la stessa voce due volte, e a
  // questa risoluzione jsdom non ne nasconde nessuna: la prima basta.
  return screen.getAllByRole("link", { name: /NAPOLI|MILAN|JUVENTUS/ })[0];
}

describe("Header, la voce della squadra", () => {
  it("porta alla squadra scelta nelle preferenze", () => {
    const voce = intestazione("/");
    expect(voce).toHaveTextContent("NAPOLI");
    expect(voce).toHaveAttribute("href", "/squadra/napoli");
  });

  /**
   * Dentro una pagina squadra comanda l'indirizzo, non la preferenza. E' la
   * stessa regola che governa il rendering della pagina, e qui serve due
   * volte: un menu che dicesse «Napoli» sopra la pagina del Milan mentirebbe,
   * e cliccandolo porterebbe via da dove si e' arrivati con un link condiviso.
   */
  it("dentro una pagina squadra segue l'indirizzo, non la preferenza", () => {
    const voce = intestazione("/squadra/milan");
    expect(voce).toHaveTextContent("MILAN");
    expect(voce).toHaveAttribute("href", "/squadra/milan");
    expect(voce).toHaveAttribute("aria-current", "page");
  });

  it("vale anche sul dettaglio di una partita", () => {
    const voce = intestazione("/squadra/milan/partite/serie-a-2099-milan-vs-napoli");
    expect(voce).toHaveTextContent("MILAN");
  });

  /**
   * Uno slug che non e' una squadra non deve diventarne una: quella pagina e'
   * un 404, e il menu torna a proporre la preferenza.
   */
  it("uno slug inventato non diventa una squadra", () => {
    const voce = intestazione("/squadra/squadra-inventata");
    expect(voce).toHaveTextContent("NAPOLI");
    expect(voce).toHaveAttribute("href", "/squadra/napoli");
  });
});
