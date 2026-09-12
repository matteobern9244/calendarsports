import { useEffect, useState } from "react";
import { apreLePreferenze, dentroUnoScorrimentoOrizzontale, type Swipe } from "@/lib/swipeGesture";

/**
 * Se questo dispositivo si usa col dito.
 *
 * `pointer: coarse` e non la presenza di `ontouchstart`: la seconda e' vera
 * anche su un portatile con schermo tattile usato col trackpad, dove un
 * gesto del genere non lo cerca nessuno. Si misura una volta al montaggio —
 * un mouse non diventa un dito a meta' sessione.
 */
export function useTouchDevice(): boolean {
  const [coarse] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true,
  );
  return coarse;
}

/**
 * Chiama `onSwipe` quando il dito attraversa lo schermo da sinistra a destra.
 *
 * Gli ascoltatori sono `passive`: non annullano mai l'evento, quindi lo
 * scorrimento della pagina resta fluido e nessun altro gesto viene tolto di
 * mezzo. Il gesto si limita a **osservare**, e decide solo alla fine.
 *
 * Nota sul bordo: in un'app installata non c'e' nessun gesto del browser con
 * cui contendere. Dentro un browser mobile lo swipe dal bordo estremo e'
 * spesso gia' preso dal «indietro» di sistema, che lo consuma prima di noi:
 * per questo la fascia di partenza e' larga invece che appiccicata al bordo.
 */
export function useSwipeFromLeft(onSwipe: () => void, attivo: boolean) {
  useEffect(() => {
    if (!attivo || typeof window === "undefined") return;

    let inizio: { x: number; y: number; t: number } | null = null;

    const annulla = () => {
      inizio = null;
    };

    const comincia = (evento: TouchEvent) => {
      // Due dita sono una pinza o uno zoom, non uno swipe.
      if (evento.touches.length !== 1) return annulla();
      if (dentroUnoScorrimentoOrizzontale(evento.target as Element | null)) return annulla();
      const dito = evento.touches[0];
      inizio = { x: dito.clientX, y: dito.clientY, t: Date.now() };
    };

    const finisce = (evento: TouchEvent) => {
      const partenza = inizio;
      inizio = null;
      const dito = evento.changedTouches[0];
      if (!partenza || !dito) return;
      const gesto: Swipe = {
        startX: partenza.x,
        startY: partenza.y,
        endX: dito.clientX,
        endY: dito.clientY,
        larghezza: window.innerWidth,
        durataMs: Date.now() - partenza.t,
      };
      if (apreLePreferenze(gesto)) onSwipe();
    };

    window.addEventListener("touchstart", comincia, { passive: true });
    window.addEventListener("touchend", finisce, { passive: true });
    window.addEventListener("touchcancel", annulla, { passive: true });
    return () => {
      window.removeEventListener("touchstart", comincia);
      window.removeEventListener("touchend", finisce);
      window.removeEventListener("touchcancel", annulla);
    };
  }, [attivo, onSwipe]);
}
