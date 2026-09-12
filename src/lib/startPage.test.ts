import { describe, expect, it } from "vitest";
import {
  DEFAULT_START_PAGE,
  START_PAGES,
  resolveStartPage,
  startPagePath,
  type StartPage,
} from "./startPage";
import { DEFAULT_TEAM, resolveTeam } from "./serieATeams";
import type { Sections } from "@/contexts/useUserPrefs";

const TUTTE_VISIBILI: Sections = { sinner: true, f1: true, motogp: true };
const NESSUNA_VISIBILE: Sections = { sinner: false, f1: false, motogp: false };

/** Tutte le combinazioni di sezioni visibili: otto, e le vogliamo tutte. */
const COMBINAZIONI_SEZIONI: Sections[] = [true, false].flatMap((sinner) =>
  [true, false].flatMap((f1) => [true, false].map((motogp) => ({ sinner, f1, motogp }))),
);

describe("resolveStartPage", () => {
  /**
   * La colonna `profiles.start_page` e' un `TEXT` senza `CHECK`, per la stessa
   * ragione scritta nella migration di `favorite_team`: un vincolo
   * sull'elenco si congela nel database. La difesa e' qui, ed e' il fatto che
   * questa funzione sia **totale**.
   */
  it("qualunque valore non riconosciuto torna alla Home", () => {
    expect(resolveStartPage("juventus")).toBe("home");
    expect(resolveStartPage("")).toBe("home");
    expect(resolveStartPage("   ")).toBe("home");
    expect(resolveStartPage(null)).toBe("home");
    expect(resolveStartPage(undefined)).toBe("home");
    expect(resolveStartPage("/calendario")).toBe("home");
  });

  it("riconosce tutte e sette le pagine", () => {
    const attese: StartPage[] = [
      "home",
      "calendario",
      "streaming",
      "sinner",
      "squadra",
      "f1",
      "motogp",
    ];
    for (const value of attese) expect(resolveStartPage(value)).toBe(value);
  });

  /** Il valore arriva dal database: spazi e maiuscole non lo devono perdere. */
  it("tollera spazi e maiuscole", () => {
    expect(resolveStartPage("  Calendario ")).toBe("calendario");
    expect(resolveStartPage("MotoGP")).toBe("motogp");
  });

  it("il default e' la Home", () => {
    expect(DEFAULT_START_PAGE).toBe("home");
  });
});

describe("startPagePath", () => {
  it("ogni pagina ha il suo indirizzo", () => {
    expect(startPagePath("home", DEFAULT_TEAM, TUTTE_VISIBILI)).toBe("/home");
    expect(startPagePath("calendario", DEFAULT_TEAM, TUTTE_VISIBILI)).toBe("/calendario");
    expect(startPagePath("streaming", DEFAULT_TEAM, TUTTE_VISIBILI)).toBe("/streaming");
    expect(startPagePath("sinner", DEFAULT_TEAM, TUTTE_VISIBILI)).toBe("/sinner");
    expect(startPagePath("f1", DEFAULT_TEAM, TUTTE_VISIBILI)).toBe("/formula1");
    expect(startPagePath("motogp", DEFAULT_TEAM, TUTTE_VISIBILI)).toBe("/motogp");
  });

  /**
   * «Squadra di calcio» e' una *sezione*, non un indirizzo fisso: si memorizza
   * `squadra` e l'indirizzo si compone al momento sulla squadra preferita.
   * Se si salvasse la URL, chi cambia squadra resterebbe con la pagina
   * iniziale puntata su quella vecchia.
   */
  it("la squadra segue la preferenza, non un indirizzo memorizzato", () => {
    expect(startPagePath("squadra", DEFAULT_TEAM, TUTTE_VISIBILI)).toBe("/squadra/juventus");
    expect(startPagePath("squadra", resolveTeam("napoli"), TUTTE_VISIBILI)).toBe("/squadra/napoli");
  });

  /**
   * `SectionRoute` manda alla radice chi apre una sezione nascosta, e la
   * radice manda alla pagina iniziale. Con la pagina iniziale su una sezione
   * spenta i due si rimbalzerebbero il controllo all'infinito: il ripiego su
   * Home e' cio' che rompe il ciclo.
   */
  it("una sezione nascosta ripiega sulla Home", () => {
    expect(startPagePath("sinner", DEFAULT_TEAM, { ...TUTTE_VISIBILI, sinner: false })).toBe(
      "/home",
    );
    expect(startPagePath("f1", DEFAULT_TEAM, { ...TUTTE_VISIBILI, f1: false })).toBe("/home");
    expect(startPagePath("motogp", DEFAULT_TEAM, { ...TUTTE_VISIBILI, motogp: false })).toBe(
      "/home",
    );
  });

  /** Calendario, Streaming e squadra non si possono nascondere: restano. */
  it("le pagine sempre visibili non ripiegano mai", () => {
    expect(startPagePath("calendario", DEFAULT_TEAM, NESSUNA_VISIBILE)).toBe("/calendario");
    expect(startPagePath("streaming", DEFAULT_TEAM, NESSUNA_VISIBILE)).toBe("/streaming");
    expect(startPagePath("squadra", DEFAULT_TEAM, NESSUNA_VISIBILE)).toBe("/squadra/juventus");
  });

  /**
   * Il guardiano vero di questo modulo. `/` e' la rotta che reindirizza:
   * restituirla vorrebbe dire mandare la radice su se stessa, cioe' un ciclo
   * che blocca il browser all'avvio. Nessuna combinazione deve poterci
   * arrivare.
   */
  it("non restituisce mai la radice, per nessuna combinazione", () => {
    for (const option of START_PAGES) {
      for (const sections of COMBINAZIONI_SEZIONI) {
        const path = startPagePath(option.value, DEFAULT_TEAM, sections);
        expect(path).not.toBe("/");
        expect(path.startsWith("/")).toBe(true);
      }
    }
  });
});

describe("START_PAGES", () => {
  it("elenca tutte e sette le voci, nell'ordine mostrato all'utente", () => {
    expect(START_PAGES.map((o) => o.value)).toEqual([
      "home",
      "calendario",
      "streaming",
      "sinner",
      "squadra",
      "f1",
      "motogp",
    ]);
  });

  it("ogni voce ha l'etichetta italiana della tendina", () => {
    expect(START_PAGES.map((o) => o.label)).toEqual([
      "Home (predefinita)",
      "Calendario",
      "STREAMING",
      "Jannik Sinner",
      "Squadra di calcio",
      "Formula 1",
      "MotoGP",
    ]);
  });

  /**
   * La sezione dichiarata accanto alla voce e' cio' che permette al pannello
   * di non offrire una pagina che l'utente ha nascosto, senza ripetere
   * altrove l'elenco di quali voci si possono spegnere.
   */
  it("dichiara quale sezione puo' nascondere la voce", () => {
    const perValore = new Map(START_PAGES.map((o) => [o.value, o.section]));
    expect(perValore.get("sinner")).toBe("sinner");
    expect(perValore.get("f1")).toBe("f1");
    expect(perValore.get("motogp")).toBe("motogp");
    expect(perValore.get("home")).toBeUndefined();
    expect(perValore.get("calendario")).toBeUndefined();
    expect(perValore.get("streaming")).toBeUndefined();
    expect(perValore.get("squadra")).toBeUndefined();
  });

  it("ogni voce elencata e' un valore che la risoluzione riconosce", () => {
    for (const option of START_PAGES) {
      expect(resolveStartPage(option.value)).toBe(option.value);
    }
  });
});
