import type { CountdownMode } from "@/lib/countdownClock";
import type { FasePartita } from "@/lib/matchPhase";

/**
 * Ogni quanto richiedere il dettaglio di una partita mentre si gioca.
 *
 * Vive qui e non dentro l'hook perche' gli hook di `useSportsData` sono
 * involucri sottili attorno a React Query: infilarci `useCountdownMode` li
 * ispessirebbe e legherebbe il trasporto a una preferenza. La pagina legge la
 * preferenza e passa un numero; la decisione si prova senza montare niente.
 *
 * **Solo il dettaglio, non il calendario.** L'azione `calendar` interroga i
 * widget di tutte le competizioni piu' l'API della Lega: metterla in polling
 * moltiplicherebbe per sessanta il traffico verso la fonte per ogni scheda
 * aperta. Il dettaglio chiede tre widget di **una** partita, ed e' anche la
 * fonte che si aggiorna davvero durante il gioco.
 */

/** Un minuto: un gol in piu' di ritardo, nel caso peggiore. */
export const INTERVALLO_LIVE_MS = 60_000;

/** Tre minuti per chi ha chiesto di consumare meno. */
export const INTERVALLO_LIVE_RISPARMIO_MS = 180_000;

/**
 * L'intervallo da passare a React Query, o `false` per non richiedere niente.
 *
 * Fuori dalla partita non c'e' niente da aggiornare: prima non esiste un
 * risultato, dopo non cambia piu'. E al fischio finale l'intervallo si spegne
 * da solo, al primo refetch che porta lo stato nuovo.
 */
export function intervalloLive(fase: FasePartita, mode: CountdownMode): number | false {
  if (fase !== "in-corso") return false;
  return mode === "saver" ? INTERVALLO_LIVE_RISPARMIO_MS : INTERVALLO_LIVE_MS;
}
