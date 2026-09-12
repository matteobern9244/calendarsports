/**
 * Il gesto che apre le preferenze: uno swipe da sinistra verso destra.
 *
 * La logica sta qui, senza React e senza DOM, perche' le decisioni difficili
 * di un gesto non sono nel codice che ascolta gli eventi ma nelle soglie: da
 * dove puo' partire, quanto deve essere lungo, quanto puo' sbandare, quanto
 * puo' durare. Un gesto troppo permissivo si attiva mentre si legge; uno
 * troppo severo sembra rotto.
 */

/** Quanto lontano deve arrivare il dito, in pixel. */
export const SWIPE_MIN_DISTANZA = 72;

/** Quanto puo' sbandare in verticale senza smettere di essere uno swipe. */
export const SWIPE_MAX_DERIVA = 48;

/**
 * Oltre questo tempo non e' piu' uno swipe ma un trascinamento: di solito una
 * selezione di testo, o un dito appoggiato mentre si legge.
 */
export const SWIPE_MAX_DURATA = 800;

/**
 * La frazione sinistra dello schermo da cui il gesto puo' cominciare.
 *
 * Non e' il bordo esatto di proposito. Su Android il sistema si prende i
 * primi millimetri dello schermo per il proprio gesto «indietro», e un gesto
 * ancorato al bordo non arriverebbe mai fino a noi; una fascia larga resta
 * raggiungibile senza contendere niente a nessuno.
 */
export const SWIPE_ZONA_INIZIALE = 0.4;

export interface Swipe {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  /** Larghezza della finestra: la zona di partenza e' una frazione, non un fisso. */
  larghezza: number;
  durataMs: number;
}

export function apreLePreferenze({
  startX,
  startY,
  endX,
  endY,
  larghezza,
  durataMs,
}: Swipe): boolean {
  if (larghezza <= 0) return false;
  if (startX > larghezza * SWIPE_ZONA_INIZIALE) return false;
  if (durataMs > SWIPE_MAX_DURATA) return false;

  const orizzontale = endX - startX;
  const verticale = Math.abs(endY - startY);
  if (orizzontale < SWIPE_MIN_DISTANZA) return false;
  if (verticale > SWIPE_MAX_DERIVA) return false;
  return orizzontale > verticale;
}

/**
 * Se il dito ha cominciato dentro qualcosa che scorre gia' in orizzontale.
 *
 * I filtri dello streaming e le tabelle scorrono lateralmente: li' dentro un
 * trascinamento significa gia' qualcosa, e prenderselo per aprire un pannello
 * sarebbe un gesto che ne cancella un altro. Si guardano anche gli antenati
 * perche' il dito tocca il figlio, non il contenitore.
 *
 * Non basta `overflow-x`: conta solo se il contenuto **deborda davvero**,
 * altrimenti ogni contenitore predisposto a scorrere bloccherebbe il gesto
 * anche quando non ha niente da scorrere.
 */
export function dentroUnoScorrimentoOrizzontale(target: Element | null): boolean {
  for (let el = target; el instanceof HTMLElement; el = el.parentElement) {
    const { overflowX } = window.getComputedStyle(el);
    if ((overflowX === "auto" || overflowX === "scroll") && el.scrollWidth > el.clientWidth) {
      return true;
    }
  }
  return false;
}
