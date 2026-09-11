import type { Esito } from "@/lib/teamStats";

/**
 * Come si scrivono e come si colorano le statistiche.
 *
 * Vive fuori da `StatsCharts.tsx` perche' eslint ha ragione: un file che
 * esporta componenti **e** costanti perde il fast refresh, e la regola
 * `react-refresh/only-export-components` lo dice. E' lo stesso motivo per cui
 * `loadFilters` e' uscita da `CalendarPage`.
 *
 * Sta fra i componenti e non in `src/lib/teamStats.ts` perche' e' presentazione:
 * `teamStats.ts` calcola, e non deve sapere ne' che esiste Tailwind ne' in che
 * lingua verranno letti i suoi numeri.
 */

const FORMATO_MEDIA = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Una media con due decimali, o un trattino.
 *
 * Il trattino non e' una decorazione: `null` significa «zero partite giocate»,
 * e uno `0,00` al suo posto direbbe che la squadra ha una media pessima invece
 * che nessuna media.
 */
export function formattaMedia(valore: number | null): string {
  return valore === null ? "—" : FORMATO_MEDIA.format(valore);
}

/** Un numero qualunque, con i separatori italiani. */
export function formattaNumero(valore: number): string {
  return FORMATO_MEDIA.format(valore);
}

/**
 * Il colore dell'esito.
 *
 * Token del tema e non colori fissi: `--success` e `--destructive` hanno gia'
 * due valori, uno per il tema chiaro e uno per lo scuro.
 *
 * Questi **non** sono i colori della squadra, di proposito. Verde, grigio e
 * rosso sono la convenzione che si legge senza istruzioni, e un rendimento del
 * Milan disegnato tutto nel rosso del Milan sarebbe illeggibile proprio per la
 * squadra che quel rosso ce l'ha. L'identita' della squadra sta nell'andamento
 * punti, dove il colore significa «questa squadra» e non «questo esito».
 */
export const COLORE_ESITO: Record<Esito, string> = {
  V: "bg-success",
  N: "bg-muted-foreground",
  S: "bg-destructive",
};

export const NOME_ESITO: Record<Esito, string> = {
  V: "Vittorie",
  N: "Pareggi",
  S: "Sconfitte",
};
