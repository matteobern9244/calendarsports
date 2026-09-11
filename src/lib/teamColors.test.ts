import { describe, expect, it } from "vitest";
import { SERIE_A_TEAMS } from "@/lib/serieATeams";
import { TEAM_COLORS } from "@/lib/teamColors";
import { teamAccent, teamThemeStyle } from "@/lib/teamTheme";
import { contrastRatio, type Hsl } from "@/lib/color";

const FONDO_CHIARO: Hsl = { h: 220, s: 30, l: 96 };
const FONDO_SCURO: Hsl = { h: 220, s: 30, l: 6 };

/** Rilegge `43 96% 56%` per poterlo misurare. */
function parse(css: string): Hsl | null {
  const m = /^([\d.]+) ([\d.]+)% ([\d.]+)%$/.exec(css);
  return m ? { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) } : null;
}

describe("TEAM_COLORS", () => {
  it("copre esattamente le venti squadre del dataset", () => {
    // Il guardiano: una squadra aggiunta domani rende rosso questo test invece
    // di ripiegare in silenzio su un colore che non e' suo.
    expect(Object.keys(TEAM_COLORS).sort()).toEqual(SERIE_A_TEAMS.map((t) => t.slug).sort());
  });

  it("nessuna squadra condivide il colore con un'altra", () => {
    // Due squadre con lo stesso accento non sono un difetto di accessibilita',
    // ma una livrea che non distingue niente.
    const chiavi = Object.values(TEAM_COLORS).map((c) => `${c.h}/${c.s}/${c.l}`);
    expect(new Set(chiavi).size).toBe(chiavi.length);
  });

  it("la Juventus tiene l'oro che l'app usa gia'", () => {
    // La scelta dell'utente: dentro la sezione squadra la livrea juventina
    // resta juventina. Se questo valore si scostasse da `--gold` in
    // `index.css`, la pagina della Juventus cambierebbe aspetto senza che
    // nessuno l'abbia chiesto.
    expect(teamAccent({ slug: "juventus" } as never)).toEqual({ h: 43, s: 96, l: 56 });
  });
});

describe("contrasto del testo, su tutte e venti", () => {
  // E' la parte che rende questa sezione onesta invece che decorativa: senza,
  // «mettiamo i colori delle squadre» produce una pagina su venti dove una
  // scritta non si legge, e nessuno se ne accorge finche' non capita a lui.
  for (const team of SERIE_A_TEAMS) {
    it(`${team.name}: il testo si legge in chiaro e in scuro`, () => {
      const stile = teamThemeStyle(team) as Record<string, string>;

      for (const [variabile, fondo] of [
        ["--team-accent-on-light", FONDO_CHIARO],
        ["--team-accent-on-dark", FONDO_SCURO],
      ] as const) {
        const valore = stile[variabile];
        // Il ripiego sul token del tema e' un esito **ammesso**: significa che
        // nessuna luminosita' di quella tinta bastava, e la squadra rinuncia al
        // colore invece che alla leggibilita'.
        if (valore.startsWith("var(")) continue;
        const colore = parse(valore);
        expect(colore, `${variabile} non e' un HSL valido: ${valore}`).not.toBeNull();
        expect(
          contrastRatio(colore!, fondo),
          `${team.name} ${variabile} non raggiunge 4.5`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
