import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveTeam } from "@/lib/serieATeams";
import type { TeamSquad } from "@/lib/api/schemas";
import SquadSection from "./SquadSection";

const JUVE = resolveTeam("juventus");

const rosa = (over: Partial<TeamSquad> = {}): TeamSquad => ({
  players: [
    {
      name: "Vicario G.",
      role: "Portieri",
      shirtNumber: 25,
      countryCode: "ita",
      ageYears: 29,
      heightCm: 194,
      weightKg: 83,
      playerId: "184254",
      profileUrl: "https://sport.sky.it/calcio/atleti/guglielmo-vicario/184254",
    },
    {
      name: "Kelly L.",
      role: "Difensori",
      shirtNumber: null,
      countryCode: "eng",
      ageYears: 26,
      heightCm: 187,
      weightKg: 79,
      playerId: "220001",
      profileUrl: null,
    },
  ],
  manager: {
    name: "Spalletti L.",
    shirtNumber: null,
    countryCode: null,
    ageYears: 67,
    heightCm: null,
    weightKg: null,
    playerId: null,
    profileUrl: null,
  },
  stadium: {
    name: "Allianz Stadium",
    cityName: "Torino",
    address: "Corso Gaetano Scirea, 50",
    capacity: 45666,
    yearOfConstruction: 2011,
  },
  ...over,
});

const renderRosa = (squad: TeamSquad = rosa()) =>
  render(<SquadSection team={JUVE} squad={squad} />);

describe("SquadSection", () => {
  it("raggruppa per reparto e conta i giocatori", () => {
    renderRosa();
    expect(screen.getByText(/Portieri/)).toBeInTheDocument();
    expect(screen.getByText(/Difensori/)).toBeInTheDocument();
    expect(screen.getByText("Vicario G.")).toBeInTheDocument();
  });

  it("l'allenatore sta fuori dai reparti", () => {
    // Non e' un giocatore: se finisse in un reparto sarebbe conteggiato come
    // tale, e la rosa direbbe un numero sbagliato.
    const { container } = renderRosa();
    const sezioneAllenatore = within(container).getByText("Allenatore").closest("section")!;
    expect(within(sezioneAllenatore).getByText("Spalletti L.")).toBeInTheDocument();
  });

  it("mostra l'eta', mai una data di nascita", () => {
    // La fonte non la espone: stamparne una significherebbe inventarla.
    renderRosa();
    expect(screen.getByText("29 anni")).toBeInTheDocument();
    expect(screen.queryByText(/\d{2}\/\d{2}\/\d{4}/)).toBeNull();
  });

  it("l'altezza torna in metri con la virgola italiana", () => {
    renderRosa();
    expect(screen.getByText("1,94 m")).toBeInTheDocument();
    expect(screen.getByText("83 kg")).toBeInTheDocument();
  });

  it("un giocatore senza numero non ne inventa uno", () => {
    renderRosa();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("la capienza compare solo quando la fonte ce l'ha", () => {
    // Quattro stadi su venti non la dichiarano: uno «0 posti» sarebbe falso.
    renderRosa();
    expect(screen.getByText(/45\.666 posti/)).toBeInTheDocument();

    const senza = rosa({ stadium: { ...rosa().stadium!, capacity: null } });
    const { container } = render(<SquadSection team={JUVE} squad={senza} />);
    expect(within(container).queryByText(/posti/)).toBeNull();
    expect(within(container).getByText("Allianz Stadium")).toBeInTheDocument();
  });

  it("senza stadio la rosa si vede lo stesso", () => {
    // Le due fonti sono indipendenti: se cade la Lega, Sky deve bastare.
    const { container } = render(<SquadSection team={JUVE} squad={rosa({ stadium: null })} />);
    expect(within(container).queryByText("Stadio")).toBeNull();
    expect(within(container).getByText("Vicario G.")).toBeInTheDocument();
  });

  it("chi ha una scheda atleta e' un link, chi non ce l'ha e' testo", () => {
    renderRosa();
    expect(screen.getByRole("link", { name: "Vicario G." })).toHaveAttribute(
      "href",
      "https://sport.sky.it/calcio/atleti/guglielmo-vicario/184254",
    );
    expect(screen.queryByRole("link", { name: "Kelly L." })).toBeNull();
  });
});
