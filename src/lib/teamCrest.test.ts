import { describe, expect, it } from "vitest";
import type { FootballMatch, FootballStandingRow } from "@/lib/api/schemas";
import { teamCrest } from "./teamCrest";
import { resolveTeam } from "@/lib/serieATeams";

/**
 * Lo stemma della squadra seguita non sta nel dataset statico, per scelta
 * dichiarata: arriva a runtime dalle stesse fonti che vestono le avversarie.
 * Sbagliare qui non produce un errore, produce lo stemma di un'altra squadra
 * accanto al nome di questa — la stessa classe di difetto che rendeva la card
 * della prossima partita illeggibile.
 */

const JUVE = resolveTeam("juventus");

const riga = (over: Partial<FootballStandingRow> = {}): FootballStandingRow => ({
  team: "Juventus",
  logoUrl: "classifica.png",
  ...over,
});

const match = (over: Partial<FootballMatch> = {}): FootballMatch => ({
  id: "serie-a-2099-09-13-juventus-vs-milan",
  homeTeam: "Juventus",
  awayTeam: "Milan",
  competition: "Serie A",
  homeLogo: "casa.png",
  awayLogo: "ospite.png",
  ...over,
});

describe("teamCrest", () => {
  it("prende lo stemma dalla riga di classifica della squadra", () => {
    const classifica = [riga({ team: "Milan", logoUrl: "milan.png" }), riga()];
    expect(teamCrest(JUVE, { standings: classifica })).toBe("classifica.png");
  });

  /** La classifica vince: c'e' anche nelle settimane senza partite in calendario. */
  it("la classifica ha la precedenza sulla partita", () => {
    expect(teamCrest(JUVE, { standings: [riga()], match: match() })).toBe("classifica.png");
  });

  it("senza classifica ripiega sulla partita, dalla parte giusta", () => {
    expect(teamCrest(JUVE, { standings: null, match: match() })).toBe("casa.png");

    const fuori = match({ homeTeam: "Lazio", awayTeam: "Juventus" });
    expect(teamCrest(JUVE, { match: fuori })).toBe("ospite.png");
  });

  it("una classifica senza quella squadra non impedisce il ripiego", () => {
    const altrui = [riga({ team: "Milan", logoUrl: "milan.png" })];
    expect(teamCrest(JUVE, { standings: altrui, match: match() })).toBe("casa.png");
  });

  it("una riga di classifica senza logo non blocca il ripiego", () => {
    const muta = [riga({ logoUrl: null })];
    expect(teamCrest(JUVE, { standings: muta, match: match() })).toBe("casa.png");
  });

  /**
   * `matchSide` deduce il lato per esclusione, quindi su una partita che non
   * riguarda la squadra direbbe «ospite» e presterebbe uno stemma altrui. Qui
   * il controllo e' esplicito su entrambi i lati.
   */
  it("una partita che non riguarda la squadra non presta il suo stemma", () => {
    const estranea = match({ homeTeam: "Inter", awayTeam: "Milan" });
    expect(teamCrest(JUVE, { match: estranea })).toBeNull();
  });

  /** Uguaglianza esatta, mai sottostringa: in coppa gioca la Juventus Next Gen. */
  it("una squadra che si chiama quasi come quella scelta non e' quella scelta", () => {
    const quasi = [riga({ team: "Juventus Next Gen", logoUrl: "ngen.png" })];
    expect(teamCrest(JUVE, { standings: quasi })).toBeNull();
  });

  it("senza nessuna fonte non inventa niente", () => {
    expect(teamCrest(JUVE, {})).toBeNull();
    expect(teamCrest(JUVE, { standings: [], match: null })).toBeNull();

    const senzaLoghi = match({ homeLogo: null, awayLogo: null });
    expect(teamCrest(JUVE, { match: senzaLoghi })).toBeNull();
  });
});
