import { describe, expect, it } from "vitest";
import { parseLineups } from "./lineups.ts";
import { PROBABILI_HTML } from "./lineups.fixture.ts";

/**
 * Le probabili formazioni, provate contro il JSON vero della pagina Sky.
 *
 * Il tema di tutti questi casi e' uno solo: **nella stessa risposta convivono
 * due qualita' di dato**, e il parser deve tenerle distinte invece di
 * appiattirle. Gli undici sono oggetti completi; panchina, indisponibili e
 * squalificati sono una stringa di cognomi.
 */
describe("parseLineups", () => {
  const p = parseLineups(PROBABILI_HTML);

  it("legge la partita e i due lati", () => {
    expect(p.home?.teamName).toBe("Sassuolo");
    expect(p.away?.teamName).toBe("Juventus");
    expect(p.date).toBe("2026-09-13T18:45:00.000Z");
  });

  it("lo slug della fonte e' lo stesso del nostro dataset", () => {
    // E' cio' che permette di unire questa fonte alle altre senza una
    // tabella di conversione fra nomi.
    expect(p.away?.teamSlug).toBe("juventus");
    expect(p.home?.teamSlug).toBe("sassuolo");
  });

  it("gli undici sono undici, con numero e id", () => {
    const xi = p.away!.startingLineup;
    expect(xi).toHaveLength(11);
    expect(xi[0]).toMatchObject({ name: "Vicario G.", shirtNumber: 25, playerId: "184254" });
    expect(xi.every((g) => g.photoUrl !== null)).toBe(true);
  });

  it("le linee del campo escono dal modulo, non da un'ipotesi sui ruoli", () => {
    // `4231` significa 4 difensori, 2 mediani, 3 trequartisti, 1 punta,
    // piu' il portiere: cinque linee, undici giocatori.
    expect(p.away?.formation).toBe("4231");
    expect(p.away?.lines.map((l) => l.length)).toEqual([1, 4, 2, 3, 1]);
    expect(p.away?.lines.flat()).toHaveLength(11);
    expect(p.away?.lines[0][0].name).toBe("Vicario G.");
  });

  it("la panchina e' un elenco di cognomi, perche' la fonte non da' altro", () => {
    // Un solo elemento con `id: null` e i cognomi in una stringa: spezzarla
    // e' l'unico modo, e va dichiarato invece che nascosto.
    expect(p.away?.substitutes).toContain("Grabara");
    expect(p.away?.substitutes).toContain("McKennie");
    expect(p.away?.substitutes.length).toBeGreaterThan(5);
  });

  it("una categoria vuota e' un elenco vuoto, non un nome vuoto", () => {
    // La fonte scrive `fullName: ""`. Senza normalizzarlo, la pagina
    // mostrerebbe uno squalificato senza nome.
    expect(p.away?.disqualifieds).toEqual([]);
    expect(p.away?.unavailables).toContain("Yildiz");
  });

  it("l'allenatore ha il nome intero, meglio della pagina rosa", () => {
    expect(p.away?.manager).toBe("Luciano Spalletti");
  });

  it("un modulo che non torna con gli undici non produce linee sbagliate", () => {
    // Il caso per cui il controllo esiste, e che il fixture da solo non
    // esercita: se le cifre del modulo piu' il portiere non fanno undici, le
    // linee restano vuote e l'interfaccia ripiega sull'elenco. Disegnare un
    // campo con le linee sbagliate mostrerebbe una formazione **diversa** da
    // quella che la fonte ha pubblicato, e sembrerebbe altrettanto ufficiale.
    const incoerente = PROBABILI_HTML.replace('"formation":"4231"', '"formation":"44"');
    const p2 = parseLineups(incoerente);
    expect(p2.away?.formation).toBe("44");
    expect(p2.away?.lines).toEqual([]);
    // Gli undici restano leggibili: si perde il campo, non i giocatori.
    expect(p2.away?.startingLineup).toHaveLength(11);
  });

  it("con meno di undici titolari non si disegna il campo", () => {
    const monco = PROBABILI_HTML.replace(
      /\{"jerseyNum":\d+,"photoUrl":"[^"]*","playerPageLink":"[^"]*","role":"[^"]*","fallbackPhotoUrl":"[^"]*","surname":"[^"]*","formationPlace":"11"[^}]*\},?/,
      "",
    );
    const side = parseLineups(monco).away;
    if (side && side.startingLineup.length < 11) expect(side.lines).toEqual([]);
  });

  it("una pagina senza JSON non esplode e non finge una formazione", () => {
    const vuota = parseLineups("<html><body><p>Nessuna partita</p></body></html>");
    expect(vuota.home).toBeNull();
    expect(vuota.away).toBeNull();
    expect(vuota.date).toBeNull();
  });

  it("un JSON illeggibile vale come assente", () => {
    const rotto = '<script type="application/json" data-props="true">{non json</script>';
    expect(parseLineups(rotto).away).toBeNull();
  });
});
