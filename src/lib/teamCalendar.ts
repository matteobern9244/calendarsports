import type { FootballCalendar, FootballMatch } from "@/lib/api/schemas";

/**
 * Il calendario Juventus impaginato dal server (`sports-football:calendar`
 * con `page`/`pageSize`). `nextUpcomingIndex` e' un indice *globale* sulla
 * stagione, non sulla pagina: tutto quello che lo converte in una pagina e
 * in una posizione dentro la pagina sta qui, dove si prova senza montare
 * niente.
 */
export type PaginatedCalendar = Exclude<FootballCalendar, unknown[]>;

/** La pagina (da 1) che contiene l'indice globale, o null se non c'e'. */
export function pageOfIndex(index: number | null | undefined, pageSize: number): number | null {
  return typeof index === "number" && index >= 0 ? Math.floor(index / pageSize) + 1 : null;
}

/**
 * La posizione della prossima partita dentro la pagina corrente, o -1 se sta
 * altrove. L'evidenza «Prossima» va solo alla partita che il server indica,
 * e solo quando la pagina in vista la contiene davvero.
 */
export function highlightIndexOnPage(calendar: PaginatedCalendar): number {
  const pageStart = (calendar.page - 1) * calendar.pageSize;
  return calendar.nextUpcomingIndex >= pageStart &&
    calendar.nextUpcomingIndex < pageStart + calendar.items.length
    ? calendar.nextUpcomingIndex - pageStart
    : -1;
}

/** «Partite 13–24 di 48»: numerazione da 1, fine sull'ultima presente. */
export function pageRange(calendar: PaginatedCalendar): { start: number; end: number } {
  const pageStart = (calendar.page - 1) * calendar.pageSize;
  return { start: pageStart + 1, end: pageStart + calendar.items.length };
}

/**
 * La prossima partita da mostrare nella card in testa alla pagina.
 *
 * Se sta nella pagina corrente si legge da li'. Altrimenti si legge dalla
 * pagina caricata apposta (`nextMatchCalendar`), ma solo quando e' davvero
 * quella pagina: `placeholderData` di React Query puo' tenere in mano la
 * risposta precedente, e mostrarla come «prossima» sarebbe una partita a
 * caso.
 */
export function pickNextMatch({
  calendar,
  nextMatchPage,
  nextMatchCalendar,
  pageSize,
}: {
  calendar: PaginatedCalendar | undefined;
  nextMatchPage: number | null;
  nextMatchCalendar: PaginatedCalendar | undefined;
  pageSize: number;
}): FootballMatch | null {
  if (!calendar || nextMatchPage === null) return null;
  if (nextMatchPage === calendar.page) {
    const localIdx = calendar.nextUpcomingIndex - (calendar.page - 1) * calendar.pageSize;
    return calendar.items[localIdx] ?? null;
  }
  if (nextMatchCalendar && nextMatchCalendar.page === nextMatchPage) {
    const localIdx = calendar.nextUpcomingIndex - (nextMatchPage - 1) * pageSize;
    return nextMatchCalendar.items[localIdx] ?? null;
  }
  return null;
}
