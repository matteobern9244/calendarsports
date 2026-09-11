import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LineupSide, Lineups } from "@/lib/api/schemas";
import LineupsBoard from "./LineupsBoard";

const giocatore = (n: number, surname: string) => ({
  name: `${surname} X.`,
  surname,
  shirtNumber: n,
  role: "Defender",
  playerId: String(n),
  photoUrl: `https://static.sky.it/foto/${n}.png`,
  profileUrl: `https://sport.sky.it/calcio/atleti/${surname.toLowerCase()}/${n}`,
});

const undici = Array.from({ length: 11 }, (_, i) => giocatore(i + 1, `Gioc${i + 1}`));

const lato = (over: Partial<LineupSide> = {}): LineupSide => ({
  teamSlug: "juventus",
  teamName: "Juventus",
  formation: "4231",
  logoUrl: null,
  startingLineup: undici,
  lines: [
    undici.slice(0, 1),
    undici.slice(1, 5),
    undici.slice(5, 7),
    undici.slice(7, 10),
    undici.slice(10, 11),
  ],
  substitutes: ["Grabara", "Pinsoglio"],
  unavailables: ["Yildiz"],
  disqualifieds: [],
  doubtful: [],
  manager: "Luciano Spalletti",
  ...over,
});

const formazioni = (over: Partial<Lineups> = {}): Lineups => ({
  date: "2026-09-13T18:45:00.000Z",
  matchUrl: null,
  home: lato({ teamName: "Sassuolo", teamSlug: "sassuolo" }),
  away: lato(),
  ...over,
});

describe("LineupsBoard", () => {
  it("dice che sono probabili, e non inventa un aggiornamento", () => {
    // Sono previsioni editoriali: chiamarle «formazioni» sarebbe dare loro
    // un'autorita' che non hanno. E la fonte non pubblica quando le ha
    // aggiornate, quindi nessun «ultimo aggiornamento».
    render(<LineupsBoard lineups={formazioni()} />);
    expect(screen.getByText("Probabili formazioni")).toBeInTheDocument();
    expect(screen.queryByText(/aggiornat/i)).toBeNull();
  });

  it("mostra la data nel fuso di Roma, non in UTC", () => {
    // 18:45 UTC del 13 settembre sono le 20:45 italiane.
    render(<LineupsBoard lineups={formazioni()} />);
    expect(screen.getByText(/20:45/)).toBeInTheDocument();
  });

  it("il modulo si legge separato dai trattini", () => {
    render(<LineupsBoard lineups={formazioni()} />);
    expect(screen.getAllByText("4-2-3-1").length).toBe(2);
  });

  it("gli undici hanno foto e scheda, i cognomi in elenco no", () => {
    // E' la distinzione che regge tutta la schermata: dare la stessa veste a
    // una panchina fatta di soli cognomi prometterebbe un dettaglio assente.
    const { container } = render(<LineupsBoard lineups={formazioni()} />);
    expect(screen.getAllByRole("link", { name: /Gioc1/ }).length).toBeGreaterThan(0);
    const panchina = within(container).getAllByText(/Grabara, Pinsoglio/)[0];
    expect(panchina.closest("a")).toBeNull();
  });

  it("una categoria vuota non lascia un'etichetta orfana", () => {
    render(<LineupsBoard lineups={formazioni()} />);
    expect(screen.queryByText(/Squalificati/)).toBeNull();
    expect(screen.getAllByText(/Indisponibili/).length).toBeGreaterThan(0);
  });

  it("senza linee valide ripiega sull'elenco invece di disegnare storto", () => {
    const rotto = formazioni({ away: lato({ lines: [] }), home: null });
    render(<LineupsBoard lineups={rotto} />);
    expect(screen.getByText("Gioc1 X.")).toBeInTheDocument();
  });
});
