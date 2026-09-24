import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigationType } from "@/test/memoryRouter";
import { useLocation } from "@/lib/router-compat";
import { DEFAULT_TEAM, resolveTeam, type SerieATeam } from "@/lib/serieATeams";
import type { Sections } from "@/contexts/useUserPrefs";
import type { StartPage } from "@/lib/startPage";

const { prefs } = vi.hoisted(() => ({
  prefs: {
    startPage: "home" as StartPage,
    startPageReady: true,
    favoriteTeam: null as unknown as SerieATeam,
    sections: {
      home: true,
      calendario: true,
      streaming: true,
      sinner: true,
      squadra: true,
      f1: true,
      motogp: true,
    } as Sections,
  },
}));

vi.mock("@/contexts/useUserPrefs", async (importOriginal) => {
  const reale = await importOriginal<typeof import("@/contexts/useUserPrefs")>();
  return { ...reale, useUserPrefs: () => prefs };
});

import StartRoute from "./StartRoute";

/** Dice dove si e' finiti e **come**: di corsa o sostituendo la cronologia. */
function Sonda({ nome }: { nome: string }) {
  const { pathname } = useLocation();
  return (
    <p>
      {nome} · {pathname} · {useNavigationType()}
    </p>
  );
}

function monta() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={
            <StartRoute>
              <Sonda nome="Home" />
            </StartRoute>
          }
        />
        <Route path="/home" element={<Sonda nome="Home" />} />
        <Route path="/calendario" element={<Sonda nome="Calendario" />} />
        <Route path="/motogp" element={<Sonda nome="MotoGP" />} />
        <Route path="/squadra/:teamSlug" element={<Sonda nome="Squadra" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("StartRoute", () => {
  beforeEach(() => {
    prefs.startPage = "home";
    prefs.startPageReady = true;
    prefs.favoriteTeam = DEFAULT_TEAM;
    prefs.sections = {
      home: true,
      calendario: true,
      streaming: true,
      sinner: true,
      squadra: true,
      f1: true,
      motogp: true,
    };
  });

  /**
   * Il caso di gran lunga piu' frequente — nessun accesso, oppure la Home
   * scelta di proposito — non deve pagare niente: nessun rimbalzo, e
   * l'indirizzo resta la radice. E' anche cio' che tiene validi i link
   * esistenti verso `/`.
   */
  it("con la Home come preferenza mostra la Home, restando sulla radice", () => {
    monta();
    expect(screen.getByText(/^Home · \/ ·/)).toBeInTheDocument();
  });

  it("con un'altra preferenza porta la' , sostituendo la cronologia", async () => {
    prefs.startPage = "calendario";
    monta();
    expect(await screen.findByText(/^Calendario · \/calendario · REPLACE$/)).toBeInTheDocument();
  });

  /**
   * `replace` e non una voce nuova: altrimenti il tasto «indietro» tornerebbe
   * sulla radice, che rimanda subito avanti — una trappola da cui non si esce
   * piu'. E' la stessa ragione per cui i vecchi indirizzi `/juventus`
   * sostituiscono la loro voce.
   */
  it("la squadra e' quella preferita, non una fissa", async () => {
    prefs.startPage = "squadra";
    prefs.favoriteTeam = resolveTeam("napoli");
    monta();
    expect(await screen.findByText(/^Squadra · \/squadra\/napoli · REPLACE$/)).toBeInTheDocument();
  });

  /**
   * La preferenza arriva dalla rete. Dipingere la Home mentre non si sa
   * ancora vorrebbe dire mostrarla per un istante e poi saltare altrove:
   * finche' non si sa, non si dipinge niente di definitivo.
   */
  it("finche' non si sa dove andare non mostra nessuna pagina", () => {
    prefs.startPageReady = false;
    prefs.startPage = "calendario";
    monta();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText(/Calendario/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Home/)).not.toBeInTheDocument();
  });

  /**
   * Nascondere una voce tocca il menu' e nient'altro. Chi toglie MotoGP
   * dall'intestazione ma ha scelto di aprire l'app li' ci atterra lo stesso:
   * la pagina non e' irraggiungibile, e legare le due cose vorrebbe dire che
   * riordinare il menu' cambia di nascosto dove l'app si apre.
   */
  it("una voce nascosta dal menu' non sposta l'atterraggio", async () => {
    prefs.startPage = "motogp";
    prefs.sections = { ...prefs.sections, motogp: false };
    monta();
    expect(await screen.findByText(/^MotoGP · \/motogp · REPLACE$/)).toBeInTheDocument();
  });
});
