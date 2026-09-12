import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { act } from "react";
import { useSwipeFromLeft } from "./useSwipeFromLeft";

function Prova({ onSwipe }: { onSwipe: () => void }) {
  useSwipeFromLeft(onSwipe, true);
  return <div data-testid="pagina">contenuto</div>;
}

/** Un evento tattile come lo produrrebbe un dito: jsdom non ne costruisce. */
function tocco(tipo: string, punti: Array<{ x: number; y: number }>, target: Element) {
  const evento = new Event(tipo, { bubbles: true });
  const lista = punti.map(({ x, y }) => ({ clientX: x, clientY: y }));
  Object.defineProperty(evento, "touches", { value: tipo === "touchend" ? [] : lista });
  Object.defineProperty(evento, "changedTouches", { value: lista });
  act(() => {
    target.dispatchEvent(evento);
  });
}

describe("useSwipeFromLeft", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { value: 400, configurable: true });
    document.body.innerHTML = "";
  });

  it("un gesto netto da sinistra chiama la richiamata", () => {
    const onSwipe = vi.fn();
    const { getByTestId } = render(<Prova onSwipe={onSwipe} />);
    const pagina = getByTestId("pagina");

    tocco("touchstart", [{ x: 20, y: 300 }], pagina);
    tocco("touchend", [{ x: 200, y: 304 }], pagina);

    expect(onSwipe).toHaveBeenCalledTimes(1);
  });

  it("un gesto verso sinistra non chiama niente", () => {
    const onSwipe = vi.fn();
    const { getByTestId } = render(<Prova onSwipe={onSwipe} />);
    const pagina = getByTestId("pagina");

    tocco("touchstart", [{ x: 150, y: 300 }], pagina);
    tocco("touchend", [{ x: 20, y: 300 }], pagina);

    expect(onSwipe).not.toHaveBeenCalled();
  });

  /** Due dita sono una pinza: il gesto non comincia nemmeno. */
  it("ignora il gesto a due dita", () => {
    const onSwipe = vi.fn();
    const { getByTestId } = render(<Prova onSwipe={onSwipe} />);
    const pagina = getByTestId("pagina");

    tocco(
      "touchstart",
      [
        { x: 20, y: 300 },
        { x: 60, y: 320 },
      ],
      pagina,
    );
    tocco("touchend", [{ x: 200, y: 304 }], pagina);

    expect(onSwipe).not.toHaveBeenCalled();
  });

  /**
   * Il caso che rovinerebbe i filtri dello STREAMING: li' dentro il
   * trascinamento laterale scorre gia' qualcosa, e prenderselo vorrebbe dire
   * cancellare un gesto con un altro.
   */
  it("non ruba il gesto a chi scorre gia' in orizzontale", () => {
    const onSwipe = vi.fn();
    render(<Prova onSwipe={onSwipe} />);

    const scorrevole = document.createElement("div");
    scorrevole.style.overflowX = "auto";
    Object.defineProperty(scorrevole, "scrollWidth", { value: 900, configurable: true });
    Object.defineProperty(scorrevole, "clientWidth", { value: 300, configurable: true });
    document.body.appendChild(scorrevole);

    tocco("touchstart", [{ x: 20, y: 300 }], scorrevole);
    tocco("touchend", [{ x: 200, y: 304 }], scorrevole);

    expect(onSwipe).not.toHaveBeenCalled();
  });

  it("un gesto interrotto non vale", () => {
    const onSwipe = vi.fn();
    const { getByTestId } = render(<Prova onSwipe={onSwipe} />);
    const pagina = getByTestId("pagina");

    tocco("touchstart", [{ x: 20, y: 300 }], pagina);
    tocco("touchcancel", [{ x: 100, y: 300 }], pagina);
    tocco("touchend", [{ x: 200, y: 304 }], pagina);

    expect(onSwipe).not.toHaveBeenCalled();
  });
});
