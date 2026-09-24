import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "@/lib/router-compat";
import { resolveTeam, type SerieATeam } from "@/lib/serieATeams";
import Header from "./Header";

const NAPOLI = resolveTeam("napoli");

const { preferenze } = vi.hoisted(() => ({
  preferenze: {
    squadra: null as SerieATeam | null,
    sezioni: null as Record<string, boolean> | null,
    utente: { id: "u1" } as { id: string } | null,
  },
}));

vi.mock("@/contexts/useAuth", () => ({
  useAuth: () => ({
    session: null,
    user: preferenze.utente,
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/contexts/useUserPrefs", async (originale) => {
  const vero = await originale<typeof import("@/contexts/useUserPrefs")>();
  return {
    ...vero,
    useUserPrefs: () => ({
      favoriteTeam: preferenze.squadra,
      sections: preferenze.sezioni ?? vero.DEFAULT_SECTIONS,
    }),
  };
});

vi.mock("@/contexts/usePreferencesPanel", () => ({
  usePreferencesPanel: () => ({ open: false, setOpen: vi.fn(), toggle: vi.fn() }),
}));

/** L'intestazione su un dato indirizzo, con una data squadra preferita. */
function intestazione(
  indirizzo: string,
  squadra: SerieATeam = NAPOLI,
  sezioni: Record<string, boolean> | null = null,
  utente: { id: string } | null = { id: "u1" },
) {
  preferenze.squadra = squadra;
  preferenze.sezioni = sezioni;
  preferenze.utente = utente;
  render(
    <MemoryRouter initialEntries={[indirizzo]}>
      <Header />
    </MemoryRouter>,
  );
}

/**
 * La voce della squadra. Sta fuori da `intestazione` perche' da quando ogni
 * voce si puo' nascondere la sua assenza e' un risultato legittimo, non un
 * errore dell'impalcatura.
 *
 * Il menu desktop e quello mobile rendono la stessa voce due volte, e a questa
 * risoluzione jsdom non ne nasconde nessuna: la prima basta.
 */
function voceSquadra() {
  return screen.getAllByRole("link", { name: /NAPOLI|MILAN|JUVENTUS/ })[0];
}

describe("Header, la voce della squadra", () => {
  it("porta alla squadra scelta nelle preferenze", () => {
    intestazione("/");
    const voce = voceSquadra();
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
    intestazione("/squadra/milan");
    const voce = voceSquadra();
    expect(voce).toHaveTextContent("MILAN");
    expect(voce).toHaveAttribute("href", "/squadra/milan");
    expect(voce).toHaveAttribute("aria-current", "page");
  });

  it("vale anche sul dettaglio di una partita", () => {
    intestazione("/squadra/milan/partite/serie-a-2099-milan-vs-napoli");
    const voce = voceSquadra();
    expect(voce).toHaveTextContent("MILAN");
  });

  /**
   * Uno slug che non e' una squadra non deve diventarne una: quella pagina e'
   * un 404, e il menu torna a proporre la preferenza.
   */
  it("uno slug inventato non diventa una squadra", () => {
    intestazione("/squadra/squadra-inventata");
    const voce = voceSquadra();
    expect(voce).toHaveTextContent("NAPOLI");
    expect(voce).toHaveAttribute("href", "/squadra/napoli");
  });
});

describe("Header, la voce Home", () => {
  // La voce rende insieme etichetta lunga e corta ("HOMEHOME"), come quella
  // della squadra: a questa risoluzione jsdom non ne nasconde nessuna.
  const voceHome = () => screen.getAllByRole("link", { name: /^HOME/ })[0];

  /**
   * La Home ha un indirizzo suo perche' la radice ha smesso di essere «la
   * Home»: e' la decisione su dove atterrare. Senza `/home`, far vincere la
   * pagina iniziale avrebbe reso la Home irraggiungibile dal menu'.
   */
  it("porta all'indirizzo proprio della Home", () => {
    intestazione("/home");
    expect(voceHome()).toHaveAttribute("href", "/home");
  });

  it("e' evidenziata sul suo indirizzo", () => {
    intestazione("/home");
    expect(voceHome()).toHaveAttribute("aria-current", "page");
  });

  /**
   * Quando la preferenza e' la Home, la radice la mostra restando su `/`:
   * i due indirizzi sono lo stesso posto, e una voce non evidenziata mentre
   * si sta guardando proprio quella pagina direbbe il falso.
   */
  it("resta evidenziata anche sulla radice", () => {
    intestazione("/");
    expect(voceHome()).toHaveAttribute("aria-current", "page");
  });
});

describe("Header, le voci nascoste", () => {
  const TUTTE = {
    home: true,
    calendario: true,
    streaming: true,
    sinner: true,
    squadra: true,
    f1: true,
    motogp: true,
  };
  const voci = (nome: RegExp) => screen.queryAllByRole("link", { name: nome });

  /**
   * Fino a questa versione si potevano togliere solo le tre sezioni sportive.
   * L'elenco delle preferenze copriva meta' dell'intestazione, e quale meta'
   * era una scelta di allora, non una regola.
   */
  it("si possono togliere anche Home, Calendario, STREAMING e la squadra", () => {
    intestazione("/home", NAPOLI, {
      ...TUTTE,
      home: false,
      calendario: false,
      streaming: false,
      squadra: false,
    });
    expect(voci(/^HOME/)).toHaveLength(0);
    expect(voci(/^CALENDARIO/)).toHaveLength(0);
    expect(voci(/^STREAMING/)).toHaveLength(0);
    expect(voci(/^NAPOLI/)).toHaveLength(0);
    // Quelle lasciate accese restano.
    expect(voci(/^JANNIK SINNER/).length).toBeGreaterThan(0);
    expect(voci(/^FORMULA 1/).length).toBeGreaterThan(0);
  });

  /**
   * La voce della squadra si inseriva con uno `splice` calcolato cercando
   * `/formula1`: con la Formula 1 nascosta finiva in fondo invece che al suo
   * posto. Ora l'ordine e' dichiarato una volta sola nell'elenco.
   */
  it("la squadra resta fra Sinner e Formula 1 anche con altre voci spente", () => {
    // Solo la Formula 1: con anche il MotoGP spento la voce finirebbe in fondo
    // *ed* essere in fondo coinciderebbe con l'essere subito dopo Sinner, e il
    // test passerebbe senza accorgersi di niente.
    intestazione("/home", NAPOLI, { ...TUTTE, f1: false });
    const ordine = screen
      .getAllByRole("link")
      .map((l) => l.textContent ?? "")
      .filter((t) => t.length > 0);
    expect(ordine.findIndex((t) => t.startsWith("NAPOLI"))).toBe(
      ordine.findIndex((t) => t.startsWith("JANNIK SINNER")) + 1,
    );
  });

  /**
   * Il caso limite che non deve rompere niente: nascondere tutto lascia
   * un'intestazione senza voci, non un'applicazione senza uscita — le pagine
   * restano raggiungibili per indirizzo, ed e' esattamente la regola scelta.
   */
  it("nascondendo tutto l'intestazione regge, senza voci", () => {
    intestazione("/home", NAPOLI, {
      home: false,
      calendario: false,
      streaming: false,
      sinner: false,
      squadra: false,
      f1: false,
      motogp: false,
    });
    expect(voci(/^HOME|^CALENDARIO|^STREAMING|^JANNIK|^NAPOLI|^FORMULA|^MOTOGP/)).toHaveLength(0);
  });
});

describe("Header, il varco alle preferenze", () => {
  /**
   * Le preferenze vivono sul dispositivo anche senza account: tema, squadra,
   * voci del menu' e countdown funzionano per tutti, quindi il pulsante che
   * apre il pannello compare sempre.
   */
  it("senza accesso il pulsante Preferenze c'e'", () => {
    intestazione("/home", NAPOLI, null, null);
    expect(screen.getByRole("button", { name: "Preferenze" })).toBeInTheDocument();
  });

  /**
   * E accanto ci deve essere un modo per entrare: chi non e' registrato deve
   * vedere subito che puo' diventarlo, senza dover prima aprire il pannello.
   */
  it("senza accesso offre comunque la porta d'ingresso", () => {
    intestazione("/home", NAPOLI, null, null);
    const accedi = screen.getAllByRole("link", { name: "Accedi" })[0];
    expect(accedi).toHaveAttribute("href", "/accedi");
  });

  it("con l'accesso resta il pulsante, e la porta non serve piu'", () => {
    intestazione("/home", NAPOLI, null, { id: "u1" });
    expect(screen.getByRole("button", { name: "Preferenze" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Accedi" })).not.toBeInTheDocument();
  });
});
