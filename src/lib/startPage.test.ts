import { describe, expect, it } from "vitest";
import {
  DEFAULT_START_PAGE,
  START_PAGES,
  resolveStartPage,
  startPageLabel,
  startPagePath,
  type StartPage,
} from "./startPage";
import { DEFAULT_TEAM, resolveTeam } from "./serieATeams";

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
    expect(startPagePath("home", DEFAULT_TEAM)).toBe("/home");
    expect(startPagePath("calendario", DEFAULT_TEAM)).toBe("/calendario");
    expect(startPagePath("streaming", DEFAULT_TEAM)).toBe("/streaming");
    expect(startPagePath("sinner", DEFAULT_TEAM)).toBe("/sinner");
    expect(startPagePath("f1", DEFAULT_TEAM)).toBe("/formula1");
    expect(startPagePath("motogp", DEFAULT_TEAM)).toBe("/motogp");
  });

  /**
   * «Squadra di calcio» e' una *sezione*, non un indirizzo fisso: si memorizza
   * `squadra` e l'indirizzo si compone al momento sulla squadra preferita.
   * Se si salvasse la URL, chi cambia squadra resterebbe con la pagina
   * iniziale puntata su quella vecchia.
   */
  it("la squadra segue la preferenza, non un indirizzo memorizzato", () => {
    expect(startPagePath("squadra", DEFAULT_TEAM)).toBe("/squadra/juventus");
    expect(startPagePath("squadra", resolveTeam("napoli"))).toBe("/squadra/napoli");
  });

  /**
   * Il guardiano vero di questo modulo. `/` e' la rotta che reindirizza:
   * restituirla vorrebbe dire mandare la radice su se stessa, cioe' un ciclo
   * che blocca il browser all'avvio.
   */
  it("non restituisce mai la radice", () => {
    for (const option of START_PAGES) {
      const path = startPagePath(option.value, DEFAULT_TEAM);
      expect(path).not.toBe("/");
      expect(path.startsWith("/")).toBe(true);
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

  it("ogni voce elencata e' un valore che la risoluzione riconosce", () => {
    for (const option of START_PAGES) {
      expect(resolveStartPage(option.value)).toBe(option.value);
    }
  });
});

describe("startPageLabel", () => {
  /**
   * Serve al messaggio di conferma, e un `find` scritto nel componente
   * avrebbe avuto bisogno di un ripiego per un caso che non puo' accadere:
   * il tipo garantisce gia' che il valore sia una delle sette voci.
   */
  it("restituisce l'etichetta mostrata all'utente", () => {
    expect(startPageLabel("home")).toBe("Home (predefinita)");
    expect(startPageLabel("squadra")).toBe("Squadra di calcio");
    expect(startPageLabel("f1")).toBe("Formula 1");
  });

  it("ogni voce dell'elenco ha la sua", () => {
    for (const option of START_PAGES) expect(startPageLabel(option.value)).toBe(option.label);
  });
});
