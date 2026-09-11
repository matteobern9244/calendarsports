import { describe, expect, it } from "vitest";
import { skyTeamPageUrl, teamMatchPath, teamPath, teamSlugFromPath } from "./teamRoutes";
import { DEFAULT_TEAM, resolveTeam, SERIE_A_TEAMS } from "./serieATeams";

describe("teamRoutes", () => {
  it("la pagina squadra e' /squadra/<slug>", () => {
    expect(teamPath(DEFAULT_TEAM)).toBe("/squadra/juventus");
    expect(teamPath(resolveTeam("napoli"))).toBe("/squadra/napoli");
  });

  /**
   * Il dettaglio partita vive **dentro** la pagina della squadra da cui lo si
   * apre, non in un ramo suo: la stessa Juventus-Napoli ha due indirizzi, e
   * ognuno dice da quale calendario ci si e' arrivati. E' anche cio' che
   * permette al «Torna al calendario» di riportare dove si era.
   */
  it("il dettaglio partita sta sotto la pagina della squadra", () => {
    expect(teamMatchPath(DEFAULT_TEAM, "serie-a-2099-05-17-juventus-vs-napoli")).toBe(
      "/squadra/juventus/partite/serie-a-2099-05-17-juventus-vs-napoli",
    );
    expect(teamMatchPath(resolveTeam("napoli"), "serie-a-2099-05-17-juventus-vs-napoli")).toBe(
      "/squadra/napoli/partite/serie-a-2099-05-17-juventus-vs-napoli",
    );
  });

  /**
   * Gli id partita arrivano dalla fonte, non da noi: `buildMatchId` compone
   * nomi di squadra e competizione, e una fonte che scrivesse «Inter/Milan»
   * produrrebbe un segmento in piu' nella URL, cioe' una rotta diversa da
   * quella che stiamo costruendo. L'id va in un segmento solo, sempre.
   */
  it("l'id partita finisce in un segmento solo, comunque sia scritto", () => {
    expect(teamMatchPath(DEFAULT_TEAM, "coppa italia/2099 juve vs milan")).toBe(
      "/squadra/juventus/partite/coppa%20italia%2F2099%20juve%20vs%20milan",
    );
  });

  /** La pagina rilegge l'id con `decodeURIComponent`: il giro deve chiudersi. */
  it("l'id si rilegge identico dopo la codifica", () => {
    const id = "coppa italia/2099 juve vs milan";
    const segmento = teamMatchPath(DEFAULT_TEAM, id).split("/partite/")[1];
    expect(decodeURIComponent(segmento)).toBe(id);
  });

  /**
   * Una partita senza id resta un link alla pagina squadra con la coda vuota,
   * come prima: e' quello che fa la pagina di dettaglio quando non trova
   * niente, e non deve invece produrre «/partite/undefined».
   */
  it("una partita senza id non scrive «undefined» nella URL", () => {
    expect(teamMatchPath(DEFAULT_TEAM, null)).toBe("/squadra/juventus/partite/");
    expect(teamMatchPath(DEFAULT_TEAM, undefined)).toBe("/squadra/juventus/partite/");
  });

  /**
   * La forma e' quella che Sky pubblica davvero in `teamUrl` dentro la
   * classifica, per tutte e venti le squadre. Quella cablata prima
   * (`/calcio/serie-a/squadre/juventus`) era inventata: il link di scampo
   * mostrato quando la nostra fonte non risponde portava altrove.
   */
  it("il link di scampo verso Sky ha la forma che Sky pubblica davvero", () => {
    expect(skyTeamPageUrl(DEFAULT_TEAM)).toBe("https://sport.sky.it/calcio/squadre/juventus/news");
    expect(skyTeamPageUrl(resolveTeam("inter"))).toBe(
      "https://sport.sky.it/calcio/squadre/inter/news",
    );
  });
});

/**
 * Il verso opposto: dall'indirizzo alla squadra. Serve a chi sta **fuori**
 * dalle rotte e non puo' usare `useParams` — l'intestazione, che vive nel
 * `Layout` e avvolge le rotte invece di starci dentro.
 */
describe("teamSlugFromPath", () => {
  it("legge la squadra dalla pagina e dal dettaglio partita", () => {
    expect(teamSlugFromPath("/squadra/napoli")).toBe("napoli");
    expect(teamSlugFromPath("/squadra/napoli/partite/serie-a-2099-05-24-napoli-vs-lazio")).toBe(
      "napoli",
    );
  });

  it("fuori dalle pagine squadra non c'e' nessuna squadra", () => {
    expect(teamSlugFromPath("/")).toBeNull();
    expect(teamSlugFromPath("/calendario")).toBeNull();
    expect(teamSlugFromPath("/squadra")).toBeNull();
    expect(teamSlugFromPath("/squadra/")).toBeNull();
  });

  /**
   * Il vero motivo per cui questa funzione sta accanto a `teamPath` e non
   * dentro l'intestazione: le due si devono il contrario l'una dell'altra, e
   * se qualcuno cambiasse la forma della URL in una sola delle due nessun
   * typecheck se ne accorgerebbe. Qui diventa rosso.
   */
  it("e' l'inverso di teamPath per tutte e venti le squadre", () => {
    for (const team of SERIE_A_TEAMS) {
      expect(teamSlugFromPath(teamPath(team))).toBe(team.slug);
      expect(teamSlugFromPath(teamMatchPath(team, "una-partita"))).toBe(team.slug);
    }
  });

  /**
   * Restituisce il segmento com'e', senza decidere se sia una squadra: chi
   * legge un indirizzo lo valida con `resolveTeamStrict`, ed e' cosi' che
   * `/squadra/squadra-inventata` resta un 404 invece di diventare la Juventus.
   */
  it("non valida: uno slug inventato torna indietro tale e quale", () => {
    expect(teamSlugFromPath("/squadra/squadra-inventata")).toBe("squadra-inventata");
  });
});
