import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  HIGHLIGHT_PLAYLISTS,
  highlightSportPerSquadra,
  playlistUrl,
  type HighlightSport,
} from "./highlightPlaylists";

const ROOT = resolve(import.meta.dirname, "../..");
const EDGE = "supabase/functions/highlights-youtube/index.ts";

describe("Catalogo delle playlist degli highlights", () => {
  it("la Juventus punta alla playlist della stagione in corso", () => {
    // Verificato sul feed RSS il 12 settembre 2026: questa e' la
    // «JUVENTUS FIRST TEAM HIGHLIGHTS | 2026/27 SEASON». La precedente,
    // PLamQuNkRTV0eQ-UiYDCuz_WUHOlri1BY3, e' la 2025/26 e da mesi mostrava
    // partite della stagione scorsa sotto il titolo «Highlights».
    expect(HIGHLIGHT_PLAYLISTS.juventus.id).toBe("PLVuEWoNX08GA");
  });

  it("il Milan ha la sua, non quella di qualcun altro", () => {
    expect(HIGHLIGHT_PLAYLISTS.milan.id).toBe("PLW7Xs51ob1LI");
  });

  it("nessuno sport divide la playlist con un altro", () => {
    const identificativi = Object.values(HIGHLIGHT_PLAYLISTS).map((p) => p.id);
    expect(new Set(identificativi).size).toBe(identificativi.length);
  });

  it("l'indirizzo si costruisce dall'identificativo, senza tracciamento", () => {
    // I link forniti portavano un `si=...`, che identifica chi ha condiviso.
    expect(playlistUrl("milan")).toBe("https://www.youtube.com/playlist?list=PLW7Xs51ob1LI");
    expect(playlistUrl("milan")).not.toContain("si=");
  });

  it("ogni sport ha un'etichetta da mostrare", () => {
    for (const [chiave, voce] of Object.entries(HIGHLIGHT_PLAYLISTS)) {
      expect(voce.label, `manca l'etichetta di ${chiave}`).toBeTruthy();
    }
  });
});

describe("Quali squadre hanno gli highlights", () => {
  it("Juventus e Milan si', e ciascuna la propria", () => {
    expect(highlightSportPerSquadra("juventus")).toBe("juventus");
    expect(highlightSportPerSquadra("milan")).toBe("milan");
  });

  it("le altre diciotto no, invece di vedere i video di un'altra squadra", () => {
    for (const slug of ["napoli", "inter", "roma", "venezia"]) {
      expect(highlightSportPerSquadra(slug), `${slug} non deve avere highlights`).toBeNull();
    }
  });

  it("uno slug sconosciuto non fa eccezione", () => {
    expect(highlightSportPerSquadra("")).toBeNull();
    expect(highlightSportPerSquadra("constructor")).toBeNull();
  });
});

/**
 * Guardiano sulla seconda copia delle playlist.
 *
 * Le edge function girano su Deno e vengono caricate con il solo contenuto di
 * `supabase/functions/`: un import che risalga dentro `src/` supera il
 * typecheck locale e si rompe al deploy. Da qui le due copie, come gia'
 * accade per l'elenco squadre (`serieATeamsMirror.test.ts`).
 *
 * Due copie che divergono non danno un errore: danno una scheda «Highlights»
 * che si apre su un 400, oppure — peggio — video della squadra sbagliata
 * sotto il nome giusto. Qui il confronto e' sul contenuto e non carattere per
 * carattere, perche' l'edge function tiene i soli identificativi mentre il
 * client tiene anche etichette e corrispondenza con le squadre.
 */
describe("Specchio Deno delle playlist", () => {
  const sorgenteEdge = readFileSync(join(ROOT, EDGE), "utf8");

  const mappaEdge = (): Record<string, string> => {
    const blocco = sorgenteEdge.match(/PLAYLIST_IDS[^=]*=\s*\{([\s\S]*?)\}/);
    if (!blocco) throw new Error(`PLAYLIST_IDS non trovata in ${EDGE}`);
    const voci: Record<string, string> = {};
    for (const [, chiave, id] of blocco[1].matchAll(/(\w+)\s*:\s*"([^"]+)"/g)) {
      voci[chiave] = id;
    }
    return voci;
  };

  it("l'edge function conosce esattamente le stesse playlist del client", () => {
    const atteso = Object.fromEntries(
      (Object.keys(HIGHLIGHT_PLAYLISTS) as HighlightSport[]).map((s) => [
        s,
        HIGHLIGHT_PLAYLISTS[s].id,
      ]),
    );
    expect(
      mappaEdge(),
      `allinea PLAYLIST_IDS in ${EDGE} con src/lib/highlightPlaylists.ts`,
    ).toEqual(atteso);
  });

  it("il messaggio d'errore dell'edge function elenca gli sport che accetta", () => {
    // Un messaggio che dice «juventus | f1 | motogp» mentre la mappa ne ha
    // quattro manda chi sbaglia parametro a cercare il difetto altrove.
    for (const sport of Object.keys(HIGHLIGHT_PLAYLISTS)) {
      expect(sorgenteEdge, `il messaggio d'errore non cita \`${sport}\``).toMatch(
        new RegExp(`richiesto:[^"]*${sport}`),
      );
    }
  });
});
