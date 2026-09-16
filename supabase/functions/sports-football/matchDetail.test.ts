import { describe, expect, it } from "vitest";
import { buildMatchDetail, parseHero, parseOfficialLineup } from "./matchDetail.ts";
import {
  HERO_GIOCATA_HTML,
  HERO_PREMATCH_HTML,
  LINEUP_GIOCATA_HTML,
  LINEUP_PREMATCH_HTML,
  PROBABILI_PARTITA_HTML,
  SENZA_BLOCCO_HTML,
} from "./matchDetail.fixture.ts";

describe("parseHero", () => {
  it("legge punteggio, stato e contorno della partita", () => {
    const h = parseHero(HERO_GIOCATA_HTML)!;
    expect(h.status).toBe("FullTime");
    expect(h.home).toMatchObject({ name: "Inter", goal: 3 });
    expect(h.away).toMatchObject({ name: "Napoli", goal: 2 });
    expect(h.competition).toBeTruthy();
    expect(h.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("i marcatori arrivano con il nome e il minuto, dal lato giusto", () => {
    const h = parseHero(HERO_GIOCATA_HTML)!;
    expect(h.home.scorers).toEqual([
      { player: "Lautaro Martínez", minute: 56 },
      { player: "Thuram M.", minute: 82 },
      { player: "Lautaro Martínez", minute: 91 },
    ]);
    expect(h.away.scorers.map((s) => s.minute)).toEqual([50, 53]);
  });

  it("un widget senza blocco non fa esplodere niente", () => {
    expect(parseHero(SENZA_BLOCCO_HTML)).toBeNull();
  });
});

describe("parseOfficialLineup", () => {
  it("legge gli undici veri, il modulo e l'arbitro", () => {
    const l = parseOfficialLineup(LINEUP_GIOCATA_HTML)!;
    expect(l.status).toBe("FullTime");
    expect(l.referee).toBe("Sozza S.");
    expect(l.home.formation).toBe("352");
    expect(l.away.formation).toBe("433");
    expect(l.home.startingLineup).toHaveLength(11);
    expect(l.home.manager).toBe("Chivu C.");
    expect(l.away.manager).toBe("Allegri M.");
  });

  /**
   * La panchina di una partita giocata e' fatta di **oggetti giocatore**, non
   * della stringa di cognomi delle probabili. Tenerla come testo perderebbe
   * numero, foto e link proprio dove per la prima volta ci sono.
   */
  it("la panchina ha giocatori interi, non una stringa di cognomi", () => {
    const l = parseOfficialLineup(LINEUP_GIOCATA_HTML)!;
    expect(l.home.substitutes.length).toBeGreaterThan(5);
    expect(l.home.substitutes[0].name).not.toBe("");
    expect(l.home.substitutes[0].playerId).toBeTruthy();
  });

  it("le linee del campo si ricavano dal modulo", () => {
    const l = parseOfficialLineup(LINEUP_GIOCATA_HTML)!;
    // 352: portiere + 3 + 5 + 2.
    expect(l.home.lines.map((r) => r.length)).toEqual([1, 3, 5, 2]);
    expect(l.away.lines.map((r) => r.length)).toEqual([1, 4, 3, 3]);
  });

  /**
   * Una partita non ancora giocata risponde `PreMatch` con zero giocatori.
   * Non e' un guasto, ed e' diverso da «la fonte non risponde»: chi chiama
   * deve poterlo distinguere, altrimenti mostra un campo vuoto come se fosse
   * una formazione.
   */
  it("prima della partita la formazione ufficiale non c'e' ancora", () => {
    const l = parseOfficialLineup(LINEUP_PREMATCH_HTML)!;
    expect(l.status).toBe("PreMatch");
    expect(l.home.startingLineup).toEqual([]);
  });
});

describe("buildMatchDetail", () => {
  const giocata = buildMatchDetail({
    hero: parseHero(HERO_GIOCATA_HTML),
    official: parseOfficialLineup(LINEUP_GIOCATA_HTML),
    predictedHtml: null,
  });

  it("una partita giocata usa la formazione ufficiale", () => {
    expect(giocata.predicted).toBe(false);
    expect(giocata.home!.formation).toBe("352");
    expect(giocata.score).toEqual({ home: 3, away: 2 });
    expect(giocata.home!.startingLineup[0].fallbackPhotoUrl).toContain(
      `/club/${giocata.home!.startingLineup[0].playerId}.png`,
    );
    expect(giocata.home!.substitutes[0]).toMatchObject({
      name: expect.any(String),
      photoUrl: expect.any(String),
    });
  });

  /**
   * La cronologia e' l'unica cosa che non esiste gia' fatta nella fonte: gol,
   * cartellini e sostituzioni arrivano in tre elenchi separati, per lato, e
   * con gli **id** dei giocatori invece dei nomi.
   */
  it("fonde gol, cartellini e cambi in una sola cronologia ordinata", () => {
    const minuti = giocata.events.map((e) => e.minute);
    expect(minuti).toEqual([...minuti].sort((a, b) => a - b));
    expect(giocata.events.some((e) => e.type === "GOAL")).toBe(true);
    expect(giocata.events.some((e) => e.type === "YELLOW")).toBe(true);
    expect(giocata.events.some((e) => e.type === "SUB")).toBe(true);
  });

  it("gli id dei giocatori diventano nomi, e ogni evento sa da che parte sta", () => {
    const gol = giocata.events.filter((e) => e.type === "GOAL");
    expect(gol).toHaveLength(5);
    for (const e of gol) {
      expect(e.player, `evento al ${e.minute}' senza nome`).not.toBe("");
      expect(["home", "away"]).toContain(e.side);
    }
    const primo = gol[0];
    expect(primo.minute).toBe(50);
    expect(primo.side).toBe("away");
  });

  it("una sostituzione porta chi entra e chi esce", () => {
    const cambio = giocata.events.find((e) => e.type === "SUB")!;
    expect(cambio.player).not.toBe("");
    expect(cambio.playerOut).toBeTruthy();
    expect(cambio.playerOut).not.toBe(cambio.player);
  });

  /**
   * Prima della partita si mostrano le **probabili**, e la differenza va
   * dichiarata: presentarle come formazione ufficiale sarebbe una previsione
   * spacciata per un fatto.
   */
  it("prima della partita ripiega sulle probabili, e lo dice", () => {
    const futura = buildMatchDetail({
      hero: null,
      official: parseOfficialLineup(LINEUP_PREMATCH_HTML),
      predictedHtml: PROBABILI_PARTITA_HTML,
    });
    expect(futura.predicted).toBe(true);
    expect(futura.home!.teamName).toBe("Sassuolo");
    expect(futura.away!.formation).toBe("4231");
    expect(futura.away!.startingLineup.length).toBeGreaterThan(0);
    expect(futura.events).toEqual([]);
    expect(futura.score).toBeNull();
  });

  /**
   * Il difetto che le fixture non avevano visto, trovato provando dodici
   * partite vere: prima del fischio d'inizio `lmp-hero` pubblica `goal: 0`
   * per entrambe, e leggerlo come risultato faceva scrivere «Risultato finale
   * 0-0» su una partita non ancora giocata.
   *
   * Quello zero non e' un punteggio: e' l'assenza di un punteggio, e la fonte
   * non ha un campo per distinguerli. Lo distingue lo **stato**.
   */
  it("prima del fischio d'inizio lo 0-0 dell'hero non e' un risultato", () => {
    const futura = buildMatchDetail({
      hero: parseHero(HERO_PREMATCH_HTML),
      official: parseOfficialLineup(LINEUP_PREMATCH_HTML),
      predictedHtml: PROBABILI_PARTITA_HTML,
    });
    expect(futura.status).toBe("PreMatch");
    expect(futura.score).toBeNull();
    // Il resto del contorno arriva lo stesso: e' solo il punteggio a non
    // esistere ancora.
    expect(futura.date).toBeTruthy();
    expect(futura.predicted).toBe(true);
  });

  it("senza niente da nessuna parte resta vuoto, non inventa", () => {
    const nulla = buildMatchDetail({ hero: null, official: null, predictedHtml: null });
    expect(nulla).toMatchObject({ home: null, away: null, events: [], score: null });
  });
});
