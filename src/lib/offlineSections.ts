/**
 * Il guardiano offline delle quattro pagine sportive.
 *
 * Ogni pagina ripeteva lo stesso `if` con la propria lista di sezioni:
 * si mostra il fallback solo quando *nessuna* sezione ha dati in cache e
 * *tutte* quelle che tracciano un errore ce l'hanno. Le quattro condizioni
 * non erano identiche — `SinnerPage` include `playerInfo`, che entra come
 * `!playerInfo` senza un errore accanto — e questa funzione le rappresenta
 * senza appiattirle: una sezione che non dichiara `error` conta solo per i
 * dati.
 */
export interface SectionState {
  /** I dati in cache della sezione. React Query li conserva anche dopo un refetch fallito. */
  data: unknown;
  /**
   * L'errore della sezione, se la sezione lo traccia. `null` significa
   * "non ancora fallita", cioe' sta ancora caricando; la chiave assente
   * significa "questa sezione non ha un errore da guardare".
   */
  error?: unknown;
}

export function allSectionsUnavailable(sections: readonly SectionState[]): boolean {
  if (sections.length === 0) return false;
  return sections.every(
    (section) => !section.data && (section.error === undefined || section.error !== null),
  );
}
