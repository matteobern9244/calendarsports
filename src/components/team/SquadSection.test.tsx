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
      photoUrl: "https://static.sky.it/foto/vicario.png",
      fallbackPhotoUrl: "https://foto-alternativa.test/vicario.png",
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
      photoUrl: null,
      fallbackPhotoUrl: null,
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
    photoUrl: null,
    fallbackPhotoUrl: null,
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
  render(<SquadSection team={JUVE} squad={squad} season={2026} />);

describe("SquadSection", () => {
  it("raggruppa per reparto e conta i giocatori", () => {
    renderRosa();
    expect(screen.getByText(/Portieri/)).toBeInTheDocument();
    expect(screen.getByText(/Difensori/)).toBeInTheDocument();
    expect(screen.getByText("Vicario G.")).toBeInTheDocument();
  });

  it("mostra il volto di ogni giocatore e conserva una seconda fonte", () => {
    renderRosa();
    const foto = screen.getByRole("img", { name: "Vicario G." });
    expect(foto).toHaveAttribute("src", "https://static.sky.it/foto/vicario.png");
    expect(foto).toHaveAttribute("data-fallback-src", "https://foto-alternativa.test/vicario.png");
    expect(screen.getByLabelText("Foto non disponibile per Kelly L.")).toBeInTheDocument();
  });

  it("l'allenatore sta fuori dai reparti", () => {
    // Non e' un giocatore: se finisse in un reparto sarebbe conteggiato come
    // tale, e la rosa direbbe un numero sbagliato.
    const { container } = renderRosa();
    const sezioneAllenatore = within(container).getByText("Allenatore").closest("section")!;
    expect(within(sezioneAllenatore).getByText("Spalletti L.")).toBeInTheDocument();
  });

  /**
   * Tolta l'attribuzione a Sky Sport e alla Lega Serie A, come richiesto.
   * L'invito a toccare un giocatore invece resta: non e' una fonte, e' l'unica
   * riga che annuncia che quelle dell'elenco sono righe apribili.
   */
  it("non attribuisce la rosa a una fonte, ma dice ancora che le righe si aprono", () => {
    renderRosa();

    expect(screen.queryByText(/Sky Sport/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Lega Serie A/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Tocca un giocatore/i)).toBeInTheDocument();
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
    const { container } = render(<SquadSection team={JUVE} squad={senza} season={2026} />);
    expect(within(container).queryByText(/posti/)).toBeNull();
    expect(within(container).getByText("Allianz Stadium")).toBeInTheDocument();
  });

  it("senza stadio la rosa si vede lo stesso", () => {
    // Le due fonti sono indipendenti: se cade la Lega, Sky deve bastare.
    const { container } = render(
      <SquadSection team={JUVE} squad={rosa({ stadium: null })} season={2026} />,
    );
    expect(within(container).queryByText("Stadio")).toBeNull();
    expect(within(container).getByText("Vicario G.")).toBeInTheDocument();
  });

  /**
   * Era «chi ha una scheda atleta e' un link». Da quando la riga si apre sulle
   * statistiche, il nome non e' piu' un link — un link dentro un bottone non e'
   * HTML valido — e il rimando a Sky vive nel pannello. L'invariante che quel
   * test proteggeva pero' resta, ed e' questa: **chi ha una scheda e'
   * raggiungibile, chi non ce l'ha non finge di averla.**
   *
   * Il click non si prova qui: aprire monta `PlayerStatsPanel`, che apre una
   * query, e questo file non ha un `QueryClientProvider` — la copertura vera e'
   * la e2e «la rosa si apre sulle statistiche del giocatore».
   */
  it("chi ha una scheda atleta ha una riga che si apre, chi non ce l'ha resta testo", () => {
    renderRosa();

    const vicario = screen.getByRole("button", { name: /Vicario G\./ });
    expect(vicario).toHaveAttribute("aria-expanded", "false");

    // Kelly non ha `profileUrl`: niente bottone, e nemmeno un link che
    // prometta una scheda che non esiste.
    expect(screen.queryByRole("button", { name: /Kelly L\./ })).toBeNull();
    expect(screen.queryByRole("link", { name: "Kelly L." })).toBeNull();
    expect(screen.getByText("Kelly L.")).toBeInTheDocument();
  });

  /**
   * L'allenatore non ha una scheda atleta — il suo nome sta in uno `<span>`
   * proprio per questo — e la sua riga non deve invitare ad aprirla.
   */
  it("l'allenatore non ha una riga apribile", () => {
    renderRosa();
    expect(screen.queryByRole("button", { name: /Spalletti L\./ })).toBeNull();
  });
});
