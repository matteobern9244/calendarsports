import { describe, expect, it } from "vitest";
import {
  legaMatchInvolvesTeam,
  matchInvolvesTeam,
  pickSeasonId,
  resolveRequestedTeam,
} from "./teamFilter.ts";
import { teamBySlug } from "../_shared/serieATeams.ts";

const juventus = teamBySlug("juventus")!;
const inter = teamBySlug("inter")!;
const napoli = teamBySlug("napoli")!;

describe("resolveRequestedTeam", () => {
  it("senza parametro serve la Juventus, come prima che il parametro esistesse", () => {
    // I chiamanti gia' in produzione non passano `team`: devono continuare a
    // vedere esattamente quello che vedevano ieri.
    for (const assente of [null, undefined, ""]) {
      const esito = resolveRequestedTeam(assente);
      expect(esito.ok).toBe(true);
      expect(esito.ok && esito.team.slug).toBe("juventus");
    }
  });

  it("accetta uno slug dell'elenco", () => {
    const esito = resolveRequestedTeam("napoli");
    expect(esito.ok && esito.team.slug).toBe("napoli");
  });

  it("accetta il nome e gli alias osservati sulle fonti", () => {
    expect(resolveRequestedTeam("Inter").ok && resolveRequestedTeam("Inter")).toMatchObject({
      team: { slug: "inter" },
    });
    expect(resolveRequestedTeam("Internazionale")).toMatchObject({ team: { slug: "inter" } });
  });

  it("rifiuta una squadra che non e' in Serie A", () => {
    const esito = resolveRequestedTeam("cremonese");
    expect(esito.ok).toBe(false);
    // Il messaggio deve dire quale valore e' stato rifiutato, altrimenti il
    // 400 arriva al client senza modo di capire cosa correggere.
    expect(!esito.ok && esito.error).toContain("cremonese");
  });

  it("rifiuta una forma abbreviata invece di indovinare", () => {
    // «juve» non e' un alias: in Coppa Italia gioca anche la Juve Stabia.
    expect(resolveRequestedTeam("juve").ok).toBe(false);
  });

  it("non si fa ingannare da un valore lunghissimo o da caratteri strani", () => {
    expect(resolveRequestedTeam("../../etc/passwd").ok).toBe(false);
    expect(resolveRequestedTeam("x".repeat(5000)).ok).toBe(false);
  });
});

describe("matchInvolvesTeam (formato Sky)", () => {
  const partita = (casa: string, trasferta: string) => ({
    home: { name: casa },
    away: { name: trasferta },
  });

  it("riconosce la squadra in casa e in trasferta", () => {
    expect(matchInvolvesTeam(partita("Juventus", "Napoli"), juventus)).toBe(true);
    expect(matchInvolvesTeam(partita("Napoli", "Juventus"), juventus)).toBe(true);
  });

  it("scarta una partita fra altre due squadre", () => {
    expect(matchInvolvesTeam(partita("Inter", "Napoli"), juventus)).toBe(false);
  });

  it("non confonde la seconda squadra con la prima", () => {
    // Questo è il caso che il codice sostituito sbagliava davvero: filtrava
    // con `includes("juventus")`, e «Juventus Next Gen» contiene «juventus».
    // Le partite della seconda squadra finivano nel calendario della prima,
    // con data, avversario e competizione tutti plausibili.
    expect(matchInvolvesTeam(partita("Juventus Next Gen", "Pro Vercelli"), juventus)).toBe(false);
    expect(matchInvolvesTeam(partita("Milan Futuro", "Alcione"), teamBySlug("milan")!)).toBe(false);
  });

  it("non confonde la Juve Stabia con la Juventus", () => {
    // Qui `includes("juventus")` non sbagliava, perché «juve stabia» non
    // contiene «juventus». Sbaglierebbe il giorno in cui qualcuno aggiungesse
    // «Juve» agli alias: il test resta a presidiare quella tentazione.
    expect(matchInvolvesTeam(partita("Juve Stabia", "Cesena"), juventus)).toBe(false);
  });

  it("riconosce l'alias usato dalla fonte", () => {
    expect(matchInvolvesTeam(partita("Internazionale", "Lazio"), inter)).toBe(true);
  });

  it("sopravvive a una partita senza nomi", () => {
    expect(matchInvolvesTeam({}, juventus)).toBe(false);
    expect(matchInvolvesTeam(null, juventus)).toBe(false);
    expect(matchInvolvesTeam({ home: {}, away: {} }, juventus)).toBe(false);
  });
});

describe("legaMatchInvolvesTeam (formato Lega Serie A)", () => {
  it("guarda sia il nome breve sia quello ufficiale", () => {
    // La Lega scrive «Internazionale» in `officialName` e «Inter» in
    // `shortName`: guardarne uno solo perderebbe meta' delle partite quando
    // la fonte cambia idea su quale campo valorizzare.
    expect(
      legaMatchInvolvesTeam({ home: { officialName: "Internazionale" }, away: {} }, inter),
    ).toBe(true);
    expect(legaMatchInvolvesTeam({ home: { shortName: "Inter" }, away: {} }, inter)).toBe(true);
  });

  it("riconosce la trasferta", () => {
    expect(legaMatchInvolvesTeam({ home: {}, away: { shortName: "Napoli" } }, napoli)).toBe(true);
  });

  it("scarta le partite di altre squadre", () => {
    expect(
      legaMatchInvolvesTeam({ home: { shortName: "Lazio" }, away: { shortName: "Roma" } }, napoli),
    ).toBe(false);
  });

  it("non confonde la seconda squadra con la prima", () => {
    expect(
      legaMatchInvolvesTeam({ home: { officialName: "Juventus Next Gen" }, away: {} }, juventus),
    ).toBe(false);
  });

  it("sopravvive a un payload monco", () => {
    expect(legaMatchInvolvesTeam(null, napoli)).toBe(false);
    expect(legaMatchInvolvesTeam({}, napoli)).toBe(false);
  });
});

describe("pickSeasonId", () => {
  // Forma reale della risposta di
  // `/competitions/{id}/seasons`, verificata dal vivo.
  const payload = {
    seasons: [
      {
        seasonId: "serie-a::Football_Season::ed7fdc2a3e7b408b942ec177b7b956b5",
        seasonName: "2026/2027",
      },
      {
        seasonId: "serie-a::Football_Season::5f0e080fc3a44073984b75b3a8e06a8a",
        seasonName: "2025/2026",
      },
      {
        seasonId: "serie-a::Football_Season::1e32f55e98fc408a9d1fc27c0ba43243",
        seasonName: "2024/2025",
      },
    ],
  };

  it("prende la stagione che inizia nell'anno richiesto", () => {
    expect(pickSeasonId(payload, "2026")).toBe(
      "serie-a::Football_Season::ed7fdc2a3e7b408b942ec177b7b956b5",
    );
    expect(pickSeasonId(payload, "2025")).toBe(
      "serie-a::Football_Season::5f0e080fc3a44073984b75b3a8e06a8a",
    );
  });

  it("non serve due stagioni diverse con lo stesso id", () => {
    // Regressione: la mappa statica che questo modulo sostituisce faceva
    // puntare «2026» e «2025» allo stesso id. Nessun errore, nessuno spinner:
    // semplicemente i telecronisti dell'anno scorso presentati come quelli di
    // quest'anno.
    const ids = ["2024", "2025", "2026"].map((s) => pickSeasonId(payload, s));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("dice di non sapere invece di ripiegare sull'anno sbagliato", () => {
    // Meglio nessun telecronista che il telecronista di un'altra stagione.
    expect(pickSeasonId(payload, "2030")).toBeNull();
  });

  it("sopravvive a un payload che non ha la forma attesa", () => {
    expect(pickSeasonId(null, "2026")).toBeNull();
    expect(pickSeasonId({}, "2026")).toBeNull();
    expect(pickSeasonId({ seasons: "no" }, "2026")).toBeNull();
    expect(pickSeasonId({ seasons: [{ seasonName: "2026/2027" }] }, "2026")).toBeNull();
  });

  it("distingue due annate vicine", () => {
    const strano = {
      seasons: [
        { seasonId: "vecchia", seasonName: "2016/2017" },
        { seasonId: "giusta", seasonName: "2026/2027" },
      ],
    };
    expect(pickSeasonId(strano, "2026")).toBe("giusta");
    expect(pickSeasonId(strano, "2016")).toBe("vecchia");
  });

  it("pretende una vera annata, non una voce che comincia per quell'anno", () => {
    // La barra nel confronto è portante, e questo è il caso che la giustifica:
    // l'endpoint è per competizione, e riusare questa funzione con l'id della
    // Supercoppa o del campionato Primavera porta qui nomi di altra forma.
    // Senza barra, la prima voce verrebbe accettata come stagione 2026/27.
    const misto = {
      seasons: [
        { seasonId: "supercoppa", seasonName: "2026 Supercoppa Italiana" },
        { seasonId: "campionato", seasonName: "2026/2027" },
      ],
    };
    expect(pickSeasonId(misto, "2026")).toBe("campionato");
  });
});
