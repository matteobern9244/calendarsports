import { toEventTimestampMs } from "./timezone.ts";

/**
 * Il preavviso piu' lungo che il progetto puo' notificare.
 *
 * Non e' una stima: `push-subscribe` accetta soltanto `VALID_LEAD_TIMES`,
 * cioe' 15, 60 e 1440 minuti, e scarta qualunque altro valore prima di
 * scriverlo. Oltre `now + 1440 min` nessun evento puo' essere dovuto, perche'
 * la condizione di invio e' `t <= now + preavviso`.
 *
 * Se un giorno `VALID_LEAD_TIMES` si allargasse senza che questa costante
 * cambi, l'impaginazione si fermerebbe troppo presto e le notifiche a
 * preavviso lungo sparirebbero senza errori: e' il motivo per cui esiste un
 * test che fissa questo numero.
 */
export const MAX_LEAD_MINUTES = 1440;

/**
 * L'istante oltre il quale non serve leggere altro calendario.
 *
 * La finestra di invio viene sommata come margine: non e' strettamente
 * necessaria — allarga solo l'estremo inferiore della condizione di invio —
 * ma copre i secondi che passano fra l'inizio del giro e il confronto.
 */
export function notificationHorizonMs(nowMs: number, windowMs: number): number {
  return nowMs + MAX_LEAD_MINUTES * 60 * 1000 + windowMs;
}

/**
 * Dice se la pagina appena letta ha gia' superato l'orizzonte, cioe' se
 * chiedere la pagina successiva sarebbe lavoro sprecato.
 *
 * PRECONDIZIONE: il calendario e' ordinato per data crescente. Non e'
 * un'ipotesi, e' garantita da `sports-football`, che ordina prima di
 * impaginare. Se quell'ordinamento sparisse, questa funzione farebbe
 * fermare il ciclo troppo presto.
 *
 * Guarda l'ultima data *leggibile*, non l'ultimo elemento: una riga senza
 * data in coda non deve far perdere l'informazione che le sta davanti. E se
 * nessuna data e' leggibile risponde `false`, perche' non sapere dove siamo
 * nel calendario non autorizza a smettere di leggerlo: meglio una chiamata
 * in piu' che una notifica persa.
 */
export function hasReachedHorizon(
  items: ReadonlyArray<{ date?: string | null }>,
  horizonMs: number,
): boolean {
  if (items.length === 0) return true;
  for (let i = items.length - 1; i >= 0; i--) {
    const timestamp = toEventTimestampMs(items[i]?.date);
    if (timestamp !== null) return timestamp > horizonMs;
  }
  return false;
}
