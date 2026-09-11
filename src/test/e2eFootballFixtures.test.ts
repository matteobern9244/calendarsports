import { describe, expect, it } from "vitest";
import {
  FOOTBALL_STANDINGS,
  calendarForTeam,
  teamsInFixture,
} from "../../e2e/support/footballFixtures";

/**
 * Le fixture e2e girano sotto Playwright, che qui non parte. Ma le fixture
 * sono codice, e il codice si testa: questo file gira nel gate normale e
 * verifica che il finto backend si comporti come quello vero.
 *
 * Serve perche' il modo in cui una suite e2e mente e' sempre lo stesso: il
 * mock ignora un parametro, risponde comunque qualcosa di sensato, e i test
 * restano verdi mentre in produzione quel parametro non funziona. Un mock che
 * non filtra per squadra farebbe passare l'intera funzione «cambia squadra»
 * senza che nessuna squadra cambi davvero.
 */

describe("Fixture calendario: filtro per squadra", () => {
  it("senza parametro serve la Juventus, come la funzione vera", () => {
    const esito = calendarForTeam(null);
    expect(esito.ok).toBe(true);
    const partite = esito.ok ? esito.matches : [];
    expect(partite.length).toBeGreaterThan(0);
    for (const m of partite) {
      expect([m.homeTeam, m.awayTeam]).toContain("Juventus");
    }
  });

  it("con `team` serve un'altra squadra, e serve qualcosa", () => {
    const esito = calendarForTeam("napoli");
    expect(esito.ok).toBe(true);
    const partite = esito.ok ? esito.matches : [];
    // Una fixture che per la seconda squadra restituisce zero partite
    // renderebbe il test di cambio squadra indistinguibile da un errore.
    expect(partite.length).toBeGreaterThan(0);
    for (const m of partite) {
      expect([m.homeTeam, m.awayTeam]).toContain("Napoli");
    }
  });

  it("le due squadre non vedono le stesse partite", () => {
    // Se le fixture fossero le stesse per tutti, il mock filtrerebbe senza
    // che nessuno se ne accorga anche smettendo di filtrare.
    const juve = calendarForTeam(null);
    const napoli = calendarForTeam("napoli");
    const idJuve = juve.ok ? juve.matches.map((m) => m.id) : [];
    const idNapoli = napoli.ok ? napoli.matches.map((m) => m.id) : [];
    expect(idJuve).not.toEqual(idNapoli);
    expect(idJuve.some((id) => !idNapoli.includes(id))).toBe(true);
  });

  it("la fixture contiene almeno due squadre, altrimenti non c'e' niente da filtrare", () => {
    expect(teamsInFixture().length).toBeGreaterThanOrEqual(2);
  });

  it("riconosce gli alias, perche' usa la whitelist vera e non una sua copia", () => {
    // «Internazionale» e' un alias che vive solo in `serieATeams.ts`. Se il
    // mock si fosse scritto un elenco di slug per conto suo, qui fallirebbe.
    const esito = calendarForTeam("Internazionale");
    expect(esito.ok).toBe(true);
  });

  it("rifiuta una squadra sconosciuta con un 400, come la funzione vera", () => {
    const esito = calendarForTeam("cremonese");
    expect(esito.ok).toBe(false);
    expect(!esito.ok && esito.status).toBe(400);
  });
});

describe("Fixture classifica", () => {
  it("il link squadra e' assoluto e punta alla fonte vera", () => {
    // Era `/juventus`, un percorso relativo che nell'app apriva una rotta
    // inesistente. Sky pubblica URL assoluti, e una fixture che pubblica
    // altro rende il test cieco proprio sul link che l'utente clicca.
    expect(FOOTBALL_STANDINGS.length).toBeGreaterThan(0);
    for (const riga of FOOTBALL_STANDINGS) {
      expect(riga.teamUrl).toMatch(/^https:\/\/sport\.sky\.it\/calcio\/squadre\/[a-z-]+\/news$/);
    }
  });

  it("la classifica e' la stessa per tutte le squadre", () => {
    // Non prende il parametro `team` di proposito: il payload e' identico per
    // tutte e venti, ed e' il motivo per cui la sua query key non lo porta.
    const slug = FOOTBALL_STANDINGS.map((r) => r.teamUrl);
    expect(new Set(slug).size).toBe(slug.length);
  });
});

describe("Il mock decide come la funzione vera", () => {
  /**
   * Il mock non puo' importare `teamFilter.ts` a runtime: gira dentro
   * Playwright, che ha il suo caricatore. Quindi la politica «assente vale
   * Juventus, sconosciuto vale 400» e' scritta due volte, ed e' esattamente
   * il tipo di duplicazione che diverge in silenzio — il giorno che la
   * funzione vera cambia idea, le e2e continuano a girare sulla vecchia.
   *
   * Questo test e' l'unica cosa che tiene insieme le due copie.
   */
  const casi = [null, "", "juventus", "napoli", "Inter", "Internazionale", "juve", "cremonese"];

  it("accetta e rifiuta gli stessi valori", async () => {
    const { resolveRequestedTeam } =
      await import("../../supabase/functions/sports-football/teamFilter.ts");
    for (const caso of casi) {
      const vera = resolveRequestedTeam(caso);
      const finta = calendarForTeam(caso);
      expect(finta.ok, `disaccordo su ${JSON.stringify(caso)}`).toBe(vera.ok);
      if (vera.ok && finta.ok) {
        expect(finta.team, `squadra diversa per ${JSON.stringify(caso)}`).toBe(vera.team.slug);
      }
    }
  });
});
