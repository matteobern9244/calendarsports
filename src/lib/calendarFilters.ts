import type { CalendarSport } from "@/hooks/useCalendarEvents";

export const FILTERS_KEY = "calendar.filters";

/**
 * I filtri del calendario aggregato, ricordati sul dispositivo.
 *
 * Sta qui e non dentro `CalendarPage` perche' e' l'unico pezzo di quella
 * pagina che sopravvive alla pagina stessa, e perche' una funzione esportata
 * da un file di componente spegne il fast refresh di Vite.
 *
 * La voce del calcio si chiamava `juventus` finche' l'app aveva una squadra
 * sola, e con quel nome e' scritta in tutti i dispositivi che hanno gia' usato
 * il calendario. **Il merge con i default non basta a salvarla**: chi aveva
 * *spento* il calcio ha `{"juventus": false}` sul dispositivo, dopo la rinomina
 * `football` mancherebbe dall'oggetto letto, e il default lo rimetterebbe a
 * `true`. Il filtro si riaccenderebbe da solo, senza errore e senza avviso.
 *
 * Da qui la lettura del nome vecchio. Vale una volta sola: al primo
 * salvataggio l'oggetto viene riscritto con il nome nuovo e `juventus`
 * sparisce dal dispositivo. La riga si potra' togliere fra un paio di rilasci.
 */
export function loadFilters(): Record<CalendarSport, boolean> {
  const def = { football: true, f1: true, motogp: true };
  if (typeof window === "undefined") return def;
  try {
    const raw = window.localStorage.getItem(FILTERS_KEY);
    if (!raw) return def;
    const { juventus, ...sport } = JSON.parse(raw) as Partial<
      Record<CalendarSport | "juventus", boolean>
    >;
    // `sport` viene per ultimo: se sul dispositivo ci sono **entrambi** i nomi,
    // quello nuovo e' l'ultimo che l'utente ha scelto e deve vincere.
    const ereditato = typeof juventus === "boolean" ? { football: juventus } : {};
    return { ...def, ...ereditato, ...sport };
  } catch {
    return def;
  }
}
