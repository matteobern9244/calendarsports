import { describe, expect, it } from "vitest";
import { parseSubscriptionBody } from "./parse";

const valido = {
  endpoint: "https://push.example/abc",
  keys: { p256dh: "p", auth: "a" },
  leadTimes: [60],
  enabled: true,
  userAgent: "Mozilla",
};

describe("parseSubscriptionBody", () => {
  it("senza squadra ne' sport resta com'era: Juventus, tutto acceso", () => {
    // I client gia' in produzione non mandano i campi nuovi e devono
    // continuare a ricevere quello che ricevevano.
    const r = parseSubscriptionBody(valido);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.row.team).toBe("juventus");
    expect(r.row.notify_football).toBe(true);
    expect(r.row.notify_f1).toBe(true);
    expect(r.row.notify_motogp).toBe(true);
    expect(r.row.lead_times).toEqual([60]);
  });

  it("accetta solo squadre della whitelist: il valore finisce in una query", () => {
    const ok = parseSubscriptionBody({ ...valido, team: "milan" });
    expect(ok.ok && ok.row.team).toBe("milan");
    const ko = parseSubscriptionBody({ ...valido, team: "real-madrid" });
    expect(ko.ok).toBe(false);
  });

  it("gli sport si spengono uno per uno", () => {
    const r = parseSubscriptionBody({
      ...valido,
      sports: { football: true, f1: false, motogp: false },
    });
    expect(r.ok && r.row.notify_football).toBe(true);
    expect(r.ok && r.row.notify_f1).toBe(false);
    expect(r.ok && r.row.notify_motogp).toBe(false);
  });

  it("un campo sport che non e' un booleano vale «acceso»", () => {
    const r = parseSubscriptionBody({ ...valido, sports: { f1: "no" } });
    expect(r.ok && r.row.notify_f1).toBe(true);
  });

  it("gli anticipi fuori lista si scartano e il vuoto torna a un'ora", () => {
    const r = parseSubscriptionBody({ ...valido, leadTimes: [7, 1440, 1440] });
    expect(r.ok && r.row.lead_times).toEqual([1440]);
    const vuoto = parseSubscriptionBody({ ...valido, leadTimes: [7] });
    expect(vuoto.ok && vuoto.row.lead_times).toEqual([60]);
  });

  it("senza endpoint o chiavi rifiuta", () => {
    expect(parseSubscriptionBody({ ...valido, endpoint: "" }).ok).toBe(false);
    expect(parseSubscriptionBody({ ...valido, keys: { p256dh: "p" } }).ok).toBe(false);
    expect(parseSubscriptionBody({ ...valido, endpoint: "x".repeat(2001) }).ok).toBe(false);
  });
});
