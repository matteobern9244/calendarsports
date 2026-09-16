import { describe, expect, it } from "vitest";
import { mergeFallbackPhotos, parseSquad, type SquadPlayer } from "./teamSquad.ts";
import { ROSA_HTML } from "./teamSquad.fixture.ts";

/**
 * Il parser della rosa, provato contro un ritaglio vero della pagina Sky.
 *
 * Ogni caso qui sotto nasce da un fatto osservato durante la ricognizione,
 * non da un'ipotesi su come «dovrebbe» essere fatta la pagina.
 */
const nome = (p: SquadPlayer) => p.name;

describe("parseSquad", () => {
  const rosa = parseSquad(ROSA_HTML);

  it("legge i giocatori, e l'allenatore non e' uno di loro", () => {
    expect(rosa.players).toHaveLength(3);
    expect(rosa.players.map(nome)).not.toContain("Spalletti L.");
  });

  it("assegna a ogni giocatore il ruolo della sua riga-intestazione", () => {
    // Il ruolo non e' una colonna: e' una riga che precede il gruppo. Un
    // parser senza stato non avrebbe nessun ruolo da leggere.
    expect(rosa.players.filter((p) => p.role === "Portieri").map(nome)).toEqual([
      "Vicario G.",
      "Grabara K.",
    ]);
    expect(rosa.players.filter((p) => p.role === "Difensori")).toHaveLength(1);
  });

  it("estrae i dati del giocatore nelle unita' giuste", () => {
    const vicario = rosa.players[0];
    expect(vicario).toMatchObject({
      name: "Vicario G.",
      shirtNumber: 25,
      countryCode: "ita",
      ageYears: 29,
      heightCm: 194,
      weightKg: 83,
      playerId: "184254",
      photoUrl:
        "https://static.sky.it/editorialstaticimages/bc29c89d1a3e47e0afbb38aed61e35b7/sport/headshots/calcio/club/184254.png?im=Resize,width=270",
    });
    expect(vicario.profileUrl).toBe("https://sport.sky.it/calcio/atleti/guglielmo-vicario/184254");
  });

  it("abbina una foto alternativa solo allo stesso giocatore della stessa squadra", () => {
    const arricchita = mergeFallbackPhotos(rosa, "Juventus", [
      { name: "Guglielmo Vicario", team: "Juventus", photoUrl: "https://foto.test/vicario.png" },
      { name: "Daniele Rugani", team: "Juventus Youth", photoUrl: "https://foto.test/youth.png" },
    ]);

    expect(arricchita.players[0].fallbackPhotoUrl).toBe("https://foto.test/vicario.png");
    expect(arricchita.players[2].fallbackPhotoUrl).toBeNull();
  });

  it("trova l'allenatore, che non ha un link ma uno span", () => {
    // La trappola piu' costosa: cercare solo `<a>` lo perde, e la rosa esce
    // completa lo stesso. Il guasto non ha nessun sintomo.
    expect(rosa.manager?.name).toBe("Spalletti L.");
    expect(rosa.manager?.ageYears).toBe(67);
  });

  it("l'allenatore non ha numero ne' nazionalita', e non li inventa", () => {
    // La sua riga ha «-» al posto del numero e la bandiera segnaposto.
    expect(rosa.manager?.shirtNumber ?? null).toBeNull();
    expect(rosa.manager?.countryCode ?? null).toBeNull();
  });

  it("su una pagina senza tabella non esplode e non finge una rosa", () => {
    const vuota = parseSquad("<html><body><p>Pagina di errore</p></body></html>");
    expect(vuota.players).toEqual([]);
    expect(vuota.manager).toBeNull();
  });

  it("una riga senza nome viene scartata, le altre restano", () => {
    // Una fonte che cambia forma deve costare un giocatore, non la rosa.
    const rotto = ROSA_HTML.replace(
      /<td class="ftbl__team-row__name">[\s\S]*?<\/td>/,
      '<td class="ftbl__team-row__name"></td>',
    );
    expect(parseSquad(rotto).players).toHaveLength(2);
  });
});
