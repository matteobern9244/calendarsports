/**
 * Il vocabolario dello stato di una partita, e il punteggio che se ne puo'
 * ricavare.
 *
 * Vive fuori da `index.ts` perche' `index.ts` chiama `Deno.serve` a livello di
 * modulo: importarlo da un test farebbe partire un server. Stessa ragione di
 * `matchId.ts`.
 *
 * Nasce da un difetto visto dal vivo: il calendario scriveva
 * `homeScore: isFinished ? match.home?.goal : null`, cioe' teneva il punteggio
 * **solo a partita finita**. Durante i novanta minuti il dato non usciva
 * nemmeno dalla edge function, e nessuna vista poteva mostrarlo. Il dettaglio
 * partita passa invece da `buildMatchDetail`, che la regola giusta ce l'aveva
 * gia': ecco perche' il risultato si vedeva solo aprendo una scheda.
 *
 * Le stesse due domande se le pone anche l'app, in `src/lib/matchPhase.ts`:
 * le due copie non si possono importare a vicenda perche' le edge function
 * girano su Deno e vengono impacchettate con il solo contenuto di
 * `supabase/functions/`. Un guardiano le tiene allineate.
 */

/** Lo stato con cui la fonte dichiara che la partita e' conclusa. */
export const STATO_FINITA = "FullTime";

/**
 * Gli stati in cui la partita **non e' ancora cominciata**.
 *
 * Si enumera questa parte e non quella opposta. Gli stati di gioco sono tanti
 * — primo tempo, intervallo, recuperi, supplementari, rigori — e un elenco che
 * ne dimenticasse uno nasconderebbe il risultato di una partita in corso.
 * Dimenticare invece uno stato di attesa mostrerebbe uno 0-0 falso, che e'
 * l'errore piu' grave dei due: per questo uno stato sconosciuto vale come
 * gioco, e l'elenco corto sta dalla parte dell'attesa. E' la stessa politica
 * gia' in produzione in `matchDetail.ts`, da cui questa costante proviene.
 *
 * `Postponed` e `Cancelled` non sono stati osservati sul widget calendario —
 * su oltre mille partite di quattro competizioni la fonte ha usato soltanto
 * `PreMatch` e `FullTime` — ma stanno qui perche' il costo di prevederli e'
 * nullo e quello di sbagliarli e' uno 0-0 inventato.
 *
 * Una partita **sospesa** non e' in questo elenco di proposito: e'
 * cominciata, e il punteggio raggiunto fino a quel momento e' un dato vero.
 */
const NON_COMINCIATA = new Set(["PreMatch", "Postponed", "Cancelled"]);

/** La fonte dichiara che la partita e' conclusa. */
export function finita(status: string | null | undefined): boolean {
  return status === STATO_FINITA;
}

/** La fonte dichiara che si sta giocando, o che si e' giocato. */
export function cominciata(status: string | null | undefined): boolean {
  if (!status) return false;
  return !NON_COMINCIATA.has(status);
}

interface LatoConGol {
  goal?: number | null;
}

interface PartitaConPunteggio {
  status?: string | null;
  home?: LatoConGol | null;
  away?: LatoConGol | null;
}

/**
 * I due punteggi da pubblicare, o `null` entrambi.
 *
 * Entrambi o nessuno: un «2 – ?» non e' un risultato parziale, e' un risultato
 * rotto. E prima del fischio d'inizio la fonte pubblica gia' `goal: 0` —
 * verificato sul widget calendario, dove una partita `PreMatch` porta
 * `home.goal: 0` e `away.goal: 0` — che mostrato diventerebbe uno 0-0 mai
 * giocato.
 */
export function visibleScore(match: PartitaConPunteggio): {
  homeScore: number | null;
  awayScore: number | null;
} {
  const vuoto = { homeScore: null, awayScore: null };
  if (!cominciata(match.status)) return vuoto;
  const casa = match.home?.goal ?? null;
  const ospite = match.away?.goal ?? null;
  if (typeof casa !== "number" || typeof ospite !== "number") return vuoto;
  return { homeScore: casa, awayScore: ospite };
}
