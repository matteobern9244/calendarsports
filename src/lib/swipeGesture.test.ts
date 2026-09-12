import { describe, expect, it } from "vitest";
import {
  SWIPE_MAX_DERIVA,
  SWIPE_MAX_DURATA,
  SWIPE_MIN_DISTANZA,
  SWIPE_ZONA_INIZIALE,
  apreLePreferenze,
  dentroUnoScorrimentoOrizzontale,
} from "./swipeGesture";

const LARGHEZZA = 400;

/** Un gesto valido, da cui i test cambiano una cosa per volta. */
function gesto(modifiche: Partial<Parameters<typeof apreLePreferenze>[0]> = {}) {
  return apreLePreferenze({
    startX: 20,
    startY: 300,
    endX: 160,
    endY: 306,
    larghezza: LARGHEZZA,
    durataMs: 260,
    ...modifiche,
  });
}

describe("apreLePreferenze", () => {
  it("uno swipe netto da sinistra verso destra apre il pannello", () => {
    expect(gesto()).toBe(true);
  });

  /**
   * Non si pretende che parta dal bordo esatto. Su Android il sistema
   * intercetta i primi millimetri dello schermo per il proprio gesto
   * «indietro», quindi un gesto ancorato al bordo non arriverebbe mai fino
   * qui: si accetta tutta la fascia sinistra.
   */
  it("accetta anche un inizio lontano dal bordo, purche' nella fascia sinistra", () => {
    expect(gesto({ startX: LARGHEZZA * SWIPE_ZONA_INIZIALE - 1, endX: 300 })).toBe(true);
  });

  it("non apre se il gesto comincia fuori dalla fascia sinistra", () => {
    expect(gesto({ startX: LARGHEZZA * SWIPE_ZONA_INIZIALE + 1, endX: 380 })).toBe(false);
  });

  it("non apre se il gesto va verso sinistra", () => {
    expect(gesto({ startX: 160, endX: 20 })).toBe(false);
  });

  it("non apre se il gesto e' troppo corto", () => {
    expect(gesto({ endX: 20 + SWIPE_MIN_DISTANZA - 1 })).toBe(false);
  });

  it("apre esattamente alla distanza minima", () => {
    expect(gesto({ endX: 20 + SWIPE_MIN_DISTANZA })).toBe(true);
  });

  /**
   * Il caso che rovinerebbe lo scorrimento della pagina: un dito che scende
   * leggendo, con una deriva orizzontale, non deve far comparire un pannello.
   */
  it("non apre se il dito e' andato troppo in verticale", () => {
    expect(gesto({ endY: 300 + SWIPE_MAX_DERIVA + 1 })).toBe(false);
    expect(gesto({ endY: 300 - SWIPE_MAX_DERIVA - 1 })).toBe(false);
  });

  it("non apre se la verticale supera l'orizzontale, anche restando nei limiti", () => {
    expect(gesto({ endX: 20 + SWIPE_MIN_DISTANZA, endY: 300 + SWIPE_MAX_DERIVA })).toBe(true);
    expect(gesto({ endX: 60, endY: 340 })).toBe(false);
  });

  /**
   * Un dito appoggiato e trascinato piano e' un'altra intenzione: spesso e'
   * una selezione di testo o un trascinamento. Lo swipe e' un gesto rapido.
   */
  it("non apre se il gesto e' troppo lento", () => {
    expect(gesto({ durataMs: SWIPE_MAX_DURATA + 1 })).toBe(false);
  });

  it("non apre su larghezza zero, invece di dividere per zero", () => {
    expect(gesto({ larghezza: 0 })).toBe(false);
  });
});

/** Finge un elemento che scorre, come jsdom non sa fare da solo. */
function elemento({ scorre = false, overflowX = "visible", padre = null as HTMLElement | null }) {
  const el = document.createElement("div");
  el.style.overflowX = overflowX;
  Object.defineProperty(el, "scrollWidth", { value: scorre ? 500 : 100, configurable: true });
  Object.defineProperty(el, "clientWidth", { value: 100, configurable: true });
  if (padre) padre.appendChild(el);
  else document.body.appendChild(el);
  return el;
}

describe("dentroUnoScorrimentoOrizzontale", () => {
  /**
   * I filtri dello streaming e le tabelle scorrono in orizzontale: dentro di
   * loro un trascinamento laterale significa gia' qualcosa, e rubarglielo
   * per aprire un pannello sarebbe un gesto che ne cancella un altro.
   */
  it("riconosce un elemento che scorre davvero in orizzontale", () => {
    expect(dentroUnoScorrimentoOrizzontale(elemento({ scorre: true, overflowX: "auto" }))).toBe(
      true,
    );
  });

  it("un elemento che non deborda non conta, anche con overflow-x auto", () => {
    expect(dentroUnoScorrimentoOrizzontale(elemento({ scorre: false, overflowX: "auto" }))).toBe(
      false,
    );
  });

  it("un elemento che deborda ma non scorre non conta", () => {
    expect(dentroUnoScorrimentoOrizzontale(elemento({ scorre: true, overflowX: "visible" }))).toBe(
      false,
    );
  });

  /** Il dito tocca il figlio, non il contenitore che scorre. */
  it("guarda anche gli antenati, non solo l'elemento toccato", () => {
    const contenitore = elemento({ scorre: true, overflowX: "auto" });
    const figlio = elemento({ padre: contenitore });
    expect(dentroUnoScorrimentoOrizzontale(figlio)).toBe(true);
  });

  it("senza elemento non blocca niente", () => {
    expect(dentroUnoScorrimentoOrizzontale(null)).toBe(false);
  });
});
