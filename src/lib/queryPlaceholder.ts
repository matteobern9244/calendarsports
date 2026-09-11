/**
 * `placeholderData` che non attraversa le liste.
 *
 * React Query passa a `placeholderData` i dati dell'ultima query osservata
 * dallo stesso hook, **qualunque fosse la sua chiave**. Scritto come
 * `(prev) => prev` serve la pagina 1 del Napoli con le partite della
 * Juventus: niente errore, niente spinner, solo dati sbagliati sotto
 * l'intestazione giusta. E' l'unico modo di sbagliare, in tutto questo
 * lavoro, che non si vede.
 *
 * La regola qui e' strutturale invece che a indici: la chiave di una pagina
 * e' la chiave della lista piu' `page` e `pageSize` in coda, quindi «stessa
 * lista» vuol dire «stesso prefisso». Chi aggiunge un elemento alla lista
 * (una squadra, un filtro) lo aggiunge al prefisso e il confronto continua a
 * valere da solo.
 */

/** Vero se `key` e' la chiave di una pagina della lista `list`. */
export function isPageOf(list: readonly unknown[], key: readonly unknown[]): boolean {
  if (key.length <= list.length) return false;
  return list.every((part, i) => Object.is(key[i], part));
}

/**
 * Tiene in vista la pagina precedente **solo** se e' una pagina di `list`.
 *
 * Fuori dalla lista restituisce `undefined`, cioe' lo stato di caricamento:
 * far vedere uno skeleton per un istante e' il prezzo giusto per non far
 * vedere i dati di un'altra squadra.
 */
export function keepPreviousPageOf<T>(list: readonly unknown[]) {
  return (
    previousData: T | undefined,
    previousQuery: { queryKey: readonly unknown[] } | undefined,
  ): T | undefined =>
    previousQuery && isPageOf(list, previousQuery.queryKey) ? previousData : undefined;
}
