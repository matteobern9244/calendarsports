import { describe, expect, it } from "vitest";
import { footballTeamsToLoad, wantsEvent, type AudienceSubscription } from "./audience";

const sub = (over: Partial<AudienceSubscription> = {}): AudienceSubscription => ({
  team: "juventus",
  notify_football: true,
  notify_f1: true,
  notify_motogp: true,
  ...over,
});

describe("wantsEvent", () => {
  it("una partita arriva solo a chi segue quella squadra", () => {
    const partita = { sport: "football" as const, team: "milan" };
    expect(wantsEvent(sub({ team: "milan" }), partita)).toBe(true);
    // Fino al 12 settembre 2026 il dispatcher conosceva solo la Juventus:
    // chi aveva scelto il Milan riceveva le partite della Juventus.
    expect(wantsEvent(sub({ team: "juventus" }), partita)).toBe(false);
  });

  it("chi ha spento il calcio non riceve partite nemmeno della sua squadra", () => {
    const partita = { sport: "football" as const, team: "milan" };
    expect(wantsEvent(sub({ team: "milan", notify_football: false }), partita)).toBe(false);
  });

  it("F1 e MotoGP seguono il proprio interruttore, non la squadra", () => {
    expect(wantsEvent(sub({ notify_f1: false }), { sport: "f1" })).toBe(false);
    expect(wantsEvent(sub({ notify_f1: false }), { sport: "motogp" })).toBe(true);
    expect(wantsEvent(sub({ notify_motogp: false }), { sport: "motogp" })).toBe(false);
    expect(wantsEvent(sub({ notify_motogp: false }), { sport: "f1" })).toBe(true);
  });
});

describe("footballTeamsToLoad", () => {
  it("un calendario per squadra seguita, senza doppioni e senza chi ha spento il calcio", () => {
    const squadre = footballTeamsToLoad([
      sub({ team: "milan" }),
      sub({ team: "juventus" }),
      sub({ team: "milan" }),
      sub({ team: "napoli", notify_football: false }),
    ]);
    expect(squadre).toEqual(["juventus", "milan"]);
  });

  it("senza iscritti al calcio non scarica nessun calendario", () => {
    expect(footballTeamsToLoad([])).toEqual([]);
    expect(footballTeamsToLoad([sub({ notify_football: false })])).toEqual([]);
  });
});
