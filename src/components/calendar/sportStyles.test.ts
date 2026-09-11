import { describe, expect, it } from "vitest";
import { resolveTeam } from "@/lib/serieATeams";
import { sportLabel } from "./sportStyles";

const JUVE = resolveTeam("juventus");
const NAPOLI = resolveTeam("napoli");

describe("sportLabel", () => {
  /**
   * L'etichetta del calcio e' il nome della squadra, non una costante. Un
   * filtro che dice «Juventus» sopra un elenco di partite del Napoli non e'
   * una svista di stile: e' l'unica scritta che dichiara di chi sono quelle
   * partite, e direbbe il falso.
   */
  it("il calcio prende il nome della squadra guardata", () => {
    expect(sportLabel("juventus", JUVE)).toBe("Juventus");
    expect(sportLabel("juventus", NAPOLI)).toBe("Napoli");
  });

  it("gli altri sport non dipendono dalla squadra", () => {
    expect(sportLabel("f1", NAPOLI)).toBe("F1");
    expect(sportLabel("motogp", NAPOLI)).toBe("MotoGP");
  });
});
