import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEAM,
  DEFAULT_TEAM_SLUG,
  SERIE_A_TEAMS,
  matchesTeam,
  normalizeTeamName,
  resolveTeam,
  resolveTeamStrict,
  teamBySlug,
} from "./serieATeams";

/**
 * L'identita' di una squadra a partire dai nomi come li scrivono le fonti.
 *
 * I casi qui sotto non sono inventati: vengono da una ricognizione fatta sui
 * widget Sky (classifica e calendario di Serie A, Champions League e Coppa
 * Italia, stagione 2026) e sull'API Lega Serie A. Le tre competizioni usano
 * gli stessi nomi brevi; la Lega e' l'unica che scrive «Internazionale».
 */

describe("SERIE_A_TEAMS", () => {
  it("contiene le venti squadre della stagione in corso", () => {
    expect(SERIE_A_TEAMS).toHaveLength(20);
  });

  it("contiene la squadra usata come default", () => {
    // Invariante che rende sicuro il `!` con cui e' costruito DEFAULT_TEAM.
    expect(SERIE_A_TEAMS.some((t) => t.slug === DEFAULT_TEAM_SLUG)).toBe(true);
    expect(DEFAULT_TEAM.slug).toBe(DEFAULT_TEAM_SLUG);
  });

  it("non ha slug duplicati", () => {
    const slugs = SERIE_A_TEAMS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("usa lo slug che Sky Sport espone in teamUrl, cioe' il nome in minuscolo", () => {
    // Verificato: https://sport.sky.it/calcio/squadre/<slug>/news per tutte e venti.
    for (const team of SERIE_A_TEAMS) {
      expect(team.slug).toBe(team.name.toLowerCase());
    }
  });

  it("include le tre promosse e non le tre retrocesse", () => {
    const slugs = SERIE_A_TEAMS.map((t) => t.slug);
    expect(slugs).toEqual(expect.arrayContaining(["frosinone", "monza", "venezia"]));
    expect(slugs).not.toEqual(expect.arrayContaining(["cremonese", "verona", "pisa"]));
  });
});

describe("normalizeTeamName", () => {
  it("azzera maiuscole, accenti e punteggiatura", () => {
    expect(normalizeTeamName("JUVENTUS")).toBe("juventus");
    expect(normalizeTeamName("  Hellas   Verona ")).toBe("hellas verona");
    expect(normalizeTeamName("Atalanta B.C.")).toBe("atalanta b c");
  });

  it("regge valori assenti", () => {
    expect(normalizeTeamName(null)).toBe("");
    expect(normalizeTeamName(undefined)).toBe("");
  });
});

describe("matchesTeam", () => {
  const juventus = teamBySlug("juventus")!;
  const inter = teamBySlug("inter")!;

  it("riconosce il nome canonico", () => {
    expect(matchesTeam("Juventus", juventus)).toBe(true);
    expect(matchesTeam("juventus", juventus)).toBe(true);
  });

  it("riconosce gli alias osservati sull'API Lega Serie A", () => {
    expect(matchesTeam("Internazionale", inter)).toBe(true);
    expect(matchesTeam("Inter", inter)).toBe(true);
  });

  it("NON confonde la Juve Stabia con la Juventus", () => {
    // Il caso che rende inaccettabile il confronto per sottostringa: la Juve
    // Stabia gioca davvero in Coppa Italia insieme alla Juventus.
    expect(matchesTeam("Juve Stabia", juventus)).toBe(false);
  });

  it("non riconosce una squadra diversa", () => {
    expect(matchesTeam("Milan", juventus)).toBe(false);
    expect(matchesTeam("", juventus)).toBe(false);
    expect(matchesTeam(null, juventus)).toBe(false);
  });
});

describe("resolveTeamStrict", () => {
  it("accetta slug e nome", () => {
    expect(resolveTeamStrict("napoli")?.slug).toBe("napoli");
    expect(resolveTeamStrict("Napoli")?.slug).toBe("napoli");
    expect(resolveTeamStrict("Internazionale")?.slug).toBe("inter");
  });

  it("rifiuta quello che non conosce", () => {
    expect(resolveTeamStrict("napoi")).toBeNull();
    expect(resolveTeamStrict("")).toBeNull();
    expect(resolveTeamStrict(undefined)).toBeNull();
  });
});

describe("resolveTeam", () => {
  it("e' totale: qualunque valore produce una squadra", () => {
    // E' la proprieta' che rende innocuo un `favorite_team` legacy scritto a
    // mano nella vecchia textbox, senza bisogno che la migration sia passata.
    expect(resolveTeam("Juventus").slug).toBe("juventus");
    expect(resolveTeam("la juve").slug).toBe(DEFAULT_TEAM_SLUG);
    expect(resolveTeam("").slug).toBe(DEFAULT_TEAM_SLUG);
    expect(resolveTeam(null).slug).toBe(DEFAULT_TEAM_SLUG);
    expect(resolveTeam(undefined).slug).toBe(DEFAULT_TEAM_SLUG);
  });

  it("risolve una squadra diversa da quella di default", () => {
    expect(resolveTeam("Napoli").name).toBe("Napoli");
  });
});
