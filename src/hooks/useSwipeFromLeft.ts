import { useEffect, useState } from "react";
import {
  apreLePreferenze,
  dentroUnoScorrimentoOrizzontale,
  SWIPE_MAX_DERIVA,
  type Swipe,
} from "@/lib/swipeGesture";

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
 * mezzo. Il gesto si limita a **osservare**.
 *
 * E decide **durante** il movimento, non alla fine. Fino al 12 settembre 2026
 * aspettava `touchend`, e in emulazione funzionava; su un telefono vero no.
 * Chrome per Android e Safari su iOS, appena concludono che il dito sta
 * facendo scorrere la pagina, chiudono la sequenza con `touchcancel`: la
 * fine che il gesto aspettava non arrivava mai, e con lei non arrivava
 * niente — nessun errore, solo un pannello che non si apre. Ora ogni
 * `touchmove` viene valutato, il gesto scatta la prima volta che supera le
 * soglie, e da li' in poi la sequenza e' consumata: ne' la cancellazione ne'
 * la fine lo ripetono. Un dito che sbanda in verticale oltre la deriva
 * ammessa chiude il gesto per questa sequenza, anche se poi torna dritto.
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

    /** Valuta il punto in cui e' adesso il dito; consuma la sequenza se apre. */
    const valuta = (dito: Touch | undefined) => {
      const partenza = inizio;
      if (!partenza || !dito) return;
      const gesto: Swipe = {
        startX: partenza.x,
        startY: partenza.y,
        endX: dito.clientX,
        endY: dito.clientY,
        larghezza: window.innerWidth,
        durataMs: Date.now() - partenza.t,
      };
      if (apreLePreferenze(gesto)) {
        inizio = null;
        onSwipe();
      } else if (Math.abs(dito.clientY - partenza.y) > SWIPE_MAX_DERIVA) {
        // Sta scorrendo la pagina: questa sequenza non e' piu' uno swipe.
        inizio = null;
      }
    };

    const muove = (evento: TouchEvent) => {
      if (evento.touches.length !== 1) return annulla();
      valuta(evento.touches[0]);
    };

    const finisce = (evento: TouchEvent) => {
      valuta(evento.changedTouches[0]);
      inizio = null;
    };

    window.addEventListener("touchstart", comincia, { passive: true });
    window.addEventListener("touchmove", muove, { passive: true });
    window.addEventListener("touchend", finisce, { passive: true });
    window.addEventListener("touchcancel", annulla, { passive: true });
    return () => {
      window.removeEventListener("touchstart", comincia);
      window.removeEventListener("touchmove", muove);
      window.removeEventListener("touchend", finisce);
      window.removeEventListener("touchcancel", annulla);
    };
  }, [attivo, onSwipe]);
}
