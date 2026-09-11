import { describe, expect, it } from "vitest";
import { contrastRatio, readableOn, relativeLuminance, toCssHsl, type Hsl } from "./color";

const NERO: Hsl = { h: 0, s: 0, l: 0 };
const BIANCO: Hsl = { h: 0, s: 0, l: 100 };
const FONDO_SCURO: Hsl = { h: 220, s: 30, l: 6 };
const FONDO_CHIARO: Hsl = { h: 220, s: 30, l: 96 };

describe("contrastRatio", () => {
  it("nero su bianco vale 21, il massimo possibile", () => {
    expect(contrastRatio(NERO, BIANCO)).toBeCloseTo(21, 1);
  });

  it("un colore con se stesso vale 1", () => {
    expect(contrastRatio(FONDO_SCURO, FONDO_SCURO)).toBeCloseTo(1, 5);
  });

  it("e' simmetrico: non conta quale dei due e' lo sfondo", () => {
    expect(contrastRatio(NERO, FONDO_CHIARO)).toBeCloseTo(contrastRatio(FONDO_CHIARO, NERO), 10);
  });
});

describe("relativeLuminance", () => {
  it("il giallo e' molto piu' luminoso del blu, a parita' di luminosita' HSL", () => {
    // E' il motivo per cui non basta guardare la `l` di HSL: 50% di giallo e
    // 50% di blu hanno la stessa luminosita' dichiarata e una resa
    // completamente diversa. Senza la correzione di gamma, tutto il calcolo
    // del contrasto sarebbe sbagliato proprio sui colori piu' vivaci.
    const giallo = relativeLuminance({ h: 60, s: 100, l: 50 });
    const blu = relativeLuminance({ h: 240, s: 100, l: 50 });
    expect(giallo).toBeGreaterThan(blu * 5);
  });
});

describe("readableOn", () => {
  it("un colore gia' leggibile resta identico", () => {
    const oro: Hsl = { h: 43, s: 96, l: 56 };
    expect(readableOn(oro, FONDO_SCURO, 4.5)).toEqual(oro);
  });

  it("schiarisce sul fondo scuro e scurisce su quello chiaro", () => {
    const scurissimo: Hsl = { h: 220, s: 60, l: 12 };
    const suScuro = readableOn(scurissimo, FONDO_SCURO, 4.5)!;
    const suChiaro = readableOn({ h: 48, s: 95, l: 90 }, FONDO_CHIARO, 4.5)!;
    expect(suScuro.l).toBeGreaterThan(scurissimo.l);
    expect(suChiaro.l).toBeLessThan(90);
  });

  it("non cambia tinta ne' saturazione: la squadra resta riconoscibile", () => {
    const viola: Hsl = { h: 280, s: 55, l: 20 };
    const esito = readableOn(viola, FONDO_SCURO, 4.5)!;
    expect(esito.h).toBe(viola.h);
    expect(esito.s).toBe(viola.s);
  });

  it("si ferma al primo valore che basta, non al piu' estremo", () => {
    // Il piu' vicino all'originale fra quelli leggibili: schiarire oltre il
    // necessario allontanerebbe dal colore della squadra senza guadagno.
    const esito = readableOn({ h: 0, s: 70, l: 30 }, FONDO_SCURO, 4.5)!;
    const unPassoIndietro = { ...esito, l: esito.l - 1 };
    expect(contrastRatio(esito, FONDO_SCURO)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(unPassoIndietro, FONDO_SCURO)).toBeLessThan(4.5);
  });

  it("quando nessuna luminosita' basta, restituisce null e non un ripiego", () => {
    // Un rapporto irraggiungibile: nemmeno il bianco puro lo soddisfa su un
    // fondo chiaro. Restituire «il meglio disponibile» sarebbe il modo
    // silenzioso di pubblicare un testo illeggibile.
    expect(readableOn({ h: 200, s: 50, l: 50 }, FONDO_CHIARO, 20)).toBeNull();
  });
});

describe("toCssHsl", () => {
  it("produce la forma che `hsl(var(--token))` sa leggere", () => {
    expect(toCssHsl({ h: 43, s: 96, l: 56 })).toBe("43 96% 56%");
  });
});
